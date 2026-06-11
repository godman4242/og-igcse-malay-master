// Unit suite for the vision recognizer — the payoff of Phase 1's injected
// `recognize` contract: createVisionRecognizer is just a SECOND producer of
// (image) => {text, words}, so it's validated by feeding the REAL runOcr and
// asserting the Phase-1 {pages} shape falls out unchanged.
// `words: []` by construction ⇒ meanConfidence 0 + empty lowConfidenceWords ⇒
// the Tesseract blurry note / dotted cue can never misfire on a vision read.
// Spec: docs/superpowers/specs/2026-06-11-past-paper-ocr-vision-rung-design.md (Fork 1b/5, S4)
// Plan: docs/superpowers/plans/2026-06-11-past-paper-ocr-vision-rung.md (Task 5)

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../instruct', () => ({ callInstructVision: vi.fn() }))

import { callInstructVision } from '../instruct'
import { createVisionRecognizer } from '../ocrVisionEngine'
import { runOcr } from '../ocr'

const fakeInline = { mimeType: 'image/jpeg', data: 'B64' }

beforeEach(() => { vi.clearAllMocks() })

describe('runOcr contract (documents what the recognizer must emit)', () => {
  it('a vision-shaped recognize flows through the REAL runOcr into the {pages} shape', async () => {
    const recognize = async () => ({ text: 'Saya suka.\n\nNasi lemak.', words: [] })
    const { pages, meanConfidence, lowConfidenceWords } = await runOcr(['img'], { recognize })
    expect(pages).toEqual([{ pageNum: 1, text: 'Saya suka.\n\nNasi lemak.', paragraphs: ['Saya suka.', 'Nasi lemak.'] }])
    expect(meanConfidence).toBe(0)          // no per-word confidence → suppress blurry note
    expect(lowConfidenceWords.size).toBe(0) // → suppress dotted cue
  })
})

describe('createVisionRecognizer', () => {
  it('converts the image, calls callInstructVision with the transcription prompt, returns {text, words: []}', async () => {
    callInstructVision.mockResolvedValue('Saya suka.\n\nNasi lemak.')
    const toInlineData = vi.fn(async () => fakeInline)
    const rec = createVisionRecognizer({ lang: 'ms', toInlineData })

    const out = await rec.recognize('fake-image')
    expect(toInlineData).toHaveBeenCalledWith('fake-image')
    expect(callInstructVision).toHaveBeenCalledTimes(1)
    const args = callInstructVision.mock.calls[0][0]
    expect(args.images).toEqual([fakeInline])
    expect(args.systemPrompt).toMatch(/transcriber/i)
    expect(args.messages[0].content).toMatch(/Malay/i)
    expect(out).toEqual({ text: 'Saya suka.\n\nNasi lemak.', words: [] })
  })

  it('strips a wrapping markdown fence from the model output (cleanVisionText applied)', async () => {
    callInstructVision.mockResolvedValue('```\nNasi lemak sedap.\n```')
    const rec = createVisionRecognizer({ lang: 'ms', toInlineData: async () => fakeInline })
    await expect(rec.recognize('img')).resolves.toEqual({ text: 'Nasi lemak sedap.', words: [] })
  })

  it('threads the abort signal through to callInstructVision', async () => {
    callInstructVision.mockResolvedValue('x')
    const ac = new AbortController()
    const rec = createVisionRecognizer({ lang: 'en', signal: ac.signal, toInlineData: async () => fakeInline })
    await rec.recognize('img')
    expect(callInstructVision.mock.calls[0][0].signal).toBe(ac.signal)
  })

  it('propagates a provider failure (runOcr isolates it into an empty page)', async () => {
    const boom = Object.assign(new Error('no provider'), { cause: 'no_vision_provider' })
    callInstructVision.mockRejectedValue(boom)
    const rec = createVisionRecognizer({ lang: 'ms', toInlineData: async () => fakeInline })
    await expect(rec.recognize('img')).rejects.toBe(boom)

    // …and through the real runOcr that becomes an empty page, never a crash:
    const { pages } = await runOcr(['img'], { recognize: rec.recognize })
    expect(pages).toEqual([{ pageNum: 1, text: '', paragraphs: [] }])
  })

  it('end-to-end: recognizer → REAL runOcr → Phase-1 {pages} with meanConfidence 0', async () => {
    callInstructVision.mockResolvedValue('Saya suka.\n\nNasi lemak.')
    const rec = createVisionRecognizer({ lang: 'ms', toInlineData: async () => fakeInline })
    const { pages, meanConfidence, lowConfidenceWords } = await runOcr(['a', 'b'], { recognize: rec.recognize })
    expect(pages).toHaveLength(2)
    expect(pages[0]).toEqual({ pageNum: 1, text: 'Saya suka.\n\nNasi lemak.', paragraphs: ['Saya suka.', 'Nasi lemak.'] })
    expect(meanConfidence).toBe(0)
    expect(lowConfidenceWords.size).toBe(0)
  })
})
