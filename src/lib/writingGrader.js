// Format-aware writing grader. Replaces the old analyzeEnglish / analyzeMalay
// functions in Writing.jsx. Each format has marker phrases and structural
// hints; the auto-detect mode picks the format whose markers fire hardest,
// and `general` skips structural penalties.
//
// The result shape is a superset of the legacy analyzers so the existing
// Writing.jsx render code keeps working unchanged.

import { DISC_EN, FORM_EN, SIM_RE, MET_RE, PW_ML, FORM_ML, SUBORD_EN, SUBORD_PREP_EN, SIMPLE_EN, SUBORD_ML, SUBORD_PREP_ML, SIMPLE_ML } from '../data/writing'
import { findIssues, summariseIssues } from './writingErrors'
import { findIssuesMalay, summariseIssuesMalay } from './writingErrorsMalay'
import { FORMATS, FORMATS_BY_ID, listFormats } from './writingFormats'
import { taskCoverage, contentCeilingForCoverage } from './taskCoverage'

// Minimum sentences before the top "Range / sentence variety" bands can be
// credited. See the evidence-floor note in bandMalayCriteria for the mark-scheme
// wording this enforces ("frequently", "a wide range").
export const MIN_SENTS_FOR_RANGE = 6

const re = (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'), 'i')
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Whole word or phrase; a space in the phrase matches any run of whitespace.
const wordRe = (s) => new RegExp('\\b' + esc(s).replace(/ /g, '\\s+') + '\\b', 'i')

// Linking words used AS clause links. Whole words, and a hyphen belongs to the word
// ("bila" must not match "bila-bila"). The SUBORD_PREP_* words double as prepositions or
// adverbs — "after school", "selepas itu" — so they count only where a clause follows:
// English, a subject pronoun / "there" / an -ing verb ("after he left", "after leaving");
// Malay, anything but "itu"/"ini". (A clause led by a noun — "until the bus arrives" —
// is missed: under-crediting is the safe side for a grader that may only mislead upward.)
const linkRe = (words, follow = '') =>
  new RegExp(`(?:^|[^\\w-])(${words.map(esc).join('|')})(?![\\w-])${follow}`, 'gi')
const CLAUSE_LINKS = {
  eng: [linkRe(SUBORD_EN), linkRe(SUBORD_PREP_EN, '(?=\\s+(?:I|you|he|she|it|we|they|there|\\w+ing)\\b)')],
  malay: [linkRe(SUBORD_ML), linkRe(SUBORD_PREP_ML, '(?!\\s+(?:itu|ini)\\b)')],
}
const SIMPLE = { eng: linkRe(SIMPLE_EN), malay: linkRe(SIMPLE_ML) }
const linksIn = (text, res) => new Set(res.flatMap((r) => [...text.matchAll(r)].map((m) => m[1].toLowerCase())))

// A sentence is complex/compound when it carries a clause link (above), "because" /
// "kerana", a relative pronoun / coordinating contrast, a semicolon, or two commas. The old lists missed
// "when", "if", "sebelum", "ketika" — the commonest subordinators — so ordinary complex
// sentences scored as simple. Mark scheme (0546 2028 Range 7–9 / 0510 2024 Language
// 7–9): "Uses a wide range of simple and complex structures".
const COMPLEX_EXTRA = {
  eng: /(,.*,|;|\b(?:because|despite|which|who|whom|whose)\b)/i,
  malay: /(,.*,|;|\b(?:kerana|tetapi|sambil|seraya|manakala)\b)/i,
}
const isComplex = (sentence, lang) => COMPLEX_EXTRA[lang].test(sentence) || linksIn(sentence, CLAUSE_LINKS[lang]).size > 0

// Distinct linking devices: essay markers ∪ clause links, + ONE for any simple
// connector (and/but/because · dan/tetapi/kerana…) — see SIMPLE_* in data/writing.js.
const linkingTypes = (text, markers, lang) =>
  new Set([...markers, ...linksIn(text, CLAUSE_LINKS[lang])]).size + (linksIn(text, [SIMPLE[lang]]).size > 0 ? 1 : 0)

// Weighted overall, computed in whole hundredths so an exact x.5 rounds UP. As a
// float sum, 0.15 and 0.1 are inexact: 6/6/4/6/6/4 summed to 5.499999999999999 and
// Math.round() gave 5 — 85 of the 782 reachable exact-half sub-band sets (each 2–6)
// rounded the wrong way. Weights reflect IGCSE mark scheme priorities (content & accuracy heaviest).
export function overallBand({ content, accuracy, vocab, variety, cohesion, format }) {
  return Math.round((content * 25 + accuracy * 25 + vocab * 20 + variety * 15 + cohesion * 10 + format * 5) / 100)
}

// Re-export so any caller still doing `import ... from '../lib/writingGrader'`
// keeps working. New callers that only need the catalogue should import
// from './writingFormats' directly to avoid pulling the full grader.
export { FORMATS, FORMATS_BY_ID, listFormats }


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
  const disc = DISC_EN.filter(w => wordRe(w).test(text))
  const vocab = FORM_EN.filter(w => wordRe(w).test(text))
  const complex = sents.filter(s => isComplex(s, 'eng')).length
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

  // Linking-device DIVERSITY (unique types, not raw count) — prevents spam.
  const discDiversity = linkingTypes(text, disc, 'eng')

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

const MS_SOPHISTICATED = /\b(?:meskipun|walaupun|kendatipun|walhasil|bahkan|malahan|namun|justeru|melainkan|sungguhpun|sungguh|walaupun begitu|sehubungan|berdasarkan|memandangkan|berpandukan|seterusnya|sememangnya|sewajarnya|seharusnya|seyogianya|tatkala|manakala|seraya|sambil|menerusi|melalui|dengan demikian|dengan itu|oleh hal yang demikian|hasilnya)\b/gi

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

  // Linking-device DIVERSITY — penanda wacana (PW_ML) + kata hubung.
  const pwDiversity = linkingTypes(text, pw, 'malay')

  // Sentence opener variety
  const openers = sents.map(s => (s.trim().split(/\s+/)[0] || '').toLowerCase()).filter(Boolean)
  const openerCounts = {}
  for (const o of openers) openerCounts[o] = (openerCounts[o] || 0) + 1
  const maxOpenerCount = Math.max(0, ...Object.values(openerCounts))
  const openerVariety = openers.length ? 1 - maxOpenerCount / openers.length : 1

  // Complex / compound sentence ratio
  const complex = sents.filter(s => isComplex(s, 'malay')).length
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
function bandEnglishCriteria(g, format, formatHits, errorSummary, contentCeiling = 6) {
  const wlen = g.words.length
  const minW = format?.minWords ?? 250
  const errPer100 = wlen > 0 ? (errorSummary.counts.high * 100) / wlen : 0
  const allErrPer100 = wlen > 0 ? ((errorSummary.counts.high + errorSummary.counts.medium) * 100) / wlen : 0

  // ── Content & development band — driven by word count vs format target.
  // Length thresholds in whole percent: as floats, 200 × 1.1 is 220.00000000000003, so
  // a 220-word answer to any 200-word format missed content 6.
  const atLeastPct = (p) => wlen * 100 >= minW * p
  // Top length credit = a 10% cushion over the minimum — unless the syllabus range is
  // too tight to hold it. 0546 Q3 is "antara 130–140 patah perkataan" (2028 specimen):
  // 130 × 1.1 = 143 is ABOVE the maximum, so compliant work could never reach 6.
  const cushion = minW * 110 <= (format?.maxWords ?? Infinity) * 100 ? 110 : 100
  let content
  if (atLeastPct(cushion) && g.paras.length >= 3) content = 6
  else if (atLeastPct(100) && g.paras.length >= 3) content = 5
  else if (atLeastPct(80) && g.paras.length >= 2) content = 4
  else if (atLeastPct(50)) content = 3
  else content = 2
  // …then capped by how much of the TASK the essay actually engages with. Length is
  // evidence of effort, never of answering. See taskCoverage.js for the mark-scheme
  // wording and why this may only ever lower the band. No task → ceiling 6 → no-op.
  content = Math.min(content, contentCeiling)

  // ── Accuracy band — driven by error density (high-severity weighted heavily).
  let accuracy
  if (errPer100 < 0.5 && allErrPer100 < 1.5) accuracy = 6
  else if (errPer100 < 1) accuracy = 5
  else if (errPer100 < 2) accuracy = 4
  else if (errPer100 < 4) accuracy = 3
  else accuracy = 2

  // ── Vocabulary range band — TTR (range: how little is repeated) + long-word ratio
  // ("less common" words). Stop-word-removed TTR. NOT gated on the formal-word list:
  // 0510 Language 7–9 credits "a wide range of COMMON and less common vocabulary",
  // and an informal email scored 0 formal words and fell to band 3 — the "only
  // common vocabulary" band — at a TTR of 0.86. FORM_EN still feeds tips + metrics.
  // Level 4 still needs SOME less-common word — a formal/sophisticated one, or the
  // long-word share level 5 asks for: 0510 4–6 "attempts to use some less common
  // vocabulary" vs 1–3 "Uses only common vocabulary".
  const formalCount = g.vocab.length + g.sophisticated
  let vocab
  if (g.ttr >= 0.55 && g.longWordRatio >= 0.18) vocab = 6
  else if (g.ttr >= 0.5 && g.longWordRatio >= 0.14) vocab = 5
  else if (g.ttr >= 0.4 && (formalCount >= 1 || g.longWordRatio >= 0.14)) vocab = 4
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

  // ── Overall: weighted average (overallBand), then capped by accuracy.
  let overall = overallBand({ content, accuracy, vocab, variety, cohesion, format: formatBand })

  // Hard cap: if accuracy is very low, overall cannot exceed accuracy + 1.
  if (overall > accuracy + 1) overall = accuracy + 1

  // Hard cap: if content is far below format minimum, overall is capped at content.
  if (!atLeastPct(60)) overall = Math.min(overall, content)

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
function bandMalayCriteria(g, format, formatHits, errorSummary, paper, contentCeiling = 6) {
  const wlen = g.words.length
  const minW = format?.minWords ?? (paper === 2 ? 200 : 300)
  const errPer100 = wlen > 0 ? (errorSummary.counts.high * 100) / wlen : 0
  const allErrPer100 = wlen > 0 ? ((errorSummary.counts.high + errorSummary.counts.medium) * 100) / wlen : 0

  // Content & development
  // Length thresholds in whole percent: as floats, 200 × 1.1 is 220.00000000000003, so
  // a 220-word answer to any 200-word format missed content 6.
  const atLeastPct = (p) => wlen * 100 >= minW * p
  // Top length credit = a 10% cushion over the minimum — unless the syllabus range is
  // too tight to hold it. 0546 Q3 is "antara 130–140 patah perkataan" (2028 specimen):
  // 130 × 1.1 = 143 is ABOVE the maximum, so compliant work could never reach 6.
  const cushion = minW * 110 <= (format?.maxWords ?? Infinity) * 100 ? 110 : 100
  let content
  if (atLeastPct(cushion) && g.paras.length >= 3) content = 6
  else if (atLeastPct(100) && g.paras.length >= 3) content = 5
  else if (atLeastPct(80) && g.paras.length >= 2) content = 4
  else if (atLeastPct(50)) content = 3
  else content = 2
  // …then capped by how much of the TASK the essay actually engages with. Length is
  // evidence of effort, never of answering. See taskCoverage.js for the mark-scheme
  // wording and why this may only ever lower the band. No task → ceiling 6 → no-op.
  content = Math.min(content, contentCeiling)

  // Accuracy
  let accuracy
  if (errPer100 < 0.5 && allErrPer100 < 1.5) accuracy = 6
  else if (errPer100 < 1) accuracy = 5
  else if (errPer100 < 2) accuracy = 4
  else if (errPer100 < 4) accuracy = 3
  else accuracy = 2

  // Vocabulary range — TTR (repetition) + long-word ratio (≥8 letters ≈ affixed,
  // not merely straightforward words). NOT gated on the formal-word list: 0546 Range
  // 7–9 asks for "a wide range of vocabulary APPROPRIATE TO THE TASK(S)", and 1–3 is
  // "repeated use of a small range" — repetition, which TTR measures. Three scripts an
  // examiner gave 10/10 for "Range, Variety and Appropriateness" (2017
  // booklet) used 3, 0 and 1 FORM_ML words; for a letter to a friend
  // or a story, formal-essay vocabulary would be the INappropriate choice.
  // Level 4 still needs SOME less-common word (formal, or the level-5 long-word share):
  // 0546 1–3 "Relies on repeated use of a small range of straightforward vocabulary".
  const formalCount = g.formal.length + g.sophisticated
  let vocab
  if (g.ttr >= 0.55 && g.longWordRatio >= 0.22) vocab = 6
  else if (g.ttr >= 0.5 && g.longWordRatio >= 0.18) vocab = 5
  else if (g.ttr >= 0.4 && (formalCount >= 1 || g.longWordRatio >= 0.18)) vocab = 4
  else if (g.ttr >= 0.3) vocab = 3
  else vocab = 2

  // Sentence variety
  let variety
  if (g.sentLenStd >= 6 && g.complexRatio >= 0.35 && g.openerVariety >= 0.7) variety = 6
  else if (g.sentLenStd >= 4 && g.complexRatio >= 0.25 && g.openerVariety >= 0.6) variety = 5
  else if (g.sentLenStd >= 3 && g.complexRatio >= 0.15) variety = 4
  else if (g.sentLenStd >= 2) variety = 3
  else variety = 2
  // ⚠ EVIDENCE FLOOR — the top Range bands describe a QUANTITY of demonstration.
  // Cambridge IGCSE Malay 0546 Paper 4 specimen mark scheme (from 2028), "Range":
  //   7–9 "Uses extended, well-linked sentences FREQUENTLY and appropriately. Uses a
  //        WIDE RANGE of simple and complex structures to produce sentences of
  //        varying length."
  //   4–6 "Uses SOME extended sentences… ATTEMPTS to use some complex structures."
  //   https://www.cambridgeinternational.org/Images/745086-2028-specimen-mark-scheme-paper-4.pdf
  // "Frequently" and "a wide range" cannot be evidenced in a handful of sentences,
  // and the underlying signals here (length standard deviation, opener variety) are
  // statistical noise at tiny counts — three erratic run-on sentences produce a HIGH
  // standard deviation and score as "varied". Measured in Gauntlet lane L1: a 69-word,
  // 4-sentence script the examiner marked 11/30 scored variety 5, while a 225-word,
  // 22-sentence script the examiner marked 30/30 scored variety 3 — inverted.
  // So below the evidence floor, cap at the mark scheme's middle band ("some…
  // attempts"), which is the most that can honestly be claimed. The floor sits below
  // the sentence count of a syllabus-length answer (130–140 words ≈ 7–9 sentences),
  // so a compliant answer is never capped by it.
  if (g.sents.length < MIN_SENTS_FOR_RANGE) variety = Math.min(variety, 4)

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

  let overall = overallBand({ content, accuracy, vocab, variety, cohesion, format: formatBand })
  if (overall > accuracy + 1) overall = accuracy + 1
  if (!atLeastPct(60)) overall = Math.min(overall, content)
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

export function score(text, { lang, format = 'auto', paper = 2, task = null } = {}) {
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

  // Task coverage — the honest ceiling on `content`. Absent a task there is nothing
  // to check, so the ceiling is 6 and behaviour is byte-identical to before.
  const coverage = task ? taskCoverage(text, task, lang === 'malay' ? 'malay' : 'eng') : null
  const contentCeiling = contentCeilingForCoverage(coverage)

  if (lang === 'malay') {
    const g = generalMalay(text)
    const findings = findIssuesMalay(text, { formatId: chosen?.id || null })
    const errorSummary = summariseIssuesMalay(findings)
    const banding = bandMalayCriteria(g, chosen, formatFidelity.hits, errorSummary, paper, contentCeiling)
    // An essay that is not about the task cannot out-score its own task-completion.
    // Mirrors the under-length cap below (overall = min(overall, content)) — same idiom,
    // same reason. Mark scheme: "All tasks must be completed for full marks to be
    // awarded in 'task completion'" · bottom band "Ambiguity or irrelevance compromises
    // meaning". No task, or on-topic → untouched.
    const band = coverage && coverage.checkable && !coverage.onTopic
      ? Math.min(banding.overall, banding.sub.content)
      : banding.overall

    const tips = []
    if (errorSummary.counts.high > 0) {
      tips.push(`Betulkan ${errorSummary.counts.high} kesalahan tatabahasa/ejaan yang ditandakan di bawah.`)
    }
    if (chosen && formatFidelity.misses.length > 0 && banding.sub.format <= 4) {
      tips.push(`Tambah penanda format: ${formatFidelity.misses.slice(0, 3).join(', ')}`)
    }
    if (banding.sub.cohesion <= 4) tips.push('Gunakan lebih banyak penanda wacana dan kata hubung (kerana, walaupun, apabila, selain itu, oleh itu).')
    if (banding.sub.vocab <= 4) tips.push('Tingkatkan kosa kata — elakkan mengulang perkataan yang sama; gunakan kata yang lebih tepat dan sesuai dengan tugasan.')
    if (banding.sub.variety <= 4) tips.push('Pelbagaikan struktur ayat — selang-selikan ayat pendek dengan ayat majmuk yang menggunakan "kerana", "walaupun", "supaya", "manakala".')
    const minW = chosen?.minWords ?? (paper === 2 ? 200 : 300)
    if (g.words.length < minW) tips.push(`Kembangkan kepada ${minW}+ perkataan untuk huraian yang lebih lengkap.`)
    if (tips.length === 0) tips.push('Cemerlang — semak semula sebelum menghantar.')

    return {
      band,
      subBands: banding.sub,
      taskCoverage: coverage,
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
  const banding = bandEnglishCriteria(g, chosen, formatFidelity.hits, errorSummary, contentCeiling)
  // An essay that is not about the task cannot out-score its own task-completion.
  // Mirrors the under-length cap below (overall = min(overall, content)) — same idiom,
  // same reason. Mark scheme: "All tasks must be completed for full marks to be
  // awarded in 'task completion'" · bottom band "Ambiguity or irrelevance compromises
  // meaning". No task, or on-topic → untouched.
  const band = coverage && coverage.checkable && !coverage.onTopic
    ? Math.min(banding.overall, banding.sub.content)
    : banding.overall

  const tips = []
  // Accuracy first — actual errors trump everything.
  if (errorSummary.counts.high > 0) {
    tips.push(`Fix ${errorSummary.counts.high} grammar/spelling error${errorSummary.counts.high === 1 ? '' : 's'} flagged below.`)
  }
  if (chosen && formatFidelity.misses.length > 0 && banding.sub.format <= 4) {
    tips.push(`Add format markers: ${formatFidelity.misses.slice(0, 3).join(', ')}`)
  }
  if (banding.sub.cohesion <= 4) tips.push('Link your ideas with a wider range of linking words (because, although, when, however, therefore).')
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
    taskCoverage: coverage,
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
