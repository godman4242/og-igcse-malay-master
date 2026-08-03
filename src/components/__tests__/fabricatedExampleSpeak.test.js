// @vitest-environment jsdom
//
// C4 (2026-08-03): several card-creation paths fabricated `card.ex` out of
// METADATA and Speak mode then read it aloud as a Malay model sentence.
//
// speakTargetFor (src/lib/speakTarget.js) treats any non-placeholder `ex` as a
// real example: it labels the card "Say this sentence", speaks it with ms-MY
// TTS, and scores the learner's pronunciation against it. Its only guard is
// PLACEHOLDER_EX = /^[^(]+\([^)]*\)\.?\s*$/ — the store's `word (gloss).` shape.
// Anything else slips through, so all four of these were spoken aloud:
//
//   SharedDeckImport   `rumah — house`                            (bilingual glue)
//   RoleplayScorecard  `From roleplay scenario: At the Restaurant` (English meta)
//   WordFamilyTree     `mengajar (verb) — from root "ajar"`        (parens, but the
//                                                                  trailing text
//                                                                  breaks the anchor)
//   AIFeedbackPanel    `men- + t → t drops`                        (a grammar rule)
//
// Only the first was in the review. The other three are the same defect and were
// found by sweeping every `ex:` in a card payload.
//
// Fixes: SharedDeckImport mirrors SearchModal (a REAL curated example when the
// dictionary has one, else the guard-compatible placeholder). The other three
// carry no example at all (`ex: ''`, the MakeDeckPanel precedent) — their text
// was provenance already present in the deck name or the gloss, and `card.mn`
// has no consumer so moving it there would just be a dead write.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const mem = new Map()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)) },
    removeItem: (k) => { mem.delete(k) },
    clear: () => { mem.clear() },
    key: (i) => [...mem.keys()][i] ?? null,
    get length() { return mem.size },
  },
})

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { default: SharedDeckImport } = await import('../SharedDeckImport')
const { default: useStore } = await import('../../store/useStore')
const { speakTargetFor } = await import('../../lib/speakTarget')

const here = dirname(fileURLToPath(import.meta.url))
const src = (rel) => readFileSync(resolve(here, rel), 'utf8')

describe('SharedDeckImport does not fabricate a speakable example (C4)', () => {
  let root, container

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    useStore.setState({ cards: [], studyLang: 'ms' })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    if (root) await act(async () => root.unmount())
    container?.remove()
  })

  const importDeck = async (cards) => {
    await act(async () => root.render(
      React.createElement(SharedDeckImport, { cards, onClose: () => {} })
    ))
    const add = [...container.querySelectorAll('button')].find(b => /^Add \d+ word/.test(b.textContent.trim()))
    expect(add, '"Add N words" button should be mounted').toBeTruthy()
    // handleAdd is async since C8 (dictionaryExamples is dynamic-imported to keep
    // it out of the eager entry chunk) — awaiting the same import inside act()
    // warms the module and flushes the handler's continuation.
    await act(async () => {
      add.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await import('../../data/dictionaryExamples')
    })
    return useStore.getState().cards
  }

  it('never turns an imported card into a "say this sentence" target', async () => {
    // `sanitiseDeck` whitelists exactly {m,e,t,lang} — a shared payload can
    // never carry a real `ex`, so nothing here may invent one.
    const added = await importDeck([
      { m: 'zzqx', e: 'nonsense-word', t: 'Shared', lang: 'ms' },
      { m: 'hotel', e: 'hotel', t: 'Shared', lang: 'en' },
    ])
    expect(added).toHaveLength(2)
    for (const card of added) {
      expect(card.ex).not.toContain('—')
      // The only acceptable outcomes: no example (speak the word) or an example
      // the placeholder guard recognises (also speak the word).
      expect(speakTargetFor(card), `card "${card.m}" got a fabricated sentence target`).toBe(card.m)
    }
  })

  it('still gives an imported word a REAL example when the dictionary has one', async () => {
    const { getExample } = await import('../../data/dictionaryExamples')
    const [card] = await importDeck([{ m: 'rumah', e: 'house', t: 'Shared', lang: 'ms' }])
    const curated = getExample('rumah')
    expect(curated, 'fixture assumes "rumah" has a curated example').toBeTruthy()
    expect(card.ex).toBe(curated)
    expect(speakTargetFor(card)).toBe(curated) // a genuine sentence IS speakable
  })
})

// The other three sites build cards from props/AI output that are impractical to
// mount here, so they are pinned at the source: the fabricated `ex` string must
// be gone. Comments are stripped so this file's own write-up (and each fix's
// explanatory comment) can't satisfy the check trivially.
describe('sibling sites no longer fabricate card.ex (C4 sweep)', () => {
  const code = (rel) => src(rel).replace(/^\s*\/\/.*$/gm, '').replace(/^\s*\*.*$/gm, '')

  it('RoleplayScorecard does not store the scenario provenance as an example', () => {
    expect(code('../RoleplayScorecard.jsx')).not.toMatch(/ex:\s*`From roleplay scenario/)
  })

  it('WordFamilyTree does not store the derivation note as an example', () => {
    expect(code('../WordFamilyTree.jsx')).not.toMatch(/ex:\s*`\$\{form\.word\}/)
  })

  it('AIFeedbackPanel does not store the grammar rule as an example', () => {
    expect(code('../writing/AIFeedbackPanel.jsx')).not.toMatch(/ex:\s*w\.rule/)
  })
})
