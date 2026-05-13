import DICTIONARY_ICONS from '../data/dictionaryIcons'

// Single resolver for every Visual Dictionary surface. Consumers MUST
// go through this — never reach into the maps directly so we can later
// add a Tier-1 image manifest without touching call sites.
//
// Returns: { kind: 'image' | 'emoji' | 'none', src: string | null }
export function getDictionaryIcon(word) {
  if (!word || typeof word !== 'string') return { kind: 'none', src: null }
  const key = word.trim().toLowerCase()
  if (!key) return { kind: 'none', src: null }

  // Tier 1 (pre-rendered AI images) will slot in here when the
  // generator script lands.

  const emoji = DICTIONARY_ICONS[key]
  if (emoji) return { kind: 'emoji', src: emoji }

  return { kind: 'none', src: null }
}

export function hasDictionaryIcon(word) {
  return getDictionaryIcon(word).kind !== 'none'
}
