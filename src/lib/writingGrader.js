// Format-aware writing grader. Replaces the old analyzeEnglish / analyzeMalay
// functions in Writing.jsx. Each format has marker phrases and structural
// hints; the auto-detect mode picks the format whose markers fire hardest,
// and `general` skips structural penalties.
//
// The result shape is a superset of the legacy analyzers so the existing
// Writing.jsx render code keeps working unchanged.

import { DISC_EN, FORM_EN, SIM_RE, MET_RE, PW_ML, FORM_ML } from '../data/writing'
import { findIssues, summariseIssues } from './writingErrors'
import { findIssuesMalay, summariseIssuesMalay } from './writingErrorsMalay'

const re = (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'), 'i')
const wordRe = (s) => new RegExp('\\b' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')

// ─────────────────────── Format catalogue ───────────────────────

const FORMATS = [
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
  {
    id: 'ms-surat-rasmi', label: 'Surat Rasmi (Formal Letter)', lang: 'malay',
    minWords: 200, maxWords: 300,
    markers: ['Dengan hormatnya', 'Merujuk perkara', 'Sehubungan dengan itu', 'Yang benar', 'Sekian, terima kasih', 'Tuan/Puan'],
    requiredHints: ['Alamat pengirim', 'Tarikh', 'Alamat penerima', 'Perkara', 'Salam hormat', 'Penutup'],
  },
  {
    id: 'ms-surat-tidak-rasmi', label: 'Surat Tidak Rasmi (Informal Letter)', lang: 'malay',
    minWords: 150, maxWords: 250,
    markers: ['kekanda', 'adinda', 'sahabat', 'Apa khabar', 'Salam sayang', 'rindu', 'Setakat ini'],
    requiredHints: ['Alamat ringkas', 'Salam mesra', 'Isi peribadi', 'Penutup mesra'],
  },
  {
    id: 'ms-email', label: 'E-mel', lang: 'malay',
    minWords: 120, maxWords: 250,
    markers: ['Daripada:', 'Kepada:', 'Subjek:', 'Tarikh:', 'Sekian, terima kasih', 'Yang benar'],
    requiredHints: ['Header', 'Salam', 'Isi', 'Penutup'],
  },
  {
    id: 'ms-rencana', label: 'Rencana / Artikel', lang: 'malay',
    minWords: 250, maxWords: 350,
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
    minWords: 150, maxWords: 250,
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

const FORMATS_BY_ID = Object.fromEntries(FORMATS.map(f => [f.id, f]))

export function listFormats(lang) {
  return FORMATS.filter(f => !lang || f.lang === lang)
}

// ─────────────────────── Detection ───────────────────────

function detectConfidence(text, format) {
  const tt = text.toLowerCase()
  let hits = 0
  for (const m of format.markers) {
    if (tt.includes(m.toLowerCase())) hits++
  }
  return format.markers.length ? hits / format.markers.length : 0
}

export function autoDetectFormat(text, lang) {
  const candidates = listFormats(lang)
  let best = null
  let bestScore = 0
  for (const f of candidates) {
    const c = detectConfidence(text, f)
    if (c > bestScore) {
      best = f
      bestScore = c
    }
  }
  return { format: best, confidence: bestScore }
}

// ─────────────────────── Format scoring ───────────────────────

function scoreFormatFidelity(text, format) {
  const tt = text.toLowerCase()
  const hits = []
  const misses = []
  for (const m of format.markers) {
    if (tt.includes(m.toLowerCase())) hits.push(m)
    else misses.push(m)
  }
  return { hits, misses }
}

// ─────────────────────── General quality scoring ───────────────────────

// Common closed-class words excluded from lexical-diversity calculation.
// Counting "the" uniquely doesn't tell you anything about vocabulary range.
const EN_STOP = new Set([
  'a','an','the','and','but','or','if','as','at','by','for','from','in','into','of',
  'on','to','with','about','against','between','through','during','before','after',
  'above','below','up','down','out','over','under','i','me','my','mine','we','us','our',
  'ours','you','your','yours','he','him','his','she','her','hers','it','its','they','them',
  'their','theirs','this','that','these','those','am','is','are','was','were','be','been',
  'being','have','has','had','having','do','does','did','doing','can','could','will','would',
  'shall','should','may','might','must','not','no','nor','too','so','than','then','there',
  'here','where','when','why','how','what','who','whom','which','any','all','some','each',
  'every','many','few','most','more','less','very','just','also','only','even','still','also',
])

const SOPHISTICATED_HINTS = /\b(?:notwithstanding|consequently|nevertheless|undoubtedly|paradoxically|inevitably|profoundly|conspicuously|seemingly|distinctly|inadvertently|unequivocally|substantively|fundamentally|inherently|ostensibly|palpable|palpably|ubiquitous|ubiquitously|intrinsic|intrinsically|imperative|imperatively|crucial|crucially|pivotal|pivotally|salient|salience|tantamount|cogent|cogently|veritable|tenuous|nuanced|nuance|caveat|albeit|wherein|whereby|insofar|hitherto|thereby|thereafter)\b/gi

function syllableCount(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1
  const trimmed = w.replace(/(?:[^laeiouy]|ed|es)$/, '').replace(/^y/, '')
  const groups = trimmed.match(/[aeiouy]+/g) || []
  return Math.max(1, groups.length)
}

function generalEnglish(text) {
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const sents = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const paras = text.split(/\n\s*\n+/).filter(p => p.trim().length > 0)
  const sims = (text.match(SIM_RE) || []).length
  const mets = (text.match(MET_RE) || []).length
  const disc = DISC_EN.filter(w => wordRe(w.replace(/ /g, '\\s+')).test(text))
  const vocab = FORM_EN.filter(w => wordRe(w).test(text))
  const complex = sents.filter(s => /(,.*,|although|despite|whereas|whilst|which\s|who\s|;|because)/i.test(s)).length
  const avgLen = sents.length > 0 ? Math.round(words.length / sents.length) : 0

  // Sentence-length variance (std dev of word counts)
  const sentLens = sents.map(s => s.trim().split(/\s+/).filter(Boolean).length)
  const meanLen = sentLens.length ? sentLens.reduce((a, b) => a + b, 0) / sentLens.length : 0
  const variance = sentLens.length
    ? sentLens.reduce((a, b) => a + (b - meanLen) ** 2, 0) / sentLens.length
    : 0
  const sentLenStd = Math.sqrt(variance)

  // Lexical diversity (type-token ratio) over content words only.
  // Use a moving-window TTR if the essay is long, to compensate for the
  // well-known length bias in raw TTR.
  const cleaned = words.map(w => w.toLowerCase().replace(/[^a-z']/g, '')).filter(w => w && !EN_STOP.has(w))
  let ttr = 0
  if (cleaned.length > 0) {
    if (cleaned.length <= 100) {
      ttr = new Set(cleaned).size / cleaned.length
    } else {
      // Mean Segmental TTR with 100-word windows
      const ttrs = []
      for (let i = 0; i + 100 <= cleaned.length; i += 100) {
        const seg = cleaned.slice(i, i + 100)
        ttrs.push(new Set(seg).size / 100)
      }
      ttr = ttrs.reduce((a, b) => a + b, 0) / ttrs.length
    }
  }

  // Long-word ratio
  const longWords = words.filter(w => w.replace(/[^A-Za-z]/g, '').length >= 7).length
  const longWordRatio = words.length ? longWords / words.length : 0

  // Sophisticated vocabulary hits beyond the curated FORM_EN list
  const sophisticated = (text.match(SOPHISTICATED_HINTS) || []).length

  // Average syllables per word (proxy for register difficulty)
  const sylSum = words.reduce((a, w) => a + syllableCount(w), 0)
  const avgSyll = words.length ? sylSum / words.length : 0

  // Discourse-marker DIVERSITY (unique types, not raw count) — prevents spam.
  const discDiversity = disc.length

  // Sentence opener variety — penalise starting many sentences with the same word.
  const openers = sents.map(s => (s.trim().split(/\s+/)[0] || '').toLowerCase()).filter(Boolean)
  const openerCounts = {}
  for (const o of openers) openerCounts[o] = (openerCounts[o] || 0) + 1
  const maxOpenerCount = Math.max(0, ...Object.values(openerCounts))
  const openerVariety = openers.length ? 1 - maxOpenerCount / openers.length : 1

  // Complex/simple ratio
  const complexRatio = sents.length ? complex / sents.length : 0

  return {
    words, sents, paras, sims, mets, disc, vocab, complex, avgLen,
    // new metrics
    sentLenStd, ttr, longWordRatio, sophisticated, avgSyll,
    discDiversity, openerVariety, complexRatio, sentLens,
  }
}

// Malay closed-class words excluded from lexical-diversity (TTR) calc.
const MS_STOP = new Set([
  'yang','dan','di','ke','dari','daripada','dengan','untuk','pada','oleh','itu','ini',
  'atau','tetapi','jika','apabila','kerana','supaya','agar','seperti','sama','juga',
  'pun','akan','sudah','sedang','telah','belum','tidak','tak','ialah','adalah',
  'saya','kamu','dia','mereka','kami','kita','aku','engkau','beliau',
  'satu','dua','tiga','itu','ini','tu','ni','sini','sana','situ','mana',
  'lebih','kurang','sangat','amat','terlalu','agak','sahaja','saja','semua',
  'banyak','sedikit','setiap','tiap','para','bagi','antara','tanpa','tentang',
  'tersebut','demikian','begitu','begini','seterusnya','jua','jugak','dah',
])

const MS_SOPHISTICATED = /\b(?:meskipun|walaupun|kendatipun|walhasil|bahkan|malahan|namun|justeru|melainkan|sungguhpun|sungguh|walaupun begitu|sehubungan|berdasarkan|memandangkan|berpandukan|seterusnya|sehinggakan|sememangnya|sewajarnya|seharusnya|seyogianya|tatkala|manakala|seraya|sambil|menerusi|melalui|dengan demikian|dengan itu|oleh hal yang demikian|hasilnya)\b/gi

function syllableCountMs(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  // Malay syllabification is ~1 vowel cluster per syllable.
  const groups = w.match(/[aeiou]+/g) || []
  return Math.max(1, groups.length)
}

function generalMalay(text) {
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const sents = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const paras = text.split(/\n\s*\n+/).filter(p => p.trim().length > 0)
  const pw = PW_ML.filter(w => re(w).test(text))
  const formal = FORM_ML.filter(w => wordRe(w).test(text))
  const avgLen = sents.length > 0 ? Math.round(words.length / sents.length) : 0

  // Sentence-length variance
  const sentLens = sents.map(s => s.trim().split(/\s+/).filter(Boolean).length)
  const meanLen = sentLens.length ? sentLens.reduce((a, b) => a + b, 0) / sentLens.length : 0
  const variance = sentLens.length
    ? sentLens.reduce((a, b) => a + (b - meanLen) ** 2, 0) / sentLens.length
    : 0
  const sentLenStd = Math.sqrt(variance)

  // Lexical diversity (TTR), stop-word-removed, MSTTR for long texts.
  const cleaned = words
    .map(w => w.toLowerCase().replace(/[^a-z'-]/g, ''))
    .filter(w => w && !MS_STOP.has(w))
  let ttr = 0
  if (cleaned.length > 0) {
    if (cleaned.length <= 100) {
      ttr = new Set(cleaned).size / cleaned.length
    } else {
      const ttrs = []
      for (let i = 0; i + 100 <= cleaned.length; i += 100) {
        const seg = cleaned.slice(i, i + 100)
        ttrs.push(new Set(seg).size / 100)
      }
      ttr = ttrs.reduce((a, b) => a + b, 0) / ttrs.length
    }
  }

  // Long-word ratio (≥ 8 letters captures imbuhan-derived forms)
  const longWords = words.filter(w => w.replace(/[^A-Za-z]/g, '').length >= 8).length
  const longWordRatio = words.length ? longWords / words.length : 0

  // Sophisticated vocabulary hits beyond FORM_ML
  const sophisticated = (text.match(MS_SOPHISTICATED) || []).length

  // Average syllables per word (proxy for register difficulty)
  const sylSum = words.reduce((a, w) => a + syllableCountMs(w), 0)
  const avgSyll = words.length ? sylSum / words.length : 0

  // Discourse-marker DIVERSITY
  const pwDiversity = pw.length

  // Sentence opener variety
  const openers = sents.map(s => (s.trim().split(/\s+/)[0] || '').toLowerCase()).filter(Boolean)
  const openerCounts = {}
  for (const o of openers) openerCounts[o] = (openerCounts[o] || 0) + 1
  const maxOpenerCount = Math.max(0, ...Object.values(openerCounts))
  const openerVariety = openers.length ? 1 - maxOpenerCount / openers.length : 1

  // Complex / compound sentence ratio
  const complex = sents.filter(s => /(,.*,|kerana|tetapi|walaupun|sambil|apabila|jika|supaya|setelah|seraya|manakala|;|sehingga)/i.test(s)).length
  const complexRatio = sents.length ? complex / sents.length : 0

  return {
    words, sents, paras, pw, formal, avgLen,
    sentLenStd, ttr, longWordRatio, sophisticated, avgSyll,
    pwDiversity, openerVariety, complexRatio, complex, sentLens,
  }
}

// ─────────────────────── Bands ───────────────────────

// Band 1 (worst) … Band 6 (best). Multi-criterion sub-bands feed into
// an overall band that is then floored down by accuracy when error
// density is high — you cannot earn Band 6 with a sloppy text.
function bandEnglishCriteria(g, format, formatHits, errorSummary) {
  const wlen = g.words.length
  const minW = format?.minWords ?? 250
  const errPer100 = wlen > 0 ? (errorSummary.counts.high * 100) / wlen : 0
  const allErrPer100 = wlen > 0 ? ((errorSummary.counts.high + errorSummary.counts.medium) * 100) / wlen : 0

  // ── Content & development band — driven by word count vs format target.
  let content
  if (wlen >= minW * 1.1 && g.paras >= 3) content = 6
  else if (wlen >= minW && g.paras >= 3) content = 5
  else if (wlen >= minW * 0.8 && g.paras >= 2) content = 4
  else if (wlen >= minW * 0.5) content = 3
  else content = 2

  // ── Accuracy band — driven by error density (high-severity weighted heavily).
  let accuracy
  if (errPer100 < 0.5 && allErrPer100 < 1.5) accuracy = 6
  else if (errPer100 < 1) accuracy = 5
  else if (errPer100 < 2) accuracy = 4
  else if (errPer100 < 4) accuracy = 3
  else accuracy = 2

  // ── Vocabulary range band — TTR + sophisticated + formal + long-word ratio.
  // TTR ≥ 0.55 is strong, ≥ 0.45 is good. (Stop-word-removed TTR.)
  const formalCount = g.vocab.length + g.sophisticated
  let vocab
  if (g.ttr >= 0.55 && formalCount >= 4 && g.longWordRatio >= 0.18) vocab = 6
  else if (g.ttr >= 0.5 && formalCount >= 3 && g.longWordRatio >= 0.14) vocab = 5
  else if (g.ttr >= 0.4 && formalCount >= 1) vocab = 4
  else if (g.ttr >= 0.3) vocab = 3
  else vocab = 2

  // ── Sentence variety band — length variance + complex ratio + opener variety.
  let variety
  if (g.sentLenStd >= 6 && g.complexRatio >= 0.35 && g.openerVariety >= 0.7) variety = 6
  else if (g.sentLenStd >= 4 && g.complexRatio >= 0.25 && g.openerVariety >= 0.6) variety = 5
  else if (g.sentLenStd >= 3 && g.complexRatio >= 0.15) variety = 4
  else if (g.sentLenStd >= 2) variety = 3
  else variety = 2

  // ── Cohesion band — discourse-marker diversity (unique).
  let cohesion
  if (g.discDiversity >= 5) cohesion = 6
  else if (g.discDiversity >= 4) cohesion = 5
  else if (g.discDiversity >= 2) cohesion = 4
  else if (g.discDiversity >= 1) cohesion = 3
  else cohesion = 2

  // ── Format band — depends on whether a format was selected at all.
  let formatBand = 5 // neutral when no format
  if (format) {
    const expected = format.markers.length
    const ratio = expected ? formatHits.length / expected : 0
    if (ratio >= 0.6) formatBand = 6
    else if (ratio >= 0.4) formatBand = 5
    else if (ratio >= 0.25) formatBand = 4
    else if (ratio >= 0.1) formatBand = 3
    else formatBand = 2
  }

  // ── Overall: weighted average, then capped by accuracy.
  // Weights reflect IGCSE 0500/0510 mark scheme priorities (content & accuracy heaviest).
  const weighted = (
    content   * 0.25 +
    accuracy  * 0.25 +
    vocab     * 0.20 +
    variety   * 0.15 +
    cohesion  * 0.10 +
    formatBand* 0.05
  )
  let overall = Math.round(weighted)

  // Hard cap: if accuracy is very low, overall cannot exceed accuracy + 1.
  if (overall > accuracy + 1) overall = accuracy + 1

  // Hard cap: if content is far below format minimum, overall is capped at content.
  if (wlen < minW * 0.6) overall = Math.min(overall, content)

  // Clamp to 1..6
  overall = Math.max(1, Math.min(6, overall))

  return {
    overall,
    sub: { content, accuracy, vocab, variety, cohesion, format: formatBand },
    metrics: {
      wordCount: wlen,
      errorsPer100: Math.round(errPer100 * 10) / 10,
      allErrorsPer100: Math.round(allErrPer100 * 10) / 10,
      ttr: Math.round(g.ttr * 100) / 100,
      sentLenStd: Math.round(g.sentLenStd * 10) / 10,
      complexRatio: Math.round(g.complexRatio * 100) / 100,
      openerVariety: Math.round(g.openerVariety * 100) / 100,
      avgSyll: Math.round(g.avgSyll * 100) / 100,
      longWordRatio: Math.round(g.longWordRatio * 100) / 100,
      uniqueDiscourse: g.discDiversity,
      formalCount: g.vocab.length + g.sophisticated,
    },
  }
}

// Multi-criterion banding for Malay — mirrors bandEnglishCriteria so the
// UI can reuse the same SubBands panel. Weights match IGCSE 0546 marking
// emphasis (content + accuracy carry the most weight, format least).
function bandMalayCriteria(g, format, formatHits, errorSummary, paper) {
  const wlen = g.words.length
  const minW = format?.minWords ?? (paper === 2 ? 200 : 300)
  const errPer100 = wlen > 0 ? (errorSummary.counts.high * 100) / wlen : 0
  const allErrPer100 = wlen > 0 ? ((errorSummary.counts.high + errorSummary.counts.medium) * 100) / wlen : 0

  // Content & development
  let content
  if (wlen >= minW * 1.1 && g.paras.length >= 3) content = 6
  else if (wlen >= minW && g.paras.length >= 3) content = 5
  else if (wlen >= minW * 0.8 && g.paras.length >= 2) content = 4
  else if (wlen >= minW * 0.5) content = 3
  else content = 2

  // Accuracy
  let accuracy
  if (errPer100 < 0.5 && allErrPer100 < 1.5) accuracy = 6
  else if (errPer100 < 1) accuracy = 5
  else if (errPer100 < 2) accuracy = 4
  else if (errPer100 < 4) accuracy = 3
  else accuracy = 2

  // Vocabulary range — TTR + formal + sophisticated + long-word ratio
  const formalCount = g.formal.length + g.sophisticated
  let vocab
  if (g.ttr >= 0.55 && formalCount >= 4 && g.longWordRatio >= 0.22) vocab = 6
  else if (g.ttr >= 0.5 && formalCount >= 3 && g.longWordRatio >= 0.18) vocab = 5
  else if (g.ttr >= 0.4 && formalCount >= 1) vocab = 4
  else if (g.ttr >= 0.3) vocab = 3
  else vocab = 2

  // Sentence variety
  let variety
  if (g.sentLenStd >= 6 && g.complexRatio >= 0.35 && g.openerVariety >= 0.7) variety = 6
  else if (g.sentLenStd >= 4 && g.complexRatio >= 0.25 && g.openerVariety >= 0.6) variety = 5
  else if (g.sentLenStd >= 3 && g.complexRatio >= 0.15) variety = 4
  else if (g.sentLenStd >= 2) variety = 3
  else variety = 2

  // Cohesion — penanda wacana diversity
  let cohesion
  if (g.pwDiversity >= 5) cohesion = 6
  else if (g.pwDiversity >= 4) cohesion = 5
  else if (g.pwDiversity >= 2) cohesion = 4
  else if (g.pwDiversity >= 1) cohesion = 3
  else cohesion = 2

  // Format
  let formatBand = 5
  if (format) {
    const expected = format.markers.length
    const ratio = expected ? formatHits.length / expected : 0
    if (ratio >= 0.6) formatBand = 6
    else if (ratio >= 0.4) formatBand = 5
    else if (ratio >= 0.25) formatBand = 4
    else if (ratio >= 0.1) formatBand = 3
    else formatBand = 2
  }

  const weighted = (
    content   * 0.25 +
    accuracy  * 0.25 +
    vocab     * 0.20 +
    variety   * 0.15 +
    cohesion  * 0.10 +
    formatBand* 0.05
  )
  let overall = Math.round(weighted)
  if (overall > accuracy + 1) overall = accuracy + 1
  if (wlen < minW * 0.6) overall = Math.min(overall, content)
  overall = Math.max(1, Math.min(6, overall))

  return {
    overall,
    sub: { content, accuracy, vocab, variety, cohesion, format: formatBand },
    metrics: {
      wordCount: wlen,
      errorsPer100: Math.round(errPer100 * 10) / 10,
      allErrorsPer100: Math.round(allErrPer100 * 10) / 10,
      ttr: Math.round(g.ttr * 100) / 100,
      sentLenStd: Math.round(g.sentLenStd * 10) / 10,
      complexRatio: Math.round(g.complexRatio * 100) / 100,
      openerVariety: Math.round(g.openerVariety * 100) / 100,
      avgSyll: Math.round(g.avgSyll * 100) / 100,
      longWordRatio: Math.round(g.longWordRatio * 100) / 100,
      uniqueDiscourse: g.pwDiversity,
      formalCount: g.formal.length + g.sophisticated,
    },
  }
}

// ─────────────────────── Public scoring API ───────────────────────

export function score(text, { lang, format = 'auto', paper = 2 } = {}) {
  if (!text || text.trim().length < 30) {
    return { error: 'too-short', message: lang === 'malay' ? 'Tulis lebih (sekurang-kurangnya 30 aksara)!' : 'Write more text (at least 30 characters)!' }
  }

  // Resolve format
  let chosen = null
  let confidence = 1
  let detectedAuto = false
  if (format === 'general') {
    chosen = null
  } else if (format === 'auto') {
    const r = autoDetectFormat(text, lang)
    chosen = r.format
    confidence = r.confidence
    detectedAuto = true
  } else {
    chosen = FORMATS_BY_ID[format] || null
  }

  // Format fidelity
  const formatFidelity = chosen ? scoreFormatFidelity(text, chosen) : { hits: [], misses: [] }

  if (lang === 'malay') {
    const g = generalMalay(text)
    const findings = findIssuesMalay(text, { formatId: chosen?.id || null })
    const errorSummary = summariseIssuesMalay(findings)
    const banding = bandMalayCriteria(g, chosen, formatFidelity.hits, errorSummary, paper)
    const band = banding.overall

    const tips = []
    if (errorSummary.counts.high > 0) {
      tips.push(`Betulkan ${errorSummary.counts.high} kesalahan tatabahasa/ejaan yang ditandakan di bawah.`)
    }
    if (chosen && formatFidelity.misses.length > 0 && banding.sub.format <= 4) {
      tips.push(`Tambah penanda format: ${formatFidelity.misses.slice(0, 3).join(', ')}`)
    }
    if (banding.sub.cohesion <= 4) tips.push('Gunakan lebih banyak penanda wacana (selain itu, walau bagaimanapun, sebagai contoh, kesimpulannya, oleh itu).')
    if (banding.sub.vocab <= 4) tips.push('Tingkatkan kosa kata — gunakan istilah formal (sememangnya, sewajarnya, menitikberatkan) dan elakkan kata umum.')
    if (banding.sub.variety <= 4) tips.push('Pelbagaikan struktur ayat — selang-selikan ayat pendek dengan ayat majmuk yang menggunakan "kerana", "walaupun", "supaya", "manakala".')
    const minW = chosen?.minWords ?? (paper === 2 ? 200 : 300)
    if (g.words.length < minW) tips.push(`Kembangkan kepada ${minW}+ perkataan untuk huraian yang lebih lengkap.`)
    if (tips.length === 0) tips.push('Cemerlang — semak semula sebelum menghantar.')

    return {
      band,
      subBands: banding.sub,
      metrics: banding.metrics,
      findings,
      errorSummary,
      words: g.words.length, sents: g.sents.length, paras: g.paras.length,
      pw: g.pw, formal: g.formal, avgLen: g.avgLen,
      isMalay: true, paper,
      format: chosen?.id || (format === 'general' ? 'general' : null),
      formatLabel: chosen?.label || (format === 'general' ? 'General' : null),
      formatHints: chosen?.requiredHints || [],
      formatHits: formatFidelity.hits,
      formatMisses: formatFidelity.misses,
      formatConfidence: confidence,
      detectedAuto,
      tips,
    }
  }

  // English (default)
  const g = generalEnglish(text)
  const findings = findIssues(text, { formatId: chosen?.id || null })
  const errorSummary = summariseIssues(findings)
  const banding = bandEnglishCriteria(g, chosen, formatFidelity.hits, errorSummary)
  const band = banding.overall

  const tips = []
  // Accuracy first — actual errors trump everything.
  if (errorSummary.counts.high > 0) {
    tips.push(`Fix ${errorSummary.counts.high} grammar/spelling error${errorSummary.counts.high === 1 ? '' : 's'} flagged below.`)
  }
  if (chosen && formatFidelity.misses.length > 0 && banding.sub.format <= 4) {
    tips.push(`Add format markers: ${formatFidelity.misses.slice(0, 3).join(', ')}`)
  }
  if (banding.sub.cohesion <= 4) tips.push('Use a wider range of discourse markers (furthermore, nevertheless, consequently, in contrast, ultimately).')
  if (banding.sub.vocab <= 4) tips.push('Lift vocabulary precision — replace common words with sharper synonyms; avoid "very/really/just/got/things/stuff".')
  if (banding.sub.variety <= 4) tips.push('Vary sentence length and openings — alternate short punchy sentences with longer complex ones.')
  if (g.sims + g.mets === 0 && (chosen?.id === 'eng-narrative' || chosen?.id === 'eng-descriptive' || chosen?.id === 'eng-article')) {
    tips.push('Add figurative language (similes, metaphors) for sensory impact.')
  }
  const minW = chosen?.minWords ?? 250
  if (g.words.length < minW) tips.push(`Expand to ${minW}+ words to develop ideas fully.`)
  if (tips.length === 0) tips.push('Strong work — proofread for final polish.')

  return {
    band,
    subBands: banding.sub,
    metrics: banding.metrics,
    findings,
    errorSummary,
    words: g.words.length, sents: g.sents.length, paras: g.paras.length,
    sims: g.sims, mets: g.mets, disc: g.disc, vocab: g.vocab, complex: g.complex, avgLen: g.avgLen,
    format: chosen?.id || (format === 'general' ? 'general' : null),
    formatLabel: chosen?.label || (format === 'general' ? 'General' : null),
    formatHints: chosen?.requiredHints || [],
    formatHits: formatFidelity.hits,
    formatMisses: formatFidelity.misses,
    formatConfidence: confidence,
    detectedAuto,
    tips,
  }
}
