// Format-aware writing grader. Replaces the old analyzeEnglish / analyzeMalay
// functions in Writing.jsx. Each format has marker phrases and structural
// hints; the auto-detect mode picks the format whose markers fire hardest,
// and `general` skips structural penalties.
//
// The result shape is a superset of the legacy analyzers so the existing
// Writing.jsx render code keeps working unchanged.

import { DISC_EN, FORM_EN, SIM_RE, MET_RE, PW_ML, FORM_ML } from '../data/writing'

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

function generalEnglish(text) {
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const sents = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const paras = text.split(/\n\s*\n+/).filter(p => p.trim().length > 0)
  const sims = (text.match(SIM_RE) || []).length
  const mets = (text.match(MET_RE) || []).length
  const disc = DISC_EN.filter(w => wordRe(w.replace(/ /g, '\\s+')).test(text))
  const vocab = FORM_EN.filter(w => wordRe(w).test(text))
  const complex = sents.filter(s => /(,.*,|although|despite|whereas|whilst|which\s|who\s|;)/i.test(s)).length
  const avgLen = sents.length > 0 ? Math.round(words.length / sents.length) : 0
  return { words, sents, paras, sims, mets, disc, vocab, complex, avgLen }
}

function generalMalay(text) {
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const sents = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const paras = text.split(/\n\s*\n+/).filter(p => p.trim().length > 0)
  const pw = PW_ML.filter(w => re(w).test(text))
  const formal = FORM_ML.filter(w => wordRe(w).test(text))
  const avgLen = sents.length > 0 ? Math.round(words.length / sents.length) : 0
  return { words, sents, paras, pw, formal, avgLen }
}

// ─────────────────────── Bands ───────────────────────

function bandEnglish(g, format, format_hits) {
  const wlen = g.words.length
  const minW = format?.minWords ?? 200
  const fok = format ? format_hits.length >= 2 : true
  if (wlen >= 250 && g.disc.length >= 3 && g.vocab.length >= 3
      && g.complex >= g.sents.length * 0.3 && (g.sims + g.mets) > 0
      && g.avgLen > 15 && fok) return 6
  if (wlen >= minW && g.disc.length >= 2 && g.vocab.length >= 2 && fok) return 5
  if (wlen >= minW * 0.85 && g.disc.length >= 1) return 4
  return 3
}

function bandMalay(g, format, format_hits, paper) {
  const minW = format?.minWords ?? (paper === 2 ? 200 : 300)
  const fok = format ? format_hits.length >= 2 : true
  if (g.words.length >= minW && g.pw.length >= 4 && g.formal.length >= 3 && fok) return 6
  if (g.words.length >= minW * 0.8 && g.pw.length >= 3 && fok) return 5
  if (g.words.length >= minW * 0.7 && g.pw.length >= 2) return 4
  return 3
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
    const band = bandMalay(g, chosen, formatFidelity.hits, paper)
    const tips = []
    if (chosen && formatFidelity.misses.length > 0) {
      tips.push(`Tambah penanda format: ${formatFidelity.misses.slice(0, 3).join(', ')}`)
    }
    if (g.pw.length < 4) tips.push('Tambah penanda wacana (selain itu, walau bagaimanapun, dll.)')
    if (g.formal.length < 3) tips.push('Guna kosa kata formal')
    const minW = chosen?.minWords ?? (paper === 2 ? 200 : 300)
    if (g.words.length < minW) tips.push(`Kembangkan kepada ${minW}+ perkataan`)
    if (tips.length === 0) tips.push('Bagus! Semak ejaan dan tatabahasa.')
    return {
      band,
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
  const band = bandEnglish(g, chosen, formatFidelity.hits)
  const tips = []
  if (chosen && formatFidelity.misses.length > 0) {
    tips.push(`Add format markers: ${formatFidelity.misses.slice(0, 3).join(', ')}`)
  }
  if (g.disc.length < 3) tips.push('Add more discourse markers (furthermore, however, etc.)')
  if (g.vocab.length < 3) tips.push('Use more formal vocabulary')
  if (g.sims + g.mets === 0 && (chosen?.id === 'eng-narrative' || chosen?.id === 'eng-descriptive' || chosen?.id === 'eng-article')) {
    tips.push('Add figurative language (similes, metaphors)')
  }
  const minW = chosen?.minWords ?? 250
  if (g.words.length < minW) tips.push(`Expand to ${minW}+ words`)
  if (tips.length === 0) tips.push('Excellent writing! Proofread for final polish.')

  return {
    band,
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
