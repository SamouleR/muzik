/**
 * MUZIK — Main Application Client (Mukiz Inspired)
 * State management, WebSocket communication, UI routing, Game loops,
 * OAuth Auth (Google/Apple/Facebook/Guest), Volume Ducking & Dynamic Hints.
 */
;(function () {
  'use strict';

  // ═══════════════════════════════════════
  // USER PROFILE & AUTH STATE
  // ═══════════════════════════════════════
  const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐵', '🐸', '🐙', '🦄', '🐨', '🐺', '🦉', '🐱'];

  const user = {
    name: localStorage.getItem('muzik_player_name') || 'Invité ' + Math.floor(100 + Math.random() * 900),
    avatar: localStorage.getItem('muzik_player_avatar') || '🦊',
    provider: localStorage.getItem('muzik_auth_provider') || 'guest',
    coins: parseInt(localStorage.getItem('muzik_coins') || '150', 10),
  };

  // ═══════════════════════════════════════
  // APPLICATION STATE
  // ═══════════════════════════════════════
  const state = {
    socketId: null,
    ws: null,
    room: null,
    isHost: false,
    timerInterval: null,
    timerRemaining: 0,
    hasAnswered: false,
    playlists: [],
    currentView: 'view-home',
    onlineCount: 1,
    currentRoundData: null,
    hintStage: 0,
    duckingEnabled: localStorage.getItem('muzik_ducking_enabled') !== 'false',
    isSpeaking: false,
  };

  // ═══════════════════════════════════════
  // DOM HELPERS
  // ═══════════════════════════════════════
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ═══════════════════════════════════════
  // USER PROFILE MANAGEMENT
  // ═══════════════════════════════════════
  function saveUserProfile() {
    localStorage.setItem('muzik_player_name', user.name);
    localStorage.setItem('muzik_player_avatar', user.avatar);
    localStorage.setItem('muzik_auth_provider', user.provider);
    localStorage.setItem('muzik_coins', String(user.coins));
    updateProfileUI();
  }

  function addCoins(amount) {
    user.coins += amount;
    localStorage.setItem('muzik_coins', String(user.coins));
    updateProfileUI();
    UIEffects.scorePopup(`+${amount} 🪙`, true);
  }

  function updateProfileUI() {
    // Header
    const coinsEl = $('#user-coins');
    if (coinsEl) coinsEl.textContent = user.coins;

    const headerAvatar = $('#header-avatar');
    if (headerAvatar) headerAvatar.textContent = user.avatar;

    const headerName = $('#header-player-name');
    if (headerName) headerName.textContent = user.name;

    // Home input
    const homeInput = $('#player-name');
    if (homeInput && !homeInput.value) homeInput.value = user.name;

    // Settings
    const setAvatar = $('#settings-avatar');
    if (setAvatar) setAvatar.textContent = user.avatar;

    const setNameInput = $('#settings-name-input');
    if (setNameInput) setNameInput.value = user.name;

    const setProvider = $('#settings-provider-badge');
    if (setProvider) {
      const labels = {
        google: '🟢 Connecté avec Google',
        apple: '⚫ Connecté avec Apple',
        facebook: '🔵 Connecté avec Facebook',
        guest: '⚪ Mode Invité',
      };
      setProvider.textContent = labels[user.provider] || 'Mode Invité';
    }

    // Avatar picker in settings
    renderAvatarPicker();
  }

  function renderAvatarPicker() {
    const container = $('#avatar-choices');
    if (!container) return;

    container.innerHTML = AVATARS.map(av => `
      <button class="avatar-choice-btn ${av === user.avatar ? 'active' : ''}" data-avatar="${av}">
        ${av}
      </button>
    `).join('');

    container.querySelectorAll('.avatar-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        user.avatar = btn.getAttribute('data-avatar');
        saveUserProfile();
      });
    });
  }

  function login(provider) {
    user.provider = provider;

    if (provider === 'google') {
      user.name = user.name.startsWith('Invité') ? 'Alex Google' : user.name;
      user.avatar = '🐼';
      addCoins(50);
      UIEffects.showToast('Connecté avec Google ! +50 🪙 de bienvenue', 'success');
    } else if (provider === 'apple') {
      user.name = user.name.startsWith('Invité') ? 'Alex Apple' : user.name;
      user.avatar = '🍎';
      addCoins(50);
      UIEffects.showToast('Connecté avec Apple ! +50 🪙 de bienvenue', 'success');
    } else if (provider === 'facebook') {
      user.name = user.name.startsWith('Invité') ? 'Alex FB' : user.name;
      user.avatar = '👤';
      addCoins(50);
      UIEffects.showToast('Connecté avec Facebook ! +50 🪙 de bienvenue', 'success');
    } else {
      user.provider = 'guest';
      UIEffects.showToast('Session Invité active', 'info');
    }

    saveUserProfile();
    closeModal('modal-auth');
  }

  function logout() {
    user.provider = 'guest';
    user.name = 'Invité ' + Math.floor(100 + Math.random() * 900);
    user.avatar = '🦊';
    saveUserProfile();
    closeModal('modal-settings');
    UIEffects.showToast('Déconnexion réussie. Mode invité réactivé.', 'info');
  }

  // ═══════════════════════════════════════
  // MODAL CONTROLLERS
  // ═══════════════════════════════════════
  function openModal(id) {
    const m = $(`#${id}`);
    if (m) m.classList.remove('hidden');
  }

  function closeModal(id) {
    const m = $(`#${id}`);
    if (m) m.classList.add('hidden');
  }

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
      console.warn('[App] Message inconnu:', data.type);
    }
  }

  // ═══════════════════════════════════════
  // MESSAGE HANDLERS
  // ═══════════════════════════════════════
  function onConnected(data) {
    state.socketId = data.socketId;
    console.log('[App] Connecté socketId:', state.socketId);
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
    AudioPlayer.playSfx('correct');
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
    showLoading('Chargement des extraits musicaux… 🎵');
  }

  function onGameStarting(data) {
    hideLoading();
    showView('view-game');
    AudioPlayer.playSfx('countdown');
    UIEffects.countdown(data.countdown || 3, () => {
      console.log('[App] Lancement de la manche 1 !');
    });
  }

  function onRoundStart(data) {
    state.hasAnswered = false;
    state.currentRoundData = data;
    state.hintStage = 0;

    // Reset hints & visual urgency
    const hintBanner = $('#g-hint-banner');
    if (hintBanner) {
      hintBanner.classList.add('hidden');
    }

    const timerFill = $('#g-timer-fill');
    const timerText = $('#g-timer-text');
    if (timerFill) timerFill.classList.remove('urgent');
    if (timerText) timerText.classList.remove('urgent');

    // 🎵 Update Chosen Playlist Pill (Mukiz top-left)
    const chosenCover = $('#g-chosen-cover');
    const chosenName = $('#g-chosen-name');
    const currentGenre = (state.room && state.room.genre) || data.genre || 'rap-fr';
    const currentPl = state.playlists.find(p => p.key === currentGenre);
    if (chosenCover && currentPl) chosenCover.src = currentPl.cover || '';
    if (chosenName && currentPl) chosenName.textContent = currentPl.name;

    // 🔴 Mukiz Round Pills (1 2 3 ... totalRounds)
    const roundPillsContainer = $('#g-round-pills');
    const totalRounds = data.totalRounds || (state.room && state.room.totalRounds) || 10;
    const curRound = data.roundNumber || data.round || 1;
    if (roundPillsContainer && totalRounds) {
      let pillsHtml = '';
      for (let i = 1; i <= totalRounds; i++) {
        const cls = i === curRound ? 'active' : (i < curRound ? 'past' : '');
        pillsHtml += `<div class="round-pill ${cls}">${i}</div>`;
      }
      roundPillsContainer.innerHTML = pillsHtml;
    }

    // Vinyl mystery center vs cover
    const vinylCenter = $('#g-vinyl-center');
    const vinylCover = $('#g-cover');
    if (vinylCenter) vinylCenter.style.display = 'flex';
    if (vinylCover) {
      vinylCover.style.display = 'none';
      vinylCover.src = '';
    }

    // Masquer les overlays
    $('#g-feedback')?.classList.add('hidden');
    $('#g-round-end')?.classList.add('hidden');

    // Round info
    const roundEl = $('#g-round');
    const totalEl = $('#g-total');
    if (roundEl) roundEl.textContent = curRound;
    if (totalEl) totalEl.textContent = totalRounds;

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

    // Play preview audio
    if (data.previewUrl) {
      AudioPlayer.play(data.previewUrl);
    }

    updateMiniScoreboard();
    startRoundTimer(data.duration || 20);
  }

  function onAnswerResult(data) {
    const { success, message, points, bonusSpeed, streak } = data;

    const fb = $('#g-feedback');
    const fbIcon = $('#g-fb-icon');
    const fbMsg = $('#g-fb-msg');
    const fbPts = $('#g-fb-pts');

    if (!fb) return;

    if (success) {
      state.hasAnswered = true;
      AudioPlayer.playSfx('correct');
      addCoins(10); // Reward

      const input = $('#g-answer');
      if (input) {
        input.disabled = true;
        input.placeholder = 'Bonne réponse validée ! ✅';
      }
      const submitBtn = $('#g-submit');
      if (submitBtn) submitBtn.disabled = true;

      SpeechInput.stopListening();
      AudioPlayer.setDucking(false);

      if (fbIcon) fbIcon.textContent = '🔥';
      if (fbMsg) fbMsg.textContent = message || 'Trouvé !';

      let ptsText = `+${points} pts`;
      if (bonusSpeed) ptsText += ` (+${bonusSpeed} vitesse)`;
      if (streak > 1) ptsText += ` (Série x${streak} !)`;
      if (fbPts) fbPts.textContent = ptsText;

      fb.className = 'game-feedback correct';
      UIEffects.scorePopup(`+${points}`, true);
    } else {
      AudioPlayer.playSfx('wrong');
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
      AudioPlayer.playSfx('tick');
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

    const track = data.result.track || data.result.correctAnswer;
    const answers = data.result.answers;
    const scores = data.result.scores || data.result.playerResults;

    // Révéler la cover sur le disque vinyle
    const vinylCenter = $('#g-vinyl-center');
    const vinylCover = $('#g-cover');
    if (vinylCenter) vinylCenter.style.display = 'none';

    if (track) {
      if (vinylCover) {
        vinylCover.src = track.cover || '';
        vinylCover.style.display = 'block';
      }
      const cCover = $('#g-correct-cover');
      const cArtist = $('#g-correct-artist');
      const cTitle = $('#g-correct-title');
      if (cCover) cCover.src = track.cover || '';
      if (cArtist) cArtist.textContent = track.artist || 'Artiste inconnu';
      if (cTitle) cTitle.textContent = track.title || 'Titre';

      // 📜 Mukiz Left History sidebar addition
      const histEmpty = $('#g-history-empty');
      if (histEmpty) histEmpty.style.display = 'none';

      const histList = $('#g-history-list');
      if (histList) {
        const isCorrect = state.hasAnswered;
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
          <img src="${track.cover || 'https://cdn-images.dzcdn.net/images/cover/134778e4c4f19ea71c82408300925a9a/250x250-000000-80-0-0.jpg'}" alt="" class="history-thumb">
          <div class="history-meta">
            <div class="history-track">${escapeHtml(track.title || 'Titre')}</div>
            <div class="history-artist">${escapeHtml(track.artist || 'Artiste')}</div>
          </div>
          <span class="history-status">${isCorrect ? '✅' : '❌'}</span>
        `;
        histList.prepend(li);
      }
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

    // Mise à jour des scores
    if (state.room && scores) {
      scores.forEach(s => {
        const p = state.room.players?.find(pl => pl.id === s.id);
        if (p) p.score = s.score;
      });
      updateMiniScoreboard();
    }

    $('#g-feedback')?.classList.add('hidden');
    $('#g-hint-banner')?.classList.add('hidden');
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

    // Bonus pour victoire
    if (winner && winner.name === user.name) {
      addCoins(100);
      UIEffects.showToast('🏆 Victoire ! Tu remportes +100 🪙 de bonus !', 'success', 5000);
    }

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

    const replayBtn = $('#go-replay');
    if (replayBtn) {
      replayBtn.style.display = state.isHost ? 'inline-block' : 'none';
    }

    // Confettis
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
  // ROUND TIMER, DUCKING & PROGRESSIVE HINTS
  // ═══════════════════════════════════════
  function startRoundTimer(duration) {
    stopRoundTimer();
    state.timerRemaining = duration;

    const fill = $('#g-timer-fill');
    const text = $('#g-timer-text');
    const hintBanner = $('#g-hint-banner');
    const hintText = $('#g-hint-text');

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
        if (remainingSec <= 5) {
          fill.classList.add('urgent');
          if (text) text.classList.add('urgent');
        } else if (percent < 40) {
          fill.style.background = '#ff6b35';
        } else {
          fill.style.background = '#06d6a0';
        }
      }

      if (text) text.textContent = remainingSec;

      // ─── DYNAMIC HINT 1: AT 7 SECONDS REMAINING ───
      if (remainingSec <= 7 && state.hintStage === 0 && !state.hasAnswered) {
        state.hintStage = 1;
        const rd = state.currentRoundData;
        if (rd && hintBanner && hintText) {
          const artistInitial = rd.hintArtistInitial || '?';
          const genre = rd.genre ? rd.genre.toUpperCase() : 'MUSIQUE';
          hintText.textContent = `💡 Indice : [${genre}] • Artiste commence par "${artistInitial}"`;
          hintBanner.classList.remove('hidden');
          AudioPlayer.playSfx('tick');
        }
      }

      // ─── VOLUME DUCKING & SFX TICK: AT 5 SECONDS REMAINING ───
      if (remainingSec <= 5 && !state.hasAnswered) {
        if (state.duckingEnabled) {
          AudioPlayer.setDucking(true, 0.35, 300);
        }
        AudioPlayer.playSfx('tick');
      }

      // ─── DYNAMIC HINT 2: AT 3 SECONDS REMAINING ───
      if (remainingSec <= 3 && state.hintStage === 1 && !state.hasAnswered) {
        state.hintStage = 2;
        const rd = state.currentRoundData;
        if (rd && hintBanner && hintText) {
          const titleMask = rd.hintTitleMask || '';
          hintText.textContent = `⚡ Dernières secondes ! Titre : ${titleMask}`;
          hintBanner.classList.remove('hidden');
          AudioPlayer.playSfx('tick');
        }
      }

      if (remainingMs <= 0) {
        stopRoundTimer();
        AudioPlayer.setDucking(false);
      }
    }, 100);
  }

  function stopRoundTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
    AudioPlayer.setDucking(false);
  }

  // ═══════════════════════════════════════
  // LOBBY RENDERING
  // ═══════════════════════════════════════
  function renderLobby() {
    if (!state.room) return;

    const codeEl = $('#lobby-room-code');
    if (codeEl) codeEl.textContent = state.room.roomId;

    generateQrCode(state.room.roomId);

    // Update selected playlist card in lobby
    const currentGenre = state.room.genre || 'rap-fr';
    const plObj = state.playlists.find(p => p.key === currentGenre) || {
      name: currentGenre,
      description: 'Playlist sélectionnée',
      cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&q=80',
      category: 'GENRE',
    };

    const plThumb = $('#lobby-playlist-cover');
    const plBadge = $('#lobby-playlist-badge');
    const plDiff = $('#lobby-playlist-diff');
    const plName = $('#lobby-playlist-name');
    const plDesc = $('#lobby-playlist-desc');
    const plPreviews = $('#lobby-preview-covers');

    if (plThumb) plThumb.src = plObj.cover || '';
    if (plBadge) plBadge.textContent = (plObj.category || 'PLAYLIST').toUpperCase();
    if (plDiff) plDiff.textContent = `🟢 ${(plObj.difficulty || 'FACILE').toUpperCase()}`;
    if (plName) plName.textContent = `${plObj.emoji || '🎵'} ${plObj.name}`;
    if (plDesc) plDesc.textContent = plObj.description || 'Playlist de la partie';

    if (plPreviews) {
      const covers = plObj.previewCovers || [];
      if (covers.length > 0) {
        plPreviews.innerHTML = covers.map(c => `
          <img src="${c}" alt="" class="mini-track-cover" title="Extrait inclus">
        `).join('') + `<span style="font-size:0.75rem;font-weight:800;color:#64748b;margin-left:14px;">+${plObj.trackCount || 100} sons</span>`;
      } else {
        plPreviews.innerHTML = '<span style="font-size:0.75rem;color:#94a3b8;">Extraits variés</span>';
      }
    }

    const settingsCard = $('#lobby-settings');
    if (settingsCard) {
      const inputs = settingsCard.querySelectorAll('select');
      inputs.forEach(sel => sel.disabled = !state.isHost);

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
  // PLAYLISTS VIEW RENDERING (MUKIZ STYLE)
  // ═══════════════════════════════════════
  let activePlaylistFilter = 'all';
  let activePlaylistCategory = 'all';

  function renderPlaylistsGrid(playlists = state.playlists, filter = activePlaylistFilter, category = activePlaylistCategory) {
    const grid = $('#playlists-grid');
    if (!grid) return;

    activePlaylistFilter = filter;
    activePlaylistCategory = category;

    let filtered = [...playlists];

    // Filter by tab (Explorer, Populaires, Nouveautés)
    if (filter === 'popular') {
      filtered = filtered.filter(p => ['best-fr', 'hits-fr', 'rap-fr', 'pop', 'tiktok', 'pop-2020s', 'annees-80'].includes(p.key) || p.isCustom);
    } else if (filter === 'new') {
      filtered = filtered.filter(p => ['pop-2020s', 'rap-fr-2020s', 'french-touch', 'films', 'disney-fr', 'mix'].includes(p.key) || p.isCustom);
    }

    // Filter by category tag (Genres, Décennies, Thèmes)
    if (category && category !== 'all') {
      filtered = filtered.filter(p => p.category === category);
    }

    grid.innerHTML = filtered.map(p => {
      const cover = p.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
      const cat = (p.category || 'PLAYLIST').toUpperCase();
      const diffClass = (p.difficulty || 'FACILE').toLowerCase();
      const count = p.trackCount || 100;
      const previewCovers = p.previewCovers || [];

      return `
        <div class="playlist-card-mukiz" data-key="${p.key}">
          <!-- Top Dark Title Bar (Mukiz Signature) -->
          <div class="card-mukiz-header">${escapeHtml(p.name)}</div>

          <div class="playlist-card-cover">
            <img src="${cover}" alt="${escapeHtml(p.name)}" class="playlist-cover-img" loading="lazy">
            <div class="playlist-cover-overlay"></div>
            <span class="mukiz-crown-badge" title="Difficulté : ${p.difficulty || 'FACILE'}">👑</span>
            <span class="playlist-count-pill">${count} titres</span>
          </div>

          <div class="playlist-card-body">
            <p class="playlist-card-desc">${escapeHtml(p.description || 'Devine les titres et artistes le plus vite possible !')}</p>

            <!-- 💿 Mini Covers des sons ("la cover du son") -->
            ${previewCovers.length > 0 ? `
              <div class="track-covers-stack" title="Morceaux inclus dans cette playlist">
                ${previewCovers.map(c => `<img src="${c}" alt="" class="mini-track-cover" loading="lazy">`).join('')}
                <span class="track-covers-label">+${count} titres</span>
              </div>
            ` : ''}

            <div class="playlist-card-footer">
              <span class="playlist-diff-badge ${diffClass}">${p.difficulty || 'FACILE'}</span>
              <button class="btn-play-card btn-play-playlist" data-key="${p.key}">
                ▶ Jouer
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Click handler on card to open detail modal
    $$('.playlist-card-mukiz').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-play-playlist')) return;
        const key = card.getAttribute('data-key');
        openPlaylistDetailsModal(key);
      });
    });

    // Click on play button
    $$('.btn-play-playlist').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.getAttribute('data-key');
        startGameWithPlaylist(key);
      });
    });
  }

  function openPlaylistDetailsModal(key) {
    const p = state.playlists.find(item => item.key === key);
    if (!p) return;

    const cover = p.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
    const modalCover = $('#modal-pl-cover');
    const modalTag = $('#modal-pl-tag');
    const modalTitle = $('#modal-pl-title');
    const modalDesc = $('#modal-pl-desc');
    const modalCount = $('#modal-pl-count');
    const modalDiff = $('#modal-pl-diff');
    const modalBtnPlay = $('#modal-btn-play');
    const modalPreviewCovers = $('#modal-preview-covers');

    if (modalCover) modalCover.src = cover;
    if (modalTag) modalTag.textContent = `${p.emoji || '🎵'} ${(p.category || 'PLAYLIST').toUpperCase()}`;
    if (modalTitle) modalTitle.textContent = p.name;
    if (modalDesc) modalDesc.textContent = p.description || 'Devine les titres et artistes en quelques secondes !';
    if (modalCount) modalCount.textContent = `🎵 ${p.trackCount || 100} titres`;
    if (modalDiff) modalDiff.textContent = `⚡ Difficulté : ${p.difficulty || 'FACILE'}`;

    // Fill sample song covers in modal
    if (modalPreviewCovers) {
      const covers = p.previewCovers || [];
      if (covers.length > 0) {
        modalPreviewCovers.innerHTML = covers.map(c => `
          <img src="${c}" alt="" class="modal-mini-cover" title="Extrait inclus dans la playlist">
        `).join('');
      } else {
        modalPreviewCovers.innerHTML = '<span style="font-size:0.8rem;color:#94a3b8;">Extraits variés du genre</span>';
      }
    }

    if (modalBtnPlay) {
      modalBtnPlay.onclick = () => {
        closeModal('modal-playlist-details');
        startGameWithPlaylist(key);
      };
    }

    openModal('modal-playlist-details');
  }

  function startGameWithPlaylist(key) {
    const name = getPlayerName();
    if (!name) return;
    AudioPlayer.ensureAudioContext();

    // If already in lobby as host, update the room's genre
    if (state.room && state.isHost) {
      send('UPDATE_SETTINGS', {
        settings: { genre: key },
      });
      showView('view-lobby');
      UIEffects.showToast('Playlist changée pour le salon ! 🎶', 'success');
      return;
    }

    // Otherwise, create a new room with this playlist
    send('CREATE_ROOM', { playerName: name, genre: key });
  }

  // ═══════════════════════════════════════
  // SPOTIFY CONNECT & CUSTOM PLAYLISTS
  // ═══════════════════════════════════════
  async function importSpotifyPlaylist(targetUrl) {
    const input = $('#spotify-url-input');
    const modalInput = $('#modal-spotify-url');
    const url = (targetUrl || input?.value || modalInput?.value || '').trim();

    if (!url) {
      UIEffects.showToast('Colle d\'abord le lien de ta playlist Spotify ou Deezer !', 'warning');
      if (input) UIEffects.shake(input);
      return;
    }

    showLoading('Connexion & importation de la playlist… 🟢');

    try {
      const res = await fetch('/api/playlists/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      hideLoading();

      if (!data.success || !data.playlist) {
        throw new Error(data.message || 'Impossible d\'importer cette playlist');
      }

      const newPl = data.playlist;

      // Sauvegarde dans localStorage pour persistance locale
      saveCustomPlaylistToStorage(newPl);

      // Ajouter aux playlists et rafraîchir la vue
      state.playlists = state.playlists.filter(p => p.key !== newPl.key);
      state.playlists.unshift(newPl);
      populatePlaylistSelect(state.playlists);
      renderPlaylistsGrid(state.playlists);
      renderSavedSpotifyPlaylists();

      UIEffects.showToast(`Playlist "${newPl.name}" connectée avec succès ! 🎉`, 'success', 4000);
      if (input) input.value = '';
      if (modalInput) modalInput.value = '';
      closeModal('modal-spotify-connect');

      // Lancer directement la partie ou aller au lobby
      startGameWithPlaylist(newPl.key);
    } catch (err) {
      hideLoading();
      UIEffects.showToast(`Erreur d'import : ${err.message}`, 'error', 4000);
    }
  }

  function saveCustomPlaylistToStorage(pl) {
    try {
      const saved = JSON.parse(localStorage.getItem('muzik_custom_playlists') || '[]');
      const filtered = saved.filter(p => p.key !== pl.key);
      filtered.unshift({
        key: pl.key,
        name: pl.name,
        cover: pl.cover,
        previewCovers: pl.previewCovers,
        trackCount: pl.trackCount,
        category: 'custom',
        isCustom: true,
      });
      localStorage.setItem('muzik_custom_playlists', JSON.stringify(filtered));
    } catch (e) {
      console.warn('[Storage] Could not save custom playlist:', e);
    }
  }

  function loadCustomPlaylistsFromStorage() {
    try {
      const saved = JSON.parse(localStorage.getItem('muzik_custom_playlists') || '[]');
      if (Array.isArray(saved) && saved.length > 0) {
        saved.forEach(pl => {
          if (!state.playlists.some(p => p.key === pl.key)) {
            state.playlists.unshift(pl);
          }
        });
      }
    } catch (e) {
      console.warn('[Storage] Could not load custom playlists:', e);
    }
  }

  function renderSavedSpotifyPlaylists() {
    const list = $('#spotify-saved-list');
    if (!list) return;

    const saved = state.playlists.filter(p => p.isCustom);
    if (saved.length === 0) {
      list.innerHTML = '<p class="spotify-no-saved">Aucune playlist personnalisée importée pour l\'instant.</p>';
      return;
    }

    list.innerHTML = saved.map(p => `
      <div class="spotify-preset-card" style="margin-bottom:8px;">
        <img src="${p.cover || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=200&q=80'}" alt="" class="preset-thumb">
        <div class="preset-meta">
          <h5>${escapeHtml(p.name)}</h5>
          <span>🟢 Spotify/Deezer • ${p.trackCount || 20} titres</span>
        </div>
        <button class="btn-preset-add btn-play-saved-custom" data-key="${p.key}">Jouer ▶</button>
      </div>
    `).join('');

    list.querySelectorAll('.btn-play-saved-custom').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        closeModal('modal-spotify-connect');
        startGameWithPlaylist(key);
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
    if (name === user.name) return user.avatar;
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash += name.charCodeAt(i);
    return AVATARS[hash % AVATARS.length];
  }

  function getPlayerName() {
    const input = $('#player-name');
    let name = (input?.value || '').trim() || user.name;
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
    user.name = name;
    saveUserProfile();
    if (input) input.value = name;
    return name;
  }

  // ═══════════════════════════════════════
  // VOLUME WIDGET CONTROLLER
  // ═══════════════════════════════════════
  function setupVolumeControls() {
    const btnVol = $('#btn-volume-control');
    const popup = $('#volume-popup');
    const slider = $('#volume-slider');
    const percent = $('#volume-percent');
    const icon = $('#volume-icon');

    // Sync initial
    const initialVol = Math.round(AudioPlayer.getVolume() * 100);
    if (slider) slider.value = initialVol;
    if (percent) percent.textContent = `${initialVol}%`;
    updateVolumeIcon(initialVol, AudioPlayer.getIsMuted());

    btnVol?.addEventListener('click', (e) => {
      e.stopPropagation();
      popup?.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (popup && !popup.contains(e.target) && e.target !== btnVol && !btnVol?.contains(e.target)) {
        popup.classList.add('hidden');
      }
    });

    slider?.addEventListener('input', () => {
      const val = parseInt(slider.value, 10);
      AudioPlayer.setVolume(val / 100);
      if (percent) percent.textContent = `${val}%`;
      updateVolumeIcon(val, false);
      // Sync settings modal slider too
      const setMusic = $('#set-music-vol');
      const setVal = $('#set-music-vol-val');
      if (setMusic) setMusic.value = val;
      if (setVal) setVal.textContent = `${val}%`;
    });

    function updateVolumeIcon(val, muted) {
      if (!icon) return;
      if (muted || val === 0) icon.textContent = '🔇';
      else if (val < 30) icon.textContent = '🔈';
      else if (val < 70) icon.textContent = '🔉';
      else icon.textContent = '🔊';
    }

    // Settings modal sliders
    const setMusic = $('#set-music-vol');
    const setMusicVal = $('#set-music-vol-val');
    if (setMusic) {
      setMusic.value = initialVol;
      if (setMusicVal) setMusicVal.textContent = `${initialVol}%`;
      setMusic.addEventListener('input', () => {
        const val = parseInt(setMusic.value, 10);
        AudioPlayer.setVolume(val / 100);
        if (setMusicVal) setMusicVal.textContent = `${val}%`;
        if (slider) slider.value = val;
        if (percent) percent.textContent = `${val}%`;
        updateVolumeIcon(val, false);
      });
    }

    const setSfx = $('#set-sfx-vol');
    const setSfxVal = $('#set-sfx-vol-val');
    if (setSfx) {
      const initialSfx = Math.round(AudioPlayer.getSfxVolume() * 100);
      setSfx.value = initialSfx;
      if (setSfxVal) setSfxVal.textContent = `${initialSfx}%`;
      setSfx.addEventListener('input', () => {
        const val = parseInt(setSfx.value, 10);
        AudioPlayer.setSfxVolume(val / 100);
        if (setSfxVal) setSfxVal.textContent = `${val}%`;
      });
    }

    // Ducking toggle in settings
    const duckingToggle = $('#set-ducking-toggle');
    if (duckingToggle) {
      duckingToggle.checked = state.duckingEnabled;
      duckingToggle.addEventListener('change', () => {
        state.duckingEnabled = duckingToggle.checked;
        localStorage.setItem('muzik_ducking_enabled', String(state.duckingEnabled));
        UIEffects.showToast(
          state.duckingEnabled ? 'Volume ducking activé 🔉' : 'Volume ducking désactivé 🔊',
          'info',
          1500
        );
      });
    }
  }

  // ═══════════════════════════════════════
  // EVENT BINDINGS
  // ═══════════════════════════════════════
  function bindEvents() {
    updateProfileUI();
    setupVolumeControls();

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

    // Profile pill & Settings triggers
    $('#btn-profile-pill')?.addEventListener('click', () => {
      openModal('modal-auth');
    });

    $('#header-coins-badge')?.addEventListener('click', () => {
      openModal('modal-auth');
    });

    $('#btn-open-settings')?.addEventListener('click', () => {
      openModal('modal-settings');
    });

    // Auth Modal Actions
    $('#btn-close-auth')?.addEventListener('click', () => closeModal('modal-auth'));
    $('#btn-close-settings')?.addEventListener('click', () => closeModal('modal-settings'));

    $('#btn-auth-google')?.addEventListener('click', () => login('google'));
    $('#btn-auth-apple')?.addEventListener('click', () => login('apple'));
    $('#btn-auth-facebook')?.addEventListener('click', () => login('facebook'));
    $('#btn-auth-guest')?.addEventListener('click', () => login('guest'));

    // Settings Profile Actions
    $('#settings-name-input')?.addEventListener('change', (e) => {
      const val = e.target.value.trim();
      if (val) {
        user.name = val;
        saveUserProfile();
        UIEffects.showToast('Pseudo mis à jour !', 'success', 1500);
      }
    });

    $('#btn-logout')?.addEventListener('click', logout);

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
      const codeOrUrl = prompt('Entre le code du salon ou colle le lien d\'invitation :');
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

    // GAME — Microphone vocal avec Volume Ducking automatique
    const micBtn = $('#g-mic');
    micBtn?.addEventListener('click', () => {
      AudioPlayer.ensureAudioContext();
      if (SpeechInput.isListening) {
        SpeechInput.stopListening();
        micBtn.classList.remove('active');
        if (state.duckingEnabled) AudioPlayer.setDucking(false, 1.0, 300);
        const status = $('#g-speech-status');
        if (status) status.textContent = 'Microphone arrêté';
      } else {
        SpeechInput.startListening();
        micBtn.classList.add('active');
        if (state.duckingEnabled) AudioPlayer.setDucking(true, 0.25, 200);
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
        if (state.duckingEnabled) AudioPlayer.setDucking(false, 1.0, 300);
        const status = $('#g-speech-status');
        if (status) status.textContent = 'Réponse enregistrée';
        send('SUBMIT_ANSWER', { answer: text });
      },
      onEnd: () => {
        const mic = $('#g-mic');
        if (mic) mic.classList.remove('active');
        if (state.duckingEnabled) AudioPlayer.setDucking(false, 1.0, 300);
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

    // Lobby — Changer de playlist
    $('#btn-change-playlist')?.addEventListener('click', () => {
      showView('view-playlists');
    });

    // Importer playlist Spotify direct
    $('#btn-import-spotify')?.addEventListener('click', () => {
      const url = $('#spotify-url-input')?.value;
      importSpotifyPlaylist(url);
    });
    $('#spotify-url-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const url = $('#spotify-url-input')?.value;
        importSpotifyPlaylist(url);
      }
    });

    // Ouvrir / Fermer modal Spotify Connect
    $('#btn-open-spotify-modal')?.addEventListener('click', () => {
      renderSavedSpotifyPlaylists();
      openModal('modal-spotify-connect');
    });

    $('#btn-close-spotify-modal')?.addEventListener('click', () => {
      closeModal('modal-spotify-connect');
    });

    $('#modal-btn-import-url')?.addEventListener('click', () => {
      const url = $('#modal-spotify-url')?.value;
      importSpotifyPlaylist(url);
    });

    $('#modal-spotify-url')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const url = $('#modal-spotify-url')?.value;
        importSpotifyPlaylist(url);
      }
    });

    // Clic sur les presets Spotify dans le modal
    $$('.spotify-preset-card').forEach(card => {
      const btn = card.querySelector('.btn-preset-add');
      const url = card.getAttribute('data-url');
      if (btn && url) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          importSpotifyPlaylist(url);
        });
      }
    });

    // Fermer modal de détails playlist
    $('#btn-close-playlist-modal')?.addEventListener('click', () => {
      closeModal('modal-playlist-details');
    });

    // Playlists Filter Tabs (Explorer, Populaires, Nouveautés)
    $$('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const filter = tab.getAttribute('data-filter');
        renderPlaylistsGrid(state.playlists, filter, activePlaylistCategory);
      });
    });

    // Playlists Category Tags (Genres, Décennies, Thèmes)
    $$('.category-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        $$('.category-tag').forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        const cat = tag.getAttribute('data-cat');
        renderPlaylistsGrid(state.playlists, activePlaylistFilter, cat);
      });
    });

    // Search playlists
    $('#playlist-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = state.playlists.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
      renderPlaylistsGrid(filtered);
    });

    // Détection de room dans l'URL (?room=XXXXXX)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    const paramJoinInput = $('#join-code-input');
    if (roomParam) {
      if (paramJoinInput) paramJoinInput.value = roomParam.toUpperCase();
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
    loadCustomPlaylistsFromStorage();
    connectWebSocket();
    bindEvents();
    console.log('[App] Initialisé avec Mukiz Auth, Cards enrichies, Cover du son & Spotify Connect !');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
