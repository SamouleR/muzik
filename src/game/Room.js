const { v4: uuidv4 } = require('uuid');
const Arbiter = require('../arbiter/Arbiter');

/**
 * États possibles d'une Room
 */
const ROOM_STATE = {
  LOBBY: 'LOBBY',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  ROUND_END: 'ROUND_END',
  GAME_OVER: 'GAME_OVER',
};

/**
 * Classe Room — représente une session de jeu
 */
class Room {
  constructor(arg1, arg2, arg3, arg4) {
    let hostId, hostName, options, roomId;
    if (typeof arg4 !== 'undefined') {
      // Called as: new Room(roomId, hostId, hostName, options)
      roomId = arg1;
      hostId = arg2;
      hostName = arg3;
      options = (typeof arg4 === 'object' && arg4 !== null) ? arg4 : {};
    } else {
      // Called as: new Room(hostId, hostName, options)
      hostId = arg1;
      hostName = arg2;
      options = (typeof arg3 === 'object' && arg3 !== null) ? arg3 : {};
      roomId = options.roomId || Room.generateRoomId();
    }

    this.id = roomId || Room.generateRoomId();
    this.hostId = hostId;
    this.hostName = hostName || 'Joueur 1';
    this.state = ROOM_STATE.LOBBY;
    this.createdAt = Date.now();

    // Settings
    this.settings = { ...(options || {}) };
    this.difficulty = this.settings.difficulty || 'DEBUTANT';
    this.genre = this.settings.genre || this.settings.playlist || 'mix';
    this.totalRounds = parseInt(this.settings.rounds || 10, 10);
    this.roundDuration = parseInt(this.settings.roundDuration || this.settings.duration || 20, 10);
    this.mode = this.settings.mode || 'classique';
    this.bandizModifier = this.settings.bandizModifier || null;
    this.maxPlayers = parseInt(this.settings.maxPlayers || 8, 10);
    this.settings.maxPlayers = this.maxPlayers;
    this.settings.genre = this.genre;
    this.settings.difficulty = this.difficulty;
    this.settings.rounds = this.totalRounds;
    this.settings.roundDuration = this.roundDuration;
    this.settings.isPrivate = !!this.settings.isPrivate;

    // Joueurs : Map<socketId, { id, name, score, hasAnswered, lastAnswer }>
    this.players = new Map();
    this.addPlayer(hostId, this.hostName);

    // État de la partie
    this.currentRound = 0;
    this.tracks = [];           // pistes pré-chargées pour la partie
    this.currentTrack = null;
    this.roundTimer = null;
    this.roundStartTime = null;
    this.answeredThisRound = 0; // nombre de réponses reçues ce round
    this.roundResults = [];     // résultats de tous les rounds
  }

  /**
   * Génère un code room lisible de 6 caractères
   */
  static generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  _generateRoomCode() {
    return Room.generateRoomId();
  }

  /**
   * Ajoute un joueur à la room
   */
  addPlayer(socketId, name) {
    if (this.players.size >= this.maxPlayers) {
      throw new Error('Room pleine !');
    }
    if (this.state !== ROOM_STATE.LOBBY) {
      throw new Error('Partie déjà en cours !');
    }

    const playerObj = {
      id: socketId,
      name: name || `Joueur ${this.players.size + 1}`,
      score: 0,
      hasAnswered: false,
      lastAnswer: null,
      streak: 0,  // réponses correctes consécutives
      bestStreak: 0,
      totalCorrect: 0,
      totalResponseTime: 0,
      doublePointsActive: false,
    };

    this.players.set(socketId, playerObj);
    return playerObj;
  }

  /**
   * Retire un joueur de la room
   */
  removePlayer(socketId) {
    this.players.delete(socketId);

    // Si l'hôte part, transférer à un autre joueur
    if (socketId === this.hostId && this.players.size > 0) {
      const nextPlayer = this.players.values().next().value;
      this.hostId = nextPlayer.id;
      this.hostName = nextPlayer.name;
    }
    return this.players.size;
  }

  /**
   * Met à jour les réglages de la room
   */
  updateSettings(newSettings = {}) {
    if (newSettings.genre) this.genre = newSettings.genre;
    if (newSettings.difficulty) this.difficulty = newSettings.difficulty;
    if (newSettings.rounds) this.totalRounds = parseInt(newSettings.rounds, 10);
    if (newSettings.roundDuration) this.roundDuration = parseInt(newSettings.roundDuration, 10);
    if (newSettings.duration) this.roundDuration = parseInt(newSettings.duration, 10);
    if (newSettings.mode) this.mode = newSettings.mode;
    if (newSettings.maxPlayers) this.maxPlayers = parseInt(newSettings.maxPlayers, 10);
    if (typeof newSettings.isPrivate !== 'undefined') this.settings.isPrivate = !!newSettings.isPrivate;

    Object.assign(this.settings, newSettings, {
      genre: this.genre,
      difficulty: this.difficulty,
      rounds: this.totalRounds,
      roundDuration: this.roundDuration,
      maxPlayers: this.maxPlayers,
    });
    return this.settings;
  }

  /**
   * Démarre la partie avec les tracks pré-chargées
   */
  startGame(tracks) {
    if (this.state !== ROOM_STATE.LOBBY) {
      throw new Error('La partie a déjà commencé');
    }
    if (this.players.size < 1) {
      throw new Error('Pas assez de joueurs');
    }

    this.tracks = tracks;
    this.totalRounds = Math.min(this.totalRounds, tracks.length);
    this.currentRound = 0;
    this.state = ROOM_STATE.COUNTDOWN;
  }

  /**
   * Démarre le prochain round
   */
  nextRound() {
    if (this.currentRound >= this.totalRounds) {
      this.state = ROOM_STATE.GAME_OVER;
      return null;
    }

    this.state = ROOM_STATE.PLAYING;
    this.currentTrack = this.tracks[this.currentRound];
    this.currentRound++;
    this.answeredThisRound = 0;
    this.roundStartTime = Date.now();

    const featInfo = Arbiter.extractFeaturing(this.currentTrack.title, this.currentTrack.artist);

    // Reset des réponses et progression des joueurs pour la manche
    for (const [, player] of this.players) {
      player.hasAnswered = false;
      player.lastAnswer = null;
      player.roundProgress = {
        artistFound: false,
        titleFound: false,
        featFound: false,
        hasFeat: Boolean(featInfo.featArtist),
        pointsEarned: 0,
        qcmFailed: false,
        qcmUsed: false,
      };
    }

    // Generate hints for progressive reveal
    const artist = this.currentTrack.artist || '';
    const title = this.currentTrack.title || '';
    const artistInitial = artist ? artist.charAt(0).toUpperCase() : '?';
    const titleWords = title.split(' ').filter(Boolean);
    const titleMask = titleWords.map(w => {
      if (w.length <= 1) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + ' ' + '• '.repeat(w.length - 1).trim();
    }).join('   ');

    // Generate 4 QCM options (1 correct + 3 distractors) for Mukiz QCM mode
    const correctAnswerText = `${artist} — ${title}`;
    const distractors = this.tracks
      .filter(t => t.id !== this.currentTrack.id && (t.title !== title || t.artist !== artist))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(t => `${t.artist} — ${t.title}`);
    
    const fallbackOptions = ['Daft Punk — One More Time', 'Ninho — Jefe', 'Jul — Bande Organisée', 'Stromae — Papaoutai'];
    while (distractors.length < 3) {
      distractors.push(fallbackOptions[distractors.length] || 'Artiste — Morceau');
    }
    const qcmOptions = [correctAnswerText, ...distractors].sort(() => Math.random() - 0.5);

    return {
      roundNumber: this.currentRound,
      round: this.currentRound,
      totalRounds: this.totalRounds,
      previewUrl: this.currentTrack.preview,
      cover: this.currentTrack.cover,
      duration: this.roundDuration,
      genre: this.genre,
      hasFeat: Boolean(featInfo.featArtist),
      hintArtistInitial: artistInitial,
      hintTitleMask: titleMask,
      hintWordCount: titleWords.length,
      qcmOptions,
      isQcmOnly: this.mode === 'qcm' || this.bandizModifier === 'qcm',
    };
  }

  /**
   * Traite la réponse d'un joueur :
   * - Points pour Artiste, Titre et Feat séparés en saisie libre !
   * - Aide QCM de secours : 1 seule tentative, 0 point si erreur / bloqué, points réduits (-50%) si trouvé
   */
  submitAnswer(socketId, answer, isQcm = false) {
    const player = this.players.get(socketId);
    if (!player) return null;
    if (this.state !== ROOM_STATE.PLAYING) return null;

    if (!player.roundProgress) {
      const featInfo = Arbiter.extractFeaturing(this.currentTrack.title, this.currentTrack.artist);
      player.roundProgress = {
        artistFound: false,
        titleFound: false,
        featFound: false,
        hasFeat: Boolean(featInfo.featArtist),
        pointsEarned: 0,
        qcmFailed: false,
        qcmUsed: false,
      };
    }

    // Si le joueur a déjà raté l'aide QCM pour cette manche -> 0 point, bloqué
    if (player.roundProgress.qcmFailed) {
      return {
        success: false,
        is_correct: false,
        isQcm: true,
        qcmFailed: true,
        points: 0,
        totalScore: player.score,
        streak: 0,
        streakBonus: 0,
        streakLabel: null,
        feedback: "❌ Aide QCM échouée ! Zéro point sur cette manche.",
        message: "❌ Aide QCM échouée ! Zéro point sur cette manche.",
        artistFound: player.roundProgress.artistFound,
        titleFound: player.roundProgress.titleFound,
        featFound: player.roundProgress.featFound,
        hasFeat: player.roundProgress.hasFeat,
        isComplete: true,
        allAnswered: this.answeredThisRound >= this.players.size,
      };
    }

    // Si le joueur a déjà TOUT trouvé (Artiste + Titre + Feat si applicable)
    const isAlreadyFullyComplete = player.roundProgress.artistFound && player.roundProgress.titleFound && (!player.roundProgress.hasFeat || player.roundProgress.featFound);
    if (player.hasAnswered && isAlreadyFullyComplete) {
      return null;
    }

    const elapsed = (Date.now() - this.roundStartTime) / 1000;
    const timeRatio = Math.max(0, 1 - (elapsed / this.roundDuration));

    // Arbitrage avec détection de featuring
    const result = Arbiter.evaluate({
      expected_artist: this.currentTrack.artist,
      expected_title: this.currentTrack.title,
      player_answer: answer,
      difficulty: this.difficulty,
    });

    // ──────────────────────────────────────────────
    // CAS 1 : RÉPONSE VIA L'AIDE QCM DE FIN
    // ──────────────────────────────────────────────
    if (isQcm) {
      player.roundProgress.qcmUsed = true;
      const isCorrectQcm = result.artist_matches || result.title_matches;

      if (!isCorrectQcm) {
        // ❌ ERREUR AU QCM DE FIN : 0 point et verrouillage de la manche pour le joueur
        player.roundProgress.qcmFailed = true;
        player.hasAnswered = true;
        this.answeredThisRound++;
        player.streak = 0;

        const wrongMsg = "❌ Erreur au QCM de secours ! Zéro point sur cette manche.";
        player.lastAnswer = {
          answer,
          ...result,
          points: 0,
          streak: 0,
          streakBonus: 0,
          streakLabel: null,
          time: Math.round(elapsed * 10) / 10,
          feedback: wrongMsg,
          isQcm: true,
          qcmFailed: true,
        };

        return {
          ...result,
          success: false,
          is_correct: false,
          isQcm: true,
          qcmFailed: true,
          points: 0,
          totalScore: player.score,
          streak: 0,
          streakBonus: 0,
          streakLabel: null,
          feedback: wrongMsg,
          message: wrongMsg,
          artistFound: player.roundProgress.artistFound,
          titleFound: player.roundProgress.titleFound,
          featFound: player.roundProgress.featFound,
          hasFeat: player.roundProgress.hasFeat,
          isComplete: true,
          allAnswered: this.answeredThisRound >= this.players.size,
        };
      }

      // ✅ SUCCÈS AU QCM : points réduits (-50%) car aide de fin !
      let basePoints = 0;
      let newlyFoundArtist = false;
      let newlyFoundTitle = false;

      if (!player.roundProgress.artistFound) {
        player.roundProgress.artistFound = true;
        newlyFoundArtist = true;
        basePoints += 350;
      }
      if (!player.roundProgress.titleFound) {
        player.roundProgress.titleFound = true;
        newlyFoundTitle = true;
        basePoints += 350;
      }

      // 50% de pénalité car aide QCM
      let pointsToAdd = Math.max(100, Math.round(basePoints * 0.5));

      if (player.doublePointsActive) {
        pointsToAdd *= 2;
        player.doublePointsActive = false;
      }
      if (this.bandizModifier === 'x2') {
        pointsToAdd *= 2;
      }

      player.totalCorrect = (player.totalCorrect || 0) + 1;
      player.totalResponseTime = (player.totalResponseTime || 0) + elapsed;
      player.streak++;
      player.bestStreak = Math.max(player.bestStreak || 0, player.streak);

      player.score += pointsToAdd;
      player.roundProgress.pointsEarned += pointsToAdd;
      player.hasAnswered = true;
      this.answeredThisRound++;

      const feedbackMsg = `💡 Trouvé via l'Aide QCM ! (+${pointsToAdd} pts — points réduits)`;
      player.lastAnswer = {
        answer,
        ...result,
        points: pointsToAdd,
        streak: player.streak,
        streakBonus: 0,
        streakLabel: '💡 Aide QCM',
        time: Math.round(elapsed * 10) / 10,
        feedback: feedbackMsg,
        isQcm: true,
        qcmFailed: false,
      };

      return {
        ...result,
        success: true,
        is_correct: true,
        isQcm: true,
        qcmFailed: false,
        points: pointsToAdd,
        totalScore: player.score,
        streak: player.streak,
        streakBonus: 0,
        streakLabel: '💡 Aide QCM',
        feedback: feedbackMsg,
        message: feedbackMsg,
        newlyFound: {
          artist: newlyFoundArtist,
          title: newlyFoundTitle,
          feat: false,
        },
        artistFound: true,
        titleFound: true,
        featFound: player.roundProgress.featFound,
        hasFeat: player.roundProgress.hasFeat,
        isComplete: true,
        allAnswered: this.answeredThisRound >= this.players.size,
      };
    }

    // ──────────────────────────────────────────────
    // CAS 2 : RÉPONSE NORMALE (SAISIE LIBRE / VOIX)
    // ──────────────────────────────────────────────
    let newlyFoundArtist = false;
    let newlyFoundTitle = false;
    let newlyFoundFeat = false;
    let pointsToAdd = 0;

    // 1. Vérification Artiste
    if (result.artist_matches && !player.roundProgress.artistFound) {
      player.roundProgress.artistFound = true;
      newlyFoundArtist = true;
      // Points Artiste : 350 base + jusqu'à 200 rapidité
      const artistPoints = Math.round(350 + 200 * timeRatio);
      pointsToAdd += artistPoints;
    }

    // 2. Vérification Titre
    if (result.title_matches && !player.roundProgress.titleFound) {
      player.roundProgress.titleFound = true;
      newlyFoundTitle = true;
      // Points Titre : 350 base + jusqu'à 200 rapidité
      const titlePoints = Math.round(350 + 200 * timeRatio);
      pointsToAdd += titlePoints;
    }

    // 3. Vérification Featuring (si présent sur le morceau)
    if (result.feat_matches && player.roundProgress.hasFeat && !player.roundProgress.featFound) {
      player.roundProgress.featFound = true;
      newlyFoundFeat = true;
      // Points Feat : 200 bonus
      const featPoints = 200;
      pointsToAdd += featPoints;
    }

    let streakBonus = 0;
    let streakLabel = null;
    const somethingNew = newlyFoundArtist || newlyFoundTitle || newlyFoundFeat;

    if (somethingNew) {
      player.totalCorrect = (player.totalCorrect || 0) + 1;
      player.totalResponseTime = (player.totalResponseTime || 0) + elapsed;

      // Win Streak si artiste ou titre trouvé
      if (newlyFoundArtist || newlyFoundTitle) {
        player.streak++;
        player.bestStreak = Math.max(player.bestStreak || 0, player.streak);
        if (player.streak >= 2) {
          streakBonus = Math.min(400, player.streak * 80);
          streakLabel = `🔥 x${player.streak}`;
          pointsToAdd += streakBonus;
        }
      }

      // Bonus Joker Double Points
      if (player.doublePointsActive) {
        pointsToAdd *= 2;
        player.doublePointsActive = false;
        streakLabel = (streakLabel ? streakLabel + ' ' : '') + '⚡ DOUBLE!';
      }

      if (this.bandizModifier === 'x2') {
        pointsToAdd *= 2;
      }

      player.score += pointsToAdd;
      player.roundProgress.pointsEarned += pointsToAdd;

      // Vérifier si le joueur a maintenant validé Artiste ET Titre
      const isComplete = player.roundProgress.artistFound && player.roundProgress.titleFound;
      if (isComplete && !player.hasAnswered) {
        player.hasAnswered = true;
        this.answeredThisRound++;
      }

      // Message de feedback personnalisé précis
      let feedbackMsg = '';
      if (isComplete && (newlyFoundArtist && newlyFoundTitle)) {
        feedbackMsg = `🔥 PARFAIT ! Artiste & Titre trouvés d'un coup ! (+${pointsToAdd} pts)`;
      } else if (isComplete) {
        feedbackMsg = `🏆 Manche complétée ! Tout trouvé ! (+${pointsToAdd} pts)`;
      } else if (newlyFoundArtist && !player.roundProgress.titleFound) {
        feedbackMsg = `🎤 Artiste trouvé : "${result.target_artist}" (+${pointsToAdd} pts) ! Cherche maintenant le titre ! 🎵`;
      } else if (newlyFoundTitle && !player.roundProgress.artistFound) {
        feedbackMsg = `🎵 Titre trouvé : "${result.target_title}" (+${pointsToAdd} pts) ! Cherche maintenant l'artiste ! 🎤`;
      } else if (newlyFoundFeat) {
        feedbackMsg = `🎙️ Featuring trouvé : "${result.target_feat}" (+${pointsToAdd} pts) !`;
      }

      player.lastAnswer = {
        answer,
        ...result,
        points: pointsToAdd,
        streak: player.streak,
        streakBonus,
        streakLabel,
        time: Math.round(elapsed * 10) / 10,
        feedback: feedbackMsg,
      };

      return {
        ...result,
        success: true,
        is_correct: true,
        points: pointsToAdd,
        totalScore: player.score,
        streak: player.streak,
        streakBonus,
        streakLabel,
        feedback: feedbackMsg,
        message: feedbackMsg,
        newlyFound: {
          artist: newlyFoundArtist,
          title: newlyFoundTitle,
          feat: newlyFoundFeat,
        },
        artistFound: player.roundProgress.artistFound,
        titleFound: player.roundProgress.titleFound,
        featFound: player.roundProgress.featFound,
        hasFeat: player.roundProgress.hasFeat,
        isComplete: player.hasAnswered,
        allAnswered: this.answeredThisRound >= this.players.size,
      };
    } else {
      // Rien de nouveau trouvé
      let wrongMsg = 'Mauvaise réponse — Essaie encore ! 🔄';
      if (result.artist_matches && player.roundProgress.artistFound && !player.roundProgress.titleFound) {
        wrongMsg = `⚠️ Tu as déjà validé l'artiste (${result.target_artist}) ! Tape maintenant le titre ! 🎵`;
      } else if (result.title_matches && player.roundProgress.titleFound && !player.roundProgress.artistFound) {
        wrongMsg = `⚠️ Tu as déjà validé le titre (${result.target_title}) ! Tape maintenant l'artiste ! 🎤`;
      }

      player.lastAnswer = {
        answer,
        ...result,
        points: 0,
        streak: 0,
        streakBonus: 0,
        streakLabel: null,
        time: Math.round(elapsed * 10) / 10,
        feedback: wrongMsg,
      };

      return {
        ...result,
        success: false,
        is_correct: false,
        points: 0,
        totalScore: player.score,
        streak: player.streak,
        feedback: wrongMsg,
        message: wrongMsg,
        artistFound: player.roundProgress.artistFound,
        titleFound: player.roundProgress.titleFound,
        featFound: player.roundProgress.featFound,
        hasFeat: player.roundProgress.hasFeat,
        isComplete: player.hasAnswered,
        allAnswered: this.answeredThisRound >= this.players.size,
      };
    }
  }

  /**
   * Active un Joker / Power-up pour un joueur
   */
  useJoker(socketId, jokerType) {
    const player = this.players.get(socketId);
    if (!player) throw new Error('Joueur inconnu');
    if (this.state !== ROOM_STATE.PLAYING) throw new Error('Pas en cours de jeu');

    if (jokerType === 'DOUBLE_POINTS') {
      player.doublePointsActive = true;
      return { success: true, joker: 'DOUBLE_POINTS', message: 'Double Points activé pour ce round ! ⚡' };
    } else if (jokerType === '5050') {
      const artist = this.currentTrack.artist || '';
      const title = this.currentTrack.title || '';
      const correctAnswerText = `${artist} — ${title}`;
      return { success: true, joker: '5050', correctAnswerText, message: 'Joker 50/50 activé ! 🎯' };
    } else if (jokerType === 'FREEZE_TIME') {
      return { success: true, joker: 'FREEZE_TIME', extraSeconds: 5, message: 'Freeze +5s activé ! ❄️' };
    }
    throw new Error('Joker inconnu');
  }

  /**
   * Termine le round en cours
   */
  endRound() {
    this.state = ROOM_STATE.ROUND_END;

    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }

    const featInfo = Arbiter.extractFeaturing(this.currentTrack.title, this.currentTrack.artist);

    const roundResult = {
      roundNumber: this.currentRound,
      correctAnswer: {
        artist: this.currentTrack.artist,
        cleanArtist: featInfo.cleanArtist,
        title: this.currentTrack.title,
        cleanTitle: featInfo.cleanTitle,
        featArtist: featInfo.featArtist,
        cover: this.currentTrack.cover,
        coverBig: this.currentTrack.coverBig || this.currentTrack.cover,
        artistPhoto: this.currentTrack.artistPhoto || this.currentTrack.coverBig || this.currentTrack.cover,
        album: this.currentTrack.album,
      },
      playerResults: [],
    };

    for (const [, player] of this.players) {
      roundResult.playerResults.push({
        name: player.name,
        answer: player.lastAnswer?.answer || '(pas de réponse)',
        isCorrect: player.lastAnswer?.is_correct || false,
        points: player.lastAnswer?.points || 0,
        streak: player.streak,
        streakBonus: player.lastAnswer?.streakBonus || 0,
        streakLabel: player.lastAnswer?.streakLabel || null,
        featDetected: player.lastAnswer?.feat_detected || false,
        featBonus: player.lastAnswer?.feat_bonus || 0,
        totalScore: player.score,
        time: player.lastAnswer?.time || null,
        isQcm: player.lastAnswer?.isQcm || false,
        qcmFailed: player.lastAnswer?.qcmFailed || false,
      });
    }

    // Trier par score décroissant
    roundResult.playerResults.sort((a, b) => b.totalScore - a.totalScore);
    this.roundResults.push(roundResult);

    return roundResult;
  }

  /**
   * Retourne le classement final et les stats MVP
   */
  getFinalResults() {
    const rankings = [];
    for (const [, player] of this.players) {
      const totalRounds = this.totalRounds || 1;
      const accuracy = Math.round(((player.totalCorrect || 0) / totalRounds) * 100);
      const avgTime = player.totalCorrect > 0 
        ? Math.round(((player.totalResponseTime || 0) / player.totalCorrect) * 10) / 10 
        : 0;

      rankings.push({
        id: player.id,
        name: player.name,
        score: player.score,
        accuracy,
        avgTime,
        correctAnswers: player.totalCorrect || 0,
        bestStreak: player.bestStreak || 0,
      });
    }
    rankings.sort((a, b) => b.score - a.score);

    const winner = rankings[0] || null;
    let mvp = winner;
    if (rankings.length > 1) {
      mvp = [...rankings].sort((a, b) => (b.score + b.accuracy * 10) - (a.score + a.accuracy * 10))[0];
    }

    return {
      rankings,
      winner: winner,
      mvp: mvp,
      totalRounds: this.totalRounds,
      roundResults: this.roundResults,
    };
  }

  /**
   * Retourne l'état sérialisé de la room pour les clients
   */
  getState() {
    const players = [];
    for (const [, p] of this.players) {
      players.push({
        id: p.id,
        name: p.name,
        score: p.score,
        isHost: p.id === this.hostId,
      });
    }

    return {
      roomId: this.id,
      state: this.state,
      hostId: this.hostId,
      hostName: this.hostName,
      difficulty: this.difficulty,
      genre: this.genre,
      totalRounds: this.totalRounds,
      currentRound: this.currentRound,
      roundDuration: this.roundDuration,
      settings: this.settings,
      players,
    };
  }

  getPublicData() {
    return this.getState();
  }

  resetToLobby() {
    this.state = ROOM_STATE.LOBBY;
    this.currentRound = 0;
    this.tracks = [];
    this.currentTrack = null;
    this.roundResults = [];
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    for (const [, p] of this.players) {
      p.score = 0;
      p.hasAnswered = false;
      p.streak = 0;
      p.totalCorrect = 0;
      p.totalResponseTime = 0;
      p.doublePointsActive = false;
    }
  }

  get isEmpty() {
    return this.players.size === 0;
  }

  get isGameOver() {
    return this.state === ROOM_STATE.GAME_OVER;
  }
}

module.exports = { Room, ROOM_STATE };
