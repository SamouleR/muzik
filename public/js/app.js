/**
 * MUZIK — Main Application Client (Mukiz Inspired)
 * State management, WebSocket communication, UI routing, Game loops
 */
;(function () {
  'use strict';

  // ═══════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════
  const state = {
    socketId: null,
    playerName: localStorage.getItem('muzik_player_name') || '',
    ws: null,
    room: null,
    isHost: false,
    timerInterval: null,
    timerRemaining: 0,
    hasAnswered: false,
    playlists: [],
    currentView: 'view-home',
    onlineCount: 1,
  };

  // ═══════════════════════════════════════
  // DOM HELPERS
  // ═══════════════════════════════════════
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ═══════════════════════════════════════
  // WEBSOCKET SETUP
  // ═══════════════════════════════════════
  function connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}`;

    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
      console.log('[WS] Connecté au serveur');
      send('GET_PLAYLISTS');
      send('GET_ROOMS');
    };

    state.ws.onclose = () => {
      console.log('[WS] Déconnecté');
      UIEffects.showToast('Connexion perdue. Reconnexion…', 'error');
      setTimeout(connectWebSocket, 2000);
    };

    state.ws.onerror = (err) => {
      console.error('[WS] Erreur:', err);
    };

    state.ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      handleServerMessage(data);
    };
  }

  function send(type, payload = {}) {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify({ type, ...payload }));
    }
  }

  // ═══════════════════════════════════════
  // MESSAGE DISPATCHER
  // ═══════════════════════════════════════
  function handleServerMessage(data) {
    const handlers = {
      CONNECTED: onConnected,
      ONLINE_COUNT: onOnlineCount,
      PLAYLISTS_LIST: onPlaylistsList,
      ROOMS_LIST: onRoomsList,
      ROOM_CREATED: onRoomCreated,
      ROOM_JOINED: onRoomJoined,
      PLAYER_JOINED: onPlayerJoined,
      PLAYER_LEFT: onPlayerLeft,
      SETTINGS_UPDATED: onSettingsUpdated,
      LEFT_ROOM: onLeftRoom,
      LOADING_TRACKS: onLoadingTracks,
      GAME_STARTING: onGameStarting,
      ROUND_START: onRoundStart,
      ANSWER_RESULT: onAnswerResult,
      PLAYER_ANSWERED: onPlayerAnswered,
      ROUND_END: onRoundEnd,
      GAME_OVER: onGameOver,
      BACK_TO_LOBBY: onBackToLobby,
      ERROR: onError,
    };

    const handler = handlers[data.type];
    if (handler) {
      handler(data);
    } else {
      console.warn('[App] Type de message inconnu:', data.type);
    }
  }

  // ═══════════════════════════════════════
  // MESSAGE HANDLERS
  // ═══════════════════════════════════════
  function onConnected(data) {
    state.socketId = data.socketId;
    console.log('[App] Connecté avec ID:', state.socketId);
  }

  function onOnlineCount(data) {
    state.onlineCount = data.count || 1;
    const countEl = $('#online-count');
    if (countEl) countEl.textContent = state.onlineCount;
  }

  function onPlaylistsList(data) {
    if (data.playlists) {
      state.playlists = data.playlists;
      populatePlaylistSelect(data.playlists);
      renderPlaylistsGrid(data.playlists);
    }
  }

  function onRoomsList(data) {
    renderLiveGames(data.rooms || []);
  }

  function onRoomCreated(data) {
    state.room = data.room;
    state.isHost = true;
    if (data.genres) {
      state.playlists = data.genres;
      populatePlaylistSelect(data.genres);
    }
    showView('view-lobby');
    renderLobby();
    UIEffects.showToast(`Salon créé ! Code : ${data.roomId}`, 'success');
  }

  function onRoomJoined(data) {
    state.room = data.room;
    state.isHost = data.room.hostId === state.socketId;
    showView('view-lobby');
    renderLobby();
    UIEffects.showToast(`Tu as rejoint le salon ! 🎉`, 'success');
  }

  function onPlayerJoined(data) {
    state.room = data.room;
    renderLobby();
    UIEffects.showToast(`${data.playerName} a rejoint la partie ! 👋`, 'info');
  }

  function onPlayerLeft(data) {
    state.room = data.room;
    state.isHost = state.room.hostId === state.socketId;
    renderLobby();
    UIEffects.showToast(`${data.playerName} a quitté le salon`, 'info');
  }

  function onSettingsUpdated(data) {
    state.room = data.room;
    renderLobby();
    UIEffects.showToast('Réglages mis à jour ⚙️', 'info', 1500);
  }

  function onLeftRoom() {
    state.room = null;
    state.isHost = false;
    stopRoundTimer();
    AudioPlayer.stop();
    showView('view-home');
    send('GET_ROOMS');
  }

  function onLoadingTracks() {
    showLoading('Chargement des musiques… 🎵');
  }

  function onGameStarting(data) {
    hideLoading();
    showView('view-game');
    UIEffects.countdown(data.countdown || 3, () => {
      console.log('[App] Démarrage du 1er round !');
    });
  }

  function onRoundStart(data) {
    state.hasAnswered = false;

    // Masquer les overlays de round
    $('#g-feedback')?.classList.add('hidden');
    $('#g-round-end')?.classList.add('hidden');

    // Round info
    const roundEl = $('#g-round');
    const totalEl = $('#g-total');
    if (roundEl) roundEl.textContent = data.round;
    if (totalEl) totalEl.textContent = data.totalRounds;

    // Reset input
    const input = $('#g-answer');
    if (input) {
      input.value = '';
      input.disabled = false;
      input.placeholder = 'Tape ta réponse (Artiste et/ou Titre)…';
      input.focus();
    }
    const submitBtn = $('#g-submit');
    if (submitBtn) submitBtn.disabled = false;

    const micStatus = $('#g-speech-status');
    if (micStatus) micStatus.textContent = 'Clique pour parler ou tape ta réponse';
    const preview = $('#g-speech-preview');
    if (preview) preview.textContent = '';

    // Cover masquée pendant le round
    AudioPlayer.setCover('');

    // Play preview
    if (data.previewUrl) {
      AudioPlayer.play(data.previewUrl);
    }

    // Mini scoreboard
    updateMiniScoreboard();

    // Timer
    startRoundTimer(data.duration || 20);
  }

  function onAnswerResult(data) {
    const { success, artistFound, titleFound, points, message, bonusSpeed, streak } = data;

    const fb = $('#g-feedback');
    const fbIcon = $('#g-fb-icon');
    const fbMsg = $('#g-fb-msg');
    const fbPts = $('#g-fb-pts');

    if (!fb) return;

    if (success) {
      state.hasAnswered = true;
      const input = $('#g-answer');
      if (input) {
        input.disabled = true;
        input.placeholder = 'Bonne réponse validée ! ✅';
      }
      const submitBtn = $('#g-submit');
      if (submitBtn) submitBtn.disabled = true;

      SpeechInput.stopListening();

      if (fbIcon) fbIcon.textContent = '🔥';
      if (fbMsg) fbMsg.textContent = message || 'Trouvé !';

      let ptsText = `+${points} pts`;
      if (bonusSpeed) ptsText += ` (+${bonusSpeed} vitesse)`;
      if (streak > 1) ptsText += ` (Série x${streak} !)`;
      if (fbPts) fbPts.textContent = ptsText;

      fb.className = 'game-feedback correct';
      UIEffects.scorePopup(`+${points}`, true);
    } else {
      if (fbIcon) fbIcon.textContent = '❌';
      if (fbMsg) fbMsg.textContent = message || 'Mauvaise réponse';
      if (fbPts) fbPts.textContent = '';
      fb.className = 'game-feedback wrong';

      UIEffects.shake($('#g-answer'));
    }

    fb.classList.remove('hidden');
    setTimeout(() => {
      if (!state.hasAnswered) {
        fb.classList.add('hidden');
      }
    }, 1800);
  }

  function onPlayerAnswered(data) {
    if (data.playerId !== state.socketId) {
      UIEffects.showToast(`${data.playerName} a trouvé ! ⚡ (+${data.points} pts)`, 'info', 2000);
    }
    if (data.players && state.room) {
      state.room.players = data.players;
      updateMiniScoreboard();
    }
  }

  function onRoundEnd(data) {
    stopRoundTimer();
    AudioPlayer.stop();
    SpeechInput.stopListening();

    const { track, answers, scores } = data.result;

    if (track) {
      AudioPlayer.setCover(track.cover);
      const cCover = $('#g-correct-cover');
      const cArtist = $('#g-correct-artist');
      const cTitle = $('#g-correct-title');
      if (cCover) cCover.src = track.cover || '';
      if (cArtist) cArtist.textContent = track.artist || 'Artiste inconnu';
      if (cTitle) cTitle.textContent = track.title || 'Titre';
    }

    // Résultats du round
    const list = $('#g-round-results');
    if (list && scores) {
      list.innerHTML = scores.map(s => {
        const pAnswer = answers?.[s.id];
        const icon = pAnswer?.success ? '✅' : '❌';
        return `
          <li class="result-player-item ${pAnswer?.success ? 'success' : ''}">
            <span class="res-player">${escapeHtml(s.name)}</span>
            <span class="res-points">${icon} +${pAnswer?.points || 0} pts</span>
            <span class="res-total">Total: ${s.score}</span>
          </li>
        `;
      }).join('');
    }

    // Mise à jour de la room
    if (state.room && scores) {
      scores.forEach(s => {
        const p = state.room.players?.find(pl => pl.id === s.id);
        if (p) p.score = s.score;
      });
      updateMiniScoreboard();
    }

    $('#g-feedback')?.classList.add('hidden');
    $('#g-round-end')?.classList.remove('hidden');
  }

  function onGameOver(data) {
    stopRoundTimer();
    AudioPlayer.stop();
    SpeechInput.stopListening();

    showView('view-gameover');

    const results = data.results;
    if (!results) return;

    // Winner highlight
    const winner = results.rankings?.[0];
    const wName = $('#go-winner-name');
    const wScore = $('#go-winner-score');
    if (wName) wName.textContent = winner ? `${winner.name}` : 'Égalité';
    if (wScore) wScore.textContent = winner ? `${winner.score} points` : '';

    // Full rankings
    const rankingsList = $('#go-rankings');
    if (rankingsList && results.rankings) {
      rankingsList.innerHTML = results.rankings.map((p, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
        return `
          <li class="ranking-row ${idx === 0 ? 'first-place' : ''}">
            <span class="rank-pos">${medal}</span>
            <span class="rank-name">${escapeHtml(p.name)}</span>
            <span class="rank-score">${p.score} pts</span>
            <span class="rank-correct">${p.correctAnswers || 0} trouvés</span>
          </li>
        `;
      }).join('');
    }

    // Replay button (host only)
    const replayBtn = $('#go-replay');
    if (replayBtn) {
      replayBtn.style.display = state.isHost ? 'inline-block' : 'none';
    }

    // Confetti
    const canvas = $('#confetti-canvas');
    if (canvas) {
      UIEffects.celebrate(canvas);
    }
  }

  function onBackToLobby(data) {
    state.room = data.room;
    showView('view-lobby');
    renderLobby();
    UIEffects.showToast('De retour dans le salon ! 🛋️', 'info');
  }

  function onError(data) {
    hideLoading();
    UIEffects.showToast(data.message || 'Une erreur est survenue', 'error');
  }

  // ═══════════════════════════════════════
  // VIEW NAVIGATION
  // ═══════════════════════════════════════
  function showView(viewId) {
    state.currentView = viewId;
    $$('.view').forEach(v => v.classList.remove('active'));
    const target = $(`#${viewId}`);
    if (target) target.classList.add('active');

    // Mettre à jour les liens de nav
    $$('.nav-link, .sidebar-link').forEach(link => {
      const navTarget = link.getAttribute('data-nav');
      if (viewId === 'view-home' && navTarget === 'accueil') {
        link.classList.add('active');
      } else if (viewId === 'view-playlists' && navTarget === 'playlists') {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ═══════════════════════════════════════
  // TIMER
  // ═══════════════════════════════════════
  function startRoundTimer(duration) {
    stopRoundTimer();
    state.timerRemaining = duration;

    const fill = $('#g-timer-fill');
    const text = $('#g-timer-text');

    if (text) text.textContent = duration;
    if (fill) fill.style.width = '100%';

    const startTime = Date.now();
    const totalMs = duration * 1000;

    state.timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingMs = Math.max(0, totalMs - elapsed);
      const remainingSec = Math.ceil(remainingMs / 1000);

      const percent = (remainingMs / totalMs) * 100;
      if (fill) {
        fill.style.width = `${percent}%`;
        if (percent < 25) {
          fill.style.background = '#e63946';
        } else if (percent < 50) {
          fill.style.background = '#ff6b35';
        } else {
          fill.style.background = '#06d6a0';
        }
      }

      if (text) text.textContent = remainingSec;

      if (remainingMs <= 0) {
        stopRoundTimer();
      }
    }, 100);
  }

  function stopRoundTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  // ═══════════════════════════════════════
  // LOBBY RENDERING
  // ═══════════════════════════════════════
  function renderLobby() {
    if (!state.room) return;

    // Room Code
    const codeEl = $('#lobby-room-code');
    if (codeEl) codeEl.textContent = state.room.roomId;

    // QR Code
    generateQrCode(state.room.roomId);

    // Settings
    const settingsCard = $('#lobby-settings');
    if (settingsCard) {
      // Les inputs ne sont modifiables que par l'hôte
      const inputs = settingsCard.querySelectorAll('select');
      inputs.forEach(sel => {
        sel.disabled = !state.isHost;
      });

      const diff = $('#setting-difficulty');
      const genre = $('#setting-genre');
      const rounds = $('#setting-rounds');
      const duration = $('#setting-duration');

      if (diff && state.room.difficulty) diff.value = state.room.difficulty;
      if (genre && state.room.genre) genre.value = state.room.genre;
      if (rounds && state.room.totalRounds) rounds.value = String(state.room.totalRounds);
      if (duration && state.room.roundDuration) duration.value = String(state.room.roundDuration);
    }

    // Players list
    const playersList = $('#lobby-players');
    const badge = $('#player-count-badge');
    if (badge && state.room.players) badge.textContent = state.room.players.length;

    if (playersList && state.room.players) {
      playersList.innerHTML = state.room.players.map(p => `
        <li class="lobby-player-item ${p.isHost ? 'is-host' : ''}">
          <div class="player-avatar">${getAvatarEmoji(p.name)}</div>
          <div class="player-meta">
            <span class="player-name">${escapeHtml(p.name)}</span>
            ${p.isHost ? '<span class="badge-host-pill">👑 HÔTE</span>' : '<span class="badge-guest-pill">JOUEUR</span>'}
          </div>
        </li>
      `).join('');
    }

    // Host controls vs guest waiting
    const startBtn = $('#btn-start-game');
    const waitingMsg = $('#waiting-host');
    if (state.isHost) {
      if (startBtn) startBtn.style.display = 'block';
      if (waitingMsg) waitingMsg.style.display = 'none';
    } else {
      if (startBtn) startBtn.style.display = 'none';
      if (waitingMsg) waitingMsg.style.display = 'flex';
    }
  }

  function generateQrCode(roomId) {
    const canvas = $('#qr-canvas');
    if (!canvas || !window.QRCode) return;

    const joinUrl = `${location.origin}${location.pathname}?room=${roomId}`;
    window.QRCode.toCanvas(canvas, joinUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff',
      },
    }, (err) => {
      if (err) console.warn('[QRCode] Error:', err);
    });
  }

  function populatePlaylistSelect(playlists) {
    const select = $('#setting-genre');
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = playlists.map(p => `
      <option value="${p.key}">${p.emoji || '🎵'} ${p.name}</option>
    `).join('');

    if (currentVal && playlists.some(p => p.key === currentVal)) {
      select.value = currentVal;
    }
  }

  // ═══════════════════════════════════════
  // PLAYLISTS VIEW RENDERING
  // ═══════════════════════════════════════
  function renderPlaylistsGrid(playlists, filter = 'all') {
    const grid = $('#playlists-grid');
    if (!grid) return;

    let filtered = playlists;
    if (filter === 'popular') {
      filtered = playlists.filter(p => ['hits-fr', 'rap-fr', 'pop', 'tiktok', 'pop-2020s'].includes(p.key));
    } else if (filter === 'new') {
      filtered = playlists.filter(p => ['pop-2020s', 'tiktok', 'summer', 'jeux-video'].includes(p.key));
    }

    grid.innerHTML = filtered.map(p => `
      <div class="playlist-card" data-key="${p.key}" style="border-top: 5px solid ${p.color || '#4361ee'}">
        <div class="playlist-icon" style="background: ${p.color || '#4361ee'}22; color: ${p.color || '#4361ee'}">
          ${p.emoji || '🎵'}
        </div>
        <div class="playlist-info">
          <h4 class="playlist-title">${escapeHtml(p.name)}</h4>
          <span class="playlist-tag">30s Previews</span>
        </div>
        <button class="btn btn-sm btn-yellow btn-play-playlist" data-key="${p.key}">
          ▶ Jouer
        </button>
      </div>
    `).join('');

    // Click handler for playlist play buttons
    $$('.btn-play-playlist').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.getAttribute('data-key');
        const name = getPlayerName();
        if (!name) return;
        state.playerName = name;
        AudioPlayer.ensureAudioContext();
        send('CREATE_ROOM', { playerName: name, genre: key });
      });
    });
  }

  // ═══════════════════════════════════════
  // LIVE GAMES RENDERING
  // ═══════════════════════════════════════
  function renderLiveGames(rooms) {
    const container = $('#live-games');
    if (!container) return;

    if (!rooms || rooms.length === 0) {
      container.innerHTML = '<div class="empty-state">Aucune partie publique en cours pour le moment. Sois le premier à en créer une !</div>';
      return;
    }

    container.innerHTML = rooms.map(r => `
      <div class="live-game-item">
        <div class="live-game-info">
          <span class="live-game-code">#${r.id}</span>
          <span class="live-game-host">Hôte : <strong>${escapeHtml(r.hostName)}</strong></span>
          <span class="live-game-meta">Genre : ${escapeHtml(r.genre)} • ${r.difficulty}</span>
        </div>
        <div class="live-game-action">
          <span class="player-count">${r.playerCount} joueur${r.playerCount > 1 ? 's' : ''}</span>
          <button class="btn btn-sm btn-yellow btn-join-live" data-room="${r.id}">
            Rejoindre
          </button>
        </div>
      </div>
    `).join('');

    $$('.btn-join-live').forEach(btn => {
      btn.addEventListener('click', () => {
        const roomId = btn.getAttribute('data-room');
        const name = getPlayerName();
        if (!name) return;
        state.playerName = name;
        AudioPlayer.ensureAudioContext();
        send('JOIN_ROOM', { playerName: name, roomId });
      });
    });
  }

  // ═══════════════════════════════════════
  // MINI SCOREBOARD
  // ═══════════════════════════════════════
  function updateMiniScoreboard() {
    const container = $('#g-scoreboard');
    if (!container || !state.room?.players) return;

    const sorted = [...state.room.players].sort((a, b) => (b.score || 0) - (a.score || 0));

    container.innerHTML = sorted.slice(0, 6).map((p, idx) => `
      <div class="mini-score-item ${p.id === state.socketId ? 'is-me' : ''}">
        <span class="mini-pos">${idx === 0 ? '👑' : `#${idx + 1}`}</span>
        <span class="mini-score-name">${escapeHtml(p.name)}</span>
        <span class="mini-score-value">${p.score || 0}</span>
      </div>
    `).join('');
  }

  // ═══════════════════════════════════════
  // OVERLAY HELPERS
  // ═══════════════════════════════════════
  function showLoading(msg) {
    const overlay = $('#loading-overlay');
    const msgEl = $('#loading-msg');
    if (msgEl) msgEl.textContent = msg || 'Chargement…';
    if (overlay) overlay.classList.remove('hidden');
  }

  function hideLoading() {
    $('#loading-overlay')?.classList.add('hidden');
  }

  // ═══════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getAvatarEmoji(name) {
    const avatars = ['🦊', '🐼', '🐯', '🦁', '🐵', '🐸', '🐙', '🦄', '🐨', '🐺', '🦉', '🐱'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash += name.charCodeAt(i);
    return avatars[hash % avatars.length];
  }

  function getPlayerName() {
    const input = $('#player-name');
    let name = (input?.value || '').trim();
    if (!name) {
      name = state.playerName || '';
    }
    if (!name) {
      name = prompt('Choisis ton pseudo pour jouer :');
      if (name) name = name.trim();
    }
    if (!name) {
      UIEffects.showToast('Entre ton pseudo d\'abord !', 'warning');
      UIEffects.shake(input);
      input?.focus();
      return null;
    }
    state.playerName = name;
    localStorage.setItem('muzik_player_name', name);
    if (input) input.value = name;
    return name;
  }

  // ═══════════════════════════════════════
  // EVENT BINDINGS
  // ═══════════════════════════════════════
  function bindEvents() {
    // Restaurer le pseudo sauvegardé
    if (state.playerName) {
      const pInput = $('#player-name');
      if (pInput) pInput.value = state.playerName;
    }

    // Nav Header & Sidebar
    $$('[data-nav]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = item.getAttribute('data-nav');
        if (target === 'accueil') showView('view-home');
        if (target === 'playlists') showView('view-playlists');
      });
    });

    $('#header-logo')?.addEventListener('click', (e) => {
      e.preventDefault();
      showView('view-home');
    });

    // Bouton Créer une partie
    $('#btn-create')?.addEventListener('click', () => {
      const name = getPlayerName();
      if (!name) return;
      AudioPlayer.ensureAudioContext();
      send('CREATE_ROOM', { playerName: name });
    });

    // Rejoindre avec un code (input + enter)
    const joinInput = $('#join-code-input');
    joinInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const code = joinInput.value.trim().toUpperCase();
        if (!code) return;
        const name = getPlayerName();
        if (!name) return;
        AudioPlayer.ensureAudioContext();
        send('JOIN_ROOM', { playerName: name, roomId: code });
      }
    });

    // Scanner QR code
    $('#btn-scan-qr')?.addEventListener('click', () => {
      const codeOrUrl = prompt('Entre le code de la partie ou colle le lien d\'invitation :');
      if (!codeOrUrl) return;
      let code = codeOrUrl.trim();
      if (code.includes('room=')) {
        const match = code.match(/room=([A-Za-z0-9]+)/);
        if (match) code = match[1];
      }
      code = code.toUpperCase();
      const name = getPlayerName();
      if (!name) return;
      AudioPlayer.ensureAudioContext();
      send('JOIN_ROOM', { playerName: name, roomId: code });
    });

    // Modes de jeu
    $('#btn-mode-battle')?.addEventListener('click', () => {
      const name = getPlayerName();
      if (!name) return;
      AudioPlayer.ensureAudioContext();
      send('CREATE_ROOM', { playerName: name, difficulty: 'INTERMEDIAIRE' });
    });

    $('#btn-mode-solo')?.addEventListener('click', () => {
      const name = getPlayerName();
      if (!name) return;
      AudioPlayer.ensureAudioContext();
      send('CREATE_ROOM', { playerName: name, difficulty: 'DEBUTANT', rounds: 10 });
    });

    // LOBBY — Quitter
    $('#btn-leave-lobby')?.addEventListener('click', () => {
      send('LEAVE_ROOM');
    });

    // LOBBY — Copier le code
    $('#btn-copy-code')?.addEventListener('click', () => {
      const code = state.room?.roomId;
      if (code) {
        navigator.clipboard?.writeText(code).then(() => {
          UIEffects.showToast('Code copié dans le presse-papier ! 📋', 'success');
        });
      }
    });

    // LOBBY — Copier le lien
    $('#btn-copy-link')?.addEventListener('click', () => {
      const roomId = state.room?.roomId;
      if (roomId) {
        const url = `${location.origin}${location.pathname}?room=${roomId}`;
        navigator.clipboard?.writeText(url).then(() => {
          UIEffects.showToast('Lien copié ! Partage-le à tes potes 🔗', 'success');
        });
      }
    });

    // LOBBY — Partager natif
    $('#btn-share')?.addEventListener('click', () => {
      const roomId = state.room?.roomId;
      if (!roomId) return;
      const url = `${location.origin}${location.pathname}?room=${roomId}`;
      if (navigator.share) {
        navigator.share({
          title: 'Blind Test Muzik',
          text: `Rejoins ma partie de Blind Test sur Muzik ! Code : ${roomId}`,
          url: url,
        }).catch(() => {});
      } else {
        $('#btn-copy-link')?.click();
      }
    });

    // LOBBY — Partager WhatsApp
    $('#btn-whatsapp')?.addEventListener('click', () => {
      const roomId = state.room?.roomId;
      if (!roomId) return;
      const url = `${location.origin}${location.pathname}?room=${roomId}`;
      const text = encodeURIComponent(`Rejoins mon Blind Test sur Muzik ! 🔥\nClique ici : ${url}\nOu entre le code : ${roomId}`);
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    });

    // LOBBY — Modifications des réglages (Hôte)
    ['setting-mode', 'setting-difficulty', 'setting-genre', 'setting-rounds', 'setting-duration'].forEach(id => {
      $(`#${id}`)?.addEventListener('change', () => {
        if (!state.isHost) return;
        send('UPDATE_SETTINGS', {
          settings: {
            difficulty: $('#setting-difficulty')?.value,
            genre: $('#setting-genre')?.value,
            rounds: parseInt($('#setting-rounds')?.value, 10),
            roundDuration: parseInt($('#setting-duration')?.value, 10),
          },
        });
      });
    });

    // LOBBY — Lancer la partie
    $('#btn-start-game')?.addEventListener('click', () => {
      if (!state.isHost) return;
      AudioPlayer.ensureAudioContext();
      send('START_GAME');
    });

    // GAME — Envoi de réponse texte
    function submitAnswer() {
      const input = $('#g-answer');
      const answer = (input?.value || '').trim();
      if (!answer) return;
      send('SUBMIT_ANSWER', { answer });
      input.value = '';
    }

    $('#g-submit')?.addEventListener('click', submitAnswer);
    $('#g-answer')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitAnswer();
    });

    // GAME — Microphone vocal
    const micBtn = $('#g-mic');
    micBtn?.addEventListener('click', () => {
      AudioPlayer.ensureAudioContext();
      if (SpeechInput.isListening) {
        SpeechInput.stopListening();
        micBtn.classList.remove('active');
        const status = $('#g-speech-status');
        if (status) status.textContent = 'Microphone arrêté';
      } else {
        SpeechInput.startListening();
        micBtn.classList.add('active');
        const status = $('#g-speech-status');
        if (status) status.textContent = 'Écoute en cours… Parle maintenant ! 🎙️';
      }
    });

    // SpeechInput callbacks
    SpeechInput.setCallbacks({
      onInterim: (text) => {
        const preview = $('#g-speech-preview');
        if (preview) preview.textContent = `« ${text} »`;
      },
      onResult: (text) => {
        const preview = $('#g-speech-preview');
        if (preview) preview.textContent = `« ${text} »`;
        const mic = $('#g-mic');
        if (mic) mic.classList.remove('active');
        const status = $('#g-speech-status');
        if (status) status.textContent = 'Réponse enregistrée';
        send('SUBMIT_ANSWER', { answer: text });
      },
      onEnd: () => {
        const mic = $('#g-mic');
        if (mic) mic.classList.remove('active');
      },
    });

    // GAME OVER — Rejouer
    $('#go-replay')?.addEventListener('click', () => {
      send('BACK_TO_LOBBY');
    });

    // GAME OVER — Accueil
    $('#go-home')?.addEventListener('click', () => {
      send('LEAVE_ROOM');
      showView('view-home');
    });

    // Playlists Filter Tabs
    $$('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.getAttribute('data-filter');
        renderPlaylistsGrid(state.playlists, filter);
      });
    });

    // Search playlists
    $('#playlist-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = state.playlists.filter(p =>
        p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q)
      );
      renderPlaylistsGrid(filtered);
    });

    // Détection de room dans l'URL (?room=XXXXXX)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      if (joinInput) joinInput.value = roomParam.toUpperCase();
      UIEffects.showToast(`Code room #${roomParam} détecté ! Entre ton pseudo pour jouer.`, 'info', 4000);
    }
  }

  // ═══════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════
  function init() {
    AudioPlayer.init();
    SpeechInput.init();
    UIEffects.init();
    connectWebSocket();
    bindEvents();
    console.log('[App] Initialisé avec succès !');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
