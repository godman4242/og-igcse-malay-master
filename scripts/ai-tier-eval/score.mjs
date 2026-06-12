// Objective scoring helpers — turn judge verdicts (booleans) into the metrics
// that drive the decision. No opinions here, just counts.
//
// Two writing metrics:
//   • error-recall   = planted errors the tier's feedback caught / total planted
//   • false-positive = corrections the tier made to text that was actually correct
// Two Cikgu metrics:
//   • fact-recall    = key facts present in the answer / total key facts
//   • wrong-fact     = incorrect claims the answer made
//
// Plus a JUDGE-AUDIT cross-check for the FREE writing tier: deterministic
// span-overlap (does a free finding's char range overlap a planted error's
// range?) is computed WITHOUT the LLM. If the judge's "caught" for the free tier
// disagrees with span-overlap, the judge is suspect — surfaced in the spot-check.

export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd
}

// For each planted error, did any free-tier finding overlap its char span?
// Deterministic, no model. Returns booleans aligned to plantedErrors order,
// plus the findings that overlapped NOTHING planted (free-tier extra flags).
export function freeSpanCoverage(essayText, findings, plantedErrors) {
  const spans = plantedErrors.map((e) => {
    const start = essayText.indexOf(e.span)
    return start === -1 ? null : { start, end: start + e.span.length }
  })
  const bySpan = spans.map((sp) => {
    if (!sp) return false
    return findings.some((f) => overlaps(f.start, f.end, sp.start, sp.end))
  })
  const extraFindings = findings.filter(
    (f) => !spans.some((sp) => sp && overlaps(f.start, f.end, sp.start, sp.end)),
  )
  return { bySpan, extraFindings }
}

// Did indexOf find every planted span? (gold-set integrity check — a false here
// means a span typo in the gold file.)
export function verifyGoldSpans(essayText, plantedErrors) {
  return plantedErrors
    .filter((e) => essayText.indexOf(e.span) === -1)
    .map((e) => e.span)
}

export const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
export const sum = (arr) => arr.reduce((a, b) => a + b, 0)
export const pct = (x) => `${(x * 100).toFixed(1)}%`

// Aggregate writing recall/FP across the per-essay records of ONE tier.
// caughtFlags: array of arrays of booleans (one inner array per essay).
// fpCounts: array of numbers (false positives per essay).
export function aggregateWriting(caughtFlags, fpCounts) {
  const allCaught = caughtFlags.flat()
  const totalErrors = allCaught.length
  const caught = allCaught.filter(Boolean).length
  return {
    recall: totalErrors ? caught / totalErrors : 0,
    caught,
    totalErrors,
    falsePositives: sum(fpCounts),
  }
}

export function aggregateCikgu(presentFlags, wrongCounts) {
  const allPresent = presentFlags.flat()
  const total = allPresent.length
  const present = allPresent.filter(Boolean).length
  return {
    factRecall: total ? present / total : 0,
    present,
    totalFacts: total,
    wrongFacts: sum(wrongCounts),
  }
}

// Recall split by whether the planted error was regex-catchable — this is the
// money table: it shows the free tier holding its own on `regexExpected:true`
// rows and collapsing on `regexExpected:false` rows (the semantic gap).
export function recallBySegment(records) {
  // records: [{ regexExpected:boolean, caught:boolean }]
  const seg = (want) => {
    const r = records.filter((x) => x.regexExpected === want)
    const c = r.filter((x) => x.caught).length
    return { caught: c, total: r.length, recall: r.length ? c / r.length : 0 }
  }
  return { regexCatchable: seg(true), semantic: seg(false) }
}
