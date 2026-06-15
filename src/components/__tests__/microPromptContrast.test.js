// @vitest-environment jsdom
//
// P2-U1 convention + axis-3 contrast: WritingMicroPrompt's disabled "Submit"
// button used the Tailwind `text-black` class — the LAST text-black-on-fill in
// the codebase. In the DEFAULT dark theme that renders #000 on --color-card2
// (#1e1e40) at opacity 0.5 ≈ 1.4:1 contrast → an illegible disabled label. The
// disabled state now uses the theme-aware --color-dim token (5.13:1 dark /
// 4.83:1 light vs card2, per the index.css ratio comments), matching the
// adjacent Skip button; the enabled state keeps green + --color-on-bright.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

let React, act, createRoot, WritingMicroPrompt
let root, host

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  ;({ default: React, act } = await import('react'))
  ;({ createRoot } = await import('react-dom/client'))
  ;({ default: WritingMicroPrompt } = await import('../interleaved/WritingMicroPrompt'))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

const render = async (el) => act(async () => root.render(el))
const submitBtn = () => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Submit')
const typeInto = async (el, value) => {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set
  await act(async () => {
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

const TASK = { card: { m: 'rajin', e: 'diligent' }, prompt: 'Write a sentence using rajin.' }

describe('WritingMicroPrompt — Submit button contrast (P2-U1, axis-3)', () => {
  it('disabled Submit avoids text-black and uses a theme-aware dim color', async () => {
    await render(React.createElement(WritingMicroPrompt, { task: TASK, onComplete: () => {} }))
    const btn = submitBtn()
    expect(btn).toBeTruthy()
    expect(btn.disabled).toBe(true)
    expect(btn.className).not.toContain('text-black')
    expect(btn.style.color).toBe('var(--color-dim)')
  })

  it('enabled Submit keeps on-bright text on the green fill', async () => {
    await render(React.createElement(WritingMicroPrompt, { task: TASK, onComplete: () => {} }))
    await typeInto(host.querySelector('textarea'), 'Dia sangat rajin belajar.')
    const btn = submitBtn()
    expect(btn.disabled).toBe(false)
    expect(btn.style.color).toBe('var(--color-on-bright)')
    expect(btn.style.background).toBe('var(--color-green)')
  })
})
