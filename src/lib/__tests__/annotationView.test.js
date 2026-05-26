import { describe, it, expect } from 'vitest'
import {
  scaffoldChipLabel,
  shouldHideRewriteByDefault,
  partitionSpansByActiveGroup,
  CATEGORY_LABELS_MS,
  CATEGORY_LABELS_EN,
} from '../annotationView.js'

describe('scaffoldChipLabel', () => {
  it('renders the user-facing label "focused" for heavy (not "heavy")', () => {
    // From spec §13 — a 16-year-old being told "we made this easier" is
    // patronising. The chip says "Adaptive: focused"; internal value stays "heavy".
    expect(scaffoldChipLabel('heavy')).toBe('Adaptive: focused')
  })
  it('renders "balanced" for medium', () => {
    expect(scaffoldChipLabel('medium')).toBe('Adaptive: balanced')
  })
  it('renders "stretch" for light', () => {
    expect(scaffoldChipLabel('light')).toBe('Adaptive: stretch')
  })
  it('falls back to "balanced" for unknown values', () => {
    expect(scaffoldChipLabel('something-else')).toBe('Adaptive: balanced')
  })
})

describe('shouldHideRewriteByDefault', () => {
  it('hides the rewrite by default on heavy scaffolding (Bjork — desirable difficulty)', () => {
    expect(shouldHideRewriteByDefault('heavy')).toBe(true)
  })
  it('shows the rewrite by default on medium and light', () => {
    expect(shouldHideRewriteByDefault('medium')).toBe(false)
    expect(shouldHideRewriteByDefault('light')).toBe(false)
  })
})

describe('partitionSpansByActiveGroup', () => {
  const spans = [
    { text: 'Saya ', groupId: null },
    { text: 'suka', groupId: 1 },
    { text: ' nasi ', groupId: null },
    { text: 'sedap', groupId: 2 },
  ]

  it('returns all spans visible when activeGroupId is null', () => {
    const out = partitionSpansByActiveGroup(spans, null)
    expect(out.every(s => !s.dimmed)).toBe(true)
  })

  it('dims spans not in the active group', () => {
    const out = partitionSpansByActiveGroup(spans, 1)
    expect(out[0].dimmed).toBe(true)   // null group → dimmed
    expect(out[1].dimmed).toBe(false)  // group 1 → highlighted
    expect(out[2].dimmed).toBe(true)
    expect(out[3].dimmed).toBe(true)
  })

  it('hides highlight chrome for every span when activeGroupId is "none"', () => {
    const out = partitionSpansByActiveGroup(spans, 'none')
    expect(out.every(s => s.suppressed)).toBe(true)
  })
})

describe('category label maps', () => {
  it('exposes Malay labels with imbuhan terminology', () => {
    expect(CATEGORY_LABELS_MS.imbuhan).toMatch(/imbuhan/i)
  })
  it('exposes English labels with verb-form terminology', () => {
    expect(CATEGORY_LABELS_EN['verb-form']).toMatch(/verb/i)
  })
  it('keeps the cohesion label language-neutral but localised', () => {
    expect(CATEGORY_LABELS_MS.cohesion).toBeTruthy()
    expect(CATEGORY_LABELS_EN.cohesion).toBeTruthy()
  })
})
