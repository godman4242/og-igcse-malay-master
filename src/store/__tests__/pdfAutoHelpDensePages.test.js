// PDF beginner auto-help on dense pages (Claim 6b) — store slice behaviour.
// STORE_VERSION 27→28 adds pdfReader.autoHelpDensePages (default OFF), persisted
// so the reveal-gate stays the default for everyone unless a learner opts in.

import { describe, it, expect, beforeEach } from 'vitest'
import useStore, { STORE_VERSION } from '../useStore'

describe('pdfReader.autoHelpDensePages slice', () => {
  it('STORE_VERSION is at least 28', () => {
    expect(STORE_VERSION).toBeGreaterThanOrEqual(28)
  })

  it('defaults OFF (the reveal-gate stays the default for everyone)', () => {
    expect(useStore.getInitialState().pdfReader.autoHelpDensePages).toBe(false)
  })

  it('preserves the other pdfReader prefs', () => {
    const pref = useStore.getInitialState().pdfReader
    expect(pref).toMatchObject({ layoutView: false, sentenceRender: 'inline', autoHelpDensePages: false })
  })

  describe('setPdfAutoHelpDensePages', () => {
    beforeEach(() => {
      useStore.setState(s => ({ pdfReader: { ...s.pdfReader, autoHelpDensePages: false } }))
    })

    it('turns the pref ON', () => {
      useStore.getState().setPdfAutoHelpDensePages(true)
      expect(useStore.getState().pdfReader.autoHelpDensePages).toBe(true)
    })

    it('turns it back OFF', () => {
      useStore.getState().setPdfAutoHelpDensePages(true)
      useStore.getState().setPdfAutoHelpDensePages(false)
      expect(useStore.getState().pdfReader.autoHelpDensePages).toBe(false)
    })

    it('coerces truthy/falsy inputs to a real boolean', () => {
      useStore.getState().setPdfAutoHelpDensePages('yes')
      expect(useStore.getState().pdfReader.autoHelpDensePages).toBe(true)
      useStore.getState().setPdfAutoHelpDensePages(0)
      expect(useStore.getState().pdfReader.autoHelpDensePages).toBe(false)
    })

    it('does not clobber sibling pdfReader prefs', () => {
      useStore.setState(s => ({ pdfReader: { ...s.pdfReader, layoutView: true, sentenceRender: 'sheet' } }))
      useStore.getState().setPdfAutoHelpDensePages(true)
      const pref = useStore.getState().pdfReader
      expect(pref.layoutView).toBe(true)
      expect(pref.sentenceRender).toBe('sheet')
      expect(pref.autoHelpDensePages).toBe(true)
    })
  })
})
