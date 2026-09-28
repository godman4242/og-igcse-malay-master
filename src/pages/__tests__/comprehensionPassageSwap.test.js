// @vitest-environment jsdom
//
// GOAL.md bug-hunt #5 (census A15): "Get fresh AI questions" on passage A, then
// Back → open passage B while A's questions are still generating. When A's call
// resolved, `setAiQuestions` ran with no check of which passage was open, so B
// showed A's questions — and a wrong answer was journalled against B.
//
// Contract pinned here: a generation only lands on the passage it was started
// for; a late result (or late error) for a passage the learner left is dropped.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

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

// One controllable deferred per callTextAI call, in call order.
const calls = []
vi.mock('../../lib/gemini', () => ({ isGeminiAvailable: () => true }))
vi.mock('../../lib/aiText', () => ({
  callTextAI: () => new Promise((resolve, reject) => { calls.push({ resolve, reject }) }),
}))

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { default: Comprehension } = await import('../Comprehension')
const { default: useStore } = await import('../../store/useStore')
const { default: PASSAGES } = await import('../../data/comprehensionPassages')

const aiReply = (tag) => JSON.stringify({
  questions: [{ id: 1, type: 'factual', question: `AI question for ${tag}?`, options: ['A) a', 'B) b', 'C) c', 'D) d'], correctIndex: 0, explanation: 'x', referenceText: 'x' }],
})

describe('Comprehension — AI questions land only on the passage they were generated for (#5)', () => {
  let root, container
  const [A, B] = PASSAGES

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    calls.length = 0
    useStore.setState({ userInterests: [], studyLang: 'ms', mistakes: [] })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => root.render(React.createElement(Comprehension)))
  })

  afterEach(async () => {
    if (root) await act(async () => root.unmount())
    container?.remove()
  })

  const buttons = () => [...container.querySelectorAll('button')]
  const click = async (el) => act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
  const openPassage = (p) => click(buttons().find(b => b.querySelector('h3')?.textContent.includes(p.title)))
  const back = () => click(buttons().find(b => b.textContent.trim() === 'Back'))
  const genButton = () => buttons().find(b => /AI questions|Generating/.test(b.textContent))

  it('a late result for passage A never replaces passage B\'s questions', async () => {
    await openPassage(A)
    await click(genButton())
    expect(calls).toHaveLength(1)
    await back()
    await openPassage(B)
    await act(async () => { calls[0].resolve(aiReply('A')) })

    expect(container.textContent).not.toContain('AI question for A?')
    expect(container.textContent).toContain(B.questions[0].question)
  })

  it('B can generate while A is still in flight, and A resolving late does not clobber B', async () => {
    await openPassage(A)
    await click(genButton())
    await back()
    await openPassage(B)
    expect(genButton().disabled, 'B\'s generate button must not be locked by A\'s run').toBe(false)
    await click(genButton())
    expect(calls).toHaveLength(2)

    await act(async () => { calls[1].resolve(aiReply('B')) })
    await act(async () => { calls[0].resolve(aiReply('A')) })
    expect(container.textContent).toContain('AI question for B?')
    expect(container.textContent).not.toContain('AI question for A?')
  })

  it('a late failure for passage A shows no error on passage B', async () => {
    await openPassage(A)
    await click(genButton())
    await back()
    await openPassage(B)
    await act(async () => { calls[0].reject(new Error('network')) })
    expect(container.textContent).not.toContain('Could not generate')
  })

  // Deliberate (review finding, 2026-09-28): re-opening a passage resets it —
  // the button no longer spins — so a late result from the earlier visit is
  // dropped rather than wiping answers the learner has started giving.
  it('A → Back → A again: the earlier visit\'s late result does not wipe a started answer', async () => {
    await openPassage(A)
    await click(genButton())
    await back()
    await openPassage(A)
    const firstOption = buttons().find(b => b.textContent.trim() === A.questions[0].options[0])
    await click(firstOption)
    await act(async () => { calls[0].resolve(aiReply('A')) })
    expect(container.textContent).not.toContain('AI question for A?')
    expect(container.textContent).toContain(A.questions[0].question)
  })

  it('same passage: generating still lands (control)', async () => {
    await openPassage(A)
    await click(genButton())
    await act(async () => { calls[0].resolve(aiReply('A')) })
    expect(container.textContent).toContain('AI question for A?')
  })
})
