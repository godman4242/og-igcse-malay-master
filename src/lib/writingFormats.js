// Lightweight format catalogue split out of writingGrader.js so pages that
// only need the format list (Dashboard, MistakeJournal) don't drag in the
// full grader (regex banks, error finders, ~700 lines). Writing.jsx still
// imports from writingGrader, which re-exports these for back-compat.

export const FORMATS = [
  // ── English ──
  {
    id: 'eng-letter-formal', label: 'Formal Letter', lang: 'eng',
    minWords: 200, maxWords: 350,
    markers: ['Dear Sir', 'Dear Madam', 'Yours faithfully', 'Yours sincerely', 'I am writing to', 'I look forward to'],
    requiredHints: ['Sender address (top)', 'Recipient address', 'Subject line', 'Formal greeting', 'Body paragraphs', 'Formal closing + signature'],
  },
  {
    id: 'eng-letter-informal', label: 'Informal Letter', lang: 'eng',
    minWords: 150, maxWords: 300,
    markers: ['Dear ', 'Hope you', 'How are you', 'Take care', 'Lots of love', 'Best wishes', 'Looking forward to hearing'],
    requiredHints: ['Greeting', 'Opening question / catch-up', 'Body', 'Sign-off'],
  },
  {
    id: 'eng-email', label: 'Email', lang: 'eng',
    minWords: 100, maxWords: 250,
    markers: ['Subject:', 'Hi ', 'Hello ', 'Dear ', 'Best regards', 'Kind regards', 'Thanks,', 'Thank you,'],
    requiredHints: ['Subject line', 'Greeting', 'Body', 'Sign-off'],
  },
  {
    id: 'eng-article', label: 'Article', lang: 'eng',
    minWords: 250, maxWords: 400,
    markers: ['Imagine', 'Have you ever', 'In recent years', 'It is widely known', 'In conclusion', 'To sum up'],
    requiredHints: ['Catchy title', 'Hook intro', 'Body with evidence', 'Conclusion'],
  },
  {
    id: 'eng-speech', label: 'Speech', lang: 'eng',
    minWords: 250, maxWords: 400,
    markers: ['Ladies and gentlemen', 'Good morning', 'Good afternoon', 'My fellow', 'Thank you for', 'In closing'],
    requiredHints: ['Greeting to audience', 'Topic introduction', 'Main points', 'Memorable closing'],
  },
  {
    id: 'eng-report', label: 'Report', lang: 'eng',
    minWords: 200, maxWords: 350,
    markers: ['Introduction', 'Findings', 'Recommendations', 'Conclusion', 'It was observed', 'According to'],
    requiredHints: ['Title', 'Headed sections', 'Evidence', 'Recommendations'],
  },
  {
    id: 'eng-narrative', label: 'Narrative / Story', lang: 'eng',
    minWords: 250, maxWords: 400,
    markers: ['Suddenly', 'I will never forget', 'It was a', 'The moment', 'My heart raced', 'I realised'],
    requiredHints: ['Setting', 'Rising action', 'Climax', 'Resolution', 'Reflection'],
  },
  {
    id: 'eng-descriptive', label: 'Descriptive', lang: 'eng',
    minWords: 250, maxWords: 400,
    markers: ['I could see', 'The air was', 'In the distance', 'A faint', 'Beneath', 'Above', 'Surrounded by'],
    requiredHints: ['Sensory imagery', 'Specific nouns', 'Atmosphere', 'No plot required'],
  },
  {
    id: 'eng-discursive', label: 'Discursive / Argumentative', lang: 'eng',
    minWords: 250, maxWords: 400,
    markers: ['On the one hand', 'On the other hand', 'However', 'Nevertheless', 'In my opinion', 'It can be argued'],
    requiredHints: ['Thesis', 'Arguments for', 'Arguments against', 'Conclusion / opinion'],
  },
  {
    id: 'eng-directed', label: 'Directed Writing', lang: 'eng',
    minWords: 150, maxWords: 250,
    markers: ['Dear ', 'Subject:', 'I am writing', 'According to'],
    requiredHints: ['Match the directed format (letter / email / report)', 'Use given prompts'],
  },
  {
    id: 'eng-review', label: 'Review', lang: 'eng',
    minWords: 200, maxWords: 350,
    markers: ['I would recommend', 'I would not recommend', 'overall', 'rating', 'the plot', 'the characters', 'the highlight', 'in summary', 'must-see', 'worth'],
    requiredHints: ['Title + brief context (what is being reviewed)', 'Summary without major spoilers', 'Strengths with examples', 'Weaknesses with examples', 'Verdict / recommendation'],
  },
  {
    id: 'eng-interview', label: 'Interview Transcript', lang: 'eng',
    minWords: 200, maxWords: 350,
    markers: ['Interviewer:', 'Q:', 'A:', 'Could you tell us', 'What do you think', 'How did you', 'Thank you for'],
    requiredHints: ['Brief intro of interviewee', 'Q & A turns', 'Open questions (not yes/no only)', 'Closing thank-you'],
  },
  {
    id: 'eng-diary', label: 'Diary / Journal Entry', lang: 'eng',
    minWords: 150, maxWords: 300,
    markers: ['Dear Diary', 'Today', 'Tonight', 'I cannot believe', 'I felt', 'I wonder', 'tomorrow'],
    requiredHints: ['Date heading', 'Personal voice / first person', 'Reflection on feelings', 'Looking forward / backward'],
  },

  // ── Malay ──
  //
  // ⚠ WORD TARGETS FOR THE FIVE 0546 PAPER 4 TASK TYPES ARE FIXED BY THE SYLLABUS.
  // Cambridge IGCSE Malay 0546 syllabus for 2025–2027, Paper 4 (Writing), p.24:
  //   Q2 — "Candidates complete a directed writing task in about 80–90 words on a
  //         familiar, everyday topic."  (12 marks)
  //   Q3 — "Candidates choose between two tasks (an email/letter and an article/blog)
  //         and complete one of these in about 130–140 words."  (28 marks)
  // https://www.cambridgeinternational.org/Images/664637-2025-2027-syllabus.pdf
  //
  // These five formats previously demanded 150–250 words (and 250–350 for an
  // article) — i.e. ABOVE Cambridge's MAXIMUM for the longest Malay task, roughly
  // double the real ask. minWords drives both the content sub-band
  // (writingGrader.js) and the on-screen advice "Kembangkan kepada N+ perkataan",
  // so the app was marking a correctly-sized answer down AND coaching students to
  // write the wrong length for their exam. Measured in Gauntlet lane L0: a script
  // the examiner awarded 30/30 is 133 words. See docs/gauntlet/L0/README.md.
  //
  // The other nine Malay formats below are NOT 0546 Paper 4 task types (they are
  // general/SPM composition genres), so no syllabus authority covers them and they
  // are deliberately left unchanged.
  {
    id: 'ms-surat-rasmi', label: 'Surat Rasmi (Formal Letter)', lang: 'malay',
    minWords: 130, maxWords: 140, // 0546 Q3 "an email/letter … about 130–140 words"
    markers: ['Dengan hormatnya', 'Merujuk perkara', 'Sehubungan dengan itu', 'Yang benar', 'Sekian, terima kasih', 'Tuan/Puan'],
    requiredHints: ['Alamat pengirim', 'Tarikh', 'Alamat penerima', 'Perkara', 'Salam hormat', 'Penutup'],
  },
  {
    id: 'ms-surat-tidak-rasmi', label: 'Surat Tidak Rasmi (Informal Letter)', lang: 'malay',
    minWords: 130, maxWords: 140, // 0546 Q3 "an email/letter … about 130–140 words"
    markers: ['kekanda', 'adinda', 'sahabat', 'Apa khabar', 'Salam sayang', 'rindu', 'Setakat ini'],
    requiredHints: ['Alamat ringkas', 'Salam mesra', 'Isi peribadi', 'Penutup mesra'],
  },
  {
    id: 'ms-email', label: 'E-mel', lang: 'malay',
    minWords: 130, maxWords: 140, // 0546 Q3 "an email/letter … about 130–140 words"
    markers: ['Daripada:', 'Kepada:', 'Subjek:', 'Tarikh:', 'Sekian, terima kasih', 'Yang benar'],
    requiredHints: ['Header', 'Salam', 'Isi', 'Penutup'],
  },
  {
    id: 'ms-rencana', label: 'Rencana / Artikel', lang: 'malay',
    minWords: 130, maxWords: 140, // 0546 Q3 "an article/blog … about 130–140 words"
    markers: ['Pertamanya', 'Selain itu', 'Tambahan pula', 'Justeru', 'Akhir sekali', 'Kesimpulannya'],
    requiredHints: ['Tajuk', 'Pendahuluan', 'Isi 1/2/3', 'Penutup'],
  },
  {
    id: 'ms-cerita', label: 'Cerita / Naratif', lang: 'malay',
    minWords: 250, maxWords: 400,
    markers: ['Pada suatu hari', 'Tiba-tiba', 'Tanpa disedari', 'Akhirnya', 'Setelah itu', 'Peristiwa itu'],
    requiredHints: ['Pengenalan', 'Perkembangan', 'Klimaks', 'Peleraian', 'Pengajaran'],
  },
  {
    id: 'ms-ucapan', label: 'Ucapan / Syarahan', lang: 'malay',
    minWords: 250, maxWords: 350,
    markers: ['Yang Berusaha', 'Hadirin yang dihormati', 'Pertama sekali', 'Seterusnya', 'Sebagai penutup', 'Sekian, terima kasih'],
    requiredHints: ['Salam', 'Pengenalan topik', 'Isi-isi', 'Penutup'],
  },
  {
    id: 'ms-laporan', label: 'Laporan', lang: 'malay',
    minWords: 200, maxWords: 350,
    markers: ['Disediakan oleh', 'Tarikh:', 'Pendahuluan', 'Pelaksanaan', 'Cadangan', 'Penutup'],
    requiredHints: ['Tajuk', 'Pengenalan', 'Pelaksanaan', 'Cadangan', 'Disediakan oleh'],
  },
  {
    id: 'ms-dialog', label: 'Dialog / Perbualan', lang: 'malay',
    minWords: 200, maxWords: 350,
    markers: ['",', '" tanya', '" jawab', '" katanya'],
    requiredHints: ['Watak jelas', 'Tanda petik', 'Aliran perbualan'],
  },
  {
    id: 'ms-fakta', label: 'Karangan Fakta', lang: 'malay',
    minWords: 250, maxWords: 350,
    markers: ['Menurut kajian', 'Statistik menunjukkan', 'Fakta', 'Berdasarkan', 'Hal ini kerana'],
    requiredHints: ['Pendahuluan dengan fakta', 'Isi disokong fakta', 'Penutup'],
  },
  {
    id: 'ms-keperihalan', label: 'Karangan Keperihalan', lang: 'malay',
    minWords: 250, maxWords: 350,
    markers: ['suasana', 'pemandangan', 'menghirup', 'nyaman', 'redup', 'memerhatikan'],
    requiredHints: ['Imej deria', 'Atmosfera', 'Tiada plot perlu'],
  },
  {
    id: 'ms-directed', label: 'Karangan Berpandu', lang: 'malay',
    minWords: 80, maxWords: 90, // 0546 Q2 "a directed writing task in about 80–90 words"
    markers: ['Dengan hormatnya', 'Berdasarkan', 'Saya'],
    requiredHints: ['Ikut format yang diberi', 'Gunakan semua isi panduan'],
  },
  {
    id: 'ms-wawancara', label: 'Wawancara / Temu Bual', lang: 'malay',
    minWords: 200, maxWords: 350,
    markers: ['Wartawan:', 'Pewawancara:', 'Soalan:', 'Jawapan:', 'Bolehkah encik', 'Bolehkah puan', 'Apakah pendapat', 'Bagaimanakah', 'Terima kasih kerana'],
    requiredHints: ['Pengenalan ringkas tentang yang ditemu bual', 'Giliran soal-jawab', 'Soalan terbuka', 'Penutup ucapan terima kasih'],
  },
  {
    id: 'ms-berita', label: 'Berita / Laporan Akhbar', lang: 'malay',
    minWords: 200, maxWords: 350,
    markers: ['Kuala Lumpur,', 'Petaling Jaya,', '— Semalam', '— Hari ini', 'menurut sumber', 'berkata', 'menambah', 'menegaskan'],
    requiredHints: ['Tajuk berita', 'Lead (tempat, tarikh, peristiwa)', 'Isi 5W1H', 'Petikan sumber rasmi', 'Penutup'],
  },
  {
    id: 'ms-autobiografi', label: 'Autobiografi', lang: 'malay',
    minWords: 250, maxWords: 350,
    markers: ['Saya dilahirkan', 'pada tahun', 'Sejak kecil', 'Pengalaman yang', 'Cita-cita saya', 'Kini saya', 'Saya bersyukur'],
    requiredHints: ['Latar belakang (kelahiran, keluarga)', 'Pendidikan', 'Pengalaman bermakna', 'Cita-cita / aspirasi', 'Penutup reflektif'],
  },
]

export const FORMATS_BY_ID = Object.fromEntries(FORMATS.map(f => [f.id, f]))

export function listFormats(lang) {
  return FORMATS.filter(f => !lang || f.lang === lang)
}
