// Guide slice (in-app "App tour" progress) — behavioral tests.
// Spec: docs/superpowers/specs/2026-06-10-interactive-user-guide-design.md §8.
//
// The slice holds two booleans (seen-Quick, seen-Full) — progress, not a
// secret, so it lives in the persisted store and rides the existing cloud blob.
// STORE_VERSION 25→26 adds it via a migration that preserves all prior fields.

import { describe, it, expect, beforeEach } from 'vitest'
import useStore, { migrateGuideSlice, STORE_VERSION } from '../useStore'

describe('guide slice — initial state', () => {
  it('defaults to both tours unseen', () => {
    expect(useStore.getInitialState().guide).toEqual({ seenQuick: false, seenFull: false })
  })
})

describe('guide slice — markGuideSeen', () => {
  beforeEach(() => {
    useStore.setState({ guide: { seenQuick: false, seenFull: false } })
  })

  it('markGuideSeen("quick") flips only seenQuick', () => {
    useStore.getState().markGuideSeen('quick')
    expect(useStore.getState().guide).toEqual({ seenQuick: true, seenFull: false })
  })

  it('markGuideSeen("full") flips only seenFull', () => {
    useStore.getState().markGuideSeen('full')
    expect(useStore.getState().guide).toEqual({ seenQuick: false, seenFull: true })
  })

  it('ignores an unknown tier (no crash, no change)', () => {
    useStore.getState().markGuideSeen('bogus')
    expect(useStore.getState().guide).toEqual({ seenQuick: false, seenFull: false })
  })
})

describe('guide slice — migration v25 → v26', () => {
  it('STORE_VERSION is 26', () => {
    expect(STORE_VERSION).toBe(26)
  })

  it('adds the guide slice with defaults while preserving all existing fields', () => {
    const v25 = {
      cards: [{ m: 'sebab', e: 'reason' }],
      theme: 'light',
      engagementXP: 320,
      streakFreezes: 2,
      pdfReader: { sentenceRender: 'inline', layoutView: true },
    }
    const migrated = migrateGuideSlice(v25)
    expect(migrated.guide).toEqual({ seenQuick: false, seenFull: false })
    expect(migrated.cards).toEqual([{ m: 'sebab', e: 'reason' }])
    expect(migrated.theme).toBe('light')
    expect(migrated.engagementXP).toBe(320)
    expect(migrated.streakFreezes).toBe(2)
    expect(migrated.pdfReader).toEqual({ sentenceRender: 'inline', layoutView: true })
  })

  it('does not clobber a guide slice that already exists', () => {
    const migrated = migrateGuideSlice({ guide: { seenQuick: true, seenFull: true } })
    expect(migrated.guide).toEqual({ seenQuick: true, seenFull: true })
  })
})
