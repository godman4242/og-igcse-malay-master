// @vitest-environment jsdom
//
// C6 regression (2026-08-03): the DEFAULT first interaction on /grammar (Malay
// imbuhan, tab='drill') rendered a raw LLM system-prompt to the student as the
// "Think:" hint.
//
// Grammar.checkDrill called agentFeedbackEngine.generateIntervention() and
// spread `intervention.message` over the curated `generativePrompt`. Every
// branch of generateIntervention returns an *LLM prompt*, not learner prose:
//   - metacognitive_prompt → 'Context: "undefined" … Correct Answer: "menulis"
//                             … YOUR TASK (Metacognitive Loop): …'
//   - socratic_hook        → '… (Should be: "menulis") … YOUR TASK …'
//   - correction           → '… the correct answer is "menulis" …'
// So the hint (a) leaked the answer the learner is about to be asked to type
// into ActiveCorrection, destroying the retrieval attempt the drill exists to
// create, and (b) overwrote the human-written concept-specific hint.
//
// Contract pinned: the rendered "Think:" hint is the curated one from
// feedbackRules.js — never prompt scaffolding, never the answer.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Grammar → useStore → zustand/persist needs localStorage at import time.
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
const { default: Grammar } = await import('../Grammar')
const { IMBUHAN_DRILLS } = await import('../../data/grammar')
const { default: useStore } = await import('../../store/useStore')

// The SRS sort is stable and every card is unseen in a fresh store, so the
// first drill served is IMBUHAN_DRILLS[0] — the meN- + tulis prefix card.
const FIRST = IMBUHAN_DRILLS[0]

describe('Grammar imbuhan hint — no LLM prompt scaffolding, no answer leak (C6)', () => {
  let root, container

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    // The store is a module singleton — without this reset the 2nd test's
    // mistake lands in recentMistakes and the 3rd test silently exercises a
    // DIFFERENT generateIntervention branch on a DIFFERENT drill, passing
    // vacuously. Every test must start on the fresh first-run path.
    useStore.setState({
      cognitiveProfile: { studentId: 'local_user', masteredConcepts: [], learningConcepts: [], recentMistakes: [] },
      grammarCards: {},
      grammarStats: {},
      studyLang: 'ms',
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => root.render(React.createElement(Grammar)))
  })

  afterEach(async () => {
    if (root) await act(async () => root.unmount())
    container?.remove()
  })

  const answerWrong = async () => {
    const input = container.querySelector('input[type="text"]')
    expect(input, 'imbuhan text input should be mounted').toBeTruthy()
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    await act(async () => {
      setter.call(input, 'metulis') // deliberately wrong
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const check = [...container.querySelectorAll('button')].find(b => b.textContent.trim() === 'Check')
    expect(check, '"Check" button should be mounted').toBeTruthy()
    await act(async () => { check.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
  }

  const thinkHint = () => {
    const el = [...container.querySelectorAll('span')]
      .find(s => s.textContent.trim().startsWith('Think:') && s.querySelector('span'))
    return el ? el.textContent.replace(/^\s*Think:\s*/, '') : null
  }

  it('serves the meN- + tulis drill first (guards the fixture assumption)', () => {
    expect(FIRST.answer).toBe('menulis')
    expect(container.textContent).toContain(FIRST.root)
  })

  it('shows the curated hint from feedbackRules, not the agent prompt', async () => {
    await answerWrong()
    expect(thinkHint()).toBe('Imagine the "T" being sliced away by the nasal sound "N".')
  })

  it('never renders prompt scaffolding to the learner', async () => {
    await answerWrong()
    const rendered = container.textContent
    expect(rendered).not.toContain('YOUR TASK')
    expect(rendered).not.toContain('Context:')
    expect(rendered).not.toContain('undefined')
    expect(rendered).not.toContain("Student's Input")
    expect(rendered).not.toContain('Correct Answer:')
  })

  it('does not leak the correct answer through the Think hint', async () => {
    await answerWrong()
    expect(thinkHint()).not.toContain(FIRST.answer)
  })
})
