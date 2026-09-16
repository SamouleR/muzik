const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const GameManager = require('./src/game/GameManager');
const DeezerService = require('./src/services/DeezerService');
const AiService = require('./src/services/AiService');
const PaymentService = require('./src/services/PaymentService');
const TournamentManager = require('./src/game/TournamentManager');
const RapQuizService = require('./src/services/RapQuizService');
const MusicQuizService = require('./src/services/MusicQuizService');
const { applySecurityHeaders, rateLimiter, sanitizeHTML, wsRateLimiter, wsRateLimiterCleanup, validatePlaylistUrl } = require('./src/security/SecurityMiddleware');

// Muzik Blind Test Server - Reloaded for QCM Lifeline
const PORT = process.env.PORT || 3000;

// Express app
const app = express();
const server = http.createServer(app);

// 🛡️ Security Headers (CSP, XSS, FrameGuard)
app.use(applySecurityHeaders);

app.use(express.json());

// 🛡️ Global Rate Limiting for API routes
app.use('/api/', rateLimiter({ windowMs: 60000, maxRequests: 120 }));

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// 🛡️ Route /admin pour accéder directement au panel d'administration
app.get(['/admin', '/admin/*'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Playlists API
app.get('/api/playlists', (req, res) => {
  res.json({ playlists: DeezerService.getAvailablePlaylists() });
});

// 🤖 HarmonIA AI Chatbot Endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message requis pour HarmonIA' });
    }
    const aiResponse = await AiService.processMessage(message, context);
    res.json(aiResponse);
  } catch (err) {
    console.error('[HarmonIA AI Error]:', err.message);
    res.status(500).json({ success: false, message: 'HarmonIA est momentanément indisponible.' });
  }
});

// 💳 Payment & Checkout Session Creation API
app.post('/api/checkout/create-session', (req, res) => {
  try {
    const { itemId, paymentMethod } = req.body || {};
    if (!itemId) {
      return res.status(400).json({ success: false, message: 'ID d\'article requis' });
    }
    const session = PaymentService.createSession(itemId, paymentMethod);
    res.json(session);
  } catch (err) {
    console.error('[Checkout Create Error]:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// 💳 Payment Verification & Wallet Signature API
app.post('/api/checkout/verify', (req, res) => {
  try {
    const { sessionId, signature, userState } = req.body || {};
    const result = PaymentService.verifyPayment(sessionId, signature, userState);
    res.json(result);
  } catch (err) {
    console.error('[Checkout Verify Error]:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// 🛡️ Validate Wallet Cryptographic Signature API
app.post('/api/security/validate-wallet', (req, res) => {
  try {
    const { coins, isVip, clientSignature } = req.body || {};
    const result = PaymentService.validateWallet(coins, isVip, clientSignature);
    res.json(result);
  } catch (err) {
    res.status(400).json({ valid: false, error: err.message });
  }
});

// Import Spotify / Deezer custom playlist
app.post('/api/playlists/import', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL de playlist manquante' });
    }
    // 🛡️ Validate URL against whitelist (Spotify/Deezer only) — NOT sanitizeHTML which breaks URLs
    const validation = validatePlaylistUrl(url);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.error });
    }
    const playlist = await DeezerService.importPlaylistFromUrl(validation.sanitizedUrl);
    res.json({ success: true, playlist });
  } catch (err) {
    console.error('[Import playlist error]:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Search tracks API (for Custom Playlist Creator)
app.get('/api/tracks/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q || !q.trim()) {
      return res.json({ tracks: [] });
    }
    const sanitizedQuery = sanitizeHTML(q.trim());
    const tracks = await DeezerService.searchTracks(sanitizedQuery, 15);
    res.json({ success: true, tracks });
  } catch (err) {
    console.error('[Track search error]:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create custom playlist API
app.post('/api/playlists/custom', (req, res) => {
  try {
    const { name, description, emoji, tracks } = req.body || {};
    if (!name || !tracks || tracks.length === 0) {
      return res.status(400).json({ success: false, message: 'Nom ou morceaux manquants' });
    }
    const cleanName = sanitizeHTML(name);
    const cleanDesc = sanitizeHTML(description || '');
    const playlist = DeezerService.createCustomPlaylist({ name: cleanName, description: cleanDesc, emoji, tracks });
    res.json({ success: true, playlist });
  } catch (err) {
    console.error('[Create custom playlist error]:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Live Artist Search API (for 100% Artist Generator)
app.get('/api/artists/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q || !q.trim()) {
      return res.json({ success: true, artists: [] });
    }
    const cleanQ = sanitizeHTML(q.trim());
    const artists = await DeezerService.searchArtists(cleanQ, 8);
    res.json({ success: true, artists });
  } catch (err) {
    console.error('[Artist search error]:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Artist discography API (Full & infinite discography)
app.get('/api/artist/:name/discography', async (req, res) => {
  try {
    const name = sanitizeHTML(req.params.name);
    if (!name) return res.status(400).json({ success: false, message: 'Nom d\'artiste manquant' });
    const tracks = await DeezerService.getArtistDiscography(name, 250);
    res.json({ success: true, count: tracks.length, tracks });
  } catch (err) {
    console.error('[Artist Discography Error]:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// WebSocket Server
const wss = new WebSocketServer({ server });
const gameManager = new GameManager();

// Rooms API
app.get('/api/rooms', (req, res) => {
  res.json({ rooms: gameManager.getRoomsList() });
});

// ═══════════════════════════════════════
// 🛡️ ADMIN PANEL API ROUTES
// ═══════════════════════════════════════

// Admin Login Authentication Endpoint
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Identifiant et mot de passe requis' });
    }
    const cleanUser = sanitizeHTML(String(username).trim());
    const validPasswords = ['admin', 'harmonie2026', 'admin123'];
    const isUserAdmin = (cleanUser.toLowerCase() === 'admin' || cleanUser.toLowerCase() === 'alex');
    
    if (isUserAdmin && validPasswords.includes(password)) {
      const token = 'adm_' + Buffer.from(`${cleanUser}:${Date.now()}`).toString('base64');
      return res.json({
        success: true,
        token,
        user: { name: cleanUser, role: 'admin' },
        message: 'Connexion administrateur réussie'
      });
    }
    return res.status(401).json({ success: false, message: 'Identifiant ou mot de passe incorrect' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Server telemetry & metrics for Admin Panel
app.get('/api/admin/stats', (req, res) => {
  const roomsDetails = [];
  gameManager.rooms.forEach((room, id) => {
    roomsDetails.push({
      id,
      name: room.name,
      state: room.state,
      genre: room.genre,
      playersCount: room.players.size,
      currentRound: room.currentRound,
      totalRounds: room.totalRounds,
    });
  });

  res.json({
    success: true,
    stats: {
      uptimeSeconds: Math.floor(process.uptime()),
      connectedSockets: gameManager.sockets.size,
      activeRoomsCount: gameManager.rooms.size,
      rooms: roomsDetails,
      memoryUsage: process.memoryUsage(),
      timestamp: Date.now(),
    }
  });
});

// Broadcast admin alert to all active players
app.post('/api/admin/broadcast-alert', (req, res) => {
  try {
    const { text, level } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message manquant' });
    }
    const cleanText = sanitizeHTML(text.trim());
    gameManager.broadcastToAll('ADMIN_ALERT', {
      text: cleanText,
      level: level || 'info',
      timestamp: Date.now()
    });
    res.json({ success: true, message: 'Alerte diffusée à tous les joueurs en ligne !' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Airdrop coins to all online players
app.post('/api/admin/airdrop', (req, res) => {
  try {
    const { amount, reason } = req.body || {};
    const coins = parseInt(amount, 10) || 100;
    const cleanReason = sanitizeHTML(reason || 'Cadeau Administrateur Harmonie');
    gameManager.broadcastToAll('AIRDROP_COINS', {
      amount: coins,
      reason: cleanReason,
      timestamp: Date.now()
    });
    res.json({ success: true, message: `Airdrop de ${coins} 🪙 envoyé à tous les joueurs !` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Clear cache
app.post('/api/admin/clear-cache', (req, res) => {
  try {
    DeezerService.clearCache();
    res.json({ success: true, message: 'Cache mémoire Deezer & Spotify réinitialisé avec succès' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 🏆 TOURNAMENTS PUBLIC API
app.get('/api/tournaments', (req, res) => {
  try {
    const active = TournamentManager.getActiveTournament();
    const all = TournamentManager.getAllTournaments();
    res.json({ success: true, active, all });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/tournaments/join', (req, res) => {
  try {
    const { tournamentId, player } = req.body || {};
    const result = TournamentManager.registerPlayer(tournamentId, player);
    gameManager.broadcastToAll('TOURNAMENT_UPDATED', { tournament: result.tournament });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 🏆 TOURNAMENTS ADMIN API
app.post('/api/admin/tournaments/create', (req, res) => {
  try {
    const tournament = TournamentManager.createTournament(req.body || {});
    gameManager.broadcastToAll('TOURNAMENT_UPDATED', { tournament });
    res.json({ success: true, tournament });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/tournaments/advance', (req, res) => {
  try {
    const { tournamentId, action, winnerName } = req.body || {};
    let result;
    if (action === 'start_quarters') {
      result = TournamentManager.startQuarters(tournamentId);
    } else if (action === 'start_semis') {
      result = TournamentManager.startSemis(tournamentId);
    } else if (action === 'start_final') {
      result = TournamentManager.startGrandFinal(tournamentId);
    } else if (action === 'crown_champion') {
      result = TournamentManager.crownChampion(tournamentId, winnerName);
    } else if (action === 'reset') {
      result = TournamentManager.resetTournament(tournamentId);
    } else {
      return res.status(400).json({ success: false, message: 'Action inconnue' });
    }
    gameManager.broadcastToAll('TOURNAMENT_UPDATED', { tournament: result.tournament });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 🎵 QUIZZ MUSICAL MULTI-THÈMES (35 000+ Questions : Rap, Rock, Pop, Chanson, Electro, 80s/90s, Cinéma, World)
app.get(['/api/music-quiz/questions', '/api/rap-quiz/questions'], (req, res) => {
  try {
    const count = parseInt(req.query.count, 10) || 10;
    const category = req.query.category || req.query.theme || 'all';
    const questions = MusicQuizService.getBatchQuestions(count, category);
    res.json({ success: true, count: questions.length, theme: category, questions });
  } catch (err) {
    console.error('[Music Quiz Error]:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get(['/api/music-quiz/stats', '/api/rap-quiz/stats'], (req, res) => {
  try {
    const stats = MusicQuizService.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post(['/api/music-quiz/complete', '/api/rap-quiz/complete'], (req, res) => {
  try {
    const { score, correct, total, coinsEarned, theme } = req.body || {};
    const rewardCoins = coinsEarned || Math.max(15, (correct || 0) * 15);
    res.json({
      success: true,
      message: 'Session Quizz Musical validée !',
      theme: theme || 'all',
      reward: {
        coins: rewardCoins,
        xp: (score || 0) * 2
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

function broadcastOnlineCount() {
  const count = wss.clients.size;
  const msg = JSON.stringify({ type: 'ONLINE_COUNT', count });
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1) ws.send(msg);
  });
}

// 🛡️ Max WebSocket message size (2KB — prevents DoS via large payloads)
const WS_MAX_PAYLOAD = 2048;

wss.on('connection', (ws, req) => {
  const socketId = uuidv4();
  gameManager.registerSocket(socketId, ws);

  console.log(`[WS] ✅ Connecté: ${socketId}`);

  // Envoyer l'ID au client et le online count
  ws.send(JSON.stringify({ type: 'CONNECTED', socketId }));
  broadcastOnlineCount();

  ws.on('message', (raw) => {
    try {
      const message = raw.toString();

      // 🛡️ Reject oversized messages
      if (message.length > WS_MAX_PAYLOAD) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Message trop volumineux (max 2KB)' }));
        return;
      }

      // 🛡️ Per-socket rate limiting (max 30 messages per 10 seconds)
      const rateCheck = wsRateLimiter(socketId);
      if (!rateCheck.allowed) {
        ws.send(JSON.stringify({ type: 'ERROR', message: '⚠️ Trop de messages envoyés. Patientez quelques secondes.' }));
        return;
      }

      gameManager.handleMessage(socketId, message);
    } catch (err) {
      console.error(`[WS] Erreur message:`, err);
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Erreur serveur' }));
    }
  });

  ws.on('close', () => {
    console.log(`[WS] ❌ Déconnecté: ${socketId}`);
    gameManager.unregisterSocket(socketId);
    wsRateLimiterCleanup(socketId);
    broadcastOnlineCount();
  });

  ws.on('error', (err) => {
    console.error(`[WS] Erreur socket:`, err.message);
  });
});

// Heartbeat pour détecter les connexions mortes
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

wss.on('close', () => clearInterval(interval));

if (process.env.VERCEL) {
  module.exports = app;
} else {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ╔══════════════════════════════════════════╗
    ║   🎵  HARMONIE BLIND TEST 🎵              ║
    ║   🛡️  Security Headers & CSP Active       ║
    ║   🤖  HarmonIA AI Chatbot Endpoint Active  ║
    ║                                          ║
    ║   Server:  http://localhost:${PORT}         ║
    ║   WS:      ws://localhost:${PORT}           ║
    ╚══════════════════════════════════════════╝
    `);
  });
  module.exports = server;
}

