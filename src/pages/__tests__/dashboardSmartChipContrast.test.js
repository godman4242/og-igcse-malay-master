// GOAL #51 — the Dashboard Smart Session "Start →" chip read 4.07:1 in light
// (axe color-contrast, 12 px bold, needs 4.5:1). The chip's 12% blue tint was
// stacked on the button's own 18% blue tint, so its text sat on ~28% blue —
// a pairing themeContrast.test.js (one tint over --color-card2) never proves.
// This composes the chip's real layers from Dashboard.jsx over --color-bg, per
// theme, using the same sRGB colour-mix maths as the browser.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(resolve(here, '../../index.css'), 'utf8')
const jsx = readFileSync(resolve(here, '../Dashboard.jsx'), 'utf8')

const block = (sel) => {
  const i = css.indexOf(`\n${sel} {`)
  if (i === -1) throw new Error(`${sel} block not found`)
  return css.slice(i, css.indexOf('\n}', i))
}
const THEMES = {
  dark: { chain: ['@theme'], min: 4.5 },
  light: { chain: ['.light', '@theme'], min: 4.5 },
  'high-contrast dark': { chain: ['.contrast-high', '@theme'], min: 6 },
  'high-contrast light': { chain: ['.light.contrast-high', '.contrast-high', '.light', '@theme'], min: 6 },
}
const token = (chain, name) => {
  for (const sel of chain) {
    const v = block(sel).match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6});`))?.[1]
    if (v) return v
  }
  throw new Error(`${name} not found in ${chain.join(' → ')}`)
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const lum = (c) => { const [r, g, b] = c.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }

// Paints one inline-style background over `under`: a bare var(--color-X), or
// color-mix(in srgb, var(--color-X) N%, transparent | var(--color-Y)).
const paint = (value, chain, under) => {
  const v = value.trim()
  const bare = v.match(/^var\((--color-[a-z0-9]+)\)$/)
  if (bare) return rgb(token(chain, bare[1]))
  const m = v.match(/^color-mix\(in srgb, var\((--color-[a-z0-9]+)\) ([0-9.]+)%, (transparent|var\((--color-[a-z0-9]+)\))\)$/)
  if (!m) throw new Error(`unparsed background: ${v}`)
  const fg = rgb(token(chain, m[1])); const p = parseFloat(m[2]) / 100
  const bg = m[4] ? rgb(token(chain, m[4])) : under
  return fg.map((c, i) => c * p + bg[i] * (1 - p))
}

// The CTA button and the chip inside it, straight from the source.
const cta = jsx.slice(jsx.indexOf('id="dashboard-smart-session-cta"'), jsx.indexOf('Start →'))
const bgOf = (s) => s.match(/background: '([^']+)'/)[1]
const buttonBg = bgOf(cta)
const chip = cta.slice(cta.lastIndexOf('<span'))
const chipBg = bgOf(chip)
const chipText = chip.match(/color: 'var\((--color-[a-z0-9]+)\)'/)[1]

describe('Dashboard Smart Session "Start →" chip contrast', () => {
  it('found the button and chip styles', () => {
    expect(buttonBg).toMatch(/--color-blue/)
    expect(chipText).toBe('--color-blue')
  })

  it.each(Object.entries(THEMES))('%s theme: chip text clears its floor', (_, { chain, min }) => {
    const page = rgb(token(chain, '--color-bg'))
    const behindChip = paint(chipBg, chain, paint(buttonBg, chain, page))
    expect(ratio(rgb(token(chain, chipText)), behindChip)).toBeGreaterThanOrEqual(min)
  })
})
