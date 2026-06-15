// @vitest-environment jsdom
//
// axis-3 / WCAG 2.4.3 Focus Order (Level A): the two SmartSession interleaved
// micro-prompts swap their view in place when a step finishes, unmounting the
// actioned button and dropping keyboard focus to <body>. A keyboard/switch/SR
// learner loses their place and must hunt for the self-grade buttons.
//
// Fix: a useEffect moves focus to the new view's question prompt (and, for the
// speaking prompt, to the now-labeled round Stop button when recording starts).
// These tests drive the real components across the transition and assert
// document.activeElement lands on the new focus target (RED before: <body>).

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

let React, act, createRoot
let WritingMicroPrompt, SpeakingMicroTurn
let root, host
let savedMediaDevices, savedMediaRecorder

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  ;({ default: React, act } = await import('react'))
  ;({ createRoot } = await import('react-dom/client'))
  ;({ default: WritingMicroPrompt } = await import('../interleaved/WritingMicroPrompt'))
  ;({ default: SpeakingMicroTurn } = await import('../interleaved/SpeakingMicroTurn'))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  if (savedMediaDevices !== undefined) {
    Object.defineProperty(navigator, 'mediaDevices', { value: savedMediaDevices, configurable: true })
    savedMediaDevices = undefined
  }
  if (savedMediaRecorder !== undefined) {
    globalThis.MediaRecorder = savedMediaRecorder
    savedMediaRecorder = undefined
  }
})

const render = async (el) => act(async () => root.render(el))
const buttons = () => [...host.querySelectorAll('button')]
const byText = (txt) => buttons().find(b => b.textContent.trim().includes(txt))
const pWith = (txt) => [...host.querySelectorAll('p')].find(p => p.textContent.includes(txt))
const typeInto = async (el, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
  await act(async () => {
    setter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const click = async (el) => act(async () => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))

const TASK = { card: { m: 'rajin', e: 'diligent' }, prompt: 'Write a sentence using rajin.' }

describe('WritingMicroPrompt — focus management on submit (WCAG 2.4.3)', () => {
  it('moves focus to the self-grade question when the panel appears', async () => {
    await render(React.createElement(WritingMicroPrompt, { task: TASK, onComplete: () => {} }))
    await typeInto(host.querySelector('textarea'), 'Dia sangat rajin belajar.')
    const submit = byText('Submit')
    submit.focus() // simulate keyboard activation: focus is on the button about to unmount
    await click(submit)
    const question = pWith('Did your sentence use')
    expect(question).toBeTruthy()
    expect(document.activeElement).toBe(question)
  })
})

// Minimal MediaRecorder + getUserMedia mock so the speaking flow is drivable in jsdom.
function installMediaMocks() {
  savedMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')?.value
  const fakeStream = { getTracks: () => [{ stop() {} }] }
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: async () => fakeStream },
    configurable: true,
  })
  savedMediaRecorder = globalThis.MediaRecorder
  globalThis.MediaRecorder = class {
    constructor(stream) { this.stream = stream; this.state = 'inactive'; this.onstop = null }
    start() { this.state = 'recording' }
    stop() { this.state = 'inactive'; this.onstop && this.onstop() }
  }
}

describe('SpeakingMicroTurn — focus management on record/stop (WCAG 2.4.3 / 4.1.2)', () => {
  it('labels + focuses the Stop button when recording starts, then focuses the self-grade question on stop', async () => {
    installMediaMocks()
    await render(React.createElement(SpeakingMicroTurn, { task: TASK, onComplete: () => {} }))

    const start = byText('Start Speaking')
    await click(start)

    // recording phase: exactly one button (the round Stop control), now labeled + focused
    const stop = buttons()[0]
    expect(stop).toBeTruthy()
    expect(stop.getAttribute('aria-label')).toBe('Stop recording')
    expect(document.activeElement).toBe(stop)

    await click(stop)

    const question = pWith('Did you use')
    expect(question).toBeTruthy()
    expect(document.activeElement).toBe(question)
  })
})
