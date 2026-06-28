// @vitest-environment jsdom
//
// ContentTraitPanel — the task-aware "Did you answer the task?" Content axis.
// It is a PURE, store-free presentational component (props only). It renders the
// Content band, the AI's content_justification, and one coverage row per task
// requirement (✓ when task_coverage.req_i is true, ✗ when false). It returns
// null when there is no content_band (no task / AI unavailable / parse fail) so
// the Writing page never fabricates a Content number.
//
// Mount harness mirrors typeModeLang.test.js / produceMode.test.js (raw
// createRoot + act — @testing-library is NOT a dependency).

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import ContentTraitPanel from '../ContentTraitPanel'

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

const REQUIREMENTS = [
  'States a clear overall opinion on banning phones during lessons',
  'Gives at least two developed reasons or examples',
  'Suggests what a fair rule could look like in practice',
]

describe('ContentTraitPanel — present', () => {
  const aiGrade = {
    content_band: 4,
    content_justification: 'Clear opinion and good reasons, but no fair-rule suggestion.',
    task_coverage: { req_0: true, req_1: true, req_2: false },
  }

  it('renders the content band number', async () => {
    await render(React.createElement(ContentTraitPanel, { aiGrade, requirements: REQUIREMENTS }))
    expect(host.textContent).toContain('4')
  })

  it('labels the axis "Did you answer the task?" (distinct from Writing quality)', async () => {
    await render(React.createElement(ContentTraitPanel, { aiGrade, requirements: REQUIREMENTS }))
    expect(host.textContent).toContain('Did you answer the task?')
  })

  it('renders the content_justification text', async () => {
    await render(React.createElement(ContentTraitPanel, { aiGrade, requirements: REQUIREMENTS }))
    expect(host.textContent).toContain('no fair-rule suggestion')
  })

  it('renders one coverage row per requirement, with the correct ✓/✗', async () => {
    await render(React.createElement(ContentTraitPanel, { aiGrade, requirements: REQUIREMENTS }))
    const rows = host.querySelectorAll('[data-coverage-row]')
    expect(rows.length).toBe(REQUIREMENTS.length)

    // The requirement text is labelled on each row.
    expect(host.textContent).toContain(REQUIREMENTS[0])
    expect(host.textContent).toContain(REQUIREMENTS[2])

    // A true (met) row and a false (unmet) row must visibly differ — different
    // marks, so a learner can scan met vs missed.
    const metRow = host.querySelector('[data-coverage-row="0"]')
    const missedRow = host.querySelector('[data-coverage-row="2"]')
    expect(metRow.textContent).toContain('✓')
    expect(missedRow.textContent).toContain('✗')
    expect(metRow.textContent).not.toBe(missedRow.textContent)
  })

  it('does NOT render a summed "/15" total', async () => {
    await render(React.createElement(ContentTraitPanel, { aiGrade, requirements: REQUIREMENTS }))
    expect(host.textContent).not.toContain('/15')
  })
})

describe('ContentTraitPanel — Malay chrome (lang="ms")', () => {
  const aiGrade = {
    content_band: 4,
    content_justification: 'Pendapat jelas tetapi tiada cadangan yang konkrit.',
    task_coverage: { req_0: true, req_1: false },
  }
  const REQ_MS = ['Menyatakan pendahuluan yang jelas', 'Menghuraikan dua kepentingan']

  it('uses Malay headings, still rendering the band + coverage', async () => {
    await render(React.createElement(ContentTraitPanel, { aiGrade, requirements: REQ_MS, lang: 'ms' }))
    expect(host.textContent).toContain('Adakah anda menjawab tugasan?')
    expect(host.textContent).toContain('Liputan keperluan')
    expect(host.textContent).not.toContain('Did you answer the task?')
    expect(host.textContent).toContain('4')                 // band still shown
    expect(host.querySelectorAll('[data-coverage-row]').length).toBe(REQ_MS.length)
  })

  it('English chrome is unchanged when lang is omitted (default)', async () => {
    await render(React.createElement(ContentTraitPanel, { aiGrade, requirements: REQ_MS }))
    expect(host.textContent).toContain('Did you answer the task?')
    expect(host.textContent).not.toContain('Adakah anda menjawab tugasan?')
  })
})

describe('ContentTraitPanel — absent (honest degrade)', () => {
  it('renders nothing when aiGrade is null', async () => {
    await render(React.createElement(ContentTraitPanel, { aiGrade: null, requirements: REQUIREMENTS }))
    expect(host.textContent).toBe('')
    expect(host.firstChild).toBeNull()
  })

  it('renders nothing when content_band is missing (no task / parse fail)', async () => {
    const noContent = { band: 5, justification: 'fluent', marker_check: {} }
    await render(React.createElement(ContentTraitPanel, { aiGrade: noContent, requirements: REQUIREMENTS }))
    expect(host.textContent).toBe('')
    expect(host.firstChild).toBeNull()
  })

  it('renders nothing when aiGrade is undefined', async () => {
    await render(React.createElement(ContentTraitPanel, { requirements: REQUIREMENTS }))
    expect(host.textContent).toBe('')
    expect(host.firstChild).toBeNull()
  })
})
