/**
 * TournamentManager.js
 * Gestionnaire complet des Tournois Officiels Muzik
 * Géré par l'Administrateur : Inscriptions -> Quarts -> Demis -> Grande Finale -> Élection du Vainqueur
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../data/tournament_state.json');

const TOURNAMENT_STAGES = {
  REGISTRATION: 'REGISTRATION',       // Inscriptions ouvertes
  QUARTERS: 'QUARTERS',               // Quarts de finale (8 joueurs / 4 duels)
  SEMIS: 'SEMIS',                     // Demi-finales (4 joueurs / 2 duels)
  FINAL: 'FINAL',                     // Grande Finale (2 finalistes en duel ultime)
  FINISHED: 'FINISHED',               // Tournoi terminé avec Champion couronné
};

class TournamentManager {
  constructor() {
    this.tournaments = new Map();
    this.loadState();

    // S'assurer qu'au moins un tournoi officiel actif existe
    if (this.tournaments.size === 0) {
      this.initDefaultTournament();
    }
  }

  loadState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(t => this.tournaments.set(t.id, t));
        }
      }
    } catch (err) {
      console.warn('[TournamentManager] Impossible de charger tournament_state.json:', err.message);
    }
  }

  saveState() {
    try {
      const dir = path.dirname(STATE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.tournaments.values());
      fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.warn('[TournamentManager] Impossible de sauvegarder tournament_state.json:', err.message);
    }
  }

  createDefaultPlayersAndBracket() {
    const defaultPlayers = [
      { id: 'bot_1', name: 'Alex_92', avatar: '🎧', score: 1420 },
      { id: 'bot_2', name: 'Sarah_Music', avatar: '🌟', score: 1250 },
      { id: 'bot_3', name: 'Maxime_Rap', avatar: '🎤', score: 1380 },
      { id: 'bot_4', name: 'Léa_Pop', avatar: '🎵', score: 1190 },
      { id: 'bot_5', name: 'DaftFan', avatar: '🤖', score: 1510 },
      { id: 'bot_6', name: 'NinhoFan_93', avatar: '👑', score: 1340 },
    ];

    const quarters = [
      { id: 'Q1', p1: { name: 'Alex_92', avatar: '🎧' }, p2: { name: 'Léa_Pop', avatar: '🎵' }, score1: 1420, score2: 1190, winner: { name: 'Alex_92', avatar: '🎧' }, status: 'completed' },
      { id: 'Q2', p1: { name: 'Maxime_Rap', avatar: '🎤' }, p2: { name: 'En attente...', avatar: '❓' }, score1: 0, score2: 0, winner: null, status: 'pending' },
      { id: 'Q3', p1: { name: 'Sarah_Music', avatar: '🌟' }, p2: { name: 'NinhoFan_93', avatar: '👑' }, score1: 1250, score2: 1340, winner: { name: 'NinhoFan_93', avatar: '👑' }, status: 'completed' },
      { id: 'Q4', p1: { name: 'DaftFan', avatar: '🤖' }, p2: { name: 'En attente...', avatar: '❓' }, score1: 0, score2: 0, winner: null, status: 'pending' },
    ];

    const semis = [
      { id: 'S1', p1: { name: 'Alex_92', avatar: '🎧' }, p2: { name: 'Maxime_Rap', avatar: '🎤' }, score1: 0, score2: 0, winner: null, status: 'pending' },
      { id: 'S2', p1: { name: 'NinhoFan_93', avatar: '👑' }, p2: { name: 'DaftFan', avatar: '🤖' }, score1: 0, score2: 0, winner: null, status: 'pending' },
    ];

    const finalMatch = {
      id: 'FINAL',
      p1: { name: 'Finaliste 1', avatar: '⚔️' },
      p2: { name: 'Finaliste 2', avatar: '⚔️' },
      score1: 0,
      score2: 0,
      winner: null,
      status: 'pending',
    };

    return { registeredPlayers: defaultPlayers, matches: { quarters, semis, final: finalMatch } };
  }

  initDefaultTournament() {
    const { registeredPlayers, matches } = this.createDefaultPlayersAndBracket();

    const defaultTourney = {
      id: 'tourney_masters_2026',
      name: 'Grand Tournoi Muzik Masters 🏆',
      playlist: 'mix',
      playlistName: 'Hits Français & Internationaux',
      stage: TOURNAMENT_STAGES.REGISTRATION,
      entryFee: 50,
      rewardCoins: 500,
      rewardBadge: 'tournament_champ',
      rewardTitle: '👑 Grand Champion Muzik 2026',
      maxPlayers: 8,
      createdAt: Date.now(),
      registeredPlayers,
      matches,
      champion: null,
    };

    this.tournaments.set(defaultTourney.id, defaultTourney);
    this.saveState();
  }

  getActiveTournament() {
    for (const [, t] of this.tournaments) {
      if (t.stage !== TOURNAMENT_STAGES.FINISHED) {
        return t;
      }
    }
    // Si tous sont finis, renvoyer le plus récent
    const all = Array.from(this.tournaments.values());
    return all[all.length - 1] || null;
  }

  getAllTournaments() {
    return Array.from(this.tournaments.values()).reverse();
  }

  createTournament({ name, playlist, playlistName, maxPlayers = 8, entryFee = 50, rewardCoins = 500, rewardBadge = 'tournament_champ' }) {
    const id = 'tourney_' + Date.now();
    const newTournament = {
      id,
      name: name || 'Tournoi Officiel Muzik',
      playlist: playlist || 'mix',
      playlistName: playlistName || 'Playlist Officielle',
      stage: TOURNAMENT_STAGES.REGISTRATION,
      entryFee: Number(entryFee) || 50,
      rewardCoins: Number(rewardCoins) || 500,
      rewardBadge,
      rewardTitle: '👑 Champion Muzik',
      maxPlayers: Number(maxPlayers) || 8,
      createdAt: Date.now(),
      registeredPlayers: [],
      matches: {
        quarters: [],
        semis: [],
        final: { id: 'FINAL', p1: null, p2: null, score1: 0, score2: 0, winner: null, status: 'pending' },
      },
      champion: null,
    };

    this.tournaments.set(id, newTournament);
    this.saveState();
    return newTournament;
  }

  registerPlayer(tournamentId, player) {
    const t = this.tournaments.get(tournamentId) || this.getActiveTournament();
    if (!t) throw new Error('Tournoi introuvable');
    if (t.stage !== TOURNAMENT_STAGES.REGISTRATION) {
      throw new Error('Les inscriptions pour ce tournoi sont fermées');
    }

    const alreadyRegistered = t.registeredPlayers.some(p => p.id === player.id || p.name === player.name);
    if (alreadyRegistered) {
      return { success: true, message: 'Déjà inscrit au tournoi !', tournament: t };
    }

    if (t.registeredPlayers.length >= t.maxPlayers) {
      throw new Error('Le tournoi est complet (' + t.maxPlayers + ' joueurs)');
    }

    t.registeredPlayers.push({
      id: player.id || 'p_' + Date.now(),
      name: player.name || 'Joueur',
      avatar: player.avatar || '🎧',
      joinedAt: Date.now(),
      score: 0,
    });

    this.saveState();
    return { success: true, message: 'Inscription validée avec succès ! 🏆', tournament: t };
  }

  // ⚔️ ADMIN: Lancer les Quarts de finale
  startQuarters(tournamentId) {
    const t = this.tournaments.get(tournamentId) || this.getActiveTournament();
    if (!t) throw new Error('Tournoi introuvable');

    // Compléter avec des participants bots si moins de 8
    const defaultBots = [
      { name: 'Alex_92', avatar: '🎧' },
      { name: 'Sarah_Music', avatar: '🌟' },
      { name: 'Maxime_Rap', avatar: '🎤' },
      { name: 'Léa_Pop', avatar: '🎵' },
      { name: 'DaftFan', avatar: '🤖' },
      { name: 'Stromae_Club', avatar: '🕺' },
      { name: 'Kenza_Rnb', avatar: '💎' },
      { name: 'Bastien_Electro', avatar: '⚡' },
    ];

    let playerPool = [...t.registeredPlayers];
    let botIndex = 0;
    while (playerPool.length < 8) {
      const candidate = defaultBots[botIndex] || { name: `Challenger_${botIndex + 1}`, avatar: '🎵' };
      if (!playerPool.some(p => p.name === candidate.name)) {
        playerPool.push({ id: 'bot_' + botIndex, name: candidate.name, avatar: candidate.avatar });
      }
      botIndex++;
    }

    // Mélanger et générer 4 duels de quarts de finale
    playerPool = playerPool.slice(0, 8).sort(() => Math.random() - 0.5);

    t.matches.quarters = [
      { id: 'Q1', p1: playerPool[0], p2: playerPool[1], score1: Math.floor(Math.random() * 300) + 700, score2: Math.floor(Math.random() * 300) + 500, winner: playerPool[0], status: 'completed' },
      { id: 'Q2', p1: playerPool[2], p2: playerPool[3], score1: Math.floor(Math.random() * 300) + 650, score2: Math.floor(Math.random() * 300) + 750, winner: playerPool[3], status: 'completed' },
      { id: 'Q3', p1: playerPool[4], p2: playerPool[5], score1: Math.floor(Math.random() * 300) + 800, score2: Math.floor(Math.random() * 300) + 600, winner: playerPool[4], status: 'completed' },
      { id: 'Q4', p1: playerPool[6], p2: playerPool[7], score1: Math.floor(Math.random() * 300) + 720, score2: Math.floor(Math.random() * 300) + 550, winner: playerPool[6], status: 'completed' },
    ];

    t.stage = TOURNAMENT_STAGES.QUARTERS;
    this.saveState();
    return { success: true, message: 'Quarts de finale lancés et duels générés ! ⚔️', tournament: t };
  }

  // ⚡ ADMIN: Lancer les Demi-finales
  startSemis(tournamentId) {
    const t = this.tournaments.get(tournamentId) || this.getActiveTournament();
    if (!t) throw new Error('Tournoi introuvable');

    const q = t.matches.quarters;
    const semi1_p1 = q[0]?.winner || { name: 'Vainqueur Q1', avatar: '🎧' };
    const semi1_p2 = q[1]?.winner || { name: 'Vainqueur Q2', avatar: '🎵' };
    const semi2_p1 = q[2]?.winner || { name: 'Vainqueur Q3', avatar: '🌟' };
    const semi2_p2 = q[3]?.winner || { name: 'Vainqueur Q4', avatar: '⚡' };

    t.matches.semis = [
      { id: 'S1', p1: semi1_p1, p2: semi1_p2, score1: Math.floor(Math.random() * 250) + 850, score2: Math.floor(Math.random() * 250) + 700, winner: semi1_p1, status: 'completed' },
      { id: 'S2', p1: semi2_p1, p2: semi2_p2, score1: Math.floor(Math.random() * 250) + 680, score2: Math.floor(Math.random() * 250) + 900, winner: semi2_p2, status: 'completed' },
    ];

    t.stage = TOURNAMENT_STAGES.SEMIS;
    this.saveState();
    return { success: true, message: 'Demi-finales lancées ! Les 4 meilleurs s\'affrontent ⚡', tournament: t };
  }

  // 👑 ADMIN: Lancer la Grande Finale
  startGrandFinal(tournamentId) {
    const t = this.tournaments.get(tournamentId) || this.getActiveTournament();
    if (!t) throw new Error('Tournoi introuvable');

    const s = t.matches.semis;
    const final1 = s[0]?.winner || { name: 'Finaliste 1', avatar: '👑' };
    const final2 = s[1]?.winner || { name: 'Finaliste 2', avatar: '⚡' };

    t.matches.final = {
      id: 'FINAL',
      p1: final1,
      p2: final2,
      score1: 1250,
      score2: 1180,
      winner: final1,
      status: 'active',
    };

    t.stage = TOURNAMENT_STAGES.FINAL;
    this.saveState();
    return { success: true, message: '👑 GRANDE FINALE LANCÉE ! Qui sera le meilleur ?', tournament: t };
  }

  // 🏆 ADMIN: Couronner le Grand Champion
  crownChampion(tournamentId, chosenWinnerName = null) {
    const t = this.tournaments.get(tournamentId) || this.getActiveTournament();
    if (!t) throw new Error('Tournoi introuvable');

    const finalMatch = t.matches.final;
    const winner = chosenWinnerName ? 
      (finalMatch.p1?.name === chosenWinnerName ? finalMatch.p1 : finalMatch.p2) :
      (finalMatch.winner || finalMatch.p1 || { name: 'Champion Suprême', avatar: '👑' });

    finalMatch.winner = winner;
    finalMatch.status = 'completed';

    t.champion = {
      name: winner.name,
      avatar: winner.avatar || '👑',
      score: Math.max(finalMatch.score1, finalMatch.score2) || 1450,
      title: t.rewardTitle || '👑 Grand Champion Muzik',
      badge: t.rewardBadge || 'tournament_champ',
      coins: t.rewardCoins || 500,
      crownedAt: Date.now(),
    };

    t.stage = TOURNAMENT_STAGES.FINISHED;
    this.saveState();
    return { success: true, message: `🏆 ${winner.name} est couronné GRAND CHAMPION MUZIK !`, tournament: t };
  }

  // 🔄 ADMIN: Réinitialiser le tournoi
  resetTournament(tournamentId) {
    const t = this.tournaments.get(tournamentId) || this.getActiveTournament();
    if (!t) throw new Error('Tournoi introuvable');

    t.stage = TOURNAMENT_STAGES.REGISTRATION;
    const { registeredPlayers, matches } = this.createDefaultPlayersAndBracket();
    t.registeredPlayers = registeredPlayers;
    t.matches = matches;
    t.champion = null;

    this.saveState();
    return { success: true, message: 'Tournoi réinitialisé pour de nouvelles inscriptions !', tournament: t };
  }
}

module.exports = new TournamentManager();
