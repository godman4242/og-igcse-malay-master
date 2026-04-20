// src/data/feedbackRules.js
// Maps drill rule strings → elaborative feedback with pedagogical anchors
// Key = the `rule` field from IMBUHAN_DRILLS, TENSE_DRILLS, etc.

export const GRAMMAR_FEEDBACK = {
  // === meN- prefix rules ===
  'men- + t → t drops': {
    explanation: 'When meN- meets a root starting with T, the T is replaced by N. The nasal sound "absorbs" the original consonant.',
    mnemonic: 'P, T, K, S DROP — these four consonants disappear when meN- is added.',
    anchor: '✂️',
    generativePrompt: 'Imagine the "T" being sliced away by the nasal sound "N".',
    examples: [
      { root: 'tulis', result: 'menulis', gloss: 'to write' },
      { root: 'tanya', result: 'menanya', gloss: 'to ask' },
      { root: 'tanam', result: 'menanam', gloss: 'to plant' },
    ],
    relatedRule: 'Same pattern applies with peN-: tulis → penulis (writer)',
  },
  'meny- + s → s drops': {
    explanation: 'When meN- meets S, the S is replaced by NY. The nasal "ny" replaces the sibilant.',
    mnemonic: 'P, T, K, S DROP — S becomes NY with meN-.',
    anchor: '🌊',
    generativePrompt: 'Think of the "S" melting into a soft "NY" sound.',
    examples: [
      { root: 'sapu', result: 'menyapu', gloss: 'to sweep' },
      { root: 'siram', result: 'menyiram', gloss: 'to water' },
      { root: 'sumbang', result: 'menyumbang', gloss: 'to contribute' },
    ],
    relatedRule: 'Same with peN-: sapu → penyapu (broom)',
  },
  'mem- + p → p drops': {
    explanation: 'When meN- meets P, the P is replaced by M. The bilabial nasal "m" absorbs the bilabial stop "p".',
    mnemonic: 'P, T, K, S DROP — P becomes M with meN-.',
    anchor: '👄',
    generativePrompt: 'Both P and M use both lips. The nasal M is stronger!',
    examples: [
      { root: 'potong', result: 'memotong', gloss: 'to cut' },
      { root: 'pukul', result: 'memukul', gloss: 'to hit' },
      { root: 'pilih', result: 'memilih', gloss: 'to choose' },
    ],
    relatedRule: 'Common error: writing "mempotong" — the P must drop!',
  },
  'meng- + k → k drops': {
    explanation: 'When meN- meets K, the K is replaced by NG. The velar nasal replaces the velar stop.',
    mnemonic: 'P, T, K, S DROP — K becomes NG with meN-.',
    anchor: '👅',
    generativePrompt: 'K and NG are both made at the back of the throat.',
    examples: [
      { root: 'karang', result: 'mengarang', gloss: 'to compose' },
      { root: 'kira', result: 'mengira', gloss: 'to count' },
      { root: 'kupas', result: 'mengupas', gloss: 'to peel' },
    ],
    relatedRule: 'Common error: writing "mengkarang" — the K must drop!',
  },
  'meng- + vowel': {
    explanation: 'When meN- meets a vowel-initial root, use "meng-" and keep the root unchanged.',
    mnemonic: 'Vowels are friendly — they don\'t change. Just add meng-.',
    anchor: '🤝',
    generativePrompt: 'Why is "mengambil" easier to say than "meambil"?',
    examples: [
      { root: 'ambil', result: 'mengambil', gloss: 'to take' },
      { root: 'ubah', result: 'mengubah', gloss: 'to change' },
      { root: 'ikut', result: 'mengikut', gloss: 'to follow' },
    ],
    relatedRule: 'No consonant to drop — vowels keep their shape.',
  },
  'mem- + b': {
    explanation: 'When meN- meets B, use "mem-" and keep the B. B is a bilabial like M, so it stays.',
    mnemonic: 'Only P, T, K, S drop. B stays because it\'s not in the "drop club."',
    anchor: '🛡️',
    generativePrompt: 'B is a "Strong" consonant. It resists the nasal absorption.',
    examples: [
      { root: 'baca', result: 'membaca', gloss: 'to read' },
      { root: 'beli', result: 'membeli', gloss: 'to buy' },
      { root: 'bantu', result: 'membantu', gloss: 'to help' },
    ],
    relatedRule: 'Compare: B stays (membaca) but P drops (memotong).',
  },
  'menge- + 1-syllable': {
    explanation: 'Single-syllable roots use the special "menge-" form. This is an exception to normal meN- rules.',
    mnemonic: 'Short word? Add menge-. The "e" cushions the single syllable.',
    anchor: '☁️',
    generativePrompt: 'How would "mencat" sound compared to "mengecat"?',
    examples: [
      { root: 'cat', result: 'mengecat', gloss: 'to paint' },
      { root: 'lap', result: 'mengelap', gloss: 'to wipe' },
      { root: 'bom', result: 'mengebom', gloss: 'to bomb' },
    ],
    relatedRule: 'This only applies to 1-syllable roots, regardless of starting consonant.',
  },
  'me- + l': {
    explanation: 'When meN- meets L, use "me-" (no nasal). L is a liquid consonant.',
    mnemonic: 'L, M, N, NY, NG, R, W, Y = just use "me-" (no extra nasal needed).',
    anchor: '💧',
    generativePrompt: 'Liquids (L, R) are so smooth they don\'t need a nasal helper.',
    examples: [
      { root: 'lukis', result: 'melukis', gloss: 'to draw' },
      { root: 'lipat', result: 'melipat', gloss: 'to fold' },
      { root: 'lawat', result: 'melawat', gloss: 'to visit' },
    ],
    relatedRule: 'These consonants are already "soft" — no nasal transformation needed.',
  },

  // === ber- prefix rules ===
  'bel- + ajar (irregular)': {
    explanation: 'This is an irregular form. "ber- + ajar" becomes "belajar", not "berajar".',
    mnemonic: 'belajar is the ONE exception where ber- loses its R before a vowel-initial root.',
    anchor: '⭐',
    generativePrompt: 'This is the most common word in the language. Memorize it as a special case!',
    examples: [
      { root: 'ajar', result: 'belajar', gloss: 'to study/learn' },
    ],
    relatedRule: 'Only ajar has this irregular form. All other vowel-initial roots keep ber-.',
  },
  'be- + kerja (r-initial syllable)': {
    explanation: 'When the root has an R in the first syllable (ker-), ber- drops its R to avoid "ber-ker".',
    mnemonic: 'Two R sounds too close together? Drop one: bekerja, not berkerja.',
    anchor: '🚫',
    generativePrompt: 'Try saying "ber-ker-ja" out loud. Notice how clunky it feels?',
    examples: [
      { root: 'kerja', result: 'bekerja', gloss: 'to work' },
      { root: 'serta', result: 'beserta', gloss: 'along with' },
    ],
    relatedRule: 'Same logic: ber- + kerjasama → bekerjasama.',
  },

  // === Passive di- rules ===
  'Convert meN- to di-': {
    explanation: 'To make a passive sentence: move the object to the front, replace meN- verb with di-verb, add "oleh" + subject.',
    mnemonic: 'Active: Subject + meN-verb + Object → Passive: Object + di-verb + oleh + Subject',
    anchor: '🔄',
    generativePrompt: 'The Object is now the "Star" of the sentence. It moves to the front.',
    examples: [
      { root: 'Ali membaca buku.', result: 'Buku dibaca oleh Ali.', gloss: 'The book is read by Ali.' },
      { root: 'Ibu memasak nasi.', result: 'Nasi dimasak oleh ibu.', gloss: 'Rice is cooked by mother.' },
    ],
    relatedRule: 'Remember: consonants that dropped with meN- come back with di-!',
  },
  'T drops in meN- but returns in di-': {
    explanation: 'When converting active (meN-) to passive (di-), the dropped consonant returns: menulis → ditulis.',
    mnemonic: 'meN- drops P, T, K, S. But di- brings them back: menulis → ditulis (T returns).',
    anchor: '🔙',
    generativePrompt: 'Passive voice is like a time machine — it restores the original root!',
    examples: [
      { root: 'Kakak menulis surat.', result: 'Surat ditulis oleh kakak.', gloss: 'The letter is written by elder sibling.' },
      { root: 'Polis menangkap pencuri.', result: 'Pencuri ditangkap oleh polis.', gloss: 'The thief is caught by police.' },
    ],
    relatedRule: 'This is a common exam trap — watch for consonants returning in passive!',
  },

  // === Tense marker rules ===
  'sudah': {
    explanation: '"Sudah" marks completed action (past tense). It means "already" or "has/have done".',
    mnemonic: 'sudah = already done ✓',
    anchor: '🏁',
    generativePrompt: 'Look for past-time clues like "tadi" (just now) or "semalam" (yesterday).',
    examples: [
      { root: 'Saya sudah makan.', result: 'I have eaten.', gloss: 'completed' },
      { root: 'Mereka sudah pulang.', result: 'They have gone home.', gloss: 'completed' },
    ],
    relatedRule: 'Time clues: semalam, tadi, minggu lepas → likely sudah.',
  },
  'sedang': {
    explanation: '"Sedang" marks ongoing action (present continuous). It means "currently doing".',
    mnemonic: 'sedang = doing it NOW ⏳',
    anchor: '🔄',
    generativePrompt: 'Is the action happening exactly as we speak? Then use "sedang".',
    examples: [
      { root: 'Ibu sedang memasak.', result: 'Mother is cooking.', gloss: 'ongoing' },
      { root: 'Mereka sedang bermain.', result: 'They are playing.', gloss: 'ongoing' },
    ],
    relatedRule: 'Time clues: sekarang, pada masa ini → likely sedang.',
  },
  'akan': {
    explanation: '"Akan" marks future action. It means "will" or "going to".',
    mnemonic: 'akan = will do it LATER →',
    anchor: '🚀',
    generativePrompt: 'Think of "akan" as an arrow pointing forward in time.',
    examples: [
      { root: 'Saya akan pergi.', result: 'I will go.', gloss: 'future' },
      { root: 'Dia akan datang esok.', result: 'He will come tomorrow.', gloss: 'future' },
    ],
    relatedRule: 'Time clues: esok, minggu depan, tahun depan → likely akan.',
  },
  'belum': {
    explanation: '"Belum" means "not yet" — the action hasn\'t happened but is expected to.',
    mnemonic: 'belum = NOT YET (but will) ⏸',
    anchor: '⏳',
    generativePrompt: 'Unlike "tidak" (no), "belum" implies the action *will* happen eventually.',
    examples: [
      { root: 'Dia belum sampai.', result: 'He has not arrived yet.', gloss: 'not yet' },
      { root: 'Saya belum makan.', result: 'I have not eaten yet.', gloss: 'not yet' },
    ],
    relatedRule: 'Key difference: belum (not yet, expected) vs tidak (not, definite).',
  },

  // === Suffix rules ===
  'suffix -kan': {
    explanation: 'The suffix -kan usually makes the root transitive (needing an object) or causative (causing something to happen).',
    mnemonic: '-kan = do it TO something or FOR someone.',
    anchor: '🎯',
    generativePrompt: 'If you "bersihkan" (clean), you must be cleaning "something".',
    examples: [
      { root: 'bersih', result: 'bersihkan', gloss: 'to clean (something)' },
      { root: 'masak', result: 'masakkan', gloss: 'to cook for (someone)' },
    ],
    relatedRule: 'Common with commands: "Tutupkan pintu itu!"',
  },
  'suffix -i': {
    explanation: 'The suffix -i often indicates a locative action (action happens at a place) or repetitive action.',
    mnemonic: '-i = action STAYING at a place.',
    anchor: '📍',
    generativePrompt: 'Think of "duduki" (to sit on) — the action is fixed to the seat.',
    examples: [
      { root: 'duduk', result: 'menduduki', gloss: 'to sit on / occupy' },
      { root: 'serta', result: 'menyertai', gloss: 'to join / participate in' },
    ],
    relatedRule: 'Difference: -kan moves an object, -i stays with the object/place.',
  },
  'circumfix ke-...-an': {
    explanation: 'ke-...-an transforms a root into an abstract noun or indicates a state.',
    mnemonic: 'ke-...-an = makes it an IDEA or a FEELING.',
    anchor: '🧠',
    generativePrompt: 'How does "cantik" (pretty) become the concept of "beauty" (kecantikan)?',
    examples: [
      { root: 'adil', result: 'keadilan', gloss: 'justice' },
      { root: 'sihat', result: 'kesihatan', gloss: 'health' },
    ],
    relatedRule: 'Can also mean "suffering from": "kehujanan" (caught in the rain).',
  },
}

// Vocabulary feedback — shown when student rates Again on a card
export const VOCAB_TIPS = {
  // Generic tips by card state
  new: 'New word! Try saying it aloud 3 times, then make a sentence with it.',
  learning: 'This word is still forming in your memory. Picture a vivid scene using this word.',
  relearning: 'You knew this before — reconnect! What context did you first learn it in?',
  review: 'Forgetting a review word is normal. The re-learning will make it stronger (desirable difficulty).',
}

export default GRAMMAR_FEEDBACK