// @vitest-environment jsdom
//
// Content-truth guard (axis-1, GOAL.md): the SPEAKING paper number must not leak
// onto the BILINGUAL Roleplay surface. "Paper 3" is the speaking paper for Malay
// 0546 ONLY — Cambridge IGCSE English 0510 speaking is COMPONENT 3, not Paper 3
// (both web-verified 2026-06-23; same record as examPaperLabels.test.js). So a
// hardcoded "Paper 3" shown to an English learner is confident-WRONG.
//
// Two user-facing labels hardcoded "Paper 3" pre-fix:
//   • Roleplay.jsx scenario-card chip (rendered for English SCENARIOS_EN cards too)
//   • RoleplayScorecard.jsx band label ("IGCSE Paper 3 Band", shown after any roleplay)
// Decision (Kheshav-cleared 2026-06-22): label by SKILL in the English branch,
// keep the verified number only in single-syllabus Malay context. Both are now
// language-aware (mirrors the already-bilingual body copy at Roleplay.jsx:82-85).
//
// MOUNTS the real components (mirrors roleplayScorecardMistakeLang.test.js) so the
// assertion is what the learner actually SEES, not a source scan. The in-memory
// Storage shim must be installed BEFORE the store loads (Node's bare localStorage
// stub throws on setItem).

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

let React, act, createRoot, MemoryRouter, RoleplayScorecard, Roleplay, useStore
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
  ;({ default: Roleplay } = await import('../../pages/Roleplay'))
  ;({ default: useStore } = await import('../../store/useStore'))

  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

async function mountScorecard(scenario) {
  await act(async () =>
    root.render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(RoleplayScorecard, {
          scenario,
          messages: [],
          scoreData: { overallBand: 4 },
        })
      )
    )
  )
}

async function mountPicker(studyLang) {
  useStore.setState({ studyLang })
  await act(async () =>
    root.render(
      React.createElement(MemoryRouter, null, React.createElement(Roleplay))
    )
  )
}

describe('Roleplay scorecard band label — skill-labelled for English, Paper 3 only for Malay', () => {
  it('an English roleplay scorecard shows a SKILL band label, never "Paper 3"', async () => {
    await mountScorecard({ id: 'lost-luggage', lang: 'en', title: 'Lost Luggage', titleEn: 'Lost Luggage' })
    expect(host.textContent).toContain('Speaking Band')
    expect(host.textContent).not.toMatch(/Paper\s*3/i)
  })

  it('a Malay roleplay scorecard keeps "IGCSE Paper 3 Band" (verified single-syllabus)', async () => {
    await mountScorecard({ id: 'kapal-terbang', title: 'Kapal Terbang', titleEn: 'Airplane' })
    expect(host.textContent).toContain('IGCSE Paper 3 Band')
  })
})

describe('Roleplay scenario-card chip — skill-labelled for English, Paper 3 only for Malay', () => {
  it('the English picker shows a "Speaking" chip and never "Paper 3"', async () => {
    await mountPicker('en')
    expect(host.textContent).toContain('Speaking')
    expect(host.textContent).not.toMatch(/Paper\s*3/i)
  })

  it('the Malay picker keeps the "Paper 3" chip', async () => {
    await mountPicker('ms')
    expect(host.textContent).toMatch(/Paper\s*3/i)
  })
})
