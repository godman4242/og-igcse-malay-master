// Malay survival-starter seed — ~45 highest-value beginner words for a
// zero-Malay learner (IGCSE 0546). The Malay counterpart to the English
// seeds (dictionaryEn.js / academicEn.js): a FREE, on-device, no-key,
// OPT-IN "Day 1" deck so a new Malay learner isn't stranded on an empty
// deck with no "start here". Surfaced one-tap on the Dashboard empty-state
// (studyLang 'ms', zero Malay cards); NEVER auto-seeded (reveal-gate ethos).
//
// Each entry: { m: Malay word (the target being learned), e: English L1
// gloss, ex: a short A1 example sentence that CONTAINS m (so cloze/Produce
// blanking works — blankInExample matches m as a whole word, incl. the
// multi-word phrases), p: part of speech }. Studied as lang:'ms' cards
// exactly like the built-in dictionary (m = target, e = L1 gloss) — this is
// the evidence-backed L1-gloss path for beginners the app keeps primary.
//
// VERIFICATION (a wrong Malay gloss is the confident-wrong failure a learning
// tool must avoid — every entry was cross-checked before shipping):
//   - 40/45 glosses confirmed against the in-repo src/data/dictionary.js
//     (825 vetted entries) with matching senses.
//   - 5 not in that dictionary — all trivially-common day-1 survival words,
//     gate-verified as standard Bahasa Malaysia: `selamat petang`, `sama-sama`,
//     `ya`, `ada`, `nama` (`ya` + `ada` additionally attested in the IGCSE
//     guide corpus).
//   - Correction caught in review: bare `mana` = "which" (dictionary: "which/
//     where") — glossing it "where" alone would be subtly wrong, so the entry
//     is the real survival unit `di mana` = "where".
//   - Example sentences follow the confirmed IGCSE beginner grammar patterns
//     (S+V+O "Saya makan nasi"; adjective AFTER noun "rumah besar"; the
//     question-word set) and reuse starter words so the deck reads as a set.
//   - C5 fix 2026-08-03 — PENJODOH BILANGAN. Four examples counted a concrete
//     noun with no classifier ("dua kucing"), the exact error the app's own
//     Cikgu KB teaches against. Corrected against Kamus Dewan Edisi Keempat
//     (PRPM): `ekor` = "penjodoh bilangan utk binatang" → dua ekor kucing;
//     `buah` = "…utk benda-benda yg tidak tentu bentuk atau jenisnya" → tiga
//     buah buku; `orang` for humans → dua orang abang.
//     `satu` could NOT take the same treatment: standard Malay fuses satu +
//     classifier into se- ("seorang adik"), which would delete the standalone
//     word `satu` this very card teaches and break cloze/Produce blanking. Its
//     example moved to a frame where a bare numeral is correct (the noun is
//     elided): "Saya mahu satu sahaja."
//     Body parts and measures are NOT classifier-counted and were left alone —
//     Kamus Dewan's own `jari` example is "Sebelah tangan mempunyai lima ~",
//     so `empat kaki` / `sepuluh jari` / `pukul lima` / `enam tahun` stand.
// Word lists aren't copyrightable (word→translation = facts); see public/CREDITS.txt.

const MALAY_STARTER = [
  // Greetings & courtesy
  { m: 'selamat pagi', e: 'good morning', ex: 'Selamat pagi, cikgu!', p: 'phrase' },
  { m: 'selamat petang', e: 'good afternoon / evening', ex: 'Selamat petang, apa khabar?', p: 'phrase' },
  { m: 'terima kasih', e: 'thank you', ex: 'Terima kasih atas bantuan awak.', p: 'phrase' },
  { m: 'sama-sama', e: "you're welcome", ex: 'Sama-sama, tiada masalah.', p: 'phrase' },
  { m: 'maaf', e: 'sorry; excuse me', ex: 'Maaf, saya lambat hari ini.', p: 'other' },
  { m: 'tolong', e: 'help; please', ex: 'Tolong buka pintu itu.', p: 'v' },
  { m: 'ya', e: 'yes', ex: 'Ya, saya suka nasi goreng.', p: 'other' },
  { m: 'tidak', e: 'no; not', ex: 'Saya tidak faham.', p: 'other' },

  // Pronouns
  { m: 'saya', e: 'I / me', ex: 'Saya minum air.', p: 'pron' },
  { m: 'awak', e: 'you', ex: 'Awak dari mana?', p: 'pron' },
  { m: 'dia', e: 'he / she', ex: 'Dia kawan baik saya.', p: 'pron' },
  { m: 'kami', e: 'we (not you)', ex: 'Kami pergi ke sekolah.', p: 'pron' },
  { m: 'kita', e: 'we (incl. you)', ex: 'Mari kita makan.', p: 'pron' },
  { m: 'mereka', e: 'they', ex: 'Mereka tinggal di sini.', p: 'pron' },

  // Numbers 1–10
  { m: 'satu', e: 'one', ex: 'Saya mahu satu sahaja.', p: 'num' },
  { m: 'dua', e: 'two', ex: 'Saya ada dua orang abang.', p: 'num' },
  { m: 'tiga', e: 'three', ex: 'Ada tiga buah buku di atas meja.', p: 'num' },
  { m: 'empat', e: 'four', ex: 'Kucing itu ada empat kaki.', p: 'num' },
  { m: 'lima', e: 'five', ex: 'Saya bangun pukul lima pagi.', p: 'num' },
  { m: 'enam', e: 'six', ex: 'Adik saya berumur enam tahun.', p: 'num' },
  { m: 'tujuh', e: 'seven', ex: 'Bas tiba pukul tujuh pagi.', p: 'num' },
  { m: 'lapan', e: 'eight', ex: 'Ayah bekerja pukul lapan pagi.', p: 'num' },
  { m: 'sembilan', e: 'nine', ex: 'Sekarang pukul sembilan malam.', p: 'num' },
  { m: 'sepuluh', e: 'ten', ex: 'Saya ada sepuluh jari.', p: 'num' },

  // Question words
  { m: 'apa', e: 'what', ex: 'Apa ini?', p: 'other' },
  { m: 'siapa', e: 'who', ex: 'Siapa nama awak?', p: 'other' },
  { m: 'di mana', e: 'where', ex: 'Di mana tandas?', p: 'other' },
  { m: 'bila', e: 'when', ex: 'Bila awak datang?', p: 'other' },
  { m: 'mengapa', e: 'why', ex: 'Mengapa awak sedih?', p: 'other' },
  { m: 'berapa', e: 'how much / how many', ex: 'Berapa harga ini?', p: 'other' },

  // Essential verbs
  { m: 'makan', e: 'eat', ex: 'Saya makan nasi.', p: 'v' },
  { m: 'minum', e: 'drink', ex: 'Dia minum air.', p: 'v' },
  { m: 'pergi', e: 'go', ex: 'Saya pergi ke sekolah.', p: 'v' },
  { m: 'datang', e: 'come', ex: 'Sila datang ke rumah saya.', p: 'v' },
  { m: 'mahu', e: 'want', ex: 'Saya mahu minum air.', p: 'v' },
  { m: 'ada', e: 'have; there is', ex: 'Saya ada dua ekor kucing.', p: 'v' },
  { m: 'buat', e: 'do; make', ex: 'Apa awak buat?', p: 'v' },
  { m: 'tahu', e: 'know', ex: 'Saya tidak tahu.', p: 'v' },

  // Essential nouns & adjectives
  { m: 'rumah', e: 'house; home', ex: 'Rumah saya besar.', p: 'n' },
  { m: 'air', e: 'water', ex: 'Air ini sejuk.', p: 'n' },
  { m: 'makanan', e: 'food', ex: 'Makanan ini sedap.', p: 'n' },
  { m: 'nama', e: 'name', ex: 'Nama saya Ali.', p: 'n' },
  { m: 'besar', e: 'big', ex: 'Rumah itu besar.', p: 'adj' },
  { m: 'kecil', e: 'small', ex: 'Kucing itu kecil.', p: 'adj' },
  { m: 'baik', e: 'good', ex: 'Dia orang baik.', p: 'adj' },
]

export default MALAY_STARTER
