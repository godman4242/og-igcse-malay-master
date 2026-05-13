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
const DICTIONARY_ICONS = {
  abang: '👦',
  adik: '🧒',
  air: '💧',
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
  berenang: '🏊',
  berjalan: '🚶',
  biru: '🟦',
  buah: '🍎',
  buku: '📚',
  bunga: '🌸',
  hari: '📅',
  hijau: '🟩',
  hitam: '⬛',
  hujan: '🌧️',
  hutan: '🌳',
  ibu: '👩',
  ikan: '🐟',
  jam: '🕐',
  kaki: '🦵',
  kasut: '👟',
  kawan: '🤝',
  kereta: '🚗',
  komputer: '💻',
  kuning: '🟨',
  laut: '🌊',
  makan: '🍽️',
  mata: '👁️',
  merah: '🟥',
  minum: '🥤',
  nasi: '🍚',
  pelajar: '🎓',
  putih: '⬜',
  roti: '🍞',
  rumah: '🏠',
  sekolah: '🏫',
  tangan: '✋',
  telefon: '📞',
  tidur: '😴',
}

export default DICTIONARY_ICONS
