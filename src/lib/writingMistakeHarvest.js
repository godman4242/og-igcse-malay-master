// Pure transform: turn a grader result `r` into the batch of mistake
// records that `logMistakeBatch` expects. Extracted from Writing.jsx so
// the field-mapping is testable in isolation.
//
// Inputs:
//   r       — output of `score(...)` from writingGrader.js (may have
//             optional `feedback` payload from the Claude AI path).
//   lang    — 'eng' | 'malay' (page-level lang toggle).
//   format  — currently selected format string (or 'auto'/'general').
//
// Output:
//   Array<MistakeRecord> — empty array when there is nothing to report.
//   The caller is responsible for invoking `logMistakeBatch(batch)`.

export function harvestMistakesFromGrade(r, { lang, format } = {}) {
  if (!r) return []
  const language = lang === 'eng' ? 'en' : 'ms'
  const formatId = r.format || (typeof format === 'string' ? format : 'auto')
  const batch = []

  // Sentence-level errors from Claude's `feedback.sentences[]`.
  for (const s of r.feedback?.sentences || []) {
    for (const err of s.errors || []) {
      const errType = (err.type || 'other').toLowerCase()
      const category = errType === 'imbuhan' ? 'imbuhan'
        : errType === 'tense' ? 'tense'
        : errType === 'spelling' ? 'spelling'
        : errType === 'register' ? 'register'
        : errType === 'cohesion' ? 'cohesion'
        : 'other'
      batch.push({
        type: 'writing',
        source: formatId,
        language,
        category,
        severity: err.severity === 'high' ? 'high' : 'med',
        surface: s.text || '',
        word: err.snippet || '',
        given: err.snippet || '',
        correct: err.fix || '',
        correction: s.improved || '',
        note: err.issue || '',
      })
    }
  }

  // Imbuhan analysis (Malay only). Ignore entries missing either side
  // of the correction so we don't pollute the journal with blanks.
  for (const item of r.feedback?.imbuhanAnalysis?.incorrect || []) {
    const used = item.used || ''
    const fix = item.correct || item.suggested || ''
    if (!used || !fix) continue
    batch.push({
      type: 'writing',
      source: formatId,
      language: 'ms',
      category: 'imbuhan',
      severity: 'med',
      word: used,
      given: used,
      correct: fix,
      note: item.note || 'Imbuhan form needs review',
    })
  }

  return batch
}

// AI-grade improvements (Gemini's `aiResponse.improvements[]`) flow into
// the same mistake stream so the journal sees rule-based + AI feedback
// as one unified feed. Severity scales with the AI band.
export function harvestAIImprovements(aiResponse, { format }) {
  if (!Array.isArray(aiResponse?.improvements)) return []
  const severity = (aiResponse.band ?? 6) <= 3 ? 'high' : 'med'
  return aiResponse.improvements.map(imp => ({
    type: 'writing',
    source: format || 'eng-general',
    language: 'en',
    category: 'cohesion',
    severity,
    word: '',
    surface: typeof imp === 'string' ? imp.slice(0, 140) : '',
    note: typeof imp === 'string' ? imp : '',
  }))
}
