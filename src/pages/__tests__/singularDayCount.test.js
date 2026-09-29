// @vitest-environment jsdom
//
// 2026-09-28 bug hunt, GOAL #36: a learner's first study day read "1 days" on the
// Dashboard streak tile and Settings, an exam tomorrow "1 days until exam" and
// "Final stretch — 1 days to exam", and a one-card restore "Restored 1 cards!".
import { it, expect, afterEach, vi } from 'vitest'

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
globalThis.IS_REACT_ACT_ENVIRONMENT = true
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })

const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { MemoryRouter } = await import('react-router-dom')
const { default: useStore } = await import('../../store/useStore')
const { default: Settings } = await import('../Settings.jsx')
const { default: Dashboard } = await import('../Dashboard.jsx')
const { buildSessionFeedback } = await import('../../lib/feedback.js')

let root, host
afterEach(async () => { await act(async () => root?.unmount()); host?.remove(); root = host = null; vi.restoreAllMocks() })

const inDays = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const mount = async (Page, state) => {
  useStore.setState({ cards: [], ...state })
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(Page))))
}
const streakOf = (count) => ({ streak: { count, last: new Date().toDateString() } })
const text = () => host.textContent

it.each([[1, '1 day'], [2, '2 days']])('Settings: streak %i → "🔥 %s"', async (n, s) => {
  await mount(Settings, streakOf(n))
  const row = [...host.querySelectorAll('*')].find(el => el.children.length === 0 && el.textContent.startsWith('🔥'))
  expect(row.textContent).toBe(`🔥 ${s}`)
})

it.each([[1, '1 day'], [2, '2 days']])('Settings: exam in %i → "%s until exam"', async (n, s) => {
  await mount(Settings, { examDate: inDays(n) })
  expect(text()).toContain(`${s} until exam`)
  expect(text()).not.toMatch(/\b1 days/)
})

it.each([[1, 'card'], [2, 'cards']])('Settings: restoring %i → "Restored N %s!"', async (n, noun) => {
  vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function () {
    const backup = { exportDate: 'x', cards: Array.from({ length: n }, (_, i) => ({ id: `r${i}`, m: `kata${i}`, e: 'x', lang: 'ms' })) }
    Object.defineProperty(this, 'files', { value: [new File([JSON.stringify(backup)], 'b.json', { type: 'application/json' })] })
    this.onchange({ target: this })
  })
  await mount(Settings, {})
  const b = [...host.querySelectorAll('button')].find(x => x.textContent.includes('Restore from Backup'))
  await act(async () => { b.click() })
  await act(async () => { await new Promise(r => setTimeout(r, 20)) })
  expect(host.querySelector('.fixed.top-4').textContent).toBe(`Restored ${n} ${noun}!`)
})

it.each([[0, '0 days'], [1, '1 day'], [2, '2 days']])('Dashboard: streak %i → tile "%s"', async (n, s) => {
  await mount(Dashboard, streakOf(n))
  const tile = host.querySelector('[data-guide="dashboard-stats"]')
  expect(tile.textContent).toContain(s)
  if (n === 1) expect(tile.textContent).not.toContain('1 days')
})

it.each([[1, '1 day'], [2, '2 days']])('coach line: exam in %i → "Final stretch — %s to exam"', (n, s) => {
  root = host = null
  const goal = buildSessionFeedback('study-session', { accuracy: 50, reviewed: 1 }, { examDate: inDays(n) }).goal
  expect(goal).toBe(`Final stretch — ${s} to exam. Hold steady on what you know; secure weak points.`)
})
