// Pure helpers for the Study page. Extracted from Study.jsx so the
// quiz-option generator can be unit-tested deterministically.

// Seeded PRNG based on string hash — deterministic per card, looks random.
export function seededRandom(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

// Build 4 multiple-choice options for a card: the correct answer plus
// three distractors drawn from the dictionary. Same `(card, cardIdx)`
// always produces the same shuffle, so the rendered options don't
// jitter across re-renders.
export function generateQuizOptions(card, cardIdx, dictionary) {
  if (!card) return []
  const rng = seededRandom(`${cardIdx}:${card.m}`)
  const all = Object.values(dictionary)
  const opts = [card.e]
  // Bail out if the dictionary is too small to fill 4 unique options.
  let guard = 0
  while (opts.length < 4 && guard++ < 1000) {
    const r = all[Math.floor(rng() * all.length)]
    if (r && !opts.includes(r)) opts.push(r)
  }
  // Fisher-Yates shuffle with seeded RNG so the answer position varies
  // but stays stable per card.
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]]
  }
  return opts
}
