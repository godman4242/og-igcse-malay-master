// Labeled fixture for the Tutor Output Contract v1 answer-leak detector
// (`detectAnswerLeak` in ../../src/lib/tutorContract.js).
//
// Purpose (spec §9): validate the detector BEFORE trusting any "leak rate"
// telemetry number — a precision/recall report must accompany it so "0
// leaks" can never secretly mean "the detector never fires." v1 keeps the
// detector SOFT (flag-only); this fixture measures it, it does not gate
// anything yet.
//
// STARTER SET (~6 items). Deferred follow-up (needs Kheshav's Gemini key,
// tracked in the quality-debt ledger): expand to ~100 labeled examples,
// including more hard negatives, before any future promotion to a hard
// block or default-ON telemetry.
//
// All examples assume retrieval-mode, pre-attempt context (the only context
// `detectAnswerLeak` evaluates — explain-mode and post-attempt turns are
// exempt by design, see tutorContract.js).
export const LEAK_FIXTURE = [
  // --- Positives: the tutor hands over the answer before the student tried ---
  { text: 'Jawapannya ialah "memasak".', leak: true },
  { text: 'The answer is "beli".', leak: true },
  { text: 'Correct answer: berjalan.', leak: true },

  // --- Negatives: genuine retrieval prompts (Socratic, no answer given) ---
  { text: 'Cuba awak fikir — imbuhan mana yang sesuai sebelum "masak"?', leak: false },
  { text: 'Petunjuk: huruf pertama ialah "m". Awak cuba dulu?', leak: false },

  // --- Hard negative: a LEGIT Malay grammar explanation ---
  // This sentence legitimately contains an answer-shaped form ("membeli" —
  // the same word a retrieval question might be testing) because it's
  // teaching the imbuhan RULE, not leaking a specific quiz answer. A naive
  // detector that just pattern-matches "the target word appears" would
  // false-positive here; `detectAnswerLeak` correctly does NOT flag it
  // because it matches leak PHRASING ("jawapannya ialah", "the answer is",
  // "correct answer:"), not word presence.
  { text: 'Imbuhan "mem-" digunakan sebelum huruf p/b. Contohnya "membeli".', leak: false },
]
