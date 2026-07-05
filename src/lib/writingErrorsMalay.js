// Rule-based Bahasa Melayu writing error detector for IGCSE 0546.
//
// Mirrors writingErrors.js (English) so the grader/Writing UI can run
// either engine via the same shape:
//   { id, type, severity, start, end, excerpt, message, suggestion }
//
// IGCSE 0546 markers reward: imbuhan accuracy, kata sendi nama,
// kata hubung range, penanda wacana, register match, and freedom
// from slang/English loanwords in formal pieces. The rules below
// target those specifically.
//
// Conservative bias: a wrong correction damages learner confidence
// more than a missed one, so every rule prefers false negatives.

const HIGH = 'high'
const MED  = 'medium'
const LOW  = 'low'

// ────────────────────────────────────────────────────────────────────
// Helpers (parallel to writingErrors.js)
// ────────────────────────────────────────────────────────────────────

function pushAll(list, more) { for (const f of more) list.push(f) }

function makeFinding({ id, type, severity, start, end, text, message, suggestion }) {
  return {
    id,
    type,
    severity,
    start,
    end,
    excerpt: text.slice(start, end),
    message,
    suggestion: suggestion ?? null,
  }
}

function splitSentenceSpans(text) {
  const out = []
  const re = /[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g
  let m
  while ((m = re.exec(text)) !== null) {
    const start = m.index
    const end = start + m[0].length
    if (m[0].trim().length === 0) continue
    out.push({ start, end, text: m[0] })
  }
  return out
}

// Word iterator — preserves hyphen-reduplications (kanak-kanak, buku-buku)
// as one token and exposes both raw and lowercased forms.
function* iterWords(text) {
  const re = /[A-Za-z][A-Za-z]*(?:-[A-Za-z]+)*/g
  let m
  while ((m = re.exec(text)) !== null) {
    yield {
      start: m.index,
      end: m.index + m[0].length,
      word: m[0],
      lower: m[0].toLowerCase(),
    }
  }
}

function isInsideQuotes(text, pos) {
  let inside = false
  for (let i = 0; i < pos; i++) {
    const ch = text[i]
    if (ch === '"' || ch === '“' || ch === '”') inside = !inside
  }
  return inside
}

// Formal Malay formats — slang and contractions are flagged here.
const FORMAL_MS_FORMATS = new Set([
  'ms-surat-rasmi',
  'ms-rencana',
  'ms-laporan',
  'ms-ucapan',
  'ms-fakta',
  'ms-directed',
  'ms-keperihalan',
  'ms-berita',
  'ms-autobiografi',
])

// ────────────────────────────────────────────────────────────────────
// 1. Imbuhan errors (meN-, ber-, di-, ter-, peN-)
// The wrong forms below are common student errors with unambiguous
// standard corrections. Conservative — only flag what is clearly wrong.
// ────────────────────────────────────────────────────────────────────

const IMBUHAN_FIXES = [
  // --- meN- + p-base: p drops ----------------------------------------
  // Wrong: "mempukul" → memukul, "memperintah" stays (different prefix)
  { re: /\bmempukul(?:i|kan)?\b/gi,        fix: (m) => m.replace(/mempukul/i, 'memukul'),
    msg: '"mempukul" — base "pukul" loses p with meN-. Use "memukul".' },
  { re: /\bmempandang(?:i|kan)?\b/gi,      fix: (m) => m.replace(/mempandang/i, 'memandang'),
    msg: '"mempandang" — base "pandang" loses p. Use "memandang".' },
  { re: /\bmempakai(?:kan)?\b/gi,          fix: (m) => m.replace(/mempakai/i, 'memakai'),
    msg: '"mempakai" — base "pakai" loses p. Use "memakai".' },
  { re: /\bmempegang(?:i|kan)?\b/gi,       fix: (m) => m.replace(/mempegang/i, 'memegang'),
    msg: '"mempegang" — base "pegang" loses p. Use "memegang".' },
  { re: /\bmempeluk(?:kan)?\b/gi,          fix: (m) => m.replace(/mempeluk/i, 'memeluk'),
    msg: '"mempeluk" — base "peluk" loses p. Use "memeluk".' },
  { re: /\bmempaksa(?:kan)?\b/gi,          fix: (m) => m.replace(/mempaksa/i, 'memaksa'),
    msg: '"mempaksa" — base "paksa" loses p. Use "memaksa".' },
  { re: /\bmempasang(?:i|kan)?\b/gi,       fix: (m) => m.replace(/mempasang/i, 'memasang'),
    msg: '"mempasang" — base "pasang" loses p. Use "memasang".' },
  { re: /\bmempotong(?:kan)?\b/gi,         fix: (m) => m.replace(/mempotong/i, 'memotong'),
    msg: '"mempotong" — base "potong" loses p. Use "memotong".' },
  { re: /\bmempilih(?:kan)?\b/gi,          fix: (m) => m.replace(/mempilih/i, 'memilih'),
    msg: '"mempilih" — base "pilih" loses p. Use "memilih".' },

  // --- meN- + k-base: k drops ----------------------------------------
  { re: /\bmengkira(?:kan)?\b/gi,          fix: (m) => m.replace(/mengkira/i, 'mengira'),
    msg: '"mengkira" — base "kira" loses k. Use "mengira".' },
  { re: /\bmengkaji(?:kan|i)?\b/gi,        fix: (m) => m.replace(/mengkaji/i, 'mengkaji is correct'),
    msg: null }, // mengkaji is actually correct (k retained because of -kaji root). Disabled.
  { re: /\bmengkata(?:kan)?\b/gi,          fix: (m) => m.replace(/mengkata/i, 'mengata'),
    msg: '"mengkata" — base "kata" loses k. Use "mengata" or "mengatakan".' },
  { re: /\bmengkarang(?:kan)?\b/gi,        fix: (m) => m.replace(/mengkarang/i, 'mengarang'),
    msg: '"mengkarang" — base "karang" loses k. Use "mengarang".' },
  { re: /\bmengkurangkan\b/gi,             fix: (m) => m.replace(/mengkurangkan/i, 'mengurangkan'),
    msg: '"mengkurangkan" — base "kurang" loses k. Use "mengurangkan".' },
  { re: /\bmengkembangkan\b/gi,            fix: (m) => m.replace(/mengkembangkan/i, 'mengembangkan'),
    msg: '"mengkembangkan" — base "kembang" loses k. Use "mengembangkan".' },
  { re: /\bmengketahui\b/gi,               fix: (m) => m.replace(/mengketahui/i, 'mengetahui'),
    msg: '"mengketahui" — base "tahu" with ke- nominalisation loses k. Use "mengetahui".' },
  { re: /\bmengkenal(?:i|kan)?\b/gi,       fix: (m) => m.replace(/mengkenal/i, 'mengenal'),
    msg: '"mengkenal" — base "kenal" loses k. Use "mengenal/mengenali".' },

  // --- meN- + s-base: s drops, replaced by ny ------------------------
  { re: /\bmensapu(?:kan)?\b/gi,           fix: (m) => m.replace(/mensapu/i, 'menyapu'),
    msg: '"mensapu" — base "sapu" loses s, becoming meny-. Use "menyapu".' },
  { re: /\bmensuruh(?:kan|i)?\b/gi,        fix: (m) => m.replace(/mensuruh/i, 'menyuruh'),
    msg: '"mensuruh" — base "suruh" → meny-. Use "menyuruh".' },
  { re: /\bmensimpan(?:kan)?\b/gi,         fix: (m) => m.replace(/mensimpan/i, 'menyimpan'),
    msg: '"mensimpan" — base "simpan" → meny-. Use "menyimpan".' },
  { re: /\bmensiram(?:kan|i)?\b/gi,        fix: (m) => m.replace(/mensiram/i, 'menyiram'),
    msg: '"mensiram" — base "siram" → meny-. Use "menyiram".' },
  { re: /\bmensokong(?:i|kan)?\b/gi,       fix: (m) => m.replace(/mensokong/i, 'menyokong'),
    msg: '"mensokong" — base "sokong" → meny-. Use "menyokong".' },
  { re: /\bmensentuh(?:i|kan)?\b/gi,       fix: (m) => m.replace(/mensentuh/i, 'menyentuh'),
    msg: '"mensentuh" — base "sentuh" → meny-. Use "menyentuh".' },
  { re: /\bmensusahkan\b/gi,               fix: (m) => m.replace(/mensusahkan/i, 'menyusahkan'),
    msg: '"mensusahkan" — base "susah" → meny-. Use "menyusahkan".' },

  // --- meN- + t-base: t drops ----------------------------------------
  { re: /\bmentari(?!\b\s*(?:matahari|terbit))/gi, fix: null, msg: null }, // "mentari" is the noun; do not flag in unrelated contexts
  { re: /\bmentulis(?:kan)?\b/gi,          fix: (m) => m.replace(/mentulis/i, 'menulis'),
    msg: '"mentulis" — base "tulis" loses t. Use "menulis".' },
  { re: /\bmentanam(?:i|kan)?\b/gi,        fix: (m) => m.replace(/mentanam/i, 'menanam'),
    msg: '"mentanam" — base "tanam" loses t. Use "menanam".' },
  { re: /\bmentolak(?:kan)?\b/gi,          fix: (m) => m.replace(/mentolak/i, 'menolak'),
    msg: '"mentolak" — base "tolak" loses t. Use "menolak".' },
  { re: /\bmentangkap(?:kan)?\b/gi,        fix: (m) => m.replace(/mentangkap/i, 'menangkap'),
    msg: '"mentangkap" — base "tangkap" loses t. Use "menangkap".' },
  { re: /\bmentanya(?:kan)?\b/gi,          fix: (m) => m.replace(/mentanya/i, 'menanya'),
    msg: '"mentanya" — base "tanya" loses t. Use "menanya/menanyakan".' },
  { re: /\bmentengok(?:i|kan)?\b/gi,       fix: (m) => m.replace(/mentengok/i, 'menengok'),
    msg: '"mentengok" — base "tengok" loses t. Use "menengok".' },

  // --- merubah (very common error: rubah is "fox") -------------------
  { re: /\bmerubah(?:kan|i)?\b/gi,         fix: (m) => m.replace(/merubah/i, 'mengubah'),
    msg: '"merubah" — the base is "ubah" (rubah = fox). Use "mengubah".' },
  { re: /\bperubahkan\b/gi,                fix: () => 'pengubahan',
    msg: '"perubahkan" — base is "ubah". Use "pengubahan" or simply "perubahan".' },

  // --- di- vs ter- confusion -----------------------------------------
  { re: /\bdimakan\s+oleh\s+nasi\b/gi, fix: null, msg: null }, // sanity guard, no rule
  // pattern: redundant "kan" after passive di- when verb is intransitive
  // Too prone to false positives without a verb dictionary — leave to LLM.

  // --- Common -kan vs -i confusion -----------------------------------
  { re: /\bmemberitahukan\b/gi,    fix: (m) => m.replace(/memberitahukan/i, 'memberitahu'),
    msg: '"memberitahukan" — "memberitahu" already takes a direct object. Drop -kan.' },
  { re: /\bmenjadikkan\b/gi,       fix: (m) => m.replace(/menjadikkan/i, 'menjadikan'),
    msg: '"menjadikkan" — only one k. Use "menjadikan".' },
  { re: /\bmempertingkatkan\b/gi,  fix: (m) => m.replace(/mempertingkatkan/i, 'meningkatkan'),
    msg: '"mempertingkatkan" — over-affixed. Use "meningkatkan".' },
  { re: /\bmemperjelaskan\b/gi,    fix: (m) => m.replace(/memperjelaskan/i, 'menjelaskan'),
    msg: '"memperjelaskan" — over-affixed. Use "menjelaskan" (or "memperjelas" without -kan).' },
  { re: /\bmempersembahkanlah\b/gi, fix: (m) => m.replace(/mempersembahkanlah/i, 'mempersembahkan'),
    msg: '"-lah" attached to a long verb is informal. Drop -lah in formal writing.' },

  // --- meN- transitive verbs MISSING the obligatory -kan/-i suffix -----
  // Curated bare forms whose suffixed version is the standard transitive verb.
  // \bword\b never matches the suffixed form (no boundary before -kan/-i), so
  // "mengamalkan" is left alone — only the bare "mengamal" is flagged.
  { re: /\bmengamal\b/gi,   fix: () => 'mengamalkan',
    msg: '"mengamal" needs -kan when it takes an object: "mengamalkan".' },
  { re: /\bmengabai\b/gi,   fix: () => 'mengabaikan',
    msg: '"mengabai" needs -kan: "mengabaikan".' },
  { re: /\bmenjejas\b/gi,   fix: () => 'menjejaskan',
    msg: '"menjejas" needs -kan: "menjejaskan".' },
  { re: /\bmemusnah\b/gi,   fix: () => 'memusnahkan',
    msg: '"memusnah" needs -kan: "memusnahkan".' },
  { re: /\bmenyinar\b/gi,   fix: () => 'menyinari',
    msg: '"menyinar" takes -i for a transitive object: "menyinari".' },

  // --- over-affixed per-…-kan -----------------------------------------
  { re: /\bmemperluaskan\b/gi,  fix: () => 'meluaskan',
    msg: '"memperluaskan" — over-affixed. Use "meluaskan" or "memperluas".' },
]

function detectImbuhanErrors(text) {
  const out = []
  for (const r of IMBUHAN_FIXES) {
    if (!r.msg) continue
    let m
    while ((m = r.re.exec(text)) !== null) {
      const fixed = r.fix ? r.fix(m[0]) : null
      out.push(makeFinding({
        id: 'imbuhan',
        type: 'grammar',
        severity: HIGH,
        start: m.index, end: m.index + m[0].length, text,
        message: r.msg,
        suggestion: fixed,
      }))
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// 2. Kata sendi nama / preposition errors
// ────────────────────────────────────────────────────────────────────

const PREP_FIXES = [
  // dari pada / ke pada / oleh kerana — should be one word
  { re: /\bdari\s+pada\b/gi,            fix: 'daripada',
    msg: '"daripada" is one word in standard Malay.' },
  { re: /\bke\s+pada\b/gi,              fix: 'kepada',
    msg: '"kepada" is one word in standard Malay.' },

  // disamping / dibawah / diatas / didalam / diluar / disekolah etc.
  // Modern standard: "di" as locative preposition is ALWAYS separate
  // from the place noun. Common student mistake is to glue them.
  { re: /\bdisamping\b/gi,              fix: 'di samping',
    msg: '"di" as a preposition is a separate word. Use "di samping".' },
  { re: /\bdibawah\b/gi,                fix: 'di bawah',
    msg: '"di" as a preposition is separate. Use "di bawah".' },
  { re: /\bdiatas\b/gi,                 fix: 'di atas',
    msg: '"di" as a preposition is separate. Use "di atas".' },
  { re: /\bdidalam\b/gi,                fix: 'di dalam',
    msg: '"di" as a preposition is separate. Use "di dalam".' },
  { re: /\bdiluar\b/gi,                 fix: 'di luar',
    msg: '"di" as a preposition is separate. Use "di luar".' },
  { re: /\bdisini\b/gi,                 fix: 'di sini',
    msg: '"di sini" is two words.' },
  { re: /\bdisana\b/gi,                 fix: 'di sana',
    msg: '"di sana" is two words.' },
  { re: /\bdisitu\b/gi,                 fix: 'di situ',
    msg: '"di situ" is two words.' },
  { re: /\bdimana\b/gi,                 fix: 'di mana',
    msg: '"di mana" is two words.' },
  { re: /\bdiantara\b/gi,               fix: 'di antara',
    msg: '"di antara" is two words.' },
  { re: /\bdihadapan\b/gi,              fix: 'di hadapan',
    msg: '"di hadapan" is two words.' },
  { re: /\bdibelakang\b/gi,             fix: 'di belakang',
    msg: '"di belakang" is two words.' },
  { re: /\bdisebelah\b/gi,              fix: 'di sebelah',
    msg: '"di sebelah" is two words.' },
  { re: /\bdirumah\b/gi,                fix: 'di rumah',
    msg: '"di rumah" is two words.' },
  { re: /\bdisekolah\b/gi,              fix: 'di sekolah',
    msg: '"di sekolah" is two words.' },
  { re: /\bdipasar\b/gi,                fix: 'di pasar',
    msg: '"di pasar" is two words.' },

  // ke + place: same rule
  { re: /\bkesekolah\b/gi,              fix: 'ke sekolah',
    msg: '"ke" as a direction preposition is separate. Use "ke sekolah".' },
  { re: /\bkerumah\b/gi,                fix: 'ke rumah',
    msg: '"ke rumah" is two words.' },
  { re: /\bkepasar\b/gi,                fix: 'ke pasar',
    msg: '"ke pasar" is two words.' },
  { re: /\bkebandar\b/gi,               fix: 'ke bandar',
    msg: '"ke bandar" is two words.' },
  { re: /\bkesana\b/gi,                 fix: 'ke sana',
    msg: '"ke sana" is two words.' },
  { re: /\bkesini\b/gi,                 fix: 'ke sini',
    msg: '"ke sini" is two words.' },

  // dari vs daripada — dari is for places, daripada is for non-places
  { re: /\bdari\s+(saya|kami|kita|kamu|engkau|awak|dia|mereka|beliau|aku|tuan|puan|cikgu|pelajar|kawan|sahabat|ibu|bapa|ayah)\b/gi,
    fix: (m) => m.replace(/dari/i, 'daripada'),
    msg: '"dari" is for places. Use "daripada" for people, things, or comparison.' },
  { re: /\bdari\s+(itu|ini)\b(?!\s+(?:sekolah|rumah|bandar|kampung|tempat|negara|negeri))/gi,
    fix: (m) => m.replace(/dari/i, 'daripada'),
    msg: '"dari" is for places. For non-place referents use "daripada".' },
  { re: /\bterdiri\s+dari\b/gi,
    fix: 'terdiri daripada',
    msg: '"terdiri daripada" is the standard form.' },
  { re: /\bberbeza\s+dari\b/gi,
    fix: 'berbeza daripada',
    msg: '"berbeza daripada" — comparison takes daripada.' },
  { re: /\blebih\s+\w+\s+dari\s+(saya|kami|kita|kamu|dia|mereka)\b/gi,
    fix: (m) => m.replace(/dari/i, 'daripada'),
    msg: 'Comparison uses "daripada", not "dari".' },

  // walau bagaimanapun is one phrase, often misspelled as one word
  { re: /\bwalaubagaimanapun\b/gi,      fix: 'walau bagaimanapun',
    msg: '"walau bagaimanapun" is three words.' },
  { re: /\bwalaupunbegitu\b/gi,         fix: 'walaupun begitu',
    msg: 'Two words: "walaupun begitu".' },

  // sehinggakan vs sehingga — sehinggakan is non-standard
  { re: /\bsehinggakan\b/gi,            fix: 'sehingga',
    msg: '"sehinggakan" is colloquial. Standard form is "sehingga".' },

  // disebabkan oleh kerana — redundant
  { re: /\bdisebabkan\s+oleh\s+kerana\b/gi, fix: 'disebabkan oleh',
    msg: 'Redundant — "disebabkan oleh kerana" doubles up. Use "disebabkan oleh" or "kerana".' },

  // comparison "lebih/kurang <quality> dari X" → daripada. The adjective list
  // keeps this off spatial "lebih jauh dari sekolah" (where "dari" is correct).
  // \bdari\b never matches inside "daripada", so a correct sentence is safe.
  { re: /\b(lebih|kurang)\s+(penting|baik|bagus|teruk|buruk|tinggi|rendah|besar|kecil|banyak|sedikit|mudah|susah|senang|cepat|lambat|murah|mahal|berkesan|berguna|cantik|elok|kuat|lemah|ramai|hebat|sihat|selamat|menarik|bermakna)\s+dari\b/gi,
    fix: (m) => m.replace(/\bdari\b/i, 'daripada'),
    msg: 'Comparison takes "daripada", not "dari".' },

  // direction verb + here/there without "ke"
  { re: /\b(pergi|datang|balik|pulang|naik|turun)\s+(sana|sini|situ)\b/gi,
    fix: (m) => m.replace(/\s+/, ' ke '),
    msg: 'Missing direction preposition "ke" — e.g. "pergi ke sana".' },

  // "berguna dari" — wrong preposition (berguna takes kepada/bagi)
  { re: /\bberguna\s+dari\b/gi, fix: 'berguna kepada',
    msg: '"berguna" takes "kepada" or "bagi", not "dari".' },
]

function detectPrepositionErrorsMs(text) {
  const out = []
  for (const r of PREP_FIXES) {
    let m
    while ((m = r.re.exec(text)) !== null) {
      const fixed = typeof r.fix === 'function' ? r.fix(m[0]) : r.fix
      out.push(makeFinding({
        id: 'preposition-ms',
        type: 'grammar',
        severity: HIGH,
        start: m.index, end: m.index + m[0].length, text,
        message: r.msg,
        suggestion: fixed,
      }))
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// 2b. Passive "di-" wrongly spaced from its verb ("di selesaikan" →
// "diselesaikan"). CURATED VERB set only — locative "di" before a place
// ("di sekolah", "di sana") stays two words and must never appear here.
// ────────────────────────────────────────────────────────────────────

const DI_PASSIVE_VERBS = new Set([
  'selesaikan', 'pupuk', 'buat', 'beri', 'berikan', 'ambil', 'guna', 'gunakan',
  'lakukan', 'laksanakan', 'jalankan', 'adakan', 'wujudkan', 'hasilkan', 'sediakan',
  'tingkatkan', 'kurangkan', 'tetapkan', 'kawal', 'ubah', 'baiki', 'perbaiki',
  'tulis', 'baca', 'lihat', 'hantar', 'bayar', 'jadikan', 'namakan', 'kenakan',
  'perlukan', 'tubuhkan', 'kemukakan', 'sampaikan', 'gantikan', 'tunjukkan',
])

function detectPassiveDiSpacing(text) {
  const out = []
  const re = /\bdi\s+([a-z]+)\b/gi
  let m
  while ((m = re.exec(text)) !== null) {
    if (!DI_PASSIVE_VERBS.has(m[1].toLowerCase())) continue
    out.push(makeFinding({
      id: 'passive-di-spacing',
      type: 'grammar',
      severity: HIGH,
      start: m.index, end: m.index + m[0].length, text,
      message: 'Passive "di-" attaches to its verb — write it as one word (e.g. "diselesaikan").',
      suggestion: m[0].replace(/di\s+/i, 'di'),
    }))
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// 2c. Cohesion / discourse-connector misuse (redundant or non-standard).
// ────────────────────────────────────────────────────────────────────

const COHESION_FIXES = [
  { re: /\bOleh\s+kerana\s+itu\b/gi, fix: 'Oleh itu',
    msg: '"Oleh kerana itu" is redundant — use "Oleh itu" or "Oleh sebab itu".' },
]

function detectCohesionMs(text) {
  const out = []
  for (const r of COHESION_FIXES) {
    let m
    while ((m = r.re.exec(text)) !== null) {
      out.push(makeFinding({
        id: 'cohesion-ms', type: 'style', severity: MED,
        start: m.index, end: m.index + m[0].length, text,
        message: r.msg, suggestion: r.fix,
      }))
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// 2d. Unambiguous English words — wrong in an IGCSE MALAY essay regardless
// of format (curated + clearly English, so a flag is safe). Quotes exempt.
// ────────────────────────────────────────────────────────────────────

const ENGLISH_LOANWORDS = new Map([
  ['happy', 'gembira'], ['sad', 'sedih'], ['angry', 'marah'], ['nice', 'bagus'],
  ['cute', 'comel'], ['friend', 'kawan'], ['friends', 'kawan'], ['study', 'belajar'],
  ['problem', 'masalah'], ['phone', 'telefon'], ['story', 'cerita'], ['busy', 'sibuk'],
  ['lucky', 'bertuah'], ['boring', 'membosankan'], ['fun', 'seronok'],
])

function detectEnglishLoanwords(text) {
  const out = []
  for (const w of iterWords(text)) {
    const fix = ENGLISH_LOANWORDS.get(w.lower)
    if (!fix) continue
    if (isInsideQuotes(text, w.start)) continue
    out.push(makeFinding({
      id: 'english-loanword', type: 'style', severity: MED,
      start: w.start, end: w.end, text,
      message: `"${w.word}" is English — use the Malay word ("${fix}").`,
      suggestion: fix,
    }))
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// 3. Slang / colloquial — flagged in formal formats only
// ────────────────────────────────────────────────────────────────────

const SLANG = [
  { word: 'tak',     fix: 'tidak',          msg: 'Informal. Use "tidak" in formal writing.' },
  { word: 'takpe',   fix: 'tidak mengapa',  msg: 'Slang. Use "tidak mengapa".' },
  { word: 'takper',  fix: 'tidak mengapa',  msg: 'Slang. Use "tidak mengapa".' },
  { word: 'tak ape', fix: 'tidak mengapa',  msg: 'Slang. Use "tidak mengapa".' },
  { word: 'tapi',    fix: 'tetapi',         msg: '"tapi" is colloquial. Use "tetapi" or "Namun".' },
  { word: 'nak',     fix: 'mahu',           msg: 'Informal. Use "mahu" or "hendak".' },
  { word: 'dah',     fix: 'sudah',          msg: 'Informal. Use "sudah" or "telah".' },
  { word: 'macam',   fix: 'seperti',        msg: 'Informal. Use "seperti" or "umpama".' },
  { word: 'macam mana', fix: 'bagaimana',   msg: 'Informal. Use "bagaimana".' },
  { word: 'camne',   fix: 'bagaimana',      msg: 'Slang. Use "bagaimana".' },
  { word: 'cane',    fix: 'bagaimana',      msg: 'Slang. Use "bagaimana".' },
  { word: 'macam ni', fix: 'seperti ini',   msg: 'Slang. Use "seperti ini".' },
  { word: 'kena',    fix: 'perlu',          msg: 'Often colloquial. In formal contexts prefer "perlu" / "harus" / "dipaksa".' },
  { word: 'dapat',   fix: null,             msg: null }, // skip — "dapat" is fine
  { word: 'boleh',   fix: null,             msg: null }, // skip — "boleh" is fine
  { word: 'pasal',   fix: 'kerana',         msg: 'Informal. Use "kerana" (cause) or "tentang" (topic).' },
  { word: 'sebab',   fix: null,             msg: null }, // skip — "sebab" is acceptable
  { word: 'best',    fix: 'hebat',          msg: 'English slang. Use "hebat" / "terbaik".' },
  { word: 'okay',    fix: 'baik',           msg: 'English slang. Use "baik".' },
  { word: 'ok',      fix: 'baik',           msg: 'English slang. Use "baik".' },
  { word: 'wei',     fix: null,             msg: 'Informal exclamation — drop it in formal writing.' },
  { word: 'lah',     fix: null,             msg: 'Particle "-lah" is acceptable in dialogue, not in formal essays.' },
  { word: 'lor',     fix: null,             msg: 'Slang particle. Drop it.' },
  { word: 'kot',     fix: 'mungkin',        msg: 'Slang. Use "mungkin".' },
  { word: 'kut',     fix: 'mungkin',        msg: 'Slang. Use "mungkin".' },
  { word: 'kan',     fix: null,             msg: null }, // skip — "kan" can be formal abbreviation of "akan"; risk too high
  { word: 'je',      fix: 'sahaja',         msg: 'Slang. Use "sahaja".' },
  { word: 'jek',     fix: 'sahaja',         msg: 'Slang. Use "sahaja".' },
  { word: 'sahaja',  fix: null,             msg: null },
  { word: 'tu',      fix: 'itu',            msg: 'Informal. Use "itu" in formal writing.' },
  { word: 'ni',      fix: 'ini',            msg: 'Informal. Use "ini" in formal writing.' },
  { word: 'wat',     fix: 'buat',           msg: 'Slang. Use "buat".' },
  { word: 'apsal',   fix: 'mengapa',        msg: 'Slang. Use "mengapa" or "kenapa".' },
  { word: 'kenapa',  fix: null,             msg: null }, // skip — kenapa is acceptable
  { word: 'tau',     fix: 'tahu',           msg: 'Informal spelling. Use "tahu".' },
  { word: 'tahu-tahu', fix: null,           msg: null },
  { word: 'cuma',    fix: null,             msg: null },
  { word: 'cume',    fix: 'cuma',           msg: 'Spelling — "cuma".' },
  { word: 'aje',     fix: 'sahaja',         msg: 'Slang. Use "sahaja".' },
  { word: 'mcm',     fix: 'seperti',        msg: 'Abbreviation. Use "seperti".' },
  { word: 'pakai',   fix: null,             msg: null },
  { word: 'pakey',   fix: 'pakai',          msg: 'Slang spelling. Use "pakai".' },
  { word: 'sgt',     fix: 'sangat',         msg: 'Abbreviation. Use "sangat".' },
  { word: 'tp',      fix: 'tetapi',         msg: 'Abbreviation. Use "tetapi".' },
  { word: 'sbb',     fix: 'sebab',          msg: 'Abbreviation. Use "sebab" or "kerana".' },
  { word: 'sbnrnya', fix: 'sebenarnya',     msg: 'Abbreviation. Use "sebenarnya".' },
  { word: 'utk',     fix: 'untuk',          msg: 'Abbreviation. Use "untuk".' },
  { word: 'yg',      fix: 'yang',           msg: 'Abbreviation. Use "yang".' },
  { word: 'dgn',     fix: 'dengan',         msg: 'Abbreviation. Use "dengan".' },
  { word: 'krn',     fix: 'kerana',         msg: 'Abbreviation. Use "kerana".' },
  { word: 'abis',    fix: 'habis',          msg: 'Slang. Use "habis".' },
  { word: 'abes',    fix: 'habis',          msg: 'Slang. Use "habis".' },
]

function detectSlangFormal(text, formatId) {
  if (!formatId || !FORMAL_MS_FORMATS.has(formatId)) return []
  const out = []
  for (const s of SLANG) {
    if (!s.msg) continue
    const escaped = s.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = s.word.includes(' ')
      ? new RegExp('\\b' + escaped.replace(/ /g, '\\s+') + '\\b', 'gi')
      : new RegExp('\\b' + escaped + '\\b', 'gi')
    let m
    while ((m = re.exec(text)) !== null) {
      if (isInsideQuotes(text, m.index)) continue   // dialogue exempt
      out.push(makeFinding({
        id: 'slang-' + s.word.replace(/\s+/g, '-'),
        type: 'style',
        severity: MED,
        start: m.index, end: m.index + m[0].length, text,
        message: s.msg,
        suggestion: s.fix,
      }))
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// 4. Common Malay misspellings — curated, only standard-form mistakes
// ────────────────────────────────────────────────────────────────────

const MS_MISSPELLINGS = new Map([
  // doubled vowels / dropped letters
  ['kerena', 'kerana'],
  ['kerajaaan', 'kerajaan'],
  ['keadaaan', 'keadaan'],
  ['perasaaan', 'perasaan'],
  ['huburan', 'hiburan'],
  ['sebahagiaan', 'sebahagian'],
  ['kebahagian', 'kebahagiaan'],
  ['mengundirkan', 'mengundi'],
  ['pemudaan', 'pemuda'],
  ['Malasia', 'Malaysia'],
  ['malasia', 'malaysia'],
  ['malasian', 'Malaysia'],
  ['indonesa', 'Indonesia'],
  ['singapor', 'Singapura'],

  // wrong vowel
  ['wujod', 'wujud'],
  ['wojud', 'wujud'],
  ['masaalah', 'masalah'],
  ['masalan', 'masalah'],
  ['hadiyah', 'hadiah'],
  ['negera', 'negara'],
  ['negaraa', 'negara'],
  ['ibubapa', 'ibu bapa'],
  ['ibubapanya', 'ibu bapanya'],
  ['ibubapaku', 'ibu bapaku'],

  // wrong cluster
  // NOTE: mengikut / mengikutkan / mengikuti AND mengambil / mengambilkan are
  // ALL valid Kamus Dewan words (verified via PRPM) — do NOT re-add them as
  // "misspellings" (mengikutkan = menyertakan; mengikuti = to follow/attend;
  // mengambilkan = benefactive "take for"). Flagging a real word HIGH is the
  // worst defect class for a learning tool.
  ['menjalankkan', 'menjalankan'],
  ['mengeluarkkan', 'mengeluarkan'],
  ['memcuba', 'mencuba'],
  ['mendpatkan', 'mendapatkan'],

  // common spelling drift
  ['kerajaa', 'kerajaan'],
  ['perpaduann', 'perpaduan'],
  ['perpadan', 'perpaduan'],
  ['kemerdekan', 'kemerdekaan'],
  ['kemerdekaaan', 'kemerdekaan'],
  ['memajukan', 'memajukan'], // sanity: same — placeholder
  ['kebersihaan', 'kebersihan'],
  ['kesihataan', 'kesihatan'],
  ['kesihatahan', 'kesihatan'],
  ['pelajaraan', 'pelajaran'],
  ['pendidikann', 'pendidikan'],
  ['pelancongann', 'pelancongan'],
  ['kepentingann', 'kepentingan'],

  // common confusables
  ['rakyatt', 'rakyat'],
  ['rakyats', 'rakyat'],
  ['contohnyan', 'contohnya'],
  ['contohny', 'contohnya'],
  ['umpama nya', 'umpamanya'],

  // English-influenced
  ['sosial', 'sosial'],     // correct
  ['social', 'sosial'],     // EN form
  ['economic', 'ekonomi'],
  ['ekonomic', 'ekonomi'],
  ['mediasocial', 'media sosial'],
  ['internett', 'internet'],

  // hyphenation typos
  ['kanakkanak', 'kanak-kanak'],
  ['hatihati', 'hati-hati'],
  ['tibatiba', 'tiba-tiba'],
  ['jenisjenis', 'jenis-jenis'],
])

// Words that should stay capitalised (lowercase form is wrong if it is
// a proper noun used standalone). Limited to high-confidence cases.
const PROPER_NOUNS_NEEDING_CAP = new Set([
  'malaysia', 'singapura', 'indonesia', 'kuala lumpur',
])

function detectMalaySpelling(text) {
  const out = []
  for (const w of iterWords(text)) {
    const fix = MS_MISSPELLINGS.get(w.lower)
    if (fix && fix !== w.lower) {
      // Skip placeholder identity entries
      if (fix === w.word) continue
      const correct = /^[A-Z]/.test(w.word) ? fix.charAt(0).toUpperCase() + fix.slice(1) : fix
      out.push(makeFinding({
        id: 'spell-' + w.lower,
        type: 'spelling',
        severity: HIGH,
        start: w.start, end: w.end, text,
        message: `"${w.word}" is a common misspelling.`,
        suggestion: correct,
      }))
    }
    // Proper-noun capitalisation
    if (PROPER_NOUNS_NEEDING_CAP.has(w.lower) && !/^[A-Z]/.test(w.word)) {
      out.push(makeFinding({
        id: 'cap-proper',
        type: 'punctuation',
        severity: MED,
        start: w.start, end: w.end, text,
        message: `"${w.word}" is a proper noun — capitalise it.`,
        suggestion: w.word.charAt(0).toUpperCase() + w.word.slice(1),
      }))
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// 5. Repeated words ("yang yang", "dan dan")
// ────────────────────────────────────────────────────────────────────

// Reduplication via hyphen (kanak-kanak) is correct; consecutive identical
// words separated by space are typos in Malay too.
const MS_SAFE_REPEATS = new Set(['yang']) // "yang yang" can occur in nested clauses, rare; treat carefully

function detectRepeatedWordsMs(text) {
  const out = []
  const re = /\b([A-Za-z]+)\s+\1\b/gi
  let m
  while ((m = re.exec(text)) !== null) {
    const w = m[1].toLowerCase()
    if (MS_SAFE_REPEATS.has(w)) continue
    out.push(makeFinding({
      id: 'repeated-word',
      type: 'grammar',
      severity: HIGH,
      start: m.index, end: m.index + m[0].length, text,
      message: `Perkataan "${m[1]}" diulang dua kali berturut-turut.`,
      suggestion: m[1],
    }))
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// 6. Capitalisation and spacing
// ────────────────────────────────────────────────────────────────────

function detectCapitalizationMs(text) {
  const out = []
  // First letter of the essay
  const firstLetter = text.match(/[A-Za-z]/)
  if (firstLetter && /[a-z]/.test(firstLetter[0])) {
    const idx = text.indexOf(firstLetter[0])
    out.push(makeFinding({
      id: 'cap-first',
      type: 'punctuation',
      severity: MED,
      start: idx, end: idx + 1, text,
      message: 'Mulakan karangan dengan huruf besar.',
      suggestion: firstLetter[0].toUpperCase(),
    }))
  }
  // After period/!/?, expect uppercase
  const re = /[.!?]\s+([a-z])/g
  let m
  while ((m = re.exec(text)) !== null) {
    const letterIdx = m.index + m[0].length - 1
    out.push(makeFinding({
      id: 'cap-sentence',
      type: 'punctuation',
      severity: HIGH,
      start: letterIdx, end: letterIdx + 1, text,
      message: 'Mulakan setiap ayat dengan huruf besar.',
      suggestion: m[1].toUpperCase(),
    }))
  }
  return out
}

function detectSpacingMs(text) {
  const out = []
  // Multiple spaces
  const reMulti = /  +/g
  let m
  while ((m = reMulti.exec(text)) !== null) {
    out.push(makeFinding({
      id: 'spacing-multi',
      type: 'punctuation',
      severity: LOW,
      start: m.index, end: m.index + m[0].length, text,
      message: 'Beberapa ruang berturut-turut.',
      suggestion: ' ',
    }))
  }
  // Space before . , ; : ! ?
  const rePre = / +([,.;:!?])/g
  while ((m = rePre.exec(text)) !== null) {
    out.push(makeFinding({
      id: 'spacing-before-punct',
      type: 'punctuation',
      severity: MED,
      start: m.index, end: m.index + m[0].length, text,
      message: `Jangan letak ruang sebelum "${m[1]}".`,
      suggestion: m[1],
    }))
  }
  // Missing space after . , ; :
  const rePost = /([.,;:!?])([A-Za-z])/g
  while ((m = rePost.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 4), m.index + 1).toLowerCase()
    if (/(?:e\.g|i\.e|etc|tn|pn|dr|sk|smk|no)\.$/.test(before)) continue
    if (/^\d/.test(text[m.index - 1] || '')) continue
    out.push(makeFinding({
      id: 'spacing-after-punct',
      type: 'punctuation',
      severity: HIGH,
      start: m.index, end: m.index + m[0].length, text,
      message: `Tambah ruang selepas "${m[1]}".`,
      suggestion: m[1] + ' ' + m[2],
    }))
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// 7. Run-on / fragment heuristics
// ────────────────────────────────────────────────────────────────────

function detectRunOnsMs(text, sentenceSpans) {
  const out = []
  for (const s of sentenceSpans) {
    const wordCount = s.text.trim().split(/\s+/).filter(Boolean).length
    if (wordCount >= 45) {
      out.push(makeFinding({
        id: 'sentence-too-long',
        type: 'style',
        severity: MED,
        start: s.start, end: s.end, text,
        message: `Ayat ini ${wordCount} perkataan. Pertimbangkan untuk memecahkannya.`,
        suggestion: null,
      }))
    } else if (wordCount >= 35) {
      out.push(makeFinding({
        id: 'sentence-long',
        type: 'style',
        severity: LOW,
        start: s.start, end: s.end, text,
        message: `Ayat panjang (${wordCount} perkataan). Periksa struktur agar terkawal.`,
        suggestion: null,
      }))
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// 8. Penanda wacana misuse — flags conclusion markers used too early
// ────────────────────────────────────────────────────────────────────

const CLOSING_MARKERS = [
  'kesimpulannya', 'sebagai penutup', 'akhir kata', 'akhir sekali',
  'akhirnya saya', 'pada akhirnya',
]

function detectClosingMarkersTooEarly(text) {
  const out = []
  // If a closing marker appears in the first 50% of the text, flag it.
  const halfway = text.length / 2
  for (const c of CLOSING_MARKERS) {
    const re = new RegExp('\\b' + c.replace(/ /g, '\\s+') + '\\b', 'gi')
    let m
    while ((m = re.exec(text)) !== null) {
      if (m.index < halfway) {
        out.push(makeFinding({
          id: 'closing-too-early',
          type: 'style',
          severity: MED,
          start: m.index, end: m.index + m[0].length, text,
          message: `"${m[0]}" biasanya digunakan dalam perenggan penutup. Pindahkan ke perenggan akhir.`,
          suggestion: null,
        }))
      }
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// 9. Tense-marker conflicts (sudah/akan/sedang/telah)
// ────────────────────────────────────────────────────────────────────

const TENSE_FIXES = [
  { re: /\bakan\s+sudah\b/gi,            fix: null,
    msg: '"akan sudah" — penanda masa bercanggah. Pilih satu sahaja.' },
  { re: /\btelah\s+akan\b/gi,            fix: null,
    msg: '"telah akan" — penanda masa bercanggah.' },
  { re: /\bsudah\s+akan\b/gi,            fix: null,
    msg: '"sudah akan" — bercanggah. Pilih "sudah" atau "akan".' },
  { re: /\bsedang\s+sudah\b/gi,          fix: null,
    msg: '"sedang sudah" — bercanggah. Pilih satu sahaja.' },
  { re: /\bsudah\s+sedang\b/gi,          fix: null,
    msg: '"sudah sedang" — bercanggah.' },
  { re: /\btelah\s+sudah\b/gi,           fix: 'telah',
    msg: '"telah sudah" — kedua-duanya bermaksud sudah. Pilih satu.' },
]

function detectTenseConflictsMs(text) {
  const out = []
  for (const r of TENSE_FIXES) {
    let m
    while ((m = r.re.exec(text)) !== null) {
      out.push(makeFinding({
        id: 'tense-conflict',
        type: 'grammar',
        severity: HIGH,
        start: m.index, end: m.index + m[0].length, text,
        message: r.msg,
        suggestion: r.fix,
      }))
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// 10. Weak / vague words + cliches (style)
// ────────────────────────────────────────────────────────────────────

const MS_WEAK_WORDS = [
  { word: 'benda',          msg: '"Benda" terlalu umum — namakan apa yang dimaksudkan.' },
  { word: 'orang itu',      msg: 'Lebih jelas — siapakah orang itu? Berikan nama atau peranan.' },
  { word: 'sangat sangat',  msg: 'Pengulangan tidak membantu. Pilih kata penekan yang lain (amat, teramat, betul-betul).' },
  { word: 'banyak banyak',  msg: 'Pengulangan informal. Gunakan "banyak" sahaja atau "amat banyak".' },
  { word: 'sesuatu',        msg: '"Sesuatu" kabur — namakan jika boleh.' },
]

const MS_CLICHES = [
  'pada zaman globalisasi ini',
  'pada era yang semakin mencabar',
  'tepuk dada tanya selera',
  'bagai aur dengan tebing',
  'bersatu teguh bercerai roboh',
  'umpama menarik rambut dari tepung',
]

function detectStyleNudgesMs(text) {
  const out = []
  for (const w of MS_WEAK_WORDS) {
    const escaped = w.word.replace(/ /g, '\\s+')
    const re = new RegExp('\\b' + escaped + '\\b', 'gi')
    let m
    while ((m = re.exec(text)) !== null) {
      out.push(makeFinding({
        id: 'weak-word-ms',
        type: 'style',
        severity: LOW,
        start: m.index, end: m.index + m[0].length, text,
        message: w.msg,
        suggestion: null,
      }))
    }
  }
  for (const c of MS_CLICHES) {
    const escaped = c.replace(/ /g, '\\s+').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp('\\b' + escaped + '\\b', 'gi')
    let m
    while ((m = re.exec(text)) !== null) {
      out.push(makeFinding({
        id: 'cliche-ms',
        type: 'style',
        severity: LOW,
        start: m.index, end: m.index + m[0].length, text,
        message: `"${c}" sudah lapuk — pemeriksa perasan. Cuba ungkapan yang lebih segar.`,
        suggestion: null,
      }))
    }
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

export function findIssuesMalay(text, { formatId = null } = {}) {
  if (!text || text.trim().length === 0) return []
  const sentenceSpans = splitSentenceSpans(text)
  const findings = []

  pushAll(findings, detectMalaySpelling(text))
  pushAll(findings, detectImbuhanErrors(text))
  pushAll(findings, detectPassiveDiSpacing(text))
  pushAll(findings, detectPrepositionErrorsMs(text))
  pushAll(findings, detectCohesionMs(text))
  pushAll(findings, detectSlangFormal(text, formatId))
  pushAll(findings, detectEnglishLoanwords(text))
  pushAll(findings, detectRepeatedWordsMs(text))
  pushAll(findings, detectCapitalizationMs(text))
  pushAll(findings, detectSpacingMs(text))
  pushAll(findings, detectRunOnsMs(text, sentenceSpans))
  pushAll(findings, detectClosingMarkersTooEarly(text))
  pushAll(findings, detectTenseConflictsMs(text))
  pushAll(findings, detectStyleNudgesMs(text))

  findings.sort((a, b) => a.start - b.start || a.end - b.end)

  // Deduplicate exact-overlap findings of the same id
  const seen = new Set()
  const deduped = []
  for (const f of findings) {
    const key = `${f.type}:${f.start}:${f.end}:${f.id}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(f)
  }
  return deduped
}

export function summariseIssuesMalay(findings) {
  const counts = { high: 0, medium: 0, low: 0, total: findings.length }
  const byType = {}
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1
    byType[f.type] = (byType[f.type] || 0) + 1
  }
  return { counts, byType }
}

export const ERROR_TYPES_MS = ['spelling', 'grammar', 'punctuation', 'style']
