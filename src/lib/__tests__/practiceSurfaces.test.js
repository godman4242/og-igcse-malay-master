// Guard suite for the Practice hub surface map.
// The whole point of the hub is that NOTHING gets buried — so this test pins
// that every destination currently in the bottom nav (the 3 primary learning
// tabs + everything in the old "More" drawer) appears on the Practice page
// exactly once. A future edit that drops a surface fails here.
// Design: docs/superpowers/specs/2026-05-31-practice-hub-design.md
import { describe, it, expect } from 'vitest'
import { PRACTICE_GROUPS, allPracticePaths } from '../practiceSurfaces.js'

// Mirror of Layout's NAV (minus Home — Dashboard stays a primary tab, not a
// "practice" surface) + MORE_ITEMS. If Layout's destinations change, this list
// is the single source of truth the hub must keep covering.
const EXPECTED_PATHS = [
  '/study', '/grammar', '/roleplay',
  '/exam-rehearsal', '/cikgu', '/comprehension', '/listening', '/writing',
  '/speaking', '/import', '/pdf-reader', '/word-families', '/mistakes', '/settings',
]

const ALLOWED_STATUS = ['due', 'mistakes', 'readiness']

describe('PRACTICE_GROUPS surface map', () => {
  it('covers every current nav destination exactly once (nothing gets lost)', () => {
    const paths = allPracticePaths()
    expect([...paths].sort()).toEqual([...EXPECTED_PATHS].sort())
  })

  it('has no duplicate paths', () => {
    const paths = allPracticePaths()
    expect(paths.length).toBe(new Set(paths).size)
  })

  it('gives every tile a path, a label, and an icon', () => {
    for (const group of PRACTICE_GROUPS) {
      expect(typeof group.heading).toBe('string')
      expect(group.heading.length).toBeGreaterThan(0)
      for (const item of group.items) {
        expect(item.path).toMatch(/^\//)
        expect(typeof item.label).toBe('string')
        expect(item.label.length).toBeGreaterThan(0)
        expect(item.icon).toBeTruthy()
      }
    }
  })

  it('only uses known status keys', () => {
    for (const group of PRACTICE_GROUPS) {
      for (const item of group.items) {
        if (item.status !== undefined) {
          expect(ALLOWED_STATUS).toContain(item.status)
        }
      }
    }
  })
})
