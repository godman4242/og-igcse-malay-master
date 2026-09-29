// @vitest-environment jsdom
//
// A brand-new learner who lands on a page (say /pdf-reader from a search) sees
// the first-run "New here? Take the tour" card after 2 s. If they tap
// "▶ Tour this page" instead, the card must go — it used to float, undimmed,
// over the running page tour as a second, competing "Take the tour" button
// (seen at 390 px, 2026-09-29). Starting ANY tour counts as answering the offer.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const startTour = vi.fn(() => ({}))
vi.mock('../../lib/guide/guideController', () => ({ startTour }))
vi.mock('../../lib/guide/pageGuides', () => ({
  buildPageSteps: () => [{ id: 's', route: '/pdf-reader', title: 'Reading lab', body: 'b' }],
}))

let React, act, createRoot, MemoryRouter, GuideOffer, useGuide, useStore
let root, host
const guide = {}

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
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
  vi.useFakeTimers()
  ;({ default: React, act } = await import('react'))
  ;({ createRoot } = await import('react-dom/client'))
  ;({ MemoryRouter } = await import('react-router-dom'))
  ;({ default: useStore } = await import('../../store/useStore'))
  ;({ default: GuideOffer } = await import('../GuideOffer'))
  ;({ useGuide } = await import('../../hooks/useGuide'))
  useStore.setState({ guide: { seenQuick: false, seenFull: false } })

  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.useRealTimers()
})

function Probe() {
  const { startPage } = useGuide()
  React.useEffect(() => { guide.startPage = startPage })
  return null
}

const offer = () => host.querySelector('[data-tour="guide-offer"]')

describe('first-run offer vs the ▶ page tour', () => {
  it('a page tour started while the offer is up removes the offer', async () => {
    await act(async () => root.render(
      React.createElement(MemoryRouter, { initialEntries: ['/pdf-reader'] },
        React.createElement(GuideOffer), React.createElement(Probe)),
    ))
    await act(async () => { vi.advanceTimersByTime(2000) })
    expect(offer()).toBeTruthy()

    await act(async () => { await guide.startPage('/pdf-reader') })
    expect(startTour).toHaveBeenCalled()
    expect(offer()).toBeNull()
    expect(useStore.getState().guide.seenQuick).toBe(true)
  })

  it('a page tour started before the 2 s reveal means the offer never appears', async () => {
    await act(async () => root.render(
      React.createElement(MemoryRouter, { initialEntries: ['/pdf-reader'] },
        React.createElement(GuideOffer), React.createElement(Probe)),
    ))
    await act(async () => { await guide.startPage('/pdf-reader') })
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(offer()).toBeNull()
  })
})
