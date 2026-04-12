/**
 * Cikgu Bot — Interactive Malaysian Malay conversation practice
 * Provides turn-based dialogue simulation for IGCSE Paper 3 speaking prep
 * IMPORTANT: Uses Malaysian Malay (ms-MY), NOT Indonesian (id-ID)
 */

const CIKGU_PERSONAS = {
  casual: {
    name: 'Cikgu Aziz',
    greeting: 'Hai! Saya Cikgu Aziz. Apa khabar hari ini?',
    feedbackPositive: ['Bagus!', 'Tepat sekali!', 'Sempurna!', 'Tahniah!'],
    feedbackNeutral: ['Boleh lagi', 'Ada yang tak betul sikit', 'Cuba lagi ya'],
    feedbackNegative: ['Tak tepat tu', 'Cuba sekali lagi', 'Macam mana kalau...']
  },
  formal: {
    name: 'Cikgu Siti',
    greeting: 'Selamat pagi. Nama saya Cikgu Siti. Boleh kita mulakan pelajaran?',
    feedbackPositive: ['Sangat bagus', 'Itu betul', 'Jawapan yang tepat'],
    feedbackNeutral: ['Hampir betul', 'Ada kesilapan kecil', 'Tolong ulang'],
    feedbackNegative: ['Itu tak betul', 'Sila cuba sekali lagi', 'Macam ini lebih baik']
  }
}

const VOCABULARY_CATEGORIES = {
  greetings: ['hai', 'helo', 'selamat pagi', 'selamat tengah hari', 'selamat petang', 'selamat malam', 'apa khabar'],
  courtesy: ['terima kasih', 'sama-sama', 'maaf', 'tumpang tanya', 'tolong', 'boleh', 'sila'],
  questions: ['berapa', 'siapa', 'apa', 'di mana', 'bila', 'kenapa', 'bagaimana', 'macam mana'],
  negation: ['tidak', 'bukan', 'jangan', 'belum', 'tiada', 'tak'],
  connectors: ['kerana', 'tetapi', 'walaupun', 'supaya', 'apabila', 'jika', 'oleh itu', 'selain itu'],
  imbuhan: ['me', 'ber', 'di', 'ter', 'per', 'ke', 'se']
}

// Normalize Malay text for comparison
function normalizeText(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
}

// Check if response contains vocabulary from category
function hasVocabulary(text, category) {
  const normalized = normalizeText(text)
  return VOCABULARY_CATEGORIES[category]?.some(word => normalized.includes(word)) || false
}

// Count imbuhan usage (prefixed/suffixed words)
function countImbuhan(text) {
  const words = text.toLowerCase().split(/\s+/)
  return words.filter(w =>
    /^(me[nm]?|ber|di|ter|per|ke|se)\w{3,}/.test(w) ||
    /\w{3,}(kan|an|i)$/.test(w)
  ).length
}

// Evaluate user response quality
export function evaluateResponse(userText) {
  const wordCount = userText.trim().split(/\s+/).length
  const imbuhanCount = countImbuhan(userText)

  const score = {
    overall: 0,
    hasGreeting: hasVocabulary(userText, 'greetings'),
    hasCourtesy: hasVocabulary(userText, 'courtesy'),
    hasQuestions: hasVocabulary(userText, 'questions'),
    hasConnectors: hasVocabulary(userText, 'connectors'),
    imbuhanCount,
    length: wordCount,
    quality: 'neutral'
  }

  // Scoring: 0-100
  let points = 0
  if (score.hasGreeting) points += 15
  if (score.hasCourtesy) points += 10
  if (score.hasQuestions) points += 15
  if (score.hasConnectors) points += 10
  if (imbuhanCount >= 1) points += 10
  if (imbuhanCount >= 3) points += 10
  if (wordCount >= 3) points += 10
  if (wordCount >= 5) points += 10
  if (wordCount >= 8) points += 10

  score.overall = Math.min(points, 100)
  score.quality = score.overall >= 70 ? 'excellent'
    : score.overall >= 50 ? 'good'
    : score.overall >= 30 ? 'fair'
    : 'needs_work'

  return score
}

// Generate feedback based on evaluation
export function generateFeedback(evaluation, persona = 'casual') {
  const personaData = CIKGU_PERSONAS[persona]
  let feedback = ''

  if (evaluation.quality === 'excellent') {
    feedback = personaData.feedbackPositive[Math.floor(Math.random() * personaData.feedbackPositive.length)]
    feedback += ' Awak guna bahasa yang bagus.'
  } else if (evaluation.quality === 'good') {
    feedback = personaData.feedbackNeutral[Math.floor(Math.random() * personaData.feedbackNeutral.length)]
    if (evaluation.length < 3) feedback += ' Cuba panjangkan jawapan awak.'
    if (!evaluation.hasCourtesy) feedback += ' Jangan lupa kata sopan santun.'
    if (evaluation.imbuhanCount === 0) feedback += ' Cuba guna imbuhan (meN-, ber-, di-).'
  } else {
    feedback = personaData.feedbackNegative[Math.floor(Math.random() * personaData.feedbackNegative.length)]
    feedback += ' Jom kita cuba sekali lagi.'
  }

  return feedback
}

// Get next prompt for conversation flow
export function getNextPrompt(turnNumber, topic = 'general') {
  const prompts = {
    general: [
      'Boleh awak ceritakan hobi awak?',
      'Apa makanan kegemaran awak?',
      'Di mana awak tinggal?',
      'Apa pekerjaan ibu bapa awak?',
      'Berapa umur awak?'
    ],
    shopping: [
      'Apa yang awak nak beli?',
      'Berapa harga barang itu?',
      'Warna apa yang awak suka?',
      'Berapa banyak barang yang awak nak?',
      'Boleh saya tolong awak?'
    ],
    restaurant: [
      'Nak order apa, dik?',
      'Apa minuman kegemaran awak?',
      'Nak makan apa untuk makan malam?',
      'Meja nombor berapa, encik?',
      'Baik, saya ambil pesanan ini.'
    ],
    travel: [
      'Awak nak pergi ke mana?',
      'Berapa lama awak akan tinggal di sana?',
      'Dengan siapa awak akan pergi?',
      'Apa tujuan perjalanan awak?',
      'Awak akan naik apa? Kapal terbang atau bas?'
    ],
    school: [
      'Apa mata pelajaran kegemaran awak?',
      'Berapa orang pelajar dalam kelas awak?',
      'Siapa cikgu kegemaran awak?',
      'Apa aktiviti kokurikulum awak?',
      'Macam mana awak pergi ke sekolah?'
    ]
  }

  const topicPrompts = prompts[topic] || prompts.general
  return topicPrompts[Math.min(turnNumber, topicPrompts.length - 1)]
}

// Initialize conversation session
export function initializeConversation(persona = 'casual', topic = 'general') {
  const personaData = CIKGU_PERSONAS[persona]
  return {
    persona,
    topic,
    cikguName: personaData.name,
    greeting: personaData.greeting,
    turns: [],
    score: 0,
    startTime: Date.now()
  }
}

// Add turn to conversation — returns new conversation (immutable)
export function addTurn(conversation, userText, turnNumber) {
  const evaluation = evaluateResponse(userText)
  const feedback = generateFeedback(evaluation, conversation.persona)
  const nextPrompt = getNextPrompt(turnNumber, conversation.topic)

  const turn = {
    number: turnNumber,
    userText,
    evaluation,
    feedback,
    nextPrompt,
    timestamp: Date.now()
  }

  return {
    conversation: {
      ...conversation,
      turns: [...conversation.turns, turn],
      score: conversation.score + evaluation.overall
    },
    turn
  }
}

// Generate session summary
export function generateSessionSummary(conversation) {
  if (conversation.turns.length === 0) {
    return {
      persona: conversation.persona,
      topic: conversation.topic,
      turnsCompleted: 0,
      averageScore: 0,
      durationSeconds: 0,
      quality: 'Belum Bermula',
      strengths: [],
      suggestions: ['Cuba mulakan perbualan']
    }
  }

  const avgScore = Math.round(conversation.score / conversation.turns.length)
  const duration = Math.round((Date.now() - conversation.startTime) / 1000)

  return {
    persona: conversation.persona,
    topic: conversation.topic,
    turnsCompleted: conversation.turns.length,
    averageScore: avgScore,
    durationSeconds: duration,
    quality: avgScore >= 70 ? 'Sangat Bagus' : avgScore >= 50 ? 'Bagus' : 'Boleh Lagi',
    strengths: [
      conversation.turns.some(t => t.evaluation.hasCourtesy) && 'Sopan santun',
      conversation.turns.some(t => t.evaluation.length >= 5) && 'Ayat panjang',
      conversation.turns.some(t => t.evaluation.imbuhanCount >= 2) && 'Penggunaan imbuhan',
      conversation.turns.some(t => t.evaluation.hasConnectors) && 'Kata penghubung',
      avgScore >= 70 && 'Ketepatan bahasa'
    ].filter(Boolean),
    suggestions: [
      avgScore < 50 && 'Cuba berlatih lebih kerap',
      !conversation.turns.some(t => t.evaluation.hasQuestions) && 'Tambahkan soalan dalam perbualan',
      conversation.turns.some(t => t.evaluation.length < 2) && 'Panjangkan jawapan awak',
      !conversation.turns.some(t => t.evaluation.imbuhanCount >= 1) && 'Gunakan lebih banyak imbuhan (meN-, ber-, di-)',
      !conversation.turns.some(t => t.evaluation.hasConnectors) && 'Guna kata penghubung (kerana, tetapi, supaya)'
    ].filter(Boolean)
  }
}

export {
  CIKGU_PERSONAS,
  VOCABULARY_CATEGORIES
}
