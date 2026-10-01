// Word → family lookup + what each affix does (GOAL #61, A6 Phase 2 foundation).
// Pure: no DOM, no store, no Date — builds one reverse index over
// `data/wordFamilies.js` at module load and answers `familyOf(word)`.
//
// Contract (the word panel's family row + the flashcard-back chip call this):
//   familyOf('menulis') → { root: 'tulis', rootMeaning: 'write',
//                           form: { word, type, meaning, pos },   // the matched entry
//                           siblings: [ ...the root's OTHER forms ] }
//   familyOf('tulis')   → null   (a ROOT word — the chip must never show on a root)
//   familyOf('xyz')     → null   (unknown)
//
// Decisions (pinned by wordFamilyIndex.test.js):
// - Input normalisation: non-strings → null; otherwise trim, lower-case, collapse
//   runs of whitespace to one space ("pejalan kaki" is a two-word form). No
//   diacritic / punctuation stripping — a headword is matched by its own spelling.
// - A word that is BOTH a root and a form → treated as the root → null. Roots win.
// - One form under two roots: not allowed in the data. The index keeps the FIRST
//   root (file order) so lookups stay deterministic, and the test fails on any
//   duplicate so a collision is resolved in the data, never silently here.
// - Returned `form` / `siblings` entries are the data objects — read-only.
import WORD_FAMILIES from '../data/wordFamilies.js'

/**
 * One learner line (≤14 words) per `type` label used in data/wordFamilies.js.
 * Wording follows cikguKnowledge.js's imbuhan answers (meN-/ber-/di-/ter-/peN-/
 * -kan/-i/-an/ke-...-an/se-) and Tatabahasa Dewan for the rest (peR-...-an = noun
 * of a ber- verb; pe- pairs with ber- as peN- pairs with meN-; memper- + adjective
 * = "menjadikan lebih"; di-...-kan / di-...-i = passive of meN-...-kan / meN-...-i;
 * the bare -kan / -i form is the command / first-and-second-person passive).
 * Verified 2026-10-01 against DBP/Tatabahasa Dewan snippets — PRPM itself is
 * unreachable from the cloud sandbox (see the cycle report).
 * The test fails if a type used in the data has no line here, or vice versa.
 */
export const AFFIX_MEANINGS = Object.freeze({
  'meN-': 'Active verb: someone does the action (menulis = to write).',
  'di-': 'Passive: the action is done to something (ditulis = written).',
  'peN-': 'Noun: the person or tool that does it (penulis = writer).',
  'peN-...-an': 'Noun: the act or process of doing it (penulisan = writing).',
  '-an': 'Noun: the result, thing or collection (tulisan = a piece of writing).',
  'ber-': 'Doing, having or being in a state; needs no object (bekerja = working).',
  'ter-': 'Most (terbaik = best); or by accident, able to be, already in a state.',
  'ke-...-an': 'Abstract noun, the quality or state (kesihatan = health); some are adjectives (kedengaran).',
  'meN-...-kan': 'Active verb: make it happen, or do it for someone (menyihatkan).',
  'di-...-kan': 'Passive of meN-...-kan: it was made to happen (disediakan = provided).',
  'meN-...-i': 'Active verb aimed at a place or person, no preposition (menghubungi).',
  'di-...-i': 'Passive of meN-...-i: the place or person received it (dihubungi).',
  'per-...-an': 'Noun of a ber- verb: the activity or its result (perjalanan = journey).',
  'se-': 'One, the same, or as ... as (setinggi = as tall as).',
  'pe-': 'Noun: the person who does a ber- verb (pekerja = worker).',
  'pe-...-an': 'Noun from a ber- verb: what is done (pekerjaan = job).',
  'meN-per-': 'Active verb: make it more so (memperindah = to beautify).',
  'meN-per-...-i': 'Active verb: improve or deal with thoroughly (memperbaiki = to repair).',
  'per-...-i': 'Command form of a memper-...-i verb (perbaiki! = fix it!).',
  '-kan': 'Command form of a meN-...-kan verb (bersihkan! = clean it!).',
  'ke-...-i': 'Passive verb after I, we or you (yang kita ketahui = as we know).',
  'ber-peN-...-an': 'Having the peN-...-an noun (berpengetahuan = knowledgeable).',
})

/** Normalise a learner-typed word for lookup; `null` when it can't be one. */
export function normalizeWord(word) {
  if (typeof word !== 'string') return null
  const w = word.trim().toLowerCase().replace(/\s+/g, ' ')
  return w || null
}

// form word → { root, form } — first root in file order wins (see header).
const INDEX = new Map()
for (const fam of Object.values(WORD_FAMILIES)) {
  for (const form of fam.forms) {
    const key = normalizeWord(form.word)
    if (key && !INDEX.has(key)) INDEX.set(key, { root: fam.root, form })
  }
}

/** Every distinct `type` label the data uses (for the meaning-coverage test). */
export function affixTypesInData() {
  const set = new Set()
  for (const fam of Object.values(WORD_FAMILIES)) for (const f of fam.forms) set.add(f.type)
  return [...set]
}

/** The learner line for a form's `type`, or `null` for an unknown label. */
export function affixMeaning(type) {
  return AFFIX_MEANINGS[type] ?? null
}

/** `{ root, rootMeaning, form, siblings }` for a DERIVED form; `null` for a root or unknown word. */
export function familyOf(word) {
  const key = normalizeWord(word)
  if (!key || WORD_FAMILIES[key]) return null
  const hit = INDEX.get(key)
  if (!hit) return null
  const fam = WORD_FAMILIES[hit.root]
  return {
    root: fam.root,
    rootMeaning: fam.meaning,
    form: hit.form,
    siblings: fam.forms.filter((f) => f !== hit.form),
  }
}
