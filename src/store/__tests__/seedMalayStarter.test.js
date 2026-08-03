// @vitest-environment jsdom
//
// seedMalayStarter (Malay Beginner On-Ramp) seeds the ~45-word survival deck as
// lang:'ms' cards in a dedicated "Starter" deck — the Malay counterpart to
// seedEnglishStarter / seedAcademicEnglish. Mirrors their contract (lazy data
// import, addCards dedupe, returns the count added). The store persists to
// localStorage, so the in-memory shim is installed BEFORE the store loads.
import { describe, it, expect, beforeEach } from 'vitest'

let useStore, MALAY_STARTER

beforeEach(async () => {
  const mem = new Map()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => { mem.set(k, String(v)) },
      removeItem: (k) => { mem.delete(k) },
      clear: () => { mem.clear() },
      key: (i) => [...mem.keys()][i] ?? null,
      get length() { return mem.size },
    },
  })
  ;({ default: useStore } = await import('../useStore'))
  ;({ default: MALAY_STARTER } = await import('../../data/malayStarter'))
  useStore.setState({ cards: [] })
})

describe('malayStarter data integrity', () => {
  it('is a curated ~40–50 word beginner set with complete, cloze-safe entries', () => {
    expect(MALAY_STARTER.length).toBeGreaterThanOrEqual(40)
    expect(MALAY_STARTER.length).toBeLessThanOrEqual(50)

    // No duplicate target words.
    const words = MALAY_STARTER.map(e => e.m)
    expect(new Set(words).size).toBe(words.length)

    for (const { m, e, ex, p } of MALAY_STARTER) {
      expect(m && e && ex && p, `entry "${m}" missing a field`).toBeTruthy()
      // The example must contain the target word (whole-word, case-insensitive)
      // or cloze/Produce blanking silently can't blank it. Same boundary notion
      // as blankInExample (letter/number lookarounds; hyphen is a boundary).
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu')
      expect(re.test(ex), `example for "${m}" does not contain it as a whole word: "${ex}"`).toBe(true)
    }
  })
})

// C5 (2026-08-03): the starter deck modelled `satu adik` / `dua abang` /
// `tiga buku` / `dua kucing` — a numeral bolted straight onto a countable noun
// with the obligatory penjodoh bilangan (numeral classifier) missing. These are
// the deck a zero-card Malay learner gets from the Dashboard's "Start your Malay
// deck", shown as MODEL sentences in cloze/Speak, so the app was teaching a
// register its own Cikgu Maya KB marks as an error ("you can't just say 'two
// cat'" — cikguKnowledge.js `penjodoh-bilangan`).
//
// Grounding (Kamus Dewan Edisi Keempat via PRPM):
//   ekor  — "penjodoh bilangan utk binatang"
//   buah  — "penjodoh bilangan utk benda-benda yg tidak tentu bentuk atau jenisnya"
//   sebuah = "satu buah" (the se- + classifier fusion)
//
// DELIBERATELY NOT flagged, and why — the rule is narrower than "every numeral":
//   - body parts: Kamus Dewan's OWN `jari` example counts them bare —
//     "Sebelah tangan mempunyai lima ~" — so `empat kaki` / `sepuluh jari` stand.
//   - measures and time already ARE the measure word: `pukul lima`, `enam tahun`,
//     `dua jam`, `sepuluh ringgit`.
// The sibling corpus src/data/dictionaryExamples.js (704 examples) was swept for
// the same defect and is clean: every countable case already carries a classifier
// (`dua buah`, `tiga orang`, `empat orang`, `lima biji`).
describe('malayStarter penjodoh bilangan (C5)', () => {
  const NUMERALS = ['satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'lapan', 'sembilan', 'sepuluh']
  // Concrete countable nouns that may never sit directly after a numeral.
  // `orang` is deliberately absent: it is itself the human classifier, so both
  // "dua orang" (two people) and "dua orang abang" are correct.
  const CLASSIFIER_REQUIRED = [
    'adik', 'abang', 'kakak', 'anak', 'murid', 'pelajar', 'guru', 'kawan',
    'kucing', 'ikan', 'burung', 'ayam', 'anjing',
    'buku', 'rumah', 'kereta', 'meja', 'kerusi', 'pintu', 'baju',
  ]

  it('never puts a numeral straight onto a countable noun', () => {
    const re = new RegExp(`\\b(${NUMERALS.join('|')})\\s+(${CLASSIFIER_REQUIRED.join('|')})\\b`, 'i')
    for (const { m, ex } of MALAY_STARTER) {
      const hit = ex.match(re)
      expect(hit && hit[0], `"${m}" models a missing penjodoh bilangan: "${ex}"`).toBeFalsy()
    }
  })

  it('models the right classifier for people, animals and objects', () => {
    const exFor = (m) => MALAY_STARTER.find(e => e.m === m).ex
    expect(exFor('dua')).toContain('dua orang')   // humans → orang
    expect(exFor('ada')).toContain('dua ekor')    // animals → ekor
    expect(exFor('tiga')).toContain('tiga buah')  // objects → buah
  })
})

describe('seedMalayStarter', () => {
  it('seeds every starter word as a lang:"ms" card in the "Starter" deck', async () => {
    const added = await useStore.getState().seedMalayStarter()
    expect(added).toBe(MALAY_STARTER.length)

    const cards = useStore.getState().cards
    const deck = cards.filter(c => c.t === 'Starter')
    expect(deck).toHaveLength(MALAY_STARTER.length)
    expect(deck.every(c => c.lang === 'ms')).toBe(true)

    // The target word is m, the L1 gloss is e (matches the study-loop contract).
    const terimaKasih = deck.find(c => c.m === 'terima kasih')
    expect(terimaKasih).toBeTruthy()
    expect(terimaKasih.e).toBe('thank you')
    expect(terimaKasih.ex).toContain('Terima kasih')
  })

  it('is idempotent — a second call adds nothing (addCards dedupes on m,t,lang)', async () => {
    const first = await useStore.getState().seedMalayStarter()
    expect(first).toBe(MALAY_STARTER.length)
    const second = await useStore.getState().seedMalayStarter()
    expect(second).toBe(0)
    expect(useStore.getState().cards.filter(c => c.t === 'Starter'))
      .toHaveLength(MALAY_STARTER.length)
  })

  it('does not leak into the English deck — starter cards stay in the ms partition', async () => {
    // Pre-existing English card must be untouched, and no starter card lands in 'en'.
    useStore.setState({ cards: [{ m: 'hotel', e: 'hotel', lang: 'en', t: 'English' }] })
    await useStore.getState().seedMalayStarter()
    const { cardsForLang } = await import('../../lib/cardLang')
    const enCards = cardsForLang(useStore.getState().cards, 'en')
    expect(enCards).toHaveLength(1)
    expect(enCards.some(c => c.t === 'Starter')).toBe(false)
    const msCards = cardsForLang(useStore.getState().cards, 'ms')
    expect(msCards).toHaveLength(MALAY_STARTER.length)
    expect(msCards.every(c => c.lang === 'ms')).toBe(true)
  })
})
