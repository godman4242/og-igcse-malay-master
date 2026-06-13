// Audio transcription language pref ("study from a recording", Task 9).
// STORE_VERSION 32→33 adds pdfReader.asrLang ('ms' | 'en'), persisted so a recording
// opens with the learner's last-chosen Whisper language hint. Mirrors ocrLang (v29).

import { describe, it, expect, beforeEach } from 'vitest'
import useStore, { STORE_VERSION } from '../useStore'

describe('pdfReader.asrLang slice', () => {
  it('STORE_VERSION is at least 33', () => {
    expect(STORE_VERSION).toBeGreaterThanOrEqual(33)
  })

  it('defaults to Malay (0546 primary syllabus)', () => {
    expect(useStore.getInitialState().pdfReader.asrLang).toBe('ms')
  })

  describe('setAsrLang', () => {
    beforeEach(() => {
      useStore.setState((s) => ({ pdfReader: { ...s.pdfReader, asrLang: 'ms' } }))
    })

    it('sets English', () => {
      useStore.getState().setAsrLang('en')
      expect(useStore.getState().pdfReader.asrLang).toBe('en')
    })

    it('sets Malay back', () => {
      useStore.setState((s) => ({ pdfReader: { ...s.pdfReader, asrLang: 'en' } }))
      useStore.getState().setAsrLang('ms')
      expect(useStore.getState().pdfReader.asrLang).toBe('ms')
    })

    it('coerces any non-"en" value to Malay (never persists garbage)', () => {
      useStore.getState().setAsrLang('bogus')
      expect(useStore.getState().pdfReader.asrLang).toBe('ms')
      useStore.getState().setAsrLang(undefined)
      expect(useStore.getState().pdfReader.asrLang).toBe('ms')
    })
  })
})
