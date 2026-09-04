/**
 * Audio Player — Lecteur audio + visualisation Canvas
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

  function init() {
    audioElement = document.getElementById('game-audio');
    canvas = document.getElementById('g-visualizer') || document.getElementById('audio-visualizer');
    if (canvas) {
      ctx = canvas.getContext('2d');
    }
  }

  /**
   * Initialise l'AudioContext (doit être appelé après un geste utilisateur)
   */
  function ensureAudioContext() {
    if (audioContext) return;

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;

      source = audioContext.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      isInitialized = true;
    } catch (e) {
      console.warn('[AudioPlayer] AudioContext not available:', e.message);
    }
  }

  /**
   * Charge et joue un extrait audio
   */
  function play(previewUrl) {
    if (!audioElement) init();
    ensureAudioContext();

    audioElement.src = previewUrl;
    audioElement.crossOrigin = 'anonymous';
    audioElement.volume = 0.7;

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
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    stopVisualization();
    stopVinylSpin();
  }

  /**
   * Met en pause
   */
  function pause() {
    if (audioElement) audioElement.pause();
    stopVinylSpin();
  }

  /**
   * Démarre la visualisation audio
   */
  function startVisualization() {
    if (!canvas || !ctx) return;

    // Resize canvas
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width;
      canvas.height = 60;
    }

    function draw() {
      animId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!analyser || !isInitialized) {
        // Fallback: fake visualization
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
        const hue = 263 + (i / bufferLength) * (187 - 263); // purple to cyan gradient
        const alpha = 0.6 + (dataArray[i] / 255) * 0.4;

        ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${alpha})`;

        // Rounded bar from center
        const y = (canvas.height - barHeight) / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - gap, barHeight, 2);
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
      ctx.roundRect(x, y, barWidth - gap, barHeight, 2);
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

  /**
   * Met à jour la cover du vinyl
   */
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
  };
})();
