// Theme contrast guard — pins the WCAG floors for every colour role the app
// uses as TEXT or as a FILL, in all four theme blocks of index.css:
//   • dark (@theme) / light (.light)            → 4.5:1 on --color-card2 (AA)
//   • high contrast (.contrast-high / .light.contrast-high) → 7:1 (AAA)
//   • --color-on-bright label on each colour fill → 4.5:1
// --color-card2 is the worst (lowest-contrast) surface text sits on in each
// theme. The 2026-09-24 palette replacement (violet → teal) re-tuned every
// value; this stops a future tweak from silently dropping any role below AA.
//
// It also pins two palette decisions that eslint can't see:
//   • no violet: no token hue in the Tailwind-indigo/violet band (OKLCH 265–325°)
//   • the accent never shares a colour with feedback: accent vs red/green/orange
//     stays distinct under normal vision AND simulated deuteranopia/protanopia
//     (Machado 2009). The old rose accent measured 0.03 vs red — "Start" looked
//     like "wrong".

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(resolve(here, '../../index.css'), 'utf8')

// Body of the first rule whose selector is exactly `sel` (blocks don't nest).
const block = (sel) => {
  const i = css.indexOf(`\n${sel} {`)
  if (i === -1) throw new Error(`${sel} block not found`)
  return css.slice(i, css.indexOf('\n}', i))
}
// A token this block declares in any other format fails loudly — it must not
// silently fall through to the next block and get tested with the wrong value.
const blockVar = (body, name) => {
  const decl = body.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim()
  if (decl === undefined) return undefined
  if (!/^#[0-9a-fA-F]{6}$/.test(decl)) throw new Error(`${name}: "${decl}" — palette tokens must be 6-digit hex`)
  return decl
}

// Each theme resolves a token in real cascade order. `.light` and
// `.contrast-high` sit on the same element with equal specificity, so for
// light + high contrast the later `.contrast-high` rule beats `.light` for any
// token `.light.contrast-high` doesn't redefine.
// tintMin: a role's text on its OWN 12% tint (chips/badges — designTells.test.js
// caps text-bearing tints at 12%). AA everywhere; the high-contrast themes hold
// ≥6:1 there (not 7): pushing red/accent further broke the colour-blind
// separation pinned below, so surfaces keep 7:1 and tints keep 6:1.
const THEMES = {
  dark: { chain: ['@theme'], min: 4.5, tintMin: 4.5 },
  light: { chain: ['.light', '@theme'], min: 4.5, tintMin: 4.5 },
  'high-contrast dark': { chain: ['.contrast-high', '@theme'], min: 7, tintMin: 6 },
  'high-contrast light': { chain: ['.light.contrast-high', '.contrast-high', '.light', '@theme'], min: 7, tintMin: 6 },
}
const TINT = 0.12
const resolveVar = (chain, name) => {
  for (const sel of chain) {
    const v = blockVar(block(sel), name)
    if (v) return v
  }
  throw new Error(`${name} not found in ${chain.join(' → ')}`)
}

const TEXT_ROLES = ['--color-text', '--color-dim']
const FILL_ROLES = ['--color-accent', '--color-accent2', '--color-green', '--color-orange',
  '--color-red', '--color-blue', '--color-cyan', '--color-gold']

// ── colour maths ────────────────────────────────────────────────────────────
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const luminance = (hex) => {
  const [r, g, b] = rgb(hex).map(lin)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
// color-mix(in srgb, fg p, bg) — interpolates the gamma-encoded channels, as CSS does.
const mixOver = (fg, bg, p) => '#' + rgb(fg).map((c, i) =>
  Math.round((c * p + rgb(bg)[i] * (1 - p)) * 255).toString(16).padStart(2, '0')).join('')
// linear sRGB → OKLab
const oklab = ([r, g, b]) => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}
const hueChroma = (hex) => {
  const [, a, b] = oklab(rgb(hex).map(lin))
  return { C: Math.hypot(a, b), H: (Math.atan2(b, a) * 180 / Math.PI + 360) % 360 }
}
// Machado, Oliveira & Fernandes (2009), severity 1.0, applied in linear RGB.
const CVD = {
  normal: null,
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
}
const seen = (hex, m) => {
  const c = rgb(hex).map(lin)
  if (!m) return c
  return m.map((row) => Math.min(1, Math.max(0, row[0] * c[0] + row[1] * c[1] + row[2] * c[2])))
}
// Smallest OKLab distance between two colours across the three visions.
const minSeparation = (a, b) => Math.min(...Object.values(CVD).map((m) => {
  const x = oklab(seen(a, m)); const y = oklab(seen(b, m))
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}))

describe.each(Object.entries(THEMES))('%s theme', (_, { chain, min, tintMin }) => {
  const card2 = resolveVar(chain, '--color-card2')
  const label = resolveVar(chain, '--color-on-bright')

  it.each(TEXT_ROLES)(`%s meets ${min}:1 on --color-card2`, (name) => {
    expect(ratio(resolveVar(chain, name), card2)).toBeGreaterThanOrEqual(min)
  })

  it.each(FILL_ROLES)(`%s meets ${min}:1 as text and 4.5:1 under an on-bright label`, (name) => {
    const c = resolveVar(chain, name)
    expect(ratio(c, card2)).toBeGreaterThanOrEqual(min)
    expect(ratio(c, label)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(FILL_ROLES)(`%s meets ${tintMin}:1 as text on its own ${TINT * 100}% tint`, (name) => {
    const c = resolveVar(chain, name)
    expect(ratio(c, mixOver(c, card2, TINT))).toBeGreaterThanOrEqual(tintMin)
  })

  it('has no violet/indigo token, surfaces included (OKLCH hue 265–325°)', () => {
    const SURFACES = ['--color-bg', '--color-surface', '--color-card', '--color-card2', '--color-border']
    const violet = [...SURFACES, ...TEXT_ROLES, ...FILL_ROLES].map((n) => [n, resolveVar(chain, n)])
      .filter(([, hex]) => { const { C, H } = hueChroma(hex); return C > 0.03 && H > 265 && H < 325 })
    expect(violet).toEqual([])
  })

  it.each(['--color-red', '--color-green', '--color-orange'])(
    'accent stays distinct from %s, including under colour-blind simulation', (name) => {
      expect(minSeparation(resolveVar(chain, '--color-accent'), resolveVar(chain, name))).toBeGreaterThanOrEqual(0.07)
    })
})
