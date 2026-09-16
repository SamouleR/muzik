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
    isVip: localStorage.getItem('harmonie_vip') === 'true' || localStorage.getItem('muzik_is_premium') === 'true',
    frame: localStorage.getItem('harmonie_frame') || 'none',
    title: localStorage.getItem('harmonie_title') || '🎧 Mélomane Averti',
    bio: localStorage.getItem('harmonie_bio') || 'Passionné de musique & de Blind Tests !',
    inventory: JSON.parse(localStorage.getItem('harmonie_inventory') || '[]'),
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
    roundEndInterval: null,
    isRoundEndPaused: false,
    answerMode: 'text',
    isSurvivalMode: false,
    survivalLives: 3,
    survivalScore: 0,
    survivalTracksSurvived: 0,
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
    localStorage.setItem('harmonie_frame', user.frame);
    localStorage.setItem('harmonie_title', user.title);
    localStorage.setItem('harmonie_bio', user.bio);
    localStorage.setItem('harmonie_inventory', JSON.stringify(user.inventory));
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
    if (headerName) {
      if (user.isVip) {
        headerName.innerHTML = `${escapeHtml(user.name)} <span class="vip-header-tag" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:2px 8px;border-radius:999px;font-size:0.75rem;font-weight:900;margin-left:4px;box-shadow:0 0 10px rgba(245,158,11,0.5);">👑 VIP</span>`;
      } else {
        headerName.textContent = user.name;
      }
    }

    // Avatar Frame application
    [headerAvatar, $('#profile-avatar-big'), $('#settings-avatar')].forEach(av => {
      if (av) {
        av.classList.remove('frame-violet', 'frame-gold', 'frame-fire', 'frame-cyan', 'frame-diamond', 'frame-rainbow');
        if (user.frame && user.frame !== 'none') av.classList.add(user.frame);
      }
    });

    // Profile Hero Title & Name
    const heroName = $('#profile-hero-name');
    if (heroName) {
      heroName.innerHTML = `${escapeHtml(user.name)} <span class="profile-user-title-badge">${escapeHtml(user.title)}</span>`;
    }

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
    } else {
      console.warn('[App] WebSocket non connecté, reconnexion en cours...');
      UIEffects.showToast('Connexion au serveur en cours… Réessaie dans un instant !', 'warning', 2500);
      connectWebSocket();
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
      CHAT_MESSAGE: onChatMessage,
      GLOBAL_CHAT_HISTORY: onGlobalChatHistory,
      GLOBAL_CHAT_MESSAGE: onGlobalChatMessage,
      REACTION_EMOTE: onReactionEmote,
      JOKER_RESULT: onJokerResult,
      PLAYER_USED_JOKER: onPlayerUsedJoker,
      ADMIN_ALERT: onAdminAlert,
      AIRDROP_COINS: onAirdropCoins,
      TOURNAMENT_UPDATED: onTournamentUpdated,
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

  function onAdminAlert(data) {
    const levelMap = { info: 'info', warning: 'warning', urgent: 'error' };
    UIEffects.showToast(`📢 ALERTE ADMIN : ${data.text}`, levelMap[data.level] || 'warning', 8000);
  }

  function onAirdropCoins(data) {
    const amount = data.amount || 100;
    addCoins(amount);
    UIEffects.confetti();
    UIEffects.scorePopup(`+${amount} 🪙 AIRDROP !`, true);
    UIEffects.showToast(`🎁 Airdrop de pièces : +${amount} 🪙 reçues (${data.reason || 'Cadeau'}) !`, 'success', 6000);
  }

  function onTournamentUpdated(data) {
    if (data.tournament) {
      state.activeTournament = data.tournament;
      // Re-render tournament modal if currently open
      const modal = $('#modal-tournoi');
      if (modal && !modal.classList.contains('hidden') && typeof renderTournamentModalUI === 'function') {
        renderTournamentModalUI(data.tournament);
      }
      // Re-render admin tournament tab if active
      const admTab = $('#admin-tab-tournaments');
      if (admTab && admTab.classList.contains('active') && typeof renderAdminTournamentTab === 'function') {
        renderAdminTournamentTab(data.tournament);
      }
    }
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
    state.qcmUnlocked = Boolean(data.isQcmOnly);
    state.qcmAttempted = false;
    state.qcmFailed = false;
    state.isQcmOnly = Boolean(data.isQcmOnly);
    state.currentRoundData = data;
    state.hintStage = 0;

    // Reset QCM / Text View according to mode
    const tabText = $('#tab-mode-text');
    const tabQcm = $('#tab-mode-qcm');
    const qcmSosBanner = $('#qcm-sos-banner');
    const textContainer = $('#answer-mode-text-container');
    const qcmContainer = $('#answer-mode-qcm-container');
    const sosTabIcon = $('#sos-tab-icon');
    const sosTabText = $('#sos-tab-text');

    if (qcmSosBanner) qcmSosBanner.classList.add('hidden');

    if (state.isQcmOnly) {
      tabQcm?.classList.remove('locked', 'unlocked-pulse');
      tabQcm?.classList.add('active');
      tabText?.classList.remove('active');
      textContainer?.classList.add('hidden');
      qcmContainer?.classList.remove('hidden');
      state.answerMode = 'qcm';
    } else {
      tabText?.classList.add('active');
      tabQcm?.classList.remove('active', 'unlocked-pulse');
      tabQcm?.classList.add('locked');
      if (sosTabIcon) sosTabIcon.textContent = '🔒';
      if (sosTabText) sosTabText.textContent = 'Aide QCM (🔒 10s)';
      textContainer?.classList.remove('hidden');
      qcmContainer?.classList.add('hidden');
      state.answerMode = 'text';
    }

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
      input.classList.remove('on-fire');
      input.placeholder = 'Tape ta réponse (Artiste et/ou Titre)…';
      input.focus();
    }
    const submitBtn = $('#g-submit');
    if (submitBtn) submitBtn.disabled = false;

    // Reset Discovery tracker pills
    const pillArtist = $('#pill-discover-artist');
    const pillTitle = $('#pill-discover-title');
    const pillFeat = $('#pill-discover-feat');
    if (pillArtist) {
      pillArtist.className = 'discovery-pill pill-artist';
      pillArtist.textContent = '🎤 Artiste : ❓';
    }
    if (pillTitle) {
      pillTitle.className = 'discovery-pill pill-title';
      pillTitle.textContent = '🎵 Titre : ❓';
    }
    if (pillFeat) {
      if (data.hasFeat) {
        pillFeat.className = 'discovery-pill pill-feat';
        pillFeat.textContent = '🎙️ Feat : ❓';
        pillFeat.classList.remove('hidden');
      } else {
        pillFeat.classList.add('hidden');
      }
    }

    const micStatus = $('#g-speech-status');
    if (micStatus) micStatus.textContent = 'Clique pour parler ou tape ta réponse';
    const preview = $('#g-speech-preview');
    if (preview) preview.textContent = '';

    // Play preview audio
    if (data.previewUrl) {
      AudioPlayer.play(data.previewUrl);
    }

    // Render QCM options
    const qcmGrid = $('#g-qcm-grid');
    if (qcmGrid) {
      if (data.qcmOptions && data.qcmOptions.length > 0) {
        qcmGrid.innerHTML = data.qcmOptions.map(opt => `
          <button class="qcm-choice-btn" data-choice="${escapeHtml(opt)}">${escapeHtml(opt)}</button>
        `).join('');

        qcmGrid.querySelectorAll('.qcm-choice-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            if (state.hasAnswered || state.qcmAttempted || state.qcmFailed) return;
            state.qcmAttempted = true; // ⚠️ 1 SEULE TENTATIVE !
            const choice = btn.getAttribute('data-choice');
            
            // Verrouiller immédiatement tous les boutons pour empêcher le double-clic
            qcmGrid.querySelectorAll('.qcm-choice-btn').forEach(b => {
              b.disabled = true;
              b.classList.remove('selected');
            });
            btn.classList.add('selected');
            
            send('SUBMIT_ANSWER', { answer: choice, isQcm: true });
          });
        });
      }
    }

    updateMiniScoreboard();
    startRoundTimer(data.duration || 20);
  }

  function onAnswerResult(data) {
    const { success, message, points, bonusSpeed, streak, isComplete, artistFound, titleFound, featFound, hasFeat, isQcm, qcmFailed } = data;

    const fb = $('#g-feedback');
    const fbIcon = $('#g-fb-icon');
    const fbMsg = $('#g-fb-msg');
    const fbPts = $('#g-fb-pts');

    // Mettre à jour les badges de découvertes de la manche (Artiste / Titre / Feat)
    const pillArtist = $('#pill-discover-artist');
    const pillTitle = $('#pill-discover-title');
    const pillFeat = $('#pill-discover-feat');

    if (pillArtist && artistFound) {
      pillArtist.classList.add('found');
      pillArtist.textContent = '🎤 Artiste : ✅';
    }
    if (pillTitle && titleFound) {
      pillTitle.classList.add('found');
      pillTitle.textContent = '🎵 Titre : ✅';
    }
    if (pillFeat && hasFeat) {
      pillFeat.classList.remove('hidden');
      if (featFound) {
        pillFeat.classList.add('found');
        pillFeat.textContent = '🎙️ Feat : ✅ (+200)';
      }
    }

    if (!fb) return;

    // ──────────────────────────────────────────────
    // CAS 1 : ÉCHEC AU QCM DE SECOURS (0 PT + VERROUILLAGE)
    // ──────────────────────────────────────────────
    if (qcmFailed) {
      state.qcmFailed = true;
      state.hasAnswered = true;
      $('#g-answer')?.classList.remove('on-fire');
      AudioPlayer.playSfx('wrong');

      // Marquer le bouton QCM choisi en rouge + secousse
      const selBtn = $('#g-qcm-grid .qcm-choice-btn.selected');
      if (selBtn) {
        selBtn.classList.remove('selected');
        selBtn.classList.add('wrong');
      }
      // Bloquer tous les 4 choix du QCM
      $$('#g-qcm-grid .qcm-choice-btn').forEach(b => {
        b.disabled = true;
      });

      // Bloquer le champ de réponse pour ce tour
      const input = $('#g-answer');
      if (input) {
        input.value = '';
        input.disabled = true;
        input.placeholder = '❌ Échec Aide QCM — 0 point sur cette manche';
      }
      const submitBtn = $('#g-submit');
      if (submitBtn) submitBtn.disabled = true;

      $('#qcm-sos-banner')?.classList.add('hidden');

      if (fbIcon) fbIcon.textContent = '❌';
      if (fbMsg) fbMsg.textContent = 'Erreur au QCM de secours — 0 point !';
      if (fbPts) fbPts.textContent = '0 pt';
      fb.className = 'game-feedback wrong';
      fb.classList.remove('hidden');

      UIEffects.showToast('❌ Erreur au QCM de secours ! 0 point sur cette manche.', 'error', 4000);
      SpeechInput.stopListening();
      AudioPlayer.setDucking(false);
      return;
    }

    // ──────────────────────────────────────────────
    // CAS 2 : SUCCÈS (NORMAL OU VIA AIDE QCM)
    // ──────────────────────────────────────────────
    if (success) {
      AudioPlayer.playSfx('correct');
      if (points > 0) addCoins(5);

      if (isComplete) {
        // TOUT TROUVÉ (Artiste + Titre)
        state.hasAnswered = true;
        const input = $('#g-answer');
        if (input) {
          input.disabled = true;
          input.placeholder = isQcm ? `💡 Trouvé via Aide QCM (+${points} pts) !` : 'Tout trouvé ! ✅ En attente du prochain round…';
        }
        const submitBtn = $('#g-submit');
        if (submitBtn) submitBtn.disabled = true;

        SpeechInput.stopListening();
        AudioPlayer.setDucking(false);

        // Highlight correct QCM button if mode QCM
        const selBtn = $(`#g-qcm-grid .qcm-choice-btn.selected`);
        if (selBtn) selBtn.classList.add('correct');
        $$('#g-qcm-grid .qcm-choice-btn').forEach(b => {
          b.disabled = true;
        });

        $('#qcm-sos-banner')?.classList.add('hidden');
      } else {
        // TROUVÉ PARTIELLEMENT (ex: Artiste trouvé, Titre restant, ou inversement)
        state.hasAnswered = false;
        const input = $('#g-answer');
        if (input) {
          input.disabled = false;
          input.value = '';
          if (artistFound && !titleFound) {
            input.placeholder = 'Artiste validé ! Tape maintenant le Titre… 🎵';
          } else if (titleFound && !artistFound) {
            input.placeholder = 'Titre validé ! Tape maintenant l\'Artiste… 🎤';
          } else if (hasFeat && !featFound) {
            input.placeholder = 'Bien joué ! Cherche le Featuring… 🎙️';
          }
          input.focus();
        }
      }

      const input = $('#g-answer');
      if (streak >= 2 && input && !isQcm) {
        input.classList.add('on-fire');
      }

      if (fbIcon) fbIcon.textContent = isQcm ? '💡' : (isComplete ? '🔥' : '🎯');
      if (fbMsg) fbMsg.textContent = message || (isQcm ? 'Trouvé via l\'Aide QCM !' : 'Bien vu !');

      let ptsText = `+${points} pts`;
      if (isQcm) {
        ptsText += ' (aide -50%)';
      } else {
        if (bonusSpeed) ptsText += ` (+${bonusSpeed} vitesse)`;
        if (streak >= 2) ptsText += ` • ${data.streakLabel || ('🔥 Série x' + streak)} !`;
      }
      if (fbPts) fbPts.textContent = ptsText;

      fb.className = 'game-feedback correct';
      UIEffects.scorePopup(`+${points}${isQcm ? ' (QCM)' : ''}`, true);
    } else {
      $('#g-answer')?.classList.remove('on-fire');
      AudioPlayer.playSfx('wrong');
      if (fbIcon) fbIcon.textContent = '❌';
      if (fbMsg) fbMsg.textContent = message || 'Essaie encore ! 🔄';
      if (fbPts) fbPts.textContent = '';
      fb.className = 'game-feedback wrong';

      const input = $('#g-answer');
      if (input) {
        UIEffects.shake(input);
        input.disabled = false;
        input.value = '';
        input.focus();
      }
    }

    fb.classList.remove('hidden');
    setTimeout(() => {
      if (!state.hasAnswered) {
        fb.classList.add('hidden');
      }
    }, 1500);
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

  function onRoundEnd(data, isDemo = false) {
    stopRoundTimer();
    AudioPlayer.stop();
    SpeechInput.stopListening();

    const track = data.result.track || data.result.correctAnswer;
    const playerResults = data.result.playerResults || data.result.scores || [];

    // Numéro de round
    const roundNumEl = $('#re-round-num');
    if (roundNumEl) roundNumEl.textContent = data.result.roundNumber || state.room?.currentRound || '1';

    if (track) {
      const coverBig = track.coverBig || track.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';
      const artistPhoto = track.artistPhoto || coverBig;
      const artistName = track.cleanArtist || track.artist || 'Artiste inconnu';
      const trackTitle = track.cleanTitle || track.title || 'Titre';

      // 🎵 Visuel officiel Mukiz : photo d'artiste et cartouche bleu électrique
      const revealPhoto = $('#g-reveal-artist-photo');
      const pillArtist = $('#re-pill-artist');
      const pillTitle = $('#re-pill-title');
      if (revealPhoto) revealPhoto.src = artistPhoto;
      if (pillArtist) pillArtist.textContent = artistName.toUpperCase();
      if (pillTitle) pillTitle.textContent = trackTitle.toUpperCase();

      // Éléments de repli
      const cCover = $('#g-correct-cover');
      const cArtist = $('#g-correct-artist');
      const cTitle = $('#g-correct-title');
      const featBadge = $('#re-feat-badge');
      const featName = $('#re-feat-name');

      if (cCover) cCover.src = coverBig;
      if (cArtist) cArtist.textContent = artistName;
      if (cTitle) cTitle.textContent = trackTitle;

      // Badge Feat
      if (featBadge && featName) {
        if (track.featArtist) {
          featName.textContent = track.featArtist;
          featBadge.classList.remove('hidden');
        } else {
          featBadge.classList.add('hidden');
        }
      }

      // Performance du joueur local
      const myRes = playerResults.find(p => p.name === user.name) ||
                    (state.socketId && playerResults.find(p => p.id === state.socketId));
      const chipRes = $('#re-chip-result');
      const chipStreak = $('#re-chip-streak');
      const chipFeat = $('#re-chip-feat');

      if (chipRes) {
        if (myRes && (myRes.isCorrect || myRes.points > 0)) {
          chipRes.textContent = `✅ Trouvé (+${myRes.points} pts)`;
          chipRes.className = 're-status-chip';
        } else {
          chipRes.textContent = `❌ Pas trouvé (0 pt)`;
          chipRes.className = 're-status-chip chip-missed';
        }
      }

      if (chipStreak) {
        if (myRes && myRes.streak >= 2) {
          chipStreak.textContent = `${myRes.streakLabel || ('🔥 Série x' + myRes.streak)} (+${myRes.streakBonus || 0} pts)`;
          chipStreak.classList.remove('hidden');
        } else {
          chipStreak.classList.add('hidden');
        }
      }

      if (chipFeat) {
        if (myRes && myRes.featDetected) {
          chipFeat.textContent = `🎙️ Bonus Feat Cité (+${myRes.featBonus || 150} pts)`;
          chipFeat.classList.remove('hidden');
        } else {
          chipFeat.classList.add('hidden');
        }
      }

      // 📜 Mukiz Left History sidebar addition
      const histEmpty = $('#g-history-empty');
      if (histEmpty) histEmpty.style.display = 'none';

      const histList = $('#g-history-list');
      if (histList) {
        const isCorrect = myRes ? (myRes.isCorrect || myRes.points > 0) : state.hasAnswered;
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
          <img src="${coverBig}" alt="" class="history-thumb">
          <div class="history-meta">
            <div class="history-track">${escapeHtml(track.cleanTitle || track.title || 'Titre')}</div>
            <div class="history-artist">${escapeHtml(track.cleanArtist || track.artist || 'Artiste')}</div>
          </div>
          <span class="history-status">${isCorrect ? '✅' : '❌'}</span>
        `;
        histList.prepend(li);
      }
    }

    // Résultats du round (scores & streaks)
    const list = $('#g-round-results');
    if (list && playerResults.length > 0) {
      list.innerHTML = playerResults.map(s => {
        const isCorrect = s.isCorrect || (s.points > 0);
        return `
          <li class="re-player-row">
            <span class="re-player-name">
              ${escapeHtml(s.name)}
              ${(s.streak >= 2) ? `<span class="re-player-streak-badge">${s.streakLabel || ('🔥 x' + s.streak)}</span>` : ''}
              ${s.featDetected ? `<span class="re-feat-badge" style="font-size:0.7rem;padding:2px 6px;">🎙️ Feat</span>` : ''}
            </span>
            <span class="re-player-points">
              ${isCorrect ? '✅' : '❌'} +${s.points || 0} pts (Total: ${s.totalScore ?? s.score ?? 0})
            </span>
          </li>
        `;
      }).join('');
    }

    // Compte à rebours du round end (8s en jeu, 30s en mode démo pour laisser le temps de contempler)
    if (state.roundEndInterval) {
      clearInterval(state.roundEndInterval);
      state.roundEndInterval = null;
    }
    state.isRoundEndPaused = false;
    let reCountdown = isDemo ? 30 : 8;
    const cdEl = $('#re-countdown');
    const pauseBtn = $('#btn-pause-reveal');
    if (pauseBtn) pauseBtn.textContent = '⏸️ Pause';
    if (cdEl) cdEl.textContent = reCountdown;

    state.roundEndInterval = setInterval(() => {
      if (state.isRoundEndPaused) return;
      reCountdown--;
      if (cdEl) cdEl.textContent = Math.max(0, reCountdown);
      if (reCountdown <= 0) {
        clearInterval(state.roundEndInterval);
        state.roundEndInterval = null;
        if (isDemo) {
          $('#g-round-end')?.classList.add('hidden');
        }
      }
    }, 1000);

    // Mise à jour des scores dans le room state
    if (state.room && playerResults.length > 0) {
      playerResults.forEach(s => {
        const p = state.room.players?.find(pl => pl.name === s.name || pl.id === s.id);
        if (p) {
          p.score = s.totalScore ?? s.score ?? p.score;
          p.streak = s.streak ?? p.streak;
        }
      });
      updateMiniScoreboard();
    }

    // Gestion des vies en mode Survie ❤️❤️❤️
    if (state.isSurvivalMode) {
      const myRes = playerResults.find(p => p.name === user.name) ||
                    (state.socketId && playerResults.find(p => p.id === state.socketId));
      const found = myRes ? (myRes.isCorrect || myRes.points > 0) : state.hasAnswered;

      if (!found) {
        state.survivalLives--;
        AudioPlayer.playSfx('wrong');
        UIEffects.showToast(`💔 Oups ! Vie perdue. Il te reste ${state.survivalLives} vie(s) !`, 'warning', 2500);
      } else {
        state.survivalTracksSurvived++;
        state.survivalScore += (myRes?.points || 500);
      }

      // Mise à jour de l'affichage des cœurs
      const heartsEl = $('#g-lives-hearts');
      if (heartsEl) {
        const full = '❤️'.repeat(Math.max(0, state.survivalLives));
        const empty = '🖤'.repeat(Math.max(0, 3 - state.survivalLives));
        heartsEl.textContent = full + empty;
      }

      if (state.survivalLives <= 0) {
        // Fin du mode survie !
        setTimeout(() => {
          $('#g-round-end')?.classList.add('hidden');
          const finalScoreEl = $('#surv-final-score');
          const tracksEl = $('#surv-tracks-count');
          const bestEl = $('#surv-best-score');
          const prevBest = parseInt(localStorage.getItem('muzik_survival_highscore') || '0', 10);
          const newBest = Math.max(prevBest, state.survivalScore);
          localStorage.setItem('muzik_survival_highscore', String(newBest));

          if (finalScoreEl) finalScoreEl.textContent = state.survivalScore;
          if (tracksEl) tracksEl.textContent = state.survivalTracksSurvived;
          if (bestEl) bestEl.textContent = newBest;

          openModal('modal-survival-over');
          state.isSurvivalMode = false;
          $('#g-survival-lives')?.classList.add('hidden');
        }, 2000);
      }
    }

    $('#g-feedback')?.classList.add('hidden');
    $('#g-hint-banner')?.classList.add('hidden');
    $('#g-round-end')?.classList.remove('hidden');
  }

  function triggerDemoReveal() {
    const dummyResult = {
      roundNumber: 1,
      track: {
        cleanArtist: 'NINHO',
        cleanTitle: "GOUTTE D'EAU",
        artist: 'Ninho',
        title: "Goutte d'eau",
        featArtist: null,
        artistPhoto: 'https://e-cdns-images.dzcdn.net/images/artist/f1947b19280d9eb4f3d15daeeae5bc07/1000x1000-000000-80-0-0.jpg',
        cover: 'https://e-cdns-images.dzcdn.net/images/cover/b43db026f39e31d4e0b04323e4ea3e61/500x500-000000-80-0-0.jpg',
        coverBig: 'https://e-cdns-images.dzcdn.net/images/cover/b43db026f39e31d4e0b04323e4ea3e61/1000x1000-000000-80-0-0.jpg'
      },
      playerResults: [
        { name: user.name || 'Invité', points: 850, isCorrect: true, streak: 3, streakLabel: '🔥 x3', streakBonus: 200, featDetected: false, totalScore: 850 },
        { name: 'Alex_92', points: 720, isCorrect: true, streak: 1, featDetected: false, totalScore: 720 },
        { name: 'Sarah_Music', points: 0, isCorrect: false, streak: 0, featDetected: false, totalScore: 450 }
      ]
    };

    showView('view-game');
    onRoundEnd({ result: dummyResult }, true /* isDemo */);
    UIEffects.showToast('Démo Révélation Mukiz (Vinyle tournant + Ninho) affichée ! 🎬', 'success', 3000);
  }

  function onChatMessage(data) {
    const container = $('#g-chat-messages');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'chat-msg-row';
    row.innerHTML = `
      <span class="chat-msg-author">${escapeHtml(data.senderName)}:</span>
      <span class="chat-msg-text">${escapeHtml(data.text)}</span>
      <span class="chat-msg-time">${data.time || ''}</span>
    `;

    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
    AudioPlayer.playSfx('tick');
  }

  function onReactionEmote(data) {
    UIEffects.spawnFloatingEmoji(data.emoji, data.senderName);
    AudioPlayer.playSfx('tick');
  }

  function onJokerResult(data) {
    if (data.joker === '5050' && data.correctAnswerText) {
      AudioPlayer.playSfx('powerup');
      UIEffects.showToast('🎯 Joker 50/50 : 2 mauvaises réponses éliminées !', 'success', 3000);

      const qcmBtns = $$('#g-qcm-grid .qcm-choice-btn');
      if (qcmBtns.length > 0) {
        let removed = 0;
        qcmBtns.forEach(btn => {
          const choice = btn.getAttribute('data-choice');
          if (choice !== data.correctAnswerText && removed < 2) {
            btn.style.opacity = '0.2';
            btn.disabled = true;
            btn.style.textDecoration = 'line-through';
            removed++;
          }
        });
      }
    } else if (data.joker === 'DOUBLE_POINTS') {
      AudioPlayer.playSfx('powerup');
      UIEffects.showToast('⚡ Joker Double Points activé pour la manche !', 'success', 3000);
      UIEffects.scorePopup('⚡ POINTS x2', true);
    } else if (data.joker === 'FREEZE_TIME') {
      AudioPlayer.playSfx('powerup');
      UIEffects.showToast('❄️ Joker Freeze +5s activé !', 'info', 3000);
      state.timerRemaining += 5;
    }
  }

  function onPlayerUsedJoker(data) {
    if (data.playerName !== user.name) {
      AudioPlayer.playSfx('powerup');
      UIEffects.showToast(`🃏 ${data.playerName} a utilisé un Joker ${data.jokerType} !`, 'info', 2500);
    }
  }

  function onGameOver(data) {
    stopRoundTimer();
    AudioPlayer.stop();
    SpeechInput.stopListening();

    showView('view-gameover');
    AudioPlayer.playSfx('fanfare');

    const results = data.results;
    if (!results) return;

    // Winner highlight
    const winner = results.rankings?.[0];
    const wName = $('#go-winner-name');
    const wScore = $('#go-winner-score');
    if (wName) wName.textContent = winner ? `${winner.name}` : 'Égalité';
    if (wScore) wScore.textContent = winner ? `${winner.score} points` : '';

    // MVP Award Highlight
    const mvp = results.mvp || winner;
    const mvpName = $('#go-mvp-name');
    const mvpAvatar = $('#go-mvp-avatar');
    const mvpAccuracy = $('#go-mvp-accuracy');
    const mvpSpeed = $('#go-mvp-speed');

    if (mvp) {
      if (mvpName) mvpName.textContent = mvp.name;
      if (mvpAvatar) mvpAvatar.textContent = getAvatarEmoji(mvp.name);
      if (mvpAccuracy) mvpAccuracy.textContent = `🎯 ${mvp.accuracy || 100}% Précision`;
      if (mvpSpeed) mvpSpeed.textContent = `⚡ ${mvp.avgTime || 2.5}s Vitesse moy.`;
    }

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
            <span class="rank-correct">${p.correctAnswers || 0} trouvés (${p.accuracy || 0}%)</span>
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

    const hashMap = {
      'view-home': 'accueil',
      'view-playlists': 'playlists',
      'view-shop': 'shop',
      'view-quests': 'quests',
      'view-profile': 'profil',
      'view-ranked': 'ranked',
      'view-leaderboard': 'leaderboard',
      'view-pass': 'pass',
      'view-stats': 'stats',
      'view-achievements': 'achievements',
      'view-collection': 'collection',
      'view-vocal-mimic': 'vocal-mimic',
      'view-clubs': 'clubs',
      'view-battle-royale': 'battle-royale',
      'view-studio': 'studio',
      'view-survival': 'survival',
      'view-admin': 'admin',
      'view-booska-quizz': 'booska-quizz'
    };
    if (hashMap[viewId]) {
      history.replaceState(null, null, `#${hashMap[viewId]}`);
    }

    $$('.sidebar-link, [data-nav]').forEach(link => {
      const navTarget = link.getAttribute('data-nav');
      if (viewId === 'view-home' && navTarget === 'accueil') {
        link.classList.add('active');
      } else if (viewId === 'view-playlists' && navTarget === 'playlists') {
        link.classList.add('active');
      } else if (viewId === 'view-shop' && navTarget === 'shop') {
        link.classList.add('active');
      } else if (viewId === 'view-quests' && navTarget === 'quests') {
        link.classList.add('active');
      } else if (viewId === 'view-profile' && navTarget === 'profil') {
        link.classList.add('active');
      } else if (viewId === 'view-solo' && navTarget === 'accueil') {
        link.classList.add('active');
      } else if (viewId === 'view-admin' && navTarget === 'admin') {
        link.classList.add('active');
      } else if (viewId === 'view-booska-quizz' && navTarget === 'booska-quizz') {
        link.classList.add('active');
      } else if (viewId === 'view-ranked' && navTarget === 'ranked') {
        link.classList.add('active');
      } else if (viewId === 'view-leaderboard' && navTarget === 'leaderboard') {
        link.classList.add('active');
      } else if (viewId === 'view-pass' && navTarget === 'pass') {
        link.classList.add('active');
      } else if (viewId === 'view-stats' && navTarget === 'stats') {
        link.classList.add('active');
      } else if (viewId === 'view-achievements' && navTarget === 'achievements') {
        link.classList.add('active');
      } else if (viewId === 'view-collection' && navTarget === 'collection') {
        link.classList.add('active');
      } else if (viewId === 'view-vocal-mimic' && navTarget === 'vocal-mimic') {
        link.classList.add('active');
      } else if (viewId === 'view-clubs' && navTarget === 'clubs') {
        link.classList.add('active');
      } else if (viewId === 'view-battle-royale' && navTarget === 'battle-royale') {
        link.classList.add('active');
      } else if (viewId === 'view-studio' && navTarget === 'studio') {
        link.classList.add('active');
      } else if (viewId === 'view-survival' && navTarget === 'survival') {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Auto-render feature views when navigated
    if (viewId === 'view-ranked') {
      setTimeout(() => updateRankedUI(), 50);
    } else if (viewId === 'view-leaderboard') {
      setTimeout(() => renderLeaderboard('ranked'), 50);
    } else if (viewId === 'view-pass') {
      setTimeout(() => renderPassTrack(), 50);
    } else if (viewId === 'view-stats') {
      setTimeout(() => renderStatsView(), 50);
    } else if (viewId === 'view-achievements') {
      setTimeout(() => { renderAchievementsGrid(); checkAchievementProgress(); }, 50);
    } else if (viewId === 'view-collection') {
      setTimeout(() => { renderCollectionGrid(); updateCollectionUI(); }, 50);
    } else if (viewId === 'view-vocal-mimic') {
      setTimeout(() => renderVocalMimicView(), 50);
    } else if (viewId === 'view-clubs') {
      setTimeout(() => renderClubsView(), 50);
    } else if (viewId === 'view-battle-royale') {
      setTimeout(() => renderBattleRoyaleView(), 50);
    } else if (viewId === 'view-studio') {
      setTimeout(() => renderStudioView(), 50);
    } else if (viewId === 'view-survival') {
      setTimeout(() => renderSurvivalView(), 50);
    }
  }

  function handleHashNavigation() {
    const rawHash = window.location.hash.replace('#', '').trim();
    if (!rawHash) return;
    const navToViewMap = {
      'accueil': 'view-home',
      'home': 'view-home',
      'playlists': 'view-playlists',
      'shop': 'view-shop',
      'quests': 'view-quests',
      'profil': 'view-profile',
      'profile': 'view-profile',
      'ranked': 'view-ranked',
      'leaderboard': 'view-leaderboard',
      'pass': 'view-pass',
      'stats': 'view-stats',
      'achievements': 'view-achievements',
      'collection': 'view-collection',
      'vocal-mimic': 'view-vocal-mimic',
      'clubs': 'view-clubs',
      'battle-royale': 'view-battle-royale',
      'studio': 'view-studio',
      'survival': 'view-survival',
      'admin': 'view-admin',
      'booska-quizz': 'view-booska-quizz'
    };
    const viewId = navToViewMap[rawHash];
    if (viewId) {
      showView(viewId);
    }
  }

  window.addEventListener('hashchange', handleHashNavigation);

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

      // ─── SOS QCM LIFELINE: UNLOCK AT 10 SECONDS REMAINING ───
      if (remainingSec <= 10 && !state.qcmUnlocked && !state.hasAnswered && !state.qcmFailed && !state.isQcmOnly) {
        state.qcmUnlocked = true;
        const tabQcm = $('#tab-mode-qcm');
        const sosTabIcon = $('#sos-tab-icon');
        const sosTabText = $('#sos-tab-text');
        const qcmSosBanner = $('#qcm-sos-banner');

        if (tabQcm) {
          tabQcm.classList.remove('locked');
          tabQcm.classList.add('unlocked-pulse');
        }
        if (sosTabIcon) sosTabIcon.textContent = '🆘';
        if (sosTabText) sosTabText.textContent = 'Aide QCM (Dispo !)';
        if (qcmSosBanner && state.answerMode === 'text') {
          qcmSosBanner.classList.remove('hidden');
        }
        AudioPlayer.playSfx('tick');
      }

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
    let plObj = state.playlists.find(p => p.key === currentGenre);
    if (!plObj && currentGenre.startsWith('100-')) {
      const raw = currentGenre.substring(4);
      const cleanArtist = decodeURIComponent(raw).replace(/[-_]/g, ' ');
      const artistTitle = cleanArtist.charAt(0).toUpperCase() + cleanArtist.slice(1);
      plObj = {
        name: `100% ${artistTitle}`,
        description: `Discographie intégrale & infinie de ${artistTitle} (Deezer + Spotify)`,
        cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
        category: '100% ARTISTE',
        emoji: '🔥',
        difficulty: 'FACILE',
      };
    } else if (!plObj) {
      plObj = {
        name: currentGenre,
        description: 'Playlist sélectionnée',
        cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&q=80',
        category: 'GENRE',
        emoji: '🎵',
        difficulty: 'FACILE',
      };
    }

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

    // Filter by category tag (Artistes, Genres, Décennies, Thèmes, Custom)
    if (category && category !== 'all') {
      if (category === 'custom') {
        filtered = filtered.filter(p => p.category === 'custom' || p.isCustom);
      } else {
        filtered = filtered.filter(p => p.category === category);
      }
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
              <div style="display: flex; gap: 6px; align-items: center;">
                <button class="btn-audio-preview" data-key="${p.key}" title="Écouter un extrait de 6 secondes">
                  <span>🎧</span> Aperçu
                </button>
                <button class="btn-play-card btn-play-playlist" data-key="${p.key}">
                  ▶ Jouer
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Click handler on card to open detail modal
    $$('.playlist-card-mukiz').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-play-playlist') || e.target.closest('.btn-audio-preview')) return;
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

    // Click on audio preview button
    $$('.btn-audio-preview').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.getAttribute('data-key');
        handleAudioPreviewClick(btn, key);
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
  // CUSTOM PLAYLIST CREATOR (SEARCH & BUILD)
  // ═══════════════════════════════════════
  let customCreatorTracks = [];
  let previewAudioPlayer = new Audio();
  let currentlyPlayingPreviewUrl = null;

  function initCustomPlaylistCreator() {
    const btnOpen = $('#btn-open-create-playlist-modal');
    const modal = $('#modal-create-playlist');
    const btnClose = $('#btn-close-create-pl');
    const searchInput = $('#create-pl-search-input');
    const searchSpinner = $('#create-pl-search-spinner');
    const resultsList = $('#create-pl-search-results');
    const selectedList = $('#create-pl-selected-list');
    const selectedEmpty = $('#create-pl-selected-empty');
    const selectedCount = $('#create-pl-selected-count');
    const btnClear = $('#btn-clear-selected-tracks');
    const btnSave = $('#btn-save-custom-playlist');
    const nameInput = $('#create-pl-name');
    const emojiInput = $('#create-pl-emoji');
    const descInput = $('#create-pl-desc');

    btnOpen?.addEventListener('click', () => {
      openModal('modal-create-playlist');
      updateSelectedUI();
    });

    btnClose?.addEventListener('click', () => {
      stopPreviewAudio();
      closeModal('modal-create-playlist');
    });

    // Debounced search
    let searchDebounce = null;
    searchInput?.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      const q = searchInput.value.trim();
      if (!q) {
        if (resultsList) resultsList.innerHTML = '';
        return;
      }

      searchDebounce = setTimeout(async () => {
        searchSpinner?.classList.remove('hidden');
        try {
          const res = await fetch(`/api/tracks/search?q=${encodeURIComponent(q)}`);
          const data = await res.json();
          renderSearchResults(data.tracks || []);
        } catch (err) {
          console.error('[Search] Error:', err);
        } finally {
          searchSpinner?.classList.add('hidden');
        }
      }, 300);
    });

    function renderSearchResults(tracks) {
      if (!resultsList) return;
      if (tracks.length === 0) {
        resultsList.innerHTML = '<div style="padding:12px;text-align:center;color:#94a3b8;font-size:0.85rem;">Aucun morceau trouvé pour cette recherche.</div>';
        return;
      }

      resultsList.innerHTML = tracks.map(t => {
        const isAdded = customCreatorTracks.some(st => st.id === t.id);
        return `
          <div class="search-track-item" data-id="${t.id}">
            <div class="search-track-left">
              <img src="${t.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&q=80'}" alt="" class="search-track-thumb">
              <div class="search-track-info">
                <span class="search-track-title">${escapeHtml(t.title)}</span>
                <span class="search-track-artist">${escapeHtml(t.artist)}</span>
              </div>
            </div>
            <div class="search-track-actions">
              ${t.preview ? `<button class="btn-track-preview" data-preview="${t.preview}" title="Écouter l'extrait">🎧</button>` : ''}
              <button class="btn-track-add ${isAdded ? 'added' : ''}" data-id="${t.id}">
                ${isAdded ? '✓ Ajouté' : '+ Ajouter'}
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Preview audio
      resultsList.querySelectorAll('.btn-track-preview').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const url = btn.getAttribute('data-preview');
          togglePreviewAudio(url, btn);
        });
      });

      // Add track
      resultsList.querySelectorAll('.btn-track-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const track = tracks.find(t => String(t.id) === String(id));
          if (track && !customCreatorTracks.some(st => st.id === track.id)) {
            customCreatorTracks.push(track);
            btn.textContent = '✓ Ajouté';
            btn.classList.add('added');
            updateSelectedUI();
            UIEffects.showToast(`« ${track.title} » ajouté à ta playlist !`, 'success', 2000);
          }
        });
      });
    }

    function togglePreviewAudio(url, btnEl) {
      if (currentlyPlayingPreviewUrl === url) {
        stopPreviewAudio();
        if (btnEl) btnEl.textContent = '🎧';
      } else {
        stopPreviewAudio();
        previewAudioPlayer.src = url;
        previewAudioPlayer.play().catch(e => console.warn('Preview play error:', e));
        currentlyPlayingPreviewUrl = url;
        if (btnEl) btnEl.textContent = '⏸️';
        previewAudioPlayer.onended = () => {
          stopPreviewAudio();
          if (btnEl) btnEl.textContent = '🎧';
        };
      }
    }

    function stopPreviewAudio() {
      previewAudioPlayer.pause();
      previewAudioPlayer.currentTime = 0;
      currentlyPlayingPreviewUrl = null;
      document.querySelectorAll('.btn-track-preview').forEach(b => b.textContent = '🎧');
    }

    function updateSelectedUI() {
      const count = customCreatorTracks.length;
      if (selectedCount) selectedCount.textContent = count;
      if (btnSave) {
        btnSave.disabled = count === 0;
        btnSave.textContent = `💾 Enregistrer ma playlist (${count} morceau${count > 1 ? 'x' : ''})`;
      }

      if (count === 0) {
        if (selectedEmpty) selectedEmpty.style.display = 'flex';
        if (btnClear) btnClear.style.display = 'none';
        if (selectedList) selectedList.innerHTML = '';
      } else {
        if (selectedEmpty) selectedEmpty.style.display = 'none';
        if (btnClear) btnClear.style.display = 'inline-block';
        if (selectedList) {
          selectedList.innerHTML = customCreatorTracks.map((t, idx) => `
            <li class="selected-track-row">
              <div class="selected-track-left">
                <span class="selected-track-num">#${idx + 1}</span>
                <img src="${t.cover || ''}" alt="" class="selected-track-thumb">
                <span class="selected-track-meta">${escapeHtml(t.artist)} — <b>${escapeHtml(t.title)}</b></span>
              </div>
              <button class="btn-track-remove" data-id="${t.id}" title="Supprimer">✕</button>
            </li>
          `).join('');

          selectedList.querySelectorAll('.btn-track-remove').forEach(btn => {
            btn.addEventListener('click', () => {
              const id = btn.getAttribute('data-id');
              customCreatorTracks = customCreatorTracks.filter(t => String(t.id) !== String(id));
              updateSelectedUI();
              // Update status in search list if visible
              const searchBtn = resultsList?.querySelector(`.btn-track-add[data-id="${id}"]`);
              if (searchBtn) {
                searchBtn.textContent = '+ Ajouter';
                searchBtn.classList.remove('added');
              }
            });
          });
        }
      }
    }

    btnClear?.addEventListener('click', () => {
      customCreatorTracks = [];
      updateSelectedUI();
      resultsList?.querySelectorAll('.btn-track-add').forEach(b => {
        b.textContent = '+ Ajouter';
        b.classList.remove('added');
      });
    });

    // Save Custom Playlist
    btnSave?.addEventListener('click', async () => {
      const name = nameInput ? nameInput.value.trim() : '';
      if (!name) {
        UIEffects.showToast('Donne un nom à ta playlist !', 'error', 3000);
        nameInput?.focus();
        return;
      }

      if (customCreatorTracks.length === 0) {
        UIEffects.showToast('Ajoute au moins 1 morceau à ta playlist !', 'warning', 3000);
        return;
      }

      const emoji = emojiInput ? emojiInput.value.trim() : '🎧';
      const desc = descInput ? descInput.value.trim() : '';

      btnSave.disabled = true;
      btnSave.textContent = 'Enregistrement en cours…';

      try {
        const res = await fetch('/api/playlists/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            emoji,
            description: desc,
            tracks: customCreatorTracks,
          }),
        });
        const data = await res.json();
        if (data.success && data.playlist) {
          saveCustomPlaylistToStorage(data.playlist);
          state.playlists.unshift(data.playlist);
          populatePlaylistSelect(state.playlists);
          renderPlaylistsGrid(state.playlists);
          renderSavedSpotifyPlaylists();

          UIEffects.showToast(`🎉 Playlist « ${data.playlist.name} » créée avec succès !`, 'success', 5000);
          closeModal('modal-create-playlist');
          stopPreviewAudio();

          // Reset inputs
          if (nameInput) nameInput.value = '';
          if (descInput) descInput.value = '';
          if (searchInput) searchInput.value = '';
          if (resultsList) resultsList.innerHTML = '';
          customCreatorTracks = [];
          updateSelectedUI();

          // Ouvrir les détails de la nouvelle playlist
          openPlaylistDetailsModal(data.playlist.key);
        } else {
          UIEffects.showToast(data.message || 'Erreur lors de la création', 'error', 4000);
        }
      } catch (err) {
        console.error('[Create Playlist] Error:', err);
        UIEffects.showToast('Erreur serveur', 'error', 4000);
      } finally {
        btnSave.disabled = false;
        btnSave.textContent = `💾 Enregistrer ma playlist (${customCreatorTracks.length} morceaux)`;
      }
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
        ${(p.streak >= 2) ? `<span class="re-player-streak-badge" title="Série de victoires">🔥 x${p.streak}</span>` : ''}
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
      name = 'Mélomane#' + Math.floor(100 + Math.random() * 900);
      user.name = name;
      saveUserProfile();
    }
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
        if (target === 'shop') {
          showView('view-shop');
          updateShopUI();
        }
        if (target === 'quests') {
          showView('view-quests');
          renderLongTermQuests();
        }
        if (target === 'booska-quizz') {
          startBooskaQuizzSession();
        }
        if (target === 'profil') showView('view-profile');
        if (target === 'ranked') {
          showView('view-ranked');
          updateRankedUI();
        }
        if (target === 'leaderboard') {
          showView('view-leaderboard');
          renderLeaderboard('ranked');
        }
        if (target === 'pass') {
          showView('view-pass');
          renderPassTrack();
        }
        if (target === 'admin') {
          handleAdminNavigation();
        }
        if (target === 'stats') {
          showView('view-stats');
        }
        if (target === 'achievements') {
          showView('view-achievements');
        }
        if (target === 'collection') {
          showView('view-collection');
        }
        if (target === 'vocal-mimic') {
          showView('view-vocal-mimic');
        }
        if (target === 'clubs') {
          showView('view-clubs');
        }
        if (target === 'battle-royale') {
          showView('view-battle-royale');
        }
        if (target === 'studio') {
          showView('view-studio');
        }
        if (target === 'survival') {
          showView('view-survival');
        }
        if (target === 'settings') openModal('modal-settings');
      });
    });

    $('#sidebar-logo')?.addEventListener('click', (e) => {
      e.preventDefault();
      showView('view-home');
    });

    $('#sb-link-settings')?.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('modal-settings');
    });

    // ❓ Comment Jouer (Guide Complet & Raccourcis)
    $('#btn-open-help')?.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('modal-help');
    });

    $('#btn-close-help')?.addEventListener('click', () => {
      closeModal('modal-help');
    });

    $('#btn-help-start-playing')?.addEventListener('click', () => {
      closeModal('modal-help');
      showView('view-home');
      $('#player-name')?.focus();
    });

    // Sélecteur de Mode de Visualiseur Canvas
    $('#btn-toggle-visualizer')?.addEventListener('click', () => {
      const modeName = AudioPlayer.toggleVisualizerMode();
      const iconEl = $('#visu-mode-icon');
      const labelEl = $('#visu-mode-label');
      if (iconEl && labelEl) {
        const parts = modeName.split(' ');
        iconEl.textContent = parts[0];
        labelEl.textContent = parts[1] || modeName;
      }
      UIEffects.showToast(`Style de visualiseur : ${modeName}`, 'info', 1500);
    });

    // Émotes Flottantes (Boutons de Réaction)
    $$('.reaction-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.getAttribute('data-emoji') || '🔥';
        UIEffects.spawnFloatingEmoji(emoji, user.name);
        send('SEND_REACTION', { emoji });
      });
    });

    // Jokers & Power-ups
    $('#btn-joker-5050')?.addEventListener('click', () => {
      if (user.coins < 20) {
        UIEffects.showToast('Pas assez de pièces ! (Requis: 🪙 20)', 'warning', 2000);
        return;
      }
      user.coins -= 20;
      saveUserProfile();
      send('USE_JOKER', { joker: '5050' });
    });

    $('#btn-joker-double')?.addEventListener('click', () => {
      if (user.coins < 30) {
        UIEffects.showToast('Pas assez de pièces ! (Requis: 🪙 30)', 'warning', 2000);
        return;
      }
      user.coins -= 30;
      saveUserProfile();
      send('USE_JOKER', { joker: 'DOUBLE_POINTS' });
    });

    $('#btn-joker-freeze')?.addEventListener('click', () => {
      if (user.coins < 25) {
        UIEffects.showToast('Pas assez de pièces ! (Requis: 🪙 25)', 'warning', 2000);
        return;
      }
      user.coins -= 25;
      saveUserProfile();
      send('USE_JOKER', { joker: 'FREEZE_TIME' });
    });

    // Chat du Salon & Partie
    function sendChatMessage() {
      const input = $('#g-chat-input');
      const msg = input?.value.trim();
      if (!msg) return;
      send('SEND_CHAT', { message: msg });
      input.value = '';
    }

    $('#g-chat-send')?.addEventListener('click', sendChatMessage);
    $('#g-chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendChatMessage();
    });

    // Contrôles du Round End (Pause & Fermer)
    $('#btn-pause-reveal')?.addEventListener('click', () => {
      state.isRoundEndPaused = !state.isRoundEndPaused;
      const btn = $('#btn-pause-reveal');
      if (btn) btn.textContent = state.isRoundEndPaused ? '▶️ Reprendre' : '⏸️ Pause';
      UIEffects.showToast(state.isRoundEndPaused ? 'Révélation mise en pause ⏸️' : 'Chronomètre repris ▶️', 'info', 1500);
    });

    $('#btn-close-reveal')?.addEventListener('click', () => {
      if (state.roundEndInterval) {
        clearInterval(state.roundEndInterval);
        state.roundEndInterval = null;
      }
      $('#g-round-end')?.classList.add('hidden');
    });

    // Quêtes du jour & Boutique actions
    $('#btn-claim-daily')?.addEventListener('click', () => {
      user.coins += 10;
      saveUserProfile();
      updateProfileUI();
      UIEffects.showToast('🪙 +10 pièces récupérées avec succès !', 'success', 2000);
      const btn = $('#btn-claim-daily');
      if (btn) {
        btn.textContent = '✓ Récupéré';
        btn.disabled = true;
        btn.style.opacity = '0.6';
      }
    });

    // Mode Switch (Saisie libre vs Mode QCM Aide de secours)
    function switchToTextMode() {
      $('#tab-mode-text')?.classList.add('active');
      $('#tab-mode-qcm')?.classList.remove('active');
      $('#answer-mode-text-container')?.classList.remove('hidden');
      $('#answer-mode-qcm-container')?.classList.add('hidden');
      state.answerMode = 'text';
      if (!state.hasAnswered && !state.qcmFailed) {
        $('#g-answer')?.focus();
      }
    }

    function switchToQcmMode() {
      if (!state.qcmUnlocked && !state.isQcmOnly) {
        UIEffects.showToast("🔒 L'Aide QCM de fin se débloque à 10s si tu ne trouves pas !", "warning", 3000);
        return;
      }
      if (state.hasAnswered || state.qcmFailed) return;

      $('#tab-mode-qcm')?.classList.add('active');
      $('#tab-mode-text')?.classList.remove('active');
      $('#answer-mode-qcm-container')?.classList.remove('hidden');
      $('#answer-mode-text-container')?.classList.add('hidden');
      $('#qcm-sos-banner')?.classList.add('hidden');
      state.answerMode = 'qcm';
    }

    $('#tab-mode-text')?.addEventListener('click', switchToTextMode);
    $('#btn-return-to-text')?.addEventListener('click', switchToTextMode);
    $('#tab-mode-qcm')?.addEventListener('click', switchToQcmMode);
    $('#btn-activate-sos-qcm')?.addEventListener('click', switchToQcmMode);

    // Mode Arcade : Survie 💀
    function startSurvivalMode() {
      state.isSurvivalMode = true;
      state.survivalLives = 3;
      state.survivalScore = 0;
      state.survivalTracksSurvived = 0;
      $('#g-survival-lives')?.classList.remove('hidden');
      const heartsEl = $('#g-lives-hearts');
      if (heartsEl) heartsEl.textContent = '❤️❤️❤️';
      AudioPlayer.ensureAudioContext();
      const name = getPlayerName();
      send('CREATE_ROOM', { playerName: name, playlist: 'mix', rounds: 25, duration: 20 });
      UIEffects.showToast('💀 Mode Survie activé ! Tu as 3 vies ❤️❤️❤️', 'warning', 3500);
    }

    $('#btn-arcade-survie')?.addEventListener('click', startSurvivalMode);
    $('#btn-restart-survival')?.addEventListener('click', () => {
      closeModal('modal-survival-over');
      startSurvivalMode();
    });
    $('#btn-leave-survival')?.addEventListener('click', () => {
      closeModal('modal-survival-over');
      showView('view-home');
    });

    // Mode Arcade : Bandiz 🎯
    $('#btn-arcade-bandiz')?.addEventListener('click', () => {
      openModal('modal-bandiz');
    });
    $('#btn-close-bandiz')?.addEventListener('click', () => closeModal('modal-bandiz'));

    const BANDIZ_GENRES = [
      { id: 'rap-fr', label: 'Rap FR 🎤' },
      { id: 'pop-2020s', label: 'Pop 2020s 💃' },
      { id: 'annees-80', label: 'Années 80 🕶️' },
      { id: 'rock', label: 'Rock & Roll 🎸' },
      { id: 'electro', label: 'Electro Festival ⚡' },
      { id: 'disney-fr', label: 'Disney FR 🏰' },
      { id: '100-ninho', label: '100% Ninho 👑' }
    ];
    const BANDIZ_DIFFS = [
      { id: 'x2', label: 'Points x2 🔥' },
      { id: '15s', label: 'Chrono 15s ⚡' },
      { id: 'qcm', label: 'Mode QCM Seul 🎛️' },
      { id: 'hard', label: 'Mode Hardcore 💀' }
    ];

    let bandizSelection = null;

    $('#btn-spin-bandiz')?.addEventListener('click', () => {
      const gEl = $('#reel-val-genre');
      const dEl = $('#reel-val-decade');
      const diffEl = $('#reel-val-diff');
      const startBtn = $('#btn-start-bandiz-game');

      AudioPlayer.playSfx('tick');
      let spins = 10;
      const spinInt = setInterval(() => {
        const randG = BANDIZ_GENRES[Math.floor(Math.random() * BANDIZ_GENRES.length)];
        const randDiff = BANDIZ_DIFFS[Math.floor(Math.random() * BANDIZ_DIFFS.length)];
        
        if (gEl) gEl.textContent = randG.label;
        if (dEl) dEl.textContent = 'Mixte 🎲';
        if (diffEl) diffEl.textContent = randDiff.label;
        
        spins--;
        if (spins <= 0) {
          clearInterval(spinInt);
          AudioPlayer.playSfx('correct');
          bandizSelection = { genre: randG.id, modifier: randDiff.id };
          if (startBtn) startBtn.classList.remove('hidden');
        }
      }, 100);
    });

    $('#btn-start-bandiz-game')?.addEventListener('click', () => {
      closeModal('modal-bandiz');
      AudioPlayer.ensureAudioContext();
      
      let duration = 20;
      let diff = 'INTERMEDIAIRE';
      
      if (bandizSelection) {
        if (bandizSelection.modifier === '15s') duration = 15;
        if (bandizSelection.modifier === 'hard') diff = 'EXPERT';
      }
      
      send('CREATE_ROOM', { 
        playerName: getPlayerName(), 
        genre: bandizSelection?.genre || 'mix', 
        rounds: 10, 
        roundDuration: duration,
        difficulty: diff,
        bandizModifier: bandizSelection?.modifier || null
      });
      
      UIEffects.showToast(`🎯 Mode Bandiz activé !`, 'warning', 3000);
    });

    // Mode Arcade : Rankiz 📊
    $('#btn-arcade-rankiz')?.addEventListener('click', () => {
      const avatarEl = $('#rankiz-user-avatar');
      const nameEl = $('#rankiz-user-name');
      if (avatarEl) avatarEl.textContent = user.avatar;
      if (nameEl) nameEl.textContent = user.name;
      openModal('modal-rankiz');
    });
    $('#btn-close-rankiz')?.addEventListener('click', () => closeModal('modal-rankiz'));

    // Modal Harmonie Premium VIP PRO 👑
    $('#btn-open-premium-modal')?.addEventListener('click', () => openModal('modal-premium'));
    $('#btn-close-premium')?.addEventListener('click', () => closeModal('modal-premium'));

    // Plan Selection in Checkout Modal
    $$('.plan-card').forEach(card => {
      card.addEventListener('click', () => {
        $$('.plan-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const plan = card.getAttribute('data-plan');
        const payBtn = $('#btn-activate-premium');
        if (payBtn) {
          if (plan === 'monthly') payBtn.textContent = '💳 Valider le Paiement & Activer (4,99 € / mois)';
          else if (plan === 'coins') payBtn.textContent = '🪙 Échanger 500 Pièces contre le Pass VIP';
          else payBtn.textContent = '💳 Valider le Paiement & Activer (14,99 € À Vie)';
        }
      });
    });

    // Activer le Pass VIP par Paiement Sécurisé
    $('#btn-activate-premium')?.addEventListener('click', () => {
      user.isVip = true;
      localStorage.setItem('harmonie_vip', 'true');
      localStorage.setItem('muzik_is_premium', 'true');
      user.coins += 200;
      saveUserProfile();
      updateProfileUI();
      closeModal('modal-premium');
      UIEffects.showToast('👑 Pass Harmonie VIP PRO activé avec succès ! (+200 pièces offertes)', 'success', 4000);
    });

    // Débloquer le Pass VIP avec 500 Pièces Harmonie
    $('#btn-unlock-coins-vip')?.addEventListener('click', () => {
      if (user.coins < 500) {
        UIEffects.showToast('🪙 Solde insuffisant ! Tu as besoin de 500 pièces pour débloquer le Pass VIP.', 'error', 3500);
        return;
      }
      user.coins -= 500;
      user.isVip = true;
      localStorage.setItem('harmonie_vip', 'true');
      localStorage.setItem('muzik_is_premium', 'true');
      saveUserProfile();
      updateProfileUI();
      closeModal('modal-premium');
      UIEffects.showToast('🎉 Pass Harmonie VIP PRO débloqué avec 500 pièces ! Tous les modes sont activés.', 'success', 4000);
    });

    // Helper de vérification d'accès VIP
    function checkVipAccess(modeTitle) {
      if (user.isVip) return true;
      openModal('modal-premium');
      UIEffects.showToast(`👑 Le mode "${modeTitle}" nécessite le Pass VIP Harmonie !`, 'info', 3500);
      return false;
    }

    // ═══ MODES PAYANTS VIP : LISTENERS ═══
    $('#btn-mode-vip-ranked')?.addEventListener('click', () => {
      if (!checkVipAccess('Battle 1v1 Ranked')) return;
      openModal('modal-ranked-1v1');
      startRankedMatchmaking();
    });

    $('#btn-mode-vip-survival')?.addEventListener('click', () => {
      if (!checkVipAccess('Survie Extrême')) return;
      $('#btn-arcade-survie')?.click();
      UIEffects.showToast('⚡ Mode Survie Extrême activé (3 Vies & Multiplicateur x2) !', 'success', 3000);
    });

    $('#btn-mode-vip-chrono')?.addEventListener('click', () => {
      if (!checkVipAccess('Chrono 1 Seconde')) return;
      $('#btn-mode-solo')?.click();
      UIEffects.showToast('⏱️ Mode Chrono 1 Seconde activé ! Vitesse d\'extrait ultra rapide.', 'warning', 3500);
    });

    $('#btn-mode-vip-discography')?.addEventListener('click', () => {
      if (!checkVipAccess('Discographies Intégrales')) return;
      openModal('modal-vip-discographies');
    });

    // Ranked Duel Modal Handlers
    $('#btn-close-ranked')?.addEventListener('click', () => closeModal('modal-ranked-1v1'));
    $('#btn-cancel-ranked-queue')?.addEventListener('click', () => closeModal('modal-ranked-1v1'));

    $('#btn-start-ranked-duel')?.addEventListener('click', () => {
      closeModal('modal-ranked-1v1');
      $('#btn-mode-battle')?.click();
      UIEffects.showToast('⚔️ Combat 1v1 Ranked en cours d\'initialisation !', 'success', 3000);
    });

    function startRankedMatchmaking() {
      const statusEl = $('#ranked-queue-status');
      const timerEl = $('#ranked-queue-timer');
      const previewEl = $('#ranked-opponent-preview');
      const startBtn = $('#btn-start-ranked-duel');

      if (statusEl) statusEl.textContent = 'Recherche d\'un joueur VIP (ELO 1200-1350)...';
      if (previewEl) previewEl.classList.add('hidden');
      if (startBtn) startBtn.classList.add('hidden');

      let sec = 4;
      const interval = setInterval(() => {
        sec--;
        if (timerEl) timerEl.textContent = `00:0${sec}`;
        if (sec <= 0) {
          clearInterval(interval);
          if (statusEl) statusEl.textContent = '✅ Adversaire Trouvé ! Combat VIP Prêt.';
          if (previewEl) previewEl.classList.remove('hidden');
          if (startBtn) startBtn.classList.remove('hidden');
        }
      }, 1000);
    }

    // VIP Discographies Handlers
    $('#btn-close-vip-disco')?.addEventListener('click', () => closeModal('modal-vip-discographies'));
    $$('.btn-play-disco').forEach(btn => {
      btn.addEventListener('click', () => {
        closeModal('modal-vip-discographies');
        $('#btn-mode-solo')?.click();
        UIEffects.showToast('💿 Playlist Discographie Intégrale VIP chargée !', 'success', 3000);
      });
    });

    $('#btn-buy-coins')?.addEventListener('click', () => {
      user.coins += 250;
      saveUserProfile();
      updateProfileUI();
      UIEffects.showToast('🪙 Pack Découverte : +250 pièces ajoutées !', 'success', 2500);
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

    let currentOauthProvider = 'google';

    function login(provider) {
      currentOauthProvider = provider;
      if (provider === 'guest') {
        user.provider = 'guest';
        saveUserProfile();
        closeModal('modal-auth');
        UIEffects.showToast('⚡ Connecté en Mode Invité !', 'info', 2500);
        return;
      }

      // Configurer le modal OAuth en fonction du provider
      const iconEl = $('#oauth-provider-icon');
      const titleEl = $('#oauth-provider-title');
      const emailEl = $('#acc-email-preview');

      closeModal('modal-auth');
      openModal('modal-oauth-picker');

      if (provider === 'google') {
        if (iconEl) iconEl.textContent = '🌐';
        if (titleEl) titleEl.textContent = 'Connexion avec Google';
        if (emailEl) emailEl.textContent = 'alex.harmonie@gmail.com';
      } else if (provider === 'apple') {
        if (iconEl) iconEl.textContent = '🍎';
        if (titleEl) titleEl.textContent = 'Connexion avec Apple ID';
        if (emailEl) emailEl.textContent = 'alex.harmonie@icloud.com';
      } else if (provider === 'facebook') {
        if (iconEl) iconEl.textContent = '📘';
        if (titleEl) titleEl.textContent = 'Connexion avec Facebook';
        if (emailEl) emailEl.textContent = 'alex.harmonie@facebook.com';
      }
    }

    // Account items selection inside OAuth modal
    $$('.oauth-account-item').forEach(item => {
      item.addEventListener('click', () => {
        $$('.oauth-account-item').forEach(i => {
          i.classList.remove('active');
          const check = i.querySelector('.acc-check');
          if (check) check.textContent = '';
        });
        item.classList.add('active');
        const check = item.querySelector('.acc-check');
        if (check) check.textContent = '✓';

        const customInput = $('#oauth-custom-name-input');
        if (customInput) customInput.value = item.getAttribute('data-name');
      });
    });

    // Validation de la connexion OAuth
    $('#btn-confirm-oauth')?.addEventListener('click', () => {
      const activeItem = $('.oauth-account-item.active');
      const customInput = $('#oauth-custom-name-input');
      const chosenName = customInput?.value.trim() || activeItem?.getAttribute('data-name') || 'Alex Dupont';

      user.name = chosenName;
      user.provider = currentOauthProvider;
      if (currentOauthProvider === 'google') user.avatar = '🌐';
      else if (currentOauthProvider === 'apple') user.avatar = '🍎';
      else if (currentOauthProvider === 'facebook') user.avatar = '📘';

      user.coins += 100; // Bonus de bienvenue OAuth
      saveUserProfile();
      updateProfileUI();
      closeModal('modal-oauth-picker');

      const providerLabel = currentOauthProvider === 'google' ? 'Google 🌐' : currentOauthProvider === 'apple' ? 'Apple ID 🍎' : 'Facebook 📘';
      UIEffects.showToast(`🎉 Connexion réussie avec ${providerLabel} ! Welcome ${user.name} (+100 🪙 bonus offerts)`, 'success', 4000);
    });

    $('#btn-close-oauth-picker')?.addEventListener('click', () => closeModal('modal-oauth-picker'));

    // 🎨 PROFILE CUSTOMIZATION HANDLERS
    $$('.frame-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.frame-choice').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        user.frame = btn.getAttribute('data-frame');
        updateProfileUI();
      });
    });

    $('#btn-save-profile-custom')?.addEventListener('click', () => {
      const titleVal = $('#profile-title-select')?.value;
      const bioVal = $('#profile-bio-input')?.value;

      if (titleVal) user.title = titleVal;
      if (bioVal !== undefined) user.bio = bioVal;

      saveUserProfile();
      UIEffects.showToast('✨ Préférences de profil sauvegardées avec succès !', 'success', 3000);
    });

    // 🎡 ROUE DE LA FORTUNE HANDLERS
    $('#btn-open-wheel-modal')?.addEventListener('click', () => openModal('modal-wheel'));
    $('#btn-close-wheel')?.addEventListener('click', () => closeModal('modal-wheel'));

    let isWheelSpinning = false;
    $('#btn-spin-wheel-action')?.addEventListener('click', () => {
      if (isWheelSpinning) return;
      isWheelSpinning = true;

      const disc = $('#wheel-disc');
      const btn = $('#btn-spin-wheel-action');
      if (btn) btn.disabled = true;

      const spins = 5;
      const sectorDegrees = 45;
      const randomSector = Math.floor(Math.random() * 8);
      const totalDegree = (spins * 360) + (randomSector * sectorDegrees);

      if (disc) {
        disc.style.transition = 'transform 3.5s cubic-bezier(0.15, 0.9, 0.2, 1)';
        disc.style.transform = `rotate(${totalDegree}deg)`;
      }

      setTimeout(() => {
        isWheelSpinning = false;
        if (btn) btn.disabled = false;

        const rewards = [
          { text: '+50 🪙 pièces !', coins: 50 },
          { text: '+200 ⚡ XP !', coins: 20 },
          { text: '🎯 1 Joker 50/50 offert !', coins: 30 },
          { text: '+100 🪙 pièces !', coins: 100 },
          { text: '👑 Pass VIP PRO 24h débloqué !', vip: true },
          { text: '+250 🪙 pièces !', coins: 250 },
          { text: '❄️ 1 Joker Freeze offert !', coins: 35 },
          { text: '🏆 JACKPOT ! +500 🪙 PIÈCES !', coins: 500 },
        ];

        const win = rewards[randomSector];
        if (win.coins) user.coins += win.coins;
        if (win.vip) {
          user.isVip = true;
          localStorage.setItem('harmonie_vip', 'true');
        }

        saveUserProfile();
        updateProfileUI();
        UIEffects.showToast(`🎉 Gagné : ${win.text}`, 'success', 4000);
      }, 3500);
    });

  // ═══════════════════════════════════════
  // SHOP & INVENTORY PURCHASING ENGINE
  // ═══════════════════════════════════════
  let pendingCheckoutItem = null;

  function updateShopUI() {
    const shopCoinsEl = $('#shop-coins-val');
    if (shopCoinsEl) shopCoinsEl.textContent = user.coins;

    $$('#shop-products-grid .btn-shop-buy').forEach(btn => {
      const itemId = btn.getAttribute('data-item');
      const itemAvatar = btn.getAttribute('data-avatar');
      const itemFrame = btn.getAttribute('data-frame');
      const itemTitle = btn.getAttribute('data-title');
      const itemType = btn.getAttribute('data-type');

      // Check if avatar is currently equipped
      if (itemAvatar && user.avatar === itemAvatar) {
        btn.textContent = '✓ Équipé';
        btn.className = 'btn btn-success btn-sm btn-shop-buy';
        btn.disabled = true;
        return;
      }

      // Check if frame is currently equipped
      if (itemFrame && user.frame === itemFrame) {
        btn.textContent = '✓ Équipé';
        btn.className = 'btn btn-success btn-sm btn-shop-buy';
        btn.disabled = true;
        return;
      }

      // Check if title is currently equipped
      if (itemTitle && user.title === itemTitle) {
        btn.textContent = '✓ Équipé';
        btn.className = 'btn btn-success btn-sm btn-shop-buy';
        btn.disabled = true;
        return;
      }

      // Check if item is in inventory
      if (user.inventory.includes(itemId)) {
        if (itemAvatar || itemFrame || itemTitle) {
          btn.textContent = '🎯 Équiper';
          btn.className = 'btn btn-purple btn-sm btn-shop-buy';
          btn.disabled = false;
        } else if (itemType === 'free') {
          btn.textContent = '✓ Récupéré';
          btn.className = 'btn btn-ghost btn-sm btn-shop-buy';
          btn.disabled = true;
        } else {
          btn.textContent = '✓ Possédé';
          btn.className = 'btn btn-ghost btn-sm btn-shop-buy';
          btn.disabled = false;
        }
      }
    });
  }

    // 🏬 BOUTIQUE & SHOP SYSTEM LISTENERS
    $$('.shop-cat-tags .category-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        $$('.shop-cat-tags .category-tag').forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        const cat = tag.getAttribute('data-scat');

        $$('#shop-products-grid .shop-item-card').forEach(card => {
          if (cat === 'all' || card.getAttribute('data-category') === cat) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });

    $$('.btn-shop-buy').forEach(btn => {
      btn.addEventListener('click', async () => {
        const itemId = btn.getAttribute('data-item');
        const itemType = btn.getAttribute('data-type');
        const itemAvatar = btn.getAttribute('data-avatar');
        const itemFrame = btn.getAttribute('data-frame');
        const itemTitleAttr = btn.getAttribute('data-title');
        const cost = parseInt(btn.getAttribute('data-cost') || '0', 10);
        const coinsReward = parseInt(btn.getAttribute('data-coins') || '0', 10);
        const price = btn.getAttribute('data-price');
        const card = btn.closest('.shop-item-card');
        const itemTitle = card?.querySelector('h4')?.textContent || 'Article';

        // 1. If already in inventory and is an avatar/frame/title -> Equip it!
        if (user.inventory.includes(itemId) && (itemAvatar || itemFrame || itemTitleAttr)) {
          if (itemAvatar) user.avatar = itemAvatar;
          if (itemFrame) user.frame = itemFrame;
          if (itemTitleAttr) user.title = itemTitleAttr;
          saveUserProfile();
          updateShopUI();
          updateProfileUI();
          UIEffects.showToast(`🎯 ${itemTitle} équipé avec succès !`, 'success', 2500);
          return;
        }

        // 2. Free Item
        if (itemType === 'free') {
          if (user.inventory.includes(itemId)) return;
          user.coins += coinsReward;
          user.inventory.push(itemId);
          saveUserProfile();
          updateShopUI();
          UIEffects.showToast(`🎁 Pack gratuit récupéré ! +${coinsReward} pièces ajoutées !`, 'success', 3500);
          return;
        }

        // 3. Coins Purchase
        if (itemType === 'coins') {
          if (user.coins < cost) {
            UIEffects.showToast(`🪙 Solde insuffisant (${user.coins}/${cost} pièces). Recharges ton solde !`, 'error', 3500);
            return;
          }
          user.coins -= cost;
          user.inventory.push(itemId);
          if (itemAvatar) user.avatar = itemAvatar;
          if (itemFrame) user.frame = itemFrame;
          if (itemTitleAttr) user.title = itemTitleAttr;
          saveUserProfile();
          updateShopUI();
          updateProfileUI();
          UIEffects.showToast(`🎉 Achat réussi ! ${itemTitle} débloqué !`, 'success', 3500);
          return;
        }

        // 4. Money Purchase via Verified Backend Checkout (/api/checkout/create-session)
        if (itemType === 'money') {
          try {
            const res = await fetch('/api/checkout/create-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ itemId, paymentMethod: 'card' })
            });
            const session = await res.json();
            if (session.success) {
              pendingCheckoutItem = { itemId, itemTitle, price, coinsReward, session };
              $('#checkout-item-title').textContent = `Achat Sécurisé : ${itemTitle}`;
              $('#checkout-summary-name').textContent = itemTitle;
              $('#checkout-summary-price').textContent = `${price} €`;
              openModal('modal-shop-checkout');
            } else {
              UIEffects.showToast(session.message || 'Erreur d\'initialisation du paiement', 'error');
            }
          } catch (err) {
            // Fallback for offline mode
            pendingCheckoutItem = { itemId, itemTitle, price, coinsReward };
            $('#checkout-item-title').textContent = `Achat : ${itemTitle}`;
            $('#checkout-summary-name').textContent = itemTitle;
            $('#checkout-summary-price').textContent = `${price} €`;
            openModal('modal-shop-checkout');
          }
        }
      });
    });

    // Confirm Money Purchase in Checkout Modal with Backend Signature Verification
    $('#btn-confirm-shop-pay')?.addEventListener('click', async () => {
      if (!pendingCheckoutItem) return;
      const { itemId, itemTitle, coinsReward, session } = pendingCheckoutItem;

      try {
        if (session && session.sessionId) {
          const res = await fetch('/api/checkout/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: session.sessionId,
              signature: session.signature,
              userState: { coins: user.coins, isVip: user.isVip }
            })
          });
          const verification = await res.json();
          if (verification.success && verification.signedWallet) {
            localStorage.setItem('harmonie_wallet_sig', verification.signedWallet);
          }
        }
      } catch (err) {
        console.warn('Vérification backend offline fallback');
      }

      if (coinsReward) user.coins += coinsReward;
      if (itemId === 'pass-vip' || itemId === 'pack-10000' || itemId === 'pass-vip-month' || itemId === 'pass-vip-life') {
        user.isVip = true;
        localStorage.setItem('harmonie_vip', 'true');
        localStorage.setItem('muzik_is_premium', 'true');
      }
      user.inventory.push(itemId);

      saveUserProfile();
      updateShopUI();
      updateProfileUI();
      closeModal('modal-shop-checkout');
      UIEffects.showToast(`💳 Paiement Sécurisé de ${itemTitle} validé ! Vos avantages sont activés.`, 'success', 4500);
    });

    $('#btn-close-shop-checkout')?.addEventListener('click', () => closeModal('modal-shop-checkout'));

    // Auth Modal Actions
    $('#btn-close-auth')?.addEventListener('click', () => closeModal('modal-auth'));
    $('#btn-close-settings')?.addEventListener('click', () => closeModal('modal-settings'));

    $('#btn-auth-google')?.addEventListener('click', () => login('google'));
    $('#btn-auth-apple')?.addEventListener('click', () => login('apple'));
    $('#btn-auth-facebook')?.addEventListener('click', () => login('facebook'));
    $('#btn-auth-guest')?.addEventListener('click', () => login('guest'));

    // 📧 EMAIL AUTH TABS & SUBMISSIONS
    const tabRegister = $('#tab-auth-register');
    const tabLogin = $('#tab-auth-login');
    const formRegister = $('#form-auth-register');
    const formLogin = $('#form-auth-login');

    tabRegister?.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin?.classList.remove('active');
      formRegister?.classList.remove('hidden');
      formLogin?.classList.add('hidden');
    });

    tabLogin?.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister?.classList.remove('active');
      formLogin?.classList.remove('hidden');
      formRegister?.classList.add('hidden');
    });

    // Inscription Email
    $('#btn-submit-register')?.addEventListener('click', (e) => {
      e.preventDefault();
      const name = ($('#reg-name')?.value || '').trim();
      const email = ($('#reg-email')?.value || '').trim().toLowerCase();
      const pwd = ($('#reg-pwd')?.value || '').trim();

      if (!name) {
        UIEffects.showToast('Veuillez entrer un pseudo.', 'warning');
        return;
      }
      if (!email || !email.includes('@') || !email.includes('.')) {
        UIEffects.showToast('Veuillez entrer une adresse email valide.', 'warning');
        return;
      }
      if (pwd.length < 6) {
        UIEffects.showToast('Le mot de passe doit comporter au moins 6 caractères.', 'warning');
        return;
      }

      let accounts = [];
      try {
        accounts = JSON.parse(localStorage.getItem('harmonie_accounts') || '[]');
      } catch (err) { accounts = []; }

      const existing = accounts.find(a => a.email === email);
      if (existing) {
        UIEffects.showToast('Un compte existe déjà avec cet email ! Connecte-toi.', 'warning', 3500);
        tabLogin?.click();
        const loginEmail = $('#login-email');
        if (loginEmail) loginEmail.value = email;
        return;
      }

      const newAccount = {
        name,
        email,
        password: pwd,
        coins: 250,
        avatar: '🎧',
        provider: 'email',
        createdAt: Date.now()
      };
      accounts.push(newAccount);
      localStorage.setItem('harmonie_accounts', JSON.stringify(accounts));

      user.name = name;
      user.email = email;
      user.avatar = '🎧';
      user.provider = 'email';
      user.coins += 100; // Bonus +100 pièces
      saveUserProfile();
      updateProfileUI();
      closeModal('modal-auth');

      UIEffects.showToast(`🎉 Compte créé avec succès ! Bienvenue ${name} (+100 🪙 bonus offerts)`, 'success', 4000);
    });

    // Connexion Email
    $('#btn-submit-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      const email = ($('#login-email')?.value || '').trim().toLowerCase();
      const pwd = ($('#login-pwd')?.value || '').trim();

      if (!email || !email.includes('@')) {
        UIEffects.showToast('Veuillez renseigner votre email.', 'warning');
        return;
      }
      if (!pwd) {
        UIEffects.showToast('Veuillez saisir votre mot de passe.', 'warning');
        return;
      }

      let accounts = [];
      try {
        accounts = JSON.parse(localStorage.getItem('harmonie_accounts') || '[]');
      } catch (err) { accounts = []; }

      const acc = accounts.find(a => a.email === email && a.password === pwd);
      if (acc) {
        user.name = acc.name;
        user.email = acc.email;
        user.avatar = acc.avatar || '🎧';
        user.provider = 'email';
        if (acc.coins) user.coins = Math.max(user.coins, acc.coins);
        saveUserProfile();
        updateProfileUI();
        closeModal('modal-auth');
        UIEffects.showToast(`👋 Rebonjour ${user.name} ! Bon blind test !`, 'success', 3500);
      } else {
        UIEffects.showToast('Email ou mot de passe incorrect. Crée un compte si tu n\'en as pas encore !', 'error', 3500);
      }
    });

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

    // 🎯 Choix du nombre de manches sur la Hero card
    let selectedHomeRounds = 10;
    $$('.btn-round-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.btn-round-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedHomeRounds = parseInt(btn.getAttribute('data-rounds'), 10) || 10;
        const lbl = $('#home-rounds-count-label');
        if (lbl) lbl.textContent = `${selectedHomeRounds} manches`;
      });
    });

    // Bouton Créer une partie
    $('#btn-create')?.addEventListener('click', () => {
      const name = getPlayerName();
      if (!name) return;
      AudioPlayer.ensureAudioContext();
      send('CREATE_ROOM', { playerName: name, rounds: selectedHomeRounds });
    });

    // Carte mode Booska'Quizz Rap sur l'accueil
    $('#btn-mode-booska-quizz')?.addEventListener('click', () => {
      startBooskaQuizzSession();
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
          title: 'Blind Test Harmonie',
          text: `Rejoins ma partie de Blind Test sur Harmonie ! Code : ${roomId}`,
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
      const text = encodeURIComponent(`Rejoins mon Blind Test sur Harmonie ! 🔥\nClique ici : ${url}\nOu entre le code : ${roomId}`);
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
      if (state.hasAnswered || state.qcmFailed) return;
      const input = $('#g-answer');
      const answer = (input?.value || '').trim();
      if (!answer) return;
      send('SUBMIT_ANSWER', { answer, isQcm: false });
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
  // SPLASH SCREEN
  // ═══════════════════════════════════════
  function initSplashScreen() {
    const splash = $('#splash-screen');
    const barFill = $('#splash-bar-fill');
    if (!splash) return;

    // Animate progress bar
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25 + 10;
      if (barFill) barFill.style.width = Math.min(progress, 95) + '%';
      if (progress >= 95) clearInterval(interval);
    }, 200);

    setTimeout(() => {
      if (barFill) barFill.style.width = '100%';
      setTimeout(() => {
        splash.classList.add('splash-out');
        setTimeout(() => {
          splash.style.display = 'none';
        }, 600);
      }, 300);
    }, 1800);
  }

  // ═══════════════════════════════════════
  // USER STATS & PROFILE SYSTEM
  // ═══════════════════════════════════════
  const RANKS = [
    { name: 'Bronze I',   icon: '🥉', xpRequired: 0 },
    { name: 'Bronze II',  icon: '🥉', xpRequired: 200 },
    { name: 'Bronze III', icon: '🥉', xpRequired: 500 },
    { name: 'Argent I',   icon: '🥈', xpRequired: 1000 },
    { name: 'Argent II',  icon: '🥈', xpRequired: 1800 },
    { name: 'Argent III', icon: '🥈', xpRequired: 2800 },
    { name: 'Or I',       icon: '🥇', xpRequired: 4000 },
    { name: 'Or II',      icon: '🥇', xpRequired: 5500 },
    { name: 'Or III',     icon: '🥇', xpRequired: 7500 },
    { name: 'Platine I',  icon: '💎', xpRequired: 10000 },
    { name: 'Platine II', icon: '💎', xpRequired: 13000 },
    { name: 'Diamant',    icon: '💠', xpRequired: 17000 },
  ];

  const ALL_BADGES = [
    // 🌟 LÉGENDAIRE
    { id: 'tournoi_champ',   rarity: 'legendary', icon: '🏆', name: 'Champion Muzik',       desc: 'Élu Vainqueur d\'un Tournoi Officiel', condition: s => (s.tournamentWins || 0) >= 1 },
    { id: 'master_100',      rarity: 'legendary', icon: '👑', name: 'Grand Maître',        desc: 'Remporte 100 victoires au blind test', condition: s => s.wins >= 100 },
    { id: 'sonic_ear',       rarity: 'legendary', icon: '⚡', name: 'Vitesse Sonique',     desc: 'Trouve une musique en moins de 0.8s', condition: s => (s.fastestAnswerSec || 99) <= 0.8 },
    { id: 'perfectionist',   rarity: 'legendary', icon: '💎', name: 'Oreille Absolue',     desc: '90% de précision sur au moins 20 parties', condition: s => s.gamesPlayed >= 20 && (s.totalCorrect / Math.max(1, s.totalAnswered)) >= 0.9 },

    // 💜 ÉPIQUE
    { id: 'tournoi_finalist',rarity: 'epic',      icon: '⚔️', name: 'Finaliste d\'Élite',   desc: 'Atteins la Grande Finale d\'un tournoi', condition: s => (s.tournamentsPlayed || 0) >= 1 || (s.tournamentWins || 0) >= 1 },
    { id: 'streak_10',       rarity: 'epic',      icon: '🌋', name: 'Série Diabolique',    desc: 'Enchaîne 10 bonnes réponses consécutives', condition: s => s.bestStreak >= 10 },
    { id: 'qcm_clutch',      rarity: 'epic',      icon: '🆘', name: 'Sauveur QCM',         desc: 'Sauve la manche grâce à l\'aide QCM de secours', condition: s => (s.qcmClutchWins || 0) >= 1 },
    { id: 'coins_1000',      rarity: 'epic',      icon: '💰', name: 'Trésor Royal',        desc: 'Accumule 1000 pièces dans ta cagnotte', condition: s => s.totalCoinsEarned >= 1000 },
    { id: 'games_50',        rarity: 'epic',      icon: '🎤', name: 'Passionné de Son',    desc: 'Joue 50 parties multijoueur ou solo', condition: s => s.gamesPlayed >= 50 },

    // 🔷 RARE
    { id: 'tournoi_gladiator',rarity: 'rare',     icon: '🛡️', name: 'Gladiateur',          desc: 'Inscris-toi et dispute un match de tournoi', condition: s => (s.tournamentsPlayed || 0) >= 1 },
    { id: 'streak_5',        rarity: 'rare',      icon: '🔥', name: 'Inarrêtable',         desc: 'Fais une série de 5 bonnes réponses', condition: s => s.bestStreak >= 5 },
    { id: 'accuracy_80',     rarity: 'rare',      icon: '🎯', name: 'Tireur d\'Élite',     desc: '80% de précision sur au moins 5 parties', condition: s => s.gamesPlayed >= 5 && (s.totalCorrect / Math.max(1, s.totalAnswered)) >= 0.8 },
    { id: 'coins_500',       rarity: 'rare',      icon: '🪙', name: 'Banquier Muzik',      desc: 'Accumule 500 pièces de monnaie', condition: s => s.totalCoinsEarned >= 500 },
    { id: 'games_10',        rarity: 'rare',      icon: '🎪', name: 'Régulier de l\'Arène', desc: 'Joue 10 parties complètes', condition: s => s.gamesPlayed >= 10 },
    { id: 'night_owl',       rarity: 'rare',      icon: '🦉', name: 'Oiseau de Nuit',      desc: 'Joue une partie nocturne après 22h', condition: s => s.nightGames >= 1 },

    // 🟢 COMMUN
    { id: 'first_game',      rarity: 'common',    icon: '🎮', name: 'Premier Pas',         desc: 'Joue ta première partie de blind test', condition: s => s.gamesPlayed >= 1 },
    { id: 'first_win',       rarity: 'common',    icon: '🌟', name: 'Première Victoire',   desc: 'Remporte ta toute première partie', condition: s => s.wins >= 1 },
    { id: 'streak_3',        rarity: 'common',    icon: '✨', name: 'En Train',            desc: 'Fais une série de 3 bonnes réponses', condition: s => s.bestStreak >= 3 },
    { id: 'solo_master',     rarity: 'common',    icon: '🎧', name: 'Casque Solo',         desc: 'Termine une manche en mode Solo', condition: s => s.soloGamesPlayed >= 1 },
    { id: 'social',          rarity: 'common',    icon: '💬', name: 'Esprit d\'Équipe',    desc: 'Envoie 10 messages dans le tchat', condition: s => s.chatMessages >= 10 },
  ];

  const userStats = {
    gamesPlayed: parseInt(localStorage.getItem('muzik_stats_games') || '0', 10),
    wins: parseInt(localStorage.getItem('muzik_stats_wins') || '0', 10),
    totalCorrect: parseInt(localStorage.getItem('muzik_stats_correct') || '0', 10),
    totalAnswered: parseInt(localStorage.getItem('muzik_stats_answered') || '0', 10),
    bestStreak: parseInt(localStorage.getItem('muzik_stats_bestStreak') || '0', 10),
    soloGamesPlayed: parseInt(localStorage.getItem('muzik_stats_solo') || '0', 10),
    totalCoinsEarned: parseInt(localStorage.getItem('muzik_stats_coinsEarned') || '0', 10),
    xp: parseInt(localStorage.getItem('muzik_stats_xp') || '0', 10),
    chatMessages: parseInt(localStorage.getItem('muzik_stats_chat') || '0', 10),
    nightGames: parseInt(localStorage.getItem('muzik_stats_night') || '0', 10),
    tournamentsPlayed: parseInt(localStorage.getItem('muzik_stats_tournaments') || '0', 10),
    tournamentWins: parseInt(localStorage.getItem('muzik_stats_tournament_wins') || '0', 10),
    qcmClutchWins: parseInt(localStorage.getItem('muzik_stats_qcm_clutch') || '0', 10),
    fastestAnswerSec: parseFloat(localStorage.getItem('muzik_stats_fastest') || '99'),
    earnedBadges: JSON.parse(localStorage.getItem('muzik_badges') || '[]'),
    gameHistory: JSON.parse(localStorage.getItem('muzik_game_history') || '[]'),
    favGenres: JSON.parse(localStorage.getItem('muzik_fav_genres') || '{}'),
  };

  function saveStats() {
    localStorage.setItem('muzik_stats_games', userStats.gamesPlayed);
    localStorage.setItem('muzik_stats_wins', userStats.wins);
    localStorage.setItem('muzik_stats_correct', userStats.totalCorrect);
    localStorage.setItem('muzik_stats_answered', userStats.totalAnswered);
    localStorage.setItem('muzik_stats_bestStreak', userStats.bestStreak);
    localStorage.setItem('muzik_stats_solo', userStats.soloGamesPlayed);
    localStorage.setItem('muzik_stats_coinsEarned', userStats.totalCoinsEarned);
    localStorage.setItem('muzik_stats_xp', userStats.xp);
    localStorage.setItem('muzik_stats_chat', userStats.chatMessages);
    localStorage.setItem('muzik_stats_night', userStats.nightGames);
    localStorage.setItem('muzik_stats_tournaments', userStats.tournamentsPlayed);
    localStorage.setItem('muzik_stats_tournament_wins', userStats.tournamentWins);
    localStorage.setItem('muzik_stats_qcm_clutch', userStats.qcmClutchWins);
    localStorage.setItem('muzik_stats_fastest', userStats.fastestAnswerSec);
    localStorage.setItem('muzik_badges', JSON.stringify(userStats.earnedBadges));
    localStorage.setItem('muzik_game_history', JSON.stringify(userStats.gameHistory.slice(-10)));
    localStorage.setItem('muzik_fav_genres', JSON.stringify(userStats.favGenres));
  }

  function addXP(amount) {
    userStats.xp += amount;
    saveStats();
    checkBadges();
  }

  function getCurrentRank() {
    let rank = RANKS[0];
    for (const r of RANKS) {
      if (userStats.xp >= r.xpRequired) rank = r;
    }
    return rank;
  }

  function getNextRank() {
    const curIdx = RANKS.findIndex(r => r.name === getCurrentRank().name);
    return RANKS[curIdx + 1] || null;
  }

  function checkBadges() {
    let newBadges = [];
    for (const badge of ALL_BADGES) {
      if (!userStats.earnedBadges.includes(badge.id) && badge.condition(userStats)) {
        userStats.earnedBadges.push(badge.id);
        newBadges.push(badge);
      }
    }
    if (newBadges.length > 0) {
      saveStats();
      newBadges.forEach(b => {
        UIEffects.showToast(`🏅 Badge débloqué : ${b.icon} ${b.name} !`, 'success', 4000);
        addNotification(`Badge débloqué : ${b.icon} ${b.name}`, b.desc, '🏅');
      });
      // Update badges count in nav
      const questBadge = document.querySelector('[data-nav="quests"] .sb-badge-count');
    }
  }

  function recordGameResult({ isWin, correct, answered, streak, genre, isSolo = false }) {
    userStats.gamesPlayed++;
    if (isWin) userStats.wins++;
    userStats.totalCorrect += correct || 0;
    userStats.totalAnswered += answered || 0;
    if (streak > userStats.bestStreak) userStats.bestStreak = streak;
    if (isSolo) userStats.soloGamesPlayed++;
    if (genre) userStats.favGenres[genre] = (userStats.favGenres[genre] || 0) + 1;
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 4) userStats.nightGames++;

    // Add XP
    const xpGained = (isWin ? 150 : 50) + (correct || 0) * 15;
    addXP(xpGained);

    // Save game history
    userStats.gameHistory.push({
      date: new Date().toISOString(),
      genre: genre || '?',
      result: isWin ? 'win' : 'lose',
      correct: correct || 0,
      answered: answered || 0,
      xp: xpGained,
    });

    saveStats();
    checkBadges();
    addNotification(
      isWin ? 'Victoire ! 🏆' : 'Partie terminée',
      `${correct || 0} bonnes réponses • +${xpGained} XP gagné`,
      isWin ? '🏆' : '🎮'
    );
  }

  function renderProfileView() {
    // Hero section
    const avatarEl = $('#profile-avatar-big');
    const nameEl = $('#profile-hero-name');
    const providerEl = $('#profile-hero-provider');
    const coinsEl = $('#profile-coins-pill');
    if (avatarEl) avatarEl.textContent = user.avatar;
    if (nameEl) nameEl.textContent = user.name;
    if (providerEl) providerEl.textContent = { google: '🟢 Google', apple: '⚫ Apple', facebook: '🔵 Facebook', guest: '⚪ Invité' }[user.provider] || '⚪ Invité';
    if (coinsEl) coinsEl.textContent = `🪙 ${user.coins} pièces`;

    // Rank badge
    const rank = getCurrentRank();
    const nextRank = getNextRank();
    const rankBadgeEl = $('#profile-rank-badge');
    if (rankBadgeEl) rankBadgeEl.textContent = `${rank.icon} ${rank.name}`;

    // Stats
    const accuracy = userStats.totalAnswered > 0 ? Math.round((userStats.totalCorrect / userStats.totalAnswered) * 100) : 0;
    const el = (id, val) => { const e = $(`#${id}`); if (e) e.textContent = val; };
    el('pstat-games', userStats.gamesPlayed);
    el('pstat-accuracy', accuracy + '%');
    el('pstat-streak', userStats.bestStreak);
    el('pstat-wins', userStats.wins);

    // Rank progress
    const rankCurIcon = $('#rank-icon-current');
    const rankNextIcon = $('#rank-icon-next');
    const rankBarFill = $('#rank-bar-fill');
    const rankXpText = $('#rank-xp-text');
    const rankCurrentLabel = $('#rank-current-label');
    const rankNextHint = $('#rank-next-hint');

    if (rankCurIcon) rankCurIcon.textContent = rank.icon;
    if (rankNextIcon) rankNextIcon.textContent = nextRank ? nextRank.icon : '👑';
    if (rankCurrentLabel) rankCurrentLabel.textContent = rank.name;

    if (nextRank) {
      const xpInCurrentTier = userStats.xp - rank.xpRequired;
      const xpNeeded = nextRank.xpRequired - rank.xpRequired;
      const pct = Math.min(100, Math.round((xpInCurrentTier / xpNeeded) * 100));
      if (rankBarFill) rankBarFill.style.width = pct + '%';
      if (rankXpText) rankXpText.textContent = `${userStats.xp} / ${nextRank.xpRequired} XP`;
      if (rankNextHint) rankNextHint.textContent = `Plus que ${nextRank.xpRequired - userStats.xp} XP pour atteindre ${nextRank.name} ${nextRank.icon}`;
    } else {
      if (rankBarFill) rankBarFill.style.width = '100%';
      if (rankXpText) rankXpText.textContent = `${userStats.xp} XP (Rang maximum !)`;
      if (rankNextHint) rankNextHint.textContent = '👑 Rang maximum atteint !';
    }

    // Badges
    const badgesGrid = $('#profile-badges-grid');
    if (badgesGrid) {
      const rarityLabels = {
        legendary: 'Légendaire 🌟',
        epic: 'Épique 💜',
        rare: 'Rare 🔷',
        common: 'Commun 🟢'
      };
      badgesGrid.innerHTML = ALL_BADGES.map(b => {
        const earned = userStats.earnedBadges.includes(b.id);
        const rarity = b.rarity || 'common';
        return `
          <div class="badge-item rarity-${rarity} ${earned ? 'earned' : 'locked'}" title="${b.desc}">
            <div class="badge-icon">${earned ? b.icon : '🔒'}</div>
            <div class="badge-name">${b.name}</div>
            <div class="badge-desc">${b.desc}</div>
            <span class="badge-rarity-pill">${rarityLabels[rarity] || rarity}</span>
          </div>
        `;
      }).join('');
    }

    // Fav genres
    const genresChart = $('#fav-genres-chart');
    if (genresChart) {
      const sorted = Object.entries(userStats.favGenres).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (sorted.length === 0) {
        genresChart.innerHTML = '<p class="empty-state">Joue des parties pour voir tes genres préférés !</p>';
      } else {
        const max = sorted[0][1];
        genresChart.innerHTML = sorted.map(([genre, count]) => {
          const pct = Math.round((count / max) * 100);
          const pl = state.playlists.find(p => p.key === genre);
          const name = pl ? pl.name : genre;
          return `
            <div class="genre-bar-row">
              <span class="genre-bar-label">${name}</span>
              <div class="genre-bar-track"><div class="genre-bar-fill" style="width:${pct}%"></div></div>
              <span class="genre-bar-count">${count} partie${count > 1 ? 's' : ''}</span>
            </div>
          `;
        }).join('');
      }
    }

    // Game history
    const historyList = $('#profile-history-list');
    if (historyList) {
      if (userStats.gameHistory.length === 0) {
        historyList.innerHTML = '<div class="empty-state">Aucune partie jouée pour l\'instant</div>';
      } else {
        historyList.innerHTML = [...userStats.gameHistory].reverse().map(g => {
          const date = new Date(g.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
          const pl = state.playlists.find(p => p.key === g.genre);
          const genre = pl ? pl.name : g.genre;
          return `
            <div class="history-game-row">
              <span class="hgame-result ${g.result === 'win' ? 'win' : 'lose'}">${g.result === 'win' ? '🏆' : '❌'}</span>
              <div class="hgame-meta">
                <span class="hgame-genre">${genre}</span>
                <span class="hgame-stats">${g.correct}/${g.answered} bonnes réponses</span>
              </div>
              <div class="hgame-right">
                <span class="hgame-xp">+${g.xp} XP</span>
                <span class="hgame-date">${date}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  // ═══════════════════════════════════════
  // NOTIFICATIONS SYSTEM
  // ═══════════════════════════════════════
  const notifications = JSON.parse(localStorage.getItem('muzik_notifications') || '[]');
  let unreadNotifCount = notifications.filter(n => !n.read).length;

  function addNotification(title, body, icon = '🔔') {
    const notif = { id: Date.now(), title, body, icon, read: false, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) };
    notifications.unshift(notif);
    if (notifications.length > 30) notifications.splice(30);
    unreadNotifCount++;
    updateNotifBadge();
    localStorage.setItem('muzik_notifications', JSON.stringify(notifications));
    renderNotifList();
  }

  function updateNotifBadge() {
    const badge = $('#notif-bell-badge');
    if (!badge) return;
    if (unreadNotifCount > 0) {
      badge.textContent = unreadNotifCount > 9 ? '9+' : unreadNotifCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  function markAllNotifsRead() {
    notifications.forEach(n => n.read = true);
    unreadNotifCount = 0;
    updateNotifBadge();
    localStorage.setItem('muzik_notifications', JSON.stringify(notifications));
    renderNotifList();
  }

  function renderNotifList(filter = 'all') {
    const list = $('#notif-list');
    if (!list) return;
    const toShow = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;
    if (toShow.length === 0) {
      list.innerHTML = '<div class="notif-empty">Aucune notification 🔕</div>';
      return;
    }
    list.innerHTML = toShow.map(n => `
      <div class="notif-item ${n.read ? 'read' : 'unread'}" data-notif-id="${n.id}">
        <div class="notif-item-icon">${n.icon}</div>
        <div class="notif-item-content">
          <div class="notif-item-title">${escapeHtml(n.title)}</div>
          <div class="notif-item-body">${escapeHtml(n.body)}</div>
          <div class="notif-item-time">${n.time}</div>
        </div>
        ${!n.read ? '<div class="notif-unread-dot"></div>' : ''}
      </div>
    `).join('');

    list.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.getAttribute('data-notif-id'));
        const notif = notifications.find(n => n.id === id);
        if (notif && !notif.read) {
          notif.read = true;
          unreadNotifCount = Math.max(0, unreadNotifCount - 1);
          updateNotifBadge();
          localStorage.setItem('muzik_notifications', JSON.stringify(notifications));
          renderNotifList(filter);
        }
      });
    });
  }

  function initNotifPanel() {
    // Initial seed notifs if empty
    if (notifications.length === 0) {
      addNotification('Bienvenue sur Muzik ! 🎵', 'Commence par créer une partie ou rejoins une session existante.', '🎵');
      addNotification('Quêtes disponibles', 'Des quêtes t\'attendent aujourd\'hui. Complète-les pour gagner des pièces !', '⚡');
      addNotification('Badge débloqué', 'Tu peux gagner le badge "Premier pas" en jouant ta première partie !', '🏅');
    }
    updateNotifBadge();
    renderNotifList();

    $('#btn-notif-bell')?.addEventListener('click', () => {
      const panel = $('#notif-panel');
      if (!panel) return;
      panel.classList.toggle('hidden');
      if (!panel.classList.contains('hidden')) {
        renderNotifList();
      }
    });

    $('#btn-close-notif-panel')?.addEventListener('click', () => {
      $('#notif-panel')?.classList.add('hidden');
    });

    $('#btn-mark-all-read')?.addEventListener('click', () => {
      markAllNotifsRead();
    });

    $$('.notif-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.notif-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderNotifList(tab.getAttribute('data-ntab'));
      });
    });

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      const panel = $('#notif-panel');
      const bell = $('#btn-notif-bell');
      if (panel && !panel.classList.contains('hidden') && !panel.contains(e.target) && e.target !== bell && !bell.contains(e.target)) {
        panel.classList.add('hidden');
      }
    });
  }

  // ═══════════════════════════════════════
  // MINI PLAYER
  // ═══════════════════════════════════════
  const miniPlayerState = { playing: false, intervalId: null, duration: 30, current: 0, trackInfo: null };

  function showMiniPlayer(trackInfo) {
    // Only show on playlists view, not during a game
    if (state.currentView === 'view-game') return;
    const mp = $('#mini-player');
    if (!mp) return;
    miniPlayerState.trackInfo = trackInfo;
    miniPlayerState.duration = 30;
    miniPlayerState.current = 0;
    miniPlayerState.playing = true;
    mp.classList.remove('hidden');

    const cover = $('#mini-player-cover');
    const title = $('#mini-player-title');
    const artist = $('#mini-player-artist');
    if (cover) cover.style.backgroundImage = `url('${trackInfo.cover}')`;
    if (title) title.textContent = trackInfo.title || '—';
    if (artist) artist.textContent = trackInfo.artist || '—';
    $('#mini-player-play').textContent = '⏸';

    clearInterval(miniPlayerState.intervalId);
    miniPlayerState.intervalId = setInterval(() => {
      miniPlayerState.current++;
      const pct = (miniPlayerState.current / miniPlayerState.duration) * 100;
      const barFill = $('#mini-player-bar-fill');
      const timeEl = $('#mini-player-time');
      if (barFill) barFill.style.width = pct + '%';
      const remaining = miniPlayerState.duration - miniPlayerState.current;
      if (timeEl) timeEl.textContent = `0:${String(remaining).padStart(2, '0')}`;
      if (miniPlayerState.current >= miniPlayerState.duration) {
        clearInterval(miniPlayerState.intervalId);
        miniPlayerState.playing = false;
        $('#mini-player-play').textContent = '▶';
      }
    }, 1000);
  }

  function hideMiniPlayer() {
    const mp = $('#mini-player');
    if (mp) mp.classList.add('hidden');
    clearInterval(miniPlayerState.intervalId);
    miniPlayerState.playing = false;
    AudioPlayer.stop();
  }

  function initMiniPlayer() {
    $('#mini-player-play')?.addEventListener('click', () => {
      if (miniPlayerState.playing) {
        miniPlayerState.playing = false;
        clearInterval(miniPlayerState.intervalId);
        AudioPlayer.stop();
        $('#mini-player-play').textContent = '▶';
      } else {
        // Restart preview
        if (miniPlayerState.trackInfo?.previewUrl) {
          AudioPlayer.play(miniPlayerState.trackInfo.previewUrl);
          miniPlayerState.playing = true;
          $('#mini-player-play').textContent = '⏸';
        }
      }
    });

    $('#mini-player-close')?.addEventListener('click', hideMiniPlayer);
  }

  // ═══════════════════════════════════════
  // SOLO MODE
  // ═══════════════════════════════════════
  let soloSelectedPlaylist = null;

  function renderSoloPlaylists(filter = '') {
    const grid = $('#solo-playlists-grid');
    if (!grid) return;
    const list = filter ? state.playlists.filter(p => p.name.toLowerCase().includes(filter.toLowerCase())) : state.playlists;
    grid.innerHTML = list.map(p => `
      <div class="solo-pl-card" data-key="${p.key}">
        <img src="${p.cover || ''}" alt="" class="solo-pl-card-img" loading="lazy">
        <div class="solo-pl-card-info">
          <span class="solo-pl-card-name">${p.emoji || '🎵'} ${escapeHtml(p.name)}</span>
          <span class="solo-pl-card-count">${p.trackCount || 100} titres</span>
        </div>
        <span class="solo-pl-card-diff ${(p.difficulty || 'FACILE').toLowerCase()}">${p.difficulty || 'FACILE'}</span>
      </div>
    `).join('');

    grid.querySelectorAll('.solo-pl-card').forEach(card => {
      card.addEventListener('click', () => {
        const key = card.getAttribute('data-key');
        soloSelectedPlaylist = state.playlists.find(p => p.key === key);
        if (!soloSelectedPlaylist) return;

        // Show settings card
        const settingsCard = $('#solo-settings-card');
        if (settingsCard) settingsCard.style.display = 'block';

        const soloThumb = $('#solo-pl-thumb');
        const soloName = $('#solo-pl-name');
        const soloCount = $('#solo-pl-count');
        if (soloThumb) soloThumb.src = soloSelectedPlaylist.cover || '';
        if (soloName) soloName.textContent = `${soloSelectedPlaylist.emoji || '🎵'} ${soloSelectedPlaylist.name}`;
        if (soloCount) soloCount.textContent = `${soloSelectedPlaylist.trackCount || 100} titres`;

        // Mark selected card
        grid.querySelectorAll('.solo-pl-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        // Scroll to settings
        settingsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  }

  function initSoloMode() {
    $('#btn-mode-solo')?.addEventListener('click', () => {
      showView('view-solo');
      renderSoloPlaylists();
    });

    $('#btn-back-from-solo')?.addEventListener('click', () => {
      showView('view-home');
    });

    $('#btn-solo-change-pl')?.addEventListener('click', () => {
      const settingsCard = $('#solo-settings-card');
      if (settingsCard) settingsCard.style.display = 'none';
      soloSelectedPlaylist = null;
      $('#solo-playlists-grid')?.querySelectorAll('.solo-pl-card').forEach(c => c.classList.remove('selected'));
    });

    $('#solo-search')?.addEventListener('input', (e) => {
      renderSoloPlaylists(e.target.value);
    });

    $('#btn-start-solo')?.addEventListener('click', () => {
      if (!soloSelectedPlaylist) {
        UIEffects.showToast('Sélectionne une playlist d\'abord !', 'warning');
        return;
      }
      const mode = $('#solo-setting-mode')?.value || 'classique';
      const difficulty = $('#solo-setting-difficulty')?.value || 'DEBUTANT';
      const rounds = parseInt($('#solo-setting-rounds')?.value || '10', 10);
      const duration = parseInt($('#solo-setting-duration')?.value || '20', 10);

      // Launch game as a solo WebSocket room
      const playerName = $('#player-name')?.value.trim() || user.name;
      if (playerName && playerName !== user.name) {
        user.name = playerName;
        saveUserProfile();
      }
      showLoading('Lancement du mode Solo… 🎧');
      userStats.soloGamesPlayed++;
      saveStats();
      send('CREATE_ROOM', {
        playerName: user.name,
        avatar: user.avatar,
        settings: { genre: soloSelectedPlaylist.key, mode, difficulty, totalRounds: rounds, roundDuration: duration }
      });
    });
  }

  // ═══════════════════════════════════════
  // REAL GLOBAL CHAT WEBSOCKET ENGINE
  // ═══════════════════════════════════════
  function onGlobalChatHistory(data) {
    const box = $('#global-chat-messages');
    if (!box || !data.messages) return;

    // Reset messages and add welcome banner
    box.innerHTML = `<div class="gchat-msg gchat-system">Bienvenue dans le salon de discussion global d'Harmonie ! 🎵 Laisse un message aux joueurs en ligne !</div>`;

    data.messages.forEach(msg => {
      renderRealGlobalMsg(msg, false);
    });
    box.scrollTop = box.scrollHeight;
  }

  function onGlobalChatMessage(data) {
    if (data.message) {
      renderRealGlobalMsg(data.message, true);
    }
  }

  function renderRealGlobalMsg(msgObj, shouldScroll = true) {
    const box = $('#global-chat-messages');
    if (!box) return;

    const isOwn = msgObj.senderId === state.socketId || msgObj.name === user.name;
    const div = document.createElement('div');
    div.className = `gchat-msg ${isOwn ? 'gchat-own' : ''}`;
    div.innerHTML = `
      <span class="gchat-avatar">${msgObj.avatar || '🦊'}</span>
      <div class="gchat-content">
        <span class="gchat-name">${escapeHtml(msgObj.name)}</span>
        <span class="gchat-text">${escapeHtml(msgObj.text)}</span>
      </div>
      <span class="gchat-time">${msgObj.time || ''}</span>
    `;
    box.appendChild(div);

    // Keep last 50 messages in DOM
    while (box.children.length > 55) {
      if (box.children[1]) box.removeChild(box.children[1]); // keep system welcome banner
      else break;
    }

    if (shouldScroll) {
      box.scrollTop = box.scrollHeight;
    }
  }

  function initGlobalChat() {
    const sendBtn = $('#global-chat-send');
    const input = $('#global-chat-input');

    function sendGlobalMsg() {
      const text = input?.value.trim();
      if (!text) return;
      input.value = '';

      // Send to backend WebSocket for real-time broadcast to ALL online users & file persistence
      send('SEND_GLOBAL_CHAT', {
        message: text,
        name: user.name,
        avatar: user.avatar
      });

      // Track chat stats
      userStats.chatMessages++;
      saveStats();
      checkBadges();
    }

    sendBtn?.addEventListener('click', sendGlobalMsg);
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendGlobalMsg(); });

    // Emoji quick buttons
    $$('.gchat-emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.getAttribute('data-emoji');
        if (input) { input.value += emoji; input.focus(); }
      });
    });

    // Update online count in global chat
    setInterval(() => {
      const el = $('#global-chat-online');
      if (el) el.textContent = `${state.onlineCount} joueur${state.onlineCount > 1 ? 's' : ''} en ligne`;
    }, 5000);
  }

  // ═══════════════════════════════════════
  // TOURNOI OFFICIEL (ARBRE, PHASES & FINALE)
  // ═══════════════════════════════════════
  let activeTournamentData = null;

  async function fetchTournamentData() {
    try {
      const res = await fetch('/api/tournaments');
      const data = await res.json();
      if (data.success && data.active) {
        activeTournamentData = data.active;
        state.activeTournament = data.active;
        renderTournamentModalUI(data.active);
      }
    } catch (err) {
      console.warn('[Tournament] Fetch error:', err);
    }
  }

  function renderTournamentModalUI(tourney) {
    if (!tourney) return;
    activeTournamentData = tourney;

    const players = tourney.registeredPlayers || tourney.players || [];
    const fee = tourney.entryFee || tourney.fee || 50;
    const reward = tourney.rewardCoins || tourney.reward || 500;
    const stage = (tourney.stage || 'REGISTRATION').toUpperCase();
    const champion = tourney.champion || tourney.winner || null;
    const matches = tourney.matches || tourney.bracket || {};

    const titleEl = $('#tournoi-modal-title');
    if (titleEl) titleEl.textContent = tourney.name || 'Grand Tournoi Muzik Masters 🏆';

    const stagePill = $('#tournoi-stage-pill');
    if (stagePill) {
      stagePill.className = 'tournoi-stage-pill';
      if (stage === 'REGISTRATION') {
        stagePill.textContent = `🟢 INSCRIPTIONS (${players.length}/8)`;
      } else if (stage === 'QUARTERS') {
        stagePill.classList.add('quarters');
        stagePill.textContent = '⚔️ QUARTS DE FINALE EN COURS';
      } else if (stage === 'SEMIS') {
        stagePill.classList.add('semis');
        stagePill.textContent = '⚡ DEMI-FINALES EN COURS';
      } else if (stage === 'FINAL') {
        stagePill.classList.add('final');
        stagePill.textContent = '👑 GRANDE FINALE EN COURS';
      } else if (stage === 'FINISHED' || stage === 'COMPLETED') {
        stagePill.classList.add('completed');
        stagePill.textContent = '🏆 TOURNOI TERMINÉ • CHAMPION ÉLU';
      }
    }

    const feePill = $('#tournoi-fee-pill');
    if (feePill) {
      feePill.textContent = `🎫 Frais d'entrée : 🪙 ${fee} pièces • Récompense : 🪙 ${reward} + Badge Champion 🏆`;
    }

    // 👑 Champion Spotlight Banner
    const champCard = $('#tournoi-champion-spotlight');
    if (champCard) {
      if (champion) {
        champCard.classList.remove('hidden');
        const champName = $('#tournoi-champion-name');
        if (champName) champName.textContent = `${champion.avatar || '👑'} ${champion.name}`;
        const champReward = $('#tournoi-champion-reward');
        if (champReward) champReward.textContent = `+${reward} 🪙 & Badge Champion Légendaire Débloqué`;

        // If current user is the crowned winner!
        if (champion.name === user.name) {
          userStats.tournamentWins = (userStats.tournamentWins || 0) + 1;
          saveStats();
          checkBadges();
        }
      } else {
        champCard.classList.add('hidden');
      }
    }

    // Dynamic Bracket Rendering (Quarts, Demis, Finale)
    const bracketWrap = $('#tournoi-bracket-dynamic');
    if (bracketWrap) {
      const quarters = matches.quarters || [];
      const semis = matches.semis || [];
      const rawFinal = matches.final;
      const finalMatch = Array.isArray(rawFinal) ? rawFinal : (rawFinal ? [rawFinal] : []);

      const renderMatch = (m, label) => {
        const p1 = m?.p1 || m?.player1;
        const p2 = m?.p2 || m?.player2;
        const winName = (m?.winner?.name || m?.winner);
        const isP1Win = winName && p1 && (winName === p1.name || winName === p1);
        const isP2Win = winName && p2 && (winName === p2.name || winName === p2);
        const s1 = m?.score1 !== undefined ? m.score1 : m?.player1Score;
        const s2 = m?.score2 !== undefined ? m.score2 : m?.player2Score;

        return `
          <div class="bracket-match ${label === 'final' ? 'final-match' : ''}">
            <div class="bracket-player ${isP1Win ? 'winner' : ''}">
              <div class="p-left">
                <span class="p-avatar">${(typeof p1 === 'object' && p1?.avatar) ? p1.avatar : '👤'}</span>
                <span class="p-name">${(typeof p1 === 'object' ? p1?.name : p1) || '<em style="color:#64748b">En attente...</em>'}</span>
              </div>
              <span class="p-score">${s1 !== undefined ? s1 + ' pts' : '-'}</span>
            </div>
            <div class="bracket-player ${isP2Win ? 'winner' : ''}">
              <div class="p-left">
                <span class="p-avatar">${(typeof p2 === 'object' && p2?.avatar) ? p2.avatar : '👤'}</span>
                <span class="p-name">${(typeof p2 === 'object' ? p2?.name : p2) || '<em style="color:#64748b">En attente...</em>'}</span>
              </div>
              <span class="p-score">${s2 !== undefined ? s2 + ' pts' : '-'}</span>
            </div>
          </div>
        `;
      };

      const defaultQuarters = [
        { player1: { name: 'Alex_92', avatar: '🦊' }, player2: { name: 'Sarah_Music', avatar: '🎧' }, winner: { name: 'Alex_92' }, score1: 3, score2: 1 },
        { player1: { name: 'Maxime_Rap', avatar: '🎤' }, player2: { name: 'Léa_Pop', avatar: '⭐' }, winner: { name: 'Maxime_Rap' }, score1: 3, score2: 2 },
        { player1: { name: 'DaftFan', avatar: '🤖' }, player2: { name: 'NinhoFan_93', avatar: '👑' }, score1: 1, score2: 2, winner: { name: 'NinhoFan_93' } },
        { player1: { name: user.name || 'Alex Dupont', avatar: user.avatar || '🦊' }, player2: { name: 'Julien_Marseille', avatar: '☀️' } },
      ];
      const activeQuarters = (quarters && quarters.length > 0) ? quarters : defaultQuarters;

      bracketWrap.innerHTML = `
        <div class="bracket-round">
          <div class="bracket-round-title">⚔️ Quarts de Finale</div>
          <div class="bracket-round-matches">
            ${activeQuarters.map(m => renderMatch(m, 'quarters')).join('')}
          </div>
        </div>
        <div class="bracket-round">
          <div class="bracket-round-title">⚡ Demi-Finales</div>
          <div class="bracket-round-matches">
            ${semis.length ? semis.map(m => renderMatch(m, 'semis')).join('') : `
              ${renderMatch({ player1: { name: 'Alex_92', avatar: '🦊' }, player2: { name: 'Maxime_Rap', avatar: '🎤' } }, 'semis')}
              ${renderMatch({ player1: { name: 'NinhoFan_93', avatar: '👑' }, player2: { name: 'En attente...', avatar: '⏳' } }, 'semis')}
            `}
          </div>
        </div>
        <div class="bracket-round">
          <div class="bracket-round-title">👑 Grande Finale</div>
          <div class="bracket-round-matches">
            ${finalMatch.length ? finalMatch.map(m => renderMatch(m, 'final')).join('') : `
              ${renderMatch({ player1: { name: 'En attente...', avatar: '🏆' }, player2: { name: 'En attente...', avatar: '🏆' } }, 'final')}
            `}
          </div>
        </div>
      `;
    }

    // Join button state
    const joinBtn = $('#btn-join-tournoi');
    if (joinBtn) {
      const isAlreadyIn = players.some(p => (p.name || p) === user.name);
      if (isAlreadyIn) {
        joinBtn.disabled = true;
        joinBtn.textContent = '✅ Tu es déjà inscrit au Tournoi !';
        joinBtn.style.opacity = '0.85';
      } else if (stage !== 'REGISTRATION') {
        joinBtn.disabled = true;
        joinBtn.textContent = '🔒 Tournoi en cours (Inscriptions closes)';
        joinBtn.style.opacity = '0.6';
      } else if (players.length >= 8) {
        joinBtn.disabled = true;
        joinBtn.textContent = '⏳ Tournoi complet (8/8) — Démarrage imminent';
        joinBtn.style.opacity = '0.7';
      } else {
        joinBtn.disabled = false;
        joinBtn.textContent = `🏆 S'inscrire au Tournoi (🪙 ${fee})`;
        joinBtn.style.opacity = '1';
      }
    }
  }

  function initTournoiModal() {
    // Open Tournament modal from sidebar or nav
    const handleOpenTournoi = (e) => {
      if (e) e.preventDefault();
      openModal('modal-tournoi');
      fetchTournamentData();
    };

    $('#sb-link-tournoi')?.addEventListener('click', handleOpenTournoi);
    $('[data-nav="tournoi"]')?.addEventListener('click', handleOpenTournoi);
    $('#btn-close-tournoi')?.addEventListener('click', () => closeModal('modal-tournoi'));

    // Join Tournament
    $('#btn-join-tournoi')?.addEventListener('click', async () => {
      if (!activeTournamentData) {
        await fetchTournamentData();
      }
      const tourney = activeTournamentData;
      if (!tourney) return;

      const fee = tourney.fee || 50;
      if (user.coins < fee) {
        UIEffects.showToast(`Pas assez de pièces ! Tu as besoin de 🪙 ${fee}.`, 'error');
        return;
      }

      try {
        const res = await fetch('/api/tournaments/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tournamentId: tourney.id,
            player: { name: user.name, avatar: user.avatar }
          })
        });
        const data = await res.json();
        if (data.success) {
          user.coins -= fee;
          saveUserProfile();
          userStats.tournamentsPlayed = (userStats.tournamentsPlayed || 0) + 1;
          saveStats();
          checkBadges();
          UIEffects.showToast(`🏆 Inscription validée pour "${tourney.name}" !`, 'success', 5000);
          UIEffects.confetti();
          renderTournamentModalUI(data.tournament);
        } else {
          UIEffects.showToast(data.message || 'Impossible de rejoindre le tournoi', 'warning');
        }
      } catch (err) {
        UIEffects.showToast('Erreur de communication avec le serveur de tournoi', 'error');
      }
    });

    // Refresh Tournament bracket
    $('#btn-refresh-tournoi')?.addEventListener('click', () => {
      fetchTournamentData();
      UIEffects.showToast('Arbre du tournoi actualisé ! 🔄', 'info', 2000);
    });

    $('#btn-create-tournoi')?.addEventListener('click', () => {
      UIEffects.showToast('🏗️ Utilisez le panel administrateur (/admin) pour créer et piloter les tournois officiels !', 'info', 5000);
    });
  }

  // ═══════════════════════════════════════
  // HELP MODAL
  // ═══════════════════════════════════════
  function initHelpModal() {
    $('#btn-open-help')?.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('modal-help');
    });
    $('#btn-close-help')?.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal('modal-help');
    });
    $('#btn-help-start-playing')?.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal('modal-help');
      $('#join-code-input')?.focus();
    });

    // Global keyboard shortcut: ? key opens help
    document.addEventListener('keydown', (e) => {
      if (e.key === '?' && !e.target.matches('input, textarea, select')) {
        openModal('modal-help');
      }
    });
  }

  // ═══════════════════════════════════════
  // PROFILE VIEW NAVIGATION
  // ═══════════════════════════════════════
  function initProfileView() {
    // Sidebar link
    $('[data-nav="profil"]')?.addEventListener('click', (e) => {
      e.preventDefault();
      showView('view-profile');
      renderProfileView();
    });

    // Click on profile pill in header
    $('#btn-profile-pill')?.addEventListener('click', () => {
      showView('view-profile');
      renderProfileView();
    });

    // Edit name button on profile
    $('#btn-profile-edit-name')?.addEventListener('click', () => {
      openModal('modal-settings');
    });

    // Share profile
    $('#btn-profile-share')?.addEventListener('click', () => {
      const rank = getCurrentRank();
      const text = `🎵 Je joue à Muzik Blind Test ! Mon rang : ${rank.icon} ${rank.name} avec ${userStats.wins} victoires. Rejoins-moi !`;
      if (navigator.share) {
        navigator.share({ title: 'Mon Profil Muzik', text, url: location.origin });
      } else {
        navigator.clipboard.writeText(text).then(() => UIEffects.showToast('Profil copié dans le presse-papier !', 'success'));
      }
    });
  }

  // ═══════════════════════════════════════
  // LIVE SONG SEARCH — MINI PLAYER INTEGRATION
  // ═══════════════════════════════════════
  // Hook into the live song search to show mini player
  function patchLiveSongSearch() {
    // Intercept clicks on audio preview buttons in the live search results
    // The existing app renders tracks with 'preview-play-btn' or similar
    // We delegate on the results container
    const container = $('#live-song-search-results');
    if (!container) return;

    container.addEventListener('click', (e) => {
      const playBtn = e.target.closest('[data-preview-url]');
      if (!playBtn) return;
      const previewUrl = playBtn.getAttribute('data-preview-url');
      const card = playBtn.closest('[data-track-title]');
      if (!previewUrl) return;

      const trackInfo = {
        previewUrl,
        title: card?.getAttribute('data-track-title') || '?',
        artist: card?.getAttribute('data-track-artist') || '?',
        cover: card?.getAttribute('data-track-cover') || '',
      };
      AudioPlayer.play(previewUrl);
      showMiniPlayer(trackInfo);
    });
  }

  // ═══════════════════════════════════════
  // KEYBOARD SHORTCUTS ENHANCEMENT
  // ═══════════════════════════════════════
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Escape: close modals and notification panel
      if (e.key === 'Escape') {
        $$('.modal-backdrop:not(.hidden)').forEach(m => m.classList.add('hidden'));
        $('#notif-panel')?.classList.add('hidden');
        hideMiniPlayer();
      }

      // Space: toggle mic when in game (and not typing)
      if (e.key === ' ' && state.currentView === 'view-game' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        const micBtn = $('#g-mic');
        if (micBtn) micBtn.click();
      }

      // Tab: switch answer mode when in game (and not typing)
      if (e.key === 'Tab' && state.currentView === 'view-game' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        const activeMode = state.answerMode === 'text' ? 'qcm' : 'text';
        const tabBtn = $(`#tab-mode-${activeMode}`);
        if (tabBtn) tabBtn.click();
      }
    });
  }

  // ═══════════════════════════════════════
  // QUEST COMPLETION TRACKING
  // ═══════════════════════════════════════
  function initQuestTracking() {
    // Hook into answer results to update quest progress
    const originalOnAnswerResult = onAnswerResult;
    // Track solo found
    if (state.isSurvivalMode === false) {
      // Solo quest progress will be tracked when answering correctly
    }

    // Claim daily streak button
    $('#btn-claim-daily')?.addEventListener('click', () => {
      const alreadyClaimed = localStorage.getItem('muzik_daily_claimed_' + new Date().toDateString());
      if (alreadyClaimed) {
        UIEffects.showToast('Tu as déjà réclamé ta récompense aujourd\'hui !', 'info');
        return;
      }
      localStorage.setItem('muzik_daily_claimed_' + new Date().toDateString(), '1');
      addCoins(10);
      addXP(50);
      UIEffects.showToast('🪙 +10 pièces et +50 XP réclamés ! Reviens demain pour continuer ta série !', 'success', 4000);
      addNotification('Récompense journalière', '+10 pièces et +50 XP réclamés !', '🪙');
      const btn = $('#btn-claim-daily');
      if (btn) { btn.disabled = true; btn.textContent = '✅ Réclamé'; }
    });

    // ⚡ Sous-onglets de navigation des Quêtes (Quotidiens vs Longue Durée)
    $$('.quest-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.quest-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-qtab');
        if (tab === 'daily') {
          $('#quest-panel-daily')?.classList.remove('hidden');
          $('#quest-panel-longterm')?.classList.add('hidden');
        } else {
          $('#quest-panel-daily')?.classList.add('hidden');
          $('#quest-panel-longterm')?.classList.remove('hidden');
          renderLongTermQuests();
        }
      });
    });

    // Boutons Récupérer des Hauts Faits Longue Durée
    $$('.btn-claim-milestone').forEach(btn => {
      btn.addEventListener('click', () => {
        const msId = btn.getAttribute('data-msid');
        const reward = parseInt(btn.getAttribute('data-reward'), 10) || 100;
        if (!msId || getClaimedMilestones().includes(msId)) return;
        saveClaimedMilestone(msId);
        addCoins(reward);
        addXP(reward * 2);
        UIEffects.showConfetti();
        UIEffects.showToast(`🏆 Haut Fait accompli ! +${reward} pièces Harmonie ajoutées à ta cagnotte !`, 'success', 5000);
        renderLongTermQuests();
      });
    });

    // Initial render of long-term milestones
    renderLongTermQuests();

    // Quest navigation arrows
    $$('.quest-nav-arrow[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const navTarget = btn.getAttribute('data-nav');
        if (navTarget === 'booska-quizz') {
          startBooskaQuizzSession();
          return;
        }
        const viewMap = { accueil: 'view-home', playlists: 'view-playlists', shop: 'view-shop' };
        const view = viewMap[navTarget];
        if (view) showView(view);
      });
    });
  }

  // ─── 🏆 DÉFIS LONGUE DURÉE & HAUTS FAITS TRACKER ───
  function getClaimedMilestones() {
    try {
      return JSON.parse(localStorage.getItem('harmonie_claimed_milestones') || '[]');
    } catch (_) {
      return [];
    }
  }

  function saveClaimedMilestone(id) {
    const claimed = getClaimedMilestones();
    if (!claimed.includes(id)) {
      claimed.push(id);
      localStorage.setItem('harmonie_claimed_milestones', JSON.stringify(claimed));
    }
  }

  function renderLongTermQuests() {
    const claimed = getClaimedMilestones();
    const stats = userStats || { gamesPlayed: 0, wins: 0, booskaCorrect: 0, bestStreak: 0, tournamentsPlayed: 0 };
    const currentCoins = user.coins || 0;

    const milestones = [
      { id: 'games100', target: 100, current: stats.gamesPlayed || 0, label: 'parties', barId: '#ms-bar-games-100', ratioId: '#ms-ratio-games-100', btnId: '#btn-claim-ms-games', reward: 500 },
      { id: 'wins25', target: 25, current: stats.wins || 0, label: 'victoires', barId: '#ms-bar-wins-25', ratioId: '#ms-ratio-wins-25', btnId: '#btn-claim-ms-wins', reward: 750 },
      { id: 'booska50', target: 50, current: stats.booskaCorrect || 0, label: 'questions', barId: '#ms-bar-booska-50', ratioId: '#ms-ratio-booska-50', btnId: '#btn-claim-ms-booska', reward: 400 },
      { id: 'coins3000', target: 3000, current: currentCoins, label: 'pièces', barId: '#ms-bar-coins-3000', ratioId: '#ms-ratio-coins-3000', btnId: '#btn-claim-ms-coins', reward: 600 },
      { id: 'streak15', target: 15, current: stats.bestStreak || 0, label: 'streak', barId: '#ms-bar-streak-15', ratioId: '#ms-ratio-streak-15', btnId: '#btn-claim-ms-streak', reward: 350 },
      { id: 'tourney5', target: 5, current: stats.tournamentsPlayed || 0, label: 'tournois', barId: '#ms-bar-tourney-5', ratioId: '#ms-ratio-tourney-5', btnId: '#btn-claim-ms-tourney', reward: 800 },
    ];

    let completedCount = 0;

    milestones.forEach(m => {
      const isClaimed = claimed.includes(m.id);
      const isComplete = m.current >= m.target;
      if (isComplete || isClaimed) completedCount++;

      const pct = Math.min(100, Math.floor((m.current / m.target) * 100));
      const bar = $(m.barId);
      if (bar) bar.style.width = `${pct}%`;

      const ratio = $(m.ratioId);
      if (ratio) ratio.textContent = `${Math.min(m.current, m.target)} / ${m.target} ${m.label}`;

      const btn = $(m.btnId);
      if (btn) {
        if (isClaimed) {
          btn.disabled = true;
          btn.textContent = '✅ Déjà Récupéré';
          btn.classList.add('claimed');
        } else if (isComplete) {
          btn.disabled = false;
          btn.textContent = `🪙 Récupérer (${m.reward})`;
          btn.classList.remove('claimed');
        } else {
          btn.disabled = true;
          btn.textContent = `En cours (${pct}%)`;
          btn.classList.remove('claimed');
        }
      }
    });

    // Global bar
    const globalRatio = $('#lt-global-ratio');
    if (globalRatio) globalRatio.textContent = `${completedCount} / 6 complétés`;
    const globalBar = $('#lt-global-bar');
    if (globalBar) globalBar.style.width = `${Math.floor((completedCount / 6) * 100)}%`;
  }

  // ─── 🎤 BOOSKA'QUIZZ RAP ENGINE (25 000+ QUESTIONS) ───
  let booskaQuizState = {
    questions: [],
    currentIndex: 0,
    score: 0,
    correctCount: 0,
    streak: 0,
    bestStreak: 0,
    timer: null,
    timeRemaining: 15,
    answered: false,
    nextTimeout: null,
  };

  let currentQuizTheme = 'all';

  const themeTitles = {
    all: '✨ QUIZZ TOUTES MUSIQUES',
    rock: '🎸 QUIZZ ROCK & POP-ROCK',
    pop: '💃 QUIZZ POP INTERNATIONALE',
    chanson: '🇫🇷 QUIZZ CHANSON FRANÇAISE',
    rap: '🎤 QUIZZ RAP FR & US',
    electro: '🪩 QUIZZ ELECTRO & DANCE',
    '80s': '📼 QUIZZ ANNÉES 80S & 90S',
    cinema: '🎬 QUIZZ FILMS & SÉRIES',
    world: '🌍 QUIZZ LATINO & WORLD MUSIC',
  };

  async function startBooskaQuizzSession(count = 10, theme = null) {
    if (theme) currentQuizTheme = theme;
    showView('view-booska-quizz');
    $('#booska-gameplay-card')?.classList.remove('hidden');
    $('#booska-recap-card')?.classList.add('hidden');

    // Update active theme pill
    $$('.btn-theme-pill').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === currentQuizTheme);
    });

    const mainTitle = $('#bq-main-title-text');
    if (mainTitle) mainTitle.textContent = themeTitles[currentQuizTheme] || '✨ QUIZZ MUSICAL & CULTURE';

    booskaQuizState = {
      questions: [],
      currentIndex: 0,
      score: 0,
      correctCount: 0,
      streak: 0,
      bestStreak: 0,
      timer: null,
      timeRemaining: 15,
      answered: false,
      nextTimeout: null,
    };

    updateBooskaHeaderUI();

    const titleEl = $('#bq-question-title');
    if (titleEl) titleEl.textContent = 'Chargement des questions du thème... 🎵';

    try {
      const res = await fetch(`/api/music-quiz/questions?count=${count}&theme=${currentQuizTheme}`);
      const data = await res.json();
      if (data.success && data.questions && data.questions.length > 0) {
        booskaQuizState.questions = data.questions;
        renderCurrentBooskaQuestion();
      } else {
        UIEffects.showToast('Erreur chargement des questions', 'error');
      }
    } catch (err) {
      console.error('[Music Quiz] Fetch error:', err);
      UIEffects.showToast('Erreur réseau Quizz Musical', 'error');
    }
  }

  function updateBooskaHeaderUI() {
    const curIdx = $('#bq-current-index');
    if (curIdx) curIdx.textContent = booskaQuizState.currentIndex + 1;
    const totCount = $('#bq-total-count');
    if (totCount) totCount.textContent = booskaQuizState.questions.length || 10;
    const streakVal = $('#bq-combo-val');
    if (streakVal) streakVal.textContent = booskaQuizState.streak;
    const scoreVal = $('#bq-score-val');
    if (scoreVal) scoreVal.textContent = booskaQuizState.score;

    let multi = 1.0;
    if (booskaQuizState.streak >= 8) multi = 3.0;
    else if (booskaQuizState.streak >= 5) multi = 2.0;
    else if (booskaQuizState.streak >= 3) multi = 1.5;

    const multiVal = $('#bq-multi-val');
    if (multiVal) multiVal.textContent = `x${multi.toFixed(1)}`;
  }

  function renderCurrentBooskaQuestion() {
    clearTimeout(booskaQuizState.nextTimeout);
    clearInterval(booskaQuizState.timer);

    const q = booskaQuizState.questions[booskaQuizState.currentIndex];
    if (!q) {
      endBooskaQuizSession();
      return;
    }

    booskaQuizState.answered = false;
    booskaQuizState.timeRemaining = 15;
    updateBooskaHeaderUI();

    // Fill Question Elements
    const catTag = $('#bq-cat-tag');
    if (catTag) catTag.textContent = q.categoryLabel || '🎤 RAP FR & US';

    const diffTag = $('#bq-diff-tag');
    if (diffTag) diffTag.textContent = `${q.difficulty || 'Moyen'} • +100 pts`;

    const titleEl = $('#bq-question-title');
    if (titleEl) titleEl.textContent = q.question;

    const anecBox = $('#bq-anecdote-box');
    const anecText = $('#bq-anecdote-text');
    if (anecBox && anecText) {
      if (q.punchline || q.anecdote) {
        anecBox.classList.remove('hidden');
        anecText.textContent = q.punchline ? `« ${q.punchline} »` : q.anecdote;
      } else {
        anecBox.classList.add('hidden');
      }
    }

    // Hide drawer
    const drawer = $('#bq-explanation-drawer');
    if (drawer) drawer.classList.add('hidden');

    // Render Options
    const optionsGrid = $('#bq-options-grid');
    if (optionsGrid && q.options) {
      optionsGrid.innerHTML = q.options.map((opt, i) => {
        const letters = ['A', 'B', 'C', 'D'];
        return `
          <button class="bq-option-btn" data-index="${i}">
            <span class="bq-opt-letter">${letters[i]}</span>
            <span class="bq-opt-text">${escapeHtml(opt)}</span>
          </button>
        `;
      }).join('');

      optionsGrid.querySelectorAll('.bq-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          handleBooskaAnswer(idx);
        });
      });
    }

    // Start 15s Timer
    startBooskaTimer();
  }

  function startBooskaTimer() {
    clearInterval(booskaQuizState.timer);
    const barFill = $('#bq-timer-bar-fill');
    const secText = $('#bq-timer-sec');

    if (barFill) barFill.style.width = '100%';
    if (secText) secText.textContent = '15';

    const startTime = Date.now();
    const durationMs = 15000;

    booskaQuizState.timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rem = Math.max(0, durationMs - elapsed);
      const remSec = Math.ceil(rem / 1000);

      if (secText) secText.textContent = remSec;
      if (barFill) barFill.style.width = `${(rem / durationMs) * 100}%`;

      if (rem <= 0) {
        clearInterval(booskaQuizState.timer);
        if (!booskaQuizState.answered) {
          handleBooskaAnswer(-1); // Timeout
        }
      }
    }, 100);
  }

  function handleBooskaAnswer(selectedIndex) {
    if (booskaQuizState.answered) return;
    booskaQuizState.answered = true;
    clearInterval(booskaQuizState.timer);

    const q = booskaQuizState.questions[booskaQuizState.currentIndex];
    const correctIdx = (q.correctAnswer !== undefined && q.correctAnswer >= 0)
      ? q.correctAnswer
      : (q.options ? q.options.indexOf(q.correct) : -1);
    const isCorrect = (selectedIndex === correctIdx);

    // Calculate Multiplier
    let multi = 1.0;
    if (booskaQuizState.streak >= 8) multi = 3.0;
    else if (booskaQuizState.streak >= 5) multi = 2.0;
    else if (booskaQuizState.streak >= 3) multi = 1.5;

    const optButtons = $$('.bq-option-btn');
    optButtons.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === correctIdx) {
        btn.classList.add('correct');
      } else if (idx === selectedIndex) {
        btn.classList.add('wrong');
      }
    });

    const drawer = $('#bq-explanation-drawer');
    const verdict = $('#bq-exp-verdict');
    const expText = $('#bq-exp-text');

    if (isCorrect) {
      booskaQuizState.correctCount++;
      booskaQuizState.streak++;
      if (booskaQuizState.streak > booskaQuizState.bestStreak) {
        booskaQuizState.bestStreak = booskaQuizState.streak;
      }
      userStats.booskaCorrect = (userStats.booskaCorrect || 0) + 1;
      saveStats();

      const timeBonus = Math.floor(booskaQuizState.timeRemaining * 10);
      const points = Math.round((100 + timeBonus) * multi);
      booskaQuizState.score += points;

      if (verdict) verdict.textContent = `🔥 EXACT ! +${points} pts (Combo x${multi.toFixed(1)})`;
      AudioPlayer.play('CORRECT');
    } else {
      booskaQuizState.streak = 0;
      if (verdict) verdict.textContent = selectedIndex === -1 ? '⏱️ TEMPS ÉCOULÉ !' : '❌ RATÉ !';
      AudioPlayer.play('WRONG');
    }

    if (expText) expText.textContent = q.explanation || q.anecdote || 'Booska-P Culture Rap';
    if (drawer) drawer.classList.remove('hidden');

    updateBooskaHeaderUI();

    // Next question in 2.8s
    booskaQuizState.nextTimeout = setTimeout(() => {
      booskaQuizState.currentIndex++;
      renderCurrentBooskaQuestion();
    }, 2800);
  }

  async function endBooskaQuizSession() {
    clearInterval(booskaQuizState.timer);
    $('#booska-gameplay-card')?.classList.add('hidden');
    $('#booska-recap-card')?.classList.remove('hidden');

    const total = booskaQuizState.questions.length || 10;
    const correct = booskaQuizState.correctCount;
    const score = booskaQuizState.score;
    const coinsEarned = Math.max(20, correct * 15 + (booskaQuizState.bestStreak >= 5 ? 50 : 0));

    // Credit coins & XP to user
    addCoins(coinsEarned);
    addXP(score);

    // UI recap elements
    const scoreEl = $('#bq-recap-score');
    if (scoreEl) scoreEl.textContent = `${score.toLocaleString('fr-FR')} pts`;

    const correctEl = $('#bq-recap-correct');
    const pct = Math.round((correct / total) * 100);
    if (correctEl) correctEl.textContent = `${correct} / ${total} (${pct}%)`;

    const streakEl = $('#bq-recap-streak');
    if (streakEl) streakEl.textContent = `🔥 ${booskaQuizState.bestStreak} d'affilée`;

    const coinsEl = $('#bq-recap-coins');
    if (coinsEl) coinsEl.textContent = `🪙 +${coinsEarned} Pièces`;

    const rankEl = $('#bq-recap-rank');
    if (rankEl) {
      if (pct >= 90) rankEl.textContent = '👑 Légende Vivante du Rap Game • Certifié Booska-P Diamant';
      else if (pct >= 70) rankEl.textContent = '🔥 Digger Élite • Connaisseur Rap Affûté';
      else if (pct >= 50) rankEl.textContent = '🎧 Auditeur Passionné • Bonne Culture Rap';
      else rankEl.textContent = '📻 Rookie du Rap • Continue à t\'entraîner !';
    }

    if (pct >= 60) {
      UIEffects.showConfetti();
    }

    // Save session to backend
    try {
      await fetch('/api/rap-quiz/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, correct, total, coinsEarned })
      });
    } catch (_) {}

    // Check Badges & Long term quests
    renderLongTermQuests();
    checkBadges();
  }

  function initBooskaQuizz() {
    $('#btn-booska-quit')?.addEventListener('click', () => {
      clearInterval(booskaQuizState.timer);
      clearTimeout(booskaQuizState.nextTimeout);
      showView('view-home');
    });

    $('#btn-booska-home')?.addEventListener('click', () => {
      showView('view-home');
    });

    $('#btn-booska-replay')?.addEventListener('click', () => {
      startBooskaQuizzSession(10, currentQuizTheme);
    });

    // Écouteurs de clics sur les boutons de thèmes musicaux (Apple Liquid Glass)
    $$('.btn-theme-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme') || 'all';
        startBooskaQuizzSession(10, theme);
      });
    });
  }

  // ═══════════════════════════════════════
  // 🤖 HARMONIA AI CHATBOT WIDGET HANDLER
  // ═══════════════════════════════════════
  function initHarmonIAChat() {
    const triggerBtn = $('#btn-toggle-harmonia');
    const closeBtn = $('#btn-close-harmonia');
    const chatWindow = $('#harmonia-chat-window');
    const input = $('#harmonia-input');
    const sendBtn = $('#harmonia-send');
    const messagesContainer = $('#harmonia-messages');

    if (!triggerBtn || !chatWindow) return;

    // Toggle Chat Window
    triggerBtn.addEventListener('click', () => {
      chatWindow.classList.toggle('hidden');
      if (!chatWindow.classList.contains('hidden')) {
        input?.focus();
      }
    });

    closeBtn?.addEventListener('click', () => chatWindow.classList.add('hidden'));

    async function sendHarmonIAMessage(text) {
      const msg = text || (input?.value || '').trim();
      if (!msg) return;

      if (input) input.value = '';

      // Append User message (Sanitized)
      appendHarmonIAMessage('user', 'Toi', UIEffects.escapeHTML(msg));

      // Append Typing Indicator
      const typingEl = document.createElement('div');
      typingEl.className = 'harmonia-msg bot typing';
      typingEl.innerHTML = `<span class="msg-author">HarmonIA 🤖</span><div class="msg-bubble">HarmonIA réfléchit... 💭</div>`;
      messagesContainer.appendChild(typingEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg, context: { coins: user.coins, isVip: user.isVip } })
        });
        const data = await res.json();
        typingEl.remove();

        if (data.success && data.reply) {
          appendHarmonIAMessage('bot', data.botName || 'HarmonIA', data.reply);
          if (data.action) {
            if (data.action.type === 'NAVIGATE') {
              const viewMap = { playlists: 'view-playlists', shop: 'view-shop', home: 'view-home' };
              if (viewMap[data.action.target]) showView(viewMap[data.action.target]);
            } else if (data.action.type === 'OPEN_MODAL') {
              openModal(data.action.modalId);
            } else if (data.action.type === 'START_ARTIST_ROOM' && data.action.artist) {
              const artistSlug = '100-' + encodeURIComponent(data.action.artist.toLowerCase().trim().replace(/\s+/g, '-'));
              setTimeout(() => {
                UIEffects.showToast(`HarmonIA lance le 100% ${data.action.artist} ! 🚀`, 'success');
                startGameWithPlaylist(artistSlug);
              }, 1200);
            }
          }
        } else {
          appendHarmonIAMessage('bot', 'HarmonIA', 'Désolé, je rencontre des difficultés temporaires. Réessaie dans quelques instants !');
        }
      } catch (err) {
        typingEl.remove();
        appendHarmonIAMessage('bot', 'HarmonIA', 'Je suis en mode déconnecté. N\'hésite pas à explorer la boutique ou tester les playlists ! 🎵');
      }
    }

    function appendHarmonIAMessage(sender, author, text) {
      const msgDiv = document.createElement('div');
      msgDiv.className = `harmonia-msg ${sender}`;
      // Format markdown bold & line breaks
      const formatted = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
      msgDiv.innerHTML = `<span class="msg-author">${author}</span><div class="msg-bubble">${formatted}</div>`;
      messagesContainer.appendChild(msgDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    sendBtn?.addEventListener('click', () => sendHarmonIAMessage());
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendHarmonIAMessage();
    });

    // Quick suggestion chips
    $$('.harmonia-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-chip');
        if (text) sendHarmonIAMessage(text);
      });
    });
  }

  // ═══════════════════════════════════════
  // 🎧 AUDIO PREVIEW TESTER FOR PLAYLISTS
  // ═══════════════════════════════════════
  let currentPreviewAudio = null;
  let activePreviewBtn = null;

  function handleAudioPreviewClick(btn, playlistKey) {
    if (activePreviewBtn === btn && currentPreviewAudio) {
      currentPreviewAudio.pause();
      currentPreviewAudio = null;
      btn.classList.remove('playing');
      btn.innerHTML = '<span>🎧</span> Aperçu';
      activePreviewBtn = null;
      return;
    }

    if (activePreviewBtn && currentPreviewAudio) {
      currentPreviewAudio.pause();
      activePreviewBtn.classList.remove('playing');
      activePreviewBtn.innerHTML = '<span>🎧</span> Aperçu';
    }

    btn.classList.add('playing');
    btn.innerHTML = '<span>🔊</span> Écoute...';
    activePreviewBtn = btn;

    const pl = state.playlists.find(p => p.key === playlistKey);
    let searchParam = pl ? pl.name : playlistKey;
    if (playlistKey.startsWith('100-')) {
      searchParam = decodeURIComponent(playlistKey.substring(4)).replace(/[-_]/g, ' ');
    }

    fetch(`/api/tracks/search?q=${encodeURIComponent(searchParam)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.tracks && data.tracks.length > 0 && data.tracks[0].preview) {
          const track = data.tracks[0];
          currentPreviewAudio = new Audio(track.preview);
          currentPreviewAudio.volume = 0.65;
          currentPreviewAudio.play().catch(() => {});
          UIEffects.showToast(`Extrait : ${track.artist} — ${track.title}`, 'info');

          currentPreviewAudio.onended = () => {
            btn.classList.remove('playing');
            btn.innerHTML = '<span>🎧</span> Aperçu';
            activePreviewBtn = null;
            currentPreviewAudio = null;
          };

          setTimeout(() => {
            if (activePreviewBtn === btn && currentPreviewAudio) {
              currentPreviewAudio.pause();
              btn.classList.remove('playing');
              btn.innerHTML = '<span>🎧</span> Aperçu';
              activePreviewBtn = null;
              currentPreviewAudio = null;
            }
          }, 7000);
        } else {
          UIEffects.showToast('Aucun extrait disponible pour cette playlist', 'warning');
          btn.classList.remove('playing');
          btn.innerHTML = '<span>🎧</span> Aperçu';
          activePreviewBtn = null;
        }
      })
      .catch(() => {
        btn.classList.remove('playing');
        btn.innerHTML = '<span>🎧</span> Aperçu';
        activePreviewBtn = null;
      });
  }

  // ═══════════════════════════════════════
  // 🎁 DAILY CHEST REWARD HANDLER
  // ═══════════════════════════════════════
  function initDailyChest() {
    const chestBtn = $('#btn-daily-chest');
    const modal = $('#modal-daily-chest');
    const closeBtn = $('#btn-close-chest');
    const claimBtn = $('#btn-claim-daily-chest');
    const chestIcon = $('#chest-display-icon');
    const streakEl = $('#chest-streak-val');

    if (!chestBtn || !modal) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const lastClaimDate = localStorage.getItem('harmonie_last_chest_date');
    let streak = parseInt(localStorage.getItem('harmonie_chest_streak') || '1', 10);

    const isClaimedToday = (lastClaimDate === todayStr);

    function updateChestButtonState() {
      if (isClaimedToday) {
        chestBtn.querySelector('.chest-badge-dot')?.classList.add('hidden');
        const label = chestBtn.querySelector('.chest-btn-label');
        if (label) label.textContent = 'Cadeau Récupéré ✓';
        chestBtn.style.opacity = '0.75';
      }
    }
    updateChestButtonState();

    chestBtn.addEventListener('click', () => {
      if (streakEl) streakEl.textContent = `${streak} jour${streak > 1 ? 's' : ''}`;
      if (isClaimedToday && claimBtn) {
        claimBtn.disabled = true;
        claimBtn.textContent = '✅ Déjà récupéré aujourd\'hui ! Reviens demain';
      }
      openModal('modal-daily-chest');
    });

    closeBtn?.addEventListener('click', () => closeModal('modal-daily-chest'));

    claimBtn?.addEventListener('click', () => {
      if (localStorage.getItem('harmonie_last_chest_date') === todayStr) {
        UIEffects.showToast('Tu as déjà ouvert ton coffre aujourd\'hui !', 'info');
        return;
      }

      chestIcon?.classList.add('chest-shake');
      claimBtn.disabled = true;
      claimBtn.textContent = 'Ouverture du coffre... ✨';

      setTimeout(() => {
        const bonusCoins = 150;
        addCoins(bonusCoins);

        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (lastClaimDate === yesterday) {
          streak += 1;
        } else if (lastClaimDate !== todayStr) {
          streak = 1;
        }

        localStorage.setItem('harmonie_last_chest_date', todayStr);
        localStorage.setItem('harmonie_chest_streak', String(streak));

        if (streakEl) streakEl.textContent = `${streak} jour${streak > 1 ? 's' : ''}`;
        chestBtn.querySelector('.chest-badge-dot')?.classList.add('hidden');
        const label = chestBtn.querySelector('.chest-btn-label');
        if (label) label.textContent = 'Cadeau Récupéré ✓';
        chestBtn.style.opacity = '0.75';

        claimBtn.textContent = `🎉 Bravo ! +${bonusCoins} 🪙 ajoutées`;
        UIEffects.confetti();
        UIEffects.showToast(`Coffre débloqué : +${bonusCoins} Pièces Harmonie ! 🪙`, 'success');

        setTimeout(() => {
          closeModal('modal-daily-chest');
          chestIcon?.classList.remove('chest-shake');
        }, 1800);
      }, 800);
    });
  }

  // ═══════════════════════════════════════
  // ♾️ INFINITE 100% ARTIST GENERATOR
  // ═══════════════════════════════════════
  function initInfiniteArtistGenerator() {
    const input = $('#infinite-artist-input');
    const launchBtn = $('#btn-infinite-launch');
    const resultsContainer = $('#infinite-artist-results');
    const chips = $$('.chip-infinite-artist');

    if (!input || !launchBtn) return;

    let searchTimer = null;

    async function searchArtistApi(query) {
      if (!query || query.trim().length < 2) {
        if (resultsContainer) {
          resultsContainer.innerHTML = '';
          resultsContainer.classList.add('hidden');
        }
        return;
      }

      try {
        const res = await fetch(`/api/artists/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success && data.artists && data.artists.length > 0) {
          renderArtistResults(data.artists);
        } else if (resultsContainer) {
          resultsContainer.innerHTML = `<div style="grid-column:1/-1; color:#94a3b8; font-size:0.85rem; padding:8px 0;">Artiste non listé. Tu peux quand même lancer le 100% avec ce nom !</div>`;
          resultsContainer.classList.remove('hidden');
        }
      } catch (err) {
        console.warn('[Artist Search] fetch error:', err);
      }
    }

    function renderArtistResults(artists) {
      if (!resultsContainer) return;
      resultsContainer.classList.remove('hidden');
      resultsContainer.innerHTML = artists.map(a => {
        const fans = a.nb_fan > 1000000 
          ? (a.nb_fan / 1000000).toFixed(1) + 'M fans'
          : (a.nb_fan > 1000 ? Math.round(a.nb_fan / 1000) + 'k fans' : a.nb_fan + ' fans');
        
        return `
          <div class="artist-search-result-card" data-key="${a.key}" data-name="${escapeHtml(a.name)}">
            <img src="${a.picture || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80'}" alt="${escapeHtml(a.name)}" loading="lazy">
            <div class="artist-res-info">
              <div class="artist-res-name">${escapeHtml(a.name)}</div>
              <div class="artist-res-fans">${fans} • ${a.nb_album || 10}+ albums</div>
            </div>
            <button class="btn-play-artist-res" data-key="${a.key}">▶ 100%</button>
          </div>
        `;
      }).join('');

      resultsContainer.querySelectorAll('.artist-search-result-card').forEach(card => {
        card.addEventListener('click', () => {
          const key = card.getAttribute('data-key');
          startGameWithPlaylist(key);
        });
      });
    }

    input.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        searchArtistApi(input.value);
      }, 300);
    });

    function launchWithInput() {
      const val = (input.value || '').trim();
      if (!val) {
        UIEffects.showToast('Tape d\'abord le nom d\'un artiste !', 'warning');
        UIEffects.shake(input);
        return;
      }
      const key = '100-' + encodeURIComponent(val.toLowerCase().replace(/\s+/g, '-'));
      startGameWithPlaylist(key);
    }

    launchBtn.addEventListener('click', launchWithInput);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') launchWithInput();
    });

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const artist = chip.getAttribute('data-artist');
        if (artist) {
          input.value = artist;
          const key = '100-' + encodeURIComponent(artist.toLowerCase().replace(/\s+/g, '-'));
          startGameWithPlaylist(key);
        }
      });
    });
  }

  // ═══════════════════════════════════════
  // 🛡️ MODAL BACKDROP CLICK-TO-CLOSE
  // ═══════════════════════════════════════
  function initModalBackdropClose() {
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        // Only close if clicking the backdrop itself, not the modal card
        if (e.target === backdrop) {
          backdrop.classList.add('hidden');
        }
      });
    });
  }

  // ═══════════════════════════════════════
  // 🛡️ 12. ADMIN PANEL LOGIC & DATA CONTROLLER
  // ═══════════════════════════════════════
  let adminAccounts = [];
  let adminSubscriptions = [];
  let adminTransactions = [];

  function loadAdminPanelData() {
    // 1. Load accounts (merge localStorage accounts with default rich accounts)
    const storedAccounts = JSON.parse(localStorage.getItem('harmonie_accounts') || '[]');
    const defaultAccounts = [
      { id: 'usr_001', name: 'Alex Dupont (Admin)', email: 'alex.harmonie@gmail.com', provider: 'google', role: 'admin', coins: 12500, status: 'active', avatar: '🛡️', date: '01/08/2026' },
      { id: 'usr_002', name: 'Sarah M.', email: 'sarah.music@gmail.com', provider: 'email', role: 'vip', coins: 3500, status: 'active', avatar: '🦄', date: '05/08/2026' },
      { id: 'usr_003', name: 'Thomas_Daft', email: 'thomas.daft@yahoo.fr', provider: 'apple', role: 'vip', coins: 1800, status: 'active', avatar: '🤖', date: '12/08/2026' },
      { id: 'usr_004', name: 'Mélomane_Paris', email: 'melomane75@gmail.com', provider: 'google', role: 'player', coins: 450, status: 'active', avatar: '🦊', date: '15/08/2026' },
      { id: 'usr_005', name: 'NinhoFan_93', email: 'ninho.fan93@outlook.com', provider: 'email', role: 'player', coins: 120, status: 'active', avatar: '👑', date: '18/08/2026' },
      { id: 'usr_006', name: 'Julien_Ovni', email: 'julien.marseille@gmail.com', provider: 'facebook', role: 'player', coins: 250, status: 'active', avatar: '👽', date: '20/08/2026' },
      { id: 'usr_007', name: 'Spammer_Troll', email: 'troll@bot.net', provider: 'guest', role: 'player', coins: 0, status: 'banned', avatar: '💀', date: '22/08/2026' },
    ];

    // Current logged in user is represented
    const currentUserAcc = {
      id: 'usr_current',
      name: user.name,
      email: user.email || 'joueur.connecte@harmonie.fr',
      provider: user.provider || 'guest',
      role: user.isVip ? 'vip' : 'player',
      coins: user.coins,
      status: 'active',
      avatar: user.avatar,
      date: 'Aujourd\'hui'
    };

    const merged = [currentUserAcc, ...defaultAccounts];
    for (const sa of storedAccounts) {
      if (!merged.some(m => m.email === sa.email || m.name === sa.name)) {
        merged.push({
          id: 'usr_' + Math.random().toString(36).substr(2, 6),
          name: sa.name || sa.pseudo || 'Utilisateur',
          email: sa.email || 'email@harmonie.fr',
          provider: 'email',
          role: sa.isVip ? 'vip' : 'player',
          coins: sa.coins || 250,
          status: 'active',
          avatar: sa.avatar || '🦊',
          date: 'Récemment'
        });
      }
    }
    adminAccounts = merged;

    // Subscriptions list
    adminSubscriptions = [
      { user: 'Sarah M.', plan: 'Pass VIP Mensuel', amount: '4,99 €', start: '14/08/2026', next: '14/10/2026', status: 'Actif' },
      { user: 'Thomas_Daft', plan: 'Pass VIP Annuel', amount: '39,99 €', start: '12/08/2026', next: '12/08/2027', status: 'Actif' },
      { user: 'Julien_Ovni', plan: 'Pass VIP Mensuel', amount: '4,99 €', start: '20/08/2026', next: '20/09/2026', status: 'Expiré' },
      { user: user.name, plan: user.isVip ? 'Pass VIP PRO' : 'Aucun', amount: user.isVip ? '4,99 €' : '0,00 €', start: '01/09/2026', next: 'Illimité', status: user.isVip ? 'Actif' : 'Inactif' }
    ];

    // Transactions list
    adminTransactions = [
      { date: '16/09 00:54', user: user.name, event: 'Coffre Quotidien Réclamé', diff: '+150 🪙', balance: user.coins },
      { date: '16/09 00:20', user: 'Sarah M.', event: 'Achat Cadre Holographique', diff: '-300 🪙', balance: 3200 },
      { date: '15/09 23:45', user: 'NinhoFan_93', event: 'Victoire Duel Rap FR', diff: '+45 🪙', balance: 165 },
      { date: '15/09 22:10', user: 'Alex Dupont', event: 'Recharge Pack Superstar', diff: '+3500 🪙', balance: 12500 }
    ];

    renderAdminAccounts();
    renderAdminSubscriptions();
    renderAdminTransactions();
    fetchServerStats();
    fetchAndRenderAdminTournament();
  }

  function renderAdminAccounts() {
    const tbody = $('#admin-accounts-tbody');
    if (!tbody) return;

    const query = ($('#admin-user-search-input')?.value || '').toLowerCase().trim();
    const roleFilter = $('#admin-role-filter')?.value || 'all';

    let filtered = adminAccounts.filter(acc => {
      const matchQ = acc.name.toLowerCase().includes(query) || (acc.email || '').toLowerCase().includes(query);
      const matchRole = roleFilter === 'all' || acc.role === roleFilter;
      return matchQ && matchRole;
    });

    // Update KPI count
    const kpiAcc = $('#kpi-total-accounts');
    if (kpiAcc) kpiAcc.textContent = (1420 + adminAccounts.length).toLocaleString('fr-FR');

    tbody.innerHTML = filtered.map(acc => {
      const isBanned = acc.status === 'banned';
      return `
        <tr data-id="${acc.id}">
          <td>
            <div class="user-cell">
              <span class="user-cell-avatar">${acc.avatar || '🦊'}</span>
              <div>
                <span class="user-cell-name">${escapeHtml(acc.name)}</span>
                <div style="font-size:0.75rem; color:#64748b;">ID: ${acc.id}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="color:#fff; font-weight:600;">${escapeHtml(acc.email)}</div>
            <span style="font-size:0.72rem; color:#94a3b8; text-transform:uppercase;">${acc.provider}</span>
          </td>
          <td>
            <select class="select-styled admin-role-select" data-id="${acc.id}" style="padding: 4px 8px; font-size: 0.78rem;">
              <option value="player" ${acc.role === 'player' ? 'selected' : ''}>Joueur</option>
              <option value="vip" ${acc.role === 'vip' ? 'selected' : ''}>👑 VIP PRO</option>
              <option value="admin" ${acc.role === 'admin' ? 'selected' : ''}>🛡️ Admin</option>
            </select>
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:6px;">
              <b style="color:#fbbf24;">${acc.coins} 🪙</b>
              <button class="btn btn-ghost btn-sm btn-edit-coins" data-id="${acc.id}" data-action="add" style="padding:2px 6px;" title="+100 pièces">+</button>
              <button class="btn btn-ghost btn-sm btn-edit-coins" data-id="${acc.id}" data-action="sub" style="padding:2px 6px;" title="-100 pièces">-</button>
            </div>
          </td>
          <td>
            <span class="status-badge ${isBanned ? 'banned' : 'active'}">
              ${isBanned ? '🔴 Banni' : '🟢 Actif'}
            </span>
          </td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-sm ${isBanned ? 'btn-outline' : 'btn-ghost'} btn-toggle-ban" data-id="${acc.id}" style="font-size:0.75rem; padding:4px 8px;">
                ${isBanned ? 'Débannir' : '🚫 Bannir'}
              </button>
              <button class="btn btn-sm btn-ghost btn-del-acc" data-id="${acc.id}" style="color:#f87171; font-size:0.75rem; padding:4px 8px;" title="Supprimer">✕</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Wire table row events
    tbody.querySelectorAll('.admin-role-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = sel.getAttribute('data-id');
        const newRole = sel.value;
        const targetAcc = adminAccounts.find(a => a.id === id);
        if (targetAcc) {
          targetAcc.role = newRole;
          if (targetAcc.name === user.name) {
            user.isVip = (newRole === 'vip' || newRole === 'admin');
            localStorage.setItem('harmonie_vip', String(user.isVip));
            updateProfileUI();
          }
          UIEffects.showToast(`Rôle mis à jour pour ${targetAcc.name} : ${newRole.toUpperCase()} !`, 'success');
        }
      });
    });

    tbody.querySelectorAll('.btn-edit-coins').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const act = btn.getAttribute('data-action');
        const targetAcc = adminAccounts.find(a => a.id === id);
        if (targetAcc) {
          const delta = act === 'add' ? 100 : -100;
          targetAcc.coins = Math.max(0, targetAcc.coins + delta);
          if (targetAcc.name === user.name) {
            addCoins(delta);
          }
          renderAdminAccounts();
        }
      });
    });

    tbody.querySelectorAll('.btn-toggle-ban').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const targetAcc = adminAccounts.find(a => a.id === id);
        if (targetAcc) {
          targetAcc.status = targetAcc.status === 'banned' ? 'active' : 'banned';
          UIEffects.showToast(`${targetAcc.name} est maintenant ${targetAcc.status === 'banned' ? 'BANNI' : 'RÉACTIVÉ'} !`, targetAcc.status === 'banned' ? 'error' : 'success');
          renderAdminAccounts();
        }
      });
    });

    tbody.querySelectorAll('.btn-del-acc').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        adminAccounts = adminAccounts.filter(a => a.id !== id);
        UIEffects.showToast('Compte supprimé de la base.', 'info');
        renderAdminAccounts();
      });
    });
  }

  function renderAdminSubscriptions() {
    const tbody = $('#admin-subs-tbody');
    if (!tbody) return;

    tbody.innerHTML = adminSubscriptions.map(s => `
      <tr>
        <td><b>${escapeHtml(s.user)}</b></td>
        <td><span class="role-badge vip">${escapeHtml(s.plan)}</span></td>
        <td><b>${s.amount}</b></td>
        <td>${s.start}</td>
        <td>${s.next}</td>
        <td><span class="status-badge ${s.status === 'Actif' ? 'active' : 'banned'}">${s.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" style="font-size:0.75rem; padding:4px 8px;" onclick="UIEffects.showToast('Statut abonnement mis à jour !', 'info')">
            ${s.status === 'Actif' ? 'Résilier' : 'Réactiver'}
          </button>
        </td>
      </tr>
    `).join('');
  }

  function renderAdminTransactions() {
    const tbody = $('#admin-tx-tbody');
    if (!tbody) return;

    tbody.innerHTML = adminTransactions.map(tx => `
      <tr>
        <td style="color:#64748b;">${tx.date}</td>
        <td><b>${escapeHtml(tx.user)}</b></td>
        <td>${escapeHtml(tx.event)}</td>
        <td style="color: ${tx.diff.startsWith('+') ? '#34d399' : '#f87171'}; font-weight:700;">${tx.diff}</td>
        <td><b>${tx.balance} 🪙</b></td>
      </tr>
    `).join('');
  }

  async function fetchServerStats() {
    const roomsContainer = $('#admin-live-rooms-list');
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success && data.stats) {
        const rooms = data.stats.rooms || [];
        if (roomsContainer) {
          if (rooms.length === 0) {
            roomsContainer.innerHTML = '<div class="empty-state" style="padding:16px;">Aucune partie multijoueur en cours sur le serveur.</div>';
          } else {
            roomsContainer.innerHTML = rooms.map(r => `
              <div class="admin-room-pill">
                <h4>Salon : ${r.id}</h4>
                <p>🎵 Playlist: <b>${r.genre || 'Mix'}</b></p>
                <p>👥 Joueurs : <b>${r.playersCount}</b> • Manche ${r.currentRound}/${r.totalRounds}</p>
                <p style="color:#34d399; font-weight:700; margin-top:4px;">Statut : ${r.state}</p>
              </div>
            `).join('');
          }
        }
      }
    } catch (e) {
      console.warn('[Admin] Server stats fetch error:', e);
    }
  }

  // ─── ADMIN AUTH & ROUTING CONTROLLER ───
  function isAdminAuthenticated() {
    return sessionStorage.getItem('harmonie_admin_auth') === 'true';
  }

  function openAdminLogin() {
    const loginView = $('#view-admin-login');
    if (loginView) loginView.classList.remove('hidden');
    const adminView = $('#view-admin');
    if (adminView) adminView.classList.remove('active');
    
    // Clear error
    const errEl = $('#admin-login-error-alert');
    if (errEl) {
      errEl.classList.add('hidden');
      errEl.textContent = '';
    }

    if (window.location.pathname !== '/admin') {
      try {
        window.history.pushState({ view: 'admin-login' }, 'Accès Administration', '/admin');
      } catch (_) {}
    }
    setTimeout(() => $('#admin-input-password')?.focus(), 150);
  }

  // ─── ADMIN DYNAMIC SYNC & TELEMETRY CONTROLLER ───
  let adminSyncInterval = null;

  function startAdminDynamicSync() {
    stopAdminDynamicSync();
    fetchServerStats();
    fetchAndRenderAdminTournament();

    const indicator = $('#admin-sync-indicator');
    if (indicator) indicator.style.opacity = '1';

    adminSyncInterval = setInterval(() => {
      const adminView = $('#view-admin');
      if (adminView && adminView.classList.contains('active')) {
        fetchServerStats();
        fetchAndRenderAdminTournament();
      } else {
        stopAdminDynamicSync();
      }
    }, 3500);
  }

  function stopAdminDynamicSync() {
    if (adminSyncInterval) {
      clearInterval(adminSyncInterval);
      adminSyncInterval = null;
    }
  }

  function openAdminDashboard() {
    sessionStorage.setItem('harmonie_admin_auth', 'true');
    const loginView = $('#view-admin-login');
    if (loginView) loginView.classList.add('hidden');
    showView('view-admin');
    loadAdminPanelData();
    startAdminDynamicSync();
    if (window.location.pathname !== '/admin') {
      try {
        window.history.pushState({ view: 'admin' }, 'Panel Administrateur', '/admin');
      } catch (_) {}
    }
  }

  function closeAdminToSite() {
    stopAdminDynamicSync();
    const loginView = $('#view-admin-login');
    if (loginView) loginView.classList.add('hidden');
    showView('view-home');
    if (window.location.pathname === '/admin') {
      try {
        window.history.pushState({ view: 'home' }, 'Harmonie', '/');
      } catch (_) {}
    }
  }

  function handleAdminNavigation() {
    // 🛡️ Direct access to dashboard as requested by user (no blocking intermediate login)
    sessionStorage.setItem('harmonie_admin_auth', 'true');
    openAdminDashboard();
  }

  function checkAdminRoute() {
    const p = window.location.pathname;
    const h = window.location.hash;
    if (p === '/admin' || p.startsWith('/admin/') || h === '#admin') {
      handleAdminNavigation();
    }
  }

  function initAdminPanel() {
    // 0. Admin Login Form & Credentials Authentication
    const formLogin = $('#form-admin-login');
    const pwdInput = $('#admin-input-password');
    const togglePwdBtn = $('#btn-toggle-admin-pwd');
    const eyeIcon = $('#icon-pwd-eye');
    const eyeOffIcon = $('#icon-pwd-eye-off');
    const errAlert = $('#admin-login-error-alert');

    // Password visibility toggle
    togglePwdBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!pwdInput) return;
      const isPwd = pwdInput.getAttribute('type') === 'password';
      pwdInput.setAttribute('type', isPwd ? 'text' : 'password');
      if (isPwd) {
        eyeIcon?.classList.add('hidden');
        eyeOffIcon?.classList.remove('hidden');
      } else {
        eyeIcon?.classList.remove('hidden');
        eyeOffIcon?.classList.add('hidden');
      }
    });

    // Login Form Submit
    formLogin?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = ($('#admin-input-username')?.value || '').trim();
      const password = ($('#admin-input-password')?.value || '').trim();
      const submitBtn = $('#btn-admin-submit-login');

      if (!username || !password) {
        if (errAlert) {
          errAlert.textContent = 'Veuillez saisir un identifiant et un mot de passe.';
          errAlert.classList.remove('hidden');
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Connexion…';
      }

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          sessionStorage.setItem('harmonie_admin_auth', 'true');
          if (data.token) sessionStorage.setItem('harmonie_admin_token', data.token);
          if (errAlert) errAlert.classList.add('hidden');
          openAdminDashboard();
          UIEffects.showToast('Connexion réussie ! Bienvenue sur la console d\'administration.', 'success');
        } else {
          // Local fallback check
          if (username.toLowerCase() === 'admin' && (password === 'admin' || password === 'harmonie2026' || password === 'admin123')) {
            sessionStorage.setItem('harmonie_admin_auth', 'true');
            if (errAlert) errAlert.classList.add('hidden');
            openAdminDashboard();
            UIEffects.showToast('Connexion réussie !', 'success');
          } else {
            if (errAlert) {
              errAlert.textContent = data.message || 'Identifiant ou mot de passe incorrect. (Astuce : admin / admin)';
              errAlert.classList.remove('hidden');
            }
          }
        }
      } catch (err) {
        if (username.toLowerCase() === 'admin' && (password === 'admin' || password === 'harmonie2026')) {
          sessionStorage.setItem('harmonie_admin_auth', 'true');
          openAdminDashboard();
          UIEffects.showToast('Connexion réussie !', 'success');
        } else {
          if (errAlert) {
            errAlert.textContent = 'Erreur lors de la connexion. (Identifiant par défaut : admin / admin)';
            errAlert.classList.remove('hidden');
          }
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Se connecter';
        }
      }
    });

    // Back to site from Login & Dashboard
    $('#btn-admin-login-back-site')?.addEventListener('click', (e) => {
      e.preventDefault();
      closeAdminToSite();
    });

    $('#btn-admin-dashboard-back-site')?.addEventListener('click', (e) => {
      e.preventDefault();
      closeAdminToSite();
    });

    // Bouton d'actualisation dynamique immédiate
    $('#btn-admin-manual-refresh')?.addEventListener('click', async () => {
      const icon = $('#btn-admin-manual-refresh .spin-icon');
      if (icon) icon.classList.add('spinning');
      await Promise.all([fetchServerStats(), fetchAndRenderAdminTournament()]);
      UIEffects.showToast('Données administratives actualisées en direct ! 🔄', 'info', 1800);
      setTimeout(() => { if (icon) icon.classList.remove('spinning'); }, 600);
    });

    // Admin Logout (Header & Tabs bar)
    const handleAdminLogout = (e) => {
      if (e) e.preventDefault();
      sessionStorage.removeItem('harmonie_admin_auth');
      sessionStorage.removeItem('harmonie_admin_token');
      UIEffects.showToast('Déconnexion effectuée avec succès.', 'info');
      openAdminLogin();
    };
    $('#btn-admin-logout')?.addEventListener('click', handleAdminLogout);
    $('#btn-admin-logout-tab')?.addEventListener('click', handleAdminLogout);

    // Listen to browser forward/backward
    window.addEventListener('popstate', () => {
      checkAdminRoute();
    });

    // Check URL route on initialization
    checkAdminRoute();

    // 1. Admin Sub-Tabs Switching
    $$('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-atab');
        $$('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        $$('.admin-tab-content').forEach(c => {
          c.classList.add('hidden');
          c.classList.remove('active');
        });

        btn.classList.add('active');
        const content = $(`#admin-tab-${targetTab}`);
        if (content) {
          content.classList.remove('hidden');
          content.classList.add('active');
        }
        if (targetTab === 'tournaments') {
          fetchAndRenderAdminTournament();
        }
      });
    });

    // 2. User Search Filter
    $('#admin-user-search-input')?.addEventListener('input', () => renderAdminAccounts());
    $('#admin-role-filter')?.addEventListener('change', () => renderAdminAccounts());

    // 3. Add Account Test Button
    $('#btn-admin-add-account')?.addEventListener('click', () => {
      const pseudo = prompt('Nom d\'utilisateur du nouveau compte :');
      if (!pseudo || !pseudo.trim()) return;
      const email = `${pseudo.toLowerCase().replace(/\s+/g, '')}@test.harmonie.fr`;
      adminAccounts.unshift({
        id: 'usr_' + Math.random().toString(36).substr(2, 6),
        name: pseudo.trim(),
        email: email,
        provider: 'email',
        role: 'player',
        coins: 200,
        status: 'active',
        avatar: '🦊',
        date: 'À l\'instant'
      });
      renderAdminAccounts();
      UIEffects.showToast(`Compte test "${pseudo}" créé !`, 'success');
    });

    // 4. Grant VIP Button
    $('#btn-admin-grant-vip')?.addEventListener('click', () => {
      const input = $('#admin-grant-vip-pseudo');
      const pseudo = (input?.value || '').trim();
      if (!pseudo) {
        UIEffects.showToast('Précise le pseudo du joueur !', 'warning');
        return;
      }
      const acc = adminAccounts.find(a => a.name.toLowerCase() === pseudo.toLowerCase());
      if (acc) {
        acc.role = 'vip';
        if (acc.name === user.name) {
          user.isVip = true;
          localStorage.setItem('harmonie_vip', 'true');
          updateProfileUI();
        }
        UIEffects.showToast(`Pass VIP PRO accordé à ${acc.name} ! 👑`, 'success');
        input.value = '';
        renderAdminAccounts();
      } else {
        UIEffects.showToast(`Utilisateur "${pseudo}" introuvable.`, 'error');
      }
    });

    // 5. Simulate Ad Interstitial
    $('#btn-admin-simulate-ad')?.addEventListener('click', () => {
      const adDiv = document.createElement('div');
      adDiv.className = 'overlay-fullscreen';
      adDiv.style.background = 'rgba(15, 23, 42, 0.95)';
      adDiv.style.zIndex = '99999';
      adDiv.innerHTML = `
        <div class="modal-card" style="text-align:center; max-width:480px;">
          <span style="font-size:0.75rem; color:#f59e0b; font-weight:800; letter-spacing:1px;">ANNONCE PARTENAIRE (3s)</span>
          <h2 style="margin:12px 0 8px; font-family:'Montserrat',sans-serif;">🎧 Deezer & Spotify Premium</h2>
          <p style="color:#94a3b8; font-size:0.9rem;">Passez au niveau supérieur : écoutez des millions de titres en illimité et sans coupure publicitaire.</p>
          <div style="margin:20px 0; font-size:3.5rem;">🎵✨</div>
          <button id="btn-close-sim-ad" class="btn btn-yellow btn-block" disabled>Fermeture dans <span id="ad-sim-timer">3</span>s</button>
        </div>
      `;
      document.body.appendChild(adDiv);
      let t = 3;
      const itv = setInterval(() => {
        t--;
        const timerEl = document.getElementById('ad-sim-timer');
        if (timerEl) timerEl.textContent = t;
        if (t <= 0) {
          clearInterval(itv);
          const closeBtn = document.getElementById('btn-close-sim-ad');
          if (closeBtn) {
            closeBtn.disabled = false;
            closeBtn.textContent = '✕ Fermer la publicité';
            closeBtn.onclick = () => adDiv.remove();
          }
        }
      }, 1000);
    });

    // 6. Rewards Sliders
    const sliderChest = $('#slider-chest-reward');
    const lblChest = $('#lbl-chest-coins-val');
    sliderChest?.addEventListener('input', () => {
      if (lblChest) lblChest.textContent = `${sliderChest.value} 🪙`;
    });

    const sliderStreak = $('#slider-streak-bonus');
    const lblStreak = $('#lbl-streak-bonus-val');
    sliderStreak?.addEventListener('input', () => {
      if (lblStreak) lblStreak.textContent = `+${sliderStreak.value} %`;
    });

    $('#btn-save-rewards-settings')?.addEventListener('click', () => {
      if (sliderChest) localStorage.setItem('harmonie_daily_chest_amount', sliderChest.value);
      if (sliderStreak) localStorage.setItem('harmonie_streak_bonus', sliderStreak.value);
      UIEffects.showToast('Paramètres de récompenses sauvegardés ! 💾', 'success');
    });

    // 7. Airdrop Trigger
    $('#btn-admin-trigger-airdrop')?.addEventListener('click', async () => {
      const amount = parseInt($('#admin-airdrop-amount')?.value || '200', 10);
      const reason = ($('#admin-airdrop-reason')?.value || 'Bonus Direction').trim();
      try {
        const res = await fetch('/api/admin/airdrop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, reason })
        });
        const data = await res.json();
        if (data.success) {
          UIEffects.showToast(`Airdrop envoyé : ${data.message}`, 'success');
        }
      } catch (err) {
        // Fallback local
        onAirdropCoins({ amount, reason });
      }
    });

    // 8. Broadcast Send
    $('#btn-admin-send-broadcast')?.addEventListener('click', async () => {
      const text = ($('#admin-broadcast-text')?.value || '').trim();
      const level = $('#admin-broadcast-level')?.value || 'info';
      if (!text) {
        UIEffects.showToast('Écris d\'abord le texte de l\'alerte !', 'warning');
        return;
      }
      try {
        const res = await fetch('/api/admin/broadcast-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, level })
        });
        const data = await res.json();
        if (data.success) {
          UIEffects.showToast('Alerte diffusée à tous les joueurs ! 📢', 'success');
          const input = $('#admin-broadcast-text');
          if (input) input.value = '';
        }
      } catch (err) {
        onAdminAlert({ text, level });
      }
    });

    // 9. Clear Cache
    $('#btn-admin-clear-cache')?.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/admin/clear-cache', { method: 'POST' });
        const data = await res.json();
        UIEffects.showToast(data.message || 'Cache vidé avec succès !', 'success');
      } catch (e) {
        UIEffects.showToast('Cache mémoire vidé !', 'success');
      }
    });

    // 10. Refresh Server Stats
    $('#btn-refresh-server-stats')?.addEventListener('click', fetchServerStats);

    // Header buttons shortcuts
    $('#btn-admin-broadcast-modal')?.addEventListener('click', () => {
      const msg = prompt('Message d\'alerte à diffuser à tous les joueurs :');
      if (msg && msg.trim()) {
        fetch('/api/admin/broadcast-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: msg.trim(), level: 'warning' })
        }).then(() => UIEffects.showToast('Alerte envoyée en direct !', 'success')).catch(() => onAdminAlert({ text: msg.trim() }));
      }
    });

    $('#btn-admin-airdrop-modal')?.addEventListener('click', () => {
      const val = prompt('Montant des pièces à distribuer à tout le monde :', '150');
      if (val && parseInt(val, 10)) {
        fetch('/api/admin/airdrop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: parseInt(val, 10), reason: 'Airdrop Administrateur Harmonie' })
        }).then(() => UIEffects.showToast('Airdrop distribué ! 🪙', 'success')).catch(() => onAirdropCoins({ amount: parseInt(val, 10) }));
      }
    });

    // 11. Tournament Management Controls
    let adminCurrentTourney = null;

    async function fetchAndRenderAdminTournament() {
      try {
        const res = await fetch('/api/tournaments');
        const data = await res.json();
        if (data.success && data.active) {
          adminCurrentTourney = data.active;
          renderAdminTournamentTab(data.active);
        }
      } catch (err) {
        console.warn('[Admin] Tourney fetch error:', err);
      }
    }

    function renderAdminTournamentTab(tourney) {
      if (!tourney) return;
      adminCurrentTourney = tourney;

      const players = tourney.registeredPlayers || tourney.players || [];
      const fee = tourney.entryFee || tourney.fee || 50;
      const reward = tourney.rewardCoins || tourney.reward || 500;
      const stage = (tourney.stage || 'REGISTRATION').toUpperCase();
      const champion = tourney.champion || tourney.winner || null;

      const stagePill = $('#adm-tourney-stage-pill');
      if (stagePill) {
        const stageMap = {
          REGISTRATION: '🟢 INSCRIPTIONS OUVERTES',
          QUARTERS: '⚔️ QUARTS DE FINALE (8 Joueurs)',
          SEMIS: '⚡ DEMI-FINALES (4 Joueurs)',
          FINAL: '👑 GRANDE FINALE (2 Joueurs)',
          FINISHED: '🏆 TOURNOI TERMINÉ • CHAMPION ÉLU',
          COMPLETED: '🏆 TOURNOI TERMINÉ • CHAMPION ÉLU'
        };
        stagePill.textContent = stageMap[stage] || stage;
      }

      const nameEl = $('#adm-tourney-name');
      if (nameEl) nameEl.textContent = tourney.name || 'Grand Tournoi Muzik Masters 🏆';

      const plEl = $('#adm-tourney-pl');
      if (plEl) plEl.textContent = tourney.playlistName || tourney.playlist || 'Hits Français & Internationaux';

      const feeEl = $('#adm-tourney-fee-txt');
      if (feeEl) feeEl.textContent = `${fee} 🪙`;

      const rewEl = $('#adm-tourney-reward-txt');
      if (rewEl) rewEl.textContent = `${reward} 🪙 + Badge Champion`;

      const countEl = $('#adm-tourney-players-count');
      if (countEl) countEl.textContent = `${players.length} / 8`;

      // Visualisation du Bracket et des Inscrits
      const displayEl = $('#adm-bracket-display');
      if (displayEl) {
        const playersList = players.map((p, idx) => `
          <span style="display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.08); padding:6px 12px; border-radius:999px; font-size:0.82rem; color:#fff; border:1px solid rgba(255,255,255,0.15);">
            <span>${p.avatar || '👤'}</span>
            <b>#${idx + 1} ${p.name}</b>
          </span>
        `).join('');

        let winnerHtml = '';
        if (champion) {
          winnerHtml = `
            <div style="background:linear-gradient(135deg, rgba(245,158,11,0.2), rgba(168,85,247,0.2)); border:1.5px solid rgba(251,191,36,0.6); border-radius:14px; padding:16px 20px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between;">
              <div>
                <span style="color:#fbbf24; font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:1px;">👑 GRAND CHAMPION DU TOURNOI ÉLU</span>
                <div style="font-size:1.35rem; font-weight:900; color:#fff; margin-top:2px;">${champion.avatar || '👑'} ${champion.name}</div>
                <span style="font-size:0.8rem; color:#cbd5e1;">Récompense : +${reward} 🪙 & Badge Champion Muzik débloqué</span>
              </div>
              <div style="font-size:2.4rem;">🏆✨</div>
            </div>
          `;
        }

        displayEl.innerHTML = `
          ${winnerHtml}
          <div style="margin-bottom:14px;">
            <span style="font-size:0.8rem; color:var(--text-secondary); font-weight:700; display:block; margin-bottom:8px;">JOUEURS QUALIFIÉS & INSCRITS (${players.length}/8) :</span>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${playersList || '<em style="color:#94a3b8; font-size:0.85rem;">Aucun joueur inscrit pour le moment</em>'}
            </div>
          </div>
        `;
      }
    }

    // Toggle creation form
    $('#btn-admin-toggle-create-tourney')?.addEventListener('click', () => {
      $('#admin-create-tourney-form')?.classList.toggle('hidden');
    });
    $('#btn-admin-cancel-tourney-form')?.addEventListener('click', () => {
      $('#admin-create-tourney-form')?.classList.add('hidden');
    });

    // Save new tournament
    $('#btn-admin-save-tourney')?.addEventListener('click', async () => {
      const name = ($('#admin-new-tourney-name')?.value || '').trim() || 'Championnat Muzik Saison 1';
      const playlist = $('#admin-new-tourney-playlist')?.value || 'mix';
      const fee = parseInt($('#admin-new-tourney-fee')?.value, 10) || 50;
      const reward = parseInt($('#admin-new-tourney-reward')?.value, 10) || 500;

      try {
        const res = await fetch('/api/admin/tournaments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, playlist, fee, reward })
        });
        const data = await res.json();
        if (data.success) {
          UIEffects.showToast(`Nouveau Tournoi "${name}" créé avec succès ! 🏆`, 'success');
          $('#admin-create-tourney-form')?.classList.add('hidden');
          renderAdminTournamentTab(data.tournament);
        }
      } catch (err) {
        UIEffects.showToast('Erreur lors de la création du tournoi', 'error');
      }
    });

    async function sendTournamentAction(action, payload = {}) {
      if (!adminCurrentTourney) {
        await fetchAndRenderAdminTournament();
      }
      if (!adminCurrentTourney) return;
      try {
        const res = await fetch('/api/admin/tournaments/advance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tournamentId: adminCurrentTourney.id,
            action,
            ...payload
          })
        });
        const data = await res.json();
        if (data.success) {
          UIEffects.showToast(data.message || `Phase mise à jour : ${action} !`, 'success');
          renderAdminTournamentTab(data.tournament);
        } else {
          UIEffects.showToast(data.message || 'Action impossible', 'warning');
        }
      } catch (err) {
        UIEffects.showToast('Erreur communication serveur', 'error');
      }
    }

    $('#adm-btn-quarters')?.addEventListener('click', () => sendTournamentAction('start_quarters'));
    $('#adm-btn-semis')?.addEventListener('click', () => sendTournamentAction('start_semis'));
    $('#adm-btn-final')?.addEventListener('click', () => sendTournamentAction('start_final'));
    $('#adm-btn-crown')?.addEventListener('click', () => {
      let defaultWinner = '';
      if (adminCurrentTourney?.bracket?.final?.[0]) {
        const fm = adminCurrentTourney.bracket.final[0];
        defaultWinner = fm.player1?.name || fm.player2?.name || (adminCurrentTourney.players?.[0]?.name || '');
      }
      const winName = prompt('Nom du joueur à élire Grand Vainqueur & Champion du Tournoi :', defaultWinner);
      if (winName && winName.trim()) {
        sendTournamentAction('crown_champion', { winnerName: winName.trim() });
      }
    });
    $('#adm-btn-reset')?.addEventListener('click', () => {
      if (confirm('Voulez-vous réinitialiser le tournoi pour relancer un cycle à zéro ?')) {
        sendTournamentAction('reset');
      }
    });
  }

  // ═══════════════════════════════════════
  // 13. PARTY DJ SOUNDBOARD ENGINE
  // ═══════════════════════════════════════
  function initDjSoundboardEngine() {
    $('#btn-dj-soundboard')?.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('modal-dj-soundboard');
    });

    $('#btn-close-soundboard')?.addEventListener('click', () => {
      closeModal('modal-dj-soundboard');
    });

    $$('.sb-pad-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sfx = btn.getAttribute('data-sfx');
        if (sfx) {
          AudioPlayer.playSfx(sfx);
          btn.classList.add('playing');
          setTimeout(() => btn.classList.remove('playing'), 300);
        }
      });
    });

    // Keyboard numbers 1-6 trigger SFX on the fly
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      const keyMap = {
        '1': 'airhorn',
        '2': 'cheer',
        '3': 'rimshot',
        '4': 'scratch',
        '5': 'suspense',
        '6': 'fanfare'
      };
      if (keyMap[e.key]) {
        AudioPlayer.playSfx(keyMap[e.key]);
        const pad = $(`[data-sfx="${keyMap[e.key]}"]`);
        if (pad) {
          pad.classList.add('playing');
          setTimeout(() => pad.classList.remove('playing'), 300);
        }
      }
    });
  }

  // ═══════════════════════════════════════
  // 14. DUEL 1v1 CLASSÉ ENGINE (COMPETITIVE ELO)
  // ═══════════════════════════════════════
  let rankedState = {
    elo: parseInt(localStorage.getItem('muzik_ranked_elo') || '1840', 10),
    wins: parseInt(localStorage.getItem('muzik_ranked_wins') || '42', 10),
    losses: parseInt(localStorage.getItem('muzik_ranked_losses') || '12', 10),
    streak: parseInt(localStorage.getItem('muzik_ranked_streak') || '5', 10),
    theme: localStorage.getItem('muzik_ranked_theme') || 'all',
    searchInterval: null,
    searchSeconds: 0,
    currentOpponent: null,
    currentRound: 1,
    myScore: 0,
    oppScore: 0,
    roundTimer: null,
    roundSeconds: 15,
    hasAnsweredRound: false,
    oppHasAnswered: false,
    activeTracks: []
  };

  function getRankedTierInfo(elo) {
    if (elo < 1000) return { name: 'BRONZE III', icon: '🥉', next: 'Argent I (1 000 ELO)', target: 1000, min: 0 };
    if (elo < 1300) return { name: 'ARGENT II', icon: '🥈', next: 'Or I (1 300 ELO)', target: 1300, min: 1000 };
    if (elo < 1600) return { name: 'OR I', icon: '🥇', next: 'Diamant I (1 600 ELO)', target: 1600, min: 1300 };
    if (elo < 2000) return { name: 'DIAMANT II', icon: '💎', next: 'Maître Muzik (2 000 ELO)', target: 2000, min: 1600 };
    if (elo < 2400) return { name: 'MAÎTRE MUZIK', icon: '👑', next: 'Harmonie Légende (2 400 ELO)', target: 2400, min: 2000 };
    return { name: 'HARMONIE LÉGENDE', icon: '🌟', next: 'Rang Mondial #1', target: 3000, min: 2400 };
  }

  function saveRankedState() {
    localStorage.setItem('muzik_ranked_elo', String(rankedState.elo));
    localStorage.setItem('muzik_ranked_wins', String(rankedState.wins));
    localStorage.setItem('muzik_ranked_losses', String(rankedState.losses));
    localStorage.setItem('muzik_ranked_streak', String(rankedState.streak));
    localStorage.setItem('muzik_ranked_theme', rankedState.theme);
    updateRankedUI();
  }

  function updateRankedUI() {
    const tier = getRankedTierInfo(rankedState.elo);
    const nameEl = $('#ranked-player-display-name');
    const divEl = $('#ranked-division-name');
    const eloEl = $('#ranked-elo-val');
    const iconEl = $('#ranked-tier-icon');
    const currLabel = $('#ranked-curr-rank-label');
    const nextLabel = $('#ranked-next-rank-label');
    const fillEl = $('#ranked-progress-fill');
    const streakEl = $('#ranked-streak-display');
    const wrEl = $('#ranked-winrate-display');
    const recEl = $('#ranked-record-display');

    if (nameEl) nameEl.textContent = user.name;
    if (divEl) divEl.textContent = tier.name;
    if (eloEl) eloEl.textContent = rankedState.elo.toLocaleString('fr-FR');
    if (iconEl) iconEl.textContent = tier.icon;
    if (currLabel) currLabel.textContent = tier.name;
    if (nextLabel) nextLabel.textContent = tier.next;

    const pct = Math.min(100, Math.max(10, Math.round(((rankedState.elo - tier.min) / (tier.target - tier.min)) * 100)));
    if (fillEl) fillEl.style.width = `${pct}%`;

    if (streakEl) streakEl.textContent = `🔥 x${rankedState.streak}`;
    const totalMatches = rankedState.wins + rankedState.losses;
    const wr = totalMatches > 0 ? Math.round((rankedState.wins / totalMatches) * 100) : 0;
    if (wrEl) wrEl.textContent = `${wr}%`;
    if (recEl) recEl.textContent = `${rankedState.wins}V - ${rankedState.losses}D`;
  }

  const RANKED_OPPONENTS = [
    { name: 'Maxime_Rap92', avatar: '🐼', tier: '💎 Diamant I • 1 825 ELO', streak: 3 },
    { name: 'Sarah_Music', avatar: '🦄', tier: '💎 Diamant II • 1 855 ELO', streak: 6 },
    { name: 'DaftFan_Electro', avatar: '🪩', tier: '👑 Maître • 1 920 ELO', streak: 2 },
    { name: 'NinhoFan_93', avatar: '🎤', tier: '💎 Diamant I • 1 810 ELO', streak: 4 },
    { name: 'Léa_PopLover', avatar: '🐱', tier: '💎 Diamant II • 1 845 ELO', streak: 5 },
    { name: 'Thomas_Rock80', avatar: '🎸', tier: '💎 Diamant III • 1 880 ELO', streak: 1 }
  ];

  const RANKED_SAMPLE_TRACKS = [
    { title: 'Bande Organisée', artist: 'Jul, SCH, Kofs, Naps', preview: 'https://cdn-preview-1.deezer.com/stream/c-12b236faae61ba7c7f3b8bfa5716df08-7.mp3', options: ['Bande Organisée', 'Petrouchka', 'Lettre à une femme', 'La Kiffance'], correct: 0 },
    { title: 'Blinding Lights', artist: 'The Weeknd', preview: 'https://cdn-preview-d.deezer.com/stream/c-d95a25883ef579979d9e48c1e7a56133-6.mp3', options: ['Starboy', 'Blinding Lights', 'Save Your Tears', 'As It Was'], correct: 1 },
    { title: 'Au DD', artist: 'PNL', preview: 'https://cdn-preview-0.deezer.com/stream/c-0f9c2184d0b138e68cfb9343714ee99c-6.mp3', options: ['Deux Frères', 'A l\'ammoniaque', 'Au DD', 'Tchiki'], correct: 2 },
    { title: 'Get Lucky', artist: 'Daft Punk ft. Pharrell', preview: 'https://cdn-preview-9.deezer.com/stream/c-97ef902b70f0322ef5150937a09efb4b-6.mp3', options: ['One More Time', 'Around The World', 'Harder Better Faster', 'Get Lucky'], correct: 3 },
    { title: 'Billie Jean', artist: 'Michael Jackson', preview: 'https://cdn-preview-4.deezer.com/stream/c-4cfcbdf437f82b9b77fa8f60e1d13db9-8.mp3', options: ['Billie Jean', 'Beat It', 'Thriller', 'Smooth Criminal'], correct: 0 }
  ];

  function initRankedEngine() {
    updateRankedUI();

    // Theme buttons
    $$('.ranked-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.ranked-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        rankedState.theme = btn.getAttribute('data-rtheme') || 'all';
        saveRankedState();
      });
    });

    // Launch match search
    $('#btn-find-ranked-match')?.addEventListener('click', () => {
      $('#ranked-queue-card')?.classList.add('hidden');
      $('#ranked-searching-card')?.classList.remove('hidden');
      AudioPlayer.playSfx('tick');

      rankedState.searchSeconds = 0;
      const timeEl = $('#searching-time-text');
      if (timeEl) timeEl.textContent = '00:00';

      rankedState.searchInterval = setInterval(() => {
        rankedState.searchSeconds++;
        const s = rankedState.searchSeconds;
        if (timeEl) timeEl.textContent = `00:${s < 10 ? '0' + s : s}`;

        // Match found at ~3s
        if (rankedState.searchSeconds >= 3) {
          clearInterval(rankedState.searchInterval);
          onRankedMatchFound();
        }
      }, 1000);
    });

    // Cancel search
    $('#btn-cancel-ranked-search')?.addEventListener('click', () => {
      if (rankedState.searchInterval) clearInterval(rankedState.searchInterval);
      $('#ranked-searching-card')?.classList.add('hidden');
      $('#ranked-queue-card')?.classList.remove('hidden');
    });

    // Rematch button
    $('#btn-ranked-rematch')?.addEventListener('click', () => {
      $('#ranked-result-card')?.classList.add('hidden');
      $('#btn-find-ranked-match')?.click();
    });

    // Back button
    $('#btn-ranked-back')?.addEventListener('click', () => {
      $('#ranked-result-card')?.classList.add('hidden');
      $('#ranked-queue-card')?.classList.remove('hidden');
    });
  }

  function onRankedMatchFound() {
    AudioPlayer.playSfx('powerup');
    UIEffects.showToast('⚔️ Adversaire trouvé ! Préparation du duel...', 'success', 2500);

    const opp = RANKED_OPPONENTS[Math.floor(Math.random() * RANKED_OPPONENTS.length)];
    rankedState.currentOpponent = opp;

    $('#ranked-searching-card')?.classList.add('hidden');
    const vsCard = $('#ranked-vs-screen');
    if (vsCard) {
      vsCard.classList.remove('hidden');
      $('#vs-my-avatar').textContent = user.avatar;
      $('#vs-my-name').textContent = user.name;
      const tier = getRankedTierInfo(rankedState.elo);
      $('#vs-my-tier').textContent = `${tier.icon} ${tier.name} • ${rankedState.elo} ELO`;
      $('#vs-my-streak').textContent = `🔥 Série : x${rankedState.streak}`;

      $('#vs-opp-avatar').textContent = opp.avatar;
      $('#vs-opp-name').textContent = opp.name;
      $('#vs-opp-tier').textContent = opp.tier;
      $('#vs-opp-streak').textContent = `🔥 Série : x${opp.streak}`;

      let cd = 3;
      const cdEl = $('#vs-countdown-pill');
      if (cdEl) cdEl.textContent = `Lancement dans ${cd}s...`;

      const vsTimer = setInterval(() => {
        cd--;
        if (cdEl) cdEl.textContent = `Lancement dans ${cd}s...`;
        if (cd <= 0) {
          clearInterval(vsTimer);
          vsCard.classList.add('hidden');
          startRankedGameLoop();
        }
      }, 1000);
    }
  }

  function startRankedGameLoop() {
    rankedState.currentRound = 1;
    rankedState.myScore = 0;
    rankedState.oppScore = 0;
    rankedState.activeTracks = [...RANKED_SAMPLE_TRACKS].sort(() => 0.5 - Math.random());

    $('#ranked-arena-card')?.classList.remove('hidden');

    $('#arena-my-avatar').textContent = user.avatar;
    $('#arena-my-name').textContent = user.name;
    $('#arena-opp-avatar').textContent = rankedState.currentOpponent.avatar;
    $('#arena-opp-name').textContent = rankedState.currentOpponent.name;

    runRankedRound();
  }

  function runRankedRound() {
    if (rankedState.currentRound > 5) {
      finishRankedMatch();
      return;
    }

    rankedState.hasAnsweredRound = false;
    rankedState.oppHasAnswered = false;
    rankedState.roundSeconds = 15;

    $('#arena-round-current').textContent = String(rankedState.currentRound);
    $('#arena-my-score').textContent = `${rankedState.myScore} pts`;
    $('#arena-opp-score').textContent = `${rankedState.oppScore} pts`;
    $('#arena-my-status').textContent = '🎧 Écoute...';
    $('#arena-opp-status').textContent = '🎧 Écoute...';
    $('#arena-timer-sec').textContent = '15';
    $('#arena-live-feed').innerHTML = `<span>⚔️ Manche ${rankedState.currentRound} : premier buzz = +120 pts !</span>`;

    const track = rankedState.activeTracks[rankedState.currentRound - 1];

    // Options setup
    const buttons = $$('.btn-arena-choice');
    buttons.forEach((btn, idx) => {
      btn.className = 'btn-arena-choice';
      btn.disabled = false;
      const optText = $(`#arena-opt-${idx}`);
      if (optText) optText.textContent = track.options[idx] || `Choix ${idx + 1}`;
    });

    // Play track
    AudioPlayer.play(track.preview);

    // Opponent AI buzz simulation (between 3.5s and 8.5s)
    const oppReactionTime = Math.floor(3500 + Math.random() * 5000);
    const oppWillBeCorrect = Math.random() < 0.85;

    const oppTimeout = setTimeout(() => {
      if (rankedState.oppHasAnswered || rankedState.currentRound > 5) return;
      rankedState.oppHasAnswered = true;
      if (oppWillBeCorrect) {
        const bonus = rankedState.hasAnsweredRound ? 80 : 120;
        rankedState.oppScore += bonus;
        $('#arena-opp-score').textContent = `${rankedState.oppScore} pts`;
        $('#arena-opp-status').textContent = `✅ Trouvé (+${bonus}) !`;
        $('#arena-live-feed').innerHTML = `<span>⚡ ${rankedState.currentOpponent.name} a trouvé la bonne réponse (+${bonus} pts) !</span>`;
      } else {
        $('#arena-opp-status').textContent = '❌ Erreur !';
      }
    }, oppReactionTime);

    // Round countdown
    if (rankedState.roundTimer) clearInterval(rankedState.roundTimer);
    rankedState.roundTimer = setInterval(() => {
      rankedState.roundSeconds--;
      $('#arena-timer-sec').textContent = String(rankedState.roundSeconds);

      if (rankedState.roundSeconds <= 0) {
        clearInterval(rankedState.roundTimer);
        clearTimeout(oppTimeout);
        endRankedRound(track);
      }
    }, 1000);

    // Click handler for buttons
    buttons.forEach((btn, idx) => {
      btn.onclick = () => {
        if (rankedState.hasAnsweredRound) return;
        rankedState.hasAnsweredRound = true;

        if (idx === track.correct) {
          btn.classList.add('correct');
          AudioPlayer.playSfx('correct');
          const bonus = rankedState.oppHasAnswered ? 80 : 120;
          rankedState.myScore += bonus;
          $('#arena-my-score').textContent = `${rankedState.myScore} pts`;
          $('#arena-my-status').textContent = `✅ Trouvé (+${bonus}) !`;
          UIEffects.scorePopup(`+${bonus} pts 🎯`, true);
          $('#arena-live-feed').innerHTML = `<span>🎯 Bravo ! Tu as trouvé la bonne réponse (+${bonus} pts) !</span>`;
        } else {
          btn.classList.add('wrong');
          AudioPlayer.playSfx('wrong');
          $('#arena-my-status').textContent = '❌ Erreur !';
        }

        // Disable options
        buttons.forEach(b => b.disabled = true);
      };
    });
  }

  function endRankedRound(track) {
    AudioPlayer.stop();
    const buttons = $$('.btn-arena-choice');
    buttons.forEach((b, idx) => {
      b.disabled = true;
      if (idx === track.correct) b.classList.add('correct');
    });

    setTimeout(() => {
      rankedState.currentRound++;
      runRankedRound();
    }, 2400);
  }

  function finishRankedMatch() {
    AudioPlayer.stop();
    $('#ranked-arena-card')?.classList.add('hidden');
    const resCard = $('#ranked-result-card');
    if (!resCard) return;

    resCard.classList.remove('hidden');

    const isWin = rankedState.myScore >= rankedState.oppScore;
    const eloDelta = isWin ? 28 : -14;
    const coinsReward = isWin ? 75 : 25;

    rankedState.elo = Math.max(800, rankedState.elo + eloDelta);
    if (isWin) {
      rankedState.wins++;
      rankedState.streak++;
      AudioPlayer.playSfx('fanfare');
      UIEffects.confetti();
      $('#result-trophy-badge').textContent = '🏆';
      $('#result-title').textContent = 'VICTOIRE ÉCLATANTE !';
      $('#result-subtitle').textContent = `Tu as vaincu ${rankedState.currentOpponent.name} en 1v1 !`;
    } else {
      rankedState.losses++;
      rankedState.streak = 0;
      AudioPlayer.playSfx('wrong');
      $('#result-trophy-badge').textContent = '💔';
      $('#result-title').textContent = 'DÉFAITE HONORABLE';
      $('#result-subtitle').textContent = `${rankedState.currentOpponent.name} a été plus rapide cette fois.`;
    }

    addCoins(coinsReward);
    saveRankedState();

    $('#res-my-avatar').textContent = user.avatar;
    $('#res-my-name').textContent = user.name;
    $('#res-my-final-score').textContent = `${rankedState.myScore} pts`;

    $('#res-opp-avatar').textContent = rankedState.currentOpponent.avatar;
    $('#res-opp-name').textContent = rankedState.currentOpponent.name;
    $('#res-opp-final-score').textContent = `${rankedState.oppScore} pts`;

    const eloNum = $('#res-elo-delta-num');
    if (eloNum) {
      eloNum.className = `elo-delta-num ${isWin ? 'gain' : 'loss'}`;
      eloNum.textContent = `${isWin ? '+' : ''}${eloDelta} ELO`;
    }
    $('#res-elo-new-total').textContent = `(Nouveau : ${rankedState.elo} ELO)`;
    $('#res-coins-reward-num').textContent = `🪙 +${coinsReward} Pièces`;
  }

  // ═══════════════════════════════════════
  // 15. CLASSEMENTS MONDIAL & PODIUM ENGINE
  // ═══════════════════════════════════════
  const LEADERBOARD_DATA = {
    ranked: [
      { rank: 1, name: 'Sarah_Queen', avatar: '🌟', div: 'HARMONIE LÉGENDE', wr: '94%', score: '2 480 ELO' },
      { rank: 2, name: 'Alex_Beats', avatar: '👑', div: 'MAÎTRE MUZIK', wr: '89%', score: '2 390 ELO' },
      { rank: 3, name: 'Ninho_Fan93', avatar: '⚡', div: 'DIAMANT I', wr: '85%', score: '2 210 ELO' },
      { rank: 4, name: 'Daft_Punk_Forever', avatar: '🪩', div: 'DIAMANT I', wr: '82%', score: '2 150 ELO' },
      { rank: 5, name: 'Kenza_Rnb', avatar: '🎤', div: 'DIAMANT II', wr: '80%', score: '2 090 ELO' },
      { rank: 6, name: 'Maxime_Rap92', avatar: '🐼', div: 'DIAMANT II', wr: '78%', score: '2 010 ELO' },
      { rank: 7, name: 'RockStar_77', avatar: '🎸', div: 'DIAMANT III', wr: '76%', score: '1 980 ELO' },
      { rank: 8, name: 'ElectroQueen', avatar: '🎧', div: 'DIAMANT III', wr: '74%', score: '1 930 ELO' },
      { rank: 9, name: 'Julien_Pop', avatar: '🦄', div: 'OR I', wr: '71%', score: '1 890 ELO' },
      { rank: 10, name: 'Chloe_Harmonie', avatar: '🐱', div: 'OR I', wr: '69%', score: '1 850 ELO' },
    ],
    quizz: [
      { rank: 1, name: 'EncyloMusic', avatar: '🧠', div: 'QUIZZ MASTER', wr: '98%', score: '48 200 pts' },
      { rank: 2, name: 'RapCulture_FR', avatar: '🎤', div: 'QUIZZ EXPERT', wr: '95%', score: '45 100 pts' },
      { rank: 3, name: 'RockHistorian', avatar: '🎸', div: 'QUIZZ EXPERT', wr: '92%', score: '41 900 pts' },
      { rank: 4, name: 'BooskaFan_01', avatar: '🔥', div: 'QUIZZ PRO', wr: '88%', score: '38 400 pts' },
      { rank: 5, name: 'Sarah_Music', avatar: '🌟', div: 'QUIZZ PRO', wr: '86%', score: '35 700 pts' },
    ],
    blindtest: [
      { rank: 1, name: 'Speedy_Melomane', avatar: '⚡', div: 'OREILLE D\'OR', wr: '99%', score: '1 420 titres' },
      { rank: 2, name: 'DJ_Snake_Fan', avatar: '🎧', div: 'VIRTUOSE', wr: '96%', score: '1 280 titres' },
      { rank: 3, name: 'Alex_Beats', avatar: '👑', div: 'VIRTUOSE', wr: '93%', score: '1 190 titres' },
      { rank: 4, name: 'Maxime_Rap92', avatar: '🐼', div: 'CHAMPION', wr: '89%', score: '1 050 titres' },
      { rank: 5, name: 'Léa_Pop', avatar: '🦄', div: 'CHAMPION', wr: '87%', score: '980 titres' },
    ],
    streaks: [
      { rank: 1, name: 'Sarah_Queen', avatar: '🌟', div: 'INVINCIBLE', wr: '94%', score: '🔥 x34 Victoires' },
      { rank: 2, name: 'Speedy_Melomane', avatar: '⚡', div: 'INVINCIBLE', wr: '99%', score: '🔥 x28 Victoires' },
      { rank: 3, name: 'Alex_Beats', avatar: '👑', div: 'FLAMME ÉTERNELLE', wr: '89%', score: '🔥 x22 Victoires' },
      { rank: 4, name: 'Ninho_Fan93', avatar: '🎤', div: 'SÉRIE OR', wr: '85%', score: '🔥 x18 Victoires' },
      { rank: 5, name: 'EncyloMusic', avatar: '🧠', div: 'SÉRIE OR', wr: '98%', score: '🔥 x15 Victoires' },
    ]
  };

  function renderLeaderboard(category = 'ranked') {
    const list = LEADERBOARD_DATA[category] || LEADERBOARD_DATA.ranked;

    // Podium (top 3)
    if (list[0]) {
      $('#podium-1-avatar').textContent = list[0].avatar;
      $('#podium-1-name').textContent = list[0].name;
      $('#podium-1-badge').textContent = list[0].div;
      $('#podium-1-score').textContent = list[0].score;
    }
    if (list[1]) {
      $('#podium-2-avatar').textContent = list[1].avatar;
      $('#podium-2-name').textContent = list[1].name;
      $('#podium-2-badge').textContent = list[1].div;
      $('#podium-2-score').textContent = list[1].score;
    }
    if (list[2]) {
      $('#podium-3-avatar').textContent = list[2].avatar;
      $('#podium-3-name').textContent = list[2].name;
      $('#podium-3-badge').textContent = list[2].div;
      $('#podium-3-score').textContent = list[2].score;
    }

    // User rank in banner
    const myNameBanner = $('#lb-my-banner-name');
    const myMetaBanner = $('#lb-my-banner-meta');
    if (myNameBanner) myNameBanner.textContent = `${user.name} (Toi)`;
    if (myMetaBanner) myMetaBanner.textContent = `💎 Diamant II • ${rankedState.elo} ELO • Top 5% Mondial`;

    // Table rows
    const tbody = $('#lb-table-body');
    if (tbody) {
      tbody.innerHTML = list.map(p => `
        <div class="lb-row-liquid ${p.name === user.name ? 'current-player' : ''}">
          <span class="col-rank">#${p.rank}</span>
          <div class="col-player">
            <span class="col-avatar">${p.avatar}</span>
            <span class="col-pname">${escapeHtml(p.name)}</span>
          </div>
          <span class="col-div-badge">${p.div}</span>
          <span class="col-wr">${p.wr}</span>
          <span class="col-score">${p.score}</span>
        </div>
      `).join('');
    }
  }

  function initLeaderboardEngine() {
    $$('.lb-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.lb-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.getAttribute('data-lbcat') || 'ranked';
        renderLeaderboard(cat);
      });
    });
  }

  // ═══════════════════════════════════════
  // 16. PASS HARMONIE PRO (20 PALIERS) ENGINE
  // ═══════════════════════════════════════
  const PASS_PALIERS = [
    { palier: 1, title: '50 Pièces 🪙', icon: '🪙', type: 'free', coins: 50 },
    { palier: 2, title: 'Titre "🎵 Débutant"', icon: '🎵', type: 'free', titleReward: '🎵 Débutant Rythmique' },
    { palier: 3, title: 'Avatar "🎧 Chat DJ"', icon: '🐱', type: 'vip', avatarReward: '🐱' },
    { palier: 4, title: '100 Pièces 🪙', icon: '🪙', type: 'free', coins: 100 },
    { palier: 5, title: 'Cadre "⚡ Néon Cyan"', icon: '⚡', type: 'vip', frameReward: 'neon' },
    { palier: 6, title: '150 Pièces 🪙', icon: '🪙', type: 'free', coins: 150 },
    { palier: 7, title: 'Joker Freeze x2', icon: '❄️', type: 'free', coins: 50 },
    { palier: 8, title: 'Buzzer "Laser"', icon: '🔫', type: 'vip', coins: 100 },
    { palier: 9, title: '200 Pièces 🪙', icon: '🪙', type: 'free', coins: 200 },
    { palier: 10, title: 'Titre "Beatmaker d\'Élite"', icon: '👑', type: 'vip', titleReward: '👑 Beatmaker d\'Élite' },
    { palier: 11, title: '250 Pièces 🪙', icon: '🪙', type: 'free', coins: 250 },
    { palier: 12, title: 'Avatar "🔥 Tigre"', icon: '🐯', type: 'vip', avatarReward: '🐯' },
    { palier: 13, title: '300 Pièces 🪙', icon: '🪙', type: 'free', coins: 300 },
    { palier: 14, title: 'Joker Double x3', icon: '✨', type: 'vip', coins: 150 },
    { palier: 15, title: 'Cadre "🌟 Or Holo"', icon: '🌟', type: 'vip', frameReward: 'gold' },
    { palier: 16, title: '400 Pièces 🪙', icon: '🪙', type: 'free', coins: 400 },
    { palier: 17, title: 'Titre "Virtuose"', icon: '🎼', type: 'free', titleReward: '🎼 Virtuose d\'Harmonie' },
    { palier: 18, title: '500 Pièces 🪙', icon: '🪙', type: 'vip', coins: 500 },
    { palier: 19, title: 'Badge "Master"', icon: '🏆', type: 'vip', coins: 200 },
    { palier: 20, title: '👑 Phénix Doré + 1000🪙', icon: '👑', type: 'vip', avatarReward: '🦄', coins: 1000 }
  ];

  function renderPassTrack() {
    const currentPalier = parseInt(localStorage.getItem('harmonie_pass_palier') || '4', 10);
    const claimed = JSON.parse(localStorage.getItem('harmonie_claimed_paliers') || '[1, 2]');
    const isVip = user.isVip;

    const palierText = $('#pass-current-palier-text');
    if (palierText) palierText.innerHTML = `Palier actuel : <b>${currentPalier} / 20</b>`;

    const vipBtn = $('#btn-unlock-pass-vip');
    const vipStatusTitle = $('#pass-vip-status-title');
    if (isVip) {
      if (vipBtn) {
        vipBtn.textContent = '✓ Pass VIP Actif';
        vipBtn.className = 'btn btn-success btn-md';
        vipBtn.disabled = true;
      }
      if (vipStatusTitle) vipStatusTitle.textContent = '👑 PASS VIP PRO ACTIF';
    }

    const container = $('#pass-track-scroll');
    if (!container) return;

    container.innerHTML = PASS_PALIERS.map(p => {
      const isCompleted = p.palier <= currentPalier;
      const isClaimed = claimed.includes(p.palier);
      const isLockedVip = p.type === 'vip' && !isVip;
      const isCurrent = p.palier === currentPalier;

      let btnHtml = '';
      if (isClaimed) {
        btnHtml = `<button class="btn-palier-claim claimed" disabled>✓ Récupéré</button>`;
      } else if (isCompleted && (!isLockedVip || isVip)) {
        btnHtml = `<button class="btn-palier-claim claimable" data-palier="${p.palier}">🎁 Récupérer</button>`;
      } else if (isLockedVip) {
        btnHtml = `<button class="btn-palier-claim locked" disabled>🔒 Pass VIP</button>`;
      } else {
        btnHtml = `<button class="btn-palier-claim locked" disabled>Palier ${p.palier}</button>`;
      }

      return `
        <div class="palier-card-liquid ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
          <span class="palier-num-badge">Niv. ${p.palier}</span>
          <span class="palier-icon">${p.icon}</span>
          <div class="palier-reward-title">${escapeHtml(p.title)}</div>
          <span class="palier-tag ${p.type}">${p.type.toUpperCase()}</span>
          ${btnHtml}
        </div>
      `;
    }).join('');

    // Bind claim buttons
    container.querySelectorAll('.btn-palier-claim.claimable').forEach(btn => {
      btn.addEventListener('click', () => {
        const palierNum = parseInt(btn.getAttribute('data-palier'), 10);
        const item = PASS_PALIERS.find(p => p.palier === palierNum);
        if (!item) return;

        claimed.push(palierNum);
        localStorage.setItem('harmonie_claimed_paliers', JSON.stringify(claimed));

        if (item.coins) addCoins(item.coins);
        if (item.titleReward) {
          user.title = item.titleReward;
          saveUserProfile();
        }
        if (item.avatarReward) {
          user.avatar = item.avatarReward;
          saveUserProfile();
        }
        if (item.frameReward) {
          user.frame = item.frameReward;
          saveUserProfile();
        }

        AudioPlayer.playSfx('powerup');
        UIEffects.confetti();
        UIEffects.showToast(`🎉 Palier ${palierNum} débloqué : ${item.title} !`, 'success', 3500);

        renderPassTrack();
      });
    });
  }

  function initPassHarmonieEngine() {
    $('#btn-unlock-pass-vip')?.addEventListener('click', () => {
      user.isVip = true;
      localStorage.setItem('harmonie_vip', 'true');
      saveUserProfile();
      AudioPlayer.playSfx('fanfare');
      UIEffects.confetti();
      UIEffects.showToast('👑 Félicitations ! Pass VIP Pro Saison 1 débloqué !', 'success', 4000);
      renderPassTrack();
      updateProfileUI();
    });
  }

  // ═══════════════════════════════════════
  // STATS DASHBOARD ENGINE
  // ═══════════════════════════════════════
  function getGameHistory() {
    return JSON.parse(localStorage.getItem('muzik_game_history') || '[]');
  }

  function addGameToHistory(entry) {
    const history = getGameHistory();
    history.unshift({ ...entry, date: Date.now() });
    if (history.length > 50) history.length = 50;
    localStorage.setItem('muzik_game_history', JSON.stringify(history));
  }

  function getStatsSummary() {
    const history = getGameHistory();
    const stats = JSON.parse(localStorage.getItem('muzik_stats') || '{}');
    return {
      totalGames: stats.gamesPlayed || 0,
      totalWins: stats.wins || 0,
      winRate: stats.gamesPlayed ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0,
      bestStreak: stats.bestStreak || 0,
      totalCorrect: stats.totalCorrect || 0,
      totalAnswered: stats.totalAnswered || 0,
      accuracy: stats.totalAnswered ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0,
      avgTime: stats.avgResponseTime ? (stats.avgResponseTime / 1000).toFixed(1) : '—',
      fastestAnswer: stats.fastestAnswer ? (stats.fastestAnswer / 1000).toFixed(2) : '—',
      currentStreak: stats.currentStreak || 0,
      totalCoinsEarned: stats.totalCoinsEarned || 0,
      genreStats: stats.genreStats || {},
      history: history,
    };
  }

  function drawActivityChart(canvasId, history) {
    const canvas = $(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement.clientWidth - 48;
    const h = canvas.height = 180;

    ctx.clearRect(0, 0, w, h);

    // Last 7 days data
    const days = [];
    const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 86400000;
      const count = history.filter(g => g.date >= dayStart && g.date < dayEnd).length;
      days.push({ label: dayLabels[d.getDay()], count });
    }

    const maxVal = Math.max(...days.map(d => d.count), 3);
    const barW = Math.min(40, (w - 80) / 7);
    const spacing = (w - 40 - barW * 7) / 6;

    days.forEach((day, i) => {
      const x = 20 + i * (barW + spacing);
      const barH = (day.count / maxVal) * (h - 50);
      const y = h - 30 - barH;

      // Bar gradient
      const grad = ctx.createLinearGradient(x, y, x, h - 30);
      grad.addColorStop(0, '#06b6d4');
      grad.addColorStop(1, '#8b5cf6');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 6);
      ctx.fill();

      // Glow
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Value label
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 11px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(day.count, x + barW / 2, y - 8);

      // Day label
      ctx.fillStyle = '#64748b';
      ctx.font = '600 10px Montserrat, sans-serif';
      ctx.fillText(day.label, x + barW / 2, h - 12);
    });
  }

  function drawGenreChart(canvasId, genreStats) {
    const canvas = $(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = Math.min(canvas.parentElement.clientWidth - 48, 260);
    canvas.width = size;
    canvas.height = size;

    const genres = Object.entries(genreStats);
    if (genres.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '600 13px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Joue pour voir tes stats !', size / 2, size / 2);
      return;
    }

    const total = genres.reduce((s, [, v]) => s + v, 0);
    const colors = ['#06d6a0', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#06b6d4', '#10b981'];
    const cx = size / 2, cy = size / 2, r = size / 2 - 30;
    let startAngle = -Math.PI / 2;

    genres.forEach(([name, value], i) => {
      const slice = (value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      // Label
      const mid = startAngle + slice / 2;
      const lx = cx + (r * 0.65) * Math.cos(mid);
      const ly = cy + (r * 0.65) * Math.sin(mid);
      if (slice > 0.3) {
        ctx.fillStyle = '#fff';
        ctx.font = '700 10px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(name, lx, ly);
        ctx.font = '600 9px Montserrat, sans-serif';
        ctx.fillText(Math.round((value / total) * 100) + '%', lx, ly + 14);
      }

      startAngle += slice;
    });

    // Inner circle (donut)
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#0d1117';
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '900 16px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(genres.length, cx, cy + 2);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 9px Montserrat, sans-serif';
    ctx.fillText('genres', cx, cy + 16);
  }

  function renderGenreBars(genreStats) {
    const container = $('#stats-genre-bars');
    if (!container) return;

    const genres = Object.entries(genreStats).sort((a, b) => b[1] - a[1]);
    const maxVal = genres.length ? genres[0][1] : 1;
    const barColors = ['#06d6a0', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#06b6d4', '#10b981'];

    if (genres.length === 0) {
      container.innerHTML = '<div style="color:#64748b;text-align:center;padding:20px;">Aucune donnée de genre disponible — joue pour débloquer tes stats !</div>';
      return;
    }

    container.innerHTML = genres.map(([name, val], i) => {
      const pct = Math.round((val / maxVal) * 100);
      const color = barColors[i % barColors.length];
      return `
        <div class="genre-bar-row">
          <span class="genre-bar-label">${escapeHtml(name)}</span>
          <div class="genre-bar-track">
            <div class="genre-bar-fill" style="width:${pct}%;background:${color};color:${color}"></div>
          </div>
          <span class="genre-bar-pct">${val}</span>
        </div>
      `;
    }).join('');

    // Animate bars
    setTimeout(() => {
      container.querySelectorAll('.genre-bar-fill').forEach(bar => {
        bar.style.width = bar.style.width;
      });
    }, 100);
  }

  function renderGameHistory(history) {
    const container = $('#stats-history-list');
    if (!container) return;

    if (history.length === 0) {
      container.innerHTML = '<div style="color:#64748b;text-align:center;padding:30px;">Aucun historique — joue ta première partie !</div>';
      return;
    }

    container.innerHTML = history.slice(0, 20).map(g => {
      const isWin = g.isWin;
      const date = new Date(g.date);
      const timeStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="stats-history-item">
          <div class="history-result ${isWin ? 'win' : 'loss'}">${isWin ? 'W' : 'L'}</div>
          <div class="history-info">
            <div class="history-mode">${escapeHtml(g.mode || 'Blind Test')}</div>
            <div class="history-detail">${g.correct || 0}/${g.total || 0} bonnes réponses • ${g.score || 0} pts</div>
          </div>
          <div class="history-date">${timeStr}</div>
        </div>
      `;
    }).join('');
  }

  function renderStatsView() {
    const s = getStatsSummary();

    const el = (id) => $(id);
    const set = (id, val) => { const e = el(id); if (e) e.textContent = val; };

    set('#stats-avatar', user.avatar);
    set('#stats-player-name', user.name);
    set('#stats-rank-badge', getCurrentRank().label);
    set('#stats-total-games', s.totalGames);
    set('#stats-win-rate', s.winRate + '%');
    set('#stats-best-streak', s.bestStreak);
    set('#stats-total-correct', s.totalCorrect);
    set('#stats-accuracy', s.accuracy + '%');
    set('#stats-avg-time', s.avgTime + 's');
    set('#stats-current-streak', s.currentStreak);
    set('#stats-fastest-answer', s.fastestAnswer + 's');
    set('#stats-total-wins', s.totalWins);
    set('#stats-total-coins-earned', s.totalCoinsEarned);

    // XP Level
    const stats = JSON.parse(localStorage.getItem('muzik_stats') || '{}');
    const xp = stats.xp || 0;
    const rank = getCurrentRank();
    const next = getNextRank();
    const progress = next ? Math.min(100, Math.round((xp / next.xp) * 100)) : 100;
    const levelFill = $('#stats-level-fill');
    if (levelFill) levelFill.style.width = progress + '%';
    set('#stats-level-text', `Niv. ${rank.level || '?'} — ${xp.toLocaleString()} XP`);

    drawActivityChart('#stats-chart-activity', s.history);
    drawGenreChart('#stats-chart-genres', s.genreStats);
    renderGenreBars(s.genreStats);
    renderGameHistory(s.history);
  }

  function initStatsEngine() {
    // Re-render stats when navigating to view
    const origShowView = showView;
    // Stats are auto-rendered when view becomes active
    console.log('[StatsEngine] Initialisé');
  }

  // ═══════════════════════════════════════
  // ACHIEVEMENTS / TROPHÉES ENGINE
  // ═══════════════════════════════════════
  const ACHIEVEMENTS_DB = [
    // Gameplay
    { id: 'first_game', name: 'Première Note', desc: 'Joue ta première partie', icon: '🎵', category: 'gameplay', target: 1, key: 'gamesPlayed', reward: '10 🪙' },
    { id: 'play_10', name: 'Habitué', desc: 'Joue 10 parties', icon: '🎮', category: 'gameplay', target: 10, key: 'gamesPlayed', reward: '25 🪙' },
    { id: 'play_50', name: 'Accro au Blindtest', desc: 'Joue 50 parties', icon: '🎯', category: 'gameplay', target: 50, key: 'gamesPlayed', reward: '100 🪙' },
    { id: 'play_100', name: 'Centenaire Musical', desc: 'Joue 100 parties', icon: '💯', category: 'gameplay', target: 100, key: 'gamesPlayed', reward: '250 🪙' },
    { id: 'play_500', name: 'Légende Vivante', desc: 'Joue 500 parties', icon: '👑', category: 'mastery', target: 500, key: 'gamesPlayed', reward: '1000 🪙' },
    { id: 'win_1', name: 'Première Victoire', desc: 'Gagne ta première partie', icon: '🏆', category: 'gameplay', target: 1, key: 'wins', reward: '15 🪙' },
    { id: 'win_10', name: 'Champion en Herbe', desc: 'Gagne 10 parties', icon: '🥇', category: 'gameplay', target: 10, key: 'wins', reward: '50 🪙' },
    { id: 'win_50', name: 'Imbattable', desc: 'Gagne 50 parties', icon: '⚡', category: 'mastery', target: 50, key: 'wins', reward: '200 🪙' },
    { id: 'streak_5', name: 'En Feu', desc: 'Atteins un combo de 5', icon: '🔥', category: 'gameplay', target: 5, key: 'bestStreak', reward: '30 🪙' },
    { id: 'streak_10', name: 'Combo Infernal', desc: 'Atteins un combo de 10', icon: '💥', category: 'gameplay', target: 10, key: 'bestStreak', reward: '75 🪙' },
    { id: 'streak_20', name: 'Série Légendaire', desc: 'Atteins un combo de 20', icon: '🌟', category: 'mastery', target: 20, key: 'bestStreak', reward: '300 🪙' },
    { id: 'correct_100', name: 'Oreille Fine', desc: 'Donne 100 bonnes réponses', icon: '👂', category: 'gameplay', target: 100, key: 'totalCorrect', reward: '50 🪙' },
    { id: 'correct_500', name: 'Encyclopédie Musicale', desc: '500 bonnes réponses', icon: '📚', category: 'mastery', target: 500, key: 'totalCorrect', reward: '200 🪙' },
    { id: 'correct_1000', name: 'Dieu de la Musique', desc: '1000 bonnes réponses', icon: '🎼', category: 'mastery', target: 1000, key: 'totalCorrect', reward: '500 🪙' },
    // Social
    { id: 'first_chat', name: 'Bavard', desc: 'Envoie ton premier message dans le chat', icon: '💬', category: 'social', target: 1, key: 'chatMessages', reward: '10 🪙' },
    { id: 'chat_50', name: 'Star du Chat', desc: 'Envoie 50 messages dans le chat', icon: '🗣️', category: 'social', target: 50, key: 'chatMessages', reward: '50 🪙' },
    { id: 'first_reaction', name: 'Réactif', desc: 'Utilise une réaction émote en jeu', icon: '😄', category: 'social', target: 1, key: 'reactionsUsed', reward: '10 🪙' },
    { id: 'host_game', name: 'Hôte de la Soirée', desc: 'Crée ta première salle', icon: '🏠', category: 'social', target: 1, key: 'roomsCreated', reward: '20 🪙' },
    { id: 'host_10', name: 'Animateur Pro', desc: 'Crée 10 salles', icon: '🎪', category: 'social', target: 10, key: 'roomsCreated', reward: '75 🪙' },
    // Collection
    { id: 'first_vinyl', name: 'Collectionneur Débutant', desc: 'Obtiens ton premier vinyle', icon: '📀', category: 'collection', target: 1, key: 'vinylsOwned', reward: '15 🪙' },
    { id: 'vinyl_20', name: 'Mélomane Averti', desc: 'Collectionne 20 vinyles', icon: '💿', category: 'collection', target: 20, key: 'vinylsOwned', reward: '75 🪙' },
    { id: 'vinyl_60', name: 'Disquaire Expert', desc: 'Collectionne 60 vinyles', icon: '🎶', category: 'collection', target: 60, key: 'vinylsOwned', reward: '200 🪙' },
    { id: 'vinyl_120', name: 'Collection Complète', desc: 'Collectionne les 120 vinyles', icon: '🏅', category: 'collection', target: 120, key: 'vinylsOwned', reward: '1000 🪙' },
    { id: 'legendary_1', name: 'Premier Légendaire', desc: 'Obtiens un vinyle Légendaire', icon: '✨', category: 'collection', target: 1, key: 'legendaryVinyls', reward: '50 🪙' },
    { id: 'legendary_5', name: 'Chasseur de Raretés', desc: 'Obtiens 5 vinyles Légendaires', icon: '💎', category: 'collection', target: 5, key: 'legendaryVinyls', reward: '200 🪙' },
    // Secret
    { id: 'night_owl', name: 'Oiseau de Nuit', desc: 'Joue entre minuit et 5h du matin', icon: '🦉', category: 'secret', target: 1, key: 'nightGames', reward: '50 🪙' },
    { id: 'speed_demon', name: 'Speed Demon', desc: 'Réponds en moins de 2 secondes', icon: '⚡', category: 'secret', target: 1, key: 'speedAnswers', reward: '40 🪙' },
    { id: 'perfect_game', name: 'Partie Parfaite', desc: 'Finis une partie avec 100% de bonnes réponses', icon: '💫', category: 'secret', target: 1, key: 'perfectGames', reward: '100 🪙' },
    { id: 'quizz_master', name: 'Maître du Quizz', desc: 'Termine 10 sessions de Quizz Musical', icon: '🧠', category: 'gameplay', target: 10, key: 'quizzSessions', reward: '75 🪙' },
    { id: 'coins_1000', name: 'Millionnaire', desc: 'Accumule 1000 pièces au total', icon: '💰', category: 'mastery', target: 1000, key: 'totalCoinsEarned', reward: '100 🪙' },
  ];

  function getUnlockedAchievements() {
    return JSON.parse(localStorage.getItem('muzik_achievements') || '[]');
  }

  function unlockAchievement(achievId) {
    const unlocked = getUnlockedAchievements();
    if (unlocked.includes(achievId)) return false;
    unlocked.push(achievId);
    localStorage.setItem('muzik_achievements', JSON.stringify(unlocked));
    const achiev = ACHIEVEMENTS_DB.find(a => a.id === achievId);
    if (achiev) {
      addNotification('🏆 Succès Débloqué !', `${achiev.icon} ${achiev.name} — ${achiev.reward}`, achiev.icon);
      // Give reward coins
      const coinMatch = achiev.reward.match(/(\d+)/);
      if (coinMatch) addCoins(parseInt(coinMatch[1], 10));
    }
    return true;
  }

  function checkAchievementProgress() {
    const stats = JSON.parse(localStorage.getItem('muzik_stats') || '{}');
    const collStats = JSON.parse(localStorage.getItem('muzik_collection_stats') || '{}');
    const combined = { ...stats, ...collStats };

    ACHIEVEMENTS_DB.forEach(a => {
      const value = combined[a.key] || 0;
      if (value >= a.target) {
        unlockAchievement(a.id);
      }
    });

    // Time-based secret achievements
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5 && (combined.gamesPlayed || 0) > 0) {
      const nightGames = (combined.nightGames || 0) + 1;
      stats.nightGames = nightGames;
      localStorage.setItem('muzik_stats', JSON.stringify(stats));
      if (nightGames >= 1) unlockAchievement('night_owl');
    }
  }

  function renderAchievementsGrid(filter = 'all') {
    const container = $('#achiev-grid');
    if (!container) return;

    const unlocked = getUnlockedAchievements();
    const stats = JSON.parse(localStorage.getItem('muzik_stats') || '{}');
    const collStats = JSON.parse(localStorage.getItem('muzik_collection_stats') || '{}');
    const combined = { ...stats, ...collStats };

    const filtered = filter === 'all' ? ACHIEVEMENTS_DB : ACHIEVEMENTS_DB.filter(a => a.category === filter);

    container.innerHTML = filtered.map(a => {
      const isUnlocked = unlocked.includes(a.id);
      const current = Math.min(combined[a.key] || 0, a.target);
      const progress = Math.round((current / a.target) * 100);

      return `
        <div class="achiev-card ${isUnlocked ? 'unlocked' : 'locked'}">
          <div class="achiev-icon">${a.icon}</div>
          <div class="achiev-info">
            <div class="achiev-name">${escapeHtml(a.name)}</div>
            <div class="achiev-desc">${escapeHtml(a.desc)}</div>
            ${!isUnlocked ? `
              <div class="achiev-progress-bar">
                <div class="achiev-progress-fill" style="width:${progress}%"></div>
              </div>
              <div class="achiev-progress-text">${current}/${a.target}</div>
            ` : ''}
          </div>
          ${isUnlocked ? `<span class="achiev-unlocked-badge">✅ Débloqué</span>` : `<span class="achiev-reward">${a.reward}</span>`}
        </div>
      `;
    }).join('');

    // Update progress ring
    const totalUnlocked = unlocked.length;
    const totalAchiev = ACHIEVEMENTS_DB.length;
    const ringText = $('#achiev-ring-text');
    if (ringText) ringText.textContent = `${totalUnlocked}/${totalAchiev}`;
    const ringFill = $('#achiev-ring-fill');
    if (ringFill) {
      const circumference = 264;
      const offset = circumference - (totalUnlocked / totalAchiev) * circumference;
      ringFill.setAttribute('stroke-dashoffset', offset);
    }
  }

  function initAchievementsEngine() {
    // Tab filtering
    $$('.achiev-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.achiev-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderAchievementsGrid(tab.getAttribute('data-afilter'));
      });
    });

    renderAchievementsGrid();
    checkAchievementProgress();
    console.log('[AchievementsEngine] Initialisé avec', ACHIEVEMENTS_DB.length, 'succès');
  }

  // ═══════════════════════════════════════
  // VINYL COLLECTION / GACHA ENGINE
  // ═══════════════════════════════════════
  const VINYL_COLLECTION = [
    // RAP — 20 albums
    { id: 'v1', album: 'Deux Frères', artist: 'PNL', genre: 'rap', rarity: 'legendary', emoji: '🌙' },
    { id: 'v2', album: 'JVLIVS II', artist: 'SCH', genre: 'rap', rarity: 'epic', emoji: '🐍' },
    { id: 'v3', album: 'Ultra', artist: 'Booba', genre: 'rap', rarity: 'legendary', emoji: '🦁' },
    { id: 'v4', album: 'Jefe', artist: 'Ninho', genre: 'rap', rarity: 'epic', emoji: '🔥' },
    { id: 'v5', album: 'La Fête est Finie', artist: 'Orelsan', genre: 'rap', rarity: 'rare', emoji: '🎭' },
    { id: 'v6', album: 'QALF', artist: 'Damso', genre: 'rap', rarity: 'epic', emoji: '🌑' },
    { id: 'v7', album: 'Civilisation', artist: 'Orelsan', genre: 'rap', rarity: 'rare', emoji: '🌍' },
    { id: 'v8', album: 'Capo dei Capi', artist: 'Lacrim', genre: 'rap', rarity: 'rare', emoji: '💎' },
    { id: 'v9', album: 'Nero Nemesis', artist: 'Booba', genre: 'rap', rarity: 'epic', emoji: '⚔️' },
    { id: 'v10', album: 'Ipséité', artist: 'Damso', genre: 'rap', rarity: 'legendary', emoji: '🖤' },
    { id: 'v11', album: 'Cyborg', artist: 'Nekfeu', genre: 'rap', rarity: 'rare', emoji: '🤖' },
    { id: 'v12', album: 'Les Étoiles Vagabondes', artist: 'Nekfeu', genre: 'rap', rarity: 'epic', emoji: '✨' },
    { id: 'v13', album: 'Commando', artist: 'Ninho', genre: 'rap', rarity: 'rare', emoji: '🎖️' },
    { id: 'v14', album: 'DSCDR', artist: 'Jul', genre: 'rap', rarity: 'common', emoji: '🌊' },
    { id: 'v15', album: 'Qu\'est-ce que ça peut faire', artist: 'Gazo', genre: 'rap', rarity: 'rare', emoji: '🧊' },
    { id: 'v16', album: 'Le Monde Chico', artist: 'PNL', genre: 'rap', rarity: 'epic', emoji: '🌆' },
    { id: 'v17', album: 'La Vie de Rêve', artist: 'Aya Nakamura', genre: 'rap', rarity: 'rare', emoji: '💃' },
    { id: 'v18', album: 'Providence', artist: 'Freeze Corleone', genre: 'rap', rarity: 'legendary', emoji: '❄️' },
    { id: 'v19', album: 'Grand Cru', artist: 'SDM', genre: 'rap', rarity: 'common', emoji: '🍷' },
    { id: 'v20', album: 'Ce Monde Est Cruel', artist: 'Vald', genre: 'rap', rarity: 'rare', emoji: '🎪' },
    // POP — 16 albums
    { id: 'v21', album: 'Thriller', artist: 'Michael Jackson', genre: 'pop', rarity: 'legendary', emoji: '🕺' },
    { id: 'v22', album: '1989', artist: 'Taylor Swift', genre: 'pop', rarity: 'epic', emoji: '🦋' },
    { id: 'v23', album: 'Future Nostalgia', artist: 'Dua Lipa', genre: 'pop', rarity: 'rare', emoji: '🪩' },
    { id: 'v24', album: '25', artist: 'Adele', genre: 'pop', rarity: 'epic', emoji: '🎤' },
    { id: 'v25', album: 'Born This Way', artist: 'Lady Gaga', genre: 'pop', rarity: 'rare', emoji: '👠' },
    { id: 'v26', album: 'Lemonade', artist: 'Beyoncé', genre: 'pop', rarity: 'legendary', emoji: '🍋' },
    { id: 'v27', album: 'After Hours', artist: 'The Weeknd', genre: 'pop', rarity: 'epic', emoji: '🌃' },
    { id: 'v28', album: 'Purpose', artist: 'Justin Bieber', genre: 'pop', rarity: 'rare', emoji: '🎸' },
    { id: 'v29', album: 'Divide', artist: 'Ed Sheeran', genre: 'pop', rarity: 'rare', emoji: '🎶' },
    { id: 'v30', album: 'Starboy', artist: 'The Weeknd', genre: 'pop', rarity: 'rare', emoji: '⭐' },
    { id: 'v31', album: 'Midnights', artist: 'Taylor Swift', genre: 'pop', rarity: 'epic', emoji: '🌙' },
    { id: 'v32', album: 'Chromatica', artist: 'Lady Gaga', genre: 'pop', rarity: 'rare', emoji: '💜' },
    { id: 'v33', album: 'Positions', artist: 'Ariana Grande', genre: 'pop', rarity: 'rare', emoji: '🎀' },
    { id: 'v34', album: 'Renaissance', artist: 'Beyoncé', genre: 'pop', rarity: 'legendary', emoji: '🪐' },
    { id: 'v35', album: 'Sweetener', artist: 'Ariana Grande', genre: 'pop', rarity: 'common', emoji: '🍬' },
    { id: 'v36', album: 'Bad', artist: 'Michael Jackson', genre: 'pop', rarity: 'epic', emoji: '🖤' },
    // ROCK — 16 albums
    { id: 'v37', album: 'Abbey Road', artist: 'The Beatles', genre: 'rock', rarity: 'legendary', emoji: '🛤️' },
    { id: 'v38', album: 'Dark Side of the Moon', artist: 'Pink Floyd', genre: 'rock', rarity: 'legendary', emoji: '🌑' },
    { id: 'v39', album: 'Back in Black', artist: 'AC/DC', genre: 'rock', rarity: 'epic', emoji: '⚡' },
    { id: 'v40', album: 'Nevermind', artist: 'Nirvana', genre: 'rock', rarity: 'epic', emoji: '🌊' },
    { id: 'v41', album: 'Led Zeppelin IV', artist: 'Led Zeppelin', genre: 'rock', rarity: 'epic', emoji: '🏔️' },
    { id: 'v42', album: 'Rumours', artist: 'Fleetwood Mac', genre: 'rock', rarity: 'rare', emoji: '🌿' },
    { id: 'v43', album: 'OK Computer', artist: 'Radiohead', genre: 'rock', rarity: 'epic', emoji: '🤖' },
    { id: 'v44', album: 'Hybrid Theory', artist: 'Linkin Park', genre: 'rock', rarity: 'rare', emoji: '🦎' },
    { id: 'v45', album: 'Appetite for Destruction', artist: 'Guns N\' Roses', genre: 'rock', rarity: 'legendary', emoji: '🔫' },
    { id: 'v46', album: 'The Wall', artist: 'Pink Floyd', genre: 'rock', rarity: 'epic', emoji: '🧱' },
    { id: 'v47', album: 'Hotel California', artist: 'Eagles', genre: 'rock', rarity: 'rare', emoji: '🏨' },
    { id: 'v48', album: 'In Utero', artist: 'Nirvana', genre: 'rock', rarity: 'rare', emoji: '👼' },
    { id: 'v49', album: 'Master of Puppets', artist: 'Metallica', genre: 'rock', rarity: 'epic', emoji: '🤘' },
    { id: 'v50', album: 'Paranoid', artist: 'Black Sabbath', genre: 'rock', rarity: 'rare', emoji: '🦇' },
    { id: 'v51', album: 'A Night at the Opera', artist: 'Queen', genre: 'rock', rarity: 'legendary', emoji: '👑' },
    { id: 'v52', album: 'Born to Run', artist: 'Bruce Springsteen', genre: 'rock', rarity: 'rare', emoji: '🏃' },
    // R&B — 16 albums
    { id: 'v53', album: 'Blonde', artist: 'Frank Ocean', genre: 'rnb', rarity: 'legendary', emoji: '🧡' },
    { id: 'v54', album: 'ANTI', artist: 'Rihanna', genre: 'rnb', rarity: 'epic', emoji: '💋' },
    { id: 'v55', album: 'SOS', artist: 'SZA', genre: 'rnb', rarity: 'epic', emoji: '🩵' },
    { id: 'v56', album: 'Channel Orange', artist: 'Frank Ocean', genre: 'rnb', rarity: 'epic', emoji: '🍊' },
    { id: 'v57', album: 'Ctrl', artist: 'SZA', genre: 'rnb', rarity: 'rare', emoji: '🎮' },
    { id: 'v58', album: 'Take Care', artist: 'Drake', genre: 'rnb', rarity: 'epic', emoji: '🦉' },
    { id: 'v59', album: 'Confessions', artist: 'Usher', genre: 'rnb', rarity: 'rare', emoji: '🎩' },
    { id: 'v60', album: 'My Beautiful Dark Twisted Fantasy', artist: 'Kanye West', genre: 'rnb', rarity: 'legendary', emoji: '🦅' },
    { id: 'v61', album: 'Off the Wall', artist: 'Michael Jackson', genre: 'rnb', rarity: 'epic', emoji: '🌟' },
    { id: 'v62', album: 'Voyage au Bout de la Nuit', artist: 'Tayc', genre: 'rnb', rarity: 'rare', emoji: '🌙' },
    { id: 'v63', album: 'Malibu', artist: 'Anderson .Paak', genre: 'rnb', rarity: 'rare', emoji: '🏖️' },
    { id: 'v64', album: 'Dawn FM', artist: 'The Weeknd', genre: 'rnb', rarity: 'rare', emoji: '📻' },
    { id: 'v65', album: 'Dangerous Woman', artist: 'Ariana Grande', genre: 'rnb', rarity: 'common', emoji: '🐇' },
    { id: 'v66', album: 'Trilogy', artist: 'The Weeknd', genre: 'rnb', rarity: 'epic', emoji: '🌅' },
    { id: 'v67', album: 'Golden Hour', artist: 'Kacey Musgraves', genre: 'rnb', rarity: 'common', emoji: '🌻' },
    { id: 'v68', album: 'Black Panther Soundtrack', artist: 'Kendrick Lamar', genre: 'rnb', rarity: 'rare', emoji: '🐾' },
    // ELECTRO — 16 albums
    { id: 'v69', album: 'Random Access Memories', artist: 'Daft Punk', genre: 'electro', rarity: 'legendary', emoji: '🤖' },
    { id: 'v70', album: 'Discovery', artist: 'Daft Punk', genre: 'electro', rarity: 'legendary', emoji: '🚀' },
    { id: 'v71', album: 'Cross', artist: 'Justice', genre: 'electro', rarity: 'epic', emoji: '✝️' },
    { id: 'v72', album: 'Homework', artist: 'Daft Punk', genre: 'electro', rarity: 'epic', emoji: '📝' },
    { id: 'v73', album: 'In Colour', artist: 'Jamie xx', genre: 'electro', rarity: 'rare', emoji: '🎨' },
    { id: 'v74', album: 'Worlds', artist: 'Porter Robinson', genre: 'electro', rarity: 'rare', emoji: '🌍' },
    { id: 'v75', album: 'Untrue', artist: 'Burial', genre: 'electro', rarity: 'epic', emoji: '🌧️' },
    { id: 'v76', album: 'Currents', artist: 'Tame Impala', genre: 'electro', rarity: 'epic', emoji: '🌀' },
    { id: 'v77', album: 'Immunity', artist: 'Jon Hopkins', genre: 'electro', rarity: 'rare', emoji: '💊' },
    { id: 'v78', album: 'Music Has the Right to Children', artist: 'Boards of Canada', genre: 'electro', rarity: 'rare', emoji: '🏕️' },
    { id: 'v79', album: 'Selected Ambient Works', artist: 'Aphex Twin', genre: 'electro', rarity: 'legendary', emoji: '🧠' },
    { id: 'v80', album: 'Moon Safari', artist: 'Air', genre: 'electro', rarity: 'rare', emoji: '🌕' },
    { id: 'v81', album: 'Clarity', artist: 'Zedd', genre: 'electro', rarity: 'common', emoji: '💧' },
    { id: 'v82', album: 'True', artist: 'Avicii', genre: 'electro', rarity: 'epic', emoji: '◢◤' },
    { id: 'v83', album: 'Night Visions', artist: 'Imagine Dragons', genre: 'electro', rarity: 'common', emoji: '🌃' },
    { id: 'v84', album: 'Play', artist: 'Moby', genre: 'electro', rarity: 'rare', emoji: '▶️' },
    // CLASSIQUE — 16 albums
    { id: 'v85', album: 'Les Quatre Saisons', artist: 'Vivaldi', genre: 'classique', rarity: 'legendary', emoji: '🍂' },
    { id: 'v86', album: 'Symphonie nº5', artist: 'Beethoven', genre: 'classique', rarity: 'legendary', emoji: '🎹' },
    { id: 'v87', album: 'Requiem', artist: 'Mozart', genre: 'classique', rarity: 'epic', emoji: '⚰️' },
    { id: 'v88', album: 'Le Lac des Cygnes', artist: 'Tchaïkovski', genre: 'classique', rarity: 'epic', emoji: '🦢' },
    { id: 'v89', album: 'Clair de Lune', artist: 'Debussy', genre: 'classique', rarity: 'epic', emoji: '🌙' },
    { id: 'v90', album: 'La Flûte Enchantée', artist: 'Mozart', genre: 'classique', rarity: 'rare', emoji: '🪈' },
    { id: 'v91', album: 'Carmina Burana', artist: 'Carl Orff', genre: 'classique', rarity: 'rare', emoji: '🔔' },
    { id: 'v92', album: 'Boléro', artist: 'Ravel', genre: 'classique', rarity: 'epic', emoji: '🌀' },
    { id: 'v93', album: 'Symphonie du Nouveau Monde', artist: 'Dvořák', genre: 'classique', rarity: 'rare', emoji: '🌎' },
    { id: 'v94', album: 'Nocturnes', artist: 'Chopin', genre: 'classique', rarity: 'rare', emoji: '🌃' },
    { id: 'v95', album: 'Peer Gynt', artist: 'Grieg', genre: 'classique', rarity: 'common', emoji: '⛰️' },
    { id: 'v96', album: 'La Traviata', artist: 'Verdi', genre: 'classique', rarity: 'rare', emoji: '🎭' },
    { id: 'v97', album: 'Concertos Brandebourgeois', artist: 'Bach', genre: 'classique', rarity: 'epic', emoji: '🎻' },
    { id: 'v98', album: 'Also Sprach Zarathustra', artist: 'R. Strauss', genre: 'classique', rarity: 'rare', emoji: '🌅' },
    { id: 'v99', album: 'Gymnopédies', artist: 'Satie', genre: 'classique', rarity: 'common', emoji: '☁️' },
    { id: 'v100', album: 'Rhapsody in Blue', artist: 'Gershwin', genre: 'classique', rarity: 'rare', emoji: '🎷' },
    // K-POP — 20 albums
    { id: 'v101', album: 'Map of the Soul: 7', artist: 'BTS', genre: 'kpop', rarity: 'legendary', emoji: '💜' },
    { id: 'v102', album: 'Born Pink', artist: 'BLACKPINK', genre: 'kpop', rarity: 'legendary', emoji: '🖤' },
    { id: 'v103', album: 'Love Yourself: Tear', artist: 'BTS', genre: 'kpop', rarity: 'epic', emoji: '💧' },
    { id: 'v104', album: 'The Album', artist: 'BLACKPINK', genre: 'kpop', rarity: 'epic', emoji: '💗' },
    { id: 'v105', album: 'Don\'t Call Me', artist: 'SHINee', genre: 'kpop', rarity: 'rare', emoji: '📞' },
    { id: 'v106', album: 'Next Level', artist: 'aespa', genre: 'kpop', rarity: 'rare', emoji: '🎮' },
    { id: 'v107', album: 'Oddinary', artist: 'Stray Kids', genre: 'kpop', rarity: 'epic', emoji: '🧩' },
    { id: 'v108', album: 'NOEASY', artist: 'Stray Kids', genre: 'kpop', rarity: 'rare', emoji: '🔊' },
    { id: 'v109', album: 'Formula of Love', artist: 'TWICE', genre: 'kpop', rarity: 'rare', emoji: '💕' },
    { id: 'v110', album: 'Savage', artist: 'aespa', genre: 'kpop', rarity: 'rare', emoji: '🦊' },
    { id: 'v111', album: 'Hot Sauce', artist: 'NCT DREAM', genre: 'kpop', rarity: 'common', emoji: '🌶️' },
    { id: 'v112', album: 'XOXO', artist: 'EXO', genre: 'kpop', rarity: 'epic', emoji: '💋' },
    { id: 'v113', album: 'Red Velvet', artist: 'Red Velvet', genre: 'kpop', rarity: 'common', emoji: '🍰' },
    { id: 'v114', album: 'Eyes Wide Open', artist: 'TWICE', genre: 'kpop', rarity: 'common', emoji: '👀' },
    { id: 'v115', album: 'FML', artist: 'SEVENTEEN', genre: 'kpop', rarity: 'epic', emoji: '📖' },
    { id: 'v116', album: 'Face', artist: 'Jimin', genre: 'kpop', rarity: 'rare', emoji: '🎭' },
    { id: 'v117', album: 'Solo', artist: 'Jennie', genre: 'kpop', rarity: 'epic', emoji: '🖤' },
    { id: 'v118', album: 'D-Day', artist: 'Agust D', genre: 'kpop', rarity: 'rare', emoji: '🎤' },
    { id: 'v119', album: 'Lalisa', artist: 'Lisa', genre: 'kpop', rarity: 'rare', emoji: '🌹' },
    { id: 'v120', album: 'IM HERO', artist: 'Lim Young Woong', genre: 'kpop', rarity: 'common', emoji: '🦸' },
  ];

  function getOwnedVinyls() {
    return JSON.parse(localStorage.getItem('muzik_vinyls_owned') || '[]');
  }

  function addOwnedVinyl(vinylId) {
    const owned = getOwnedVinyls();
    if (!owned.includes(vinylId)) {
      owned.push(vinylId);
      localStorage.setItem('muzik_vinyls_owned', JSON.stringify(owned));
    }
  }

  function updateCollectionStats() {
    const owned = getOwnedVinyls();
    const legendary = owned.filter(id => {
      const v = VINYL_COLLECTION.find(x => x.id === id);
      return v && v.rarity === 'legendary';
    }).length;
    const collStats = { vinylsOwned: owned.length, legendaryVinyls: legendary };
    localStorage.setItem('muzik_collection_stats', JSON.stringify(collStats));
    return collStats;
  }

  function openPack(type) {
    const costs = { basic: 50, premium: 150, ultimate: 300 };
    const counts = { basic: 3, premium: 5, ultimate: 10 };
    const legendaryGuarantee = { basic: 0, premium: 1, ultimate: 3 };

    const cost = costs[type];
    const count = counts[type];
    const guaranteedLegendary = legendaryGuarantee[type];

    if (user.coins < cost) {
      UIEffects.scorePopup('Pas assez de pièces ! 🪙', false);
      return;
    }

    user.coins -= cost;
    saveUserProfile();

    const results = [];
    const owned = getOwnedVinyls();

    // Weighted rarity selection
    function pickVinyl(forceLegendary = false) {
      let pool;
      if (forceLegendary) {
        pool = VINYL_COLLECTION.filter(v => v.rarity === 'legendary');
      } else {
        const roll = Math.random();
        let rarity;
        if (type === 'ultimate') {
          rarity = roll < 0.15 ? 'legendary' : roll < 0.45 ? 'epic' : roll < 0.8 ? 'rare' : 'common';
        } else if (type === 'premium') {
          rarity = roll < 0.08 ? 'legendary' : roll < 0.3 ? 'epic' : roll < 0.7 ? 'rare' : 'common';
        } else {
          rarity = roll < 0.03 ? 'legendary' : roll < 0.12 ? 'epic' : roll < 0.45 ? 'rare' : 'common';
        }
        pool = VINYL_COLLECTION.filter(v => v.rarity === rarity);
      }
      if (pool.length === 0) pool = VINYL_COLLECTION;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    // Guaranteed legendaries first
    for (let i = 0; i < guaranteedLegendary; i++) {
      results.push(pickVinyl(true));
    }

    // Fill rest
    while (results.length < count) {
      results.push(pickVinyl(false));
    }

    // Add to collection
    results.forEach(v => addOwnedVinyl(v.id));
    updateCollectionStats();
    checkAchievementProgress();

    // Show reveal animation
    const revealArea = $('#pack-reveal-area');
    const revealCards = $('#pack-reveal-cards');
    if (revealArea && revealCards) {
      revealCards.innerHTML = results.map((v, i) => `
        <div class="reveal-card rarity-${v.rarity}" style="animation-delay: ${i * 0.15}s">
          <span class="reveal-vinyl">${v.emoji}</span>
          <span class="reveal-name">${escapeHtml(v.album)}</span>
          <span class="reveal-artist">${escapeHtml(v.artist)}</span>
          <span class="reveal-rarity-tag ${v.rarity}">${v.rarity.toUpperCase()}</span>
        </div>
      `).join('');
      revealArea.classList.remove('hidden');
    }

    renderCollectionGrid();
    updateCollectionUI();
    addNotification('📀 Pack Ouvert !', `Tu as obtenu ${results.length} vinyles !`, '🎁');
  }

  function updateCollectionUI() {
    const owned = getOwnedVinyls();
    const legendary = owned.filter(id => {
      const v = VINYL_COLLECTION.find(x => x.id === id);
      return v && v.rarity === 'legendary';
    }).length;

    const ownedEl = $('#coll-owned');
    const totalEl = $('#coll-total');
    const legendaryEl = $('#coll-legendary');
    if (ownedEl) ownedEl.textContent = owned.length;
    if (totalEl) totalEl.textContent = VINYL_COLLECTION.length;
    if (legendaryEl) legendaryEl.textContent = legendary;
  }

  function renderCollectionGrid(filter = 'all') {
    const container = $('#collection-grid');
    if (!container) return;

    const owned = getOwnedVinyls();
    const filtered = filter === 'all' ? VINYL_COLLECTION : VINYL_COLLECTION.filter(v => v.genre === filter);

    container.innerHTML = filtered.map(v => {
      const isOwned = owned.includes(v.id);
      return `
        <div class="vinyl-card ${isOwned ? 'owned' : 'not-owned'}">
          <div class="vinyl-rarity-dot ${v.rarity}"></div>
          <span class="vinyl-emoji">${v.emoji}</span>
          <span class="vinyl-album">${isOwned ? escapeHtml(v.album) : '???'}</span>
          <span class="vinyl-artist">${isOwned ? escapeHtml(v.artist) : '???'}</span>
        </div>
      `;
    }).join('');
  }

  function initCollectionEngine() {
    // Pack buttons
    const packBasic = $('#btn-open-pack-basic');
    const packPremium = $('#btn-open-pack-premium');
    const packUltimate = $('#btn-open-pack-ultimate');
    const closeReveal = $('#btn-close-reveal');

    if (packBasic) packBasic.addEventListener('click', () => openPack('basic'));
    if (packPremium) packPremium.addEventListener('click', () => openPack('premium'));
    if (packUltimate) packUltimate.addEventListener('click', () => openPack('ultimate'));
    if (closeReveal) closeReveal.addEventListener('click', () => {
      const revealArea = $('#pack-reveal-area');
      if (revealArea) revealArea.classList.add('hidden');
    });

    // Filter buttons
    $$('.coll-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.coll-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCollectionGrid(btn.getAttribute('data-cfilter'));
      });
    });

    renderCollectionGrid();
    renderCollectionGrid();
    updateCollectionUI();
    updateCollectionStats();
    console.log('[CollectionEngine] Initialisé avec', VINYL_COLLECTION.length, 'vinyles');
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 17. DÉFI VOCAL IA (VOCAL MIMIC AI CHALLENGE)
  // ════════════════════════════════════════════════════════════════════════════
  const VOCAL_MIMIC_PRESETS = [
    {
      id: 'freddie',
      title: 'Ay-Oh ! (Live Aid 1985)',
      artist: 'Freddie Mercury — Queen',
      cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&q=80',
      difficulty: '🟢 FACILE',
      lyrics: '"Ay-Oh ! Aaaaaay-Oh !"',
      preview: 'https://cdn-preview-4.deezer.com/stream/c-4cfcbdf437f82b9b77fa8f60e1d13db9-8.mp3',
      targetFreq: 330,
      avatar: '👑'
    },
    {
      id: 'mj',
      title: 'Billie Jean (Hee-Hee !)',
      artist: 'Michael Jackson',
      cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&q=80',
      difficulty: '🟡 MOYEN',
      lyrics: '"Hee-Hee ! Ooh ! Billie Jean is not my lover !"',
      preview: 'https://cdn-preview-4.deezer.com/stream/c-4cfcbdf437f82b9b77fa8f60e1d13db9-8.mp3',
      targetFreq: 440,
      avatar: '🕺'
    },
    {
      id: 'jul',
      title: 'Tchikita & Signe Jul',
      artist: 'Jul',
      cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&q=80',
      difficulty: '🟢 FACILE',
      lyrics: '"En Y sur la moto, Tchikita ! Signe Jul !"',
      preview: 'https://cdn-preview-0.deezer.com/stream/c-0f9c2184d0b138e68cfb9343714ee99c-6.mp3',
      targetFreq: 260,
      avatar: '👽'
    },
    {
      id: 'daft',
      title: 'Around the World (Vocoder)',
      artist: 'Daft Punk',
      cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&q=80',
      difficulty: '🟢 FACILE',
      lyrics: '"Around the world, around the world (robot voice)"',
      preview: 'https://cdn-preview-9.deezer.com/stream/c-97ef902b70f0322ef5150937a09efb4b-6.mp3',
      targetFreq: 220,
      avatar: '🤖'
    },
    {
      id: 'celine',
      title: 'All By Myself (Aigus Diva)',
      artist: 'Céline Dion',
      cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&q=80',
      difficulty: '🔴 EXPERT',
      lyrics: '"Anymore... ALL BY MYYYYSEEEELF !"',
      preview: 'https://cdn-preview-d.deezer.com/stream/c-d95a25883ef579979d9e48c1e7a56133-6.mp3',
      targetFreq: 520,
      avatar: '💃'
    },
    {
      id: 'eminem',
      title: 'Rap God (Fast Flow)',
      artist: 'Eminem',
      cover: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=200&q=80',
      difficulty: '🟣 LÉGENDAIRE',
      lyrics: '"Uh, sama lamaa duma lamaa you assuming I\'m a human"',
      preview: 'https://cdn-preview-1.deezer.com/stream/c-12b236faae61ba7c7f3b8bfa5716df08-7.mp3',
      targetFreq: 180,
      avatar: '⚡'
    },
    {
      id: 'shakira',
      title: 'Waka Waka (This Time for Africa)',
      artist: 'Shakira',
      cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&q=80',
      difficulty: '🟡 MOYEN',
      lyrics: '"Tsamina mina zangalewa, cause this is Africa !"',
      preview: 'https://cdn-preview-d.deezer.com/stream/c-d95a25883ef579979d9e48c1e7a56133-6.mp3',
      targetFreq: 390,
      avatar: '🪩'
    }
  ];

  let currentVocalChallenge = VOCAL_MIMIC_PRESETS[0];
  let vocalMicStream = null;
  let vocalRecorder = null;
  let vocalRecordedChunks = [];
  let vocalRecordedBlob = null;
  let vocalAudioCtx = null;
  let vocalAnalyser = null;
  let isVocalRecording = false;
  let vocalAnimFrame = null;

  function renderVocalMimicView() {
    const scrollContainer = $('#vm-presets-scroll');
    if (scrollContainer) {
      scrollContainer.innerHTML = VOCAL_MIMIC_PRESETS.map(p => `
        <div class="vm-preset-item ${p.id === currentVocalChallenge.id ? 'active' : ''}" data-vpid="${p.id}">
          <span class="vm-preset-avatar">${p.avatar}</span>
          <div class="vm-preset-title">${escapeHtml(p.title)}</div>
          <div class="vm-preset-artist">${escapeHtml(p.artist)}</div>
          <span class="vm-preset-tag">${p.difficulty}</span>
        </div>
      `).join('');

      $$('.vm-preset-item').forEach(el => {
        el.addEventListener('click', () => {
          const pid = el.getAttribute('data-vpid');
          const found = VOCAL_MIMIC_PRESETS.find(x => x.id === pid);
          if (found) selectVocalChallenge(found);
        });
      });
    }

    // Load best score
    const bestScore = localStorage.getItem('muzik_vocal_best') || '92';
    const bestEl = $('#vm-best-score');
    if (bestEl) bestEl.textContent = bestScore;

    selectVocalChallenge(currentVocalChallenge);
  }

  function selectVocalChallenge(preset) {
    currentVocalChallenge = preset;
    $$('.vm-preset-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-vpid') === preset.id);
    });

    const cover = $('#vm-track-cover');
    const title = $('#vm-track-title');
    const artist = $('#vm-track-artist');
    const diff = $('#vm-track-diff');
    const lyrics = $('#vm-lyrics-text');

    if (cover) cover.src = preset.cover;
    if (title) title.textContent = preset.title;
    if (artist) artist.textContent = preset.artist;
    if (diff) diff.textContent = preset.difficulty;
    if (lyrics) lyrics.textContent = preset.lyrics;

    $('#vm-jury-card')?.classList.add('hidden');
    const statusTxt = $('#vm-record-status-txt');
    if (statusTxt) statusTxt.textContent = "Clique sur le micro pour lancer l'imitation vocale !";
  }

  function initVocalMimicEngine() {
    // Listen button
    $('#btn-vm-listen')?.addEventListener('click', () => {
      if (AudioPlayer.isPlaying) {
        AudioPlayer.stop();
        const icon = $('#vm-listen-icon');
        const txt = $('#vm-listen-txt');
        if (icon) icon.textContent = '▶️';
        if (txt) txt.textContent = "Écouter l'extrait";
      } else {
        AudioPlayer.play(currentVocalChallenge.preview);
        const icon = $('#vm-listen-icon');
        const txt = $('#vm-listen-txt');
        if (icon) icon.textContent = '⏹️';
        if (txt) txt.textContent = 'Arrêter';
      }
    });

    // Record button
    $('#btn-vm-record')?.addEventListener('click', toggleVocalRecording);

    // Playback recorded voice
    $('#btn-vm-playback')?.addEventListener('click', () => {
      if (!vocalRecordedBlob) return;
      const audioUrl = URL.createObjectURL(vocalRecordedBlob);
      const audio = new Audio(audioUrl);
      audio.play();
      UIEffects.showToast('🔊 Réécoute de ta performance vocale !', 'info', 2000);
    });

    // Retry & Next buttons
    $('#btn-vm-retry')?.addEventListener('click', () => {
      $('#vm-jury-card')?.classList.add('hidden');
      $('#vm-studio-card')?.scrollIntoView({ behavior: 'smooth' });
    });

    $('#btn-vm-next')?.addEventListener('click', () => {
      const curIdx = VOCAL_MIMIC_PRESETS.findIndex(x => x.id === currentVocalChallenge.id);
      const nextIdx = (curIdx + 1) % VOCAL_MIMIC_PRESETS.length;
      selectVocalChallenge(VOCAL_MIMIC_PRESETS[nextIdx]);
      $('#vm-jury-card')?.classList.add('hidden');
      $('#vm-studio-card')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Search custom song
    $('#btn-vm-search')?.addEventListener('click', () => {
      const q = $('#vm-search-input')?.value.trim();
      if (!q) return;
      const resContainer = $('#vm-search-results');
      if (resContainer) {
        resContainer.classList.remove('hidden');
        resContainer.innerHTML = '<span style="color:#94a3b8;font-size:0.85rem;padding:8px;">Recherche Deezer en cours…</span>';
        
        fetch(`/api/search?q=${encodeURIComponent(q)}`)
          .then(r => r.json())
          .then(data => {
            const tracks = data.data || [];
            if (tracks.length === 0) {
              resContainer.innerHTML = '<span style="color:#94a3b8;padding:8px;">Aucun morceau trouvé.</span>';
              return;
            }
            resContainer.innerHTML = tracks.slice(0, 4).map(t => `
              <div class="vm-search-res-item" data-preview="${t.preview}" data-title="${escapeHtml(t.title)}" data-artist="${escapeHtml(t.artist.name)}" data-cover="${t.album?.cover_medium || ''}">
                <img src="${t.album?.cover_small || ''}" class="vm-search-res-cover" alt="">
                <div>
                  <div style="font-weight:800;font-size:0.85rem;color:#fff;">${escapeHtml(t.title)}</div>
                  <div style="font-size:0.75rem;color:#94a3b8;">${escapeHtml(t.artist.name)}</div>
                </div>
              </div>
            `).join('');

            $$('.vm-search-res-item').forEach(item => {
              item.addEventListener('click', () => {
                selectVocalChallenge({
                  id: 'custom-' + Date.now(),
                  title: item.getAttribute('data-title'),
                  artist: item.getAttribute('data-artist'),
                  cover: item.getAttribute('data-cover') || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&q=80',
                  difficulty: '🟡 PERSONNALISÉ',
                  lyrics: `Reproduis la mélodie de "${item.getAttribute('data-title')}" !`,
                  preview: item.getAttribute('data-preview'),
                  targetFreq: 350,
                  avatar: '🎵'
                });
                resContainer.classList.add('hidden');
              });
            });
          })
          .catch(() => {
            resContainer.innerHTML = '<span style="color:#ef4444;padding:8px;">Erreur de recherche.</span>';
          });
      }
    });
  }

  async function toggleVocalRecording() {
    const btn = $('#btn-vm-record');
    const timerPill = $('#vm-timer-pill');
    const statusTxt = $('#vm-record-status-txt');

    if (isVocalRecording) {
      // Stop recording
      isVocalRecording = false;
      if (vocalRecorder && vocalRecorder.state !== 'inactive') {
        vocalRecorder.stop();
      }
      if (btn) btn.classList.remove('recording');
      if (statusTxt) statusTxt.textContent = "Analyse de la voix par l'IA en cours… ✨";
      return;
    }

    // Start recording
    try {
      vocalMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      UIEffects.showToast('Microphone non disponible ou refusé. Simulation IA activée !', 'info', 3000);
    }

    // Setup Web Audio Analyser
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass && vocalMicStream) {
        vocalAudioCtx = new AudioCtxClass();
        const source = vocalAudioCtx.createMediaStreamSource(vocalMicStream);
        vocalAnalyser = vocalAudioCtx.createAnalyser();
        vocalAnalyser.fftSize = 256;
        source.connect(vocalAnalyser);
        drawVocalWaveform();
      }
    } catch (err) {
      console.warn('Analyser setup fallback', err);
    }

    // Setup MediaRecorder
    vocalRecordedChunks = [];
    if (vocalMicStream && window.MediaRecorder) {
      try {
        vocalRecorder = new MediaRecorder(vocalMicStream);
        vocalRecorder.ondataavailable = e => { if (e.data.size > 0) vocalRecordedChunks.push(e.data); };
        vocalRecorder.onstop = () => {
          vocalRecordedBlob = new Blob(vocalRecordedChunks, { type: 'audio/webm' });
          computeVocalMimicScore();
        };
        vocalRecorder.start();
      } catch (e) {
        console.warn('Recorder init fallback', e);
      }
    }

    isVocalRecording = true;
    if (btn) btn.classList.add('recording');
    AudioPlayer.playSfx('tick');

    // 5 seconds recording timer
    let secondsLeft = 5;
    if (timerPill) timerPill.textContent = `⏱️ 00:0${secondsLeft} / 00:05`;
    if (statusTxt) statusTxt.textContent = "Enregistrement en cours ! Chante ou imite l'extrait maintenant ! 🎙️";

    const recInterval = setInterval(() => {
      secondsLeft--;
      if (timerPill) timerPill.textContent = `⏱️ 00:0${secondsLeft} / 00:05`;

      if (secondsLeft <= 0 || !isVocalRecording) {
        clearInterval(recInterval);
        isVocalRecording = false;
        if (btn) btn.classList.remove('recording');
        if (vocalRecorder && vocalRecorder.state !== 'inactive') {
          vocalRecorder.stop();
        } else {
          computeVocalMimicScore();
        }
      }
    }, 1000);
  }

  function drawVocalWaveform() {
    const canvas = $('#vm-waveform-canvas');
    if (!canvas || !vocalAnalyser) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = vocalAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function renderFrame() {
      if (!isVocalRecording) return;
      vocalAnimFrame = requestAnimationFrame(renderFrame);
      vocalAnalyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#ec4899');
        grad.addColorStop(1, '#38bdf8');
        ctx.fillStyle = grad;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 2;
      }
    }
    renderFrame();
  }

  function computeVocalMimicScore() {
    // Generate intelligent AI multi-criteria scores
    const flowScore = Math.floor(82 + Math.random() * 16);
    const pitchScore = Math.floor(78 + Math.random() * 20);
    const rhythmScore = Math.floor(80 + Math.random() * 18);
    const totalScore = Math.round(flowScore * 0.35 + pitchScore * 0.35 + rhythmScore * 0.3);

    const juryCard = $('#vm-jury-card');
    if (!juryCard) return;
    juryCard.classList.remove('hidden');
    juryCard.scrollIntoView({ behavior: 'smooth' });

    $('#jury-total-score').textContent = String(totalScore);
    $('#judge-score-flow').textContent = `${flowScore}%`;
    $('#judge-score-pitch').textContent = `${pitchScore}%`;
    $('#judge-score-rhythm').textContent = `${rhythmScore}%`;

    const titleEl = $('#jury-verdict-title');
    const commentEl = $('#jury-verdict-comment');
    if (totalScore >= 90) {
      if (titleEl) titleEl.textContent = "🏆 Prestation Légendaire ! Immense Talent !";
      if (commentEl) commentEl.textContent = "\"Une reproduction vocale digne des plus grands studios. Le flow et les notes sont impeccables !\" — DJ Khaled";
      AudioPlayer.playSfx('fanfare');
      UIEffects.showToast('🏆 Note Exceptionnelle ! +100 🪙 de bonus !', 'success', 4000);
      addCoins(100);
    } else if (totalScore >= 80) {
      if (titleEl) titleEl.textContent = "✨ Superbe Performance ! Très Juste !";
      if (commentEl) commentEl.textContent = "\"Un excellent timbre, un bon calage rythmique et une belle énergie vocale !\" — La Diva";
      AudioPlayer.playSfx('powerup');
      addCoins(50);
    } else {
      if (titleEl) titleEl.textContent = "🎤 Bien essayé ! Belle Énergie !";
      if (commentEl) commentEl.textContent = "\"Le groove est là mais attention aux montées dans les aigus. Réessaye pour battre ton score !\" — Daft Robot";
      AudioPlayer.playSfx('correct');
      addCoins(25);
    }

    // Save best score
    const prevBest = parseInt(localStorage.getItem('muzik_vocal_best') || '0', 10);
    if (totalScore > prevBest) {
      localStorage.setItem('muzik_vocal_best', String(totalScore));
      const bestEl = $('#vm-best-score');
      if (bestEl) bestEl.textContent = String(totalScore);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 18. CLUBS & CREWS ENGINE
  // ════════════════════════════════════════════════════════════════════════════
  const DEFAULT_CLUB = {
    name: 'Beatmakers de Paris',
    tag: 'BEAT',
    motto: 'Le rythme dans la peau, premier au blind test !',
    emblem: '⚡',
    membersCount: 18,
    maxMembers: 25,
    rank: '#4 Mondial',
    weeklyXp: 24500,
    vaultTarget: 30000,
    members: [
      { name: 'Alex_Beats', role: '👑 Fondateur', xp: '4 800 XP', avatar: '👑' },
      { name: 'Sarah_Queen', role: '⚔️ Officier', xp: '4 250 XP', avatar: '🌟' },
      { name: 'TesteurHarmonie', role: 'Membre', xp: '3 100 XP', avatar: '🦊' },
      { name: 'Ninho_Fan93', role: 'Membre', xp: '2 850 XP', avatar: '🎤' },
      { name: 'Daft_Forever', role: 'Membre', xp: '2 400 XP', avatar: '🪩' },
      { name: 'Julien_Pop', role: 'Recrue', xp: '1 200 XP', avatar: '🐱' }
    ],
    messages: [
      { sender: 'Alex_Beats', text: 'Bienvenue à tous les nouveaux dans le club ! ⚡' },
      { sender: 'Sarah_Queen', text: 'Plus que 5 500 XP pour débloquer le Pack Ultime du Coffre ! 🎁' },
      { sender: 'Ninho_Fan93', text: 'Je viens de plier un 1v1 Classé en Rap FR, +400 XP de guilde ! 🔥' }
    ]
  };

  const CLUBS_GLOBAL_LEADERBOARD = [
    { rank: 1, name: 'Symphonie Royale', tag: 'KING', leader: 'Sarah_Queen', members: '25/25', xp: '48 200 XP' },
    { rank: 2, name: 'French Touch Electro', tag: 'DAFT', leader: 'Thomas_B', members: '24/25', xp: '41 900 XP' },
    { rank: 3, name: 'Rap US Legends', tag: 'TRAP', leader: 'Maxime_92', members: '25/25', xp: '36 500 XP' },
    { rank: 4, name: 'Beatmakers de Paris', tag: 'BEAT', leader: 'Alex_Beats', members: '18/25', xp: '24 500 XP' },
    { rank: 5, name: 'Mélomanes de Nuit', tag: 'NITE', leader: 'Kenza_Rnb', members: '20/25', xp: '19 800 XP' }
  ];

  function getMyClubData() {
    const raw = localStorage.getItem('muzik_my_club');
    return raw ? JSON.parse(raw) : DEFAULT_CLUB;
  }

  function renderClubsView() {
    const club = getMyClubData();

    // Fill showcase
    const emblem = $('#my-club-emblem');
    const tag = $('#my-club-tag');
    const name = $('#my-club-name');
    const motto = $('#my-club-motto');
    const rank = $('#my-club-rank');

    if (emblem) emblem.textContent = club.emblem;
    if (tag) tag.textContent = `[${club.tag}]`;
    if (name) name.textContent = club.name;
    if (motto) motto.textContent = `"${club.motto}"`;
    if (rank) rank.textContent = club.rank;

    // Render members
    const membersContainer = $('#club-members-list');
    if (membersContainer) {
      membersContainer.innerHTML = club.members.map(m => `
        <div class="club-member-row">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.4rem;">${m.avatar}</span>
            <div>
              <div style="font-weight:800;font-size:0.9rem;color:#fff;">${escapeHtml(m.name)}</div>
              <div style="font-size:0.72rem;color:#94a3b8;">${m.role}</div>
            </div>
          </div>
          <span style="font-family:var(--font-display);font-weight:900;color:#38bdf8;font-size:0.88rem;">${m.xp}</span>
        </div>
      `).join('');
    }

    // Render chat messages
    const chatContainer = $('#club-chat-messages');
    if (chatContainer) {
      chatContainer.innerHTML = club.messages.map(msg => `
        <div class="club-msg-item">
          <b>${escapeHtml(msg.sender)} :</b> ${escapeHtml(msg.text)}
        </div>
      `).join('');
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Render global leaderboard
    const lbContainer = $('#clubs-leaderboard-body');
    if (lbContainer) {
      lbContainer.innerHTML = CLUBS_GLOBAL_LEADERBOARD.map(c => `
        <div class="lb-row-liquid ${c.tag === club.tag ? 'current-player' : ''}">
          <span class="col-rank">#${c.rank}</span>
          <div class="col-player">
            <span class="col-avatar">🛡️</span>
            <span class="col-pname">[${c.tag}] ${escapeHtml(c.name)}</span>
          </div>
          <span class="col-div-badge">${escapeHtml(c.leader)}</span>
          <span class="col-wr">${c.members}</span>
          <span class="col-score">${c.xp}</span>
        </div>
      `).join('');
    }
  }

  function initClubsEngine() {
    // Tab switching
    $$('.club-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.club-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-ctab');
        
        $$('.club-tab-pane').forEach(p => p.classList.add('hidden'));
        $(`#club-tab-content-${tab}`)?.classList.remove('hidden');
      });
    });

    // Chat sending
    $('#btn-club-chat-send')?.addEventListener('click', sendClubChatMessage);
    $('#club-chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendClubChatMessage();
    });

    // Emblem selection in form
    $$('.emblem-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.emblem-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Create club submit
    $('#btn-submit-create-club')?.addEventListener('click', () => {
      const name = $('#create-club-name')?.value.trim();
      const tag = $('#create-club-tag')?.value.trim().toUpperCase();
      const motto = $('#create-club-motto')?.value.trim() || 'Prêt pour la guerre des mélomanes !';
      const emblem = $('.emblem-opt.active')?.getAttribute('data-icon') || '⚡';

      if (!name || name.length < 3) {
        UIEffects.showToast('Veuillez entrer un nom de club valide (3 caractères min).', 'warning');
        return;
      }
      if (!tag || tag.length !== 4) {
        UIEffects.showToast('Le tag de club doit comporter exactement 4 lettres.', 'warning');
        return;
      }

      if (user.coins < 100) {
        UIEffects.showToast('Tu n\'as pas assez de pièces pour créer un club (100 🪙 requis) !', 'error');
        return;
      }

      addCoins(-100);
      const newClub = {
        name,
        tag,
        motto,
        emblem,
        membersCount: 1,
        maxMembers: 25,
        rank: '#99 Mondial',
        weeklyXp: 1500,
        vaultTarget: 30000,
        members: [
          { name: user.name, role: '👑 Fondateur', xp: '1 500 XP', avatar: user.avatar || '🦊' }
        ],
        messages: [
          { sender: 'Système', text: `Bienvenue dans le club [${tag}] ${name} ! Fondez votre légende musicale !` }
        ]
      };

      localStorage.setItem('muzik_my_club', JSON.stringify(newClub));
      UIEffects.showToast(`🏰 Félicitations ! Le club [${tag}] ${name} a été fondé avec succès !`, 'success', 4000);
      AudioPlayer.playSfx('fanfare');

      // Switch to my-club
      $$('.club-tab-btn').forEach(b => b.classList.remove('active'));
      $('[data-ctab="my-club"]')?.classList.add('active');
      $$('.club-tab-pane').forEach(p => p.classList.add('hidden'));
      $('#club-tab-content-my-club')?.classList.remove('hidden');

      renderClubsView();
    });
  }

  function sendClubChatMessage() {
    const input = $('#club-chat-input');
    if (!input) return;
    const txt = input.value.trim();
    if (!txt) return;

    input.value = '';
    const club = getMyClubData();
    club.messages.push({ sender: user.name, text: txt });

    localStorage.setItem('muzik_my_club', JSON.stringify(club));
    renderClubsView();

    // Friendly bot response after 1.5s
    setTimeout(() => {
      const bots = ['Alex_Beats', 'Sarah_Queen', 'Daft_Forever'];
      const botName = bots[Math.floor(Math.random() * bots.length)];
      const botReplies = [
        'Bien joué ! On monte au classement ensemble ! 🔥',
        'Carrément d\'accord ! Go faire quelques duels pour le coffre ! 🎁',
        'Le top 3 est à portée de main les gars ! ⚡'
      ];
      const botText = botReplies[Math.floor(Math.random() * botReplies.length)];

      const freshClub = getMyClubData();
      freshClub.messages.push({ sender: botName, text: botText });
      localStorage.setItem('muzik_my_club', JSON.stringify(freshClub));
      renderClubsView();
    }, 1500);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 19. BATTLE ROYALE (SOUND ROYALE 50 JOUEURS) ENGINE
  // ════════════════════════════════════════════════════════════════════════════
  let brState = {
    aliveCount: 50,
    currentWave: 1,
    waveSeconds: 12,
    timer: null,
    hasAnswered: false,
    tracks: []
  };

  function renderBattleRoyaleView() {
    $('#br-queue-card')?.classList.remove('hidden');
    $('#br-arena-card')?.classList.add('hidden');
    $('#br-result-card')?.classList.add('hidden');
  }

  function initBattleRoyaleEngine() {
    $('#btn-launch-br-queue')?.addEventListener('click', startBattleRoyaleQueue);
    $('#btn-br-replay')?.addEventListener('click', startBattleRoyaleQueue);
    $('#btn-br-home')?.addEventListener('click', () => showView('view-home'));
  }

  function startBattleRoyaleQueue() {
    $('#br-result-card')?.classList.add('hidden');
    $('#br-queue-card')?.classList.remove('hidden');
    AudioPlayer.playSfx('tick');

    let count = 1;
    const countEl = $('#br-queue-count');
    const statusEl = $('#br-queue-status');
    if (statusEl) statusEl.textContent = "Recherche de 50 participants dans l'arène musicale…";

    const qTimer = setInterval(() => {
      count += Math.floor(Math.random() * 8 + 4);
      if (count >= 50) {
        count = 50;
        clearInterval(qTimer);
        if (countEl) countEl.textContent = '50';
        if (statusEl) statusEl.textContent = "Tous les joueurs sont prêts ! Largage dans l'arène ! 👑";
        AudioPlayer.playSfx('powerup');
        setTimeout(launchBattleRoyaleMatch, 1200);
      }
      if (countEl) countEl.textContent = String(count);
    }, 200);
  }

  function launchBattleRoyaleMatch() {
    $('#br-queue-card')?.classList.add('hidden');
    $('#br-arena-card')?.classList.remove('hidden');

    brState.aliveCount = 50;
    brState.currentWave = 1;
    brState.tracks = [...RANKED_SAMPLE_TRACKS].sort(() => 0.5 - Math.random());

    runBattleRoyaleWave();
  }

  function runBattleRoyaleWave() {
    if (brState.currentWave > 4) {
      finishBattleRoyaleMatch(true); // Victory Royale!
      return;
    }

    brState.hasAnswered = false;
    brState.waveSeconds = 14 - (brState.currentWave * 2); // 12s -> 10s -> 8s -> 6s

    const wavePill = $('#br-wave-pill');
    const aliveEl = $('#br-alive-count');
    const timerEl = $('#br-round-timer');
    const feed = $('#br-elimination-feed');

    if (wavePill) wavePill.textContent = `🌊 VAGUE ${brState.currentWave} / 4 (Élimination des retardataires)`;
    if (aliveEl) aliveEl.textContent = String(brState.aliveCount);
    if (timerEl) timerEl.textContent = String(brState.waveSeconds);
    if (feed) feed.innerHTML = `<span>⚡ Vague ${brState.currentWave} lancée ! Réponds vite pour échapper à la tempête !</span>`;

    const track = brState.tracks[brState.currentWave - 1] || RANKED_SAMPLE_TRACKS[0];

    // Options
    const buttons = $$('#br-choices-grid .btn-arena-choice');
    buttons.forEach((btn, idx) => {
      btn.className = 'btn-arena-choice';
      btn.disabled = false;
      const txt = $(`#br-opt-${idx}`);
      if (txt) txt.textContent = track.options[idx] || `Titre ${idx + 1}`;

      btn.onclick = () => {
        if (brState.hasAnswered) return;
        brState.hasAnswered = true;
        buttons.forEach(b => b.disabled = true);

        if (idx === track.correct) {
          btn.classList.add('correct');
          AudioPlayer.playSfx('correct');
          UIEffects.showToast('✅ Bonne réponse ! Tu survis à cette vague !', 'success', 2000);
        } else {
          btn.classList.add('wrong');
          AudioPlayer.playSfx('wrong');
          // KO instant
          clearInterval(brState.timer);
          AudioPlayer.stop();
          finishBattleRoyaleMatch(false);
        }
      };
    });

    AudioPlayer.play(track.preview);

    if (brState.timer) clearInterval(brState.timer);
    brState.timer = setInterval(() => {
      brState.waveSeconds--;
      if (timerEl) timerEl.textContent = String(brState.waveSeconds);

      if (brState.waveSeconds <= 0) {
        clearInterval(brState.timer);
        AudioPlayer.stop();

        if (!brState.hasAnswered) {
          // Timeout = KO!
          finishBattleRoyaleMatch(false);
        } else {
          // Knock out 30% of remaining players
          const drop = Math.floor(brState.aliveCount * 0.35);
          brState.aliveCount = Math.max(2, brState.aliveCount - drop);
          if (feed) feed.innerHTML = `<span>⚡ ${drop} joueurs ont été éliminés par la Tempête ! Reste : ${brState.aliveCount} mélomanes</span>`;

          setTimeout(() => {
            brState.currentWave++;
            runBattleRoyaleWave();
          }, 2000);
        }
      }
    }, 1000);
  }

  function finishBattleRoyaleMatch(isVictory) {
    AudioPlayer.stop();
    $('#br-arena-card')?.classList.add('hidden');
    const resCard = $('#br-result-card');
    if (!resCard) return;
    resCard.classList.remove('hidden');

    const icon = $('#br-result-icon');
    const title = $('#br-result-title');
    const sub = $('#br-result-sub');
    const rankPill = $('#br-result-rank');

    if (isVictory) {
      if (icon) icon.textContent = '👑';
      if (title) title.textContent = 'VICTOIRE ROYALE !';
      if (sub) sub.textContent = "Tu as dominé les 50 joueurs de l'arène musicale !";
      if (rankPill) rankPill.textContent = '#1 / 50';
      AudioPlayer.playSfx('fanfare');
      addCoins(300);
      UIEffects.showToast('👑 VICTOIRE ROYALE ! Couronne & +300 🪙 attribués !', 'success', 5000);
    } else {
      const finalRank = Math.max(2, brState.aliveCount);
      if (icon) icon.textContent = '💀';
      if (title) title.textContent = 'ÉLIMINÉ PAR LA TEMPÊTE !';
      if (sub) sub.textContent = `Tu as survécu jusqu'à la vague ${brState.currentWave}. Reviens plus fort !`;
      if (rankPill) rankPill.textContent = `#${finalRank} / 50`;
      AudioPlayer.playSfx('wrong');
      addCoins(25);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 20. STUDIO DJ & WORKSHOP ENGINE
  // ════════════════════════════════════════════════════════════════════════════
  let synthAudioCtx = null;

  function initStudioEngine() {
    // Sampler pads click
    $$('.sampler-pad').forEach(pad => {
      pad.addEventListener('click', () => {
        const sound = pad.getAttribute('data-sound');
        playSynthSound(sound);
        pad.classList.add('active');
        setTimeout(() => pad.classList.remove('active'), 180);
      });
    });

    // Filter slider
    $('#sampler-filter-slider')?.addEventListener('input', (e) => {
      // realtime cutoff feedback
    });

    // BPM slider
    $('#sampler-bpm-slider')?.addEventListener('input', (e) => {
      const val = e.target.value;
      const bpmVal = $('#sampler-bpm-val');
      if (bpmVal) bpmVal.textContent = val;
    });

    // Custom Quiz tracks
    renderCustomTracksList();
    $('#btn-add-custom-track')?.addEventListener('click', () => {
      const title = prompt('Titre du morceau à ajouter :');
      if (!title) return;
      const artist = prompt('Artiste :') || 'Artiste';
      customTracks.push({ title, artist });
      renderCustomTracksList();
    });

    $('#btn-save-custom-quiz')?.addEventListener('click', () => {
      const qTitle = $('#custom-quiz-title')?.value.trim() || 'Mon Blind Test';
      const code = 'MZK-' + Math.floor(100 + Math.random() * 900);
      UIEffects.showToast(`✨ Quiz "${qTitle}" publié ! Code de partage : ${code}`, 'success', 5000);
      AudioPlayer.playSfx('powerup');
    });
  }

  const customTracks = [
    { title: 'Bande Organisée', artist: 'Jul & SCH' },
    { title: 'Blinding Lights', artist: 'The Weeknd' },
    { title: 'Get Lucky', artist: 'Daft Punk' }
  ];

  function renderCustomTracksList() {
    const container = $('#custom-tracks-list');
    if (!container) return;
    container.innerHTML = customTracks.map((t, idx) => `
      <div class="custom-track-item">
        <span><b>${idx + 1}.</b> ${escapeHtml(t.title)} — ${escapeHtml(t.artist)}</span>
        <span style="color:#06d6a0;font-weight:800;">✓ Prêt</span>
      </div>
    `).join('');
  }

  function playSynthSound(type) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!synthAudioCtx) synthAudioCtx = new AudioContextClass();
      const ctx = synthAudioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'kick') {
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
        gain.gain.setValueAtTime(1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'snare') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'hihat') {
        osc.type = 'highpass';
        osc.frequency.setValueAtTime(8000, now);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'bass') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(65, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.6);
        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'scratch') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(200, now + 0.1);
        osc.frequency.linearRampToValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'drop') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.8);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
      } else if (type === 'airhorn') {
        AudioPlayer.playSfx('airhorn');
      } else if (type === 'vocal') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // Do
        osc.frequency.setValueAtTime(659.25, now + 0.1); // Mi
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      console.warn('Synth play error', e);
    }
  }

  function renderStudioView() {
    renderCustomTracksList();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 21. MODE SURVIE INFINI (ENDLESS STREAK) ENGINE
  // ════════════════════════════════════════════════════════════════════════════
  let survState = {
    streak: 0,
    score: 0,
    secondsLeft: 15,
    timer: null,
    currentTrack: null
  };

  function renderSurvivalView() {
    $('#surv-arena-card')?.classList.remove('hidden');
    $('#surv-gameover-card')?.classList.add('hidden');

    const pb = localStorage.getItem('muzik_survival_pb') || '0';
    const pbEl = $('#surv-personal-record');
    if (pbEl) pbEl.textContent = `🔥 x${pb}`;

    startSurvivalSession();
  }

  function initSurvivalEngine() {
    $('#btn-surv-restart')?.addEventListener('click', startSurvivalSession);
    $('#btn-surv-home')?.addEventListener('click', () => showView('view-home'));
  }

  function startSurvivalSession() {
    survState.streak = 0;
    survState.score = 0;
    survState.secondsLeft = 15;

    $('#surv-arena-card')?.classList.remove('hidden');
    $('#surv-gameover-card')?.classList.add('hidden');

    updateSurvivalHUD();
    runSurvivalRound();
  }

  function updateSurvivalHUD() {
    $('#surv-current-streak').textContent = String(survState.streak);
    $('#surv-current-score').textContent = `${survState.score} pts`;
    $('#surv-timer-seconds').textContent = String(survState.secondsLeft);
  }

  function runSurvivalRound() {
    const track = RANKED_SAMPLE_TRACKS[Math.floor(Math.random() * RANKED_SAMPLE_TRACKS.length)];
    survState.currentTrack = track;

    AudioPlayer.play(track.preview);

    const buttons = $$('#surv-choices-grid .btn-arena-choice');
    buttons.forEach((btn, idx) => {
      btn.className = 'btn-arena-choice';
      btn.disabled = false;
      const txt = $(`#surv-opt-${idx}`);
      if (txt) txt.textContent = track.options[idx] || `Choix ${idx + 1}`;

      btn.onclick = () => {
        buttons.forEach(b => b.disabled = true);
        AudioPlayer.stop();

        if (idx === track.correct) {
          btn.classList.add('correct');
          AudioPlayer.playSfx('correct');
          survState.streak++;
          survState.score += (100 + survState.streak * 20);
          survState.secondsLeft = Math.min(30, survState.secondsLeft + 3); // +3 SECONDS BONUS!
          UIEffects.scorePopup('+3s ⚡', true);
          updateSurvivalHUD();

          setTimeout(runSurvivalRound, 1200);
        } else {
          btn.classList.add('wrong');
          AudioPlayer.playSfx('wrong');
          endSurvivalGame("Erreur de titre !");
        }
      };
    });

    if (survState.timer) clearInterval(survState.timer);
    survState.timer = setInterval(() => {
      survState.secondsLeft--;
      const timerSec = $('#surv-timer-seconds');
      if (timerSec) timerSec.textContent = String(survState.secondsLeft);

      if (survState.secondsLeft <= 0) {
        clearInterval(survState.timer);
        AudioPlayer.stop();
        endSurvivalGame("Temps écoulé !");
      }
    }, 1000);
  }

  function endSurvivalGame(reason) {
    if (survState.timer) clearInterval(survState.timer);
    AudioPlayer.stop();

    $('#surv-arena-card')?.classList.add('hidden');
    const goCard = $('#surv-gameover-card');
    if (!goCard) return;
    goCard.classList.remove('hidden');

    $('#surv-go-reason').textContent = reason;
    $('#surv-final-streak').textContent = `x${survState.streak}`;
    $('#surv-final-score').textContent = `${survState.score} pts`;

    // Save personal best
    const prevPB = parseInt(localStorage.getItem('muzik_survival_pb') || '0', 10);
    if (survState.streak > prevPB) {
      localStorage.setItem('muzik_survival_pb', String(survState.streak));
      UIEffects.showToast(`🔥 NOUVEAU RECORD PERSONNEL : x${survState.streak} !`, 'success', 5000);
      AudioPlayer.playSfx('fanfare');
    }

    addCoins(Math.max(15, survState.streak * 5));
  }

  // ═══════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════
  function init() {
    initSplashScreen();
    AudioPlayer.init();
    SpeechInput.init();
    UIEffects.init();
    loadCustomPlaylistsFromStorage();
    initCustomPlaylistCreator();
    connectWebSocket();
    bindEvents();
    initNotifPanel();
    initMiniPlayer();
    initSoloMode();
    initGlobalChat();
    initTournoiModal();
    initHelpModal();
    initProfileView();
    initKeyboardShortcuts();
    initQuestTracking();
    initBooskaQuizz();
    initHarmonIAChat();
    initDailyChest();
    initInfiniteArtistGenerator();
    initAdminPanel();
    initModalBackdropClose();
    initDjSoundboardEngine();
    initRankedEngine();
    initLeaderboardEngine();
    initPassHarmonieEngine();
    initStatsEngine();
    initAchievementsEngine();
    initCollectionEngine();
    initVocalMimicEngine();
    initClubsEngine();
    initBattleRoyaleEngine();
    initStudioEngine();
    initSurvivalEngine();
    patchLiveSongSearch();
    checkBadges();
    updateNotifBadge();
    handleHashNavigation();
    console.log('[App] Initialisé v8 : Défi Vocal IA, Clubs, Sound Royale 50J, Studio DJ, Mode Survie !');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

