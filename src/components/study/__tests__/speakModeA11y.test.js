// @vitest-environment jsdom
//
// SpeakMode was the ONE study mode with no live region (WCAG 2.1 SC 4.1.3
// Status Messages). It injects a whole verdict in place after an attempt — a
// 0-100% ring, "Excellent!/Good try!/Keep practicing!", the recognised
// transcript, a per-word chip row and a correct/close/wrong tally — and it
// silently rates the card (`session.rate(Rating.Easy/Good)`). A screen-reader
// learner heard NOTHING: they tap, speak, and the app appears not to respond,
// while their FSRS schedule moves underneath them.
//
// Two things the original lead got wrong and this test pins:
//   * The mic-failure branch ("Could not recognize speech.") must announce too —
//     it is the case a blind learner most needs, because otherwise literally
//     nothing changes audibly after they speak.
//   * The per-word chip row must NOT be read out verbatim. `alignWords`
//     (src/lib/pronunciation.js:77) emits `{ word: '', status: 'extra' }` rows
//     for extra spoken words — verified live, `scorePronunciation('saya makan
//     nasi', 'saya makan nasi goreng sedap')` returns two such rows — so a
//     per-chip readout announces empty tokens. The numeric tally is the
//     equivalent, robust summary.
//
// The last block is a COMPLETENESS sweep rather than another hardcoded list:
// every `*Mode.jsx` under src/components/study must reach a FeedbackLive. A
// hardcoded list is what let SpeakMode slip through the original F9 rollout.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

let recognitionResult = null

vi.mock('../../../lib/speech', () => ({
  speak: () => {},
  startRecognition: () => (recognitionResult instanceof Error
    ? Promise.reject(recognitionResult)
    : Promise.resolve(recognitionResult)),
  hasSpeechRecognition: () => true,
}))

vi.mock('../../../lib/audioRecorder', () => ({
  hasAudioRecording: () => false,
  createAudioRecorder: () => ({ start: () => Promise.resolve(), stop: () => Promise.resolve(null) }),
}))

const SpeakMode = (await import('../SpeakMode')).default

const here = dirname(fileURLToPath(import.meta.url))
const studyDir = resolve(here, '..')

let root, host

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  recognitionResult = null
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

const CARD = { m: 'sekolah', e: 'school', lang: 'ms' }
const session = { rate: () => {}, nextCard: () => {} }

const render = (card = CARD) =>
  act(async () => root.render(React.createElement(SpeakMode, { card, session })))
const status = () => host.querySelector('[role="status"]')
const speakButton = () => [...host.querySelectorAll('button')].find(b => b.textContent.includes('Tap & Speak'))
const tapAndSpeak = async () =>
  act(async () => { speakButton().dispatchEvent(new MouseEvent('click', { bubbles: true })) })

describe('SpeakMode — announces the pronunciation verdict via a live region', () => {
  it('mounts the live region EMPTY before any attempt', async () => {
    await render()
    expect(status()).toBeTruthy()
    expect(status().textContent).toBe('')
  })

  it('announces the score, verdict and tally after a scored attempt', async () => {
    recognitionResult = [{ transcript: 'sekolah', confidence: 0.9 }]
    await render()
    await tapAndSpeak()

    const text = status().textContent
    expect(text).toContain('Excellent!')
    expect(text).toContain('100')
    // The tally the eye sees (✅1 〜0 ✗0) reaches the ear as words.
    expect(text).toMatch(/1 correct/)
    expect(text).toMatch(/0 close/)
    expect(text).toMatch(/0 wrong/)
  })

  it('announces a low-scoring attempt with the encouraging verdict, not silence', async () => {
    recognitionResult = [{ transcript: 'kereta', confidence: 0.4 }]
    await render()
    await tapAndSpeak()

    expect(status().textContent).toMatch(/Keep practicing!/)
  })

  it('announces the mic failure instead of leaving the learner with silence', async () => {
    recognitionResult = new Error('no speech')
    await render()
    await tapAndSpeak()

    expect(status().textContent).toBe('Could not recognize speech. Try again.')
  })

  it('never announces an empty word token from an "extra" alignment row', async () => {
    // Extra spoken words produce { word: '', status: 'extra' } rows — reading the
    // chip row verbatim would emit blanks. Announce the tally instead.
    recognitionResult = [{ transcript: 'sekolah menengah kebangsaan', confidence: 0.9 }]
    await render()
    await tapAndSpeak()

    const text = status().textContent
    expect(text.length).toBeGreaterThan(0)
    expect(text).not.toMatch(/\s,|,\s*,|\s{2,}/)
  })
})

describe('SpeakMode — completeness sweep over every study mode', () => {
  it('every *Mode.jsx under src/components/study reaches a FeedbackLive', () => {
    const modes = readdirSync(studyDir).filter(f => /Mode\.jsx$/.test(f))
    expect(modes.length).toBeGreaterThanOrEqual(7)

    const missing = modes.filter(f => !/<FeedbackLive/.test(readFileSync(resolve(studyDir, f), 'utf8')))
    expect(missing, 'study modes with no polite live region').toEqual([])
  })
})
