/**
 * Deezer + Spotify Music Service
 * Deezer: audio previews 30s (free, no auth)
 * Spotify: search & metadata (Bearer token)
 */

// ═══════════════════════════════════════
// SPOTIFY CONFIG
// ═══════════════════════════════════════
let spotifyToken = process.env.SPOTIFY_TOKEN || '';
let spotifyTokenExpiry = 0;

// Client Credentials for auto-refresh (set via env or .env)
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';

/**
 * Set or refresh Spotify token
 */
function setSpotifyToken(token) {
  spotifyToken = token;
  spotifyTokenExpiry = Date.now() + 3500 * 1000; // ~58 minutes
}

/**
 * Auto-refresh Spotify token via Client Credentials
 */
async function refreshSpotifyToken() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) return false;

  try {
    const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    if (data.access_token) {
      setSpotifyToken(data.access_token);
      console.log('[Spotify] Token refreshed');
      return true;
    }
  } catch (e) {
    console.warn('[Spotify] Token refresh failed:', e.message);
  }
  return false;
}

/**
 * Spotify API fetch helper
 */
async function spotifyFetch(endpoint) {
  if (!spotifyToken) return null;
  if (Date.now() > spotifyTokenExpiry && SPOTIFY_CLIENT_ID) {
    await refreshSpotifyToken();
  }

  try {
    const res = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
      headers: { 'Authorization': `Bearer ${spotifyToken}` },
    });
    if (res.status === 401) {
      // Token expired, try refresh
      const refreshed = await refreshSpotifyToken();
      if (refreshed) {
        const retry = await fetch(`https://api.spotify.com/v1/${endpoint}`, {
          headers: { 'Authorization': `Bearer ${spotifyToken}` },
        });
        return await retry.json();
      }
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn('[Spotify] Fetch error:', e.message);
    return null;
  }
}

// ═══════════════════════════════════════
// DEEZER (previews audio)
// ═══════════════════════════════════════
async function deezerFetch(endpoint) {
  const url = `https://api.deezer.com${endpoint}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Deezer API error: ${res.status}`);
  return res.json();
}

// ═══════════════════════════════════════
// PLAYLISTS / CATEGORIES
// ═══════════════════════════════════════

const PLAYLISTS = {
  'rap-fr': { name: 'Rap Français', emoji: '🎤', color: '#FF6B35' },
  'rap-us': { name: 'Rap US', emoji: '🇺🇸', color: '#E63946' },
  'pop': { name: 'Pop', emoji: '🎶', color: '#F72585' },
  'pop-2020s': { name: 'Pop 2020s', emoji: '✨', color: '#B5179E' },
  'hits-fr': { name: 'Hits Français du moment', emoji: '🇫🇷', color: '#3A86FF' },
  'rnb': { name: 'R&B', emoji: '💜', color: '#7209B7' },
  'rock': { name: 'Rock', emoji: '🎸', color: '#D62828' },
  'electro': { name: 'Electro', emoji: '⚡', color: '#4CC9F0' },
  'reggaeton': { name: 'Reggaeton', emoji: '🌴', color: '#06D6A0' },
  'classique': { name: 'Classique', emoji: '🎻', color: '#457B9D' },
  'jazz': { name: 'Jazz', emoji: '🎷', color: '#E9C46A' },
  'afro': { name: 'Afrobeats', emoji: '🌍', color: '#2A9D8F' },
  'annees-80': { name: 'Années 80', emoji: '📼', color: '#FF006E' },
  'annees-90': { name: 'Années 90', emoji: '💿', color: '#8338EC' },
  'annees-2000': { name: 'Années 2000', emoji: '📀', color: '#FB5607' },
  'summer': { name: 'Summer Hits', emoji: '☀️', color: '#FFBE0B' },
  'tiktok': { name: 'TikTok Hits', emoji: '📱', color: '#00F5D4' },
  'jeux-video': { name: 'Jeux Vidéo', emoji: '🎮', color: '#7B2CBF' },
  'cinema': { name: 'Bandes Originales', emoji: '🎬', color: '#264653' },
  'metal': { name: 'Metal', emoji: '🤘', color: '#333333' },
  'mix': { name: 'Mix de tout', emoji: '🎵', color: '#6366F1' },
};

// Search queries per playlist for Deezer search
const PLAYLIST_QUERIES = {
  'rap-fr': ['Ninho', 'Jul', 'Gazo', 'Aya Nakamura', 'Damso', 'PLK', 'Niska', 'SCH', 'Nekfeu', 'Orelsan', 'Booba', 'PNL', 'Leto', 'Lacrim', 'Maes'],
  'rap-us': ['Drake', 'Kendrick Lamar', 'Travis Scott', 'Eminem', 'Post Malone', 'Juice WRLD', 'Lil Baby', 'Future', 'Kanye West', 'Cardi B'],
  'pop': ['Dua Lipa', 'The Weeknd', 'Taylor Swift', 'Harry Styles', 'Billie Eilish', 'Ed Sheeran', 'Olivia Rodrigo', 'Bruno Mars', 'Ariana Grande'],
  'pop-2020s': ['Dua Lipa', 'Olivia Rodrigo', 'Bad Bunny', 'Harry Styles', 'Billie Eilish', 'Doja Cat', 'The Weeknd', 'Rosalia', 'SZA'],
  'hits-fr': ['Aya Nakamura', 'Angele', 'Stromae', 'Jul', 'Ninho', 'Dadju', 'Gims', 'Soprano', 'Vianney', 'Amir'],
  'rnb': ['SZA', 'Frank Ocean', 'Daniel Caesar', 'Jorja Smith', 'The Weeknd', 'Bryson Tiller', 'Khalid', 'Summer Walker'],
  'rock': ['Imagine Dragons', 'Arctic Monkeys', 'Muse', 'Foo Fighters', 'Coldplay', 'Nirvana', 'Queen', 'AC/DC', 'Red Hot Chili Peppers'],
  'electro': ['David Guetta', 'Calvin Harris', 'Daft Punk', 'Avicii', 'Martin Garrix', 'Marshmello', 'Skrillex', 'Deadmau5'],
  'reggaeton': ['Bad Bunny', 'J Balvin', 'Ozuna', 'Daddy Yankee', 'Maluma', 'Rauw Alejandro', 'Karol G', 'Shakira'],
  'classique': ['Mozart', 'Beethoven', 'Chopin', 'Vivaldi', 'Tchaikovsky', 'Debussy', 'Bach'],
  'jazz': ['Miles Davis', 'John Coltrane', 'Nina Simone', 'Louis Armstrong', 'Ella Fitzgerald', 'Duke Ellington'],
  'afro': ['Burna Boy', 'Wizkid', 'Tiwa Savage', 'Rema', 'CKay', 'Tems', 'Davido'],
  'annees-80': ['Michael Jackson', 'Madonna', 'Prince', 'Queen', 'Depeche Mode', 'A-ha', 'Cyndi Lauper', 'Toto'],
  'annees-90': ['Nirvana', 'Spice Girls', 'Backstreet Boys', 'TLC', 'Britney Spears', 'Oasis', 'Red Hot Chili Peppers'],
  'annees-2000': ['Eminem', 'Black Eyed Peas', 'Rihanna', 'Beyonce', 'Linkin Park', 'Shakira', 'Usher', '50 Cent'],
  'summer': ['Luis Fonsi Despacito', 'Pharrell Williams Happy', 'Daft Punk Get Lucky', 'Shakira Waka Waka', 'Rihanna Umbrella'],
  'tiktok': ['Doja Cat', 'Dua Lipa', 'Lil Nas X', 'Olivia Rodrigo', 'The Kid Laroi', 'Cardi B', 'Megan Thee Stallion'],
  'jeux-video': ['Undertale Megalovania', 'Zelda Theme', 'Mario Bros', 'Tetris', 'Final Fantasy', 'Pokemon'],
  'cinema': ['Hans Zimmer', 'John Williams', 'Ennio Morricone', 'Howard Shore', 'James Horner'],
  'metal': ['Metallica', 'Iron Maiden', 'Slipknot', 'Rammstein', 'System of a Down', 'Gojira'],
  'mix': ['Ninho', 'Dua Lipa', 'The Weeknd', 'Jul', 'Imagine Dragons', 'Bad Bunny', 'Daft Punk', 'Aya Nakamura', 'Drake', 'Taylor Swift'],
};

// Cache
const trackCache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

/**
 * Search tracks via Deezer (with Spotify metadata enrichment)
 */
async function searchTracks(query, limit = 10) {
  const cacheKey = `search:${query}:${limit}`;
  const cached = trackCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;

  const data = await deezerFetch(`/search/track?q=${encodeURIComponent(query)}&limit=${limit}`);
  const tracks = (data.data || []).filter(t => t.preview && t.preview !== '');

  const result = tracks.map(t => ({
    id: t.id,
    title: t.title_short || t.title,
    artist: t.artist.name,
    album: t.album.title,
    cover: t.album.cover_medium || t.album.cover,
    coverBig: t.album.cover_big || t.album.cover_medium,
    preview: t.preview,
    duration: t.duration,
    source: 'deezer',
  }));

  trackCache.set(cacheKey, { data: result, time: Date.now() });
  return result;
}

/**
 * Get random tracks for a playlist/genre
 */
async function getRandomTracks(playlistKey, count = 10) {
  const queries = PLAYLIST_QUERIES[playlistKey] || PLAYLIST_QUERIES['mix'];
  const allTracks = [];

  for (const q of queries) {
    try {
      const results = await searchTracks(q, 5);
      allTracks.push(...results);
    } catch (e) {
      console.warn(`[Music] Search error "${q}":`, e.message);
    }
  }

  // Deduplicate by title+artist
  const seen = new Set();
  const unique = allTracks.filter(t => {
    const key = `${t.artist}-${t.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Fisher-Yates shuffle
  const shuffled = [...unique];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Get Spotify user's top tracks (if token available)
 */
async function getSpotifyTopTracks(limit = 20) {
  const data = await spotifyFetch(`me/top/tracks?time_range=medium_term&limit=${limit}`);
  if (!data?.items) return [];

  // For each Spotify track, find the Deezer equivalent (for preview)
  const results = [];
  for (const track of data.items) {
    const query = `${track.artists[0]?.name} ${track.name}`;
    const deezerResults = await searchTracks(query, 1);
    if (deezerResults.length > 0) {
      results.push({
        ...deezerResults[0],
        spotifyId: track.id,
        spotifyUri: track.uri,
      });
    }
  }
  return results;
}

/**
 * Search via Spotify for richer results
 */
async function spotifySearch(query, limit = 10) {
  const data = await spotifyFetch(`search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&market=FR`);
  if (!data?.tracks?.items) return [];

  const results = [];
  for (const track of data.tracks.items.slice(0, 5)) {
    const deezerQuery = `${track.artists[0]?.name} ${track.name}`;
    const deezerResults = await searchTracks(deezerQuery, 1);
    if (deezerResults.length > 0) {
      results.push(deezerResults[0]);
    }
  }
  return results;
}

/**
 * Get all available playlists
 */
function getAvailablePlaylists() {
  return Object.entries(PLAYLISTS).map(([key, val]) => ({
    key,
    ...val,
  }));
}

function getAvailableGenres() {
  return getAvailablePlaylists();
}

function clearCache() {
  trackCache.clear();
}

module.exports = {
  searchTracks,
  getRandomTracks,
  getSpotifyTopTracks,
  spotifySearch,
  getAvailablePlaylists,
  getAvailableGenres,
  setSpotifyToken,
  refreshSpotifyToken,
  clearCache,
  PLAYLISTS,
};
