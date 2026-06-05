import { describe, it, expect } from 'vitest'
import { buildDrillPrompt } from '../mistakeDrill'

// Field shapes below mirror the REAL addMistake call sites (verified 2026-06-05):
//  - vocab        (useInterleavedSession / RoleplayScorecard): word + correct + given
//  - comprehension(Comprehension.jsx): surface=question, given=wrong opt, correct=right opt
//  - imbuhan/spelling (writingMistakeHarvest): surface + given(snippet) + correct(fix)
//  - imbuhan/tense (RoleplayScorecard grammar notes): surface + note ONLY (no answer)
//  - cohesion/fluency/register/pronunciation (Speaking/Roleplay tips): surface + note ONLY

describe('buildDrillPrompt — answerable categories (recall → reveal)', () => {
  it('vocab → answer prompt asking the meaning, with the learner error', () => {
    const p = buildDrillPrompt({
      category: 'vocab', type: 'vocab', word: 'gembira', correct: 'happy', given: 'sad',
    })
    expect(p.kind).toBe('answer')
    expect(p.question).toContain('gembira')
    expect(p.answer).toBe('happy')
    expect(p.yourError).toBe('sad')
  })

  it('comprehension → question is the surface, answer is the right option', () => {
    const p = buildDrillPrompt({
      category: 'comprehension', type: 'comprehension',
      surface: 'Why did Aisha feel nervous?', given: 'She was tired',
      correct: 'She had an exam', note: 'inference question',
    })
    expect(p.kind).toBe('answer')
    expect(p.question).toBe('Why did Aisha feel nervous?')
    expect(p.answer).toBe('She had an exam')
    expect(p.yourError).toBe('She was tired')
  })

  it('imbuhan (from writing) → answer prompt shows the sentence + the fix', () => {
    const p = buildDrillPrompt({
      category: 'imbuhan', type: 'writing',
      surface: 'Dia makan nasi itu oleh saya.', given: 'makan', correct: 'dimakan',
      correction: 'Nasi itu dimakan oleh saya.', note: 'use passive di-',
    })
    expect(p.kind).toBe('answer')
    expect(p.question).toBe('Dia makan nasi itu oleh saya.')
    expect(p.answer).toBe('dimakan')
    expect(p.yourError).toBe('makan')
  })

  it('spelling → answer prompt', () => {
    const p = buildDrillPrompt({
      category: 'spelling', type: 'writing',
      surface: 'Saya suka mkn nasi.', given: 'mkn', correct: 'makan',
    })
    expect(p.kind).toBe('answer')
    expect(p.answer).toBe('makan')
  })

  it('answer falls back to `correction` when `correct` is blank', () => {
    const p = buildDrillPrompt({
      category: 'imbuhan', type: 'writing',
      surface: 'Buku itu baca saya.', given: 'baca', correct: '',
      correction: 'Buku itu dibaca saya.',
    })
    expect(p.kind).toBe('answer')
    expect(p.answer).toBe('Buku itu dibaca saya.')
  })
})

describe('buildDrillPrompt — reflective categories (no answer to reveal)', () => {
  for (const category of ['fluency', 'cohesion', 'register', 'pronunciation']) {
    it(`${category} → reflect prompt with surface + note`, () => {
      const p = buildDrillPrompt({
        category, type: 'speaking', surface: 'Errr, saya pergi... errr kedai.',
        note: 'Cut the fillers — vary your discourse markers.',
      })
      expect(p.kind).toBe('reflect')
      expect(p.surface).toBe('Errr, saya pergi... errr kedai.')
      expect(p.note).toBe('Cut the fillers — vary your discourse markers.')
    })
  }

  it('practiseTarget routes by type: speaking → /speaking', () => {
    expect(buildDrillPrompt({ category: 'fluency', type: 'speaking', note: 'x' }).practiseTarget).toBe('/speaking')
  })

  it('practiseTarget routes by type: roleplay → /roleplay', () => {
    expect(buildDrillPrompt({ category: 'cohesion', type: 'roleplay', surface: 's', note: 'x' }).practiseTarget).toBe('/roleplay')
  })

  it('practiseTarget defaults to /study for other types', () => {
    expect(buildDrillPrompt({ category: 'register', type: 'writing', note: 'x' }).practiseTarget).toBe('/study')
  })
})

describe('buildDrillPrompt — downgrade & null safety', () => {
  it('answerable category with NO correct/correction downgrades to reflect', () => {
    // Real path: RoleplayScorecard logs imbuhan/tense as surface + note only.
    const p = buildDrillPrompt({
      category: 'imbuhan', type: 'roleplay',
      surface: 'Saya sudah pergi ke kedai semalam.',
      note: 'Watch your tense markers here.',
    })
    expect(p.kind).toBe('reflect')
    expect(p.surface).toBe('Saya sudah pergi ke kedai semalam.')
    expect(p.note).toBe('Watch your tense markers here.')
  })

  it('vocab with no word/answer but a coaching note downgrades to reflect', () => {
    // Real path: Speaking logs category:vocab with only surface + note.
    const p = buildDrillPrompt({
      category: 'vocab', type: 'speaking', word: '',
      surface: 'transcript…', note: 'Reach for richer vocabulary.',
    })
    expect(p.kind).toBe('reflect')
  })

  it('empty object → null (caller skips)', () => {
    expect(buildDrillPrompt({})).toBeNull()
  })

  it('null/undefined → null', () => {
    expect(buildDrillPrompt(null)).toBeNull()
    expect(buildDrillPrompt(undefined)).toBeNull()
  })

  it('whitespace-only content → null', () => {
    expect(buildDrillPrompt({ category: 'vocab', word: '   ', correct: '  ', surface: ' ', note: '' })).toBeNull()
  })
})
