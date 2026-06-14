// @vitest-environment jsdom
//
// F9 — every study mode + Grammar drill announces correct/incorrect via a
// polite live region (WCAG 4.1.3). Two layers:
//  1. Behavioural: mount the two representative modes (typed = ClozeMode,
//     MCQ = QuizMode) and drive a real answer → the role="status" region
//     carries the announcement text.
//  2. Structural (repo convention, cf. authGuard.test.js): the remaining
//     surfaces render <FeedbackLive> bound to their feedback state — pinned
//     against source so a refactor can't silently drop an announcement.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import ClozeMode from '../study/ClozeMode'
import QuizMode from '../study/QuizMode'

const here = dirname(fileURLToPath(import.meta.url))
const src = (p) => readFileSync(resolve(here, p), 'utf8')

const makeSession = () => ({
  rate: vi.fn(),
  nextCard: vi.fn(),
  confidence: null,
  setConfidence: vi.fn(),
  pendingWrongWord: null,
  hypercorrect: false,
  reasonTagged: false,
  tagReason: vi.fn(),
})

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

const typeInto = async (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  await act(async () => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

const click = async (el) =>
  act(async () => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))

const status = () => host.querySelector('[role="status"]')

describe('F9 behavioural — typed mode (ClozeMode)', () => {
  it('mounts an EMPTY live region before any answer, announces the answer on wrong', async () => {
    const card = { m: 'rumah', e: 'house', ex: 'Saya tinggal di rumah besar.' }
    await render(React.createElement(ClozeMode, { card, session: makeSession() }))

    expect(status()).toBeTruthy()
    expect(status().textContent).toBe('')

    await typeInto(host.querySelector('input'), 'salah')
    const checkBtn = [...host.querySelectorAll('button')].find(b => b.textContent === 'Check')
    await click(checkBtn)

    expect(status().textContent).toBe('Not quite — the answer is rumah')
  })

  it('announces Correct! on a right answer', async () => {
    const card = { m: 'rumah', e: 'house', ex: 'Saya tinggal di rumah besar.' }
    await render(React.createElement(ClozeMode, { card, session: makeSession() }))
    await typeInto(host.querySelector('input'), 'rumah')
    const checkBtn = [...host.querySelectorAll('button')].find(b => b.textContent === 'Check')
    await click(checkBtn)
    expect(status().textContent).toBe('Correct!')
  })
})

describe('F9 behavioural — MCQ mode (QuizMode)', () => {
  it('announces Correct! when the right option is chosen', async () => {
    const card = { m: 'rumah', e: 'house', t: 'Home' }
    await render(React.createElement(QuizMode, { card, cardIdx: 0, session: makeSession() }))

    expect(status()).toBeTruthy()
    const right = [...host.querySelectorAll('button')].find(b => b.textContent === 'house')
    expect(right).toBeTruthy()
    await click(right)

    expect(status().textContent).toBe('Correct!')
  })
})

describe('F9 structural — every remaining surface renders FeedbackLive', () => {
  it('TypeMode, ListenMode and ProduceMode bind FeedbackLive to fb', () => {
    for (const f of ['../study/TypeMode.jsx', '../study/ListenMode.jsx', '../study/ProduceMode.jsx']) {
      const code = src(f)
      expect(code).toMatch(/import FeedbackLive from '..\/FeedbackLive'/)
      expect(code).toMatch(/<FeedbackLive/)
    }
  })

  it('FlashcardMode announces all four answer sub-modes (reverse/cloze/audio/produce)', () => {
    const code = src('../study/FlashcardMode.jsx')
    expect(code).toMatch(/import FeedbackLive from '..\/FeedbackLive'/)
    for (const fbVar of ['reverseFb', 'adaptClozeFb', 'audioFb', 'produceFb']) {
      expect(code).toMatch(new RegExp(`<FeedbackLive[^>]*${fbVar}`))
    }
  })

  it('Grammar announces every drill surface (typed, MCQ card, tense, error, transform)', () => {
    const code = src('../../pages/Grammar.jsx')
    expect(code).toMatch(/import FeedbackLive from '..\/components\/FeedbackLive'/)
    for (const fbVar of ['tenseFb', 'errorFb', 'transFb']) {
      expect(code).toMatch(new RegExp(`<FeedbackLive[^>]*${fbVar}`))
    }
    // The typed imbuhan drill (fb) + the shared McqDrillCard (covers
    // confusables / SVA / articles via its fb prop) each render one too.
    const uses = code.match(/<FeedbackLive/g) || []
    expect(uses.length).toBeGreaterThanOrEqual(5)
  })
})
