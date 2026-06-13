import { describe, it, expect } from 'vitest'
import { segmentsFromAsrOutput } from '../transcribeEngine'

describe('segmentsFromAsrOutput', () => {
  it('maps Whisper chunks [{text,timestamp:[s,e]}] → [{text,start,end}]', () => {
    const out = { text: 'Satu dua.', chunks: [
      { text: 'Satu', timestamp: [0, 0.5] }, { text: 'dua.', timestamp: [0.5, 1] },
    ] }
    expect(segmentsFromAsrOutput(out)).toEqual([
      { text: 'Satu', start: 0, end: 0.5 },
      { text: 'dua.', start: 0.5, end: 1 },
    ])
  })
  it('missing chunks → []', () => {
    expect(segmentsFromAsrOutput({ text: 'x' })).toEqual([])
    expect(segmentsFromAsrOutput(null)).toEqual([])
  })
})
