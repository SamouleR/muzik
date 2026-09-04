const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const GameManager = require('./src/game/GameManager');

const DeezerService = require('./src/services/DeezerService');

const PORT = process.env.PORT || 3000;

// Express app
const app = express();
const server = http.createServer(app);

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Playlists API
app.get('/api/playlists', (req, res) => {
  res.json({ playlists: DeezerService.getAvailablePlaylists() });
});

// WebSocket Server
const wss = new WebSocketServer({ server });
const gameManager = new GameManager();

// Rooms API
app.get('/api/rooms', (req, res) => {
  res.json({ rooms: gameManager.getPublicRooms() });
});

function broadcastOnlineCount() {
  const count = wss.clients.size;
  const msg = JSON.stringify({ type: 'ONLINE_COUNT', count });
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1) ws.send(msg);
  });
}

wss.on('connection', (ws, req) => {
  const socketId = uuidv4();
  gameManager.registerSocket(socketId, ws);

  console.log(`[WS] ✅ Connecté: ${socketId}`);

  // Envoyer l'ID au client et le online count
  ws.send(JSON.stringify({ type: 'CONNECTED', socketId }));
  broadcastOnlineCount();

  ws.on('message', (raw) => {
    try {
      gameManager.handleMessage(socketId, raw.toString());
    } catch (err) {
      console.error(`[WS] Erreur message:`, err);
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Erreur serveur' }));
    }
  });

  ws.on('close', () => {
    console.log(`[WS] ❌ Déconnecté: ${socketId}`);
    gameManager.unregisterSocket(socketId);
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

// Start server
server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   🎵  MUZIK BLIND TEST  🎵              ║
  ║                                          ║
  ║   Server:  http://localhost:${PORT}         ║
  ║   WS:      ws://localhost:${PORT}           ║
  ╚══════════════════════════════════════════╝
  `);
});
