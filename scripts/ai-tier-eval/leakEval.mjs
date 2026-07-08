// Precision/recall report for the answer-leak detector (`detectAnswerLeak`)
// against the labeled fixture in ./leakFixture.mjs.
//
// Purpose (spec §9): a "leak rate" telemetry number is meaningless without a
// known recall alongside it — "0 leaks" could mean "the detector is blind."
// This script measures the detector; it never changes it, and the detector
// stays SOFT (flag-only) in v1 regardless of what it prints here.
//
//   Run: node scripts/ai-tier-eval/leakEval.mjs
//
// MANUAL, never CI (mirrors the house pattern for scripts/ai-tier-eval/*).
import { detectAnswerLeak } from '../../src/lib/tutorContract.js'
import { LEAK_FIXTURE } from './leakFixture.mjs'

const ctx = { mode: 'retrieval', attempted: false }
let tp = 0, fp = 0, fn = 0
for (const x of LEAK_FIXTURE) {
  const pred = detectAnswerLeak(x.text, ctx)
  if (pred && x.leak) tp++
  else if (pred && !x.leak) fp++
  else if (!pred && x.leak) fn++
}
const precision = tp / (tp + fp || 1)
const recall = tp / (tp + fn || 1)
console.log(`precision=${precision.toFixed(2)} recall=${recall.toFixed(2)} (tp=${tp} fp=${fp} fn=${fn}, n=${LEAK_FIXTURE.length})`)
console.log('Starter fixture only (~6 items) — expansion to ~100 with hard negatives is a deferred follow-up (needs Kheshav\'s Gemini key).')
