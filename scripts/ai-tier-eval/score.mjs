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

// OVER-PRAISE (task-aware Content trait) — a gold essay over-praises when ANY of
// its N Content-band samples exceeds its expectedContentMax ceiling
// (offTopicFluent→2, partial→4, onTask→6). The whole point of the Content grader
// is that fluency must NOT rescue an off-task or partial answer, so a single
// sample above the ceiling counts the essay as flagged (we want robustness across
// all samples, not just on average). `flagged` carries the offenders for the
// per-essay printout. The ship gate (in harness.mjs) is rate-based: ≤ 1/10
// flagged (≥ 9/10 within ceiling) → trait ships.
export function overPraiseRate(results) {
  // results: [{ id?, label?, expectedContentMax, samples: number[] }] — one per gold essay
  const flagged = results.filter(r => r.samples.some(b => b > r.expectedContentMax))
  return { rate: flagged.length / Math.max(1, results.length), flagged }
}

// REATTEMPT (improvement-detection) — compare two grades of the SAME task (the
// student's `before` essay vs the `after` resubmit) on the ONE requirement the
// before essay missed (`targetReq`). `looksImproved` is true iff the Content band
// ROSE or that requirement flipped ✗→✓ — the SAME real-change rule the product's
// compareAttempts uses. For a cosmeticEdit, looksImproved===true is OVER-PRAISE (a
// failure the gate must keep ~0); for a realImprovement it is the desired
// detection. Each side carries N samples; we use the MEDIAN band and the MAJORITY
// targetReq coverage so one flaky sample can't decide the verdict.
const reattemptMedian = (arr) => {
  const xs = arr.filter((x) => typeof x === 'number').sort((a, b) => a - b)
  return xs.length ? xs[Math.floor((xs.length - 1) / 2)] : null
}
const reattemptMajorityMet = (coverages, reqKey) => {
  const flags = coverages.map((c) => c?.[reqKey] === true)
  return flags.length ? flags.filter(Boolean).length > flags.length / 2 : null
}

export function reattemptVerdict(pair, beforeGrade, afterGrade) {
  // beforeGrade/afterGrade: { bands: number[], coverages: object[] }
  const reqKey = `req_${pair.targetReq}`
  const bandBefore = reattemptMedian(beforeGrade.bands || [])
  const bandAfter = reattemptMedian(afterGrade.bands || [])
  const metBefore = reattemptMajorityMet(beforeGrade.coverages || [], reqKey)
  const metAfter = reattemptMajorityMet(afterGrade.coverages || [], reqKey)
  const bandRose = bandBefore != null && bandAfter != null && bandAfter > bandBefore
  const flipToMet = metAfter === true && metBefore === false
  return {
    id: pair.id, label: pair.label, targetReq: pair.targetReq,
    bandBefore, bandAfter, metBefore, metAfter, bandRose, flipToMet,
    looksImproved: bandRose || flipToMet,
  }
}

// Aggregate per-pair verdicts into the ship-gate numbers:
//   • overPraise = cosmeticEdit pairs that looked improved (must be ~0)
//   • realRecall = realImprovement pairs correctly detected
export function reattemptSummary(verdicts) {
  const cosmetic = verdicts.filter((v) => v.label === 'cosmeticEdit')
  const real = verdicts.filter((v) => v.label === 'realImprovement')
  const overPraised = cosmetic.filter((v) => v.looksImproved)
  const detected = real.filter((v) => v.looksImproved)
  return {
    cosmeticTotal: cosmetic.length,
    overPraised: overPraised.length,
    overPraiseRate: cosmetic.length ? overPraised.length / cosmetic.length : 0,
    realTotal: real.length,
    realDetected: detected.length,
    realRecall: real.length ? detected.length / real.length : 0,
    overPraisedIds: overPraised.map((v) => v.id),
    missedRealIds: real.filter((v) => !v.looksImproved).map((v) => v.id),
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
