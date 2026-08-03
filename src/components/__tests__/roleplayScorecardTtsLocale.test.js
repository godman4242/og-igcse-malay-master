// @vitest-environment jsdom
//
// Bilingual TTS parity on the roleplay SCORECARD. `speak()` defaults to
// `ms-MY` (src/lib/speech.js:1 — `speak(text, lang = 'ms-MY', …)`), and all
// three scorecard audio buttons called it with ONE argument:
//
//   :357  speak(phrase)            — a missed key phrase
//   :443  speak(pair.modelAnswer)  — the model answer for a turn
//   :469  speak(v)                 — a missed vocab item
//
// So after an ENGLISH (0510) roleplay, the one artefact a speaking-exam learner
// is meant to imitate — "I'm afraid my suitcase didn't come out on the
// carousel…" — was queued with `utterance.lang = 'ms-MY'` and, on any device
// with a Malay voice installed (which the app's own ms-MY requirement pushes
// the audience to install), read with Malay phonology. The session the learner
// just left already switches correctly to `en-GB`, so the scorecard was the
// odd one out.
//
// `localeFor` (src/lib/langLocale.js) is the repo's designated single source
// for this mapping — the fix must go through it rather than hardcode 'en-GB'.
//
// The same block also pins the three hardcoded MALAY UI labels on that screen
// ("Pemeriksa:", "Awak:", "Dengar"), which an English learner should not see.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const speakSpy = vi.fn()
vi.mock('../../lib/speech', () => ({ speak: (...a) => speakSpy(...a) }))
vi.mock('../../lib/confetti', () => ({ fireConfetti: () => {} }))

let React, act, createRoot, MemoryRouter, RoleplayScorecard
let root, host

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  speakSpy.mockClear()
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
  ;({ default: React, act } = await import('react'))
  ;({ createRoot } = await import('react-dom/client'))
  ;({ MemoryRouter } = await import('react-router-dom'))
  ;({ default: RoleplayScorecard } = await import('../RoleplayScorecard'))

  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

// modelAnswers is keyed by turn number (RoleplayScorecard.jsx:377), so turn 1
// needs key `1` for the "model answer" audio button to render.
const EN_SCENARIO = {
  id: 'lost-luggage', lang: 'en', title: 'Lost Luggage', keyVocab: [],
  modelAnswers: { 1: "I'm afraid my suitcase didn't come out on the carousel." },
}
const MS_SCENARIO = {
  id: 'restoran', title: 'Di Restoran', keyVocab: [],
  modelAnswers: { 1: 'Saya ingin memesan nasi goreng, terima kasih.' },
}

// One examiner→student pair, so the transcript rows (and their labels) render.
const MESSAGES = [
  { role: 'examiner', content: 'Good morning, how may I help you?' },
  { role: 'student', content: 'My bag is missing.' },
]

const mount = (scenario) =>
  act(async () =>
    root.render(
      React.createElement(MemoryRouter, null,
        React.createElement(RoleplayScorecard, {
          scenario,
          messages: MESSAGES,
          scoreData: { overallBand: 4, keyPhraseMissed: ['pencuci mulut'] },
        }))
    )
  )

const click = (el) => act(async () => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
const audioButtons = () => [...host.querySelectorAll('button')].filter(b => b.querySelector('svg'))

describe('RoleplayScorecard — speaks each language with its own voice', () => {
  it('speaks a missed key phrase in en-GB after an ENGLISH roleplay', async () => {
    await mount(EN_SCENARIO)
    const btn = [...host.querySelectorAll('button')].find(b => b.textContent.includes('pencuci mulut'))
    expect(btn, 'missed key-phrase audio button not rendered').toBeTruthy()
    await click(btn)

    expect(speakSpy).toHaveBeenCalled()
    expect(speakSpy.mock.calls[0][1], 'speak() locale argument').toBe('en-GB')
  })

  it('still speaks Malay content in ms-MY (no regression)', async () => {
    await mount(MS_SCENARIO)
    const btn = [...host.querySelectorAll('button')].find(b => b.textContent.includes('pencuci mulut'))
    await click(btn)

    expect(speakSpy.mock.calls[0][1]).toBe('ms-MY')
  })

  it('never calls speak() without an explicit locale', async () => {
    // A single-argument call silently inherits the ms-MY default — the defect.
    await mount(EN_SCENARIO)
    for (const b of audioButtons()) await click(b)

    const bare = speakSpy.mock.calls.filter(c => c.length < 2 || c[1] == null)
    expect(bare, 'speak() calls that fell back to the ms-MY default').toEqual([])
  })

  it('does not label an English scorecard with Malay UI words', async () => {
    await mount(EN_SCENARIO)
    const text = host.textContent
    for (const malayLabel of ['Pemeriksa:', 'Awak:', 'Dengar']) {
      expect(text, `Malay label "${malayLabel}" shown to an English learner`).not.toContain(malayLabel)
    }
  })
})
