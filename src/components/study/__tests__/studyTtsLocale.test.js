// @vitest-environment jsdom
//
// TTS locale parity — the card-study path must pronounce a card in ITS OWN
// language, not always Malay. After v34 (True English study mode) cards carry
// `lang`, and `localeFor(lang)` ('ms'→ms-MY, 'en'→en-GB) is the single locale
// source. Two leaks remained:
//   - FlashcardMode keyboard `s` shortcut hardcoded 'ms-MY' (the on-card
//     speaker button already used localeFor) → an English card spoken in Malay.
//   - MixedSession (Smart Study) speaker buttons called speak(item.m) with NO
//     locale → defaulted to ms-MY for English vocab too.
//
// Layer 1 (behavioural): mount FlashcardMode with an English card, mock the
// speech module, press `s`, assert speak() got the English locale.
// Layer 2 (structural, repo convention cf. studyFeedbackA11y.test.js): the
// store-coupled MixedSession is pinned against source so the locale arg can't
// be silently dropped again.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

// Mock the speech module BEFORE importing the component under test.
const speakSpy = vi.fn()
vi.mock('../../../lib/speech', () => ({
  speak: (...args) => speakSpy(...args),
  startKeywordSpotter: () => ({ stop: () => {} }),
  hasSpeechRecognition: () => false, // keep the spotter UI/effect out of the way
}))

const FlashcardMode = (await import('../FlashcardMode')).default

const here = dirname(fileURLToPath(import.meta.url))
const src = (p) => readFileSync(resolve(here, p), 'utf8')

let root, host

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  speakSpy.mockClear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

const render = async (el) => act(async () => root.render(el))

const session = {
  cardVariant: { variant: 'standard', label: 'New' },
  scheduling: null,
  vocabTip: null,
  rate: () => {},
  nextCard: () => {},
}

describe('FlashcardMode keyboard "s" shortcut speaks in the card language', () => {
  it('uses en-GB for an English card', async () => {
    const card = { m: 'house', e: 'rumah', lang: 'en', t: 'Home', state: 0, stability: 0 }
    await render(React.createElement(FlashcardMode, { card, session }))
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))
    })
    expect(speakSpy).toHaveBeenCalled()
    expect(speakSpy.mock.calls[0][0]).toBe('house')
    expect(speakSpy.mock.calls[0][1]).toBe('en-GB')
  })

  it('uses ms-MY for a Malay card (unchanged)', async () => {
    const card = { m: 'rumah', e: 'house', lang: 'ms', t: 'Home', state: 0, stability: 0 }
    await render(React.createElement(FlashcardMode, { card, session }))
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))
    })
    expect(speakSpy.mock.calls[0][1]).toBe('ms-MY')
  })
})

describe('MixedSession speaker buttons pass the item locale (structural)', () => {
  const code = src('../../MixedSession.jsx')

  it('imports localeFor', () => {
    expect(code).toMatch(/import \{ localeFor \} from '\.\.\/lib\/langLocale'/)
  })

  it('never calls speak(current.item.m) without a locale', () => {
    expect(code).not.toMatch(/speak\(current\.item\.m\)/)
  })

  it('passes localeFor(current.item.lang) at both speaker buttons', () => {
    const matches = code.match(/speak\(current\.item\.m,\s*localeFor\(current\.item\.lang\)\)/g) || []
    expect(matches.length).toBe(2)
  })
})
