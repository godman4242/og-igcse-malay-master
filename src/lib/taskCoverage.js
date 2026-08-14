// Task coverage — "did the student actually answer the question?"
//
// WHY THIS EXISTS. The rule-based grader's `content` sub-band was computed purely
// from word count. Measured against real examiner marks (Gauntlet lane L1,
// docs/gauntlet/L1/): a 174-word script the examiner awarded **Communication 0/10**
// — "This paragraph is not relevant to the question. It demonstrates that candidate
// does not understand the tasks required." — scored `content` **6/6**, the top band,
// because it was long. Length is evidence of EFFORT, never of ANSWERING.
//
// The criterion this feeds is task completion, and the mark scheme describes it in
// those words, never in words about length — Cambridge IGCSE Malay 0546 Paper 4
// specimen mark scheme (from 2028), "Task completion":
//   "All tasks must be completed for full marks to be awarded in 'task completion'."
//   7–9 "Completes most or all tasks. Writing is convincing and relevant."
//   4–6 "Completes some tasks. Writing is occasionally ambiguous or irrelevant."
//   1–3 "Attempts some tasks with some success. Ambiguity or irrelevance compromises
//        meaning."
//   https://www.cambridgeinternational.org/Images/745086-2028-specimen-mark-scheme-paper-4.pdf
//
// ⚠ WHAT THIS IS AND IS NOT. Deciding whether a paragraph *fulfils* a requirement is
// a semantic judgement, and the AI tier already does it properly
// (`buildWritingGradePrompt` emits `task_coverage` / `req_i`, rendered by
// ContentTraitPanel). This module is the FREE tier's honest fallback: a transparent
// keyword check that answers the much narrower question *"is this essay even about
// the things the task asked for?"* — which is exactly the failure above.
//
// It is therefore deliberately LENIENT (a requirement counts as addressed on
// relatively little evidence) and, at the call site, may only ever LOWER the content
// band, never raise it. For a learning tool the safe direction is clear: wrongly
// telling a student they missed a point they made is worse than staying quiet, and
// inflating a grade is worst of all.

// Words that carry no topic. Kept small on purpose — this is a topical-overlap
// check, not a search engine.
const STOP_EN = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'of', 'to', 'in', 'on', 'at', 'for', 'with',
  'from', 'by', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'that', 'this',
  'these', 'those', 'it', 'its', 'their', 'there', 'they', 'them', 'you', 'your', 'about',
  'into', 'over', 'than', 'then', 'so', 'such', 'not', 'no', 'can', 'could', 'would',
  'should', 'may', 'might', 'will', 'shall', 'have', 'has', 'had', 'do', 'does', 'did',
  'what', 'which', 'who', 'whom', 'how', 'when', 'where', 'why', 'all', 'any', 'each',
  'more', 'most', 'some', 'other', 'least', 'two', 'both', 'one', 'least',
])

// The instruction verbs a REQUIREMENT is phrased with. They describe what the marker
// looks for; they never appear in the student's prose, so leaving them in would make
// every requirement look unaddressed.
const RUBRIC_VERBS_EN = new Set([
  'states', 'state', 'gives', 'give', 'suggests', 'suggest', 'engages', 'engage',
  'includes', 'include', 'explains', 'explain', 'describes', 'describe', 'mentions',
  'mention', 'uses', 'use', 'maintains', 'maintain', 'develops', 'develop', 'ends',
  'end', 'opens', 'open', 'clear', 'clearly', 'developed', 'least', 'appropriate',
])

const STOP_MS = new Set([
  'dan', 'atau', 'yang', 'itu', 'ini', 'di', 'ke', 'dari', 'daripada', 'kepada', 'pada',
  'untuk', 'dengan', 'adalah', 'ialah', 'akan', 'telah', 'sudah', 'tidak', 'bukan',
  'juga', 'serta', 'oleh', 'dalam', 'anda', 'saya', 'kami', 'kita', 'mereka', 'sebagai',
  'agar', 'supaya', 'kerana', 'jika', 'apabila', 'contoh', 'sekurang', 'kurangnya',
  'dua', 'satu', 'lebih', 'sangat', 'amat', 'pula', 'sahaja', 'iaitu', 'bagi',
])

const RUBRIC_VERBS_MS = new Set([
  'menyatakan', 'menjelaskan', 'mencadangkan', 'mengekalkan', 'menggunakan',
  'memberikan', 'menerangkan', 'menyebut', 'menyenaraikan', 'jelas', 'konkrit',
  'sepanjang', 'khususnya',
])

// Light Malay stemmer — enough to match an affixed form against a bare root
// ("permainan" → "main", "bermain" → "main"). Deliberately conservative: a strip is
// only accepted when a real root remains, so "makan" never becomes "mak".
const MS_PREFIXES = ['menyeng', 'mempers', 'memper', 'menge', 'meng', 'meny', 'mem', 'men', 'me',
  'pemper', 'peng', 'peny', 'pem', 'pen', 'per', 'pe', 'ber', 'bel', 'be', 'ter', 'di', 'se', 'ke']
const MS_SUFFIXES = ['kannya', 'annya', 'kan', 'an', 'nya', 'i']
const MIN_ROOT = 4

export function malayStem(word) {
  let w = word
  for (const suf of MS_SUFFIXES) {
    if (w.length - suf.length >= MIN_ROOT && w.endsWith(suf)) { w = w.slice(0, -suf.length); break }
  }
  for (const pre of MS_PREFIXES) {
    if (w.length - pre.length >= MIN_ROOT && w.startsWith(pre)) { w = w.slice(pre.length); break }
  }
  return w
}

const tokenise = (s) => String(s).toLowerCase().match(/[\p{L}\p{N}]+/gu) || []

const normFor = (lang) => (lang === 'malay' ? malayStem : (w) => w)

/** The topic-bearing words of one requirement, normalised for matching. */
export function keyTermsOf(requirement, lang) {
  const stop = lang === 'malay' ? STOP_MS : STOP_EN
  const verbs = lang === 'malay' ? RUBRIC_VERBS_MS : RUBRIC_VERBS_EN
  const norm = normFor(lang)
  const seen = new Set()
  for (const t of tokenise(requirement)) {
    if (t.length < 4 || stop.has(t) || verbs.has(t)) continue
    seen.add(norm(t))
  }
  return [...seen]
}

// Below this share of the task's topic vocabulary, an essay is not plausibly about
// the task at all. Deliberately far below any on-topic answer rather than tuned to
// sit between two samples — see ON_TOPIC_THRESHOLD's test for the measured gap.
export const ON_TOPIC_THRESHOLD = 0.12

/**
 * Is this essay even about the task it was set?
 *
 * ⚠ This is deliberately NOT a graded "how many requirements did they fulfil" score.
 * Two of the four requirements on a typical task are RHETORICAL ("gives at least two
 * developed reasons", "engages a student-magazine audience") rather than topical, and
 * no keyword check can judge those — attempting it produced false "missing" verdicts
 * on a genuinely on-topic essay during development. Since the caller may only LOWER a
 * band with this, a false negative is an unfair penalty, so the question is narrowed
 * to the one thing keywords CAN answer: on-topic or not.
 *
 * `requirementHints` is advisory only — surfaced as "you may not have covered…"
 * feedback, never fed into the band. Fulfilment scoring belongs to the AI tier
 * (`buildWritingGradePrompt` → `task_coverage`).
 *
 * @param {string} text
 * @param {{prompt?: string, requirements?: string[]}} task
 * @param {'malay'|'eng'} lang
 */
export function taskCoverage(text, task, lang) {
  const prompt = task?.prompt || ''
  const reqs = Array.isArray(task?.requirements) ? task.requirements : []
  if (!text || (!prompt && reqs.length === 0)) {
    return { ratio: 1, onTopic: true, checkable: false, requirementHints: [] }
  }

  const norm = normFor(lang)
  const essay = new Set(tokenise(text).map(norm))

  // The task's topic vocabulary — everything distinctive the prompt and its
  // requirements are ABOUT, pooled.
  const topic = new Set([...keyTermsOf(prompt, lang), ...reqs.flatMap((r) => keyTermsOf(r, lang))])
  if (topic.size === 0) {
    return { ratio: 1, onTopic: true, checkable: false, requirementHints: [] }
  }

  const hits = [...topic].filter((t) => essay.has(t)).length
  const ratio = hits / topic.size

  // Advisory per-requirement hints — never scored.
  const requirementHints = reqs
    .map((req, i) => {
      const terms = keyTermsOf(req, lang)
      if (terms.length === 0) return -1
      return terms.some((t) => essay.has(t)) ? -1 : i
    })
    .filter((i) => i >= 0)

  return { ratio, onTopic: ratio >= ON_TOPIC_THRESHOLD, checkable: true, requirementHints }
}

/**
 * The highest `content` band an off-topic essay can honestly reach.
 *
 * A single conservative guard rather than a graded scale, because "is it on topic"
 * is the only question this evidence can answer. Band 3 is the mark scheme's own
 * bottom-band wording — "Attempts some tasks with some success. Ambiguity or
 * irrelevance compromises meaning."
 */
export function contentCeilingForCoverage(cov) {
  if (!cov || !cov.checkable || cov.onTopic) return 6
  return 3
}
