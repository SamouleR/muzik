const Arbiter = require('./src/arbiter/Arbiter');

const tests = [
  { expected_artist: 'Ninho', expected_title: 'Jefe', player_answer: 'nino jeffe', difficulty: 'DEBUTANT', desc: 'Phonetique FR simple' },
  { expected_artist: 'Michael Jackson', expected_title: 'Thriller', player_answer: 'maikeul jakson thriller', difficulty: 'EXPERT', desc: 'Phonetique anglais EXPERT' },
  { expected_artist: 'Aya Nakamura', expected_title: 'Djadja', player_answer: 'aya nakamura', difficulty: 'DEBUTANT', desc: 'Artiste seul DEBUTANT' },
  { expected_artist: 'Gazo', expected_title: 'DIE', player_answer: 'gazo die', difficulty: 'INTERMEDIAIRE', desc: 'Match exact INTER' },
  { expected_artist: 'Daft Punk', expected_title: 'Get Lucky', player_answer: 'completement faux', difficulty: 'DEBUTANT', desc: 'Reponse fausse' },
  { expected_artist: 'Jul', expected_title: 'Tchikita', player_answer: 'jul tchikita', difficulty: 'EXPERT', desc: 'Match parfait EXPERT' },
  { expected_artist: 'SCH', expected_title: 'Pharmacie', player_answer: 'esch farmacie', difficulty: 'INTERMEDIAIRE', desc: 'Phonetique FR INTER' },
  { expected_artist: 'Damso', expected_title: 'Bruxelles Vie', player_answer: '', difficulty: 'DEBUTANT', desc: 'Reponse vide' },
  { expected_artist: 'The Weeknd', expected_title: 'Blinding Lights', player_answer: 'the weekend blinding lights', difficulty: 'EXPERT', desc: 'Typo artiste EXPERT' },
];

console.log('=== ARBITER TEST SUITE ===\n');

tests.forEach(t => {
  const r = Arbiter.evaluate(t);
  const icon = r.is_correct ? 'OK' : 'FAIL';
  console.log(`[${icon}] ${t.desc}`);
  console.log(`     Input: "${t.player_answer}" -> ${t.expected_artist} - ${t.expected_title} (${t.difficulty})`);
  console.log(`     Score: ${r.accuracy_score} | ${r.feedback_message}`);
  console.log('');
});

console.log('=== DONE ===');
