// @vitest-environment jsdom
//
// Census A6 (2026-08-06): the Mistake Journal's manual "+ Card" button was
// hard-gated to `m.language === 'ms'`, so a 0510 English learner could never
// hand-add an English miss to their deck — even one carrying both a word and a
// correction, which is everything a card is built from.
//
// It was a leftover from before v34 (True English study mode). The store side
// has been bilingual since: `promoteMistakeToCard` derives the new card's
// target language from `mistake.language`, so nothing below the UI needed to
// change. The AUTO-promotion gate (`canAutoPromoteMistake`, ms = vocab+imbuhan
// / en = vocab-only) is deliberately narrower and is NOT what this pins —
// manual promotion is a deliberate tap and is not category-gated.

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
const { default: MistakeJournal } = await import('../MistakeJournal')
const { default: useStore } = await import('../../store/useStore')
// MistakeJournal calls useNavigate() (the "study these" jump), so it only
// mounts inside a Router.
const { MemoryRouter } = await import('react-router-dom')

const mistake = (over = {}) => ({
  id: `m-${over.word || 'x'}`,
  ts: Date.now(),
  type: 'vocab',
  source: 'writing',
  language: 'ms',
  category: 'vocab',
  severity: 'medium',
  word: 'kata',
  correct: 'word',
  attempts: 1,
  reviewed: false,
  promotedCardId: null,
  ...over,
})

describe('MistakeJournal manual "+ Card" promotion is bilingual (census A6)', () => {
  let root, container

  const mount = async (mistakes) => {
    useStore.setState({ mistakes, cards: [], studyLang: 'ms' })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => root.render(
      React.createElement(MemoryRouter, null, React.createElement(MistakeJournal)),
    ))
  }

  const promoteButtons = () =>
    [...container.querySelectorAll('button')].filter(b => b.title === 'Promote to flashcard')

  beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true })

  afterEach(async () => {
    if (root) await act(async () => root.unmount())
    container?.remove()
    root = null
  })

  it('offers "+ Card" on a Malay mistake (guards the fixture)', async () => {
    await mount([mistake()])
    expect(promoteButtons()).toHaveLength(1)
  })

  it('offers "+ Card" on an ENGLISH mistake too', async () => {
    await mount([mistake({ language: 'en', word: 'recieve', correct: 'receive' })])
    expect(promoteButtons(), 'an English learner must be able to promote their own miss').toHaveLength(1)
  })

  it('mints an English card, in the English deck, when that button is tapped', async () => {
    await mount([mistake({ language: 'en', word: 'recieve', correct: 'receive' })])
    await act(async () => {
      promoteButtons()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const card = useStore.getState().cards.find(c => c.m === 'recieve')
    expect(card, 'a card should exist for the promoted English mistake').toBeTruthy()
    expect(card.lang, 'the card must join the English deck, not the Malay one').toBe('en')
  })

  it('still hides "+ Card" once a mistake has been promoted', async () => {
    await mount([mistake({ language: 'en', promotedCardId: 'already' })])
    expect(promoteButtons()).toHaveLength(0)
  })
})
