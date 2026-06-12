// Theme contrast guard — pins the WCAG AA (4.5:1) floor for --color-dim, the
// app's secondary-text color, against the worst background it sits on
// (--color-card2) in BOTH themes. The light palette was tuned in P2-U1; this
// closes the dark-mode half deferred from that batch — and stops a future
// palette tweak from silently dropping either theme below AA again.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(resolve(here, '../../index.css'), 'utf8')

// First occurrence = the dark @theme block; the .light block overrides later.
const blockVar = (block, name) => {
  const m = block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!m) throw new Error(`${name} not found`)
  return m[1]
}
const lightStart = css.indexOf('.light')
const darkCss = css.slice(0, lightStart)
const lightCss = css.slice(lightStart)

const luminance = (hex) => {
  const f = (s) => {
    const v = parseInt(s, 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const c = hex.replace('#', '')
  return 0.2126 * f(c.slice(0, 2)) + 0.7152 * f(c.slice(2, 4)) + 0.0722 * f(c.slice(4, 6))
}
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('--color-dim WCAG AA contrast (4.5:1) on --color-card2', () => {
  it('dark theme passes', () => {
    const r = ratio(blockVar(darkCss, '--color-dim'), blockVar(darkCss, '--color-card2'))
    expect(r).toBeGreaterThanOrEqual(4.5)
  })

  it('light theme passes (pins the P2-U1 tuning)', () => {
    const r = ratio(blockVar(lightCss, '--color-dim'), blockVar(lightCss, '--color-card2'))
    expect(r).toBeGreaterThanOrEqual(4.5)
  })
})
