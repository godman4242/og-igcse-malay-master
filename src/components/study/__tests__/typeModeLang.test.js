// @vitest-environment jsdom
//
// F5 Increment 7 — Type / Quiz study modes must name the RIGHT language in
// their instruction for both card.lang values.
//
// Both modes check the typed/picked answer against `card.e` (the gloss), so
// the instruction language is the OPPOSITE of card.lang:
//   - Malay card  (lang:'ms', card.e = English gloss) → "...the English meaning"
//   - English card(lang:'en', card.e = Malay gloss)   → "...the Malay meaning"
// This is the reverse of FlashcardMode's "word"-direction labels (which
// produce card.m) — do not conflate the two.
//
// Mount harness mirrors feedbackLive.test.js (createRoot + act). TypeMode and
// QuizMode are store-free, so no localStorage shim is needed. A non-null
// `confidence` keeps ConfidenceSlot collapsed (it returns null), trimming the
// mounted subtree to just the label under test.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import TypeMode from '../TypeMode'
import QuizMode from '../QuizMode'

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

// Both modes render their instruction in the only `<p class="...mb-4">`.
const subtitle = () => host.querySelector('p.mb-4')?.textContent ?? ''

// Minimal session stub: confidence non-null → ConfidenceSlot collapses;
// no wrong feedback yet → WrongExtras never mounts.
const session = {
  confidence: 2,
  setConfidence: () => {},
  rate: () => {},
  pendingWrongWord: null,
  hypercorrect: false,
  reasonTagged: null,
  tagReason: () => {},
}

const EN_CARD = { m: 'house', e: 'rumah', lang: 'en', t: 'Home' }
const MS_CARD = { m: 'rumah', e: 'house', lang: 'ms', t: 'Home' }

describe('TypeMode instruction language', () => {
  it('asks for the Malay meaning on an English card (answer = Malay gloss)', async () => {
    await render(React.createElement(TypeMode, { card: EN_CARD, session }))
    expect(subtitle()).toBe('Type the Malay meaning')
  })

  it('asks for the English meaning on a Malay card (answer = English gloss)', async () => {
    await render(React.createElement(TypeMode, { card: MS_CARD, session }))
    expect(subtitle()).toBe('Type the English meaning')
  })
})

describe('QuizMode instruction language', () => {
  it('names the Malay meaning on an English card', async () => {
    await render(React.createElement(QuizMode, { card: EN_CARD, cardIdx: 0, session }))
    expect(subtitle()).toBe('Choose the correct Malay meaning')
  })

  it('names the English meaning on a Malay card', async () => {
    await render(React.createElement(QuizMode, { card: MS_CARD, cardIdx: 0, session }))
    expect(subtitle()).toBe('Choose the correct English meaning')
  })
})
