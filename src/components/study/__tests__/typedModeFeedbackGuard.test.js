// @vitest-environment jsdom
//
// 2026-09-28 bug hunt (R2 F1 + F11). Once a typed answer has been judged, the
// card's FSRS rating is final. Before the fix:
//  - Listen: a wrong answer was never rated at all (no Again → no relearning),
//    retyping the answer it then SHOWED was rated Good, and Reveal skipped the
//    rating and started an untracked timer (twice → a card skipped).
//  - Type / Cloze: retyping after a miss flipped the screen to "✅ Correct!"
//    while FSRS kept the Again. Cloze also rated an EMPTY Enter as Again.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Rating } from '../../../lib/fsrs'
import ListenMode from '../ListenMode'
import TypeMode from '../TypeMode'
import ClozeMode from '../ClozeMode'

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
const input = () => host.querySelector('input')
const typeInto = async (value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  await act(async () => {
    setter.call(input(), value)
    input().dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const enter = async () => act(async () => {
  input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
})
const click = async (text) => act(async () => {
  const b = [...host.querySelectorAll('button')].find(x => x.textContent.includes(text))
  b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
})
const makeSession = (log) => ({
  confidence: 2, setConfidence: () => {}, rate: (r) => log.push(r), nextCard: () => log.push('next'),
  pendingWrongWord: null, hypercorrect: false, reasonTagged: null, tagReason: () => {},
})
const card = { m: 'kucing', e: 'cat', t: 'T', lang: 'ms', ex: 'Saya ada seekor kucing.' }

describe('ListenMode', () => {
  it('a wrong answer is rated Again, and retyping the shown answer changes nothing', async () => {
    const log = []
    await render(React.createElement(ListenMode, { card, session: makeSession(log) }))
    await typeInto('kucingg'); await enter()
    await typeInto('kucing'); await enter()
    expect(log).toEqual([Rating.Again])
  })

  it('Reveal is an Again, rated once however often it is tapped, with no private timer', async () => {
    const log = []
    await render(React.createElement(ListenMode, { card, session: makeSession(log) }))
    await click('Reveal'); await click('Reveal')
    await new Promise(r => setTimeout(r, 2100))
    expect(log).toEqual([Rating.Again])
  })
})

describe('TypeMode', () => {
  it('after a miss, retyping the answer neither re-rates nor shows "Correct"', async () => {
    const log = []
    await render(React.createElement(TypeMode, { card, session: makeSession(log) }))
    await typeInto('dog'); await enter()
    await typeInto('cat'); await enter()
    expect(log).toEqual([Rating.Again])
    expect(host.textContent).not.toContain('Correct!')
  })
})

describe('ClozeMode', () => {
  it('an empty Enter is ignored; after a miss, retyping does not flip to "Correct"', async () => {
    const log = []
    await render(React.createElement(ClozeMode, { card, session: makeSession(log) }))
    await enter()
    expect(log).toEqual([])
    await typeInto('anjing'); await enter()
    await typeInto('kucing'); await enter()
    expect(log).toEqual([Rating.Again])
    expect(host.textContent).not.toContain('Correct!')
  })
})
