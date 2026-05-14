// High-yield Malay penanda wacana grouped by rhetorical function.
// Surfaced live in the Writing scaffolding sidebar; each connector the
// student writes gets ticked off so they can see coverage at a glance.
//
// Curated for IGCSE 0546 Paper 2 + Paper 4 karangan register. Variants
// (e.g. "walau bagaimanapun" vs "walaubagaimanapun") are listed under
// the same entry so we accept what students actually write.

export const CONNECTOR_GROUPS_MS = [
  {
    id: 'addition',
    label: 'Tambahan',
    labelEn: 'Addition',
    color: 'var(--color-green)',
    bg: 'rgba(0,230,118,0.15)',
    items: [
      { id: 'selain-itu', phrase: 'selain itu', en: 'besides that' },
      { id: 'tambahan-pula', phrase: 'tambahan pula', en: 'furthermore' },
      { id: 'di-samping-itu', phrase: 'di samping itu', en: 'apart from that' },
      { id: 'malah', phrase: 'malah', en: 'in fact' },
      { id: 'bahkan', phrase: 'bahkan', en: 'moreover' },
      { id: 'seterusnya', phrase: 'seterusnya', en: 'next / furthermore' },
    ],
  },
  {
    id: 'contrast',
    label: 'Pertentangan',
    labelEn: 'Contrast',
    color: 'var(--color-orange)',
    bg: 'rgba(255,145,0,0.15)',
    items: [
      { id: 'walau-bagaimanapun', phrase: 'walau bagaimanapun', en: 'however', variants: ['walaubagaimanapun'] },
      { id: 'namun-demikian', phrase: 'namun demikian', en: 'nevertheless' },
      { id: 'namun', phrase: 'namun', en: 'however' },
      { id: 'sebaliknya', phrase: 'sebaliknya', en: 'on the contrary' },
      { id: 'walaupun', phrase: 'walaupun', en: 'although' },
      { id: 'sungguhpun', phrase: 'sungguhpun', en: 'even though' },
      { id: 'tetapi', phrase: 'tetapi', en: 'but' },
    ],
  },
  {
    id: 'sequence',
    label: 'Urutan',
    labelEn: 'Sequence',
    color: 'var(--color-cyan)',
    bg: 'rgba(0,200,255,0.15)',
    items: [
      { id: 'pertamanya', phrase: 'pertamanya', en: 'firstly' },
      { id: 'keduanya', phrase: 'keduanya', en: 'secondly' },
      { id: 'kemudian', phrase: 'kemudian', en: 'then' },
      { id: 'seterusnya-seq', phrase: 'seterusnya', en: 'next' },
      { id: 'akhir-sekali', phrase: 'akhir sekali', en: 'finally' },
      { id: 'kesimpulannya', phrase: 'kesimpulannya', en: 'in conclusion' },
    ],
  },
  {
    id: 'cause',
    label: 'Sebab & Akibat',
    labelEn: 'Cause / Effect',
    color: 'var(--color-purple)',
    bg: 'rgba(179,136,255,0.15)',
    items: [
      { id: 'oleh-itu', phrase: 'oleh itu', en: 'therefore' },
      { id: 'justeru', phrase: 'justeru', en: 'thus' },
      { id: 'kerana', phrase: 'kerana', en: 'because' },
      { id: 'disebabkan', phrase: 'disebabkan', en: 'caused by' },
      { id: 'akibatnya', phrase: 'akibatnya', en: 'as a result' },
    ],
  },
  {
    id: 'example',
    label: 'Contoh',
    labelEn: 'Example',
    color: 'var(--color-blue)',
    bg: 'rgba(68,138,255,0.15)',
    items: [
      { id: 'sebagai-contoh', phrase: 'sebagai contoh', en: 'for example' },
      { id: 'contohnya', phrase: 'contohnya', en: 'for instance' },
      { id: 'misalnya', phrase: 'misalnya', en: 'for instance' },
      { id: 'umpamanya', phrase: 'umpamanya', en: 'for example' },
    ],
  },
]

// Escape regex special chars so a phrase like "selain itu" can be safely
// embedded in a RegExp.
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Builds a word-bounded regex that tolerates any whitespace between
// tokens of a multi-word connector. Case-insensitive.
function phraseRegex(phrase) {
  const tokens = phrase.trim().split(/\s+/).map(escapeRegex)
  // (?<![\p{L}\p{N}]) / (?![\p{L}\p{N}]) — soft word boundaries that
  // work for Malay (which uses standard ASCII letters anyway, but this
  // keeps us safe if we ever extend to other scripts).
  return new RegExp(`(?<![\\p{L}\\p{N}])${tokens.join('\\s+')}(?![\\p{L}\\p{N}])`, 'iu')
}

// Returns a Set of item.id strings whose phrase (or any variant) appears
// in the supplied text.
export function detectConnectors(text, groups = CONNECTOR_GROUPS_MS) {
  const used = new Set()
  if (!text || typeof text !== 'string') return used
  for (const group of groups) {
    for (const item of group.items) {
      const candidates = [item.phrase, ...(item.variants || [])]
      for (const c of candidates) {
        if (phraseRegex(c).test(text)) { used.add(item.id); break }
      }
    }
  }
  return used
}

// Coverage stats per group; handy for headline numbers in the panel UI.
export function connectorCoverage(text, groups = CONNECTOR_GROUPS_MS) {
  const used = detectConnectors(text, groups)
  return groups.map(group => ({
    id: group.id,
    used: group.items.filter(it => used.has(it.id)).length,
    total: group.items.length,
  }))
}
