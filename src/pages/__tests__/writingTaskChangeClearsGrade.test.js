// @vitest-environment jsdom
//
// GOAL "older loop-safe" #13: after an Analyze on a task, switching the Task
// dropdown (or the Format, which drops the task) kept the OLD grade on screen —
// "Did you answer the task?" + "Improve your answer" for a task no longer picked.
// And an AI grade still in flight when the grade was cleared landed anyway,
// rebuilding a half results object (the old task's Content band, or a crash).
//
// Contract: changing task / format / language clears the grade but keeps the
// essay; a grade that lands after that is dropped.
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

// One controllable deferred per fetchAIGrade call.
const grades = []
vi.mock('../../lib/gemini', () => ({
  isGeminiAvailable: () => true,
  fetchAIGrade: () => new Promise((resolve, reject) => { grades.push({ resolve, reject }) }),
}))
// "Get AI Feedback": one deferred per call; reset()/cancel() abort the pending
// one the way useAI's AbortController does (the call rejects).
const feedback = []
vi.mock('../../lib/ai', async () => {
  const { useState } = await import('react')
  return {
    getRemainingCalls: () => 5,
    useAI: () => {
      const [isLoading, setIsLoading] = useState(false)
      const abort = () => { setIsLoading(false); feedback.forEach(f => f.reject(new Error('Request aborted'))) }
      return {
        isLoading, error: null, reset: abort, cancel: abort,
        call: () => {
          setIsLoading(true)
          return new Promise((resolve, reject) => { feedback.push({ resolve, reject }) })
            .finally(() => setIsLoading(false))
        },
      }
    },
  }
})

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: useStore } = await import('../../store/useStore')
const { default: Writing } = await import('../Writing.jsx')

const ESSAY = 'Phones should be switched off in lessons because they distract students. '.repeat(4)
const aiGrade = () => ({
  band: 4, marker_check: {}, positives: [], improvements: ['Add a rule.'], justification: 'ok',
  content_band: 2, content_justification: 'Partly answered.',
  task_coverage: { req_0: true, req_1: false, req_2: false, req_3: false },
})

describe('Writing — changing the task clears the grade, keeps the essay (#13)', () => {
  let root, host
  const $ = (sel) => host.querySelector(sel)
  const selects = () => host.querySelectorAll('select')
  const pick = async (el, value) => act(async () => {
    const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set
    set.call(el, value)
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
  const type = async (value) => act(async () => {
    const ta = $('textarea')
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, value)
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const btn = (re) => [...host.querySelectorAll('button')].find(b => re.test(b.textContent))
  const analyze = async () => act(async () => btn(/^Analyze/).click())
  const text = () => host.textContent

  // English, Article format, its one task picked, essay typed.
  const setUp = async () => {
    await pick(selects()[0], 'eng-article')
    await pick(selects()[1], 'eng-article-phone-free-lessons')
    await type(ESSAY)
  }

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    grades.length = 0
    feedback.length = 0
    useStore.setState({ studyLang: 'en', writingHistory: [], ui: { ...useStore.getState().ui, useAdaptiveScaffolding: false } })
    host = document.createElement('div'); document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(Writing))))
    await setUp()
  })
  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
  })

  it('switching to Free write after a grade removes the task grade, keeps the essay', async () => {
    await analyze()
    await act(async () => grades[0].resolve(aiGrade()))
    expect(text()).toContain('Did you answer the task?')

    await pick(selects()[1], '')
    expect(text()).not.toContain('Did you answer the task?')
    expect(text()).not.toMatch(/Band \d\/6/)
    expect($('textarea').value).toBe(ESSAY)
  })

  it('changing the format after a grade removes the task grade, keeps the essay', async () => {
    await analyze()
    await act(async () => grades[0].resolve(aiGrade()))
    expect(text()).toContain('Did you answer the task?')

    await pick(selects()[0], 'eng-letter-formal')
    expect(text()).not.toContain('Did you answer the task?')
    expect(text()).not.toMatch(/Band \d\/6/)
    expect($('textarea').value).toBe(ESSAY)
  })

  it('a grade still in flight when the task changes is dropped, not shown', async () => {
    await analyze()
    await pick(selects()[1], '')
    await act(async () => grades[0].resolve(aiGrade()))
    expect(text()).not.toContain('Did you answer the task?')
    expect(text()).not.toMatch(/Band \d\/6/)
    // The page is usable again: Analyze is not stuck on "Analyzing with AI...".
    expect(btn(/^Analyze Essay/)?.disabled).toBe(false)
  })

  it('a grade that FAILS after the task changed shows no "AI grade unavailable" notice', async () => {
    await analyze()
    await pick(selects()[1], '')
    await act(async () => grades[0].reject(new Error('down')))
    expect(text()).not.toContain('AI grade unavailable')
  })

  const malayGradeInFlight = async () => {
    await act(async () => btn(/^Bahasa Melayu$/).click())
    await pick(selects()[0], 'ms-surat-rasmi')
    await pick(selects()[1], 'ms-surat-taman-permainan')
    await type(ESSAY)
    await act(async () => btn(/^Analyze Karangan/).click())
    await pick(selects()[1], '')
  }

  it('a Malay Content grade that lands after the task changed is not shown', async () => {
    await malayGradeInFlight()
    await act(async () => grades[0].resolve(aiGrade()))
    expect(text()).not.toContain('Adakah anda menjawab tugasan?')
  })

  it('a Malay Content grade that fails after the task changed shows no notice', async () => {
    await malayGradeInFlight()
    await act(async () => grades[0].reject(new Error('down')))
    expect(text()).not.toContain('Penilaian Isi AI tidak tersedia')
  })

  it("a stale grade can't turn off a NEWER grade's spinner", async () => {
    await analyze()
    await pick(selects()[1], '')
    await analyze() // run #2 in flight
    await act(async () => grades[0].resolve(aiGrade())) // run #1 lands late
    expect(btn(/^\s*Analyzing with AI/)?.disabled).toBe(true)
    await act(async () => grades[1].reject(new Error('down'))) // run #2 ends → free again
    expect(btn(/^Analyze Essay/)?.disabled).toBe(false)
  })

  it('"Get AI Feedback" in flight when the format changes never lands under the next grade', async () => {
    await analyze()
    await act(async () => grades[0].resolve(aiGrade()))
    await act(async () => btn(/Get AI Feedback/).click())
    await pick(selects()[0], 'eng-letter-formal')
    await analyze()
    await act(async () => grades[1].resolve(aiGrade()))
    // The old request no longer holds the new grade's feedback button hostage.
    expect(btn(/Get AI Feedback/)?.disabled).toBe(false)
    // If the old request is still pending, let it land now (late reply).
    await act(async () => feedback[0].resolve({ response: { band: 5, feedback: 'old essay feedback' } }))
    expect(text()).not.toContain('AI Assessment')
    expect(text()).not.toContain('not in a form we could read')
    expect(feedback.length).toBe(1) // an aborted request must not trigger a fallback call
  })

  it('re-analyzing the SAME task while "Get AI Feedback" loads still shows that feedback', async () => {
    useStore.setState({ ui: { ...useStore.getState().ui, useAdaptiveScaffolding: true } }) // the default: v2 first
    await analyze()
    await act(async () => grades[0].resolve(aiGrade()))
    await act(async () => btn(/Get AI Feedback/).click())
    await analyze()
    await act(async () => grades[1].resolve(aiGrade()))
    await act(async () => feedback[0].reject(new Error('404'))) // v2 not deployed → falls back to v1
    expect(feedback.length).toBe(2)
    await act(async () => feedback[1].resolve({ response: { band: 5, feedback: 'still this essay' } }))
    expect(text()).toContain('AI Assessment')
  })

  it('an adaptive (v2) feedback request aborted by a task change fires no fallback call', async () => {
    useStore.setState({ ui: { ...useStore.getState().ui, useAdaptiveScaffolding: true } })
    await analyze()
    await act(async () => grades[0].resolve(aiGrade()))
    await act(async () => btn(/Get AI Feedback/).click())
    await pick(selects()[1], '')
    await act(async () => { await Promise.resolve() })
    expect(feedback.length).toBe(1)
  })

  it('an unreadable v2 reply that arrives just as the task changes fires no fallback call', async () => {
    useStore.setState({ ui: { ...useStore.getState().ui, useAdaptiveScaffolding: true } })
    await analyze()
    await act(async () => grades[0].resolve(aiGrade()))
    await act(async () => btn(/Get AI Feedback/).click())
    feedback[0].resolve({ response: 'not json' }) // reply is in, its continuation not yet run…
    await pick(selects()[1], '') // …when the task changes
    expect(feedback.length).toBe(1)
  })

  it('switching language mid-grade does not crash when the English grade lands', async () => {
    await analyze()
    await act(async () => btn(/^Bahasa Melayu$/).click())
    await act(async () => grades[0].resolve(aiGrade()))
    expect(text()).toContain('Writing Analyzer')
    expect(text()).not.toMatch(/Band \d\/6/)
  })
})
