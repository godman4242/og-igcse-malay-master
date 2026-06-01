import { describe, it, expect } from 'vitest'
import {
  tokenizeWithOffsets,
  parseRatingKeyword,
  parseStopKeyword,
  plainifyForSpeech,
  describeSpeechError,
} from '../speech'

describe('describeSpeechError', () => {
  it('returns null for benign errors that should be ignored', () => {
    expect(describeSpeechError('no-speech')).toBeNull()
    expect(describeSpeechError('aborted')).toBeNull()
  })

  it('explains a blocked microphone for permission errors', () => {
    const msg = describeSpeechError('not-allowed')
    expect(msg).toMatch(/microphone/i)
    expect(msg).toMatch(/allow|block/i)
    // service-not-allowed is the same class
    expect(describeSpeechError('service-not-allowed')).toMatch(/microphone/i)
  })

  it('explains a missing microphone for audio-capture', () => {
    expect(describeSpeechError('audio-capture')).toMatch(/no microphone|microphone.*found/i)
  })

  it('names the language and points to typing when the language is unsupported', () => {
    const msg = describeSpeechError('language-not-supported', 'Malay')
    expect(msg).toMatch(/Malay/)
    expect(msg).toMatch(/type/i)
  })

  it('explains the connectivity requirement for network errors', () => {
    const msg = describeSpeechError('network')
    expect(msg).toMatch(/internet|connect/i)
    expect(msg).toMatch(/type/i)
  })

  it('echoes an unknown error code and still offers typing', () => {
    const msg = describeSpeechError('something-weird')
    expect(msg).toMatch(/something-weird/)
    expect(msg).toMatch(/type/i)
  })

  it('returns a usable message even with no error code', () => {
    const msg = describeSpeechError(undefined)
    expect(typeof msg).toBe('string')
    expect(msg.length).toBeGreaterThan(0)
  })
})

describe('tokenizeWithOffsets', () => {
  it('returns empty array for empty / non-string input', () => {
    expect(tokenizeWithOffsets('')).toEqual([])
    expect(tokenizeWithOffsets(null)).toEqual([])
    expect(tokenizeWithOffsets(undefined)).toEqual([])
    expect(tokenizeWithOffsets(42)).toEqual([])
  })

  it('tokenises a simple Malay sentence with correct offsets', () => {
    const out = tokenizeWithOffsets('Saya makan nasi.')
    expect(out).toHaveLength(3)
    expect(out[0]).toEqual({ word: 'Saya', start: 0, end: 4, index: 0 })
    expect(out[1]).toEqual({ word: 'makan', start: 5, end: 10, index: 1 })
    expect(out[2]).toEqual({ word: 'nasi.', start: 11, end: 16, index: 2 })
  })

  it('collapses multi-whitespace and survives leading/trailing whitespace', () => {
    const out = tokenizeWithOffsets('   hello   world  ')
    expect(out.map(t => t.word)).toEqual(['hello', 'world'])
    expect(out[0].start).toBe(3)
    expect(out[1].start).toBe(11)
  })

  it('treats newlines and tabs as whitespace (paragraph-flat token stream)', () => {
    const out = tokenizeWithOffsets('rumah\nsaya\tdi\nkampung')
    expect(out.map(t => t.word)).toEqual(['rumah', 'saya', 'di', 'kampung'])
    expect(out.map(t => t.index)).toEqual([0, 1, 2, 3])
  })

  it('character offsets round-trip — slicing the source by start/end recovers each word', () => {
    const text = 'Pelajar itu sedang membaca buku di perpustakaan.'
    const out = tokenizeWithOffsets(text)
    for (const t of out) {
      expect(text.slice(t.start, t.end)).toBe(t.word)
    }
  })
})

describe('parseRatingKeyword (speak-to-rate spotter)', () => {
  it('returns null for non-string / empty / no-keyword input', () => {
    expect(parseRatingKeyword('')).toBeNull()
    expect(parseRatingKeyword(null)).toBeNull()
    expect(parseRatingKeyword(undefined)).toBeNull()
    expect(parseRatingKeyword(42)).toBeNull()
    expect(parseRatingKeyword('saya tak tahu')).toBeNull()
    expect(parseRatingKeyword('   !!!   ')).toBeNull()
  })

  it('maps each of the four FSRS keywords to the right rating int', () => {
    expect(parseRatingKeyword('again')).toBe(1)
    expect(parseRatingKeyword('hard')).toBe(2)
    expect(parseRatingKeyword('good')).toBe(3)
    expect(parseRatingKeyword('easy')).toBe(4)
  })

  it('is case-insensitive and tolerates punctuation / surrounding chatter', () => {
    expect(parseRatingKeyword('Good.')).toBe(3)
    expect(parseRatingKeyword('EASY!')).toBe(4)
    expect(parseRatingKeyword('um, hard I think')).toBe(2)
    expect(parseRatingKeyword('that was easy peasy')).toBe(4)
  })

  it('whole-word match only — does not fire on substrings', () => {
    // ASR sometimes returns longer English words that happen to contain a
    // keyword as a substring. We must not auto-rate on those.
    expect(parseRatingKeyword('hardest')).toBeNull()
    expect(parseRatingKeyword('goodness')).toBeNull()
    expect(parseRatingKeyword('uneasy')).toBeNull()
    expect(parseRatingKeyword('regain')).toBeNull()
  })

  it('priority on conflicts goes again > hard > good > easy (conservative grade)', () => {
    // Student self-corrects mid-utterance — always take the harder grade
    // so spacing intervals stay conservative.
    expect(parseRatingKeyword('easy no wait again')).toBe(1)
    expect(parseRatingKeyword('good actually hard')).toBe(2)
    expect(parseRatingKeyword('easy I mean good')).toBe(3)
  })

  it('handles natural-speech phrasings the ASR is likely to emit', () => {
    expect(parseRatingKeyword('try again please')).toBe(1)
    expect(parseRatingKeyword("that's a hard one")).toBe(2)
    expect(parseRatingKeyword('I got it good')).toBe(3)
    expect(parseRatingKeyword('too easy')).toBe(4)
  })
})

describe('parseStopKeyword (cikgu talk-to-tutor interrupt spotter)', () => {
  it('returns null on empty / non-string / no-keyword input', () => {
    expect(parseStopKeyword('')).toBeNull()
    expect(parseStopKeyword(null)).toBeNull()
    expect(parseStopKeyword(undefined)).toBeNull()
    expect(parseStopKeyword(42)).toBeNull()
    expect(parseStopKeyword('please continue cikgu')).toBeNull()
  })

  it("returns 'stop' for any of the registered English keywords", () => {
    expect(parseStopKeyword('stop')).toBe('stop')
    expect(parseStopKeyword('Cancel.')).toBe('stop')
    expect(parseStopKeyword('halt')).toBe('stop')
    expect(parseStopKeyword('quiet please')).toBe('stop')
  })

  it("returns 'stop' for Malay equivalents (bilingual UDL)", () => {
    expect(parseStopKeyword('berhenti')).toBe('stop')
    expect(parseStopKeyword('cikgu, berhenti dulu')).toBe('stop')
    expect(parseStopKeyword('diam')).toBe('stop')
  })

  it('whole-word only — does not fire on substrings', () => {
    expect(parseStopKeyword('stopwatch')).toBeNull()
    expect(parseStopKeyword('halting problem')).toBeNull()
    expect(parseStopKeyword('cancellation policy')).toBeNull()
    // Note: "quiet" inside "quietly" *would* trigger if we tokenised
    // by `[a-z]+` — but our splitter is `[^a-zà-ÿ]+`, so "quietly"
    // stays one token and is not in STOP_WORDS. Pin that.
    expect(parseStopKeyword('quietly please')).toBeNull()
  })
})

describe('plainifyForSpeech (markdown stripper for TTS + highlight)', () => {
  it('returns empty string for empty / non-string input', () => {
    expect(plainifyForSpeech('')).toBe('')
    expect(plainifyForSpeech(null)).toBe('')
    expect(plainifyForSpeech(undefined)).toBe('')
    expect(plainifyForSpeech(0)).toBe('')
  })

  it('strips bold / italic / underline markers but keeps their contents', () => {
    expect(plainifyForSpeech('Use **meN-** for active verbs.')).toBe('Use meN- for active verbs.')
    expect(plainifyForSpeech('__strong__ and _gentle_ work too')).toBe('strong and gentle work too')
  })

  it('strips inline code, link syntax, and headings', () => {
    expect(plainifyForSpeech('Try `makan` here.')).toBe('Try makan here.')
    expect(plainifyForSpeech('See [docs](https://example.com) for more')).toBe('See docs for more')
    expect(plainifyForSpeech('## Imbuhan meN-')).toBe('Imbuhan meN-')
    expect(plainifyForSpeech('### Sub heading')).toBe('Sub heading')
  })

  it('strips bullet markers, numbered markers, and horizontal rules', () => {
    const input = [
      '- first point',
      '- second point',
      '',
      '1. apple',
      '2. banana',
      '',
      '---',
      'after the rule',
    ].join('\n')
    const out = plainifyForSpeech(input)
    expect(out).toContain('first point')
    expect(out).toContain('second point')
    expect(out).toContain('apple')
    expect(out).toContain('after the rule')
    expect(out).not.toContain('---')
    expect(out).not.toMatch(/^- /m)
    expect(out).not.toMatch(/^\d+\. /m)
  })

  it('flattens markdown tables — separator row dropped, pipes → spaces', () => {
    const input = [
      '| Prefix | Example |',
      '|--------|---------|',
      '| meN-   | makan   |',
      '| ber-   | jalan   |',
    ].join('\n')
    const out = plainifyForSpeech(input)
    expect(out).not.toContain('|')
    expect(out).not.toContain('---')
    expect(out).toContain('Prefix Example')
    expect(out).toContain('meN- makan')
    expect(out).toContain('ber- jalan')
  })

  it('output is safe to tokenise with the same splitter that drives the highlight', () => {
    const out = plainifyForSpeech('**Hello** `world` — see [docs](url).')
    const toks = tokenizeWithOffsets(out)
    expect(toks.map(t => t.word)).toEqual(['Hello', 'world', '—', 'see', 'docs.'])
  })
})
