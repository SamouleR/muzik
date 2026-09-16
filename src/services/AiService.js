const { sanitizeHTML } = require('../security/SecurityMiddleware');

/**
 * AI Service for HarmonIA — Interactive Music & Shop AI Assistant
 */
class AiService {
  constructor() {
    this.botName = 'HarmonIA';
    this.anecdotes = [
      "Le saviez-vous ? En 1983, Michael Jackson a présenté le 'Moonwalk' pour la première fois sur la chanson Billie Jean lors de l'émission des 25 ans de Motown ! 🕺",
      "Le titre 'Rap God' d'Eminem détient le record du nombre de mots dans un hit radio : 1 560 mots prononcés en seulement 6 minutes et 4 secondes ! 🎤",
      "Queen a mis plus de 3 semaines à enregistrer les voix de 'Bohemian Rhapsody' en studio, superposant plus de 180 pistes vocales différentes ! 🎼",
      "Le morceau 'Get Lucky' de Daft Punk & Pharrell Williams a été écouté plus de 64 millions de fois le jour même de sa sortie ! ⚡",
      "Ninho est l'artiste français détenant le plus grand nombre de singles certifiés de l'histoire de la musique française ! 👑",
      "La chanson 'Happy Birthday' a généré plus de 2 millions de dollars de droits par an avant d'entrer officiellement dans le domaine public en 2016 ! 🎂"
    ];

    this.playlistsAdvice = {
      rap: "Pour cartonner en Rap FR, révise tes classiques des années 2010 à aujourd'hui : Ninho, Damso, PNL, Jul et Booba. Les intros sont décisives !",
      pop: "En Pop 2020s, les refrains d'Dua Lipa, The Weeknd et Ariana Grande reviennent très vite. Reste rapide sur le clavier !",
      '80s': "Les hits 80s ont des intros de synthétiseur inoubliables. Entraîne-toi sur Indochine, Michael Jackson et Balavoine !"
    };
  }

  /**
   * Process user chat message and return natural AI response
   */
  async processMessage(userMessage, context = {}) {
    const query = (userMessage || '').toLowerCase().trim();
    const cleanQuery = sanitizeHTML(userMessage);

    // Default response structure
    let reply = "";
    let action = null;
    let suggestions = [
      "💡 Propose-moi une playlist !",
      "🪙 Comment gagner des pièces ?",
      "📖 Raconte une anecdote musicale",
      "👑 Quels avantages a le Pass VIP ?"
    ];

    // Intent 1: Anecdote
    if (query.includes('anecdote') || query.includes('histoire') || query.includes('savais-tu') || query.includes('fact')) {
      const randomAnecdote = this.anecdotes[Math.floor(Math.random() * this.anecdotes.length)];
      reply = `🎵 **Anecdote HarmonIA** :\n${randomAnecdote}`;
    }
    // Intent 2: 100% Artist blind test launcher
    if (query.includes('100%') || query.includes('100 ') || query.match(/(?:lance|jouer avec|blind test|mets du|mets de)\s+([a-zA-Z0-9éèàîôûç'-]+)/i)) {
      let artistFound = 'Jul';
      const knownArtists = ['jul', 'ninho', 'booba', 'gazo', 'damso', 'drake', 'the weeknd', 'daft punk', 'michael jackson', 'eminem', 'taylor swift', 'pnl', 'sdm', 'tiakola', 'werenoi', 'queen', 'rihanna', 'orelsan', 'sch', 'nekfeu'];
      for (const ka of knownArtists) {
        if (query.includes(ka)) {
          artistFound = ka.charAt(0).toUpperCase() + ka.slice(1);
          break;
        }
      }
      if (!artistFound || artistFound === 'Jul') {
        const match = query.match(/(?:100%?|lance(?:r)?|mets?|avec|sur)\s+([a-zA-Z0-9éèàîôûç\s'-]{2,25})/i);
        if (match && match[1] && !match[1].includes('playlist') && !match[1].includes('partie')) {
          artistFound = match[1].trim();
        }
      }

      reply = `🔥 **100% ${artistFound}** activé ! J'interroge les catalogues Deezer & Spotify pour générer une session avec des dizaines de morceaux et extraits audio 30s. Clique ci-dessous pour démarrer !`;
      action = { type: 'START_ARTIST_ROOM', artist: artistFound };
      suggestions = [
        `▶ Lancer 100% ${artistFound}`,
        "💡 Propose-moi une autre playlist",
        "📖 Anecdote sur cet artiste",
        "🪙 Astuces pour gagner des pièces"
      ];
    }
    // Intent 3: Playlist advice / Recommendation
    else if (query.includes('playlist') || query.includes('mode') || query.includes('recommand') || query.includes('jouer')) {
      if (query.includes('rap')) {
        reply = `🎤 **Conseil HarmonIA** : ${this.playlistsAdvice.rap}\nJe te suggère de lancer la playlist **100% Ninho** ou **Rap FR Végas** !`;
        action = { type: 'NAVIGATE', target: 'playlists', filter: 'rap' };
      } else if (query.includes('80') || query.includes('retro')) {
        reply = `🕶️ **Conseil HarmonIA** : ${this.playlistsAdvice['80s']}\nLa playlist **Années 80 Disco** est parfaite pour toi !`;
        action = { type: 'NAVIGATE', target: 'playlists', filter: '80s' };
      } else {
        reply = `🔮 **Recommandation HarmonIA** :\nEn fonction de ton profil, je te recommande le mode **Battle 1v1** ou la playlist **Pop 2020s** pour marquer le maximum de points !`;
        action = { type: 'NAVIGATE', target: 'playlists' };
      }
    }
    // Intent 3: Boutique & Coins advice
    else if (query.includes('pièce') || query.includes('piece') || query.includes('coin') || query.includes('boutique') || query.includes('shop') || query.includes('achat')) {
      reply = `🪙 **Guide Boutique HarmonIA** :\nTu peux gagner des pièces en jouant des parties, en réussissant des séries de victoires ou en tournant la **Roue de la Fortune** !\n👉 Dans la boutique, le **Pack Superstar (3 500 🪙)** ou le **Pass VIP PRO** t'offrent le meilleur rapport qualité-prix.`;
      action = { type: 'NAVIGATE', target: 'shop' };
    }
    // Intent 4: Pass VIP
    else if (query.includes('vip') || query.includes('pass') || query.includes('payant') || query.includes('abonnement')) {
      reply = `👑 **Pass VIP PRO Harmonie** :\nLe Pass VIP te donne un accès illimité aux 4 modes exclusifs (Battle 1v1 Ranked, Survie Extrême, Chrono 1s, Discographies 100%), des cadres animés pour ton profil et 200 pièces offertes !`;
      action = { type: 'OPEN_MODAL', modalId: 'modal-premium' };
    }
    // Intent 5: Greeting
    else if (query.includes('salut') || query.includes('bonjour') || query.includes('hello') || query.includes('coucou') || query.includes('hey')) {
      reply = `Salut ! 👋 Je suis **HarmonIA**, ton assistant DJ & conseiller musical personnel. Comment puis-je t'aider à devenir le champion du blind test aujourd'hui ?`;
    }
    // Intent 6: General / Fallback with smart response
    else {
      reply = `J'ai bien analysé ton message : « ${cleanQuery} ». 🎵\nEn tant qu'assistant HarmonIA, je peux te trouver les meilleures playlists, t'aider dans la boutique, te partager des anecdotes folles sur tes artistes préférés ou t'expliquer les règles ! Que veux-tu savoir ?`;
    }

    return {
      success: true,
      botName: this.botName,
      reply,
      action,
      suggestions,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new AiService();
