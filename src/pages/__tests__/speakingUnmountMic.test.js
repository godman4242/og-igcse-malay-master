// @vitest-environment jsdom
//
// 2026-09-28 bug hunt R4 #1: Speaking's continuous recogniser restarts itself in
// `onend`. Its unmount cleanup never stopped it, so leaving the page mid-answer
// left the mic hot and restarting on every other page until the tab closed.
import { it, expect } from 'vitest'

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

const log = []
class FakeSR {
  constructor() { FakeSR.all.push(this); this.id = FakeSR.all.length }
  start() { log.push('start#' + this.id) }
  stop() { log.push('stop#' + this.id) }
  abort() { log.push('abort#' + this.id) }
}
FakeSR.all = []
window.webkitSpeechRecognition = FakeSR
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { TheaterModeContext } = await import('../../contexts/TheaterModeContext.js')
const { default: Speaking } = await import('../Speaking.jsx')
const { default: TOPICS } = await import('../../data/speakingTopics.js')

it('leaving the page mid-answer stops the recogniser; it never restarts', async () => {
  const host = document.createElement('div'); document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => {
    root.render(React.createElement(TheaterModeContext.Provider, { value: { theaterMode: false, setTheaterMode: () => {} } },
      React.createElement(MemoryRouter, { initialEntries: [{ pathname: '/speaking', state: { topicId: TOPICS[0].id } }] },
        React.createElement(Speaking))))
  })
  const buttons = () => [...host.querySelectorAll('button')]
  const topicBtn = buttons().find(b => b.textContent.includes(TOPICS[0].title))
  await act(async () => { topicBtn.click() })
  const speakBtn = buttons().find(b => /Bercakap jawapan|Speak my answer/.test(b.textContent))
  if (!speakBtn) console.log('BUTTONS', buttons().map(b => b.textContent.slice(0, 40)).join(' | '))
  expect(speakBtn).toBeTruthy()
  await act(async () => { speakBtn.click() })
  const rec = FakeSR.all[0]
  await act(async () => { rec.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'saya suka' }], { isFinal: true })] }) })

  await act(async () => { root.unmount() })
  for (let i = 0; i < 5; i++) rec.onend() // Chrome ends continuous sessions after silence
  host.remove()

  expect(log.filter(x => x === 'start#1')).toHaveLength(1)
  expect(log.some(x => x === 'stop#1' || x === 'abort#1')).toBe(true)
})
