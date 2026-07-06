import { describe, it, expect } from 'vitest'
import {
  paragraphsFromSegments, pagesFromTranscript, emptyTranscriptNotice,
  runTranscribe, isSilentSamples,
  audioDurationSeconds, exceedsMaxAudio, audioTooLongError,
  PARA_GAP_S, PARAS_PER_PAGE, MAX_AUDIO_SECONDS, AUDIO_TOO_LONG,
} from '../transcribe'

describe('paragraphsFromSegments', () => {
  it('breaks a paragraph on a long pause between segments', () => {
    const segs = [
      { text: 'Saya suka makan nasi lemak.', start: 0, end: 2 },
      { text: 'Ia sedap pada waktu pagi.', start: 2.3, end: 4 },        // small gap → same para
      { text: 'Hari ini cuaca panas.', start: 4 + PARA_GAP_S + 1, end: 7 }, // big gap → new para
    ]
    expect(paragraphsFromSegments(segs)).toEqual([
      'Saya suka makan nasi lemak. Ia sedap pada waktu pagi.',
      'Hari ini cuaca panas.',
    ])
  })
  it('no timestamps → one joined paragraph', () => {
    expect(paragraphsFromSegments([{ text: 'A' }, { text: 'B' }])).toEqual(['A B'])
  })
  it('non-array / empty → []', () => {
    expect(paragraphsFromSegments(null)).toEqual([])
    expect(paragraphsFromSegments([])).toEqual([])
  })
})

describe('pagesFromTranscript', () => {
  it('produces the extractTextFromDoc shape, paginating by PARAS_PER_PAGE', () => {
    const paras = Array.from({ length: PARAS_PER_PAGE + 1 }, (_, i) => `P${i}.`)
    const segs = paras.map((t, i) => ({ text: t, start: i * (PARA_GAP_S + 2), end: i * (PARA_GAP_S + 2) + 1 }))
    const { pages } = pagesFromTranscript({ segments: segs })
    expect(pages).toHaveLength(2)
    expect(pages[0]).toMatchObject({ pageNum: 1 })
    expect(pages[0].paragraphs).toHaveLength(PARAS_PER_PAGE)
    expect(pages[1].paragraphs).toEqual(['P' + PARAS_PER_PAGE + '.'])
    expect(pages[0].text).toBe(pages[0].paragraphs.join('\n\n'))
  })
  it('falls back to text when there are no segments', () => {
    const { pages } = pagesFromTranscript({ text: 'Satu dua tiga.' })
    expect(pages[0].paragraphs).toEqual(['Satu dua tiga.'])
  })
  it('empty → no pages', () => {
    expect(pagesFromTranscript({ text: '' }).pages).toEqual([])
  })
})

describe('emptyTranscriptNotice', () => {
  it('true for blank / whitespace transcripts', () => {
    expect(emptyTranscriptNotice({ text: '   ' })).toBe(true)
    expect(emptyTranscriptNotice({ text: '' })).toBe(true)
  })
  it('false when there is real text', () => {
    expect(emptyTranscriptNotice({ text: 'Saya suka makan.' })).toBe(false)
  })
})

describe('isSilentSamples', () => {
  it('true for all-zero, empty, or missing samples', () => {
    expect(isSilentSamples(new Float32Array(1000))).toBe(true)
    expect(isSilentSamples(new Float32Array(0))).toBe(true)
    expect(isSilentSamples(null)).toBe(true)
  })
  it('false when any sample exceeds the silence threshold', () => {
    const s = new Float32Array(1000)
    s[500] = 0.5
    expect(isSilentSamples(s)).toBe(false)
  })
  it('treats sub-threshold noise as silent', () => {
    const s = new Float32Array(1000).fill(0.001)
    expect(isSilentSamples(s)).toBe(true)
  })
})

describe('runTranscribe', () => {
  it('returns the pages shape from the injected engine', async () => {
    const transcribe = async () => ({ text: 'Satu.', segments: [{ text: 'Satu.', start: 0, end: 1 }] })
    const { pages } = await runTranscribe('audio', { transcribe })
    expect(pages[0].paragraphs).toEqual(['Satu.'])
  })

  it('threads progress phases', async () => {
    const seen = []
    const transcribe = async ({ onProgress } = {}) => { onProgress?.({ phase: 'transcribe', ratio: 1 }); return { text: 'A' } }
    await runTranscribe('audio', { transcribe, onProgress: p => seen.push(p) })
    expect(seen.at(-1)).toMatchObject({ phase: 'transcribe', ratio: 1 })
  })

  it('engine throw → empty pages, never rejects', async () => {
    const transcribe = async () => { throw new Error('boom') }
    const { pages } = await runTranscribe('audio', { transcribe })
    expect(pages).toEqual([])
  })

  it('abort before start → empty pages (cancelled !== errored)', async () => {
    const ctrl = new AbortController(); ctrl.abort()
    let called = false
    const transcribe = async () => { called = true; return { text: 'x' } }
    const { pages } = await runTranscribe('audio', { transcribe, signal: ctrl.signal })
    expect(called).toBe(false)
    expect(pages).toEqual([])
  })

  it('#16 — an AUDIO_TOO_LONG engine error is SURFACED (not swallowed to empty pages)', async () => {
    // A too-long clip is a friendly, actionable failure — the UI must see it,
    // unlike a generic engine error which still degrades to empty pages above.
    const transcribe = async () => { throw audioTooLongError() }
    await expect(runTranscribe('audio', { transcribe })).rejects.toMatchObject({ code: AUDIO_TOO_LONG })
  })
})

describe('audio length cap (#16)', () => {
  it('audioDurationSeconds = samples / sampleRate', () => {
    expect(audioDurationSeconds(new Float32Array(16000 * 90), 16000)).toBe(90)
    expect(audioDurationSeconds(null, 16000)).toBe(0)
    expect(audioDurationSeconds(new Float32Array(10), 0)).toBe(0)
  })

  it('exceedsMaxAudio is true just past MAX_AUDIO_SECONDS, false at/under it', () => {
    const sr = 16000
    expect(exceedsMaxAudio(new Float32Array(sr * (MAX_AUDIO_SECONDS + 1)), sr)).toBe(true)
    expect(exceedsMaxAudio(new Float32Array(sr * MAX_AUDIO_SECONDS), sr)).toBe(false)
    expect(exceedsMaxAudio(new Float32Array(sr * 60), sr)).toBe(false)
  })

  it('audioTooLongError carries the code + a friendly, actionable message', () => {
    const e = audioTooLongError()
    expect(e.code).toBe(AUDIO_TOO_LONG)
    expect(e.message).toMatch(/\d+\s*min/i) // mentions the minute bound
  })
})
