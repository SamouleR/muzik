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

      } else if (type === 'powerup') {
        // Arpège ascendant magique
        [440, 554.37, 659.25, 880].forEach((freq, i) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.06);

          gain.gain.setValueAtTime(0.4 * sfxVolume, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.25);
        });

      } else if (type === 'fanfare') {
        // Fanfare triomphale 3 notes C5 -> E5 -> G5 -> C6
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);

          gain.gain.setValueAtTime(0.5 * sfxVolume, now + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.4);
        });

      } else if (type === 'combo') {
        // Son de combo win streak
        [880, 1108.73, 1318.51].forEach((freq, i) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + i * 0.05);

          gain.gain.setValueAtTime(0.3 * sfxVolume, now + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.3);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 0.3);
        });

      } else if (type === 'airhorn') {
        // Airhorn multi-tonal burst (3 pulses)
        [0, 0.12, 0.24].forEach(offset => {
          [466.16, 523.25, 622.25].forEach(freq => { // Bb4, C5, Eb5
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + offset);
            osc.frequency.linearRampToValueAtTime(freq * 1.02, now + offset + 0.1);
            gain.gain.setValueAtTime(0.35 * sfxVolume, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now + offset);
            osc.stop(now + offset + 0.12);
          });
        });

      } else if (type === 'cheer') {
        // Synthèse d'ovation / crowd noise
        const bufferSize = audioContext.sampleRate * 0.6;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
        }
        const noise = audioContext.createBufferSource();
        noise.buffer = buffer;
        const filter = audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        filter.Q.value = 1.2;
        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(0.4 * sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        noise.start(now);

      } else if (type === 'rimshot') {
        // Ba-dum-tss
        // "Ba" (tom 1)
        const osc1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(160, now);
        osc1.frequency.exponentialRampToValueAtTime(80, now + 0.1);
        gain1.gain.setValueAtTime(0.5 * sfxVolume, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc1.connect(gain1);
        gain1.connect(masterGain);
        osc1.start(now);
        osc1.stop(now + 0.1);

        // "Dum" (tom 2)
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(130, now + 0.14);
        osc2.frequency.exponentialRampToValueAtTime(65, now + 0.24);
        gain2.gain.setValueAtTime(0.5 * sfxVolume, now + 0.14);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.24);
        osc2.connect(gain2);
        gain2.connect(masterGain);
        osc2.start(now + 0.14);
        osc2.stop(now + 0.24);

        // "Tss" (hi-hat splash)
        const bufferSize = audioContext.sampleRate * 0.35;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const d = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
        const noise = audioContext.createBufferSource();
        noise.buffer = buffer;
        const filter = audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 5000;
        const gain3 = audioContext.createGain();
        gain3.gain.setValueAtTime(0.4 * sfxVolume, now + 0.28);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        noise.connect(filter);
        filter.connect(gain3);
        gain3.connect(masterGain);
        noise.start(now + 0.28);

      } else if (type === 'scratch') {
        // DJ vinyl scratch
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(1400, now + 0.08);
        osc.frequency.linearRampToValueAtTime(220, now + 0.18);
        gain.gain.setValueAtTime(0.4 * sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.22);

      } else if (type === 'suspense') {
        // Dun... Dun... DUUUUN!
        [
          { freq: 220, start: 0, dur: 0.25 },
          { freq: 207.65, start: 0.3, dur: 0.25 },
          { freq: 196, start: 0.65, dur: 0.6 }
        ].forEach(note => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(note.freq, now + note.start);
          gain.gain.setValueAtTime(0.45 * sfxVolume, now + note.start);
          gain.gain.exponentialRampToValueAtTime(0.01, now + note.start + note.dur);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + note.start);
          osc.stop(now + note.start + note.dur);
        });
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

  let visualizerMode = 0; // 0: Bars, 1: Line Wave, 2: Neon Ring
  const VISUALIZER_NAMES = ['📊 Égaliseur', '〰️ Oscillogramme', '⭕ Anneau Néon'];

  function toggleVisualizerMode() {
    visualizerMode = (visualizerMode + 1) % 3;
    return VISUALIZER_NAMES[visualizerMode];
  }

  function getVisualizerModeName() {
    return VISUALIZER_NAMES[visualizerMode];
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

      if (visualizerMode === 1) {
        // Mode 1 : Waveform Line
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#06d6a0';
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      } else if (visualizerMode === 2) {
        // Mode 2 : Neon Glow Pulse
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
        const radius = 15 + (avg / 255) * 20;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168, 85, 247, ${0.4 + (avg / 255) * 0.6})`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ec4899';
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // Mode 0 : Bars
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
    toggleVisualizerMode,
    getVisualizerModeName,
  };
})();
