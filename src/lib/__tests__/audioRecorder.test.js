import { describe, it, expect } from 'vitest'
import { pickRecorderMimeType, RECORDER_MIME_CANDIDATES } from '../audioRecorder'

describe('pickRecorderMimeType', () => {
  it('returns the first candidate the browser reports as supported', () => {
    // Only the second candidate is supported.
    const isSupported = (t) => t === RECORDER_MIME_CANDIDATES[1]
    expect(pickRecorderMimeType(isSupported)).toBe(RECORDER_MIME_CANDIDATES[1])
  })

  it('prefers earlier candidates (opus webm) when several are supported', () => {
    const isSupported = () => true
    expect(pickRecorderMimeType(isSupported)).toBe(RECORDER_MIME_CANDIDATES[0])
  })

  it('falls back to empty string (browser default) when nothing matches', () => {
    expect(pickRecorderMimeType(() => false)).toBe('')
  })

  it('falls back to empty string when no detector is available', () => {
    // Simulates a browser with no MediaRecorder.isTypeSupported.
    expect(pickRecorderMimeType(null)).toBe('')
    expect(pickRecorderMimeType(undefined)).toBe('')
  })

  it('survives a detector that throws', () => {
    expect(pickRecorderMimeType(() => { throw new Error('boom') })).toBe('')
  })
})
