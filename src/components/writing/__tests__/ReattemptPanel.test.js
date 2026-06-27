// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import ReattemptPanel from '../ReattemptPanel'

let root, host
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host) })
afterEach(async () => { await act(async () => root.unmount()); host.remove() })
const render = (el) => act(async () => root.render(el))

const MISSED = [
  { index: 1, text: 'Gives at least two developed reasons', hint: 'Back each reason with a concrete example.' },
  { index: 2, text: 'Suggests what a fair rule could look like', hint: 'Name one specific rule and when it applies.' },
]
const PRAISE = /\b(great|well done|excellent|amazing|awesome|nice job|fantastic|brilliant)\b/i

describe('ReattemptPanel — pre-resubmit (missed reqs)', () => {
  it('lists each missed requirement AND its how-to-fix hint', async () => {
    await render(React.createElement(ReattemptPanel, { missed: MISSED, comparison: null, onImprove: () => {} }))
    expect(host.textContent).toContain('Gives at least two developed reasons')
    expect(host.textContent).toContain('Back each reason with a concrete example.')
    expect(host.textContent).toContain('Name one specific rule and when it applies.')
  })
  it('contains NO praise copy in the revise phase', async () => {
    await render(React.createElement(ReattemptPanel, { missed: MISSED, comparison: null, onImprove: () => {} }))
    expect(host.textContent).not.toMatch(PRAISE)
  })
  it('the Improve button calls onImprove', async () => {
    const onImprove = vi.fn()
    await render(React.createElement(ReattemptPanel, { missed: MISSED, comparison: null, onImprove }))
    const btn = host.querySelector('[data-reattempt-improve]')
    await act(async () => btn.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(onImprove).toHaveBeenCalled()
  })
})

describe('ReattemptPanel — after resubmit (comparison)', () => {
  it('shows the band before→after and the flipped requirement, with no praise', async () => {
    const comparison = { bandBefore: 2, bandAfter: 4, delta: 2, flipsToMet: [1], flipsToMissed: [], improved: true }
    await render(React.createElement(ReattemptPanel, { missed: [], comparison, onImprove: () => {} }))
    expect(host.textContent).toContain('2')
    expect(host.textContent).toContain('4')
    expect(host.textContent).not.toMatch(PRAISE)
  })
  it('states "still needs work" (not improvement) when nothing real changed', async () => {
    const comparison = { bandBefore: 2, bandAfter: 2, delta: 0, flipsToMet: [], flipsToMissed: [], improved: false }
    await render(React.createElement(ReattemptPanel, { missed: MISSED, comparison, onImprove: () => {} }))
    expect(host.textContent.toLowerCase()).toContain('still')
  })
})

describe('ReattemptPanel — honest degrade', () => {
  it('renders nothing when there is nothing to act on', async () => {
    await render(React.createElement(ReattemptPanel, { missed: [], comparison: null, onImprove: () => {} }))
    expect(host.firstChild).toBeNull()
  })
})
