// @vitest-environment jsdom
//
// The typed "gloss → type the word" drills (Produce mode, Flashcard's reverse +
// produce-in-context variants) graded against card.m alone. But the app's own
// dictionary gives 21 glosses to 2–3 headwords ("you" = awak/engkau/kamu,
// "i/me" = aku/saya), so a learner who typed "kamu" for an `awak` card was
// marked WRONG for real Malay: FSRS reset, a mistake logged. A same-gloss word
// is a near miss — neither credited (in a context sentence "minuman" would not
// fit "Saya ___ air") nor punished: it says so and lets them try again.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

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

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { default: ProduceMode } = await import('../ProduceMode')
const { default: FlashcardMode } = await import('../FlashcardMode')
const { default: useStore } = await import('../../../store/useStore')
const { Rating, createNewCardState } = await import('../../../lib/fsrs')
const { default: DICTIONARY } = await import('../../../data/dictionary')

let root, host, rated
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  rated = []
  useStore.setState({ cards: [] })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

const session = (over = {}) => ({
  confidence: 2, setConfidence: () => {}, rate: r => rated.push(r),
  pendingWrongWord: null, hypercorrect: false, reasonTagged: null, tagReason: () => {},
  scheduling: null, cardVariant: { variant: 'standard' }, ...over,
})
const typeAndCheck = async (value) => {
  const input = host.querySelector('input')
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  await act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })) })
  const btn = [...host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Check')
  await act(async () => btn.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}
const text = () => host.textContent

const AWAK = { m: 'awak', e: DICTIONARY.awak, t: 'People', lang: 'ms', ...createNewCardState() }

describe('same-gloss words are a near miss, not a wrong answer', () => {
  it('the dictionary really glosses awak, engkau and kamu identically (the premise)', () => {
    expect(DICTIONARY.awak).toBe('you')
    expect(DICTIONARY.kamu).toBe(DICTIONARY.awak)
    expect(DICTIONARY.engkau).toBe(DICTIONARY.awak)
  })

  it('Produce: "kamu" for an awak card is not rated, says why, and the retry still grades', async () => {
    await act(async () => root.render(React.createElement(ProduceMode, { card: AWAK, session: session() })))
    await typeAndCheck('kamu')
    expect(rated).toEqual([])
    expect(text()).toMatch(/“kamu” means “you” too/)
    expect(text()).not.toMatch(/❌/)
    await typeAndCheck('awak')
    // Right on the retry, after a near miss: Hard, not Good — or cycling the synonyms
    // (kamu → engkau → awak) would earn Good by elimination (2026-09-29 review P3-1).
    expect(rated).toEqual([Rating.Hard])
    expect(text()).toMatch(/✅ Correct!/)
  })

  it('Produce with a context sentence: still a near miss, never credited', async () => {
    const card = { ...AWAK, ex: 'Awak mahu makan apa hari ini?' }
    await act(async () => root.render(React.createElement(ProduceMode, { card, session: session() })))
    await typeAndCheck('Kamu')
    expect(rated).toEqual([])
    expect(text()).not.toMatch(/✅/)
  })

  it('a same-gloss card in the learner’s own deck counts too (English: large/big → besar)', async () => {
    useStore.setState({ cards: [{ m: 'big', e: 'besar', lang: 'en', t: 'Import' }] })
    const card = { m: 'large', e: 'besar', lang: 'en', t: 'Import', ...createNewCardState() }
    await act(async () => root.render(React.createElement(ProduceMode, { card, session: session() })))
    await typeAndCheck('big')
    expect(rated).toEqual([])
    expect(text()).toMatch(/“big” means “besar” too/)
  })

  it('a real wrong answer is still wrong, and an unrelated deck card with another gloss does not rescue it', async () => {
    useStore.setState({ cards: [{ m: 'rumah', e: 'house', lang: 'ms', t: 'Home' }] })
    await act(async () => root.render(React.createElement(ProduceMode, { card: AWAK, session: session() })))
    await typeAndCheck('rumah')
    expect(rated).toEqual([Rating.Again])
    expect(text()).toMatch(/❌ awak/)
  })

  it('an English card never borrows the Malay dictionary (kamu is not an English answer)', async () => {
    const card = { m: 'you', e: 'you', lang: 'en', t: 'X', ...createNewCardState() }
    await act(async () => root.render(React.createElement(ProduceMode, { card, session: session() })))
    await typeAndCheck('kamu')
    expect(rated).toEqual([Rating.Again])
  })

  it('an iPhone curly apostrophe matches the card word (don’t = don\'t)', async () => {
    const card = { m: "don't", e: 'jangan', lang: 'en', t: 'X', ...createNewCardState() }
    await act(async () => root.render(React.createElement(ProduceMode, { card, session: session() })))
    await typeAndCheck('Don’t')
    expect(rated).toEqual([Rating.Good])
  })

  for (const variant of ['reverse', 'produce']) {
    it(`Flashcard ${variant} variant: "kamu" for an awak card is a near miss, then "awak" grades`, async () => {
      useStore.setState({ studyLang: 'ms' })
      const card = { ...AWAK, ex: 'Awak mahu makan apa hari ini?' }
      await act(async () => root.render(React.createElement(FlashcardMode, {
        card, session: session({ cardVariant: { variant } }),
      })))
      await typeAndCheck('kamu')
      expect(rated).toEqual([])
      expect(text()).toMatch(/“kamu” means “you” too/)
      await typeAndCheck('awak')
      expect(rated).toEqual([Rating.Hard])
    })
  }
})
