// Maps grammar drill rule strings to elaborative feedback blocks.
// Keys match the `rule` field in IMBUHAN_DRILLS, or drill hints used for passive/tense.

export const GRAMMAR_FEEDBACK = {
  'men- + t → t drops': {
    explanation: 'With meN- and roots starting with T, the T drops and the nasal sound takes over.',
    mnemonic: 'P, T, K, S drop with meN-/peN-.',
    examples: [
      { root: 'tulis', result: 'menulis', gloss: 'to write' },
      { root: 'tanya', result: 'menanya', gloss: 'to ask' },
      { root: 'tanam', result: 'menanam', gloss: 'to plant' },
    ],
    relatedRule: 'Same drop pattern appears in peN-: tulis -> penulis.',
  },
  'meny- + s → s drops': {
    explanation: 'For S-initial roots, meN- becomes meny- and the original S drops.',
    mnemonic: 'If it starts with S, think meny-.',
    examples: [
      { root: 'sapu', result: 'menyapu', gloss: 'to sweep' },
      { root: 'siram', result: 'menyiram', gloss: 'to water' },
      { root: 'sumbang', result: 'menyumbang', gloss: 'to contribute' },
    ],
    relatedRule: 'peN- mirrors this: sapu -> penyapu.',
  },
  'mem- + p → p drops': {
    explanation: 'For P-initial roots, meN- becomes mem- and P drops.',
    mnemonic: 'P drops, mem- stays.',
    examples: [
      { root: 'potong', result: 'memotong', gloss: 'to cut' },
      { root: 'pukul', result: 'memukul', gloss: 'to hit' },
      { root: 'pilih', result: 'memilih', gloss: 'to choose' },
    ],
    relatedRule: 'Compare with B: membaca keeps B.',
  },
  'meng- + k → k drops': {
    explanation: 'For K-initial roots, meN- becomes meng- and K drops.',
    mnemonic: 'K drops under meng-.',
    examples: [
      { root: 'karang', result: 'mengarang', gloss: 'to compose' },
      { root: 'kira', result: 'mengira', gloss: 'to count' },
      { root: 'kupas', result: 'mengupas', gloss: 'to peel' },
    ],
    relatedRule: 'In passive di-, the dropped consonant returns: mengarang -> dikarang.',
  },
  'meng- + vowel': {
    explanation: 'When the root starts with a vowel, use meng- and keep the root unchanged.',
    mnemonic: 'Vowel start = meng- with no dropped consonant.',
    examples: [
      { root: 'ambil', result: 'mengambil', gloss: 'to take' },
      { root: 'ubah', result: 'mengubah', gloss: 'to change' },
      { root: 'ikut', result: 'mengikut', gloss: 'to follow' },
    ],
    relatedRule: 'No consonant drop here because there is no initial consonant.',
  },
  'mem- + b': {
    explanation: 'B-initial roots take mem- and keep B.',
    mnemonic: 'B is not in the drop group.',
    examples: [
      { root: 'baca', result: 'membaca', gloss: 'to read' },
      { root: 'beli', result: 'membeli', gloss: 'to buy' },
      { root: 'bantu', result: 'membantu', gloss: 'to help' },
    ],
    relatedRule: 'Only P, T, K, S drop; B does not.',
  },
  'men- + c': {
    explanation: 'C-initial roots use men- and keep C.',
    mnemonic: 'C keeps its consonant under men-.',
    examples: [
      { root: 'cari', result: 'mencari', gloss: 'to search' },
      { root: 'cuci', result: 'mencuci', gloss: 'to wash' },
      { root: 'cuba', result: 'mencuba', gloss: 'to try' },
    ],
    relatedRule: 'Same men- family as D and J.',
  },
  'men- + d': {
    explanation: 'D-initial roots use men- and keep D.',
    mnemonic: 'D stays with men-.',
    examples: [
      { root: 'dengar', result: 'mendengar', gloss: 'to hear' },
      { root: 'dapat', result: 'mendapat', gloss: 'to obtain' },
      { root: 'didik', result: 'mendidik', gloss: 'to educate' },
    ],
    relatedRule: 'Matches C and J pattern under men-.',
  },
  'men- + j': {
    explanation: 'J-initial roots use men- and keep J.',
    mnemonic: 'J also belongs to the men- keep group.',
    examples: [
      { root: 'jual', result: 'menjual', gloss: 'to sell' },
      { root: 'jaga', result: 'menjaga', gloss: 'to guard' },
      { root: 'jahit', result: 'menjahit', gloss: 'to sew' },
    ],
    relatedRule: 'Compare with T: T drops, J stays.',
  },
  'meng- + g': {
    explanation: 'G-initial roots take meng- and keep G.',
    mnemonic: 'G keeps G under meng-.',
    examples: [
      { root: 'goreng', result: 'menggoreng', gloss: 'to fry' },
      { root: 'gali', result: 'menggali', gloss: 'to dig' },
      { root: 'guna', result: 'mengguna', gloss: 'to use' },
    ],
    relatedRule: 'Contrast with K where K drops.',
  },
  'meng- + h': {
    explanation: 'H-initial roots take meng- and keep H.',
    mnemonic: 'H stays with meng-.',
    examples: [
      { root: 'hantar', result: 'menghantar', gloss: 'to send' },
      { root: 'hitung', result: 'menghitung', gloss: 'to count' },
      { root: 'hapus', result: 'menghapus', gloss: 'to erase' },
    ],
    relatedRule: 'Same broad meng- family as g and vowel starts.',
  },
  'menge- + 1-syllable': {
    explanation: 'Short roots may use the special menge- form.',
    mnemonic: 'Short root? Check for menge-.',
    examples: [
      { root: 'cat', result: 'mengecat', gloss: 'to paint' },
      { root: 'lap', result: 'mengelap', gloss: 'to wipe' },
      { root: 'kejar', result: 'mengejar', gloss: 'to chase' },
    ],
    relatedRule: 'This is treated as a special-case drill pattern in the app.',
  },
  'me- + l': {
    explanation: 'L-initial roots usually take me- without extra nasal change.',
    mnemonic: 'L can stay soft with me-.',
    examples: [
      { root: 'lukis', result: 'melukis', gloss: 'to draw' },
      { root: 'lipat', result: 'melipat', gloss: 'to fold' },
      { root: 'layari', result: 'melayari', gloss: 'to surf' },
    ],
    relatedRule: 'Similar lightweight pattern appears with R and W in this drill set.',
  },
  'me- + r': {
    explanation: 'R-initial roots in this set use me- directly.',
    mnemonic: 'R can attach with me-.',
    examples: [
      { root: 'renang', result: 'merenang', gloss: 'to swim' },
      { root: 'rasa', result: 'merasa', gloss: 'to feel' },
      { root: 'rebus', result: 'merebus', gloss: 'to boil' },
    ],
    relatedRule: 'Compare with ber- + kerja -> bekerja (different prefix family).',
  },
  'me- + ny (already nasal)': {
    explanation: 'With ny- roots, the form stays smooth because the root already begins with a nasal sound.',
    mnemonic: 'Already nasal, avoid over-stacking.',
    examples: [
      { root: 'nyanyi', result: 'menyanyi', gloss: 'to sing' },
      { root: 'nyala', result: 'menyala', gloss: 'to light up' },
      { root: 'nyamuk', result: 'menyamuk', gloss: 'to swarm (contextual)' },
    ],
    relatedRule: 'This drill family focuses on pattern recognition over exhaustive morphology.',
  },
  'me- + w': {
    explanation: 'W-initial roots in this set use me- form.',
    mnemonic: 'W in this drill set pairs with me-.',
    examples: [
      { root: 'warna', result: 'mewarnai', gloss: 'to color' },
      { root: 'wangi', result: 'mewangi', gloss: 'to perfume' },
      { root: 'waris', result: 'mewarisi', gloss: 'to inherit' },
    ],
    relatedRule: 'Check required suffix too: mewarnai includes -i.',
  },
  'mem- + f': {
    explanation: 'F-initial roots take mem- while keeping F.',
    mnemonic: 'F keeps its consonant, unlike P.',
    examples: [
      { root: 'fitnah', result: 'memfitnah', gloss: 'to slander' },
      { root: 'fokus', result: 'memfokus', gloss: 'to focus' },
      { root: 'fail', result: 'memfailkan', gloss: 'to file/register' },
    ],
    relatedRule: 'B and F keep consonant; P drops.',
  },

  'ber- + main': {
    explanation: 'Standard ber- attachment with no change.',
    mnemonic: 'ber- is usually straightforward.',
    examples: [
      { root: 'main', result: 'bermain', gloss: 'to play' },
      { root: 'jalan', result: 'berjalan', gloss: 'to walk' },
      { root: 'cakap', result: 'bercakap', gloss: 'to speak' },
    ],
    relatedRule: 'Main exceptions: belajar and bekerja.',
  },
  'bel- + ajar (irregular)': {
    explanation: 'This is an irregular form: ber- + ajar becomes belajar.',
    mnemonic: 'Only ajar flips to belajar.',
    examples: [
      { root: 'ajar', result: 'belajar', gloss: 'to learn' },
      { root: 'ajar', result: 'pelajar', gloss: 'student' },
      { root: 'ajar', result: 'pengajaran', gloss: 'teaching' },
    ],
    relatedRule: 'Do not generalize this irregularity to other vowel-start roots.',
  },
  'be- + kerja (r-initial syllable)': {
    explanation: 'ber- + kerja simplifies to bekerja to avoid awkward double-r sequence.',
    mnemonic: 'ber + kerja -> bekerja.',
    examples: [
      { root: 'kerja', result: 'bekerja', gloss: 'to work' },
      { root: 'kerjasama', result: 'bekerjasama', gloss: 'to cooperate' },
      { root: 'kerja', result: 'pekerja', gloss: 'worker' },
    ],
    relatedRule: 'This is a specific phonological simplification pattern.',
  },
  'ber- + jalan': {
    explanation: 'Standard ber- pattern.',
    mnemonic: 'Attach ber- directly.',
    examples: [
      { root: 'jalan', result: 'berjalan', gloss: 'to walk' },
      { root: 'fikir', result: 'berfikir', gloss: 'to think' },
      { root: 'sedia', result: 'bersedia', gloss: 'to be ready' },
    ],
    relatedRule: 'Same broad rule as ber- + cakap and ber- + sama.',
  },
  'ber- + cakap': {
    explanation: 'Standard ber- pattern with consonant root.',
    mnemonic: 'Consonant start? Usually just ber-.',
    examples: [
      { root: 'cakap', result: 'bercakap', gloss: 'to speak' },
      { root: 'diri', result: 'berdiri', gloss: 'to stand' },
      { root: 'lari', result: 'berlari', gloss: 'to run' },
    ],
    relatedRule: 'Only a few lexical exceptions need memorizing.',
  },
  'ber- + sedia': {
    explanation: 'Standard ber- form indicating state or action.',
    mnemonic: 'bersedia = be ready.',
    examples: [
      { root: 'sedia', result: 'bersedia', gloss: 'to be ready' },
      { root: 'semangat', result: 'bersemangat', gloss: 'to be spirited' },
      { root: 'hasil', result: 'berhasil', gloss: 'to succeed' },
    ],
    relatedRule: 'ber- can mark state, possession, or habitual action.',
  },
  'ber- + sama': {
    explanation: 'Standard ber- attachment.',
    mnemonic: 'bersama is fixed high-frequency form.',
    examples: [
      { root: 'sama', result: 'bersama', gloss: 'together' },
      { root: 'kumpul', result: 'berkumpul', gloss: 'to gather' },
      { root: 'jumpa', result: 'berjumpa', gloss: 'to meet' },
    ],
    relatedRule: 'Learners should build fluency with common fixed ber- forms.',
  },
  'ber- + fikir': {
    explanation: 'Standard ber- with no consonant drop.',
    mnemonic: 'berfikir keeps root intact.',
    examples: [
      { root: 'fikir', result: 'berfikir', gloss: 'to think' },
      { root: 'henti', result: 'berhenti', gloss: 'to stop' },
      { root: 'juang', result: 'berjuang', gloss: 'to struggle/fight' },
    ],
    relatedRule: 'This mirrors most regular ber- derivations.',
  },
  'ber- + asa → berasa': {
    explanation: 'In this drill set, ber- + asa forms berasa.',
    mnemonic: 'berasa is a common lexicalized form.',
    examples: [
      { root: 'asa', result: 'berasa', gloss: 'to feel' },
      { root: 'ada', result: 'berada', gloss: 'to be situated' },
      { root: 'akal', result: 'berakal', gloss: 'to be rational' },
    ],
    relatedRule: 'Keep exception handling local: not every vowel-initial root behaves identically.',
  },

  'pen- + t → t drops (doer noun)': {
    explanation: 'peN- mirrors meN-: T drops and pen- forms agent nouns.',
    mnemonic: 'Verb meN-, person peN-.',
    examples: [
      { root: 'tulis', result: 'penulis', gloss: 'writer' },
      { root: 'tari', result: 'penari', gloss: 'dancer' },
      { root: 'tutur', result: 'penutur', gloss: 'speaker' },
    ],
    relatedRule: 'Compare: menulis (verb) vs penulis (person).',
  },
  'pen- + d (doer noun)': {
    explanation: 'D-initial roots with peN- become pen- and keep D.',
    mnemonic: 'D stays under pen-.',
    examples: [
      { root: 'dengar', result: 'pendengar', gloss: 'listener' },
      { root: 'didik', result: 'pendidik', gloss: 'educator' },
      { root: 'dagang', result: 'pedagang', gloss: 'trader' },
    ],
    relatedRule: 'Pattern parallels men- + d.',
  },
  'pe- + kerja (doer noun)': {
    explanation: 'This lexical pattern yields pekerja as the common doer noun.',
    mnemonic: 'kerja -> pekerja.',
    examples: [
      { root: 'kerja', result: 'pekerja', gloss: 'worker' },
      { root: 'niaga', result: 'peniaga', gloss: 'seller/trader' },
      { root: 'usaha', result: 'pengusaha', gloss: 'entrepreneur' },
    ],
    relatedRule: 'Agent noun forms can be lexicalized and should be memorized by frequency.',
  },
  'pem- + b (doer noun)': {
    explanation: 'B-initial roots use pem- and keep B.',
    mnemonic: 'B stays in pem- forms.',
    examples: [
      { root: 'baca', result: 'pembaca', gloss: 'reader' },
      { root: 'beli', result: 'pembeli', gloss: 'buyer' },
      { root: 'bina', result: 'pembina', gloss: 'builder' },
    ],
    relatedRule: 'Matches meN- + b behavior (consonant retained).',
  },
  'peny- + s → s drops': {
    explanation: 'With S-initial roots, peN- becomes peny- and S drops.',
    mnemonic: 'S drops in both meN- and peN-.',
    examples: [
      { root: 'sapu', result: 'penyapu', gloss: 'broom/sweeper' },
      { root: 'siar', result: 'penyiar', gloss: 'broadcaster' },
      { root: 'sumbang', result: 'penyumbang', gloss: 'contributor' },
    ],
    relatedRule: 'Direct parallel to meny- in verb forms.',
  },

  'Convert meN- to di-': {
    explanation: 'To form passive voice, move object first and change meN- verb to di- form.',
    mnemonic: 'Active: Subject-Verb-Object -> Passive: Object-diVerb-oleh-Subject.',
    examples: [
      { root: 'Ibu memasak nasi.', result: 'Nasi dimasak oleh ibu.', gloss: 'object promoted' },
      { root: 'Ali membaca buku.', result: 'Buku dibaca oleh Ali.', gloss: 'object promoted' },
      { root: 'Guru mengajar murid.', result: 'Murid diajar oleh guru.', gloss: 'object promoted' },
    ],
    relatedRule: 'Watch root restoration in di- forms.',
  },
  'Object becomes subject': {
    explanation: 'In passive transformation, the original object becomes sentence topic/subject position.',
    mnemonic: 'Bring object to the front first.',
    examples: [
      { root: 'Ali membaca buku itu.', result: 'Buku itu dibaca oleh Ali.', gloss: 'object fronted' },
      { root: 'Abang memandu kereta.', result: 'Kereta dipandu oleh abang.', gloss: 'object fronted' },
      { root: 'Murid membersihkan kelas.', result: 'Kelas dibersihkan oleh murid.', gloss: 'object fronted' },
    ],
    relatedRule: 'Then convert verb to correct di- form.',
  },
  'T drops in meN- but returns in di-': {
    explanation: 'Consonants dropped in meN- forms reappear when returning to passive di- root.',
    mnemonic: 'Dropped in active, restored in passive.',
    examples: [
      { root: 'menulis', result: 'ditulis', gloss: 'T returns' },
      { root: 'menangkap', result: 'ditangkap', gloss: 'T returns' },
      { root: 'menyepak', result: 'disepak', gloss: 'S/T family restored' },
    ],
    relatedRule: 'Same restoration logic applies to P, K, S roots.',
  },
  'S drops in meN- but returns in di-': {
    explanation: 'S omitted in active meny- forms reappears in passive di- forms.',
    mnemonic: 'meny- in active often means bare root starts with S in passive.',
    examples: [
      { root: 'menyediakan', result: 'disediakan', gloss: 'S returns' },
      { root: 'menyapu', result: 'disapu', gloss: 'S returns' },
      { root: 'menyusun', result: 'disusun', gloss: 'S returns' },
    ],
    relatedRule: 'Use original root when building passive form.',
  },

  sudah: {
    explanation: '"Sudah" marks completed action.',
    mnemonic: 'sudah = already done.',
    examples: [
      { root: 'Saya sudah makan.', result: 'I have eaten.', gloss: 'completed' },
      { root: 'Mereka sudah pulang.', result: 'They have gone home.', gloss: 'completed' },
      { root: 'Dia sudah belajar.', result: 'He/she has studied.', gloss: 'completed' },
    ],
    relatedRule: 'Time cues like semalam/tadi often align with sudah.',
  },
  sedang: {
    explanation: '"Sedang" marks an action in progress.',
    mnemonic: 'sedang = doing now.',
    examples: [
      { root: 'Ibu sedang memasak.', result: 'Mother is cooking.', gloss: 'ongoing' },
      { root: 'Mereka sedang bermain.', result: 'They are playing.', gloss: 'ongoing' },
      { root: 'Nenek sedang tidur.', result: 'Grandmother is sleeping.', gloss: 'ongoing' },
    ],
    relatedRule: 'Current-time cues (sekarang) usually point to sedang.',
  },
  akan: {
    explanation: '"Akan" marks future action.',
    mnemonic: 'akan = will.',
    examples: [
      { root: 'Saya akan pergi.', result: 'I will go.', gloss: 'future' },
      { root: 'Dia akan datang esok.', result: 'He/she will come tomorrow.', gloss: 'future' },
      { root: 'Mereka akan belajar.', result: 'They will study.', gloss: 'future' },
    ],
    relatedRule: 'Future cues like esok/minggu depan support akan.',
  },
  belum: {
    explanation: '"Belum" means not yet: expected action has not happened so far.',
    mnemonic: 'belum = not yet.',
    examples: [
      { root: 'Dia belum sampai.', result: 'He/she has not arrived yet.', gloss: 'not yet' },
      { root: 'Saya belum makan.', result: 'I have not eaten yet.', gloss: 'not yet' },
      { root: 'Projek itu belum siap.', result: 'The project is not finished yet.', gloss: 'not yet' },
    ],
    relatedRule: 'Different from tidak, which is broader negation.',
  },
}

export const VOCAB_TIPS = {
  new: 'New word! Try saying it aloud 3 times, then make a sentence with it.',
  learning: 'This word is still forming in your memory. Picture a vivid scene using this word.',
  relearning: 'You knew this before - reconnect! What context did you first learn it in?',
  review: 'Forgetting a review word is normal. The re-learning will make it stronger (desirable difficulty).',
}

export default GRAMMAR_FEEDBACK
