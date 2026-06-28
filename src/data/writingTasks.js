// Original, copyright-safe IGCSE-format writing TASKS. Each task pairs a prompt
// (the scenario + instruction a 15–16-year-old learner writes to) with
// `requirements`: the bullet points an examiner marks Content / task-fulfilment
// against — each one checkable from the essay text so a later AI grader can score
// coverage. English 0510 AND Malay 0546 (the Malay block mirrors the English one;
// Malay tasks carry `lang:'malay'` and point at the Malay formats).
//
// Pure data — pinned by writingTasks.test.js. NO real Cambridge past-paper text:
// every prompt below is freshly authored. `formatId` must resolve in FORMATS
// (src/lib/writingFormats.js); the test enforces it.
//
// A Task = { id, lang:'eng'|'malay', formatId, prompt, requirements: string[],
//            hints: string[] (index-aligned to requirements), audience, purpose }.

export const WRITING_TASKS = [
  {
    id: 'eng-article-phone-free-lessons',
    lang: 'eng',
    formatId: 'eng-article',
    prompt:
      'Your school is thinking about banning mobile phones during lessons, and the student magazine has asked for opinions. Write an article giving your views on whether phones should be switched off in class. In your article, explain how phones affect learning and suggest what a fair rule might look like.',
    requirements: [
      'States a clear overall opinion on banning phones during lessons',
      'Gives at least two developed reasons or examples (for and/or against)',
      'Suggests what a fair rule could look like in practice',
      'Engages a student-magazine audience and ends with a clear conclusion',
    ],
    // How-to-fix hints, index-aligned to `requirements` (act-on-feedback loop).
    hints: [
      'Say plainly in your opening whether phones should be banned — do not sit on the fence.',
      'Give two reasons and back each with a concrete example (a lesson where a phone helped or distracted).',
      "Name one specific rule and say when it would and wouldn't apply (e.g. off in lessons, allowed at break).",
      'Use a lively, direct tone for fellow students and finish with a one-line takeaway.',
    ],
    audience: 'students reading the school magazine',
    purpose: 'argue / persuade',
  },
  {
    id: 'eng-letter-formal-bus-complaint',
    lang: 'eng',
    formatId: 'eng-letter-formal',
    prompt:
      'The bus you take to school is often late and overcrowded, and several students have arrived late as a result. Write a formal letter to the manager of the bus company. Describe the problems clearly, explain how they affect students, and request specific improvements.',
    requirements: [
      'Describes the specific problems (lateness, overcrowding) with concrete detail',
      'Explains the impact on students (e.g. arriving late, missing lessons)',
      'Requests at least two specific improvements or actions',
      'Stays polite and formal throughout, suited to a company manager',
    ],
    // How-to-fix hints, index-aligned to `requirements` (act-on-feedback loop).
    hints: [
      "State exactly what goes wrong — give times, the route, or how late/crowded — not just 'the bus is bad'.",
      'Spell out the consequence (late for lessons, missed registration) so the manager sees why it matters.',
      "Ask for two concrete actions (an extra bus, a revised timetable), not a vague 'please fix this'.",
      'Open with Dear Sir/Madam, keep a calm respectful tone, and avoid slang or anger.',
    ],
    audience: 'the manager of the bus company',
    purpose: 'complain / request action',
  },
  {
    id: 'eng-report-canteen-survey',
    lang: 'eng',
    formatId: 'eng-report',
    prompt:
      'Your headteacher has asked you to investigate what students think of the school canteen. You surveyed students and observed the canteen at lunchtime. Write a report for the headteacher presenting your findings and recommending improvements.',
    requirements: [
      'Has a title and uses clear headed sections (e.g. Introduction, Findings, Recommendations)',
      'Presents findings supported by survey or observation evidence',
      'Makes at least two practical recommendations linked to the findings',
      'Uses a factual, formal tone suited to a report for the headteacher',
    ],
    // How-to-fix hints, index-aligned to `requirements` (act-on-feedback loop).
    hints: [
      'Give it a title and use headings such as Introduction, Findings, Recommendations.',
      'Quote your survey/observation (most students said…, at lunch I saw…) — do not just give opinions.',
      'Recommend two changes and tie each to a finding (because queues were long, …).',
      'Write impersonally and factually for the headteacher — no chatty or emotional language.',
    ],
    audience: 'the headteacher',
    purpose: 'inform / recommend',
  },

  // ── Malay 0546 (mirror of the English block; all `lang:'malay'`) ──
  {
    id: 'ms-surat-taman-permainan',
    lang: 'malay',
    formatId: 'ms-surat-rasmi',
    prompt:
      'Taman permainan berhampiran kawasan kediaman anda berada dalam keadaan usang dan berbahaya. Tulis sepucuk surat rasmi kepada Pihak Berkuasa Tempatan untuk menyatakan masalah tersebut, menjelaskan kesannya kepada penduduk, dan mencadangkan langkah penambahbaikan.',
    requirements: [
      'Menyatakan masalah taman permainan dengan butiran yang jelas (contoh: peralatan rosak, kawasan tidak terurus)',
      'Menjelaskan kesan masalah itu kepada penduduk, khususnya kanak-kanak',
      'Mencadangkan sekurang-kurangnya dua langkah penambahbaikan yang konkrit',
      'Mengekalkan format dan nada surat rasmi sepanjang surat (kepada pihak berkuasa)',
    ],
    // Petua membaiki, sejajar indeks dengan `requirements` (gelung bertindak balas).
    hints: [
      "Nyatakan dengan tepat apa yang rosak — buaian patah, lampu tidak menyala, sampah bertimbun — bukan sekadar 'taman itu teruk'.",
      'Terangkan akibatnya: kanak-kanak hilang tempat bermain yang selamat, risiko kemalangan, penduduk hilang ruang riadah.',
      "Minta dua tindakan khusus (membaiki peralatan, jadual penyelenggaraan berkala), bukan rayuan umum 'tolong baiki'.",
      "Mulakan dengan 'Dengan hormatnya', gunakan bahasa formal dan sopan, dan akhiri dengan 'Sekian, terima kasih' serta 'Yang benar'.",
    ],
    audience: 'Pihak Berkuasa Tempatan',
    purpose: 'mengadu / memohon tindakan',
  },
  {
    id: 'ms-laporan-kitar-semula',
    lang: 'malay',
    formatId: 'ms-laporan',
    prompt:
      'Anda ialah setiausaha Kelab Alam Sekitar sekolah. Kelab anda telah menjalankan Program Kitar Semula selama sebulan. Tulis sebuah laporan kepada Pengetua tentang pelaksanaan program itu, hasil yang dicapai, dan cadangan penambahbaikan.',
    requirements: [
      'Mempunyai tajuk dan menggunakan bahagian berperenggan yang jelas (contoh: Pendahuluan, Pelaksanaan, Cadangan)',
      'Menyatakan hasil program yang disokong dengan butiran atau angka (contoh: jumlah bahan dikumpul, penyertaan)',
      'Mengemukakan sekurang-kurangnya dua cadangan penambahbaikan yang dikaitkan dengan hasil',
      'Menggunakan nada formal dan objektif, serta menyatakan penyedia laporan di bahagian penutup',
    ],
    hints: [
      'Beri tajuk laporan dan susun mengikut bahagian: Pendahuluan, Pelaksanaan, Hasil dan Cadangan.',
      "Sertakan bukti: 'sebanyak 120 kg kertas dikumpul', 'seramai 80 orang pelajar menyertai' — bukan kenyataan umum.",
      'Cadangkan dua penambahbaikan dan kaitkan setiap satu dengan hasil (kerana penyertaan rendah pada minggu pertama, …).',
      "Tulis secara formal dan objektif; akhiri dengan 'Disediakan oleh:' diikuti nama dan jawatan penyedia.",
    ],
    audience: 'Pengetua sekolah',
    purpose: 'melapor / mencadangkan',
  },
  {
    id: 'ms-rencana-amalan-membaca',
    lang: 'malay',
    formatId: 'ms-rencana',
    prompt:
      "Majalah sekolah anda sedang menyediakan keluaran tentang gaya hidup remaja. Tulis sebuah rencana bertajuk 'Kepentingan Amalan Membaca dalam Kalangan Remaja'. Dalam rencana itu, jelaskan kepentingan membaca dan cadangkan cara menggalakkan tabiat membaca.",
    requirements: [
      'Mempunyai pendahuluan yang memperkenalkan isu amalan membaca dalam kalangan remaja',
      'Menghuraikan sekurang-kurangnya dua kepentingan membaca dengan contoh atau penjelasan',
      'Mencadangkan cara yang praktikal untuk menggalakkan tabiat membaca',
      'Menggunakan penanda wacana dan mempunyai penutup yang jelas, sesuai untuk pembaca majalah sekolah',
    ],
    hints: [
      'Mulakan dengan pendahuluan yang menarik — statistik, persoalan, atau senario tentang remaja dan membaca.',
      'Huraikan dua kepentingan (menambah ilmu, mengasah daya fikir) dan sokong setiap satu dengan contoh konkrit.',
      "Cadangkan langkah praktikal: program NILAM, sudut bacaan di kelas, atau kempen 'satu murid satu buku'.",
      'Gunakan penanda wacana (selain itu, tambahan pula, kesimpulannya) dan akhiri dengan penutup yang mengajak pembaca bertindak.',
    ],
    audience: 'pembaca majalah sekolah (remaja)',
    purpose: 'menjelaskan / menggalakkan',
  },
]

export function getTask(id) {
  return WRITING_TASKS.find(t => t.id === id) || null
}

export function tasksForFormat(formatId, lang = 'eng') {
  return WRITING_TASKS.filter(t => t.formatId === formatId && t.lang === lang)
}
