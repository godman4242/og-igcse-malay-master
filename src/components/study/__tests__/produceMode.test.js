// @vitest-environment jsdom
//
// Produce mode — the 7th, SELECTABLE study mode. It drills PRODUCTIVE recall
// (the app's #1 learning principle): show the gloss `card.e` → type the target
// word `card.m`. FlashcardMode's reverse/produce variants already do this, but
// ONLY when the FSRS variant engine hands a Strong/Mature card to Flashcard
// mode; ProduceMode makes production a top-level CHOICE for any card.
//
// Direction (mirrors FlashcardMode reverse/produce — always checks card.m):
//   - Malay card  (lang:'ms', card.e = English gloss) → show English, "Type the Malay word…"
//   - English card(lang:'en', card.e = Malay gloss)   → show Malay,   "Type the English word…"
//
// Mount harness mirrors typeModeLang.test.js (createRoot + act). ProduceMode is
// store-free; a non-null `confidence` keeps ConfidenceSlot collapsed.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Rating } from '../../../lib/fsrs'
import ProduceMode from '../ProduceMode'

let root, host

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

const render = async (el) => act(async () => root.render(el))

// React controlled-input update (native setter so React's onChange fires).
const typeInto = async (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  await act(async () => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const click = async (el) =>
  act(async () => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
const findButton = (text) =>
  [...host.querySelectorAll('button')].find(b => b.textContent.includes(text))

const makeSession = (over = {}) => ({
  confidence: 2,
  setConfidence: () => {},
  rate: () => {},
  pendingWrongWord: null,
  hypercorrect: false,
  reasonTagged: null,
  tagReason: () => {},
  ...over,
})

const gloss = () => host.querySelector('[data-testid="produce-gloss"]')?.textContent ?? ''
const placeholder = () => host.querySelector('input')?.placeholder ?? ''

const EN_CARD = { m: 'house', e: 'rumah', lang: 'en', t: 'Home' }
const MS_CARD = { m: 'rumah', e: 'house', lang: 'ms', t: 'Home', ex: 'Saya tinggal di rumah besar.' }

describe('ProduceMode direction', () => {
  it('shows the Malay gloss and asks for the English word on an English card', async () => {
    await render(React.createElement(ProduceMode, { card: EN_CARD, session: makeSession() }))
    expect(gloss()).toBe('rumah')
    expect(placeholder()).toBe('Type the English word...')
  })

  it('shows the English gloss and asks for the Malay word on a Malay card', async () => {
    await render(React.createElement(ProduceMode, { card: { ...MS_CARD, ex: undefined }, session: makeSession() }))
    expect(gloss()).toBe('house')
    expect(placeholder()).toBe('Type the Malay word...')
  })
})

describe('ProduceMode grading (exact match vs the target word)', () => {
  it('rates Good on a case/space-insensitive exact match of card.m', async () => {
    let rated = null
    await render(React.createElement(ProduceMode, { card: EN_CARD, session: makeSession({ rate: r => { rated = r } }) }))
    await typeInto(host.querySelector('input'), '  House  ')
    await click(findButton('Check'))
    expect(rated).toBe(Rating.Good)
  })

  it('rates Again and reveals the target word on a wrong answer', async () => {
    let rated = null
    await render(React.createElement(ProduceMode, { card: EN_CARD, session: makeSession({ rate: r => { rated = r } }) }))
    await typeInto(host.querySelector('input'), 'wrong')
    await click(findButton('Check'))
    expect(rated).toBe(Rating.Again)
    expect(host.textContent).toContain('house') // the revealed answer = card.m
    // and the polite live region announces it
    expect(host.querySelector('[role="status"]').textContent).toBe('Not quite — the answer is house')
  })

  it('does nothing on an empty submission (no rate, no feedback)', async () => {
    let rated = 'untouched'
    await render(React.createElement(ProduceMode, { card: EN_CARD, session: makeSession({ rate: r => { rated = r } }) }))
    await click(findButton('Check'))
    expect(rated).toBe('untouched')
  })
})

describe('ProduceMode context sentence', () => {
  it('shows a blanked context line when the card has a usable example (>10 chars)', async () => {
    await render(React.createElement(ProduceMode, { card: MS_CARD, session: makeSession() }))
    const ctx = host.querySelector('[data-testid="produce-context"]')
    expect(ctx).not.toBeNull()
    expect(ctx.textContent).toContain('_____')
    expect(ctx.textContent.toLowerCase()).not.toContain('rumah') // target blanked out
  })

  it('renders no context line when the card has no example', async () => {
    await render(React.createElement(ProduceMode, { card: EN_CARD, session: makeSession() }))
    expect(host.querySelector('[data-testid="produce-context"]')).toBeNull()
  })
})

describe('ProduceMode hint', () => {
  it('reveals the first letter of the target word when the hint is tapped', async () => {
    await render(React.createElement(ProduceMode, { card: EN_CARD, session: makeSession() }))
    const hintBtn = findButton('first letter')
    expect(hintBtn).not.toBeNull()
    await click(hintBtn)
    expect(host.querySelector('[data-testid="produce-hint"]')?.textContent ?? '').toContain('h') // house → h
  })
})
