const WORD_FAMILIES = {
  'tulis': {
    root: 'tulis',
    meaning: 'write',
    forms: [
      { word: 'menulis', type: 'meN-', meaning: 'to write (active)', pos: 'verb' },
      { word: 'ditulis', type: 'di-', meaning: 'written (passive)', pos: 'verb' },
      { word: 'penulis', type: 'peN-', meaning: 'writer', pos: 'noun' },
      { word: 'penulisan', type: 'peN-...-an', meaning: 'the act of writing', pos: 'noun' },
      { word: 'tulisan', type: '-an', meaning: 'a piece of writing', pos: 'noun' },
      { word: 'bertulis', type: 'ber-', meaning: 'written/in writing', pos: 'adj' },
      { word: 'tertulis', type: 'ter-', meaning: 'written down', pos: 'adj' },
    ]
  },
  'ajar': {
    root: 'ajar',
    meaning: 'teach/learn',
    forms: [
      { word: 'mengajar', type: 'meN-', meaning: 'to teach', pos: 'verb' },
      { word: 'diajar', type: 'di-', meaning: 'taught (passive)', pos: 'verb' },
      { word: 'belajar', type: 'ber-', meaning: 'to study/learn', pos: 'verb' },
      { word: 'mempelajari', type: 'meN-per-...-i', meaning: 'to study (something)', pos: 'verb' },
      { word: 'pelajar', type: 'peN-', meaning: 'student', pos: 'noun' },
      { word: 'pengajar', type: 'peN-', meaning: 'teacher/instructor', pos: 'noun' },
      { word: 'pelajaran', type: 'peN-...-an', meaning: 'lesson', pos: 'noun' },
      { word: 'pengajaran', type: 'peN-...-an', meaning: 'teaching', pos: 'noun' },
      { word: 'terpelajar', type: 'ter-', meaning: 'educated', pos: 'adj' },
    ]
  },
  'kerja': {
    root: 'kerja',
    meaning: 'work',
    forms: [
      { word: 'bekerja', type: 'ber-', meaning: 'to work', pos: 'verb' },
      { word: 'mengerjakan', type: 'meN-...-kan', meaning: 'to work on', pos: 'verb' },
      { word: 'pekerja', type: 'peN-', meaning: 'worker', pos: 'noun' },
      { word: 'pekerjaan', type: 'peN-...-an', meaning: 'job/occupation', pos: 'noun' },
      { word: 'kerjaya', type: 'root+ya', meaning: 'career', pos: 'noun' },
      { word: 'sekerja', type: 'se-', meaning: 'co-worker', pos: 'noun' },
    ]
  },
  'masak': {
    root: 'masak',
    meaning: 'cook',
    forms: [
      { word: 'memasak', type: 'meN-', meaning: 'to cook', pos: 'verb' },
      { word: 'dimasak', type: 'di-', meaning: 'cooked (passive)', pos: 'verb' },
      { word: 'pemasak', type: 'peN-', meaning: 'cook (person)', pos: 'noun' },
      { word: 'masakan', type: '-an', meaning: 'cuisine/cooked food', pos: 'noun' },
      { word: 'termasak', type: 'ter-', meaning: 'accidentally cooked', pos: 'verb' },
    ]
  },
  'baca': {
    root: 'baca',
    meaning: 'read',
    forms: [
      { word: 'membaca', type: 'meN-', meaning: 'to read', pos: 'verb' },
      { word: 'dibaca', type: 'di-', meaning: 'read (passive)', pos: 'verb' },
      { word: 'pembaca', type: 'peN-', meaning: 'reader', pos: 'noun' },
      { word: 'pembacaan', type: 'peN-...-an', meaning: 'reading (process)', pos: 'noun' },
      { word: 'bacaan', type: '-an', meaning: 'reading material', pos: 'noun' },
      { word: 'terbaca', type: 'ter-', meaning: 'accidentally read/readable', pos: 'adj' },
    ]
  },
  'jual': {
    root: 'jual',
    meaning: 'sell',
    forms: [
      { word: 'menjual', type: 'meN-', meaning: 'to sell', pos: 'verb' },
      { word: 'dijual', type: 'di-', meaning: 'sold (passive)', pos: 'verb' },
      { word: 'penjual', type: 'peN-', meaning: 'seller', pos: 'noun' },
      { word: 'jualan', type: '-an', meaning: 'sale/goods for sale', pos: 'noun' },
      { word: 'penjualan', type: 'peN-...-an', meaning: 'the selling process', pos: 'noun' },
      { word: 'terjual', type: 'ter-', meaning: 'sold (already)', pos: 'adj' },
    ]
  },
  'beli': {
    root: 'beli',
    meaning: 'buy',
    forms: [
      { word: 'membeli', type: 'meN-', meaning: 'to buy', pos: 'verb' },
      { word: 'dibeli', type: 'di-', meaning: 'bought (passive)', pos: 'verb' },
      { word: 'pembeli', type: 'peN-', meaning: 'buyer', pos: 'noun' },
      { word: 'belian', type: '-an', meaning: 'purchase', pos: 'noun' },
      { word: 'membelikan', type: 'meN-...-kan', meaning: 'to buy for (someone)', pos: 'verb' },
    ]
  },
  'makan': {
    root: 'makan',
    meaning: 'eat',
    forms: [
      { word: 'memakan', type: 'meN-', meaning: 'to eat (transitive)', pos: 'verb' },
      { word: 'dimakan', type: 'di-', meaning: 'eaten (passive)', pos: 'verb' },
      { word: 'pemakan', type: 'peN-', meaning: 'eater', pos: 'noun' },
      { word: 'makanan', type: '-an', meaning: 'food', pos: 'noun' },
      { word: 'termakan', type: 'ter-', meaning: 'accidentally eaten', pos: 'verb' },
    ]
  },
  'minum': {
    root: 'minum',
    meaning: 'drink',
    forms: [
      { word: 'meminum', type: 'meN-', meaning: 'to drink (transitive)', pos: 'verb' },
      { word: 'diminum', type: 'di-', meaning: 'drunk (passive)', pos: 'verb' },
      { word: 'peminum', type: 'peN-', meaning: 'drinker', pos: 'noun' },
      { word: 'minuman', type: '-an', meaning: 'beverage', pos: 'noun' },
    ]
  },
  'main': {
    root: 'main',
    meaning: 'play',
    forms: [
      { word: 'bermain', type: 'ber-', meaning: 'to play', pos: 'verb' },
      { word: 'memainkan', type: 'meN-...-kan', meaning: 'to play (something)', pos: 'verb' },
      { word: 'pemain', type: 'peN-', meaning: 'player', pos: 'noun' },
      { word: 'mainan', type: '-an', meaning: 'toy', pos: 'noun' },
      { word: 'permainan', type: 'per-...-an', meaning: 'game', pos: 'noun' },
    ]
  },
  'jalan': {
    root: 'jalan',
    meaning: 'walk/road',
    forms: [
      { word: 'berjalan', type: 'ber-', meaning: 'to walk', pos: 'verb' },
      { word: 'menjalankan', type: 'meN-...-kan', meaning: 'to carry out/run', pos: 'verb' },
      { word: 'pejalan', type: 'peN-', meaning: 'walker/pedestrian', pos: 'noun' },
      { word: 'jalanan', type: '-an', meaning: 'street/road', pos: 'noun' },
      { word: 'perjalanan', type: 'per-...-an', meaning: 'journey/trip', pos: 'noun' },
    ]
  },
  'cari': {
    root: 'cari',
    meaning: 'search/find',
    forms: [
      { word: 'mencari', type: 'meN-', meaning: 'to search for', pos: 'verb' },
      { word: 'dicari', type: 'di-', meaning: 'searched for (passive)', pos: 'verb' },
      { word: 'pencari', type: 'peN-', meaning: 'seeker/searcher', pos: 'noun' },
      { word: 'pencarian', type: 'peN-...-an', meaning: 'search/quest', pos: 'noun' },
      { word: 'mencarikan', type: 'meN-...-kan', meaning: 'to search for (someone)', pos: 'verb' },
    ]
  },
  'potong': {
    root: 'potong',
    meaning: 'cut',
    forms: [
      { word: 'memotong', type: 'meN-', meaning: 'to cut', pos: 'verb' },
      { word: 'dipotong', type: 'di-', meaning: 'cut (passive)', pos: 'verb' },
      { word: 'pemotong', type: 'peN-', meaning: 'cutter (tool/person)', pos: 'noun' },
      { word: 'potongan', type: '-an', meaning: 'a cut/slice/discount', pos: 'noun' },
    ]
  },
  'sapu': {
    root: 'sapu',
    meaning: 'sweep/wipe',
    forms: [
      { word: 'menyapu', type: 'meN-', meaning: 'to sweep', pos: 'verb' },
      { word: 'disapu', type: 'di-', meaning: 'swept (passive)', pos: 'verb' },
      { word: 'penyapu', type: 'peN-', meaning: 'broom/sweeper', pos: 'noun' },
      { word: 'sapuan', type: '-an', meaning: 'a sweep/stroke', pos: 'noun' },
    ]
  },
  'goreng': {
    root: 'goreng',
    meaning: 'fry',
    forms: [
      { word: 'menggoreng', type: 'meN-', meaning: 'to fry', pos: 'verb' },
      { word: 'digoreng', type: 'di-', meaning: 'fried (passive)', pos: 'verb' },
      { word: 'penggoreng', type: 'peN-', meaning: 'fryer (tool/person)', pos: 'noun' },
      { word: 'gorengan', type: '-an', meaning: 'fried food', pos: 'noun' },
    ]
  },
  'hantar': {
    root: 'hantar',
    meaning: 'send/deliver',
    forms: [
      { word: 'menghantar', type: 'meN-', meaning: 'to send', pos: 'verb' },
      { word: 'dihantar', type: 'di-', meaning: 'sent (passive)', pos: 'verb' },
      { word: 'penghantar', type: 'peN-', meaning: 'sender/deliverer', pos: 'noun' },
      { word: 'penghantaran', type: 'peN-...-an', meaning: 'delivery', pos: 'noun' },
    ]
  },
  'didik': {
    root: 'didik',
    meaning: 'educate',
    forms: [
      { word: 'mendidik', type: 'meN-', meaning: 'to educate', pos: 'verb' },
      { word: 'dididik', type: 'di-', meaning: 'educated (passive)', pos: 'verb' },
      { word: 'pendidik', type: 'peN-', meaning: 'educator', pos: 'noun' },
      { word: 'pendidikan', type: 'peN-...-an', meaning: 'education', pos: 'noun' },
      { word: 'berdidik', type: 'ber-', meaning: 'educated (adj)', pos: 'adj' },
    ]
  },
  'hubung': {
    root: 'hubung',
    meaning: 'connect',
    forms: [
      { word: 'menghubungi', type: 'meN-...-i', meaning: 'to contact', pos: 'verb' },
      { word: 'menghubungkan', type: 'meN-...-kan', meaning: 'to connect', pos: 'verb' },
      { word: 'dihubungi', type: 'di-...-i', meaning: 'contacted (passive)', pos: 'verb' },
      { word: 'penghubung', type: 'peN-', meaning: 'connector/liaison', pos: 'noun' },
      { word: 'hubungan', type: '-an', meaning: 'relationship', pos: 'noun' },
      { word: 'berhubung', type: 'ber-', meaning: 'related/connected', pos: 'adj' },
    ]
  },
  'latih': {
    root: 'latih',
    meaning: 'train/exercise',
    forms: [
      { word: 'melatih', type: 'meN-', meaning: 'to train', pos: 'verb' },
      { word: 'dilatih', type: 'di-', meaning: 'trained (passive)', pos: 'verb' },
      { word: 'pelatih', type: 'peN-', meaning: 'trainer/coach', pos: 'noun' },
      { word: 'latihan', type: '-an', meaning: 'exercise/training', pos: 'noun' },
      { word: 'berlatih', type: 'ber-', meaning: 'to practice', pos: 'verb' },
      { word: 'terlatih', type: 'ter-', meaning: 'well-trained', pos: 'adj' },
    ]
  },
  'bangun': {
    root: 'bangun',
    meaning: 'build/wake up',
    forms: [
      { word: 'membangun', type: 'meN-', meaning: 'to build/develop', pos: 'verb' },
      { word: 'membangunkan', type: 'meN-...-kan', meaning: 'to wake someone up', pos: 'verb' },
      { word: 'dibangunkan', type: 'di-...-kan', meaning: 'woken up (passive)', pos: 'verb' },
      { word: 'pembangunan', type: 'peN-...-an', meaning: 'development', pos: 'noun' },
      { word: 'bangunan', type: '-an', meaning: 'building', pos: 'noun' },
      { word: 'terbangun', type: 'ter-', meaning: 'woken up (suddenly)', pos: 'verb' },
    ]
  },
  'lukis': {
    root: 'lukis',
    meaning: 'draw/paint',
    forms: [
      { word: 'melukis', type: 'meN-', meaning: 'to draw/paint', pos: 'verb' },
      { word: 'dilukis', type: 'di-', meaning: 'drawn (passive)', pos: 'verb' },
      { word: 'pelukis', type: 'peN-', meaning: 'painter/artist', pos: 'noun' },
      { word: 'lukisan', type: '-an', meaning: 'painting/drawing', pos: 'noun' },
    ]
  },
  'dengar': {
    root: 'dengar',
    meaning: 'hear/listen',
    forms: [
      { word: 'mendengar', type: 'meN-', meaning: 'to hear', pos: 'verb' },
      { word: 'mendengarkan', type: 'meN-...-kan', meaning: 'to listen to', pos: 'verb' },
      { word: 'didengar', type: 'di-', meaning: 'heard (passive)', pos: 'verb' },
      { word: 'pendengar', type: 'peN-', meaning: 'listener', pos: 'noun' },
      { word: 'pendengaran', type: 'peN-...-an', meaning: 'hearing (sense)', pos: 'noun' },
      { word: 'terdengar', type: 'ter-', meaning: 'heard (accidentally)', pos: 'verb' },
      { word: 'kedengaran', type: 'ke-...-an', meaning: 'audible/sounds like', pos: 'adj' },
    ]
  },
  'nyanyi': {
    root: 'nyanyi',
    meaning: 'sing',
    forms: [
      { word: 'menyanyi', type: 'meN-', meaning: 'to sing', pos: 'verb' },
      { word: 'menyanyikan', type: 'meN-...-kan', meaning: 'to sing (a song)', pos: 'verb' },
      { word: 'dinyanyikan', type: 'di-...-kan', meaning: 'sung (passive)', pos: 'verb' },
      { word: 'penyanyi', type: 'peN-', meaning: 'singer', pos: 'noun' },
      { word: 'nyanyian', type: '-an', meaning: 'song/singing', pos: 'noun' },
    ]
  },
  'siar': {
    root: 'siar',
    meaning: 'broadcast/stroll',
    forms: [
      { word: 'menyiarkan', type: 'meN-...-kan', meaning: 'to broadcast', pos: 'verb' },
      { word: 'disiarkan', type: 'di-...-kan', meaning: 'broadcast (passive)', pos: 'verb' },
      { word: 'penyiar', type: 'peN-', meaning: 'broadcaster', pos: 'noun' },
      { word: 'penyiaran', type: 'peN-...-an', meaning: 'broadcasting', pos: 'noun' },
      { word: 'siaran', type: '-an', meaning: 'broadcast/program', pos: 'noun' },
      { word: 'bersiar-siar', type: 'ber-R', meaning: 'to stroll leisurely', pos: 'verb' },
    ]
  },
  'tanya': {
    root: 'tanya',
    meaning: 'ask',
    forms: [
      { word: 'menanya', type: 'meN-', meaning: 'to ask', pos: 'verb' },
      { word: 'bertanya', type: 'ber-', meaning: 'to ask (intransitive)', pos: 'verb' },
      { word: 'ditanya', type: 'di-', meaning: 'asked (passive)', pos: 'verb' },
      { word: 'penanya', type: 'peN-', meaning: 'questioner', pos: 'noun' },
      { word: 'pertanyaan', type: 'per-...-an', meaning: 'question', pos: 'noun' },
      { word: 'soal', type: 'synonym', meaning: 'question (formal)', pos: 'noun' },
    ]
  },
  'fikir': {
    root: 'fikir',
    meaning: 'think',
    forms: [
      { word: 'berfikir', type: 'ber-', meaning: 'to think', pos: 'verb' },
      { word: 'memikirkan', type: 'meN-...-kan', meaning: 'to think about', pos: 'verb' },
      { word: 'pemikir', type: 'peN-', meaning: 'thinker', pos: 'noun' },
      { word: 'pemikiran', type: 'peN-...-an', meaning: 'thought/thinking', pos: 'noun' },
      { word: 'fikiran', type: '-an', meaning: 'thought/mind', pos: 'noun' },
    ]
  },
  'guna': {
    root: 'guna',
    meaning: 'use',
    forms: [
      { word: 'menggunakan', type: 'meN-...-kan', meaning: 'to use', pos: 'verb' },
      { word: 'digunakan', type: 'di-...-kan', meaning: 'used (passive)', pos: 'verb' },
      { word: 'pengguna', type: 'peN-', meaning: 'user', pos: 'noun' },
      { word: 'penggunaan', type: 'peN-...-an', meaning: 'usage', pos: 'noun' },
      { word: 'kegunaan', type: 'ke-...-an', meaning: 'use/purpose', pos: 'noun' },
      { word: 'berguna', type: 'ber-', meaning: 'useful', pos: 'adj' },
    ]
  },
  'tahu': {
    root: 'tahu',
    meaning: 'know',
    forms: [
      { word: 'mengetahui', type: 'meN-...-i', meaning: 'to know/find out', pos: 'verb' },
      { word: 'diketahui', type: 'di-...-i', meaning: 'known (passive)', pos: 'verb' },
      { word: 'pengetahuan', type: 'peN-...-an', meaning: 'knowledge', pos: 'noun' },
      { word: 'ketahui', type: 'ke-...-i', meaning: 'to know (imperative)', pos: 'verb' },
      { word: 'berpengetahuan', type: 'ber-peN-...-an', meaning: 'knowledgeable', pos: 'adj' },
    ]
  },
  'ubah': {
    root: 'ubah',
    meaning: 'change',
    forms: [
      { word: 'mengubah', type: 'meN-', meaning: 'to change', pos: 'verb' },
      { word: 'diubah', type: 'di-', meaning: 'changed (passive)', pos: 'verb' },
      { word: 'pengubah', type: 'peN-', meaning: 'changer/modifier', pos: 'noun' },
      { word: 'perubahan', type: 'per-...-an', meaning: 'change (noun)', pos: 'noun' },
      { word: 'berubah', type: 'ber-', meaning: 'to change (intransitive)', pos: 'verb' },
    ]
  },
  'bersih': {
    root: 'bersih',
    meaning: 'clean',
    forms: [
      { word: 'membersihkan', type: 'meN-...-kan', meaning: 'to clean (something)', pos: 'verb' },
      { word: 'dibersihkan', type: 'di-...-kan', meaning: 'cleaned (passive)', pos: 'verb' },
      { word: 'pembersih', type: 'peN-', meaning: 'cleaner (agent/tool)', pos: 'noun' },
      { word: 'pembersihan', type: 'peN-...-an', meaning: 'cleaning process', pos: 'noun' },
      { word: 'kebersihan', type: 'ke-...-an', meaning: 'cleanliness', pos: 'noun' },
      { word: 'bersihkan', type: '-kan', meaning: 'clean! (imperative)', pos: 'verb' },
    ]
  },
  'pandu': {
    root: 'pandu',
    meaning: 'drive/guide',
    forms: [
      { word: 'memandu', type: 'meN-', meaning: 'to drive', pos: 'verb' },
      { word: 'dipandu', type: 'di-', meaning: 'driven (passive)', pos: 'verb' },
      { word: 'pemandu', type: 'peN-', meaning: 'driver', pos: 'noun' },
      { word: 'panduan', type: '-an', meaning: 'guide/guideline', pos: 'noun' },
    ]
  },
  'tinggi': {
    root: 'tinggi',
    meaning: 'tall/high',
    forms: [
      { word: 'meninggikan', type: 'meN-...-kan', meaning: 'to raise/elevate', pos: 'verb' },
      { word: 'ketinggian', type: 'ke-...-an', meaning: 'height/altitude', pos: 'noun' },
      { word: 'tertinggi', type: 'ter-', meaning: 'highest/tallest', pos: 'adj' },
      { word: 'setinggi', type: 'se-', meaning: 'as tall as', pos: 'adj' },
    ]
  },
  'indah': {
    root: 'indah',
    meaning: 'beautiful',
    forms: [
      { word: 'keindahan', type: 'ke-...-an', meaning: 'beauty', pos: 'noun' },
      { word: 'terindah', type: 'ter-', meaning: 'most beautiful', pos: 'adj' },
      { word: 'memperindah', type: 'meN-per-', meaning: 'to beautify', pos: 'verb' },
    ]
  },
  'sedia': {
    root: 'sedia',
    meaning: 'ready/provide',
    forms: [
      { word: 'bersedia', type: 'ber-', meaning: 'to be ready', pos: 'verb' },
      { word: 'menyediakan', type: 'meN-...-kan', meaning: 'to prepare/provide', pos: 'verb' },
      { word: 'disediakan', type: 'di-...-kan', meaning: 'provided (passive)', pos: 'verb' },
      { word: 'penyedia', type: 'peN-', meaning: 'provider', pos: 'noun' },
      { word: 'persediaan', type: 'per-...-an', meaning: 'preparation/supplies', pos: 'noun' },
      { word: 'kesediaan', type: 'ke-...-an', meaning: 'readiness/willingness', pos: 'noun' },
    ]
  },
  'baik': {
    root: 'baik',
    meaning: 'good',
    forms: [
      { word: 'memperbaiki', type: 'meN-per-...-i', meaning: 'to repair/improve', pos: 'verb' },
      { word: 'kebaikan', type: 'ke-...-an', meaning: 'goodness/kindness', pos: 'noun' },
      { word: 'terbaik', type: 'ter-', meaning: 'best', pos: 'adj' },
      { word: 'sebaik', type: 'se-', meaning: 'as good as / as soon as', pos: 'adj' },
      { word: 'perbaiki', type: 'per-...-i', meaning: 'fix/improve (imperative)', pos: 'verb' },
    ]
  },
  'takut': {
    root: 'takut',
    meaning: 'fear/afraid',
    forms: [
      { word: 'menakutkan', type: 'meN-...-kan', meaning: 'to scare/frightening', pos: 'verb' },
      { word: 'ketakutan', type: 'ke-...-an', meaning: 'fear (noun)', pos: 'noun' },
      { word: 'penakut', type: 'peN-', meaning: 'coward', pos: 'noun' },
      { word: 'ditakuti', type: 'di-...-i', meaning: 'feared (passive)', pos: 'verb' },
    ]
  },
  'tinggal': {
    root: 'tinggal',
    meaning: 'live/reside/leave',
    forms: [
      { word: 'meninggalkan', type: 'meN-...-kan', meaning: 'to leave/abandon', pos: 'verb' },
      { word: 'ditinggalkan', type: 'di-...-kan', meaning: 'left behind (passive)', pos: 'verb' },
      { word: 'kediaman', type: 'ke-...-an', meaning: 'residence', pos: 'noun' },
      { word: 'peninggalan', type: 'peN-...-an', meaning: 'heritage/remains', pos: 'noun' },
      { word: 'ketinggalan', type: 'ke-...-an', meaning: 'left behind/outdated', pos: 'adj' },
      { word: 'bertinggal', type: 'ber-', meaning: 'to reside (formal)', pos: 'verb' },
    ]
  },
  'pukul': {
    root: 'pukul',
    meaning: 'hit/strike/o\'clock',
    forms: [
      { word: 'memukul', type: 'meN-', meaning: 'to hit', pos: 'verb' },
      { word: 'dipukul', type: 'di-', meaning: 'hit (passive)', pos: 'verb' },
      { word: 'pemukul', type: 'peN-', meaning: 'bat/striker', pos: 'noun' },
      { word: 'pukulan', type: '-an', meaning: 'a hit/stroke', pos: 'noun' },
      { word: 'terpukul', type: 'ter-', meaning: 'struck/devastated', pos: 'adj' },
    ]
  },
  'tangkap': {
    root: 'tangkap',
    meaning: 'catch/capture',
    forms: [
      { word: 'menangkap', type: 'meN-', meaning: 'to catch/arrest', pos: 'verb' },
      { word: 'ditangkap', type: 'di-', meaning: 'caught/arrested (passive)', pos: 'verb' },
      { word: 'penangkapan', type: 'peN-...-an', meaning: 'capture/arrest', pos: 'noun' },
      { word: 'tangkapan', type: '-an', meaning: 'a catch', pos: 'noun' },
      { word: 'tertangkap', type: 'ter-', meaning: 'caught (accidentally)', pos: 'verb' },
    ]
  },
  'sihat': {
    root: 'sihat',
    meaning: 'healthy',
    forms: [
      { word: 'menyihatkan', type: 'meN-...-kan', meaning: 'to make healthy', pos: 'verb' },
      { word: 'kesihatan', type: 'ke-...-an', meaning: 'health', pos: 'noun' },
      { word: 'penyihat', type: 'peN-', meaning: 'healer', pos: 'noun' },
    ]
  },
  'aman': {
    root: 'aman',
    meaning: 'peaceful/safe',
    forms: [
      { word: 'mengamankan', type: 'meN-...-kan', meaning: 'to secure/pacify', pos: 'verb' },
      { word: 'keamanan', type: 'ke-...-an', meaning: 'peace/security', pos: 'noun' },
      { word: 'pengaman', type: 'peN-', meaning: 'security guard', pos: 'noun' },
    ]
  },
};

export default WORD_FAMILIES;
