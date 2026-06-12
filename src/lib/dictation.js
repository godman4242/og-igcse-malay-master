// Dictation study mode — pure helpers (no DOM/TTS). The learner hears a sentence
// and types it back; we score the typed text against the reference word-by-word.
//
// Corpus: the Paper-4 `listeningPassages` (bilingual, curated, audio-designed)
// split into individual sentences — no new content authored, so no native-speaker
// risk. Scoring is LCS-based (longest common subsequence of words) so a single
// dropped word does NOT shift-penalise every later word: recall = matched
// reference words / total reference words. Extra inserted words are ignored in v1
// (recall-only) — see RESUME/spec for the veto note.

// 3+ words = a meaningful dictation unit; this only drops 1-2 word fragments
// ("Yes.", "Thank you.") that aren't worth a dictation turn.
const MIN_WORDS = 3

// Match runs of non-terminator chars followed by optional .!? — avoids regex
// lookbehind (broader engine support) while keeping the terminator on each sentence.
export function splitIntoSentences(text) {
  if (typeof text !== 'string') return []
  return (text.match(/[^.!?]+[.!?]*/g) || [])
    .map(s => s.trim())
    .filter(s => s.split(/\s+/).filter(Boolean).length >= MIN_WORDS)
}

// Flatten the passages of one language into tagged dictation items.
export function buildDictationSet(passages, lang) {
  const pool = (Array.isArray(passages) ? passages : [])
    .filter(p => p?.lang === lang && typeof p.text === 'string')
  const items = []
  for (const p of pool) {
    for (const sentence of splitIntoSentences(p.text)) {
      items.push({ sentence, lang: p.lang, passageId: p.id, title: p.title })
    }
  }
  return items
}

// Pick up to `count` items for a language, shuffled via an injected rand so it's
// deterministic in tests and free of Math.random in render.
export function pickDictationItems(passages, lang, count = 5, rand = Math.random) {
  const shuffled = buildDictationSet(passages, lang)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}

// Same character set as pronunciation.js normalize() — keeps hyphenated /
// reduplicated words (kanak-kanak) as single tokens; only sentence punctuation
// and case are neutralised.
function normalize(text) {
  return String(text ?? '').toLowerCase().replace(/[.,!?;:'"()]/g, '').replace(/\s+/g, ' ').trim()
}

// Which reference-word indices appear in the LCS alignment with the hypothesis.
function lcsMatchedRefIndices(ref, hyp) {
  const m = ref.length, n = hyp.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = ref[i - 1] === hyp[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const matched = new Set()
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (ref[i - 1] === hyp[j - 1]) { matched.add(i - 1); i--; j-- }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--
    else j--
  }
  return matched
}

// Score typed dictation against the reference. Returns per-reference-word marks
// (ok = reproduced in order), the count matched, the total, and a recall %.
export function scoreDictation(correct, typed) {
  const ref = normalize(correct).split(' ').filter(Boolean)
  const hyp = normalize(typed).split(' ').filter(Boolean)
  if (!ref.length) return { words: [], correct: 0, total: 0, pct: 0 }
  const matched = lcsMatchedRefIndices(ref, hyp)
  return {
    words: ref.map((w, idx) => ({ word: w, ok: matched.has(idx) })),
    correct: matched.size,
    total: ref.length,
    pct: Math.round((matched.size / ref.length) * 100),
  }
}
