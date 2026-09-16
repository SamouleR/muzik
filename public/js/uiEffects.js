/**
 * UI Effects — Animations, confettis, toasts, particules
 */
const UIEffects = (() => {

  // ═══════════════════════════════════════
  // PARTICLE BACKGROUND
  // ═══════════════════════════════════════
  function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animId;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.4 + 0.1;
        this.hue = Math.random() > 0.5 ? 263 : 187; // purple or cyan
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
          this.reset();
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 80%, 65%, ${this.opacity})`;
        ctx.fill();
      }
    }

    function init() {
      resize();
      const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
      particles = Array.from({ length: count }, () => new Particle());
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => { p.update(); p.draw(); });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(124, 58, 237, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => {
      resize();
    });

    init();
    animate();
  }

  // ═══════════════════════════════════════
  // CONFETTI
  // ═══════════════════════════════════════
  function launchConfetti(duration = 3000) {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#7c3aed', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
    const confettis = [];

    for (let i = 0; i < 150; i++) {
      confettis.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 4,
        speedY: Math.random() * 4 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }

    const start = Date.now();

    function animate() {
      const elapsed = Date.now() - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      confettis.forEach(c => {
        c.x += c.speedX;
        c.y += c.speedY;
        c.rotation += c.rotationSpeed;
        c.speedY += 0.05; // gravity

        if (elapsed > duration - 1000) {
          c.opacity = Math.max(0, c.opacity - 0.02);
        }

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate((c.rotation * Math.PI) / 180);
        ctx.globalAlpha = c.opacity;
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      });

      if (elapsed < duration) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    animate();
  }

  // ═══════════════════════════════════════
  // TOAST NOTIFICATIONS
  // ═══════════════════════════════════════
  function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ═══════════════════════════════════════
  // COUNTDOWN
  // ═══════════════════════════════════════
  function showCountdown(callback) {
    const overlay = document.getElementById('countdown-overlay');
    const numberEl = document.getElementById('countdown-number');
    if (!overlay || !numberEl) return callback?.();

    overlay.classList.remove('hidden');
    let count = 3;

    function tick() {
      numberEl.textContent = count;
      numberEl.style.animation = 'none';
      numberEl.offsetHeight; // force reflow
      numberEl.style.animation = 'countdownPop 1s ease-out';

      if (count <= 0) {
        numberEl.textContent = '🎵';
        setTimeout(() => {
          overlay.classList.add('hidden');
          callback?.();
        }, 600);
        return;
      }

      count--;
      setTimeout(tick, 1000);
    }

    tick();
  }

  // ═══════════════════════════════════════
  // VIEW TRANSITIONS (Enhanced)
  // ═══════════════════════════════════════
  const VIEW_ANIMATIONS = {
    'view-home': 'viewSlideUp',
    'view-playlists': 'viewSlideLeft',
    'view-shop': 'viewFadeScale',
    'view-quests': 'viewSlideUp',
    'view-profile': 'viewSlideLeft',
    'view-lobby': 'viewFadeScale',
    'view-game': 'viewSlideUp',
    'view-gameover': 'viewFadeScale',
    'view-solo': 'viewSlideLeft',
  };

  function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      const animName = VIEW_ANIMATIONS[viewId] || 'viewSlideUp';
      target.style.animation = 'none';
      target.offsetHeight;
      target.style.animation = `${animName} 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
    }
  }

  // ═══════════════════════════════════════
  // SHAKE EFFECT
  // ═══════════════════════════════════════
  function shake(element) {
    if (!element) return;
    element.classList.remove('shake');
    element.offsetHeight;
    element.classList.add('shake');
    element.addEventListener('animationend', () => element.classList.remove('shake'), { once: true });
  }

  // ═══════════════════════════════════════
  // LOADING OVERLAY
  // ═══════════════════════════════════════
  function showLoading(message = 'Chargement…') {
    const overlay = document.getElementById('loading-overlay');
    const msgEl = document.getElementById('loading-message');
    if (overlay) overlay.classList.remove('hidden');
    if (msgEl) msgEl.textContent = message;
  }

  function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  // ═══════════════════════════════════════
  // SCORE POPUP & CELEBRATE ALIASES
  // ═══════════════════════════════════════
  function scorePopup(text, isPositive = true) {
    const popup = document.createElement('div');
    popup.className = `score-float-popup ${isPositive ? 'positive' : 'negative'}`;
    popup.textContent = text;
    popup.style.cssText = `
      position: fixed;
      top: 40%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 2.2rem;
      font-weight: 800;
      color: ${isPositive ? '#06d6a0' : '#e63946'};
      text-shadow: 0 4px 16px rgba(0,0,0,0.25);
      pointer-events: none;
      z-index: 9999;
      animation: floatUp 1.2s ease-out forwards;
    `;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1200);
  }

  function celebrate(canvas) {
    launchConfetti(canvas || document.getElementById('confetti-canvas'));
  }

  function countdown(seconds = 3, callback) {
    const overlay = document.getElementById('countdown-overlay');
    const numberEl = document.getElementById('countdown-num') || document.getElementById('countdown-number');
    if (!overlay || !numberEl) return callback?.();

    overlay.classList.remove('hidden');
    let count = typeof seconds === 'number' ? seconds : 3;

    function tick() {
      numberEl.textContent = count;
      numberEl.style.animation = 'none';
      numberEl.offsetHeight;
      numberEl.style.animation = 'countdownPop 0.8s ease-out';

      if (count <= 0) {
        numberEl.textContent = '🎵';
        setTimeout(() => {
          overlay.classList.add('hidden');
          callback?.();
        }, 500);
        return;
      }

      count--;
      setTimeout(tick, 1000);
    }

    tick();
  }

  /**
   * Anime une émote flottante sur l'écran
   */
  function spawnFloatingEmoji(emoji = '🔥', senderName = '') {
    const el = document.createElement('div');
    el.className = 'floating-emoji-particle';
    
    const randomX = Math.floor(15 + Math.random() * 70); // 15% to 85% width
    const randomRotation = Math.floor((Math.random() - 0.5) * 40); // -20deg to 20deg
    
    el.innerHTML = `<span class="emoji-symbol">${emoji}</span>${senderName ? `<span class="emoji-sender">${senderName}</span>` : ''}`;
    el.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: ${randomX}%;
      transform: translateX(-50%) rotate(${randomRotation}deg);
      font-size: 2.5rem;
      pointer-events: none;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: floatUpReaction 2.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
    `;

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  /**
   * Anti-XSS Sanitizer: Escape HTML characters
   */
  function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  function init() {
    initParticles();
  }

  return {
    init,
    initParticles,
    launchConfetti,
    celebrate,
    showToast,
    showCountdown,
    countdown,
    switchView,
    shake,
    scorePopup,
    showLoading,
    hideLoading,
    spawnFloatingEmoji,
    escapeHTML,
  };
})();
