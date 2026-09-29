// @vitest-environment jsdom
//
// Kheshav, 2026-09-29: "highlight-to-translate does not work well with flashcards
// since they flip around when you highlight them". The whole card was one click
// target, so the click that ends a drag-select (or a double-click) flipped it.
//  - Back (answer shown): tapping never flips it back, so the example sentence can
//    be highlighted; the Malay word is repeated there, and "show front" flips back.
//  - Front (before the try): not highlightable and never marks saved words — a
//    highlight or a saved-word popover there would hand over the answer.
import { it, expect, beforeEach, afterEach } from 'vitest'

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
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { default: FlashcardMode } = await import('../FlashcardMode')
const { createNewCardState } = await import('../../../lib/fsrs')

let root, host
beforeEach(async () => {
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  const card = { m: 'bermain', e: 'to play', ex: 'Adik bermain bola di padang.', t: 'Verbs', lang: 'ms', ...createNewCardState() }
  const session = { rate: () => {}, nextCard: () => {}, scheduling: null, cardVariant: { variant: 'standard' } }
  await act(async () => root.render(React.createElement(FlashcardMode, { card, session })))
})
afterEach(async () => { await act(async () => root.unmount()); host.remove() })

const cardEl = () => host.querySelector('.perspective')
const faces = () => host.querySelectorAll('.backface-hidden')
const flipped = () => cardEl().firstElementChild.className.includes('rotate-y-180')
const click = (el) => act(async () => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))

it('a tap on the front flips it; a tap (or a highlight) on the back leaves the answer up', async () => {
  await click(cardEl())
  expect(flipped()).toBe(true)
  const example = [...faces()[1].querySelectorAll('p')].find(p => p.textContent.includes('Adik'))
  window.getSelection().selectAllChildren(example) // the drag that ends in this click
  await click(example)
  expect(flipped()).toBe(true)
  window.getSelection().removeAllRanges()
  await click(faces()[1])
  expect(flipped()).toBe(true)
})

it('the back repeats the Malay word, and "show front" flips back', async () => {
  await click(cardEl())
  expect(faces()[1].textContent).toContain('bermain')
  const back = [...faces()[1].querySelectorAll('button')].find(b => /show front/i.test(b.textContent))
  await click(back)
  expect(flipped()).toBe(false)
})

it('the front cannot be highlighted or saved-word-marked (no answer before the try)', () => {
  const front = faces()[0]
  expect(front.className).toContain('select-none')
  expect(front.hasAttribute('data-no-highlight')).toBe(true)
})

it('Quick Review (Dashboard): the click that ends a highlight on the answer does not flip it back', async () => {
  const { default: QuickReview } = await import('../../QuickReview')
  const { default: useStore } = await import('../../../store/useStore')
  const { MemoryRouter } = await import('react-router-dom')
  const due = { m: 'bermain', e: 'to play', ex: 'Adik bermain bola di padang.', t: 'Verbs', lang: 'ms', ...createNewCardState(), due: new Date(0) }
  useStore.setState({ cards: [due], studyLang: 'ms' })
  await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(QuickReview))))
  const reveal = () => host.querySelector('[data-testid="quick-review-reveal"]')
  expect(reveal()).toBeTruthy()
  expect(reveal().querySelector('[data-no-highlight]')).toBeTruthy()
  await click(reveal())
  expect(reveal().getAttribute('aria-expanded')).toBe('true')
  window.getSelection().selectAllChildren(reveal().querySelector('p'))
  await click(reveal())
  expect(reveal().getAttribute('aria-expanded')).toBe('true')
  window.getSelection().removeAllRanges()
  await click(reveal())
  expect(reveal().getAttribute('aria-expanded')).toBe('false') // a plain tap still toggles it
})
