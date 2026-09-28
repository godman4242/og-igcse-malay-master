// 2026-09-28 bug hunt R4 #2: a recognition session may end with `nomatch`
// (speech heard, nothing recognised — a mumble, a cough) or a bare `end` (no
// result, no error). startRecognition never settled on either, so every awaiting
// mic button (Cikgu Maya, Exam Rehearsal, Speak mode, both Roleplays) stayed
// "Listening…" forever. It must settle with an empty result list — every caller
// already treats [] as "nothing heard".
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { startRecognition } from '../speech'

let rec
class FakeSR { constructor() { rec = this } start() {} stop() {} abort() {} }
const settled = (p) => Promise.race([p.then(v => ({ v })), new Promise(r => setTimeout(() => r('PENDING'), 20))])

beforeEach(() => { globalThis.window = { SpeechRecognition: FakeSR } })
afterEach(() => { delete globalThis.window })

describe('startRecognition settles on every way a session can end', () => {
  it('nomatch then end → []', async () => {
    const p = startRecognition('ms-MY')
    rec.onnomatch?.({}); rec.onend()
    expect(await settled(p)).toEqual({ v: [] })
  })

  it('a bare end (no result, no error) → []', async () => {
    const p = startRecognition('ms-MY')
    rec.onend()
    expect(await settled(p)).toEqual({ v: [] })
  })

  it('a result followed by end still resolves the result', async () => {
    const p = startRecognition('ms-MY')
    rec.onresult({ results: [[{ transcript: 'Saya Suka ', confidence: 0.9 }]] })
    rec.onend()
    expect(await settled(p)).toEqual({ v: [{ transcript: 'saya suka', confidence: 0.9 }] })
  })
})
