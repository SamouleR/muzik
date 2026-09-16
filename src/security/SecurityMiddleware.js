const crypto = require('crypto');

// ═══════════════════════════════════════════════════
// 🛡️ HMAC SECRET — MUST be set via environment variable in production
// ═══════════════════════════════════════════════════
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const HMAC_SECRET = process.env.HMAC_SECRET;

if (!HMAC_SECRET) {
  if (IS_PRODUCTION) {
    console.error('\n⛔ CRITICAL: HMAC_SECRET environment variable is NOT set in production!');
    console.error('   Set it with: export HMAC_SECRET="your-random-256bit-key"');
    console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n');
    process.exit(1);
  } else {
    console.warn('\n⚠️  WARNING: HMAC_SECRET not set — using development-only fallback key.');
    console.warn('   This is INSECURE for production. Set HMAC_SECRET env variable.\n');
  }
}

const EFFECTIVE_SECRET = HMAC_SECRET || 'dev_only_harmonie_key_' + crypto.randomBytes(8).toString('hex');

/**
 * XSS Sanitizer: Escapes potentially hazardous HTML characters.
 * NOTE: Do NOT use this on URLs — use validatePlaylistUrl() for URL validation instead.
 */
function sanitizeHTML(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Express Middleware: Security HTTP Headers & Anti-XSS
 */
function applySecurityHeaders(req, res, next) {
  // Content Security Policy
  // TODO: Remove 'unsafe-inline' from script-src by migrating inline scripts to external files
  //       and using nonces/hashes. Currently kept for compatibility with inline event handlers.
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: http:; media-src 'self' https: http: blob:; connect-src 'self' ws: wss: https: http:;"
  );
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS filter in browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 🛡️ Strict Transport Security — force HTTPS for 1 year + subdomains
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // 🛡️ Permissions Policy — restrict browser features not needed by the app
  res.setHeader(
    'Permissions-Policy',
    'camera=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  // 🛡️ Cross-Origin headers
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  next();
}

/**
 * In-Memory Rate Limiter (HTTP)
 */
const requestStore = new Map();
const CLEANUP_INTERVAL = 60000; // 1 min

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestStore.entries()) {
    if (now - data.startTime > 60000) {
      requestStore.delete(ip);
    }
  }
}, CLEANUP_INTERVAL);

function rateLimiter(options = { windowMs: 60000, maxRequests: 100 }) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();

    let record = requestStore.get(ip);
    if (!record) {
      record = { count: 1, startTime: now };
      requestStore.set(ip, record);
      return next();
    }

    if (now - record.startTime > options.windowMs) {
      record.count = 1;
      record.startTime = now;
      return next();
    }

    record.count++;
    if (record.count > options.maxRequests) {
      return res.status(429).json({
        success: false,
        message: '⚠️ Trop de requêtes envoyées. Veuillez patienter une minute avant de réessayer.',
      });
    }

    next();
  };
}

/**
 * 🛡️ WebSocket Rate Limiter — per-socket message throttle
 * Returns { allowed: boolean, remaining: number }
 */
const wsRateStore = new Map();
const WS_RATE_CLEANUP = 30000;

setInterval(() => {
  const now = Date.now();
  for (const [id, data] of wsRateStore.entries()) {
    if (now - data.windowStart > 10000) {
      wsRateStore.delete(id);
    }
  }
}, WS_RATE_CLEANUP);

function wsRateLimiter(socketId, maxPerWindow = 30, windowMs = 10000) {
  const now = Date.now();
  let record = wsRateStore.get(socketId);

  if (!record || now - record.windowStart > windowMs) {
    record = { count: 1, windowStart: now };
    wsRateStore.set(socketId, record);
    return { allowed: true, remaining: maxPerWindow - 1 };
  }

  record.count++;
  if (record.count > maxPerWindow) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: maxPerWindow - record.count };
}

function wsRateLimiterCleanup(socketId) {
  wsRateStore.delete(socketId);
}

/**
 * 🛡️ Playlist URL Validator — only allows Spotify and Deezer playlist URLs
 * Returns { valid: boolean, sanitizedUrl: string, error: string }
 */
const ALLOWED_PLAYLIST_DOMAINS = [
  'open.spotify.com',
  'spotify.com',
  'www.spotify.com',
  'deezer.com',
  'www.deezer.com',
  'api.deezer.com',
];

function validatePlaylistUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, sanitizedUrl: '', error: 'URL manquante' };
  }

  const trimmed = rawUrl.trim();

  // Basic URL validation
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, sanitizedUrl: '', error: 'URL invalide' };
  }

  // Only allow HTTPS
  if (parsed.protocol !== 'https:') {
    return { valid: false, sanitizedUrl: '', error: 'Seules les URLs HTTPS sont autorisées' };
  }

  // Whitelist domains
  const hostname = parsed.hostname.toLowerCase();
  if (!ALLOWED_PLAYLIST_DOMAINS.includes(hostname)) {
    return {
      valid: false,
      sanitizedUrl: '',
      error: `Domaine non autorisé : ${hostname}. Seuls Spotify et Deezer sont acceptés.`
    };
  }

  // Block internal/private IPs (SSRF protection)
  if (hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
    return { valid: false, sanitizedUrl: '', error: 'URL interne non autorisée' };
  }

  return { valid: true, sanitizedUrl: parsed.href, error: null };
}

/**
 * Cryptographic HMAC Payload Signer
 */
function signPayload(payload) {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', EFFECTIVE_SECRET).update(data).digest('hex');
}

/**
 * Verify HMAC Signature
 */
function verifySignature(payload, signature) {
  if (!signature) return false;
  const expected = signPayload(payload);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

module.exports = {
  sanitizeHTML,
  applySecurityHeaders,
  rateLimiter,
  wsRateLimiter,
  wsRateLimiterCleanup,
  validatePlaylistUrl,
  signPayload,
  verifySignature,
};
