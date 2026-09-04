const fuzzball = require('fuzzball');

/**
 * Banque de messages de feedback fun
 */
const FEEDBACK_CORRECT = [
  "Bien vu, t'es chaud ! 🔥",
  "GG, oreille absolue ! 🎧",
  "Facile pour toi, hein ? 😎",
  "Tu gères, c'est validé ! ✅",
  "Incroyable, t'es une shazam humaine ! 🤖",
  "Bravo, même avec un accent bizarre ! 😄",
  "Stylé, tu connais tes classiques ! 💎",
  "Impressionnant, t'as les oreilles qui traînent partout ! 👂",
  "Boom, dans le mille ! 🎯",
  "Respect, tu connais ton son ! 🫡",
];

const FEEDBACK_CLOSE = [
  "Presque ! T'y étais quasi… 😬",
  "Aïe, si proche et si loin ! 💔",
  "C'était chaud mais pas assez ! 🌡️",
  "Tu brûles, mais t'as pas trouvé ! 🔥",
  "Hmm, t'as écorché le nom là… 😅",
];

const FEEDBACK_WRONG = [
  "Raté ! C'est pas ça du tout 😂",
  "Nope, essaie encore la prochaine fois ! ❌",
  "Alors là, pas du tout 🙃",
  "T'as confondu avec qui ? 😭",
  "C'est non, mon ami ! 🚫",
  "Aïe aïe aïe… faut réviser tes playlists ! 📚",
  "Même mon chat aurait mieux deviné 🐱",
  "Perdu ! Allez, au prochain round ! 💪",
];

/**
 * Normalise une chaîne pour la comparaison :
 * - lowercase
 * - suppression des accents
 * - suppression des articles et mots de liaison
 * - suppression de la ponctuation
 * - trim et collapse espaces multiples
 */
function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les accents
    .replace(/[''`]/g, ' ')          // apostrophes → espace
    .replace(/[-–—]/g, ' ')          // tirets → espace
    .replace(/[.,!?;:()[\]{}""«»"]/g, '') // ponctuation
    .replace(/\b(le|la|les|l|un|une|des|du|de|d|the|a|an|feat|ft|featuring|vs|and|et)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcule un score de correspondance entre deux chaînes
 * Utilise plusieurs algorithmes fuzzy et retourne le meilleur score
 */
function computeMatchScore(input, expected) {
  if (!input || !expected) return 0;

  const normInput = normalize(input);
  const normExpected = normalize(expected);

  if (!normInput || !normExpected) return 0;

  // Correspondance exacte après normalisation
  if (normInput === normExpected) return 100;

  // Calcul de plusieurs scores fuzzy
  const ratioScore = fuzzball.ratio(normInput, normExpected);
  const partialScore = fuzzball.partial_ratio(normInput, normExpected);
  const tokenSortScore = fuzzball.token_sort_ratio(normInput, normExpected);
  const tokenSetScore = fuzzball.token_set_ratio(normInput, normExpected);

  // Pondération : on favorise token_set (ignore l'ordre et les mots en trop)
  const best = Math.max(ratioScore, partialScore, tokenSortScore, tokenSetScore);

  // Weighted average avec bonus pour le meilleur algorithme
  const weighted = Math.round(
    ratioScore * 0.15 +
    partialScore * 0.25 +
    tokenSortScore * 0.25 +
    tokenSetScore * 0.35
  );

  return Math.max(best, weighted);
}

/**
 * Vérifie si au moins un mot-clé du titre est présent dans la réponse
 */
function hasKeywordMatch(answer, title) {
  const normAnswer = normalize(answer);
  const normTitle = normalize(title);
  const titleWords = normTitle.split(' ').filter(w => w.length > 2);

  if (titleWords.length === 0) {
    // Titre d'un seul mot court (ex: "Jefe") — on utilise le fuzzy matching
    return computeMatchScore(normAnswer, normTitle) >= 65;
  }

  return titleWords.some(word => {
    // Vérifie si le mot est contenu dans la réponse (fuzzy)
    const answerWords = normAnswer.split(' ');
    return answerWords.some(aw => {
      if (aw === word) return true;
      return fuzzball.ratio(aw, word) >= 75;
    });
  });
}

/**
 * Choisit un message de feedback aléatoire en fonction du résultat
 */
function pickFeedback(isCorrect, score, expectedArtist, expectedTitle) {
  if (isCorrect) {
    return FEEDBACK_CORRECT[Math.floor(Math.random() * FEEDBACK_CORRECT.length)];
  }

  if (score >= 45) {
    const base = FEEDBACK_CLOSE[Math.floor(Math.random() * FEEDBACK_CLOSE.length)];
    return `${base} C'était "${expectedArtist} — ${expectedTitle}"`;
  }

  const base = FEEDBACK_WRONG[Math.floor(Math.random() * FEEDBACK_WRONG.length)];
  return `${base} C'était "${expectedArtist} — ${expectedTitle}"`;
}

/**
 * Évalue la réponse d'un joueur
 * 
 * @param {Object} data
 * @param {string} data.expected_artist - L'artiste réel
 * @param {string} data.expected_title  - Le titre réel
 * @param {string} data.player_answer   - La réponse du joueur
 * @param {string} data.difficulty      - DEBUTANT | INTERMEDIAIRE | EXPERT
 * @returns {Object} { is_correct, accuracy_score, feedback_message }
 */
function evaluate(data) {
  const { expected_artist, expected_title, player_answer, difficulty } = data;

  if (!player_answer || !player_answer.trim()) {
    return {
      is_correct: false,
      accuracy_score: 0,
      feedback_message: "T'as rien dit ! Le micro marche ? 🎤"
    };
  }

  // Calculer les scores pour l'artiste et le titre séparément
  const artistScore = computeMatchScore(player_answer, expected_artist);
  const titleScore = computeMatchScore(player_answer, expected_title);

  // Score combiné : on essaie de matcher la réponse complète contre "artiste titre"
  const combinedExpected = `${expected_artist} ${expected_title}`;
  const combinedScore = computeMatchScore(player_answer, combinedExpected);

  // Score global = meilleure combinaison possible
  const overallScore = Math.max(
    combinedScore,
    Math.round((artistScore + titleScore) / 2)
  );

  let isCorrect = false;

  switch (difficulty) {
    case 'DEBUTANT':
      // Artiste OU titre correct suffit
      isCorrect = artistScore >= 70 || titleScore >= 70;
      break;

    case 'INTERMEDIAIRE':
      // Artiste correct + au moins un mot-clé du titre
      isCorrect = artistScore >= 72 && (
        titleScore >= 60 ||
        hasKeywordMatch(player_answer, expected_title)
      );
      break;

    case 'EXPERT':
      // Artiste ET titre quasi-exacts
      isCorrect = artistScore >= 80 && titleScore >= 75;
      break;

    default:
      // Fallback DEBUTANT
      isCorrect = artistScore >= 70 || titleScore >= 70;
  }

  const accuracyScore = Math.min(100, Math.max(0, overallScore));
  const feedbackMessage = pickFeedback(isCorrect, accuracyScore, expected_artist, expected_title);

  return {
    is_correct: isCorrect,
    accuracy_score: accuracyScore,
    feedback_message: feedbackMessage
  };
}

module.exports = { evaluate, normalize, computeMatchScore };
