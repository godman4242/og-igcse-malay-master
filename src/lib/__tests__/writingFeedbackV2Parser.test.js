import { describe, it, expect } from 'vitest'
import { parseWritingFeedbackV2 } from '../writingFeedbackV2Parser.js'

const baseText = 'Saya suka makan nasi lemak.'

const wellFormed = {
  band: 4,
  overall: 'Solid opening sentence.',
  scaffoldLevelApplied: 'heavy',
  studentText: {
    spans: [
      { text: 'Saya suka ', category: null, groupId: null },
      { text: 'makan', category: 'imbuhan', groupId: 1, note: 'use a richer verb' },
      { text: ' nasi lemak.', category: null, groupId: null },
    ],
    groups: [
      { id: 1, label: 'Verb form (imbuhan)', category: 'imbuhan' },
    ],
  },
  modelRewrite: {
    spans: [
      { text: 'Saya ', isKey: false },
      { text: 'menikmati', isKey: true, lift: 'verb upgrade' },
      { text: ' nasi lemak.', isKey: false },
    ],
  },
  strengths: ['clear topic sentence'],
  fixes: [
    { groupId: 1, issue: 'verb too plain', fix: 'try menikmati / menjamu' },
  ],
  nextStep: 'Try one passive sentence with di-.',
}

describe('parseWritingFeedbackV2', () => {
  it('accepts a well-formed payload (object input)', () => {
    const out = parseWritingFeedbackV2(wellFormed, baseText)
    expect(out.ok).toBe(true)
    expect(out.data.band).toBe(4)
    expect(out.data.studentText.spans.length).toBe(3)
  })

  it('accepts a well-formed payload (JSON string input)', () => {
    const out = parseWritingFeedbackV2(JSON.stringify(wellFormed), baseText)
    expect(out.ok).toBe(true)
    expect(out.data.scaffoldLevelApplied).toBe('heavy')
  })

  it('rejects malformed JSON strings', () => {
    const out = parseWritingFeedbackV2('{not json', baseText)
    expect(out.ok).toBe(false)
    expect(out.reason).toMatch(/json|parse/i)
  })

  it('rejects when studentText.spans is missing', () => {
    const bad = { ...wellFormed, studentText: { groups: [{ id: 1, label: 'x', category: 'imbuhan' }] } }
    const out = parseWritingFeedbackV2(bad, baseText)
    expect(out.ok).toBe(false)
    expect(out.reason).toMatch(/spans/i)
  })

  it('rejects when a span references an orphan groupId', () => {
    const bad = {
      ...wellFormed,
      studentText: {
        ...wellFormed.studentText,
        spans: [
          { text: 'Saya suka ', category: null, groupId: null },
          { text: 'makan', category: 'imbuhan', groupId: 99, note: '...' }, // orphan
          { text: ' nasi lemak.', category: null, groupId: null },
        ],
      },
    }
    const out = parseWritingFeedbackV2(bad, baseText)
    expect(out.ok).toBe(false)
    expect(out.reason).toMatch(/group/i)
  })

  it('rejects when spans do not exactly cover the original text', () => {
    const bad = {
      ...wellFormed,
      studentText: {
        ...wellFormed.studentText,
        spans: [
          { text: 'Saya suka ', category: null, groupId: null },
          { text: 'makan', category: 'imbuhan', groupId: 1, note: '...' },
          // dropped the trailing " nasi lemak."
        ],
      },
    }
    const out = parseWritingFeedbackV2(bad, baseText)
    expect(out.ok).toBe(false)
    expect(out.reason).toMatch(/coverage|original|match/i)
  })

  it('rejects an unknown category value', () => {
    const bad = {
      ...wellFormed,
      studentText: {
        ...wellFormed.studentText,
        spans: [
          { text: 'Saya suka ', category: null, groupId: null },
          { text: 'makan', category: 'made-up-category', groupId: 1, note: '...' },
          { text: ' nasi lemak.', category: null, groupId: null },
        ],
      },
    }
    const out = parseWritingFeedbackV2(bad, baseText)
    expect(out.ok).toBe(false)
    expect(out.reason).toMatch(/categor/i)
  })

  it('rejects an unknown scaffoldLevelApplied value', () => {
    const bad = { ...wellFormed, scaffoldLevelApplied: 'extreme' }
    const out = parseWritingFeedbackV2(bad, baseText)
    expect(out.ok).toBe(false)
    expect(out.reason).toMatch(/scaffold/i)
  })

  it('rejects band outside 1..6', () => {
    const bad = { ...wellFormed, band: 9 }
    const out = parseWritingFeedbackV2(bad, baseText)
    expect(out.ok).toBe(false)
    expect(out.reason).toMatch(/band/i)
  })

  it('rejects modelRewrite without spans array', () => {
    const bad = { ...wellFormed, modelRewrite: { spans: 'oops' } }
    const out = parseWritingFeedbackV2(bad, baseText)
    expect(out.ok).toBe(false)
    expect(out.reason).toMatch(/modelRewrite|rewrite/i)
  })

  it('accepts EN payloads with verb-form category', () => {
    const en = {
      ...wellFormed,
      studentText: {
        spans: [
          { text: 'I likes ', category: 'verb-form', groupId: 1, note: 'subject-verb' },
          { text: 'pizza.', category: null, groupId: null },
        ],
        groups: [{ id: 1, label: 'Verb form', category: 'verb-form' }],
      },
    }
    const out = parseWritingFeedbackV2(en, 'I likes pizza.')
    expect(out.ok).toBe(true)
  })

  it('preserves the original text exactly when spans concatenate', () => {
    const out = parseWritingFeedbackV2(wellFormed, baseText)
    expect(out.ok).toBe(true)
    const recon = out.data.studentText.spans.map(s => s.text).join('')
    expect(recon).toBe(baseText)
  })

  it('tolerates whitespace normalisation between original and spans', () => {
    // Claude often returns NBSP / collapsed spaces. We want to accept that.
    const withNbsp = 'Saya suka makan  nasi lemak.'
    const out = parseWritingFeedbackV2(wellFormed, withNbsp)
    expect(out.ok).toBe(true)
  })

  it('still rejects when spans drop or change words', () => {
    // Dropped " nasi lemak.": content change, not whitespace. Reject.
    const bad = {
      ...wellFormed,
      studentText: {
        ...wellFormed.studentText,
        spans: [
          { text: 'Saya suka ', category: null, groupId: null },
          { text: 'makan', category: 'imbuhan', groupId: 1, note: '...' },
        ],
      },
    }
    const out = parseWritingFeedbackV2(bad, baseText)
    expect(out.ok).toBe(false)
  })
})
