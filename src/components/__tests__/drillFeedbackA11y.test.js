// @vitest-environment jsdom
//
// A11y sweep follow-up (WCAG 2.1 SC 4.1.3 Status Messages): the two interactive
// DRILL surfaces the original FeedbackLive rollout MISSED —
//   • SavedWordCloze  (the "Practise saved words" cloze/produce drill, /saved-cloze)
//   • MixedSession    (the Dashboard "Smart Study" interleaved drill)
// — render a per-question correct/incorrect verdict VISUALLY but had NO live
// region, so a screen-reader / switch learner heard nothing. Each now mounts the
// shared <FeedbackLive>. Behavioural proof: mount the real component, drive a
// real answer, assert the role="status" region carries the announcement.
//
// MixedSession's item selection uses Math.random (shuffleArray) + FSRS due logic
// + the variant engine — non-deterministic end-to-end — so the session builder
// is mocked to ONE known grammar drill. The verdict + live-region code under
// test is the component's, not the builder's. Driving the CORRECT path means
// buildDrillFeedback returns null (no GRAMMAR_FEEDBACK lookup) — no fixtures.
//
// The in-memory localStorage shim is installed BEFORE the store module loads
// (the zustand persist middleware needs setItem), hence dynamic imports inside
// beforeEach — same harness as roleplayScorecardKeywordHits.test.js.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../../lib/interleave', () => ({
  buildMixedSession: () => ([
    { type: 'grammar', item: { id: 'imbuhan-test', type: 'imbuhan', root: 'masak', hint: 'cook (verb)', answer: 'memasak' } },
  ]),
  getMixedSessionSummary: () => ({ total: 1, correct: 1, accuracy: 100, byType: {}, weakest: null }),
}))

let React, act, createRoot, MemoryRouter, SavedWordCloze, MixedSession, useStore
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
  ;({ default: SavedWordCloze } = await import('../../pages/SavedWordCloze'))
  ;({ default: MixedSession } = await import('../MixedSession'))
  ;({ default: useStore } = await import('../../store/useStore'))

  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

const render = async (el) => act(async () => root.render(el))
const status = () => host.querySelector('[role="status"]')
const click = async (el) =>
  act(async () => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
const typeInto = async (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  await act(async () => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const checkButton = () => [...host.querySelectorAll('button')].find(b => b.textContent === 'Check')

describe('SavedWordCloze — announces the cloze verdict via a live region', () => {
  it('mounts an EMPTY live region before any answer, announces Correct! on a right answer', async () => {
    useStore.setState({ cards: [{ m: 'rumah', e: 'house', ex: 'Saya tinggal di rumah besar.', t: 'Saved' }] })
    await render(React.createElement(MemoryRouter, null, React.createElement(SavedWordCloze)))
    expect(status()).toBeTruthy()
    expect(status().textContent).toBe('')

    await typeInto(host.querySelector('input'), 'rumah')
    await click(checkButton())
    expect(status().textContent).toBe('Correct!')
  })

  it('announces the answer on a wrong attempt', async () => {
    useStore.setState({ cards: [{ m: 'rumah', e: 'house', ex: 'Saya tinggal di rumah besar.', t: 'Saved' }] })
    await render(React.createElement(MemoryRouter, null, React.createElement(SavedWordCloze)))
    await typeInto(host.querySelector('input'), 'salah')
    await click(checkButton())
    expect(status().textContent).toBe('Not quite — the answer is rumah')
  })
})

describe('MixedSession — announces the drill verdict via a live region', () => {
  it('mounts an EMPTY live region, announces Correct! when the grammar drill is right', async () => {
    useStore.setState({ cards: [], grammarCards: {} })
    await render(React.createElement(MixedSession, { onClose: () => {} }))
    expect(status()).toBeTruthy()
    expect(status().textContent).toBe('')

    await typeInto(host.querySelector('input'), 'memasak')
    await click(checkButton())
    expect(status().textContent).toBe('Correct!')
  })
})
