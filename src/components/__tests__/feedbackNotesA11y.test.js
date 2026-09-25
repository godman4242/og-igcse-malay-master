// @vitest-environment jsdom
//
// A tutor's note on a highlighted writing span, and the gloss on a missed
// roleplay word, used to live only in `title` + `aria-label` on a focusable
// <mark>/<span>. A title tooltip never shows on keyboard focus, and aria-label
// on a <span> (ARIA "generic") is prohibited, so the tab stop gave nobody the
// note — and on the <mark> the label REPLACED the student's own words for a
// screen reader. The note is now real (visually hidden) text after the words,
// with no fake tab stop.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import AnnotatedWritingFeedback from '../AnnotatedWritingFeedback'
import RoleplayTurnFeedback from '../RoleplayTurnFeedback'

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

const render = (el) => act(async () => root.render(el))

describe('writing-feedback highlight notes', () => {
  const data = {
    band: 4,
    studentText: {
      spans: [
        { text: 'Saya ' },
        { text: 'pergi sekolah', groupId: 1, category: 'imbuhan', note: 'use bersekolah' },
      ],
      groups: [{ id: 1, category: 'imbuhan' }],
    },
  }

  it('keeps the student text and adds the note as text, with no fake tab stop', async () => {
    await render(React.createElement(AnnotatedWritingFeedback, { data, lang: 'en' }))
    const mark = host.querySelector('mark')
    expect(mark.hasAttribute('tabindex')).toBe(false)
    expect(mark.hasAttribute('aria-label')).toBe(false)
    expect(mark.textContent).toContain('pergi sekolah')
    expect(mark.textContent).toContain('use bersekolah')
  })
})

describe('roleplay missed-word chips', () => {
  it('carries the gloss as text, with no fake tab stop', async () => {
    await render(React.createElement(RoleplayTurnFeedback, {
      feedback: { vocabMissed: ['makan'], vocabUsed: [] },
      lang: 'ms',
    }))
    const chip = [...host.querySelectorAll('span')].find(s => s.textContent.includes('makan'))
    expect(chip).toBeTruthy()
    expect(host.querySelector('[tabindex]')).toBeNull()
    expect(chip.hasAttribute('aria-label')).toBe(false)
    expect(chip.textContent).toContain('eat')
  })
})
