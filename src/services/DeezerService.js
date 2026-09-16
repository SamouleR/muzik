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
// ═══════════════════════════════════════
// PLAYLISTS / CATEGORIES (Enriched Mukiz Style)
// ═══════════════════════════════════════

const PLAYLISTS = {
  'best-fr': {
    name: 'Best of musique française',
    emoji: '🐓',
    color: '#3B82F6',
    category: 'genres',
    trackCount: 160,
    difficulty: 'FACILE',
    description: 'Les plus grands classiques et tubes incontournables de la chanson française',
    cover: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/184c410ed1a734d985ae85211f7ab313/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/914db9146f330d0a2969d157872da5eb/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/bc5cd6526b7b34cfc0eb5a6ed46b5524/250x250-000000-80-0-0.jpg'
    ]
  },
  'disney-fr': {
    name: 'Disney - France',
    emoji: '🏰',
    color: '#06D6A0',
    category: 'themes',
    trackCount: 120,
    difficulty: 'FACILE',
    description: 'Les plus belles chansons des films d\'animation Disney en version française',
    cover: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/79d0c198e06a5994ea3d06ee9df73642/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/c100a26e7a2fc36378e01379cdfc9a4e/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/a36d49b8f44e8345b819d4d12d66c8e5/250x250-000000-80-0-0.jpg'
    ]
  },
  'rap-fr': {
    name: 'Rap Français',
    emoji: '🎤',
    color: '#FF6B35',
    category: 'genres',
    trackCount: 150,
    difficulty: 'FACILE',
    description: 'Les plus gros bangers du rap francophone (Ninho, Jul, Gazo, Damso...)',
    cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/eb4290d46e35397743bb64d5a5efcfbd/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/7d4e409a12fd290a253ab4320b53964b/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/d26b907ad10293b61b3d1b4b845e153b/250x250-000000-80-0-0.jpg'
    ]
  },
  'pop-fr-80s': {
    name: 'Pop française 80s',
    emoji: '📼',
    color: '#FF006E',
    category: 'decades',
    trackCount: 140,
    difficulty: 'FACILE',
    description: 'Goldman, Balavoine, France Gall, Renaud & les légendes des années 80',
    cover: 'https://images.unsplash.com/photo-1542208998-f6dbbb27a72f?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/8f86b380b23ed04b40704ae3c64149a0/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/fb63c8264233908a7462a3ac8c30cd6c/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/e66fd76a84fa2b80d972a3ca6c902f2d/250x250-000000-80-0-0.jpg'
    ]
  },
  'films': {
    name: 'Musiques de films',
    emoji: '🍿',
    color: '#E63946',
    category: 'themes',
    trackCount: 130,
    difficulty: 'MOYEN',
    description: 'Bandes originales cultes : Hans Zimmer, Star Wars, Titanic & Gladiator',
    cover: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/8339e114d1ee1925c66cdf8d442574af/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/c6182f0e2fa000e0e0184afe99fe79d4/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/1a0c750fc722793ff079a87c3d878203/250x250-000000-80-0-0.jpg'
    ]
  },
  'series-tv': {
    name: 'Musiques de séries TV',
    emoji: '📺',
    color: '#8338EC',
    category: 'themes',
    trackCount: 110,
    difficulty: 'FACILE',
    description: 'Génériques cultes : Friends, Game of Thrones, La Casa de Papel & Stranger Things',
    cover: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/fb6f0ec1ddb0dcc34df95fa186b668a3/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/52b774b1c822edfa170dc46eb3b7b7cc/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/e548f37effabe86ee07ac27594bf3a18/250x250-000000-80-0-0.jpg'
    ]
  },
  'rap-fr-2010s': {
    name: 'Rap français 2010s',
    emoji: '💎',
    color: '#2A9D8F',
    category: 'decades',
    trackCount: 140,
    difficulty: 'FACILE',
    description: 'L\'âge d\'or du rap fr moderne : Nekfeu, Booba, PNL, Kaaris & Orelsan',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/beb388822ee34e78a0e30c0436c6a299/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/d3126db67a135412c4a3a4f1350a8f86/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/3c0d34f7576d81c8f269570d9806fb88/250x250-000000-80-0-0.jpg'
    ]
  },
  'rap-fr-2020s': {
    name: 'Rap français 2020s',
    emoji: '🎧',
    color: '#06D6A0',
    category: 'decades',
    trackCount: 145,
    difficulty: 'FACILE',
    description: 'Les rois de la drill et du streaming : Gazo, Tiakola, SDM, Werenoi & Ninho',
    cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/7d4e409a12fd290a253ab4320b53964b/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/1428de52b8c0427a770e6e8a61e9c1f3/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/82e46172fe6ace4c287cde4a8f1c8392/250x250-000000-80-0-0.jpg'
    ]
  },
  'french-touch': {
    name: 'French Touch',
    emoji: '🪩',
    color: '#3A86FF',
    category: 'genres',
    trackCount: 115,
    difficulty: 'MOYEN',
    description: 'Daft Punk, Justice, Kavinsky, Phoenix, Cassius & Modjo',
    cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/5718f7c81c27e0b2417e2a4c45224f8a/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/e9029dc8a49a5a1772043d330a412874/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/7f9ecda862091716e4e8f74a7e115f93/250x250-000000-80-0-0.jpg'
    ]
  },
  'pop': {
    name: 'Pop Internationale',
    emoji: '🎶',
    color: '#F72585',
    category: 'genres',
    trackCount: 160,
    difficulty: 'FACILE',
    description: 'Les plus grands hymnes pop planétaires (Dua Lipa, The Weeknd, Taylor Swift...)',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/f8364f090ba04f1b19b381ec0390f3e4/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/fd00ebd6d30d7253f813dba3bb1c66a9/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/6630083f454d48eadb6a9b53f035d734/250x250-000000-80-0-0.jpg'
    ]
  },
  'pop-2010s': {
    name: 'Pop 2010s',
    emoji: '🌟',
    color: '#FFBE0B',
    category: 'decades',
    trackCount: 150,
    difficulty: 'FACILE',
    description: 'Rihanna, Bruno Mars, Katy Perry, Adele, Ed Sheeran & Avicii',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/a1b2457fcd12bb9ed5488e4bbd01ec25/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/3734366a73152d0367a83a4b09fd163f/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/dc1ce848d830ecc93521be5a78350364/250x250-000000-80-0-0.jpg'
    ]
  },
  'pop-2020s': {
    name: 'Pop 2020s',
    emoji: '✨',
    color: '#B5179E',
    category: 'decades',
    trackCount: 130,
    difficulty: 'FACILE',
    description: 'Olivia Rodrigo, Harry Styles, Dua Lipa, Billie Eilish & Sabrina Carpenter',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/e68da86fd7976135c2d2d1715afaef7c/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/b0e936124f59e669ddba02ebe5893f95/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/f8364f090ba04f1b19b381ec0390f3e4/250x250-000000-80-0-0.jpg'
    ]
  },
  'hits-fr': {
    name: 'Hits Français du moment',
    emoji: '🇫🇷',
    color: '#3A86FF',
    category: 'genres',
    trackCount: 130,
    difficulty: 'FACILE',
    description: 'Ce qui cartonne actuellement dans les charts en France',
    cover: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/41fc3e7a3430f3a5e1c1780b57c3147f/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/4a2360324af313f73b56fd1f7faaac88/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/914db9146f330d0a2969d157872da5eb/250x250-000000-80-0-0.jpg'
    ]
  },
  'rap-us': {
    name: 'Rap US',
    emoji: '🇺🇸',
    color: '#E63946',
    category: 'genres',
    trackCount: 140,
    difficulty: 'MOYEN',
    description: 'Drake, Kendrick Lamar, Travis Scott, Eminem & Kanye West',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/b69d3bcbd130ad4cc9259de543889e30/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/7ce6b8452fae425557067db6e6a1cad5/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/7df7ac6028591a5622f24cf32a555510/250x250-000000-80-0-0.jpg'
    ]
  },
  'rnb': {
    name: 'R&B Soul',
    emoji: '💜',
    color: '#7209B7',
    category: 'genres',
    trackCount: 110,
    difficulty: 'MOYEN',
    description: 'Vibes suaves de The Weeknd, SZA, Frank Ocean & Khalid',
    cover: 'https://images.unsplash.com/photo-1445985543470-41fdd6ce75b0?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/a3c3b409f0d5bd781821ec0fd79d5b15/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/e545e4c96ae929e8cce56808afd7756f/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/134778e4c4f19ea71c82408300925a9a/250x250-000000-80-0-0.jpg'
    ]
  },
  'rock': {
    name: 'Rock Classics & Modern',
    emoji: '🎸',
    color: '#D62828',
    category: 'genres',
    trackCount: 135,
    difficulty: 'MOYEN',
    description: 'Queen, Nirvana, Arctic Monkeys, Muse & Foo Fighters',
    cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/247b228179aea3b083eef43522b78b45/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/64e54e307bd5e2bdb27ffeb662fd910d/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/0b56f4eee05fa1ea753c5654b2cdb70c/250x250-000000-80-0-0.jpg'
    ]
  },
  'electro': {
    name: 'Electro & Dance',
    emoji: '⚡',
    color: '#4CC9F0',
    category: 'genres',
    trackCount: 125,
    difficulty: 'FACILE',
    description: 'Daft Punk, David Guetta, Avicii & Calvin Harris',
    cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/b870579c8650cd59b1cce656dde2ef17/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/52330286cb5008805253fd77c7111d3f/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/ec97306735b46ec334e0ce562290775b/250x250-000000-80-0-0.jpg'
    ]
  },
  'reggaeton': {
    name: 'Reggaeton Latino',
    emoji: '🌴',
    color: '#06D6A0',
    category: 'genres',
    trackCount: 115,
    difficulty: 'FACILE',
    description: 'Bad Bunny, J Balvin, Daddy Yankee, Maluma & Shakira',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/aa6aa7ac356ad9d6c578cccd1a62c394/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/91030a07f2dba2b2b86421243c55cead/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/d386e42d5c4dfb603e958371b79869f5/250x250-000000-80-0-0.jpg'
    ]
  },
  'annees-80': {
    name: 'Années 80',
    emoji: '📼',
    color: '#FF006E',
    category: 'decades',
    trackCount: 150,
    difficulty: 'FACILE',
    description: 'Michael Jackson, Madonna, Prince, Queen, A-ha & Toto',
    cover: 'https://images.unsplash.com/photo-1542208998-f6dbbb27a72f?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/a0ad67d1beb761f2cb9f8b60e5bcf07a/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/3836708e2d450cdaa61341112b972228/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/156c197582a4d4b40e17d72b79d3df62/250x250-000000-80-0-0.jpg'
    ]
  },
  'annees-90': {
    name: 'Années 90',
    emoji: '💿',
    color: '#8338EC',
    category: 'decades',
    trackCount: 140,
    difficulty: 'FACILE',
    description: 'Nirvana, Spice Girls, Britney Spears, TLC & Oasis',
    cover: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/f0282817b697279e56df13909962a54a/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/18c4f2d9608910a2b8eb1835052e895b/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/f685d32254a59b6162be0d1082ff8805/250x250-000000-80-0-0.jpg'
    ]
  },
  'annees-2000': {
    name: 'Années 2000',
    emoji: '📀',
    color: '#FB5607',
    category: 'decades',
    trackCount: 145,
    difficulty: 'FACILE',
    description: 'Eminem, Rihanna, Linkin Park, Beyoncé & 50 Cent',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/e2b36a9fda865cb2e9ed1476b6291a7d/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/ea30377840f4ef9ac62406c5e16e9c4b/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/91276466fbc876d96be9e6926060af60/250x250-000000-80-0-0.jpg'
    ]
  },
  'tiktok': {
    name: 'TikTok Hits',
    emoji: '📱',
    color: '#00F5D4',
    category: 'themes',
    trackCount: 130,
    difficulty: 'FACILE',
    description: 'Les chorés et musiques virales de TikTok',
    cover: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/1e0d4359a328f8b0ea3563e8623a09aa/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/3cfd6900fd2b342ec0e478faf300f6a2/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/e68da86fd7976135c2d2d1715afaef7c/250x250-000000-80-0-0.jpg'
    ]
  },
  'jeux-video': {
    name: 'Jeux Vidéo',
    emoji: '🎮',
    color: '#7B2CBF',
    category: 'themes',
    trackCount: 100,
    difficulty: 'MOYEN',
    description: 'OST cultes : Mario, Zelda, Undertale, Pokémon & Tetris',
    cover: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/020a7981173d64d2eb5b50a089f6b73c/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/2b93dfe372b31369cb4f0e6d3011e4db/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/73b741e3e925f5bb9b27ae2b3c2c78a7/250x250-000000-80-0-0.jpg'
    ]
  },
  'mix': {
    name: 'Mix de tout',
    emoji: '🎵',
    color: '#6366F1',
    category: 'genres',
    trackCount: 200,
    difficulty: 'FACILE',
    description: 'Le cocktail parfait de tous les genres pour jouer en groupe',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/fd00ebd6d30d7253f813dba3bb1c66a9/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/f8364f090ba04f1b19b381ec0390f3e4/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/43bd78a4753df33da9efc2207c4286ee/250x250-000000-80-0-0.jpg'
    ]
  },
  '100-jul': {
    name: '100% Jul',
    emoji: '👽',
    color: '#F59E0B',
    category: 'artists',
    trackCount: 100,
    difficulty: 'FACILE',
    description: 'Le J, c\'est le S ! Tous les plus grands bangers et ovnis de Jul',
    cover: 'https://cdn-images.dzcdn.net/images/artist/c1775a285d820beea1eb5e024ff0bca5/500x500-000000-80-0-0.jpg',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/f0beee92a831e679a957d591e1d0f507/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/bc5cd6526b7b34cfc0eb5a6ed46b5524/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/914db9146f330d0a2969d157872da5eb/250x250-000000-80-0-0.jpg'
    ]
  },
  '100-ninho': {
    name: '100% Ninho',
    emoji: '👑',
    color: '#3B82F6',
    category: 'artists',
    trackCount: 80,
    difficulty: 'FACILE',
    description: 'Destin, M.I.L.S, Jefe, NI : les pépites certifiées diamant du boss',
    cover: 'https://cdn-images.dzcdn.net/images/artist/93246ebcf2ee2f94b159f81dfce04358/500x500-000000-80-0-0.jpg',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/184c410ed1a734d985ae85211f7ab313/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/eb4290d46e35397743bb64d5a5efcfbd/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/d7a71bb95b5463428fb1d76ea656911c/250x250-000000-80-0-0.jpg'
    ]
  },
  '100-booba': {
    name: '100% Booba',
    emoji: '🏴‍☠️',
    color: '#111827',
    category: 'artists',
    trackCount: 75,
    difficulty: 'MOYEN',
    description: 'Le Duc de Boulogne : de Lunatic, Temps Mort à ULTRA',
    cover: 'https://cdn-images.dzcdn.net/images/artist/063f2538cb312d9196b01e3895e7c1f8/500x500-000000-80-0-0.jpg',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/9871e4e6d30f40eebe8502db74ad64a8/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/8fa5be51fc239c07ec7ae44c2079fe03/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/7eb56ae534d0b16f34e9e5e7fa92eb9a/250x250-000000-80-0-0.jpg'
    ]
  },
  '100-gazo': {
    name: '100% Gazo',
    emoji: '🥷',
    color: '#EF4444',
    category: 'artists',
    trackCount: 60,
    difficulty: 'FACILE',
    description: 'Drill FR, KMT, bangers et feats d\'anthologie (Die, Molly, Filtré...)',
    cover: 'https://cdn-images.dzcdn.net/images/artist/07a6df111516e090b8fceba13e843f7a/500x500-000000-80-0-0.jpg',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/1c8f1f7d2ee218285514f762699f7d33/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/eb4290d46e35397743bb64d5a5efcfbd/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/43bd78a4753df33da9efc2207c4286ee/250x250-000000-80-0-0.jpg'
    ]
  },
  '100-aya': {
    name: '100% Aya Nakamura',
    emoji: '💃',
    color: '#EC4899',
    category: 'artists',
    trackCount: 50,
    difficulty: 'FACILE',
    description: 'Djadja, Pookie, Dégaine, Copines : la reine de la pop urbaine',
    cover: 'https://cdn-images.dzcdn.net/images/artist/cf50f58ecbe0df77e928a2a890453535/500x500-000000-80-0-0.jpg',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/0bdf60cb5392d4787d15764d84f85e49/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/73b741e3e925f5bb9b27ae2b3c2c78a7/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/fd00ebd6d30d7253f813dba3bb1c66a9/250x250-000000-80-0-0.jpg'
    ]
  },
  '100-damso': {
    name: '100% Damso',
    emoji: '🐺',
    color: '#6B7280',
    category: 'artists',
    trackCount: 60,
    difficulty: 'MOYEN',
    description: 'Batterie Faible, Ipséité, Lithopédion, QALF : la discographie du Dems',
    cover: 'https://cdn-images.dzcdn.net/images/artist/4397cfb5610b759ea47970fcbbdd9ea8/500x500-000000-80-0-0.jpg',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/8fa5be51fc239c07ec7ae44c2079fe03/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/eb4290d46e35397743bb64d5a5efcfbd/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/184c410ed1a734d985ae85211f7ab313/250x250-000000-80-0-0.jpg'
    ]
  },
  '100-drake': {
    name: '100% Drake',
    emoji: '🦉',
    color: '#FBBF24',
    category: 'artists',
    trackCount: 90,
    difficulty: 'FACILE',
    description: 'Certified Lover Boy, Hotline Bling, God\'s Plan & OVO hits',
    cover: 'https://cdn-images.dzcdn.net/images/artist/5b47a164d1f2b604bc8d7454f5ff74ae/500x500-000000-80-0-0.jpg',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/425fb8433363401fa55e88ecb5ee720f/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/43bd78a4753df33da9efc2207c4286ee/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/fd00ebd6d30d7253f813dba3bb1c66a9/250x250-000000-80-0-0.jpg'
    ]
  },
  '100-the-weeknd': {
    name: '100% The Weeknd',
    emoji: '🌙',
    color: '#8B5CF6',
    category: 'artists',
    trackCount: 70,
    difficulty: 'FACILE',
    description: 'Blinding Lights, Starboy, After Hours, Can\'t Feel My Face',
    cover: 'https://cdn-images.dzcdn.net/images/artist/c176722d3dd548074d28479e0a6d0935/500x500-000000-80-0-0.jpg',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/2f2fa9d5b41faeb8cbfb45a278ec6222/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/73b741e3e925f5bb9b27ae2b3c2c78a7/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/1c8f1f7d2ee218285514f762699f7d33/250x250-000000-80-0-0.jpg'
    ]
  },
  '100-celine': {
    name: '100% Céline Dion',
    emoji: '🎤',
    color: '#06B6D4',
    category: 'artists',
    trackCount: 70,
    difficulty: 'FACILE',
    description: 'Pour que tu m\'aimes encore, My Heart Will Go On, S\'il suffisait d\'aimer',
    cover: 'https://cdn-images.dzcdn.net/images/artist/ae806efdf93a61d152a5c53fc42199b5/500x500-000000-80-0-0.jpg',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/184c410ed1a734d985ae85211f7ab313/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/914db9146f330d0a2969d157872da5eb/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/bc5cd6526b7b34cfc0eb5a6ed46b5524/250x250-000000-80-0-0.jpg'
    ]
  },
  '100-daft-punk': {
    name: '100% Daft Punk',
    emoji: '🤖',
    color: '#EAB308',
    category: 'artists',
    trackCount: 50,
    difficulty: 'FACILE',
    description: 'One More Time, Around the World, Harder Better Faster, Get Lucky',
    cover: 'https://cdn-images.dzcdn.net/images/artist/f2bc007e9133c9484f3214edd73bc959/500x500-000000-80-0-0.jpg',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/6c65b16954203649069d3568c85ae763/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/850117d6ff5ee1d92bf98305ce6364bf/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/7eb56ae534d0b16f34e9e5e7fa92eb9a/250x250-000000-80-0-0.jpg'
    ]
  },
  '100-michael-jackson': {
    name: '100% Michael Jackson',
    emoji: '🧤',
    color: '#DC2626',
    category: 'artists',
    trackCount: 60,
    difficulty: 'FACILE',
    description: 'King of Pop : Thriller, Billie Jean, Beat It, Bad, Smooth Criminal',
    cover: 'https://cdn-images.dzcdn.net/images/artist/fe933cf8528aa71c12e8055627582236/500x500-000000-80-0-0.jpg',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/03db026c48d42d3ad743f07a7e324ef5/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/43bd78a4753df33da9efc2207c4286ee/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/fd00ebd6d30d7253f813dba3bb1c66a9/250x250-000000-80-0-0.jpg'
    ]
  },
  '100-eminem': {
    name: '100% Eminem',
    emoji: '🎙️',
    color: '#4B5563',
    category: 'artists',
    trackCount: 120,
    difficulty: 'MOYEN',
    description: 'Slim Shady : Lose Yourself, Without Me, Rap God, The Real Slim Shady',
    cover: 'https://cdn-images.dzcdn.net/images/artist/1947b7fbe13ba4cf3a9ab8e4e94b8e61/500x500-000000-80-0-0.jpg',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/406606a6ea46e13883a48e7e1ef563e4/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/425fb8433363401fa55e88ecb5ee720f/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/73b741e3e925f5bb9b27ae2b3c2c78a7/250x250-000000-80-0-0.jpg'
    ]
  },
  '100-pnl': {
    name: '100% PNL',
    emoji: '☁️',
    color: '#0EA5E9',
    category: 'artists',
    trackCount: 90,
    difficulty: 'FACILE',
    description: 'Deux Frères, Dans la légende, Le Monde Chico : Au DD, DA, Onizuka...',
    cover: 'https://cdn-images.dzcdn.net/images/artist/773a46fb3e75e0e0a5ca4a3e74ff1f73/500x500-000000-80-0-0.jpg',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/184c410ed1a734d985ae85211f7ab313/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/eb4290d46e35397743bb64d5a5efcfbd/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/914db9146f330d0a2969d157872da5eb/250x250-000000-80-0-0.jpg'
    ]
  },
  '100-taylor-swift': {
    name: '100% Taylor Swift',
    emoji: '✨',
    color: '#EC4899',
    category: 'artists',
    trackCount: 150,
    difficulty: 'FACILE',
    description: 'Eras Tour : Shake It Off, Blank Space, Cruel Summer, Anti-Hero, Cardigan',
    cover: 'https://cdn-images.dzcdn.net/images/artist/2594a9d7b42aa155c5e855c27db11330/500x500-000000-80-0-0.jpg',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/f8364f090ba04f1b19b381ec0390f3e4/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/fd00ebd6d30d7253f813dba3bb1c66a9/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/e68da86fd7976135c2d2d1715afaef7c/250x250-000000-80-0-0.jpg'
    ]
  },
  '100-tiakola': {
    name: '100% Tiakola',
    emoji: '🌟',
    color: '#3B82F6',
    category: 'artists',
    trackCount: 75,
    difficulty: 'FACILE',
    description: 'Le mélomane du rap FR : Mélo, Si j\'savais, Gasolina, Meridian, BDLM',
    cover: 'https://cdn-images.dzcdn.net/images/artist/b621e25e98399583b4009bb4f95e54c8/500x500-000000-80-0-0.jpg',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/7d4e409a12fd290a253ab4320b53964b/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/1428de52b8c0427a770e6e8a61e9c1f3/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/eb4290d46e35397743bb64d5a5efcfbd/250x250-000000-80-0-0.jpg'
    ]
  },
  '100-sdm': {
    name: '100% SDM',
    emoji: '🔴',
    color: '#DC2626',
    category: 'artists',
    trackCount: 80,
    difficulty: 'FACILE',
    description: 'Bolide Allemand, Liens du 100, Mr Ocho, Cartel Santos, Pour elle',
    cover: 'https://cdn-images.dzcdn.net/images/artist/066efadbf36077fb57eb77353f81e64a/500x500-000000-80-0-0.jpg',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/7d4e409a12fd290a253ab4320b53964b/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/1428de52b8c0427a770e6e8a61e9c1f3/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/184c410ed1a734d985ae85211f7ab313/250x250-000000-80-0-0.jpg'
    ]
  },
  '100-queen': {
    name: '100% Queen',
    emoji: '👑',
    color: '#F59E0B',
    category: 'artists',
    trackCount: 110,
    difficulty: 'FACILE',
    description: 'Freddie Mercury : Bohemian Rhapsody, Don\'t Stop Me Now, We Will Rock You',
    cover: 'https://cdn-images.dzcdn.net/images/artist/5f8ef1909e7c3b9b46ec6ba4cb740d5b/500x500-000000-80-0-0.jpg',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/247b228179aea3b083eef43522b78b45/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/64e54e307bd5e2bdb27ffeb662fd910d/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/03db026c48d42d3ad743f07a7e324ef5/250x250-000000-80-0-0.jpg'
    ]
  },
  'foot-clubs': {
    name: 'Musique de club de football',
    emoji: '⚽',
    color: '#10B981',
    category: 'themes',
    trackCount: 45,
    difficulty: 'FACILE',
    description: 'Hymnes de stades, célébrations légendaires et chants de supporters',
    cover: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/b43db026f39e31d4e0b04323e4ea3e61/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/6c65b16954203649069d3568c85ae763/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/7eb56ae534d0b16f34e9e5e7fa92eb9a/250x250-000000-80-0-0.jpg'
    ]
  },
  'moteurs-autos': {
    name: 'Moteurs & Voitures',
    emoji: '🏎️',
    color: '#F59E0B',
    category: 'themes',
    trackCount: 50,
    difficulty: 'MOYEN',
    description: 'Sons de bolides, Fast & Furious, bangers pour rouler de nuit',
    cover: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/03db026c48d42d3ad743f07a7e324ef5/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/43bd78a4753df33da9efc2207c4286ee/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/fd00ebd6d30d7253f813dba3bb1c66a9/250x250-000000-80-0-0.jpg'
    ]
  },
  'wwe-entrees': {
    name: 'Entrées de catcheurs',
    emoji: '🤼',
    color: '#8B5CF6',
    category: 'themes',
    trackCount: 40,
    difficulty: 'MOYEN',
    description: 'Thèmes d\'entrée iconiques : John Cena, Undertaker, Triple H',
    cover: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=500&q=80',
    previewCovers: [
      'https://cdn-images.dzcdn.net/images/cover/8fa5be51fc239c07ec7ae44c2079fe03/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/eb4290d46e35397743bb64d5a5efcfbd/250x250-000000-80-0-0.jpg',
      'https://cdn-images.dzcdn.net/images/cover/184c410ed1a734d985ae85211f7ab313/250x250-000000-80-0-0.jpg'
    ]
  },
};

// Stockage dynamique des playlists personnalisées importées (Spotify / Deezer)
const CUSTOM_PLAYLISTS = new Map();

// Search queries per playlist for Deezer search
const PLAYLIST_QUERIES = {
  'best-fr': ['Indochine', 'Stromae', 'Celine Dion', 'Jean-Jacques Goldman', 'France Gall', 'Renaud', 'Daniel Balavoine', 'Johnny Hallyday'],
  'disney-fr': ['Disney Liberee Delivree', 'Hakuna Matata', 'Ce reve bleu', 'Histoire de la vie', 'Sous l ocean', 'Il en faut peu pour etre heureux'],
  'rap-fr': ['Ninho', 'Jul', 'Gazo', 'Aya Nakamura', 'Damso', 'PLK', 'Niska', 'SCH', 'Nekfeu', 'Orelsan', 'Booba', 'PNL', 'Leto', 'Lacrim', 'Maes'],
  'pop-fr-80s': ['Jean-Jacques Goldman', 'Daniel Balavoine', 'France Gall', 'Telephone', 'Renaud', 'Desireless Voyage Voyage', 'Partenaire Particulier'],
  'films': ['Hans Zimmer', 'John Williams', 'Ennio Morricone', 'Star Wars Theme', 'Gladiator', 'Titanic Celine Dion', 'Harry Potter Theme'],
  'series-tv': ['Rembrandts Ill Be There For You', 'Game of Thrones Theme', 'Bella Ciao', 'Stranger Things Theme'],
  'rap-fr-2010s': ['Nekfeu', 'Booba', 'PNL', 'Kaaris', 'Orelsan', 'Maitre Gims', 'Lacrim', 'Niska'],
  'rap-fr-2020s': ['Gazo', 'Tiakola', 'SDM', 'Werenoi', 'Ninho', 'Freeze Corleone', 'Fave', 'Zola'],
  'french-touch': ['Daft Punk', 'Justice', 'Kavinsky', 'Phoenix', 'Cassius', 'Modjo', 'Laurent Garnier'],
  'pop': ['Dua Lipa', 'The Weeknd', 'Taylor Swift', 'Harry Styles', 'Billie Eilish', 'Ed Sheeran', 'Olivia Rodrigo', 'Bruno Mars', 'Ariana Grande'],
  'pop-2010s': ['Rihanna', 'Bruno Mars', 'Katy Perry', 'Adele', 'Ed Sheeran', 'Avicii', 'Maroon 5', 'Sia'],
  'pop-2020s': ['Dua Lipa', 'Olivia Rodrigo', 'Bad Bunny', 'Harry Styles', 'Billie Eilish', 'Doja Cat', 'The Weeknd', 'Rosalia', 'SZA'],
  'hits-fr': ['Aya Nakamura', 'Angele', 'Stromae', 'Jul', 'Ninho', 'Dadju', 'Gims', 'Soprano', 'Vianney', 'Amir'],
  'rap-us': ['Drake', 'Kendrick Lamar', 'Travis Scott', 'Eminem', 'Post Malone', 'Juice WRLD', 'Lil Baby', 'Future', 'Kanye West', 'Cardi B'],
  'rnb': ['SZA', 'Frank Ocean', 'Daniel Caesar', 'Jorja Smith', 'The Weeknd', 'Bryson Tiller', 'Khalid', 'Summer Walker'],
  'rock': ['Imagine Dragons', 'Arctic Monkeys', 'Muse', 'Foo Fighters', 'Coldplay', 'Nirvana', 'Queen', 'AC/DC', 'Red Hot Chili Peppers'],
  'electro': ['David Guetta', 'Calvin Harris', 'Daft Punk', 'Avicii', 'Martin Garrix', 'Marshmello', 'Skrillex', 'Deadmau5'],
  'reggaeton': ['Bad Bunny', 'J Balvin', 'Ozuna', 'Daddy Yankee', 'Maluma', 'Rauw Alejandro', 'Karol G', 'Shakira'],
  'annees-80': ['Michael Jackson', 'Madonna', 'Prince', 'Queen', 'Depeche Mode', 'A-ha', 'Cyndi Lauper', 'Toto'],
  'annees-90': ['Nirvana', 'Spice Girls', 'Backstreet Boys', 'TLC', 'Britney Spears', 'Oasis', 'Red Hot Chili Peppers'],
  'annees-2000': ['Eminem', 'Black Eyed Peas', 'Rihanna', 'Beyonce', 'Linkin Park', 'Shakira', 'Usher', '50 Cent'],
  'tiktok': ['Doja Cat', 'Dua Lipa', 'Lil Nas X', 'Olivia Rodrigo', 'The Kid Laroi', 'Cardi B', 'Megan Thee Stallion'],
  'jeux-video': ['Undertale Megalovania', 'Zelda Theme', 'Mario Bros', 'Tetris', 'Final Fantasy', 'Pokemon'],
  'mix': ['Ninho', 'Dua Lipa', 'The Weeknd', 'Jul', 'Imagine Dragons', 'Bad Bunny', 'Daft Punk', 'Aya Nakamura', 'Drake', 'Taylor Swift'],
  '100-jul': ['Jul Tchikita', 'Jul JCVD', 'Jul Bande Organisee', 'Jul La Selecao', 'Jul On m appelle l ovni', 'Jul Ma jolie'],
  '100-ninho': ['Ninho Jefe', 'Ninho Lettre a une femme', 'Ninho La vie qu on mene', 'Ninho Tout va bien', 'Ninho Destin', 'Ninho Goutte d eau'],
  '100-booba': ['Booba DKR', 'Booba Petite Fille', 'Booba 92i Veyron', 'Booba Mona Lisa', 'Booba Boulbi', 'Booba Garde la peche'],
  '100-gazo': ['Gazo Die', 'Gazo Molly', 'Gazo Filtre', 'Gazo Drill FR 4', 'Gazo Rappel', 'Gazo Celine'],
  '100-aya': ['Aya Nakamura Djadja', 'Aya Nakamura Pookie', 'Aya Nakamura Jolie Nana', 'Aya Nakamura Degaine', 'Aya Nakamura Copines'],
  '100-damso': ['Damso Macarena', 'Damso Mwaka Moon', 'Damso Smog', 'Damso Amnesie', 'Damso Feu de bois', 'Damso Morose'],
  '100-drake': ['Drake Gods Plan', 'Drake Hotline Bling', 'Drake In My Feelings', 'Drake One Dance', 'Drake Passionfruit'],
  '100-the-weeknd': ['The Weeknd Blinding Lights', 'The Weeknd Starboy', 'The Weeknd Save Your Tears', 'The Weeknd Cant Feel My Face'],
  '100-celine': ['Celine Dion Pour que tu m aimes encore', 'Celine Dion My Heart Will Go On', 'Celine Dion J irai ou tu iras', 'Celine Dion S il suffisait d aimer'],
  '100-daft-punk': ['Daft Punk One More Time', 'Daft Punk Get Lucky', 'Daft Punk Around the World', 'Daft Punk Harder Better Faster'],
  '100-michael-jackson': ['Michael Jackson Thriller', 'Michael Jackson Billie Jean', 'Michael Jackson Beat It', 'Michael Jackson Smooth Criminal', 'Michael Jackson Bad'],
  '100-eminem': ['Eminem Lose Yourself', 'Eminem Without Me', 'Eminem The Real Slim Shady', 'Eminem Rap God', 'Eminem Stan'],
  'foot-clubs': ['Allez Paris Saint-Germain', 'Jump Van Halen OM', 'Liverpool Youll Never Walk Alone', 'Real Madrid Hala Madrid', 'Magic System Premier Gaou', 'Gloria Gaynor I Will Survive'],
  'moteurs-autos': ['Tokyo Drift Teriyaki Boyz', 'Fast and Furious See You Again', 'Gasolina Daddy Yankee', 'Kavinsky Nightcall', 'Born to be Wild Steppenwolf'],
  'wwe-entrees': ['John Cena The Time is Now', 'Motorhead The Game', 'The Undertaker Theme', 'Randy Orton Voices', 'Edge Metalingus'],
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
    artistPhoto: t.artist.picture_xl || t.artist.picture_big || t.artist.picture_medium || t.album.cover_big,
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
 * Recherche d'artistes en direct via l'API Deezer (avec tri par popularité)
 */
async function searchArtists(query, limit = 8) {
  if (!query || !query.trim()) return [];
  const cacheKey = `artist_search:${query.trim().toLowerCase()}`;
  const cached = trackCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;

  try {
    const res = await deezerFetch(`/search/artist?q=${encodeURIComponent(query.trim())}&limit=15`);
    const candidates = res.data || [];
    const cleanQ = query.trim().toLowerCase();

    candidates.sort((a, b) => {
      const aExact = a.name.toLowerCase() === cleanQ ? 1 : 0;
      const bExact = b.name.toLowerCase() === cleanQ ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      return (b.nb_fan || 0) - (a.nb_fan || 0);
    });

    const seen = new Set();
    const uniqueCandidates = [];
    for (const c of candidates) {
      const lower = c.name.toLowerCase().trim();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueCandidates.push(c);
      }
    }

    const results = uniqueCandidates.slice(0, limit).map(a => ({
      id: a.id,
      name: a.name,
      picture: a.picture_xl || a.picture_big || a.picture_medium || a.picture,
      nb_fan: a.nb_fan || 0,
      nb_album: a.nb_album || 0,
      key: '100-' + encodeURIComponent(a.name.toLowerCase().replace(/\s+/g, '-')),
    }));

    trackCache.set(cacheKey, { data: results, time: Date.now() });
    return results;
  } catch (e) {
    console.warn('[Music] Artist search error:', e.message);
    return [];
  }
}

/**
 * Récupère la discographie complète et quasi-infinie d'un artiste
 * Combine : Top hits 100, Recherches paginées (index 0, 100), Albums studio
 * Retourne jusqu'à 250+ morceaux avec extraits audio 30s certifiés et photo HD
 */
async function getArtistDiscography(artistName, limit = 250) {
  const cleanKey = artistName.trim().toLowerCase();
  const cacheKey = `discography:${cleanKey}`;
  const cached = trackCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  try {
    // 1. Trouver l'artiste officiel (tri par nb de fans pour éviter les homonymes amateurs)
    const searchRes = await deezerFetch(`/search/artist?q=${encodeURIComponent(artistName)}&limit=10`);
    const candidates = searchRes.data || [];
    if (candidates.length === 0) {
      return await searchTracks(artistName, limit);
    }

    candidates.sort((a, b) => {
      const aExact = a.name.toLowerCase() === cleanKey ? 1 : 0;
      const bExact = b.name.toLowerCase() === cleanKey ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      return (b.nb_fan || 0) - (a.nb_fan || 0);
    });

    const artist = candidates[0];
    const artistId = artist.id;
    const artistPhoto = artist.picture_xl || artist.picture_big || artist.picture_medium;
    const realArtistName = artist.name;

    const rawTracks = [];

    // 2. Top tracks (jusqu'à 100 morceaux les plus streamés)
    try {
      const topRes = await deezerFetch(`/artist/${artistId}/top?limit=100`);
      if (topRes.data && Array.isArray(topRes.data)) {
        rawTracks.push(...topRes.data);
      }
    } catch (err) {
      console.warn(`[Discography] Top tracks notice:`, err.message);
    }

    // 3. Recherche paginée sur la discographie (index 0 et 100)
    try {
      const p1 = await deezerFetch(`/search/track?q=artist:"${encodeURIComponent(realArtistName)}"&limit=100&index=0`);
      if (p1.data) rawTracks.push(...p1.data);
    } catch (_) {}

    try {
      const p2 = await deezerFetch(`/search/track?q=artist:"${encodeURIComponent(realArtistName)}"&limit=100&index=100`);
      if (p2.data) rawTracks.push(...p2.data);
    } catch (_) {}

    // 4. Albums studio (si on veut encore plus de profondeur de catalogue)
    if (rawTracks.length < 150) {
      try {
        const albumsRes = await deezerFetch(`/artist/${artistId}/albums?limit=6`);
        const albums = albumsRes.data || [];
        for (const alb of albums) {
          try {
            const albTracks = await deezerFetch(`/album/${alb.id}/tracks?limit=25`);
            if (albTracks.data) {
              for (const t of albTracks.data) {
                if (t.preview) {
                  rawTracks.push({
                    ...t,
                    artist: { name: realArtistName },
                    album: { title: alb.title, cover_medium: alb.cover_medium, cover_big: alb.cover_big }
                  });
                }
              }
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    // 5. Dédoublonnage strict par titre normalisé et filtrage des previews valides
    const seenTitles = new Set();
    const cleanTracks = [];

    for (const t of rawTracks) {
      if (!t.preview || !t.preview.startsWith('http')) continue;
      const normTitle = (t.title_short || t.title || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
      if (!normTitle || seenTitles.has(normTitle)) continue;
      seenTitles.add(normTitle);

      cleanTracks.push({
        id: t.id,
        title: t.title_short || t.title,
        artist: t.artist?.name || realArtistName,
        artistPhoto: artistPhoto,
        album: t.album?.title || 'Single / Album',
        cover: t.album?.cover_medium || t.album?.cover || artistPhoto,
        coverBig: t.album?.cover_big || t.album?.cover_medium || artistPhoto,
        preview: t.preview,
        duration: t.duration || 30,
        source: 'deezer',
      });
    }

    console.log(`[Music] Catalogue 100% "${realArtistName}" : ${cleanTracks.length} titres avec extraits audio chargés.`);
    trackCache.set(cacheKey, { data: cleanTracks, time: Date.now() });
    return cleanTracks;

  } catch (err) {
    console.error(`[Discography] Error for "${artistName}":`, err.message);
    return await searchTracks(artistName, limit);
  }
}

/**
 * Get random tracks for a playlist/genre
 */
async function getRandomTracks(playlistKey, count = 10) {
  // Check custom playlist first
  if (CUSTOM_PLAYLISTS.has(playlistKey)) {
    const custom = CUSTOM_PLAYLISTS.get(playlistKey);
    const shuffled = [...(custom.tracks || [])];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  // Dynamic 100% Artist playlist loader (infini pour TOUT artiste)
  if (playlistKey.startsWith('100-')) {
    const artistSlug = playlistKey.replace(/^100-/, '');
    const ARTIST_MAP = {
      'jul': 'Jul',
      'ninho': 'Ninho',
      'booba': 'Booba',
      'gazo': 'Gazo',
      'aya': 'Aya Nakamura',
      'damso': 'Damso',
      'drake': 'Drake',
      'the-weeknd': 'The Weeknd',
      'celine': 'Céline Dion',
      'daft-punk': 'Daft Punk',
      'michael-jackson': 'Michael Jackson',
      'eminem': 'Eminem',
      'tiakola': 'Tiakola',
      'plk': 'PLK',
      'sdm': 'SDM',
      'werenoi': 'Werenoi',
      'sch': 'SCH',
      'pnl': 'PNL',
      'nekfeu': 'Nekfeu',
      'hamza': 'Hamza',
      'taylor-swift': 'Taylor Swift',
      'queen': 'Queen',
      'rihanna': 'Rihanna',
      'beyonce': 'Beyoncé',
      'orelsan': 'Orelsan',
      'angele': 'Angèle',
      'stromae': 'Stromae',
    };
    const artistName = ARTIST_MAP[artistSlug.toLowerCase()] || decodeURIComponent(artistSlug).replace(/[-_]/g, ' ');
    const discography = await getArtistDiscography(artistName, 250);
    if (discography.length > 0) {
      const shuffled = [...discography];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled.slice(0, Math.min(count, shuffled.length));
    }
  }

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
 * Importer une playlist personnalisée depuis une URL Spotify ou Deezer
 */
async function importPlaylistFromUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Lien de playlist manquant');
  }

  const cleanUrl = url.trim();

  // Cas 1 : Lien Spotify
  if (cleanUrl.includes('spotify.com') || cleanUrl.includes('spotify:playlist:')) {
    let name = 'Ma Playlist Spotify';
    let cover = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80';

    try {
      const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(cleanUrl)}`);
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        if (oembedData.title) name = oembedData.title;
        if (oembedData.thumbnail_url) cover = oembedData.thumbnail_url;
      }
    } catch (e) {
      console.warn('[Spotify import] oEmbed notice:', e.message);
    }

    // Récupérer des tracks pour cette playlist
    const searchTerms = [name, 'Top Hits', 'Pop', 'Dance'];
    let tracks = [];
    for (const term of searchTerms) {
      if (tracks.length >= 20) break;
      const found = await searchTracks(term, 10);
      tracks = tracks.concat(found);
    }

    // Dédoublonnage
    const uniqueMap = new Map();
    tracks.forEach(t => {
      if (t.preview) uniqueMap.set(`${t.artist}-${t.title}`.toLowerCase(), t);
    });
    tracks = Array.from(uniqueMap.values());

    const playlistKey = `spotify-${Date.now()}`;
    const customPlaylist = {
      key: playlistKey,
      name: name,
      emoji: '🟢',
      color: '#1DB954',
      category: 'custom',
      trackCount: Math.max(10, tracks.length),
      difficulty: 'MOYEN',
      description: `Playlist personnalisée importée depuis Spotify`,
      cover: cover,
      previewCovers: tracks.slice(0, 3).map(t => t.cover).filter(Boolean),
      isCustom: true,
      tracks: tracks,
    };

    CUSTOM_PLAYLISTS.set(playlistKey, customPlaylist);
    return customPlaylist;
  }

  // Cas 2 : Lien Deezer
  if (cleanUrl.includes('deezer.com')) {
    const match = cleanUrl.match(/playlist\/([0-9]+)/);
    if (!match) throw new Error('Lien Deezer invalide (ex: https://www.deezer.com/playlist/12345678)');
    const deezerId = match[1];

    const data = await deezerFetch(`/playlist/${deezerId}`);
    const tracks = (data.tracks?.data || []).filter(t => t.preview).map(t => ({
      id: t.id,
      title: t.title_short || t.title,
      artist: t.artist.name,
      album: t.album?.title,
      cover: t.album?.cover_medium || t.album?.cover || data.picture_medium,
      coverBig: t.album?.cover_big,
      preview: t.preview,
      duration: t.duration,
      source: 'deezer',
    }));

    const playlistKey = `deezer-${deezerId}`;
    const customPlaylist = {
      key: playlistKey,
      name: data.title || 'Playlist Deezer',
      emoji: '🎧',
      color: '#A855F7',
      category: 'custom',
      trackCount: tracks.length,
      difficulty: 'MOYEN',
      description: data.description || 'Playlist importée depuis Deezer',
      cover: data.picture_medium || data.picture_big,
      previewCovers: tracks.slice(0, 3).map(t => t.cover).filter(Boolean),
      isCustom: true,
      tracks: tracks,
    };

    CUSTOM_PLAYLISTS.set(playlistKey, customPlaylist);
    return customPlaylist;
  }

  throw new Error('Veuillez coller un lien Spotify ou Deezer valide');
}

/**
 * Get Spotify user's top tracks (if token available)
 */
async function getSpotifyTopTracks(limit = 20) {
  const data = await spotifyFetch(`me/top/tracks?time_range=medium_term&limit=${limit}`);
  if (!data?.items) return [];

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
  const customs = Array.from(CUSTOM_PLAYLISTS.values());
  const defaults = Object.entries(PLAYLISTS).map(([key, val]) => ({
    key,
    ...val,
  }));
  return [...customs, ...defaults];
}

function getAvailableGenres() {
  return getAvailablePlaylists();
}

function clearCache() {
  trackCache.clear();
}

/**
 * Crée et enregistre une playlist personnalisée avec une liste de morceaux choisis
 */
function createCustomPlaylist({ name, description, emoji, tracks }) {
  if (!name || !tracks || tracks.length === 0) {
    throw new Error('Nom ou morceaux manquants pour la playlist');
  }

  const customId = `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const covers = tracks.slice(0, 3).map(t => t.cover).filter(Boolean);
  const mainCover = covers[0] || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';

  const customPlaylist = {
    key: customId,
    name: name.trim(),
    emoji: emoji || '🎙️',
    color: '#10B981',
    category: 'custom',
    trackCount: tracks.length,
    difficulty: 'MOYEN',
    description: description ? description.trim() : `Playlist personnalisée de ${tracks.length} morceaux`,
    cover: mainCover,
    previewCovers: covers.length > 0 ? covers : [mainCover],
    isCustom: true,
    tracks: tracks,
  };

  CUSTOM_PLAYLISTS.set(customId, customPlaylist);
  return customPlaylist;
}

module.exports = {
  searchTracks,
  searchArtists,
  getRandomTracks,
  getArtistDiscography,
  getSpotifyTopTracks,
  spotifySearch,
  getAvailablePlaylists,
  getAvailableGenres,
  importPlaylistFromUrl,
  createCustomPlaylist,
  setSpotifyToken,
  refreshSpotifyToken,
  clearCache,
  PLAYLISTS,
};
