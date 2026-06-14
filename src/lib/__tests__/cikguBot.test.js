// Behaviour-preserving coverage for src/lib/cikguBot.js — the Malay static-mode
// roleplay evaluator (IGCSE Paper 3 speaking-prep). Roleplay.jsx imports
// evaluateResponse + generateFeedback to score a turn when the AI quota is
// exhausted; the other exports (getNextPrompt / initializeConversation / addTurn /
// generateSessionSummary) round out the conversation engine. Seven exports + two
// constants, previously with NO dedicated test file.
//
// Grounding: every expected value here was captured from the function's REAL output
// via a node probe BEFORE the assertions were written (never hand-computed). The two
// non-determinism sources are seamed:
//   - Math.random (feedback-text pick) → vi.spyOn(...).mockReturnValue(0) so the exact
//     first-element string is asserted.
//   - Date.now (startTime / timestamp / duration) → vi.useFakeTimers + setSystemTime.
// cikguBot.js is byte-identical: this adds tests only.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  evaluateResponse,
  generateFeedback,
  getNextPrompt,
  initializeConversation,
  addTurn,
  generateSessionSummary,
  CIKGU_PERSONAS,
  VOCABULARY_CATEGORIES,
} from '../cikguBot'

describe('evaluateResponse', () => {
  it('empty string still reports length 1 (split-on-whitespace gotcha) and needs_work', () => {
    const r = evaluateResponse('')
    expect(r.length).toBe(1)
    expect(r.overall).toBe(0)
    expect(r.quality).toBe('needs_work')
    expect(r.hasGreeting).toBe(false)
    expect(r.imbuhanCount).toBe(0)
  })

  it('a single non-vocab word ("ok") scores 0 → needs_work', () => {
    expect(evaluateResponse('ok').overall).toBe(0)
    expect(evaluateResponse('ok').quality).toBe('needs_work')
  })

  it('"selamat pagi cikgu" → 35 / fair, and the LOOSE imbuhan regex over-counts ("selamat"+"pagi"=2)', () => {
    const r = evaluateResponse('selamat pagi cikgu')
    expect(r.overall).toBe(35) // greeting 15 + imbuhan>=1 10 + length>=3 10
    expect(r.quality).toBe('fair')
    expect(r.hasGreeting).toBe(true)
    expect(r.imbuhanCount).toBe(2) // documents the false-positive behaviour, not ideal Malay
    expect(r.length).toBe(3)
  })

  it('"terima kasih" → courtesy + 1 imbuhan ("terima"), 20 / needs_work (under 30)', () => {
    const r = evaluateResponse('terima kasih')
    expect(r.hasCourtesy).toBe(true)
    expect(r.imbuhanCount).toBe(1)
    expect(r.overall).toBe(20)
    expect(r.quality).toBe('needs_work')
  })

  it('imbuhan-heavy mid-length response → 40 / fair (imbuhan>=3 + length>=5 tiers)', () => {
    const r = evaluateResponse('saya bermain berlari membaca menulis')
    expect(r.imbuhanCount).toBe(4)
    expect(r.length).toBe(5)
    expect(r.overall).toBe(40)
    expect(r.quality).toBe('fair')
  })

  it('questions + connectors mid-length → 65 / good', () => {
    const r = evaluateResponse('kenapa awak datang tetapi tidak makan')
    expect(r.hasQuestions).toBe(true)
    expect(r.hasConnectors).toBe(true)
    expect(r.overall).toBe(65)
    expect(r.quality).toBe('good')
  })

  it('a full response hits every flag, caps at 100, and is excellent', () => {
    const r = evaluateResponse('Selamat pagi cikgu, terima kasih kerana mengajar saya, bagaimana khabar awak hari ini')
    expect(r.hasGreeting).toBe(true)
    expect(r.hasCourtesy).toBe(true)
    expect(r.hasQuestions).toBe(true)
    expect(r.hasConnectors).toBe(true)
    expect(r.overall).toBe(100) // Math.min cap
    expect(r.quality).toBe('excellent')
  })

  it('quality bands map to the documented thresholds (>=70/50/30/else)', () => {
    // bands are derived purely from overall; assert the ladder directly
    const bandOf = (txt) => evaluateResponse(txt).quality
    expect(evaluateResponse('selamat pagi cikgu').overall).toBeLessThan(50) // fair sample
    expect(bandOf('kenapa awak datang tetapi tidak makan')).toBe('good') // 65
    expect(bandOf('ok')).toBe('needs_work') // 0
  })
})

describe('generateFeedback', () => {
  let rnd
  beforeEach(() => {
    rnd = vi.spyOn(Math, 'random').mockReturnValue(0) // always pick index 0 of each persona array
  })
  afterEach(() => rnd.mockRestore())

  it('excellent (casual) → first positive line + the fixed praise suffix', () => {
    expect(generateFeedback({ quality: 'excellent' }, 'casual')).toBe('Bagus! Awak guna bahasa yang bagus.')
  })

  it('excellent (formal) → formal persona’s first positive line', () => {
    expect(generateFeedback({ quality: 'excellent' }, 'formal')).toBe('Sangat bagus Awak guna bahasa yang bagus.')
  })

  it('default persona is casual when omitted', () => {
    expect(generateFeedback({ quality: 'excellent' })).toBe('Bagus! Awak guna bahasa yang bagus.')
  })

  it('good with everything present → bare neutral line (no suffixes appended)', () => {
    expect(generateFeedback({ quality: 'good', length: 5, hasCourtesy: true, imbuhanCount: 2 }, 'casual')).toBe('Boleh lagi')
  })

  it('good with everything missing → all three targeted suffixes appended in order', () => {
    expect(generateFeedback({ quality: 'good', length: 1, hasCourtesy: false, imbuhanCount: 0 }, 'casual')).toBe(
      'Boleh lagi Cuba panjangkan jawapan awak. Jangan lupa kata sopan santun. Cuba guna imbuhan (meN-, ber-, di-).'
    )
  })

  it('needs_work → first negative line + retry suffix', () => {
    expect(generateFeedback({ quality: 'needs_work' }, 'casual')).toBe('Tak tepat tu Jom kita cuba sekali lagi.')
  })

  it('"fair" is NOT its own branch — it falls through to the negative branch', () => {
    expect(generateFeedback({ quality: 'fair' }, 'casual')).toBe('Tak tepat tu Jom kita cuba sekali lagi.')
  })
})

describe('getNextPrompt', () => {
  it('turn 0 returns the first prompt of the topic', () => {
    expect(getNextPrompt(0)).toBe('Boleh awak ceritakan hobi awak?')
    expect(getNextPrompt(1, 'shopping')).toBe('Berapa harga barang itu?')
  })

  it('clamps an out-of-range turn to the last prompt (Math.min)', () => {
    expect(getNextPrompt(4)).toBe('Berapa umur awak?')
    expect(getNextPrompt(99)).toBe('Berapa umur awak?')
  })

  it('an unknown topic falls back to general', () => {
    expect(getNextPrompt(0, 'nope')).toBe('Boleh awak ceritakan hobi awak?')
  })
})

describe('initializeConversation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(1_000_000))
  })
  afterEach(() => vi.useRealTimers())

  it('casual/general defaults: persona name, greeting, empty turns, zero score, stamped startTime', () => {
    const c = initializeConversation()
    expect(c.persona).toBe('casual')
    expect(c.topic).toBe('general')
    expect(c.cikguName).toBe('Cikgu Aziz')
    expect(c.greeting).toBe('Hai! Saya Cikgu Aziz. Apa khabar hari ini?')
    expect(c.turns).toEqual([])
    expect(c.score).toBe(0)
    expect(c.startTime).toBe(1_000_000)
  })

  it('formal/shopping pulls the formal persona', () => {
    const c = initializeConversation('formal', 'shopping')
    expect(c.cikguName).toBe('Cikgu Siti')
    expect(c.greeting).toBe('Selamat pagi. Nama saya Cikgu Siti. Boleh kita mulakan pelajaran?')
    expect(c.topic).toBe('shopping')
  })
})

describe('addTurn', () => {
  let rnd
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(1_000_000))
    rnd = vi.spyOn(Math, 'random').mockReturnValue(0)
  })
  afterEach(() => {
    rnd.mockRestore()
    vi.useRealTimers()
  })

  it('does NOT mutate the input conversation (returns a new one)', () => {
    const conv = initializeConversation('casual', 'general')
    const snapshot = JSON.stringify(conv)
    addTurn(conv, 'selamat pagi cikgu', 0)
    expect(JSON.stringify(conv)).toBe(snapshot) // original untouched
    expect(conv.turns).toHaveLength(0)
  })

  it('accumulates score and appends the turn with the evaluated shape', () => {
    const conv = initializeConversation('casual', 'general')
    vi.setSystemTime(new Date(1_005_000))
    const { conversation, turn } = addTurn(conv, 'selamat pagi cikgu', 0)
    expect(conversation.turns).toHaveLength(1)
    expect(conversation.score).toBe(35) // evaluation.overall for "selamat pagi cikgu"
    expect(turn.number).toBe(0)
    expect(turn.userText).toBe('selamat pagi cikgu')
    expect(turn.evaluation.overall).toBe(35)
    expect(turn.feedback).toBe('Tak tepat tu Jom kita cuba sekali lagi.') // fair → negative branch
    expect(turn.nextPrompt).toBe('Boleh awak ceritakan hobi awak?') // turn 0, general
    expect(turn.timestamp).toBe(1_005_000)
  })
})

describe('generateSessionSummary', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(1_000_000))
  })
  afterEach(() => vi.useRealTimers())

  it('empty conversation returns the "Belum Bermula" placeholder summary', () => {
    const s = generateSessionSummary({ persona: 'casual', topic: 'general', turns: [], score: 0, startTime: 0 })
    expect(s.turnsCompleted).toBe(0)
    expect(s.averageScore).toBe(0)
    expect(s.durationSeconds).toBe(0)
    expect(s.quality).toBe('Belum Bermula')
    expect(s.strengths).toEqual([])
    expect(s.suggestions).toEqual(['Cuba mulakan perbualan'])
  })

  it('multi-turn mixed (avg 47 → "Boleh Lagi"): strengths and suggestions gate on per-turn flags', () => {
    const conv = {
      persona: 'casual', topic: 'general', startTime: 1_000_000,
      turns: [
        { evaluation: { hasCourtesy: true, length: 6, imbuhanCount: 2, hasConnectors: true, hasQuestions: true } },
        { evaluation: { hasCourtesy: false, length: 1, imbuhanCount: 0, hasConnectors: false, hasQuestions: false } },
        { evaluation: { hasCourtesy: false, length: 5, imbuhanCount: 3, hasConnectors: false, hasQuestions: false } },
      ],
      score: 140, // 140 / 3 = 46.67 → round 47
    }
    vi.setSystemTime(new Date(1_030_000)) // 30s after startTime
    const s = generateSessionSummary(conv)
    expect(s.turnsCompleted).toBe(3)
    expect(s.averageScore).toBe(47)
    expect(s.durationSeconds).toBe(30)
    expect(s.quality).toBe('Boleh Lagi') // <50
    // 'Ketepatan bahasa' omitted because avg < 70
    expect(s.strengths).toEqual(['Sopan santun', 'Ayat panjang', 'Penggunaan imbuhan', 'Kata penghubung'])
    // 'Cuba berlatih lebih kerap' (avg<50) + 'Panjangkan jawapan awak' (a turn with length<2);
    // the question/imbuhan/connector suggestions are suppressed because >=1 turn already has each.
    expect(s.suggestions).toEqual(['Cuba berlatih lebih kerap', 'Panjangkan jawapan awak'])
  })

  it('high-scoring conversation (avg 90 → "Sangat Bagus") adds "Ketepatan bahasa" and clears suggestions', () => {
    const conv = {
      persona: 'formal', topic: 'travel', startTime: 1_000_000,
      turns: [
        { evaluation: { hasCourtesy: true, length: 8, imbuhanCount: 3, hasConnectors: true, hasQuestions: true } },
      ],
      score: 90,
    }
    vi.setSystemTime(new Date(1_010_000)) // 10s
    const s = generateSessionSummary(conv)
    expect(s.averageScore).toBe(90)
    expect(s.durationSeconds).toBe(10)
    expect(s.quality).toBe('Sangat Bagus') // >=70
    expect(s.strengths).toContain('Ketepatan bahasa')
    expect(s.strengths).toHaveLength(5)
    expect(s.suggestions).toEqual([]) // every gate satisfied
  })
})

describe('exported constants', () => {
  it('CIKGU_PERSONAS has casual + formal with feedback banks', () => {
    expect(Object.keys(CIKGU_PERSONAS)).toEqual(['casual', 'formal'])
    expect(CIKGU_PERSONAS.casual.feedbackPositive).toContain('Bagus!')
    expect(CIKGU_PERSONAS.formal.name).toBe('Cikgu Siti')
  })

  it('VOCABULARY_CATEGORIES carries the six evaluated buckets', () => {
    expect(Object.keys(VOCABULARY_CATEGORIES)).toEqual([
      'greetings', 'courtesy', 'questions', 'negation', 'connectors', 'imbuhan',
    ])
  })
})
