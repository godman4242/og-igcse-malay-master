// UDL Principle 1 (Engagement) — Personal Interests.
//
// Pure leaf module. Defines the curated set of "starrable" interests
// the student sees in Settings, plus the lookup logic that pulls
// matching Comprehension passages and Roleplay scenarios to the top
// of the page list. No React, no store imports — vitest pins the
// contract without spinning up JSDOM.
//
// Matching philosophy: substring-case-insensitive across a small bag
// of `matchers` per interest. Substring rather than equality so a
// passage tagged `alam sekitar` and a scenario titled `Alam Sekitar`
// both fire on the same `environment` interest without us having to
// rewrite the source data. Each interest carries a short visible
// label + emoji so Settings can render them as chips without an
// extra catalog.
export const INTERESTS = [
  { id: 'environment', label: 'Environment', emoji: '🌳', matchers: ['environment', 'alam sekitar', 'alam-sekitar'] },
  { id: 'travel',      label: 'Travel',      emoji: '✈️', matchers: ['travel', 'percutian', 'hotel', 'directions', 'luggage', 'kapal-terbang', 'kapal terbang'] },
  { id: 'technology',  label: 'Technology',  emoji: '📱', matchers: ['technology', 'tech', 'telefon', 'phone'] },
  { id: 'health',      label: 'Health',      emoji: '❤️', matchers: ['health', 'kesihatan', 'doktor', 'klinik', 'clinic'] },
  { id: 'sports',      label: 'Sports',      emoji: '⚽', matchers: ['sport', 'sukan'] },
  { id: 'food',        label: 'Food',        emoji: '🍜', matchers: ['food', 'restoran', 'restaurant', 'pasar', 'market', 'cafe'] },
  { id: 'education',   label: 'Education',   emoji: '📚', matchers: ['education', 'pendidikan', 'sekolah', 'school', 'buku', 'bookstore', 'kelab', 'interview'] },
  { id: 'community',   label: 'Community',   emoji: '🤝', matchers: ['community', 'komuniti', 'sukarelawan', 'volunteer', 'jiran', 'neighbour', 'neighbor', 'gotong'] },
  { id: 'family',      label: 'Family',      emoji: '👨‍👩‍👧', matchers: ['family', 'keluarga'] },
  { id: 'work',        label: 'Work & Jobs', emoji: '💼', matchers: ['work', 'kerja', 'part-time', 'parttime', 'returning', 'product', 'interview', 'temuduga'] },
]

// Pure: returns the Set of starred interest IDs that match the
// supplied topic tokens (one item's worth of strings — for example a
// passage's `[p.topic]` or a scenario's `[s.id, s.title, s.titleEn]`).
// Used to drive both the prioritisation sort AND the per-item ⭐
// badge in the render, so the visible badge is always in lockstep
// with what would prioritise.
export function matchInterests(topicTokens, starredInterestIds) {
  if (!Array.isArray(starredInterestIds) || !starredInterestIds.length) return new Set()
  const haystack = (Array.isArray(topicTokens) ? topicTokens : [])
    .filter(Boolean)
    .map(t => String(t).toLowerCase())
  if (!haystack.length) return new Set()
  const starred = new Set(starredInterestIds)
  const out = new Set()
  for (const interest of INTERESTS) {
    if (!starred.has(interest.id)) continue
    const hit = interest.matchers.some(m => haystack.some(h => h.includes(m)))
    if (hit) out.add(interest.id)
  }
  return out
}

// Pure: stable-sort `items` so anything matching a starred interest
// floats to the top. Within the "matched" and "unmatched" groups
// original order is preserved (no surprise reshuffles when a student
// starred two interests that already pre-sort by some other axis).
//
// `getTopicTokens(item) → string[]` lets the caller decide what
// counts as a topic token — Comprehension passes `[p.topic]`,
// Roleplay passes `[s.id, s.title, s.titleEn]` to also match by
// title (since scenarios don't carry an explicit `topic` field).
//
// Returns `[{ item, matchedInterests: Set<string> }]` — same shape
// whether or not anything matched, so the caller renders the ⭐
// badge based solely on `matchedInterests.size > 0`.
export function prioritiseByInterests(items, starredInterestIds, getTopicTokens) {
  if (!Array.isArray(items)) return []
  const enriched = items.map((item, idx) => ({
    item,
    idx,
    matchedInterests: matchInterests(getTopicTokens(item), starredInterestIds),
  }))
  enriched.sort((a, b) => {
    const aHas = a.matchedInterests.size > 0
    const bHas = b.matchedInterests.size > 0
    if (aHas !== bHas) return aHas ? -1 : 1
    return a.idx - b.idx
  })
  return enriched.map(({ item, matchedInterests }) => ({ item, matchedInterests }))
}
