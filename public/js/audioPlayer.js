/**
 * Audio Player — Lecteur audio Mukiz, visualiseur Canvas & système de Volume Ducking
 */
const AudioPlayer = (() => {
  let audioElement = null;
  let audioContext = null;
  let analyser = null;
  let source = null;
  let canvas = null;
  let ctx = null;
  let animId = null;
  let isInitialized = false;

  // Volume & Ducking state
  let userVolume = parseFloat(localStorage.getItem('muzik_music_vol') || '0.75');
  let sfxVolume = parseFloat(localStorage.getItem('muzik_sfx_vol') || '0.80');
  let isMuted = localStorage.getItem('muzik_muted') === 'true';
  let isDucked = false;
  let duckAnimationId = null;

  function init() {
    audioElement = document.getElementById('game-audio');
    canvas = document.getElementById('g-visualizer') || document.getElementById('audio-visualizer');
    if (canvas) {
      ctx = canvas.getContext('2d');
    }
    if (audioElement) {
      applyVolume();
    }
  }

  /**
   * Initialise l'AudioContext pour l'analyse et la synthèse SFX
   */
  function ensureAudioContext() {
    if (audioContext) {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      return;
    }

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;

      if (audioElement) {
        source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
      }
      isInitialized = true;
    } catch (e) {
      console.warn('[AudioPlayer] AudioContext not available:', e.message);
    }
  }

  function applyVolume() {
    if (!audioElement) return;
    if (isMuted) {
      audioElement.volume = 0;
    } else {
      const target = isDucked ? userVolume * 0.25 : userVolume;
      audioElement.volume = Math.max(0, Math.min(1, target));
    }
  }

  /**
   * Active ou désactive le Volume Ducking avec transition fluide (fade)
   */
  function setDucking(enable, targetRatio = 0.25, durationMs = 300) {
    if (!audioElement || isMuted) return;
    if (isDucked === enable && !enable) return;

    isDucked = enable;
    if (duckAnimationId) cancelAnimationFrame(duckAnimationId);

    const startVolume = audioElement.volume;
    const targetVolume = enable ? userVolume * targetRatio : userVolume;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      audioElement.volume = Math.max(0, Math.min(1, startVolume + (targetVolume - startVolume) * ease));

      if (progress < 1) {
        duckAnimationId = requestAnimationFrame(step);
      } else {
        duckAnimationId = null;
      }
    }

    duckAnimationId = requestAnimationFrame(step);
  }

  function setVolume(vol) {
    userVolume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('muzik_music_vol', String(userVolume));
    applyVolume();
  }

  function getVolume() {
    return userVolume;
  }

  function setSfxVolume(vol) {
    sfxVolume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('muzik_sfx_vol', String(sfxVolume));
  }

  function getSfxVolume() {
    return sfxVolume;
  }

  function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('muzik_muted', String(isMuted));
    applyVolume();
    return isMuted;
  }

  function getIsMuted() {
    return isMuted;
  }

  /**
   * Synthétiseur de sons SFX via Web Audio API (aucun asset externe requis)
   */
  function playSfx(type) {
    if (isMuted || sfxVolume <= 0) return;
    ensureAudioContext();
    if (!audioContext) return;

    try {
      const now = audioContext.currentTime;
      const masterGain = audioContext.createGain();
      masterGain.gain.setValueAtTime(sfxVolume, now);
      masterGain.connect(audioContext.destination);

      if (type === 'tick') {
        // Tic-tac de timer en fin de manche
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);

        gain.gain.setValueAtTime(0.4 * sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.06);

      } else if (type === 'correct') {
        // Ding joyeux 2 temps
        [587.33, 880].forEach((freq, i) => { // D5 -> A5
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.1);

          gain.gain.setValueAtTime(0.5 * sfxVolume, now + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.35);
        });

      } else if (type === 'wrong') {
        // Buzzer erreur
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.setValueAtTime(110, now + 0.1);

        gain.gain.setValueAtTime(0.35 * sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.28);

      } else if (type === 'countdown') {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.3 * sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch (e) {
      console.warn('[AudioPlayer] SFX error:', e);
    }
  }

  /**
   * Charge et joue un extrait audio
   */
  function play(previewUrl) {
    if (!audioElement) init();
    ensureAudioContext();

    isDucked = false;
    audioElement.src = previewUrl;
    audioElement.crossOrigin = 'anonymous';
    applyVolume();

    const playPromise = audioElement.play();
    if (playPromise) {
      playPromise.catch(e => {
        console.warn('[AudioPlayer] Play failed:', e.message);
      });
    }

    startVisualization();
    startVinylSpin();
  }

  /**
   * Arrête la lecture
   */
  function stop() {
    if (duckAnimationId) cancelAnimationFrame(duckAnimationId);
    isDucked = false;

    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    stopVisualization();
    stopVinylSpin();
  }

  function pause() {
    if (audioElement) audioElement.pause();
    stopVinylSpin();
  }

  /**
   * Visualisation audio Canvas
   */
  function startVisualization() {
    if (!canvas || !ctx) return;

    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect && rect.width > 0) {
      canvas.width = rect.width;
      canvas.height = 60;
    }

    function draw() {
      animId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!analyser || !isInitialized) {
        drawFakeVisualization();
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const barWidth = (canvas.width / bufferLength) * 1.5;
      const gap = 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
        const hue = 263 + (i / bufferLength) * (187 - 263);
        const alpha = 0.6 + (dataArray[i] / 255) * 0.4;

        ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${alpha})`;
        const y = (canvas.height - barHeight) / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, Math.max(2, barWidth - gap), barHeight, 2);
        ctx.fill();

        x += barWidth;
      }
    }

    draw();
  }

  let fakePhase = 0;
  function drawFakeVisualization() {
    fakePhase += 0.03;
    const barCount = 32;
    const barWidth = (canvas.width / barCount) * 1.2;
    const gap = 2;
    let x = 0;

    for (let i = 0; i < barCount; i++) {
      const value = Math.sin(fakePhase + i * 0.3) * 0.3 + 0.4 +
                    Math.sin(fakePhase * 1.7 + i * 0.5) * 0.2;
      const barHeight = value * canvas.height * 0.7;
      const hue = 263 + (i / barCount) * (187 - 263);

      ctx.fillStyle = `hsla(${hue}, 80%, 65%, 0.5)`;
      const y = (canvas.height - barHeight) / 2;
      ctx.beginPath();
      ctx.roundRect(x, y, Math.max(2, barWidth - gap), barHeight, 2);
      ctx.fill();
      x += barWidth;
    }
  }

  function stopVisualization() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function startVinylSpin() {
    const vinyl = document.getElementById('g-vinyl') || document.getElementById('vinyl');
    if (vinyl) vinyl.classList.add('spinning');
  }

  function stopVinylSpin() {
    const vinyl = document.getElementById('g-vinyl') || document.getElementById('vinyl');
    if (vinyl) vinyl.classList.remove('spinning');
  }

  function setCover(coverUrl) {
    const img = document.getElementById('g-cover') || document.getElementById('track-cover');
    if (img) {
      if (coverUrl) {
        img.src = coverUrl;
        img.style.display = 'block';
      } else {
        img.style.display = 'none';
      }
    }
  }

  return {
    init,
    play,
    stop,
    pause,
    setCover,
    ensureAudioContext,
    setVolume,
    getVolume,
    setSfxVolume,
    getSfxVolume,
    toggleMute,
    getIsMuted,
    setDucking,
    playSfx,
  };
})();
