// Exam-rehearsal passage selection (Issue 4a).
//
// A rehearsal needs a comprehension passage with at least 4 questions. The old
// picker chose 60/40 MS/EN at random every run, so a learner could never drill
// ONE subject. These helpers filter the pool to a single language; the UI adds a
// Malay/English toggle on top. Pure + rand-injectable so they're unit-testable
// and free of Math.random in render.

export function eligiblePassages(passages, lang) {
  const base = (Array.isArray(passages) ? passages : []).filter(p => p?.questions?.length >= 4)
  if (lang === 'ms' || lang === 'en') return base.filter(p => p.lang === lang)
  return base
}

// Pick a random eligible passage in the chosen language. Returns null when that
// language has none — the caller surfaces that rather than silently crossing
// languages, which would re-create the uncontrolled mix this fix removes.
export function pickRehearsalPassage(passages, lang, rand = Math.random) {
  const pool = eligiblePassages(passages, lang)
  if (!pool.length) return null
  return pool[Math.floor(rand() * pool.length)]
}
