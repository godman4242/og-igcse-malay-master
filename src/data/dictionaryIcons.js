// Tier-0 emoji icons for the Visual Dictionary (UDL Principle 2 —
// Multiple Means of Representation).
//
// Keys are Malay headwords exactly as they appear in `dictionary.js`.
// Lookups in `lib/dictionaryIcon.js` are case-insensitive, so writing
// keys lowercased here is fine.
//
// Curation rules:
//   1. Pick unambiguous, culturally neutral emoji.
//   2. Prefer one emoji per Malay word — no two-emoji phrases.
//   3. If a word has multiple senses, pick the IGCSE-syllabus sense.
//
// Top 50 high-frequency IGCSE vocab. Expand in follow-up PRs; the
// resolver gracefully falls back to no-icon for any unmapped word.
//
// 2026-05-14 verb expansion: 20 high-yield verb roots added. Each one
// blooms into 5–7 forms via imbuhan (meN-, ber-, di-, -kan, -an), so
// the actual reach in the Word-Family tree and Roleplay vocab chips
// is much larger than the line count suggests. Skipped on purpose:
//   pandu (collides with kereta 🚗 in the chip context)
//   tinggal (polysemous — "live in" / "remaining")
//   bangun (polysemous — rise / wake / build)
const DICTIONARY_ICONS = {
  abang: '👦',
  adik: '🧒',
  air: '💧',
  ajar: '🧑‍🏫',
  anak: '👶',
  api: '🔥',
  aplikasi: '📱',
  ayah: '👨',
  ayam: '🐔',
  baca: '📖',
  baik: '👍',
  bandar: '🏙️',
  baru: '✨',
  bas: '🚌',
  basikal: '🚲',
  beg: '🎒',
  belajar: '✏️',
  beli: '🛒',
  berenang: '🏊',
  berjalan: '🚶',
  biru: '🟦',
  buah: '🍎',
  buku: '📚',
  bunga: '🌸',
  cari: '🔍',
  dengar: '👂',
  fikir: '💭',
  guna: '🔧',
  hantar: '📤',
  hari: '📅',
  hijau: '🟩',
  hitam: '⬛',
  hujan: '🌧️',
  hutan: '🌳',
  ibu: '👩',
  ikan: '🐟',
  jalan: '🚶',
  jam: '🕐',
  jual: '💰',
  kaki: '🦵',
  kasut: '👟',
  kawan: '🤝',
  kereta: '🚗',
  kerja: '💼',
  komputer: '💻',
  kuning: '🟨',
  latih: '🏋️',
  laut: '🌊',
  lukis: '🎨',
  main: '🎮',
  makan: '🍽️',
  masak: '🍳',
  mata: '👁️',
  merah: '🟥',
  minum: '🥤',
  nasi: '🍚',
  nyanyi: '🎤',
  pelajar: '🎓',
  potong: '✂️',
  putih: '⬜',
  roti: '🍞',
  rumah: '🏠',
  sekolah: '🏫',
  tahu: '💡',
  tangan: '✋',
  tanya: '❓',
  telefon: '📞',
  tidur: '😴',
  tulis: '✍️',
  ubah: '🔄',
}

export default DICTIONARY_ICONS
