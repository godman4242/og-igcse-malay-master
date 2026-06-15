// @vitest-environment jsdom
//
// END-RESULT regression guard: the roleplay scorecard must credit a key vocab
// word only when the student used it as a WHOLE word — not as a substring of an
// unrelated word. Pre-fix, RoleplayScorecard.jsx detected hits with a naive
// `studentLower.includes(keyword)`, so keyVocab 'menu' (restaurant scenario)
// fired a false green "✓ used" chip for "menunggu" (to wait) and mangled the
// highlight ("menu"nggu). This MOUNTS the real component (the bug lives in the
// component's substring match, not a store action).
//
// Mirrors roleplayScorecardMistakeLang.test.js: the in-memory Storage shim must
// be installed BEFORE the store module loads (the component pulls the zustand
// store), hence dynamic imports inside beforeEach.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

let React, act, createRoot, MemoryRouter, RoleplayScorecard, useStore
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
  ;({ default: RoleplayScorecard } = await import('../RoleplayScorecard'))
  ;({ default: useStore } = await import('../../store/useStore'))

  useStore.setState(s => ({ cards: [], mistakes: [], sync: { ...s.sync, queue: [] } }))

  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

async function mount(scenario, studentText) {
  await act(async () =>
    root.render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(RoleplayScorecard, {
          scenario,
          messages: [
            { role: 'examiner', text: 'Apa yang anda mahu?' },
            { role: 'student', text: studentText },
          ],
          scoreData: { overallBand: 3, keyPhraseMissed: [] },
        }),
      ),
    ),
  )
}

// The green "✓ used" chips are rounded-full spans coloured var(--color-green);
// each chip's text content trims to the key word. Count those equal to `word`.
function usedChipCount(word) {
  return [...host.querySelectorAll('span')].filter(
    s => /rounded-full/.test(s.className) &&
      /--color-green/.test(s.getAttribute('style') || '') &&
      s.textContent.trim().toLowerCase() === word,
  ).length
}

const SCENARIO = { id: 'restaurant', title: 'Restoran', keyVocab: ['menu'], keyImbuhan: [] }

describe('RoleplayScorecard — whole-word key-vocab detection', () => {
  it('does NOT credit "menu" when the student only wrote "menunggu" (substring)', async () => {
    await mount(SCENARIO, 'Saya menunggu makanan')
    expect(usedChipCount('menu')).toBe(0)
  })

  it('credits "menu" when the student used it as a standalone word', async () => {
    await mount(SCENARIO, 'Boleh saya lihat menu?')
    expect(usedChipCount('menu')).toBe(1)
  })
})
