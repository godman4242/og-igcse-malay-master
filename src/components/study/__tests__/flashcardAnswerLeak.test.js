// @vitest-environment jsdom
//
// Census A10 (2026-08-06): the flashcard leaked its answer to screen readers,
// so the retrieval attempt the whole app is built on never happened.
//
// Two separate leaks, only the first of which the census found:
//
//  1. The BACK face is hidden with `backface-hidden` + `rotate-y-180`. Those are
//     VISUAL CSS properties — they do not remove anything from the
//     accessibility tree. So VoiceOver/NVDA read straight through the card and
//     announced "rumah … house … Saya tinggal di rumah" in one pass.
//
//  2. Found while sweeping, and worse: the FRONT face renders
//     `<DictionaryIcon word={card.m} meaning={card.e} />`, and DictionaryIcon
//     builds `aria-label`/`alt` as `` `${word} — ${meaning}` `` — so the English
//     gloss was announced on the FRONT of the card, before any flip at all.
//     Every other DictionaryIcon caller (word families, roleplay vocab,
//     comprehension popover, reader glossary) is a post-reveal context where the
//     meaning is already on screen; the flashcard front is the only pre-reveal
//     one, so the fix is at the call site, not in the component.
//
// `inert` rather than only `aria-hidden`, matching the precedent set by the
// theater-mode fix in Layout.jsx (P1-01): the front face contains real buttons
// (pronounce, "Show hint"), so once flipped they must leave the focus order
// too, not merely the screen-reader output.

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
const { default: FlashcardMode } = await import('../FlashcardMode')
const { default: useStore } = await import('../../../store/useStore')
const { createNewCardState } = await import('../../../lib/fsrs')

// `rumah` has a dictionary icon, which is what makes the front-face leak real.
const CARD = { m: 'rumah', e: 'house', t: 'Rumah', lang: 'ms', ex: 'Saya tinggal di rumah.', ...createNewCardState() }

const session = {
  rate: () => {},
  scheduling: null,
  cardVariant: { variant: 'standard', label: 'New' },
  confidence: null,
  setConfidence: () => {},
}

describe('FlashcardMode does not leak the answer before the flip (census A10)', () => {
  let root, container

  const mount = async () => {
    useStore.setState({ showDictionaryImages: true, studyLang: 'ms' })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => root.render(
      React.createElement(FlashcardMode, { card: CARD, session }),
    ))
  }

  // The FRONT face only. Scoped deliberately: jsdom's `textContent` reports an
  // `inert` subtree just like any other, so asserting over the whole container
  // could never tell a fixed card from a broken one — it would fail even with
  // the back face correctly inert. What we actually care about is that nothing
  // WITHIN the face the learner is looking at speaks the answer.
  const frontFace = () => container.querySelector('.backface-hidden:not(.rotate-y-180)')
  const announcedOnFront = () => {
    const face = frontFace()
    const labels = [...face.querySelectorAll('[aria-label], img[alt]')]
      .map(el => el.getAttribute('aria-label') || el.getAttribute('alt') || '')
    return `${face.textContent} ${labels.join(' ')}`
  }

  beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true })

  afterEach(async () => {
    if (root) await act(async () => root.unmount())
    container?.remove()
    root = null
  })

  it('shows the Malay prompt (guards the fixture)', async () => {
    await mount()
    expect(container.textContent).toContain('rumah')
  })

  it('renders the dictionary icon on the front face, so the leak path is exercised', async () => {
    await mount()
    const icon = frontFace().querySelector('[role="img"], img')
    expect(icon, 'no icon means this test would pass vacuously').toBeTruthy()
  })

  it('never announces the English gloss on the FRONT face', async () => {
    await mount()
    expect(announcedOnFront(), 'the answer must not reach a screen reader before the reveal').not.toContain('house')
  })

  it('still announces the Malay word via the icon (the fix did not just blank it)', async () => {
    await mount()
    const icon = frontFace().querySelector('[role="img"], img')
    const name = icon.getAttribute('aria-label') || icon.getAttribute('alt')
    expect(name).toBe('rumah')
  })

  it('keeps the answer face out of the accessibility tree until flipped', async () => {
    await mount()
    const back = container.querySelector('.rotate-y-180')
    expect(back, 'the back face should be findable').toBeTruthy()
    const hidden = back.hasAttribute('inert') || back.getAttribute('aria-hidden') === 'true'
    expect(hidden, 'the unflipped answer face must be inert or aria-hidden').toBe(true)
  })
})
