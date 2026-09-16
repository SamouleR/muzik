const fs = require('fs');
const path = require('path');
const { Room, ROOM_STATE } = require('./Room');
const DeezerService = require('../services/DeezerService');
const { sanitizeHTML } = require('../security/SecurityMiddleware');

const CHAT_FILE = path.join(__dirname, '../data/chatHistory.json');

/**
 * GameManager — orchestre toutes les rooms, le chat global réel et les événements WebSocket
 */
class GameManager {
  constructor() {
    // Map<roomId, Room>
    this.rooms = new Map();
    // Map<socketId, roomId> — pour retrouver la room d'un joueur
    this.playerRooms = new Map();
    // Map<socketId, WebSocket>
    this.sockets = new Map();

    // Chat global réel persisté
    this.globalChatHistory = this.loadChatHistory();

    // 🛡️ Per-user chat throttle tracker
    this.chatThrottle = new Map();
  }

  loadChatHistory() {
    try {
      const dataDir = path.join(__dirname, '../data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (fs.existsSync(CHAT_FILE)) {
        const raw = fs.readFileSync(CHAT_FILE, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('[GameManager] Erreur chargement chat history:', err.message);
    }
    return [];
  }

  saveChatHistory() {
    try {
      const dataDir = path.join(__dirname, '../data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(CHAT_FILE, JSON.stringify(this.globalChatHistory, null, 2), 'utf8');
    } catch (err) {
      console.error('[GameManager] Erreur sauvegarde chat history:', err.message);
    }
  }

  /**
   * Enregistre un socket et lui transmet l'historique du Chat Global
   */
  registerSocket(socketId, ws) {
    this.sockets.set(socketId, ws);

    // Envoyer l'historique du chat global réel au nouveau joueur connecté
    this.sendTo(socketId, 'GLOBAL_CHAT_HISTORY', { messages: this.globalChatHistory });
  }

  /**
   * Traite les messages du Chat Global réel envoyé par n'importe quel joueur
   * 🛡️ Throttled: max 1 message per 2 seconds per socket
   */
  handleGlobalChat(socketId, data) {
    // 🛡️ Per-user chat throttle (1 msg / 2s)
    const now = Date.now();
    const lastSent = this.chatThrottle.get(socketId) || 0;
    if (now - lastSent < 2000) {
      this.sendTo(socketId, 'ERROR', { message: '⏳ Attends 2 secondes avant de renvoyer un message.' });
      return;
    }
    this.chatThrottle.set(socketId, now);

    const rawText = data.message || '';
    const cleanText = sanitizeHTML(rawText.trim());
    if (!cleanText) return;

    const name = sanitizeHTML(data.name || 'Joueur') || 'Joueur';
    const avatar = data.avatar || '🦊';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const msgObj = {
      id: 'gmsg_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      senderId: socketId,
      name,
      avatar,
      text: cleanText.substring(0, 180),
      time,
      timestamp: Date.now()
    };

    // Conserver les 60 derniers messages réels
    this.globalChatHistory.push(msgObj);
    if (this.globalChatHistory.length > 60) {
      this.globalChatHistory.shift();
    }

    this.saveChatHistory();

    // Diffuser à TOUS les joueurs connectés en direct
    this.broadcastToAll('GLOBAL_CHAT_MESSAGE', { message: msgObj });
  }

  /**
   * Diffuse un message à absolument tous les sockets actifs
   */
  broadcastToAll(type, payload = {}) {
    const dataStr = JSON.stringify({ type, ...payload });
    this.sockets.forEach((ws) => {
      if (ws.readyState === 1) { // OPEN
        ws.send(dataStr);
      }
    });
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
   * Envoie un message à tous les joueurs d'une room
   */
  broadcastToRoom(roomId, type, payload = {}) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const dataStr = JSON.stringify({ type, ...payload });
    room.players.forEach((_, socketId) => {
      const ws = this.sockets.get(socketId);
      if (ws && ws.readyState === 1) {
        ws.send(dataStr);
      }
    });
  }

  /**
   * Création d'un salon public ou privé
   */
  createRoom(socketId, playerName, settings = {}) {
    const roomId = Room.generateRoomId();
    const room = new Room(roomId, socketId, playerName, settings);
    this.rooms.set(roomId, room);
    this.playerRooms.set(socketId, roomId);

    this.sendTo(socketId, 'ROOM_CREATED', {
      roomId,
      room: room.getPublicData(),
      isHost: true,
    });

    this.broadcastRoomsList();
    return room;
  }

  /**
   * Rejoindre un salon existant
   */
  joinRoom(socketId, playerName, roomId) {
    const cleanRoomId = (roomId || '').toUpperCase().trim();
    const room = this.rooms.get(cleanRoomId);

    if (!room) {
      this.sendTo(socketId, 'ERROR', { message: `Salon #${cleanRoomId} introuvable.` });
      return;
    }

    if (room.players.size >= room.settings.maxPlayers) {
      this.sendTo(socketId, 'ERROR', { message: 'Le salon est complet.' });
      return;
    }

    const player = room.addPlayer(socketId, playerName);
    this.playerRooms.set(socketId, cleanRoomId);

    this.sendTo(socketId, 'ROOM_JOINED', {
      roomId: cleanRoomId,
      room: room.getPublicData(),
      isHost: room.hostId === socketId,
    });

    this.broadcastToRoom(cleanRoomId, 'PLAYER_JOINED', {
      player,
      players: Array.from(room.players.values()),
    });

    this.broadcastRoomsList();
  }

  /**
   * Quitter un salon
   */
  leaveRoom(socketId) {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      const remainingCount = room.removePlayer(socketId);
      this.playerRooms.delete(socketId);

      if (remainingCount === 0) {
        this.rooms.delete(roomId);
        console.log(`[GameManager] Room #${roomId} fermée (plus de joueurs)`);
      } else {
        this.broadcastToRoom(roomId, 'PLAYER_LEFT', {
          socketId,
          newHostId: room.hostId,
          players: Array.from(room.players.values()),
        });
      }
    }

    this.sendTo(socketId, 'LEFT_ROOM', { roomId });
    this.broadcastRoomsList();
  }

  /**
   * Met à jour les réglages de la room
   */
  updateSettings(socketId, settings) {
    const roomId = this.playerRooms.get(socketId);
    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== socketId) return;

    room.updateSettings(settings);
    this.broadcastToRoom(roomId, 'SETTINGS_UPDATED', {
      settings: room.settings,
    });
    this.broadcastRoomsList();
  }

  /**
  /**
   * Lancer la partie
   */
  async startGame(socketId) {
    const roomId = this.playerRooms.get(socketId);
    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== socketId) return;

    if (room.state !== ROOM_STATE.LOBBY) {
      this.sendTo(socketId, 'ERROR', { message: 'La partie est déjà en cours.' });
      return;
    }

    this.broadcastToRoom(roomId, 'LOADING_TRACKS', { message: 'Préparation des morceaux audio…' });

    try {
      const count = room.totalRounds || 10;
      const tracks = await DeezerService.getRandomTracks(room.genre || 'mix', count);
      if (!tracks || tracks.length === 0) {
        throw new Error('Aucun extrait audio trouvé pour cette playlist.');
      }

      room.startGame(tracks);
      const firstRoundData = room.nextRound();

      this.broadcastToRoom(roomId, 'GAME_STARTING', {
        totalRounds: room.totalRounds,
        playlistName: room.genre,
        countdown: 3,
      });

      setTimeout(() => {
        this.broadcastRoundStart(roomId, firstRoundData);
      }, 3000);

    } catch (err) {
      console.error('[GameManager] Error starting game:', err.message);
      this.broadcastToRoom(roomId, 'ERROR', { message: 'Échec du chargement de la playlist : ' + err.message });
      room.state = ROOM_STATE.LOBBY;
    }
  }

  /**
   * Transmet le début d'une manche
   */
  broadcastRoundStart(roomId, roundData) {
    const room = this.rooms.get(roomId);
    if (!room || !roundData) return;

    this.broadcastToRoom(roomId, 'ROUND_START', roundData);

    // Nettoyer l'ancien timer s'il existe
    if (room.roundTimer) {
      clearTimeout(room.roundTimer);
      room.roundTimer = null;
    }

    // Déclencher la fin de manche quand le temps est écoulé
    const duration = roundData.duration || room.roundDuration || 20;
    room.roundTimer = setTimeout(() => {
      this.endRound(roomId);
    }, duration * 1000);
  }

  /**
   * Soumission d'une réponse
   */
  submitAnswer(socketId, answerText, isQcm = false) {
    const roomId = this.playerRooms.get(socketId);
    const room = this.rooms.get(roomId);
    if (!room || room.state !== ROOM_STATE.PLAYING) return;

    const player = room.players.get(socketId);
    if (!player) return;
    if (player.roundProgress?.qcmFailed) return;
    if (player.hasAnswered && (!player.roundProgress?.hasFeat || player.roundProgress?.featFound)) return;

    try {
      const result = room.submitAnswer(socketId, answerText, isQcm);
      if (!result) return;

      this.sendTo(socketId, 'ANSWER_RESULT', {
        success: result.is_correct,
        points: result.points,
        message: result.feedback || (result.is_correct ? 'Bien joué !' : 'Essaie encore !'),
        totalScore: result.totalScore,
        streak: result.streak,
        streakBonus: result.streakBonus,
        streakLabel: result.streakLabel,
        artistFound: result.artistFound,
        titleFound: result.titleFound,
        featFound: result.featFound,
        hasFeat: result.hasFeat,
        isComplete: result.isComplete,
        newlyFound: result.newlyFound,
        isQcm: Boolean(result.isQcm),
        qcmFailed: Boolean(result.qcmFailed),
      });

      if (result.is_correct) {
        this.broadcastToRoom(roomId, 'PLAYER_ANSWERED', {
          playerId: socketId,
          playerName: player.name,
          correct: true,
          points: result.points,
          totalScore: player.score,
          isQcm: Boolean(result.isQcm),
          players: Array.from(room.players.values()),
        });
      }

      if (result.allAnswered) {
        if (room.roundTimer) {
          clearTimeout(room.roundTimer);
          room.roundTimer = null;
        }
        setTimeout(() => this.endRound(roomId), 1000);
      }
    } catch (err) {
      console.error('[GameManager] submitAnswer error:', err.message);
    }
  }

  /**
   * Fin de la manche
   */
  endRound(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.roundTimer) {
      clearTimeout(room.roundTimer);
      room.roundTimer = null;
    }

    const summary = room.endRound();
    const isGameOver = room.isGameOver;

    this.broadcastToRoom(roomId, 'ROUND_END', {
      result: summary,
      isGameOver,
    });

    if (isGameOver) {
      const finalResults = room.getFinalResults();
      setTimeout(() => {
        this.broadcastToRoom(roomId, 'GAME_OVER', {
          rankings: finalResults.rankings,
          winner: finalResults.winner,
          mvp: finalResults.mvp,
          results: finalResults,
        });
      }, 4000);
    } else {
      setTimeout(() => {
        const nextRoundData = room.nextRound();
        if (nextRoundData) {
          this.broadcastRoundStart(roomId, nextRoundData);
        } else {
          this.endRound(roomId);
        }
      }, 5000);
    }
  }

  /**
   * Retour au lobby après game over
   */
  backToLobby(socketId) {
    const roomId = this.playerRooms.get(socketId);
    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== socketId) return;

    room.resetToLobby();
    this.broadcastToRoom(roomId, 'BACK_TO_LOBBY', {
      room: room.getPublicData(),
    });
  }

  /**
   * Utilisation d'un joker
   */
  useJoker(socketId, jokerType) {
    const roomId = this.playerRooms.get(socketId);
    const room = this.rooms.get(roomId);
    if (!room || room.state !== ROOM_STATE.PLAYING) return;

    const currentTrack = room.currentTrack;
    if (!currentTrack) return;

    if (jokerType === '5050') {
      const correctTitle = currentTrack.title;
      const allOptions = room.currentRoundData?.options || [];
      const wrongOptions = allOptions.filter(o => o.title !== correctTitle);
      const toRemove = wrongOptions.slice(0, 2).map(o => o.title);

      this.sendTo(socketId, 'JOKER_RESULT', {
        joker: '5050',
        removedTitles: toRemove,
      });

      this.broadcastToRoom(roomId, 'PLAYER_USED_JOKER', {
        socketId,
        playerName: room.players.get(socketId)?.name,
        joker: '5050',
      });
    }
  }

  /**
   * Message dans le chat de room
   */
  sendChat(socketId, messageText) {
    const roomId = this.playerRooms.get(socketId);
    const room = this.rooms.get(roomId);
    if (!room || !messageText || !messageText.trim()) return;

    const playerName = room.players.get(socketId)?.name || 'Inconnu';
    this.broadcastToRoom(roomId, 'CHAT_MESSAGE', {
      senderId: socketId,
      senderName: playerName,
      text: messageText.trim().substring(0, 150),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  }

  /**
   * Traite l'envoi d'une réaction émote flottante
   */
  sendReaction(socketId, emoji) {
    const roomId = this.playerRooms.get(socketId);
    const room = this.rooms.get(roomId);
    if (!room) return;

    const playerName = room.players.get(socketId)?.name || 'Inconnu';
    this.broadcastToRoom(roomId, 'REACTION_EMOTE', {
      senderId: socketId,
      senderName: playerName,
      emoji: emoji || '🔥',
    });
  }

  /**
   * Liste des salons publics
   */
  getPublicRooms() {
    const list = [];
    this.rooms.forEach((room) => {
      if (!room.settings.isPrivate) {
        list.push({
          id: room.id,
          hostName: room.hostName,
          genre: room.settings.genre,
          difficulty: room.settings.difficulty,
          playerCount: room.players.size,
          maxPlayers: room.settings.maxPlayers,
          state: room.state,
        });
      }
    });
    return list;
  }

  /**
   * Diffuse la liste des salons à tous
   */
  broadcastRoomsList() {
    const rooms = this.getPublicRooms();
    const dataStr = JSON.stringify({ type: 'ROOMS_LIST', rooms });
    this.sockets.forEach((ws) => {
      if (ws.readyState === 1) ws.send(dataStr);
    });
  }

  /**
   * Gère les messages WebSocket entrants
   */
  handleMessage(socketId, rawMessage) {
    let data;
    try {
      data = JSON.parse(rawMessage);
    } catch {
      return;
    }

    const { type } = data;

    switch (type) {
      case 'CREATE_ROOM':
        this.createRoom(socketId, data.playerName, {
          playlist: data.playlist || data.genre || 'mix',
          genre: data.genre || 'mix',
          difficulty: data.difficulty || 'INTERMEDIAIRE',
          rounds: data.rounds || 10,
          roundDuration: data.roundDuration || data.duration || 30,
          bandizModifier: data.bandizModifier
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
        this.submitAnswer(socketId, data.answer, Boolean(data.isQcm));
        break;

      case 'SEND_CHAT':
        this.sendChat(socketId, data.message);
        break;

      case 'SEND_GLOBAL_CHAT':
        this.handleGlobalChat(socketId, data);
        break;

      case 'SEND_REACTION':
        this.sendReaction(socketId, data.emoji);
        break;

      case 'USE_JOKER':
        this.useJoker(socketId, data.joker);
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
