import { State } from 'ts-fsrs'

// Block-then-interleave gate (Claim 4b). Hwang 2025: for low achievers an
// initial *blocked* run builds declarative knowledge; interleaving the
// confusable prefixes only helps once the basics are in. So we keep the
// "Mixed prefixes" ordering gated until the learner has demonstrably learned a
// few imbuhan drills of this type.
//
// Conservative + tunable (small N so a strong learner isn't forced to grind a
// block for long). A drill counts as "learned" only once its FSRS card has
// graduated to Review (or lapsed from Review into Relearning) — the single
// unambiguous proof the learner answered it correctly. New/Learning cards are
// mid-acquisition or freshly failed (a wrong first answer lands a New card in
// Learning with reps=1/lapses=0), so they deliberately don't count.
export const BLOCK_FIRST_N = 3

export function shouldInterleave(type, grammarCards, N = BLOCK_FIRST_N) {
  if (!type || !grammarCards) return false
  let learned = 0
  for (const id in grammarCards) {
    if (!id.startsWith(type)) continue
    const st = grammarCards[id]?.state
    if (st === State.Review || st === State.Relearning) {
      learned++
      if (learned >= N) return true
    }
  }
  return false
}

// Within-skill interleaving of confusable imbuhan forms (Claim 4c).
//
// Imbuhan drills are authored grouped by form (all meN-, then ber-, then peN-,
// then the passive-transform block, then the suffix block). Grinding one form
// in a block is blocked practice; interleaving CONFUSABLE forms forces the
// learner to *choose which one applies* — the use of interleaving with the
// strongest evidence (discrimination of similar items; Rohrer & Taylor). This
// is a pure reorder over existing fields — no new content.
//
// `IMBUHAN_DRILLS` is a MIXED set: prefix drills carry a `prefix` field, but
// passive/suffix drills do not. So we bucket by `prefix` when present and fall
// back to `type` (passive / suffix) otherwise — every drill lands in a group,
// nothing is dropped, and prefixes (the primary, evidence-backed target) are
// the finest-grained buckets. English confusable drills carry no `prefix` at
// all → the guard below returns them untouched (plus a !isEng wiring guard).
//
// Algorithm: deterministic round-robin across buckets in first-appearance
// order, stable within each bucket. With one dominant bucket some same-form
// adjacency is unavoidable by pigeonhole — round-robin pushes it to the tail
// and keeps the early stretch cleanly alternating ("no two adjacent the same
// where possible").
const bucketKeyFor = (dr) =>
  dr && typeof dr.prefix === 'string' && dr.prefix ? dr.prefix : (dr && dr.type) || ''

export function interleaveByPrefix(drills) {
  if (!Array.isArray(drills) || drills.length <= 1) return drills
  // No drill carries a real `prefix` ⇒ no confusable-prefix discrimination to
  // train (e.g. the English confusable set) ⇒ leave the order untouched.
  if (!drills.some((dr) => dr && typeof dr.prefix === 'string' && dr.prefix)) return drills

  // Bucket by form, preserving original order within each bucket.
  const buckets = new Map()
  for (const dr of drills) {
    const key = bucketKeyFor(dr)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(dr)
  }
  if (buckets.size <= 1) return drills // single form → nothing to interleave

  // Round-robin across buckets in first-appearance order. Index cursors keep
  // the operation O(n) and leave the bucket arrays (and input) untouched.
  const order = [...buckets.values()]
  const cursors = order.map(() => 0)
  const result = []
  let added = true
  while (added) {
    added = false
    for (let i = 0; i < order.length; i++) {
      const bucket = order[i]
      if (cursors[i] < bucket.length) {
        result.push(bucket[cursors[i]])
        cursors[i]++
        added = true
      }
    }
  }
  return result
}
