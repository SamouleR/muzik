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
  constructor(hostId, hostName, options = {}) {
    this.id = this._generateRoomCode();
    this.hostId = hostId;
    this.state = ROOM_STATE.LOBBY;
    this.createdAt = Date.now();

    // Settings
    this.difficulty = options.difficulty || 'DEBUTANT';
    this.genre = options.genre || 'mix';
    this.totalRounds = options.rounds || 10;
    this.roundDuration = options.roundDuration || 20; // seconds
    this.maxPlayers = options.maxPlayers || 8;

    // Joueurs : Map<socketId, { id, name, score, hasAnswered, lastAnswer }>
    this.players = new Map();
    this.addPlayer(hostId, hostName);

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
  _generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I,O,0,1 pour éviter la confusion
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
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

    this.players.set(socketId, {
      id: socketId,
      name: name,
      score: 0,
      hasAnswered: false,
      lastAnswer: null,
      streak: 0,  // réponses correctes consécutives
    });
  }

  /**
   * Retire un joueur de la room
   */
  removePlayer(socketId) {
    this.players.delete(socketId);

    // Si l'hôte part, transférer à un autre joueur
    if (socketId === this.hostId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value;
    }
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

    // Reset des réponses des joueurs
    for (const [, player] of this.players) {
      player.hasAnswered = false;
      player.lastAnswer = null;
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

    return {
      roundNumber: this.currentRound,
      round: this.currentRound,
      totalRounds: this.totalRounds,
      previewUrl: this.currentTrack.preview,
      cover: this.currentTrack.cover,
      duration: this.roundDuration,
      genre: this.genre,
      hintArtistInitial: artistInitial,
      hintTitleMask: titleMask,
      hintWordCount: titleWords.length,
    };
  }

  /**
   * Traite la réponse d'un joueur
   */
  submitAnswer(socketId, answer) {
    const player = this.players.get(socketId);
    if (!player) throw new Error('Joueur inconnu');
    if (player.hasAnswered) throw new Error('Tu as déjà répondu !');
    if (this.state !== ROOM_STATE.PLAYING) throw new Error('Pas en cours de jeu');

    player.hasAnswered = true;
    this.answeredThisRound++;

    const elapsed = (Date.now() - this.roundStartTime) / 1000;

    // Arbitrage avec détection de featuring
    const result = Arbiter.evaluate({
      expected_artist: this.currentTrack.artist,
      expected_title: this.currentTrack.title,
      player_answer: answer,
      difficulty: this.difficulty,
    });

    // Calcul des points : plus rapide = plus de points + Win Streak + Bonus Feat
    let points = 0;
    let streakBonus = 0;
    let streakLabel = null;

    if (result.is_correct) {
      // Base : 500 à 1000 points selon rapidité
      const timeRatio = Math.max(0, 1 - (elapsed / this.roundDuration));
      points = Math.round(500 + 500 * timeRatio);

      // Win Streak d'affilée (bonus consécutif)
      player.streak++;
      if (player.streak === 2) {
        streakBonus = 100;
        streakLabel = '🔥 x2';
      } else if (player.streak === 3) {
        streakBonus = 200;
        streakLabel = '🔥 x3';
      } else if (player.streak === 4) {
        streakBonus = 300;
        streakLabel = '🔥 x4';
      } else if (player.streak >= 5) {
        streakBonus = 500;
        streakLabel = `🔥 x${player.streak} ON FIRE!`;
      }
      points += streakBonus;

      // Bonus Feat si l'artiste invité a été cité
      if (result.feat_detected) {
        points += (result.feat_bonus || 150);
      }

      player.score += points;
    } else {
      player.streak = 0;
    }

    player.lastAnswer = {
      answer,
      ...result,
      points,
      streak: player.streak,
      streakBonus,
      streakLabel,
      time: Math.round(elapsed * 10) / 10,
    };

    return {
      ...result,
      points,
      streakBonus,
      streakLabel,
      time: player.lastAnswer.time,
      totalScore: player.score,
      streak: player.streak,
      allAnswered: this.answeredThisRound >= this.players.size,
    };
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
      });
    }

    // Trier par score décroissant
    roundResult.playerResults.sort((a, b) => b.totalScore - a.totalScore);
    this.roundResults.push(roundResult);

    return roundResult;
  }

  /**
   * Retourne le classement final
   */
  getFinalResults() {
    const rankings = [];
    for (const [, player] of this.players) {
      rankings.push({
        name: player.name,
        score: player.score,
      });
    }
    rankings.sort((a, b) => b.score - a.score);

    return {
      rankings,
      winner: rankings[0] || null,
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
      difficulty: this.difficulty,
      genre: this.genre,
      totalRounds: this.totalRounds,
      currentRound: this.currentRound,
      roundDuration: this.roundDuration,
      players,
    };
  }

  get isEmpty() {
    return this.players.size === 0;
  }

  get isGameOver() {
    return this.state === ROOM_STATE.GAME_OVER;
  }
}

module.exports = { Room, ROOM_STATE };
