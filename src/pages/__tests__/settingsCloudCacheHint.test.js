// @vitest-environment jsdom
//
// axe sweep 2026-09-29 (GOAL #50): the disabled cloud-cache row sat at
// opacity 0.6, which also faded its hint — the sentence that says HOW to
// enable it — to 2.55:1 (light) / 3.37:1 (dark). The inactive toggle may dim;
// the hint must stay ≥4.5:1 on the card in both themes.
import { it, expect, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

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
const { default: Settings } = await import('../Settings.jsx')

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../index.css'), 'utf8')
const tok = (sel, name) => {
  const i = css.indexOf(`\n${sel} {`)
  return css.slice(i, css.indexOf('\n}', i)).match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6});`))[1]
}
const rgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
const lum = (c) => {
  const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

let root, host
afterEach(async () => { await act(async () => root.unmount()); host.remove() })

it('the disabled cloud-cache hint is ≥4.5:1 on the card in dark and light', async () => {
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(Settings))))
  const toggle = host.querySelector('#set-cache-to-cloud')
  expect(toggle.disabled).toBe(true)
  const hint = host.querySelector('label[for="set-cache-to-cloud"]').nextElementSibling
  expect(hint.style.color).toBe('var(--color-dim)')
  // Effective opacity = product of every inline / Tailwind `opacity-N` from the hint up.
  let op = 1
  for (let el = hint; el; el = el.parentElement) {
    if (el.style?.opacity) op *= Number(el.style.opacity)
    const tw = String(el.getAttribute?.('class') ?? '').match(/\bopacity-(\d+)\b/)
    if (tw) op *= Number(tw[1]) / 100
  }
  for (const sel of ['@theme', '.light']) {
    const dim = rgb(tok(sel, '--color-dim')), card = rgb(tok(sel, '--color-card'))
    const seen = dim.map((v, i) => Math.round(v * op + card[i] * (1 - op)))
    expect(ratio(seen, card), sel).toBeGreaterThanOrEqual(4.5)
  }
})
