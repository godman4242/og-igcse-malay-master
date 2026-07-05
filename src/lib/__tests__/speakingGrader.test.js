import { describe, it, expect } from 'vitest'
import { heuristicGrade, weaknessFlags } from '../speakingGrader.js'

const englishTopic = {
  title: 'Hobby',
  titleEn: 'Hobby',
  cues: ['why you started', 'how often you do it', 'what you have learned'],
  expectedDurationSec: 75,
}

const malayTopic = {
  title: 'Cita-cita',
  titleEn: 'Career goal',
  cues: ['cita-cita anda', 'mengapa anda memilihnya', 'langkah-langkah anda'],
  expectedDurationSec: 75,
}

describe('heuristicGrade — return shape', () => {
  it('returns all expected fields with correct types', () => {
    const r = heuristicGrade({
      transcript: 'I enjoy reading fiction.',
      topic: englishTopic,
      durationSec: 30,
      lang: 'eng',
    })
    expect(r).toMatchObject({
      band: expect.any(Number),
      wordCount: expect.any(Number),
      sentenceCount: expect.any(Number),
      durationSec: expect.any(Number),
      wordsPerSec: expect.any(Number),
      fillerCount: expect.any(Number),
      markerCount: expect.any(Number),
      formalCount: expect.any(Number),
      uniqueWordRatio: expect.any(Number),
      cuesHit: expect.any(Number),
      cuesTotal: 3,
      tips: expect.any(Array),
    })
    expect(r.band).toBeGreaterThanOrEqual(1)
    expect(r.band).toBeLessThanOrEqual(6)
    expect(r.tips.length).toBeGreaterThan(0)
  })
})

describe('heuristicGrade — band-6 path', () => {
  it('long, fluent, marker-rich English response reaches band 6', () => {
    // Hits all 7 gates: longEnough, fluentEnough, goodMarkers, goodVocab,
    // goodRange (ttr ≥ 0.45), lowFiller, cueCoverage ≥ 0.75 (touches all
    // 3 cue keywords: started / often / learned).
    const transcript = `Firstly, I started reading because my older sister introduced me to fantasy novels when I was about ten years old. I was profoundly drawn into imagined worlds and that experience fundamentally changed how I view storytelling. Furthermore, I now read often, almost every evening, which has substantially improved my vocabulary range and helped me appreciate sophisticated styles across different genres. In addition, I have learned to consider perspectives that genuinely differ from my own, which is crucial for understanding complex characters. On balance, reading is an undertaking I will continue to cultivate sincerely.`
    const r = heuristicGrade({
      transcript,
      topic: englishTopic,
      durationSec: 60, // ~110 words / 60s ≈ 1.83 wps → in [1.4, 2.8]
      lang: 'eng',
    })
    expect(r.markerCount).toBeGreaterThanOrEqual(2)
    expect(r.formalCount).toBeGreaterThanOrEqual(2)
    expect(r.cuesHit).toBe(3)
    expect(r.uniqueWordRatio).toBeGreaterThanOrEqual(0.45)
    expect(r.band).toBe(6)
  })
})

describe('heuristicGrade — degraded paths', () => {
  it('too short + too fast + heavy fillers → low band', () => {
    const transcript = 'Um like uh basically yeah you know I like reading sort of.'
    const r = heuristicGrade({
      transcript,
      topic: englishTopic,
      durationSec: 5, // way under expected
      lang: 'eng',
    })
    expect(r.band).toBeLessThanOrEqual(3)
    expect(r.fillerCount).toBeGreaterThan(0)
    expect(r.tips.some(t => /(filler|longer|fluently|slow|pace)/i.test(t))).toBe(true)
  })
})

// Adversarial review #6: band started at 3 with only UPGRADE branches, so bands
// 1–2 were unreachable and silence / a few isolated words scored 3/6 — over-praise
// that miscalibrates the learner. A far-below-floor answer must score < 3.
describe('heuristicGrade — silence / near-empty floor (bands 1–2 reachable)', () => {
  it('silence (mic held open, no words) scores band 1, not 3', () => {
    const r = heuristicGrade({ transcript: '', topic: englishTopic, durationSec: 60, lang: 'eng' })
    expect(r.band).toBe(1)
  })
  it('a few isolated words score band 1', () => {
    const r = heuristicGrade({ transcript: 'reading books fun', topic: englishTopic, durationSec: 40, lang: 'eng' })
    expect(r.band).toBe(1)
  })
  it('a very limited one-liner cannot exceed band 2', () => {
    const r = heuristicGrade({ transcript: 'I like reading books because it is very fun and nice to do', topic: englishTopic, durationSec: 40, lang: 'eng' })
    expect(r.band).toBeLessThanOrEqual(2)
  })
  it('Malay silence also scores band 1', () => {
    const r = heuristicGrade({ transcript: '', topic: malayTopic, durationSec: 60, lang: 'malay' })
    expect(r.band).toBe(1)
  })
})

describe('heuristicGrade — language-specific filler lists', () => {
  it('Malay particles count as fillers in Malay mode', () => {
    const transcript = 'Saya macam suka membaca lah, je. Yelah saya tak tahu kan.'
    const r = heuristicGrade({
      transcript,
      topic: malayTopic,
      durationSec: 30,
      lang: 'malay',
    })
    expect(r.fillerCount).toBeGreaterThan(0)
  })

  it('Malay particles do NOT count as fillers in English mode', () => {
    // Same text contains "macam / lah / kan / je" — Malay-only fillers.
    // In English mode the English filler list is used instead, so these
    // particles are NOT counted. Avoid English fillers ("like" etc.).
    const transcript = 'My friend macam said lah we should kan study je every day.'
    const r = heuristicGrade({
      transcript,
      topic: englishTopic,
      durationSec: 30,
      lang: 'eng',
    })
    expect(r.fillerCount).toBe(0)
  })

  it('English fillers (like, you know, basically) count in English mode', () => {
    const transcript = 'Like, basically I read a lot, you know, and sort of enjoy it.'
    const r = heuristicGrade({
      transcript,
      topic: englishTopic,
      durationSec: 30,
      lang: 'eng',
    })
    expect(r.fillerCount).toBeGreaterThan(0)
  })
})

describe('heuristicGrade — cue coverage', () => {
  it('cuesHit reflects how many cue keywords were touched', () => {
    const transcript = 'I started this hobby because my friend showed it to me. I do it often.'
    const r = heuristicGrade({
      transcript,
      topic: englishTopic, // cues mention "started", "often", "learned"
      durationSec: 20,
      lang: 'eng',
    })
    // "started" + "often" matched, "learned" not.
    expect(r.cuesHit).toBeGreaterThanOrEqual(1)
    expect(r.cuesHit).toBeLessThanOrEqual(3)
  })

  it('cuesTotal mirrors topic.cues length', () => {
    const r = heuristicGrade({
      transcript: 'Some text.',
      topic: { ...englishTopic, cues: ['a', 'b', 'c', 'd', 'e'] },
      durationSec: 5,
      lang: 'eng',
    })
    expect(r.cuesTotal).toBe(5)
  })
})

describe('heuristicGrade — wordsPerSec arithmetic', () => {
  it('wps ≈ wordCount / durationSec', () => {
    const r = heuristicGrade({
      transcript: 'one two three four five six seven eight nine ten',
      topic: englishTopic,
      durationSec: 5,
      lang: 'eng',
    })
    expect(r.wordsPerSec).toBeCloseTo(2, 1)
  })
})

describe('heuristicGrade — typed-answer mode (no STT)', () => {
  // A content-rich answer that, typed, has no meaningful duration/pace.
  const strongText = 'Firstly, I started my favourite hobby, reading, because it is '
    + 'genuinely fascinating and broadens my perspective significantly. Moreover, I read '
    + 'often, every evening, and consequently I have learned a substantial amount. '
    + 'However, finding time is hard. In conclusion, reading is, arguably, the most '
    + 'rewarding thing I do.'

  it('reports typed:true and false appropriately', () => {
    expect(heuristicGrade({ transcript: strongText, topic: englishTopic, durationSec: 1, lang: 'eng', typed: true }).typed).toBe(true)
    expect(heuristicGrade({ transcript: strongText, topic: englishTopic, durationSec: 60, lang: 'eng' }).typed).toBe(false)
  })

  it('does NOT apply a pace/duration penalty when typed', () => {
    // Same text, near-zero duration. Spoken => penalised (too short / too fast);
    // typed => graded on content, so it must band higher.
    const spoken = heuristicGrade({ transcript: strongText, topic: englishTopic, durationSec: 1, lang: 'eng', typed: false })
    const typed = heuristicGrade({ transcript: strongText, topic: englishTopic, durationSec: 1, lang: 'eng', typed: true })
    expect(typed.band).toBeGreaterThan(spoken.band)
  })

  it('omits the "speak longer / more fluently / slow down" tips when typed', () => {
    const typed = heuristicGrade({ transcript: strongText, topic: englishTopic, durationSec: 1, lang: 'eng', typed: true })
    const joined = typed.tips.join(' ').toLowerCase()
    expect(joined).not.toMatch(/speak for longer|more fluently|slow down/)
  })

  it('a short typed answer is nudged to develop, not to "speak longer"', () => {
    const typed = heuristicGrade({ transcript: 'I like reading.', topic: englishTopic, durationSec: 1, lang: 'eng', typed: true })
    const joined = typed.tips.join(' ').toLowerCase()
    expect(joined).toMatch(/develop your answer/)
    expect(joined).not.toMatch(/speak for longer/)
  })

  it('weaknessFlags drops pace flags (tooShort/disfluent) for a typed answer', () => {
    const h = heuristicGrade({ transcript: 'I like reading.', topic: englishTopic, durationSec: 1, lang: 'eng', typed: true })
    const flags = weaknessFlags(h, englishTopic)
    expect(flags).not.toContain('tooShort')
    expect(flags).not.toContain('disfluent')
    // a spoken version of the same short/fast answer still flags pace
    const hSpoken = heuristicGrade({ transcript: 'I like reading.', topic: englishTopic, durationSec: 1, lang: 'eng' })
    expect(weaknessFlags(hSpoken, englishTopic)).toContain('tooShort')
  })
})
