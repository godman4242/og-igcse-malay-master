export const IMBUHAN_DRILLS = [
  // meN- prefix drills
  { type: 'prefix', root: 'tulis', answer: 'menulis', prefix: 'meN-', rule: 'men- + t → t drops', hint: 'meN- + tulis' },
  { type: 'prefix', root: 'baca', answer: 'membaca', prefix: 'meN-', rule: 'mem- + b', hint: 'meN- + baca' },
  { type: 'prefix', root: 'sapu', answer: 'menyapu', prefix: 'meN-', rule: 'meny- + s → s drops', hint: 'meN- + sapu' },
  { type: 'prefix', root: 'ambil', answer: 'mengambil', prefix: 'meN-', rule: 'meng- + vowel', hint: 'meN- + ambil' },
  { type: 'prefix', root: 'potong', answer: 'memotong', prefix: 'meN-', rule: 'mem- + p → p drops', hint: 'meN- + potong' },
  { type: 'prefix', root: 'cari', answer: 'mencari', prefix: 'meN-', rule: 'men- + c', hint: 'meN- + cari' },
  { type: 'prefix', root: 'goreng', answer: 'menggoreng', prefix: 'meN-', rule: 'meng- + g', hint: 'meN- + goreng' },
  { type: 'prefix', root: 'hantar', answer: 'menghantar', prefix: 'meN-', rule: 'meng- + h', hint: 'meN- + hantar' },
  { type: 'prefix', root: 'kejar', answer: 'mengejar', prefix: 'meN-', rule: 'menge- + 1-syllable', hint: 'meN- + kejar' },
  { type: 'prefix', root: 'pukul', answer: 'memukul', prefix: 'meN-', rule: 'mem- + p → p drops', hint: 'meN- + pukul' },
  { type: 'prefix', root: 'fitnah', answer: 'memfitnah', prefix: 'meN-', rule: 'mem- + f', hint: 'meN- + fitnah' },
  { type: 'prefix', root: 'siram', answer: 'menyiram', prefix: 'meN-', rule: 'meny- + s → s drops', hint: 'meN- + siram' },
  { type: 'prefix', root: 'lukis', answer: 'melukis', prefix: 'meN-', rule: 'me- + l', hint: 'meN- + lukis' },
  { type: 'prefix', root: 'renang', answer: 'merenang', prefix: 'meN-', rule: 'me- + r', hint: 'meN- + renang' },
  { type: 'prefix', root: 'karang', answer: 'mengarang', prefix: 'meN-', rule: 'meng- + k → k drops', hint: 'meN- + karang' },

  // ber- prefix drills
  { type: 'prefix', root: 'main', answer: 'bermain', prefix: 'ber-', rule: 'ber- + main', hint: 'ber- + main' },
  { type: 'prefix', root: 'jalan', answer: 'berjalan', prefix: 'ber-', rule: 'ber- + jalan', hint: 'ber- + jalan' },
  { type: 'prefix', root: 'ajar', answer: 'belajar', prefix: 'ber-', rule: 'bel- + ajar (irregular)', hint: 'ber- + ajar' },
  { type: 'prefix', root: 'kerja', answer: 'bekerja', prefix: 'ber-', rule: 'be- + kerja (r-initial syllable)', hint: 'ber- + kerja' },

  // di- prefix (passive) drills
  { type: 'passive', active: 'Ibu memasak nasi.', answer: 'Nasi dimasak oleh ibu.', hint: 'Convert meN- to di-' },
  { type: 'passive', active: 'Ali membaca buku itu.', answer: 'Buku itu dibaca oleh Ali.', hint: 'Object becomes subject' },
  { type: 'passive', active: 'Guru mengajar murid.', answer: 'Murid diajar oleh guru.', hint: 'Convert meN- to di-' },
  { type: 'passive', active: 'Kakak menulis surat.', answer: 'Surat ditulis oleh kakak.', hint: 'T drops in meN- but returns in di-' },

  // -kan / -an suffix drills
  { type: 'suffix', root: 'bersih', answer: 'bersihkan', suffix: '-kan', meaning: 'to clean (something)', hint: 'Action on object' },
  { type: 'suffix', root: 'bersih', answer: 'kebersihan', suffix: 'ke-...-an', meaning: 'cleanliness', hint: 'Abstract noun' },
  { type: 'suffix', root: 'indah', answer: 'keindahan', suffix: 'ke-...-an', meaning: 'beauty', hint: 'Abstract noun' },
  { type: 'suffix', root: 'makan', answer: 'makanan', suffix: '-an', meaning: 'food', hint: 'Result noun' },
  { type: 'suffix', root: 'minum', answer: 'minuman', suffix: '-an', meaning: 'drink/beverage', hint: 'Result noun' },
  { type: 'suffix', root: 'bangun', answer: 'bangunan', suffix: '-an', meaning: 'building', hint: 'Result noun' },
  { type: 'suffix', root: 'tulis', answer: 'tulisan', suffix: '-an', meaning: 'writing', hint: 'Result noun' },
];

export const TENSE_DRILLS = [
  { sentence: 'Ali _____ makan nasi.', options: ['sudah', 'sedang', 'akan', 'belum'], answer: 'sudah', tense: 'past', translation: 'Ali has eaten rice.' },
  { sentence: 'Mereka _____ bermain bola.', options: ['sudah', 'sedang', 'akan', 'belum'], answer: 'sedang', tense: 'present', translation: 'They are playing football.' },
  { sentence: 'Saya _____ pergi ke sekolah esok.', options: ['sudah', 'sedang', 'akan', 'belum'], answer: 'akan', tense: 'future', translation: 'I will go to school tomorrow.' },
  { sentence: 'Dia _____ sampai lagi.', options: ['sudah', 'sedang', 'akan', 'belum'], answer: 'belum', tense: 'not yet', translation: 'He has not arrived yet.' },
  { sentence: 'Kami _____ menonton filem itu semalam.', options: ['sudah', 'sedang', 'akan', 'belum'], answer: 'sudah', tense: 'past', translation: 'We already watched that movie yesterday.' },
  { sentence: 'Ibu _____ memasak di dapur sekarang.', options: ['sudah', 'sedang', 'akan', 'belum'], answer: 'sedang', tense: 'present', translation: 'Mother is cooking in the kitchen now.' },
  { sentence: 'Adik _____ mula belajar membaca.', options: ['sudah', 'sedang', 'akan', 'belum'], answer: 'akan', tense: 'future', translation: 'Younger sibling will start learning to read.' },
  { sentence: 'Projek itu _____ siap lagi.', options: ['sudah', 'sedang', 'akan', 'belum'], answer: 'belum', tense: 'not yet', translation: 'That project is not finished yet.' },
  { sentence: 'Mereka _____ tiba sejak pagi tadi.', options: ['sudah', 'sedang', 'akan', 'belum'], answer: 'sudah', tense: 'past', translation: 'They have arrived since this morning.' },
  { sentence: 'Pelajar _____ mengambil peperiksaan minggu depan.', options: ['sudah', 'sedang', 'akan', 'belum'], answer: 'akan', tense: 'future', translation: 'Students will take the exam next week.' },
];

export const GRAMMAR_RULES = {
  'meN-': {
    title: 'Awalan meN-',
    rules: [
      { pattern: 'me- + l, m, n, r, w, y', example: 'melukis, memasak, menulis, merenang', note: 'No change' },
      { pattern: 'mem- + b, f, p, v', example: 'membaca, memfitnah, memotong, memvaksin', note: 'P drops!' },
      { pattern: 'men- + c, d, j, t', example: 'mencari, mendapat, menjadi, menulis', note: 'T drops!' },
      { pattern: 'meng- + g, h, k, vowels', example: 'menggoreng, menghantar, mengambil', note: 'K drops!' },
      { pattern: 'meny- + s', example: 'menyapu, menyiram', note: 'S drops!' },
      { pattern: 'menge- + 1-syllable', example: 'mengecat, mengejar', note: 'Special case' },
    ]
  },
  'ber-': {
    title: 'Awalan ber-',
    rules: [
      { pattern: 'ber- + most roots', example: 'bermain, berjalan, bercakap', note: 'Standard' },
      { pattern: 'be- + r-initial syllable', example: 'bekerja, berasa → berasa', note: 'Avoids ber-r' },
      { pattern: 'bel- + ajar', example: 'belajar', note: 'Irregular' },
    ]
  },
  'di-': {
    title: 'Awalan di- (Passive)',
    rules: [
      { pattern: 'di- + root', example: 'ditulis, dibaca, dimasak', note: 'Passive voice' },
      { pattern: 'Active → Passive', example: 'Ibu memasak nasi → Nasi dimasak oleh ibu', note: 'Object becomes subject' },
    ]
  },
};
