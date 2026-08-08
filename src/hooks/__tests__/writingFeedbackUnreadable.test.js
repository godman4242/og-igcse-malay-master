// @vitest-environment jsdom
//
// Census A11 (2026-08-06): "Get AI feedback" spent one of the 50 daily AI calls
// and then rendered absolutely nothing.
//
//   const parsed = typeof result.response === 'string'
//     ? tryParseJSON(result.response) : result.response
//   setAiFeedback(parsed)
//
// `tryParseJSON` returns **null** for a reply it cannot read (see lib/json.js —
// it tries JSON.parse, then a braces-substring rescue, then gives up). So a
// non-JSON reply set the feedback to null: no panel, no error, no explanation,
// and the quota call already consumed. The student sees the spinner run and the
// screen return to exactly how it was, with one fewer call for the day.
//
// The v2 (annotated) path already had this covered — it sets `v2ParseRejected`
// and the page renders "Annotated feedback unavailable … showing the standard
// view below". The v1 path, which is that very fallback, had no equivalent. So
// the fix is to give v1 the same signal the v2 path already uses, not to invent
// a new mechanism.

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

// One controllable AI call, so the test drives exactly what the model "replied".
const aiCall = vi.fn()
vi.mock('../../lib/ai', () => ({
  useAI: () => ({ call: aiCall, error: null, dailyCalls: 0, remaining: 50 }),
}))

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { default: useWritingEvaluator } = await import('../useWritingEvaluator')
const { default: useStore } = await import('../../store/useStore')

describe('Writing "Get AI feedback" — an unreadable reply is reported, not swallowed (A11)', () => {
  let root, container, hook

  const Probe = () => {
    hook = useWritingEvaluator({ lang: 'eng', format: 'article', mlPaper: 1, task: null })
    return null
  }

  const mount = async () => {
    // Force the v1 path: the adaptive-scaffolding toggle off means the v2
    // annotated request is skipped entirely, so this test exercises exactly the
    // branch under repair.
    useStore.setState({ ui: { useAdaptiveScaffolding: false } })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => root.render(React.createElement(Probe)))
    await act(async () => { hook.setText('An essay long enough to grade.') })
  }

  beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; aiCall.mockReset() })

  afterEach(async () => {
    if (root) await act(async () => root.unmount())
    container?.remove()
    root = null
  })

  it('renders the feedback when the reply IS readable JSON (guards the fixture)', async () => {
    aiCall.mockResolvedValue({ response: JSON.stringify({ band: 5, comments: 'Solid structure.' }) })
    await mount()
    await act(async () => { await hook.getAIFeedback() })

    expect(hook.aiFeedback).toEqual({ band: 5, comments: 'Solid structure.' })
    expect(hook.aiFeedbackRejected).toBeFalsy()
  })

  it('reports an unreadable reply instead of silently showing nothing', async () => {
    // What a model actually returns when it ignores the JSON instruction.
    aiCall.mockResolvedValue({ response: "I'd be happy to help with your essay!" })
    await mount()
    await act(async () => { await hook.getAIFeedback() })

    expect(hook.aiFeedback, 'no feedback to show').toBeFalsy()
    expect(
      hook.aiFeedbackRejected,
      'the student must be told the call was spent and produced nothing readable',
    ).toBeTruthy()
  })

  it('reports an empty reply too', async () => {
    aiCall.mockResolvedValue({ response: '' })
    await mount()
    await act(async () => { await hook.getAIFeedback() })

    expect(hook.aiFeedbackRejected).toBeTruthy()
  })

  it('reports a thrown request the same way (the student still lost the call)', async () => {
    aiCall.mockRejectedValue(new Error('429 rate limited'))
    await mount()
    await act(async () => { await hook.getAIFeedback() })

    expect(hook.aiFeedbackRejected).toBeTruthy()
  })

  it('clears the notice on the next successful attempt', async () => {
    aiCall.mockResolvedValue({ response: 'not json' })
    await mount()
    await act(async () => { await hook.getAIFeedback() })
    expect(hook.aiFeedbackRejected).toBeTruthy()

    aiCall.mockResolvedValue({ response: JSON.stringify({ band: 4 }) })
    await act(async () => { await hook.getAIFeedback() })
    expect(hook.aiFeedbackRejected, 'a stale notice must not sit above fresh feedback').toBeFalsy()
    expect(hook.aiFeedback).toEqual({ band: 4 })
  })

  it('reset() clears the notice', async () => {
    aiCall.mockResolvedValue({ response: 'not json' })
    await mount()
    await act(async () => { await hook.getAIFeedback() })
    await act(async () => { hook.reset() })

    expect(hook.aiFeedbackRejected).toBeFalsy()
  })
})
