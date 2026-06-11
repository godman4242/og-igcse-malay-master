// Exam Rehearsal subject toggle (Issue 4a) — store slice behaviour.
// STORE_VERSION 26→27 adds examRehearsalLang ('ms' | 'en'), persisted so a
// rehearsal opens in the learner's last-chosen language instead of a random mix.

import { describe, it, expect, beforeEach } from 'vitest'
import useStore, { STORE_VERSION } from '../useStore'

describe('examRehearsalLang slice', () => {
  it('STORE_VERSION is at least 27', () => {
    expect(STORE_VERSION).toBeGreaterThanOrEqual(27)
  })

  it('defaults to Malay (0546 primary syllabus)', () => {
    expect(useStore.getInitialState().examRehearsalLang).toBe('ms')
  })

  describe('setExamRehearsalLang', () => {
    beforeEach(() => {
      useStore.setState({ examRehearsalLang: 'ms' })
    })

    it('sets English', () => {
      useStore.getState().setExamRehearsalLang('en')
      expect(useStore.getState().examRehearsalLang).toBe('en')
    })

    it('sets Malay back', () => {
      useStore.setState({ examRehearsalLang: 'en' })
      useStore.getState().setExamRehearsalLang('ms')
      expect(useStore.getState().examRehearsalLang).toBe('ms')
    })

    it('coerces any non-"en" value to Malay (never persists garbage)', () => {
      useStore.getState().setExamRehearsalLang('bogus')
      expect(useStore.getState().examRehearsalLang).toBe('ms')
      useStore.getState().setExamRehearsalLang(undefined)
      expect(useStore.getState().examRehearsalLang).toBe('ms')
    })
  })
})
