/**
 * Canned AI responses for development and testing.
 * Used when VITE_AI_MOCK=true to avoid API costs.
 * Each mock mirrors the exact JSON shape the real AI returns.
 */

export const MOCK_ROLEPLAY_RESPONSE = {
  examinerResponse: 'Baik, saya faham. Memang tidak selesa bila telinga berdesing. Cuba telan air liur atau mengunyah gula-gula. Adakah ini kali pertama anda menaiki kapal terbang?',
  feedback: {
    vocabUsed: ['tidak selesa', 'telinga'],
    vocabMissed: ['berdesing', 'penerbangan'],
    grammarNote: 'Good sentence structure! Try using "saya berasa" instead of "saya rasa" for more formal register.',
    imbuhanUsed: ['menaiki'],
    imbuhanMissed: ['berdesing', 'penerbangan'],
  },
};

export const MOCK_ROLEPLAY_SCORE = {
  overallBand: 4,
  vocabulary: { band: 4, comment: 'Good use of everyday vocabulary. Could expand range with more formal terms.' },
  grammar: { band: 3, comment: 'Basic sentence structures correct. Some imbuhan errors with meN- prefix.' },
  fluency: { band: 4, comment: 'Generally smooth responses. Good use of connectors like "tetapi".' },
  taskCompletion: { band: 4, comment: 'All five turns addressed. Could elaborate more on feelings and opinions.' },
  strengths: [
    'Consistent use of polite register (saya/anda)',
    'Good greeting and closing phrases',
    'Attempted complex sentences with kata hubung',
  ],
  areasToImprove: [
    'Practice meN- prefix: menulis, membaca, menaiki',
    'Use more descriptive adjectives: sangat, amat, begitu',
    'Add opinion phrases: pada pendapat saya, saya rasa',
  ],
  keyPhraseMissed: [
    'telinga berdesing',
    'mengunyah gula-gula',
    'telan air liur',
  ],
  modelAnswerHighlights: [
    'Turn 2: "Telinga saya berdesing dan saya berasa sangat tidak selesa. Bolehkah anda membantu saya?"',
    'Turn 4: "Terima kasih atas nasihat itu. Penerbangan ini akan mengambil masa dua jam lagi."',
  ],
};

export const MOCK_WRITING_RESPONSE = {
  band: 4,
  overall: 'Good effort with clear ideas. Main areas for improvement are imbuhan accuracy and sentence variety. You have a solid foundation to build on.',
  sentences: [
    {
      text: 'Saya suka pergi ke sekolah setiap hari.',
      errors: [],
      suggestions: ['Consider adding "amat" or "sangat" for emphasis'],
      improved: null,
    },
    {
      text: 'Cikgu saya sangat baik dan dia suka menolong murid.',
      errors: [],
      suggestions: [],
      improved: null,
    },
    {
      text: 'Saya main bola dengan kawan selepas sekolah.',
      errors: [
        { type: 'imbuhan', issue: '"main" should use ber- prefix', fix: 'bermain' },
      ],
      suggestions: ['Add time marker: "setiap petang" for specificity'],
      improved: 'Saya bermain bola dengan kawan-kawan setiap petang selepas sekolah.',
    },
    {
      text: 'Hari ini saya tulis karangan tentang keluarga saya.',
      errors: [
        { type: 'imbuhan', issue: '"tulis" should use meN- prefix for active voice', fix: 'menulis' },
      ],
      suggestions: [],
      improved: 'Hari ini saya menulis karangan tentang keluarga saya.',
    },
  ],
  strengths: [
    'Clear topic sentences',
    'Good use of "setiap hari" for time reference',
    'Correct subject-verb order throughout',
  ],
  imbuhanAnalysis: {
    correct: ['menolong', 'sekolah'],
    incorrect: [
      { used: 'main', correct: 'bermain', rule: 'Activities/sports require ber- prefix: bermain, berlari, berenang' },
      { used: 'tulis', correct: 'menulis', rule: 'Active voice verbs require meN- prefix: menulis, membaca, menari' },
    ],
  },
  modelParagraph: 'Saya sangat suka pergi ke sekolah setiap hari kerana cikgu saya amat baik hati. Beliau sentiasa menolong murid-murid yang menghadapi masalah. Selepas waktu persekolahan, saya bermain bola sepak dengan kawan-kawan di padang. Aktiviti ini amat menyeronokkan dan menyihatkan badan.',
};

export const MOCK_CHAT_RESPONSE = 'Great question! The difference between **meN-** and **peN-** is one of the trickiest parts of Malay grammar, but once you see the pattern, it clicks.\n\n**meN-** creates **active verbs** (the doer is the subject):\n- tulis → **menulis** (to write) — "Saya menulis surat."\n- baca → **membaca** (to read) — "Ali membaca buku."\n\n**peN-** creates **nouns** (the person who does the action):\n- tulis → **penulis** (writer) — "Dia seorang penulis terkenal."\n- baca → **pembaca** (reader) — "Pembaca novel itu ramai."\n\nBoth follow the same nasal rules (p→m, t→n, k→ng, s→ny), which is why they can be confusing!\n\n**Quick test**: Can you change "ajar" (teach) into both meN- and peN- forms? What would each mean?';

export const MOCK_COMPREHENSION_RESPONSE = {
  questions: [
    {
      id: 1,
      type: 'vocabulary',
      question: 'Apakah maksud "menyeronokkan" dalam petikan ini?',
      questionEn: 'What does "menyeronokkan" mean in this passage?',
      options: ['A) Membosankan', 'B) Menggembirakan', 'C) Menakutkan', 'D) Menyedihkan'],
      correctIndex: 1,
      explanation: '"Menyeronokkan" comes from the root "seronok" (fun/enjoyable) with meN-...-kan affix, meaning "to make fun" or "enjoyable".',
      referenceText: 'Aktiviti berkumpul di taman itu sangat menyeronokkan.',
    },
    {
      id: 2,
      type: 'factual',
      question: 'Bilakah aktiviti gotong-royong diadakan?',
      questionEn: 'When was the community clean-up held?',
      options: ['A) Hari Isnin', 'B) Hari Sabtu', 'C) Hari Ahad', 'D) Hari Rabu'],
      correctIndex: 1,
      explanation: 'The passage states "Pada hari Sabtu, penduduk kampung berkumpul untuk gotong-royong."',
      referenceText: 'Pada hari Sabtu, penduduk kampung berkumpul untuk gotong-royong.',
    },
    {
      id: 3,
      type: 'inference',
      question: 'Mengapakah penduduk kampung sanggup bangun awal?',
      questionEn: 'Why were the villagers willing to wake up early?',
      options: ['A) Kerana mereka takut denda', 'B) Kerana mereka sayang kampung mereka', 'C) Kerana ketua kampung memaksa', 'D) Kerana mereka tidak ada kerja lain'],
      correctIndex: 1,
      explanation: 'The passage emphasizes community spirit and pride in their village, suggesting they were motivated by love for their community rather than obligation.',
      referenceText: 'Semangat kerjasama dalam kalangan penduduk amat membanggakan.',
    },
    {
      id: 4,
      type: 'main_idea',
      question: 'Apakah idea utama petikan ini?',
      questionEn: 'What is the main idea of this passage?',
      options: ['A) Kepentingan menjaga kebersihan rumah', 'B) Semangat kerjasama dalam komuniti', 'C) Masalah pencemaran alam sekitar', 'D) Cara-cara mengitar semula'],
      correctIndex: 1,
      explanation: 'The passage focuses on how the community came together for gotong-royong, highlighting cooperation and communal spirit as the central theme.',
      referenceText: 'Semangat kerjasama dalam kalangan penduduk amat membanggakan.',
    },
    {
      id: 5,
      type: 'grammar',
      question: 'Dalam ayat "Mereka membersihkan kawasan itu", apakah imbuhan yang digunakan pada kata "membersihkan"?',
      questionEn: 'In the sentence "Mereka membersihkan kawasan itu", what affixes are used on "membersihkan"?',
      options: ['A) meN- sahaja', 'B) -kan sahaja', 'C) meN-...-kan', 'D) ber-...-kan'],
      correctIndex: 2,
      explanation: '"Membersihkan" uses the circumfix meN-...-kan on the root word "bersih". meN- marks active voice and -kan marks transitive (acting on something).',
      referenceText: 'Mereka membersihkan kawasan itu dengan penuh semangat.',
    },
  ],
};

/**
 * Get mock response by action type.
 * Simulates streaming by splitting into chunks with small delays.
 */
export function getMockResponse(action) {
  switch (action) {
    case 'roleplay':
      return JSON.stringify(MOCK_ROLEPLAY_RESPONSE);
    case 'roleplay-score':
      return JSON.stringify(MOCK_ROLEPLAY_SCORE);
    case 'writing-feedback':
      return JSON.stringify(MOCK_WRITING_RESPONSE);
    case 'chat':
      return MOCK_CHAT_RESPONSE;
    case 'comprehension':
      return JSON.stringify(MOCK_COMPREHENSION_RESPONSE);
    default:
      return JSON.stringify({ error: 'Unknown action', fallback: true });
  }
}
