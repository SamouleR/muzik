const { Room, ROOM_STATE } = require('./Room');
const DeezerService = require('../services/DeezerService');

/**
 * GameManager — orchestre toutes les rooms et les événements WebSocket
 */
class GameManager {
  constructor() {
    // Map<roomId, Room>
    this.rooms = new Map();
    // Map<socketId, roomId> — pour retrouver la room d'un joueur
    this.playerRooms = new Map();
    // Map<socketId, WebSocket>
    this.sockets = new Map();
  }

  /**
   * Enregistre un socket
   */
  registerSocket(socketId, ws) {
    this.sockets.set(socketId, ws);
  }

  /**
   * Désinscrit un socket et gère la déconnexion
   */
  unregisterSocket(socketId) {
    this.sockets.delete(socketId);
    const roomId = this.playerRooms.get(socketId);
    if (roomId) {
      this.leaveRoom(socketId);
    }
  }

  /**
   * Envoie un message JSON à un socket
   */
  sendTo(socketId, type, payload = {}) {
    const ws = this.sockets.get(socketId);
    if (ws && ws.readyState === 1) { // OPEN
      ws.send(JSON.stringify({ type, ...payload }));
    }
  }

  /**
   * Broadcast un message à tous les joueurs d'une room
   */
  broadcastToRoom(roomId, type, payload = {}, excludeId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const [playerId] of room.players) {
      if (playerId !== excludeId) {
        this.sendTo(playerId, type, payload);
      }
    }
  }

  /**
   * Crée une nouvelle room
   */
  createRoom(socketId, playerName, options = {}) {
    // Nettoyage : retirer le joueur d'une room existante
    if (this.playerRooms.has(socketId)) {
      this.leaveRoom(socketId);
    }

    const room = new Room(socketId, playerName, options);
    this.rooms.set(room.id, room);
    this.playerRooms.set(socketId, room.id);

    this.sendTo(socketId, 'ROOM_CREATED', {
      roomId: room.id,
      room: room.getState(),
      genres: DeezerService.getAvailableGenres(),
    });

    return room;
  }

  /**
   * Rejoindre une room existante
   */
  joinRoom(socketId, playerName, roomId) {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) {
      this.sendTo(socketId, 'ERROR', { message: `Room "${roomId}" introuvable 😕` });
      return;
    }

    try {
      // Quitter une éventuelle room existante
      if (this.playerRooms.has(socketId)) {
        this.leaveRoom(socketId);
      }

      room.addPlayer(socketId, playerName);
      this.playerRooms.set(socketId, room.id);

      // Notifier le nouveau joueur
      this.sendTo(socketId, 'ROOM_JOINED', { room: room.getState() });

      // Notifier les autres
      this.broadcastToRoom(room.id, 'PLAYER_JOINED', {
        playerName,
        room: room.getState(),
      }, socketId);
    } catch (err) {
      this.sendTo(socketId, 'ERROR', { message: err.message });
    }
  }

  /**
   * Quitter une room
   */
  leaveRoom(socketId) {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) {
      this.playerRooms.delete(socketId);
      return;
    }

    const playerName = room.players.get(socketId)?.name || 'Inconnu';
    room.removePlayer(socketId);
    this.playerRooms.delete(socketId);

    // Nettoyer les timers
    if (room.roundTimer) {
      clearTimeout(room.roundTimer);
      room.roundTimer = null;
    }

    if (room.isEmpty) {
      this.rooms.delete(roomId);
    } else {
      this.broadcastToRoom(roomId, 'PLAYER_LEFT', {
        playerName,
        room: room.getState(),
      });
    }

    this.sendTo(socketId, 'LEFT_ROOM', {});
  }

  /**
   * Met à jour les settings d'une room (seulement l'hôte)
   */
  updateSettings(socketId, settings) {
    const roomId = this.playerRooms.get(socketId);
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.hostId !== socketId) {
      this.sendTo(socketId, 'ERROR', { message: 'Seul l\'hôte peut changer les réglages' });
      return;
    }
    if (room.state !== ROOM_STATE.LOBBY) return;

    if (settings.difficulty) room.difficulty = settings.difficulty;
    if (settings.genre) room.genre = settings.genre;
    if (settings.rounds) room.totalRounds = Math.max(3, Math.min(20, settings.rounds));
    if (settings.roundDuration) room.roundDuration = Math.max(10, Math.min(30, settings.roundDuration));

    this.broadcastToRoom(roomId, 'SETTINGS_UPDATED', { room: room.getState() });
  }

  /**
   * Démarre la partie
   */
  async startGame(socketId) {
    const roomId = this.playerRooms.get(socketId);
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.hostId !== socketId) {
      this.sendTo(socketId, 'ERROR', { message: 'Seul l\'hôte peut lancer la partie' });
      return;
    }

    try {
      // Charger les tracks depuis Deezer
      this.broadcastToRoom(roomId, 'LOADING_TRACKS', { message: 'Chargement des morceaux... 🎵' });

      const tracks = await DeezerService.getRandomTracks(room.genre, room.totalRounds);

      if (tracks.length === 0) {
        this.broadcastToRoom(roomId, 'ERROR', { message: 'Aucun morceau trouvé, essaie un autre genre !' });
        return;
      }

      room.startGame(tracks);

      // Countdown 3-2-1
      this.broadcastToRoom(roomId, 'GAME_STARTING', {
        countdown: 3,
        room: room.getState(),
      });

      setTimeout(() => {
        this._startNextRound(roomId);
      }, 3500);
    } catch (err) {
      console.error('[GameManager] startGame error:', err);
      this.broadcastToRoom(roomId, 'ERROR', { message: 'Erreur au démarrage : ' + err.message });
    }
  }

  /**
   * Lance le prochain round d'une room
   */
  _startNextRound(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const roundData = room.nextRound();

    if (!roundData) {
      // Game Over
      const finalResults = room.getFinalResults();
      room.state = ROOM_STATE.GAME_OVER;
      this.broadcastToRoom(roomId, 'GAME_OVER', { results: finalResults });
      return;
    }

    this.broadcastToRoom(roomId, 'ROUND_START', roundData);

    // Timer du round
    room.roundTimer = setTimeout(() => {
      this._endRound(roomId);
    }, room.roundDuration * 1000);
  }

  /**
   * Termine le round en cours
   */
  _endRound(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || room.state !== ROOM_STATE.PLAYING) return;

    const roundResult = room.endRound();
    this.broadcastToRoom(roomId, 'ROUND_END', { result: roundResult });

    // Attendre 5 secondes avant le prochain round
    setTimeout(() => {
      this._startNextRound(roomId);
    }, 5000);
  }

  /**
   * Traite une réponse de joueur
   */
  submitAnswer(socketId, answer) {
    const roomId = this.playerRooms.get(socketId);
    const room = this.rooms.get(roomId);
    if (!room) return;

    try {
      const result = room.submitAnswer(socketId, answer);

      // Envoyer le résultat au joueur
      this.sendTo(socketId, 'ANSWER_RESULT', result);

      // Notifier les autres qu'un joueur a répondu (sans révéler la réponse)
      const playerName = room.players.get(socketId)?.name;
      this.broadcastToRoom(roomId, 'PLAYER_ANSWERED', {
        playerName,
        isCorrect: result.is_correct,
        answeredCount: room.answeredThisRound,
        totalPlayers: room.players.size,
      }, socketId);

      // Si tout le monde a répondu, terminer le round
      if (result.allAnswered) {
        setTimeout(() => this._endRound(roomId), 500);
      }
    } catch (err) {
      this.sendTo(socketId, 'ERROR', { message: err.message });
    }
  }

  /**
   * Retourne au lobby (après un game over)
   */
  backToLobby(socketId) {
    const roomId = this.playerRooms.get(socketId);
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.hostId !== socketId) return;

    room.state = ROOM_STATE.LOBBY;
    room.currentRound = 0;
    room.tracks = [];
    room.roundResults = [];
    for (const [, player] of room.players) {
      player.score = 0;
      player.streak = 0;
      player.hasAnswered = false;
      player.lastAnswer = null;
    }

    this.broadcastToRoom(roomId, 'BACK_TO_LOBBY', { room: room.getState() });
  }

  /**
   * Retourne la liste des rooms publiques pour l'affichage en direct
   */
  getPublicRooms() {
    const list = [];
    for (const [id, room] of this.rooms) {
      list.push({
        id: room.id,
        playerCount: room.players.size,
        maxPlayers: room.maxPlayers || 8,
        state: room.state,
        genre: room.genre,
        difficulty: room.difficulty,
        hostName: room.players.get(room.hostId)?.name || 'Anonyme',
      });
    }
    return list;
  }

  /**
   * Traite un message WebSocket entrant
   */
  handleMessage(socketId, message) {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      this.sendTo(socketId, 'ERROR', { message: 'Message invalide' });
      return;
    }

    const { type } = data;

    switch (type) {
      case 'CREATE_ROOM':
        this.createRoom(socketId, data.playerName, {
          difficulty: data.difficulty,
          genre: data.genre,
          rounds: data.rounds,
          roundDuration: data.roundDuration,
        });
        break;

      case 'JOIN_ROOM':
        this.joinRoom(socketId, data.playerName, data.roomId);
        break;

      case 'LEAVE_ROOM':
        this.leaveRoom(socketId);
        break;

      case 'UPDATE_SETTINGS':
        this.updateSettings(socketId, data.settings);
        break;

      case 'START_GAME':
        this.startGame(socketId);
        break;

      case 'SUBMIT_ANSWER':
        this.submitAnswer(socketId, data.answer);
        break;

      case 'BACK_TO_LOBBY':
        this.backToLobby(socketId);
        break;

      case 'GET_ROOMS':
        this.sendTo(socketId, 'ROOMS_LIST', { rooms: this.getPublicRooms() });
        break;

      case 'GET_PLAYLISTS':
        this.sendTo(socketId, 'PLAYLISTS_LIST', { playlists: DeezerService.getAvailablePlaylists() });
        break;

      default:
        this.sendTo(socketId, 'ERROR', { message: `Type de message inconnu: ${type}` });
    }
  }
}

module.exports = GameManager;
