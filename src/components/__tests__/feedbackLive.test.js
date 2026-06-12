// @vitest-environment jsdom
//
// FeedbackLive — the shared polite live region (spec §4, D8) that announces
// drill / flashcard correct-incorrect feedback to screen readers (WCAG 4.1.3).
//
// Contract pinned here:
//  - role="status" + aria-live="polite" + aria-atomic="true" (announce the
//    whole line, never a diff)
//  - visually hidden via Tailwind's `sr-only`
//  - mounted EVEN when there is no feedback yet — a live region only fires
//    when text changes INSIDE an existing region; conditionally mounting it
//    with the feedback would announce nothing on most SR/browser pairs.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import FeedbackLive from '../FeedbackLive'

let root, host

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

const render = async (el) => act(async () => root.render(el))

describe('FeedbackLive', () => {
  it('renders a polite, atomic, visually-hidden status region with the text', async () => {
    await render(React.createElement(FeedbackLive, { text: 'Correct' }))
    const region = host.querySelector('[role="status"]')
    expect(region).toBeTruthy()
    expect(region.getAttribute('aria-live')).toBe('polite')
    expect(region.getAttribute('aria-atomic')).toBe('true')
    expect(region.className).toContain('sr-only')
    expect(region.textContent).toBe('Correct')
  })

  it('stays mounted (empty) when there is no feedback yet, then carries updates', async () => {
    await render(React.createElement(FeedbackLive, { text: null }))
    const region = host.querySelector('[role="status"]')
    expect(region).toBeTruthy()
    expect(region.textContent).toBe('')

    await render(React.createElement(FeedbackLive, { text: 'Not quite — the answer is rumah' }))
    expect(host.querySelector('[role="status"]').textContent).toBe('Not quite — the answer is rumah')
  })
})
