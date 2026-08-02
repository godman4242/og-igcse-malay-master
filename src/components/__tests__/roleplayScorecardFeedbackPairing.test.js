// @vitest-environment jsdom
//
// END-RESULT regression guard for V6 (2026-08-03): per-turn grammar feedback was
// paired with the WRONG student answer, one turn late.
//
// RoleplaySession appends the AI's reply as an EXAMINER message carrying
// `feedback` ABOUT the student answer that came just before it, so the real shape
// is [E0, S1, E2(fb about S1), S3, E4(fb about S3), …]. Both loops in the
// scorecard read forwards instead of backwards:
//   • the addMistake loop took messages[i + 1] as the surface, journaling each
//     note against the NEXT answer — and dropping the final turn's note entirely,
//     because the last examiner message has no message after it;
//   • the Conversation Review loop showed `msg.feedback` on the examiner that
//     OPENED the pair, so the learner read each grammar note next to an answer it
//     was not about, and never saw the last one at all.
//
// A grammar note attached to the wrong sentence is confident-wrong feedback —
// the worst failure mode for a learning tool.

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

const SCENARIO = { id: 'kapal-terbang', title: 'Kapal Terbang', titleEn: 'Airplane' }

const S1 = 'Saya berasa kurang sihat hari ini.'
const S3 = 'Telinga saya berdesing sejak tadi.'
const NOTE_ABOUT_S1 = 'Gunakan imbuhan "menaiki" dalam ayat itu.'
const NOTE_ABOUT_S3 = 'Perhatikan tense: gunakan "sudah" di sini.'

// The real shape RoleplaySession produces: feedback rides on the examiner reply
// that FOLLOWS the answer it describes.
const MESSAGES = [
  { role: 'examiner', text: 'Selamat petang. Apa khabar?' },
  { role: 'student', text: S1 },
  { role: 'examiner', text: 'Nampaknya anda tidak selesa.', feedback: { grammarNote: NOTE_ABOUT_S1 } },
  { role: 'student', text: S3 },
  { role: 'examiner', text: 'Sudahkah anda cuba mengunyah gula-gula?', feedback: { grammarNote: NOTE_ABOUT_S3 } },
]

async function mount() {
  await act(async () =>
    root.render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(RoleplayScorecard, {
          scenario: SCENARIO,
          messages: MESSAGES,
          scoreData: { overallBand: 3 },
        })
      )
    )
  )
}

const noteMistakes = () =>
  useStore.getState().mistakes.filter(m => m.note === NOTE_ABOUT_S1 || m.note === NOTE_ABOUT_S3)

describe('RoleplayScorecard — grammar feedback pairs with the answer it describes', () => {
  it('journals each note against the PRECEDING student answer', async () => {
    await mount()
    const byNote = Object.fromEntries(noteMistakes().map(m => [m.note, m.surface]))
    expect(byNote[NOTE_ABOUT_S1]).toBe(S1)
    expect(byNote[NOTE_ABOUT_S3]).toBe(S3)
  })

  it('does not drop the final turn\'s note', async () => {
    await mount()
    expect(noteMistakes()).toHaveLength(2)
  })

  it('categorises each note from its own text', async () => {
    await mount()
    const byNote = Object.fromEntries(noteMistakes().map(m => [m.note, m.category]))
    expect(byNote[NOTE_ABOUT_S1]).toBe('imbuhan')
    expect(byNote[NOTE_ABOUT_S3]).toBe('tense')
  })

  // The visible half: Conversation Review pairs examiner+student as question and
  // answer, so Turn 1's grammar note must be the one about S1.
  it('shows Turn 1 the note about Turn 1\'s answer', async () => {
    await mount()
    const turn1 = [...host.querySelectorAll('button')].find(b => b.textContent.includes('Turn 1'))
    expect(turn1, 'Turn 1 toggle exists').toBeTruthy()
    await act(async () => { turn1.click() })

    const shown = host.textContent
    expect(shown).toContain('Grammar note:')
    expect(shown).toContain(NOTE_ABOUT_S1)
    expect(shown).not.toContain(NOTE_ABOUT_S3)
  })
})
