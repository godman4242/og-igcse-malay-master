import DICTIONARY_ICONS from '../data/dictionaryIcons'
import MANIFEST from '../data/dictionaryIconsManifest.json'

// Single resolver for every Visual Dictionary surface. Consumers MUST
// go through this — never reach into the maps directly. Two-tier
// fallback chain, picked in order:
//   Tier 1: AI-generated WebP from public/dict-icons/ (manifest hit)
//   Tier 0: Hand-curated emoji map fallback
//
// Returns: { kind: 'image' | 'emoji' | 'none', src: string | null }
export function getDictionaryIcon(word) {
  if (!word || typeof word !== 'string') return { kind: 'none', src: null }
  const key = word.trim().toLowerCase()
  if (!key) return { kind: 'none', src: null }

  const aiIcon = MANIFEST?.icons?.[key]
  if (aiIcon?.file) {
    return { kind: 'image', src: `/dict-icons/${aiIcon.file}` }
  }

  const emoji = DICTIONARY_ICONS[key]
  if (emoji) return { kind: 'emoji', src: emoji }

  return { kind: 'none', src: null }
}

export function hasDictionaryIcon(word) {
  return getDictionaryIcon(word).kind !== 'none'
}
