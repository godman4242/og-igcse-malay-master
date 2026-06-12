// GOLD SET — Malay writing feedback eval.
//
// 12 synthetic IGCSE-Malay learner essays, each with a HAND-PLANTED, catalogued
// error list = the ground truth. Synthetic + planted (not scraped + annotated)
// because the eval is only as trustworthy as its labels: authoring the essays
// means we KNOW every error and there is zero annotation ambiguity.
//
// DESIGN — construct-relevant items. Each essay deliberately mixes:
//   • regexExpected: true  — an error the FREE detector (writingErrorsMalay.js)
//     can hit (it's a fixed lookup of specific wrong-forms: mempukul, disekolah,
//     "dari pada", known misspellings, tense-conflict bigrams, formal slang).
//   • regexExpected: false — a SEMANTIC error it structurally cannot hit:
//     a wrong-but-valid imbuhan choice, a missing -kan/-i, a cohesion slip,
//     a comparison dari/daripada, a register word not in the slang table.
// The free-vs-BYOK gap lives almost entirely in the `false` rows — that is the
// number this eval exists to produce.
//
// regexExpected is a PREDICTION; the harness verifies it empirically by running
// findIssuesMalay and recording actual span overlap (the dry run also QA's this
// gold set — an unexpected free finding on a near-perfect essay flags a typo I
// planted by accident).
//
// `intendedBand` (1–6) is the author's design label, used for band-accuracy.
// category enum: imbuhan | tense | spelling | cohesion | preposition | register | word-choice
//
// Every `span` MUST be an exact, unique substring of `text` (span-overlap match).

export const WRITING_GOLD = [
  // ───────────────────────────── WEAK (band 2–3) ─────────────────────────────
  {
    id: 'w-internet',
    level: 'weak',
    format: 'ms-rencana',
    intendedBand: 2,
    text: `Pada zaman ini, internet sangat penting dalam kehidupan kita. Ramai orang guna internet setiap hari untuk pelbagai tujuan. Tapi, internet juga mendatangkan banyak masalah kepada masyarakat. Pelajar dari pada sekolah suka mempakai internet untuk bermain permainan sampai lupa belajar. Saya rasa ibu bapa kena kawal anak mereka supaya tidak ketagih.`,
    errors: [
      { span: 'guna', category: 'imbuhan', correct: 'menggunakan', note: 'Bare root used as a verb; needs meN-…-kan: "menggunakan".', regexExpected: false },
      { span: 'Tapi', category: 'register', correct: 'Namun / Akan tetapi', note: '"Tapi" is colloquial; formal writing uses "Namun" or "Akan tetapi".', regexExpected: false },
      { span: 'dari pada', category: 'preposition', correct: 'daripada', note: '"daripada" is one word.', regexExpected: true },
      { span: 'mempakai', category: 'imbuhan', correct: 'memakai / menggunakan', note: 'meN- + p → the p drops: "memakai".', regexExpected: true },
      { span: 'kena kawal', category: 'register', correct: 'perlu mengawal', note: '"kena" is colloquial; verb needs meN-: "perlu mengawal".', regexExpected: true },
    ],
  },
  {
    id: 'w-kampung',
    level: 'weak',
    format: 'general',
    intendedBand: 2,
    text: `Masa cuti sekolah lepas, saya pergi ke kampung nenek saya. Saya sangat suka pergi sana sebab banyak benda menarik. Kami mempukul buah kelapa dan main air sungai. Nenek saya masak makanan yang sedap-sedap. Saya rasa happy sangat sepanjang berada di sana.`,
    errors: [
      { span: 'Masa cuti', category: 'register', correct: 'Semasa cuti / Pada cuti', note: '"Masa" as a conjunction is colloquial; use "Semasa" or "Pada".', regexExpected: false },
      { span: 'pergi sana', category: 'preposition', correct: 'pergi ke sana', note: 'Missing direction preposition "ke".', regexExpected: false },
      { span: 'sebab', category: 'register', correct: 'kerana', note: '"sebab" is informal; formal writing prefers "kerana".', regexExpected: false },
      { span: 'mempukul', category: 'imbuhan', correct: 'memukul', note: 'meN- + p → p drops: "memukul".', regexExpected: true },
      { span: 'main air', category: 'imbuhan', correct: 'bermain air', note: 'Bare root; needs ber-: "bermain".', regexExpected: false },
      { span: 'happy', category: 'register', correct: 'gembira', note: 'English loanword; use "gembira".', regexExpected: false },
    ],
  },
  {
    id: 'w-letter',
    level: 'weak',
    format: 'ms-surat-rasmi',
    intendedBand: 3,
    text: `Tuan yang dihormati, saya ingin membuat aduan tentang kebersihaan di taman permainan berhampiran rumah saya. Tempat itu sangat kotor dan dipenuhi sampah sarap. Kanak-kanak tak boleh bermain di situ kerana keadaannya bahaya. Selain itu, beberapa alat permainan sudah rosak dan tidak dibaiki. Saya berharap masalah ini dapat di selesaikan dengan segera oleh pihak tuan.`,
    errors: [
      { span: 'kebersihaan', category: 'spelling', correct: 'kebersihan', note: 'Extra vowel — "kebersihan".', regexExpected: true },
      { span: 'tak', category: 'register', correct: 'tidak', note: '"tak" is colloquial; formal writing uses "tidak".', regexExpected: true },
      { span: 'keadaannya bahaya', category: 'imbuhan', correct: 'keadaannya berbahaya', note: 'Needs ber-: "berbahaya" (adjective), not the noun "bahaya".', regexExpected: false },
      { span: 'di selesaikan', category: 'imbuhan', correct: 'diselesaikan', note: 'Passive di- attaches to the verb: "diselesaikan" (one word).', regexExpected: false },
    ],
  },
  {
    id: 'w-socmed',
    level: 'weak',
    format: 'ms-rencana',
    intendedBand: 4,
    text: `Pada masa kini, media sosial menjadi sebahagian daripada kehidupan remaja. Ramai remaja menghabiskan masa mereka di media sosial sehingga mengabaikan pelajaran. Walaupun media sosial mempunyai kebaikan, ia juga membawa kesan buruk. Sebagai contoh, ramai remaja menjadi mangsa buli siber. Oleh kerana itu, kita mesti menggunakan media sosial dengan bijak. Kita juga kena ingat bahawa masa depan kita lebih penting dari hiburan.`,
    errors: [
      { span: 'Oleh kerana itu', category: 'cohesion', correct: 'Oleh itu / Oleh sebab itu', note: '"Oleh kerana" is redundant; use "Oleh itu".', regexExpected: false },
      { span: 'kena ingat', category: 'register', correct: 'perlu ingat / mesti ingat', note: '"kena" is colloquial.', regexExpected: true },
      { span: 'dari hiburan', category: 'preposition', correct: 'daripada hiburan', note: 'Comparison ("lebih penting…") takes "daripada".', regexExpected: false },
    ],
  },
  // ───────────────────────────── MID (band 4–5) ─────────────────────────────
  {
    id: 'm-health',
    level: 'mid',
    format: 'ms-rencana',
    intendedBand: 4,
    text: `Kesihatan merupakan aset yang paling berharga dalam kehidupan kita. Untuk mengekalkan kesihatan, kita perlu mengamal pemakanan yang seimbang dan bersenam secara kerap. Tambahan pula, kita juga perlu tidur yang cukup setiap malam. Walau bagaimanapun, ramai orang masih mengabai kepentingan kesihatan kerana terlalu sibuk. Mereka kena sedar bahawa mencegah adalah lebih baik dari mengubati penyakit.`,
    errors: [
      { span: 'mengamal pemakanan', category: 'imbuhan', correct: 'mengamalkan pemakanan', note: 'Transitive verb needs -kan: "mengamalkan".', regexExpected: false },
      { span: 'mengabai', category: 'imbuhan', correct: 'mengabaikan', note: 'Transitive verb needs -kan: "mengabaikan".', regexExpected: false },
      { span: 'kena sedar', category: 'register', correct: 'perlu sedar', note: '"kena" is colloquial.', regexExpected: true },
      { span: 'dari mengubati', category: 'preposition', correct: 'daripada mengubati', note: 'Comparison takes "daripada".', regexExpected: false },
    ],
  },
  {
    id: 'm-rain',
    level: 'mid',
    format: 'general',
    intendedBand: 4,
    text: `Pada suatu petang, langit tiba-tiba menjadi gelap dan hujan turun dengan lebat. Saya yang sedang berada di sekolah terpaksa menunggu didalam kantin. Sambil menunggu, saya nampak ramai pelajar lain yang juga terperangkap. Selepas hampir sejam, hujan pun reda. Saya bergegas pulang kerana takut ibu saya risau, sebab badan saya sudah basah kuyup.`,
    errors: [
      { span: 'didalam', category: 'preposition', correct: 'di dalam', note: '"di" as a preposition is a separate word.', regexExpected: true },
      { span: 'saya nampak', category: 'register', correct: 'saya ternampak / saya melihat', note: '"nampak" is colloquial; use "ternampak" or "melihat".', regexExpected: false },
      { span: 'sebab badan', category: 'register', correct: 'kerana badan', note: '"sebab" is informal; use "kerana".', regexExpected: false },
    ],
  },
  {
    id: 'm-technology',
    level: 'mid',
    format: 'ms-rencana',
    intendedBand: 5,
    text: `Perkembangan teknologi pada hari ini telah mengubah cara hidup manusia secara mendadak. Pelbagai urusan harian kini dapat diselesaikan dengan hanya menggunakan telefon pintar. Walaupun teknologi memberikan banyak kemudahan, kita tidak seharusnya bergantung sepenuhnya kepadanya. Hal ini kerana penggunaan teknologi yang berlebihan boleh menjejas kesihatan mental. Oleh itu, kita haruslah menggunakan teknologi secara bijak supaya hidup kita menjadi lebih bermakna dan seimbang.`,
    errors: [
      { span: 'secara mendadak', category: 'word-choice', correct: 'secara drastik / secara menyeluruh', note: '"mendadak" (abrupt) is the wrong nuance for gradual change; use "drastik".', regexExpected: false },
      { span: 'menjejas kesihatan', category: 'imbuhan', correct: 'menjejaskan kesihatan', note: 'Transitive verb needs -kan: "menjejaskan".', regexExpected: false },
    ],
  },
  {
    id: 'm-reading',
    level: 'mid',
    format: 'general',
    intendedBand: 4,
    text: `Membaca merupakan satu tabiat yang sangat berfaedah. Melalui pembacaan, kita dapat menambah ilmu pengetahuan dan memperluaskan pemikiran kita. Tambahan pula, membaca juga dapat menghilangkan tekanan selepas seharian belajar. Malangnya, ramai pelajar pada zaman ini lebih suka melayari internet dari pada membaca buku. Mereka sepatutnya sedar bahawa buku ialah gudang ilmu yang tidak ternilai. Oleh itu, marilah kita menjadikkan membaca sebagai amalan harian.`,
    errors: [
      { span: 'memperluaskan', category: 'imbuhan', correct: 'meluaskan / memperluas', note: 'Over-affixed; "meluaskan" or "memperluas", not both per- and -kan.', regexExpected: false },
      { span: 'dari pada membaca', category: 'preposition', correct: 'daripada membaca', note: '"daripada" is one word.', regexExpected: true },
      { span: 'menjadikkan', category: 'spelling', correct: 'menjadikan', note: 'Doubled k — "menjadikan".', regexExpected: true },
    ],
  },
  // ───────────────────────────── STRONG (band 5–6) ─────────────────────────────
  {
    id: 's-environment',
    level: 'strong',
    format: 'ms-rencana',
    intendedBand: 6,
    text: `Pencemaran alam sekitar merupakan isu global yang semakin membimbangkan pada masa kini. Aktiviti manusia seperti pembalakan haram dan pembuangan sisa toksik telah memusnah keseimbangan ekosistem. Sekiranya keadaan ini dibiarkan berterusan, generasi akan datang pasti akan menerima padahnya. Oleh hal yang demikian, setiap individu perlu memainkan peranan dalam memelihara dan memulihara alam sekitar. Usaha sebegini bukan sahaja menjamin kelestarian alam, malah turut menjamin masa depan yang lebih cerah buat semua.`,
    errors: [
      { span: 'memusnah keseimbangan', category: 'imbuhan', correct: 'memusnahkan keseimbangan', note: 'Transitive verb needs -kan: "memusnahkan".', regexExpected: false },
      { span: 'buat semua', category: 'register', correct: 'untuk semua', note: '"buat" (= for) is colloquial here; use "untuk".', regexExpected: false },
    ],
  },
  {
    id: 's-discipline',
    level: 'strong',
    format: 'ms-rencana',
    intendedBand: 5,
    text: `Disiplin merupakan tunjang kepada kejayaan seseorang pelajar. Pelajar yang berdisiplin akan sentiasa menepati masa dan menyiapkan tugasan yang diberikan. Sebaliknya, pelajar yang tidak berdisiplin selalunya ketinggalan dalam pelajaran. Walau bagaimanapun, sikap berdisiplin ini perlu di pupuk sejak kecil lagi. Ibu bapa dan guru memainkan peranan yang amat penting dalam membentuk sahsiah pelajar supaya mereka menjadi insan yang berguna dari masyarakat.`,
    errors: [
      { span: 'di pupuk', category: 'imbuhan', correct: 'dipupuk', note: 'Passive di- attaches to the verb: "dipupuk" (one word).', regexExpected: false },
      { span: 'berguna dari masyarakat', category: 'preposition', correct: 'berguna kepada masyarakat', note: 'Wrong preposition; "berguna kepada/bagi", not "dari".', regexExpected: false },
    ],
  },
  {
    id: 's-narrative',
    level: 'strong',
    format: 'general',
    intendedBand: 6,
    text: `Malam itu, suasana di kampung halaman terasa begitu damai dan tenteram. Bulan mengambang penuh, menyinar hamparan sawah yang terbentang luas. Aku duduk di anjung rumah sambil menikmati hembusan angin yang sepoi-sepoi bahasa. Tiba-tiba, kedengaran suara serunai dari kejauhan, mengusik memori silam yang telah lama terkubur. Aku tersenyum sendirian, mensyukuri nikmat ketenangan yang sukar ditemui di kota raya.`,
    errors: [
      { span: 'menyinar hamparan', category: 'imbuhan', correct: 'menyinari hamparan', note: 'Transitive (to light up sth) needs -i: "menyinari".', regexExpected: false },
    ],
  },
  {
    id: 's-perfect',
    level: 'strong',
    format: 'ms-rencana',
    intendedBand: 6,
    // ZERO planted errors — a pure false-positive control. Any flag from EITHER
    // tier is, by construction, a false positive (or an accidental real error
    // the dry run will surface for me to fix).
    text: `Sikap suka membantu antara satu sama lain merupakan nilai murni yang perlu dipupuk dalam kalangan masyarakat. Apabila setiap individu sanggup menghulurkan bantuan kepada orang yang memerlukan, sesebuah masyarakat akan menjadi lebih harmoni dan bersatu padu. Semangat kerjasama ini bukan sahaja meringankan beban golongan yang susah, malah turut mengeratkan hubungan silaturahim. Oleh itu, marilah kita menyemai sikap mulia ini sejak di bangku sekolah agar ia menjadi amalan sepanjang hayat.`,
    errors: [],
  },
]
