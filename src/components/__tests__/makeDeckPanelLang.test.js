// Structural guard (repo convention cf. studyTtsLocale.test.js): the AI "Make a
// deck" / "Practise a conversation" panel must thread the active studyLang into the
// generators AND stamp it on the cards it creates — else an English (0510) learner's
// generated cards default to lang:'ms' and are INVISIBLE in their studyLang-scoped
// deck (v34). Source-pinned (a full panel mount is heavy + AI/store-coupled).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const code = readFileSync(resolve(here, '../MakeDeckPanel.jsx'), 'utf8')

describe('MakeDeckPanel threads studyLang (structural)', () => {
  it('reads studyLang from the store', () => {
    expect(code).toMatch(/const studyLang = useStore\(s => s\.studyLang\) \|\| 'ms'/)
  })

  it('stamps lang: studyLang on the cards it adds', () => {
    expect(code).toMatch(/lang: studyLang,/)
  })

  it('passes lang: studyLang to the deck generator', () => {
    expect(code).toMatch(/generateGroundedDeck\(\{[^}]*lang: studyLang/)
  })

  it('passes lang: studyLang to the scenario generator (no hardcoded ms)', () => {
    expect(code).toMatch(/generateScenario\(\{[^}]*lang: studyLang/)
    expect(code).not.toMatch(/generateScenario\(\{[^}]*lang: 'ms'/)
  })
})
