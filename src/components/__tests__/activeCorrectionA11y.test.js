// @vitest-environment jsdom
//
// A11y sweep follow-up (WCAG 2.1 SC 4.1.3 Status Messages + 4.1.2 Name): the
// LAST verdict-bearing interactive drill surface the FeedbackLive rollout MISSED —
//   • ActiveCorrection (the "Feedback Correction Effect" component, mounted in
//     Grammar.jsx after a wrong drill answer to force the learner to TYPE the
//     correct answer to continue).
// Before the fix it signalled success by COLOUR ALONE (green border/text) + an
// 800ms auto-advance, with NO live region and NO accessible name on its
// auto-focused input — a screen-reader learner typed the correct answer and
// heard nothing. It now mounts the shared <FeedbackLive> and names the input.
//
// Behavioural proof: mount the real standalone component (no store/router
// needed), drive a real correct answer, assert the role="status" region carries
// "Correct!" and the input exposes the instruction as its accessible name.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

let React, act, createRoot, ActiveCorrection
let root, host

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  ;({ default: React, act } = await import('react'))
  ;({ createRoot } = await import('react-dom/client'))
  ;({ default: ActiveCorrection } = await import('../ActiveCorrection'))

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
const typeInto = async (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  await act(async () => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('ActiveCorrection — announces correction success via a live region', () => {
  it('mounts an EMPTY live region before any input, announces Correct! when the answer is typed', async () => {
    await render(React.createElement(ActiveCorrection, { correctAnswer: 'menulis.', onComplete: () => {} }))

    // Region exists and is empty on mount (SRs only announce changes inside an
    // already-mounted region — this is the load-bearing assertion).
    expect(status()).toBeTruthy()
    expect(status().textContent).toBe('')

    // Typing the correct answer (trailing "." is stripped by the component) flips
    // success → the region must now carry the announcement.
    await typeInto(host.querySelector('input'), 'menulis')
    expect(status().textContent).toBe('Correct!')
  })

  it('exposes the instruction as the input accessible name (SC 4.1.2)', async () => {
    await render(React.createElement(ActiveCorrection, { correctAnswer: 'memasak', onComplete: () => {} }))
    const input = host.querySelector('input')
    expect(input.getAttribute('aria-label')).toBe('Type the correct answer to continue')
  })
})
