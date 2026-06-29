// Structural guard (repo convention cf. makeDeckPanelLang.test.js): the make-deck
// panel must wire the weak-spot seed — a one-tap "Practise your weak spots" entry
// that biases BOTH the deck and the roleplay generators toward the learner's real
// weak categories (weakSpotSeed). Source-pinned (a full panel mount is heavy +
// AI/store-coupled).
// Spec: docs/superpowers/specs/2026-06-29-weak-spot-practice-seed-design.md
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const code = readFileSync(resolve(here, '../MakeDeckPanel.jsx'), 'utf8')

describe('MakeDeckPanel weak-spot seed (structural)', () => {
  it('imports the weakSpotSeed pure core', () => {
    expect(code).toMatch(/import \{ weakSpotSeed \} from '\.\.\/lib\/weakSpotSeed'/)
  })

  it('reads the learner mistakes to compute the seed', () => {
    expect(code).toMatch(/useStore\(s => s\.mistakes\)/)
    expect(code).toMatch(/weakSpotSeed\(/)
  })

  it('offers a one-tap "Practise your weak spots" entry', () => {
    expect(code).toContain('Practise your weak spots')
  })

  it('biases the DECK generator with the weak topics (falls back to current behaviour)', () => {
    // handleGenerate must prefer the weak-spot topics when present.
    expect(code).toMatch(/weakTopics \|\| goalToFocus/)
  })

  it('biases the SCENARIO generator with the weak topics', () => {
    expect(code).toMatch(/generateScenario\(\{[^}]*focusTopics/)
  })
})
