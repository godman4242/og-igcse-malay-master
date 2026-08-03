// @vitest-environment jsdom
//
// Import's Word-by-Word view has three gloss sources (Import.jsx:14-19):
// dict (green dot), stem (cyan dot), google (orange dot). On a dictionary miss
// the local `stem()` (Import.jsx:27-49) strips an imbuhan and — this is the
// defect — pushed the ROOT's gloss as THAT WORD'S meaning:
//
//   result.push({ word: raw, meaning: DICTIONARY[stemmed], source: 'stem' })
//
// `buildWbwChips` (src/lib/wbwChips.js:19) renders `{word, meaning}` only; the
// root is never surfaced. So the chip is visually identical to a real
// dictionary hit, and the sole cue is a cyan dot whose legend just says
// "Stemmed" — which does not tell a beginner that the English text is the
// meaning of a DIFFERENT word.
//
// Measured against the real 825-entry dictionary with the real stem():
//   sebuah  -> buah  -> shown "fruit"        (it is a classifier, not fruit)
//   pesakit -> sakit -> shown "sick"         (it is "patient")
//   menarik -> tarik -> shown "pull"         (it is "interesting")
//   seorang -> orang -> shown "person"       (a classifier — finder missed this)
//   ketua   -> tua   -> shown "old (age)"    (it is "leader" — finder missed this)
//
// The last two were not in the original lead. `ketua` is the worst: a common
// word whose displayed gloss is both wrong and unrelated in register.
//
// The fix keeps the stem fallback (it is genuinely useful) but makes the
// provenance part of the GLOSS rather than a colour: "buah: fruit (root)".

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../../lib/translate', () => ({
  translateWord: async (w) => ({ text: 'MT:' + w }),
}))
vi.mock('../../lib/pdfText', () => ({ extractPdfText: async () => ({ pages: [] }) }))

let React, act, createRoot, MemoryRouter, Import
let root, host

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
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
  ;({ default: React, act } = await import('react'))
  ;({ createRoot } = await import('react-dom/client'))
  ;({ MemoryRouter } = await import('react-router-dom'))
  ;({ default: Import } = await import('../Import'))

  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

const typeInto = async (input, value) => {
  const proto = input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement : window.HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value').set
  await act(async () => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

// Drive the real Word-by-Word path and return the rendered chips.
async function wordByWord(text) {
  await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(Import))))
  await typeInto(host.querySelector('textarea'), text)
  const btn = [...host.querySelectorAll('button')].find(b => b.getAttribute('data-guide') === 'import-wordbyword')
  expect(btn, 'Word-by-Word button not found').toBeTruthy()
  await act(async () => btn.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  return [...host.querySelectorAll('[data-testid="wbw-chip"]')].map(el => el.textContent)
}

describe('Import Word-by-Word — a stemmed gloss must not masquerade as the word\'s own meaning', () => {
  it('shows the ROOT alongside its gloss instead of presenting it as the word\'s meaning', async () => {
    const chips = await wordByWord('sebuah')
    expect(chips).toHaveLength(1)
    // The root must be visible in the text the learner reads.
    expect(chips[0]).toContain('buah')
    expect(chips[0]).toMatch(/root/i)
  })

  it('never presents a bare root gloss for any of the five measured mis-glosses', async () => {
    const chips = await wordByWord('sebuah pesakit menarik seorang ketua')
    expect(chips).toHaveLength(5)

    // A chip whose only gloss text is the root's meaning is the defect.
    const bare = { sebuah: 'fruit', pesakit: 'sick', menarik: 'pull', seorang: 'person', ketua: 'old (age)' }
    for (const chip of chips) {
      const word = Object.keys(bare).find(w => chip.startsWith(w))
      expect(word, `unexpected chip: ${chip}`).toBeTruthy()
      expect(chip, `"${word}" still reads as a plain dictionary hit`).not.toBe(word + bare[word])
      expect(chip, `"${word}" must disclose it is a stemmed root`).toMatch(/root/i)
    }
  })

  it('leaves a real dictionary hit untouched — no "(root)" noise on a direct match', async () => {
    const chips = await wordByWord('sekolah')
    expect(chips).toHaveLength(1)
    expect(chips[0]).toBe('sekolahschool')
  })
})
