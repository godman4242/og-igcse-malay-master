// Source-scan guard for the 2026-09-24 design pass (PRODUCT.md → Anti-references).
// themeContrast.test.js pins the TOKEN values; this pins how components USE
// colour, so the "AI template" look can't creep back in one inline style at a time:
//   1. No gradient text (a gradient clipped to the letters) — the old pink→violet logo.
//   2. No hardcoded colour literals: tints go through a token —
//      color-mix(in srgb, var(--color-X) N%, transparent) — so they follow the
//      palette AND the light / high-contrast themes (345 neon rgba() + a
//      band-5 '#69f0ae' at 1.2:1 in light mode didn't). Neutral greys (r = g = b:
//      black scrims, white hairlines) are allowed.
//   3. No white labels in components. Text on a --color-* fill uses
//      var(--color-on-bright) (black on dark-theme fills, white on light-theme
//      fills — P2-U1); plain white is ~1.6:1 on the dark theme's accent.
// Every exception names its reason and is stale-checked: an allowlisted file
// that no longer needs its exemption fails the suite.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, relative, join } from 'node:path'

const src = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) { if (name !== '__tests__') walk(p) }
    else if (/\.jsx?$/.test(name)) files.push(p)
  }
}
walk(src)

const isGrey = (r, g, b) => r === g && g === b
const hexRgb = (h) => {
  const x = h.length <= 5 ? [...h.slice(1, 4)].map((c) => c + c) : [h.slice(1, 3), h.slice(3, 5), h.slice(5, 7)]
  return x.map((c) => parseInt(c, 16))
}

const RULES = {
  'gradient text': {
    re: /bg-clip-text|background-clip:\s*text|WebkitBackgroundClip/g,
    allow: {},
  },
  'colour literal (non-grey hex / rgb / hsl)': {
    re: /(['"`])#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})\1|\brgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+|\bhsla?\(/gi,
    keep: (m) => {
      if (/^hsl/i.test(m)) return true
      const [r, g, b] = m.startsWith('rgb') ? m.match(/\d+/g).map(Number) : hexRgb(m.slice(1, -1))
      return !isGrey(r, g, b)
    },
    allow: {
      'lib/confetti.js': 'canvas drawing — cannot read CSS custom properties',
      'components/AuthModal.jsx': "Google's sign-in 'G' logo — the brand colours are mandated",
    },
  },
  'white label': {
    re: /\btext-white\b|(['"`])(#fff|#ffffff|white)\1/gi,
    jsxOnly: true,
    allow: {
      'pages/pdfreader/LayoutView.jsx': 'renders the PDF page itself: white paper + a label on a black scrim, not a themed fill',
    },
  },
}

const scan = ({ re, keep = () => true, jsxOnly }, { honourAllow = true, allow = {} } = {}) => {
  const hits = []
  for (const f of files) {
    const rel = relative(src, f)
    if ((honourAllow && allow[rel]) || (jsxOnly && !f.endsWith('.jsx'))) continue
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      for (const m of line.matchAll(re)) if (keep(m[0])) hits.push(`${rel}:${i + 1}  ${m[0]}`)
    })
  }
  return hits
}

describe('design tells stay out of src/', () => {
  it('scans the whole source tree, data/ included', () => {
    expect(files.length).toBeGreaterThan(200)
    expect(files.some((f) => f.includes(`${join('src', 'data')}`))).toBe(true)
  })

  describe.each(Object.entries(RULES))('%s', (_, rule) => {
    it('has no occurrences outside the allowlist', () => {
      expect(scan(rule, { allow: rule.allow })).toEqual([])
    })

    it.each(Object.keys(rule.allow).length ? Object.entries(rule.allow) : [['(none)', '']])(
      'allowlist entry %s is still needed', (file) => {
        if (file === '(none)') return
        const stillHits = scan(rule, { honourAllow: false }).filter((h) => h.startsWith(`${file}:`))
        expect(stillHits.length, `${file} no longer needs its exemption — remove it`).toBeGreaterThan(0)
      })
  })

  // 4. Text on its own tint: a chip/badge whose `background` is a tint of
  //    --color-X and whose `color` is --color-X needs the tint ≤ 12% —
  //    themeContrast.test.js proves every role clears AA at exactly that tint.
  it('no style object puts --color-X text on a --color-X tint above 12%', () => {
    const hits = []
    for (const f of files) {
      const s = readFileSync(f, 'utf8')
      for (let i = s.indexOf('style={{'); i !== -1; i = s.indexOf('style={{', i + 1)) {
        let depth = 0, j = i + 7
        for (; j < s.length; j++) { if (s[j] === '{') depth++; else if (s[j] === '}' && --depth === 0) break }
        const body = s.slice(i + 8, j)
        // top-level `key: value` entries (commas inside (), {}, [] or strings don't split)
        const entries = {}; let d = 0, q = null, start = 0
        for (let k = 0; k <= body.length; k++) {
          const c = body[k]
          if (q) { if (c === '\\') k++; else if (c === q) q = null; continue }
          if (c === "'" || c === '"' || c === '`') q = c
          else if (c && '({['.includes(c)) d++
          else if (c && ')}]'.includes(c)) d--
          else if (k === body.length || (c === ',' && d === 0)) {
            const m = body.slice(start, k).match(/^\s*(background|color)\s*:([\s\S]*)$/)
            if (m) entries[m[1]] = m[2]
            start = k + 1
          }
        }
        if (!entries.background || !entries.color) continue
        const text = new Set([...entries.color.matchAll(/var\(--color-([a-z0-9]+)\)/g)].map((m) => m[1]))
        for (const m of entries.background.matchAll(/color-mix\(in srgb, var\(--color-([a-z0-9]+)\) ([0-9.]+)%/g)) {
          if (text.has(m[1]) && parseFloat(m[2]) > 12) hits.push(`${relative(src, f)}:${s.slice(0, i).split('\n').length}  ${m[1]} ${m[2]}%`)
        }
      }
    }
    expect(hits).toEqual([])
  })

  it('catches the spellings a naive scan misses (self-test)', () => {
    const probe = (rule, text) => [...text.matchAll(RULES[rule].re)].filter((m) => (RULES[rule].keep ?? (() => true))(m[0])).length
    expect(probe('white label', `color="#fff"`)).toBe(1)
    expect(probe('white label', `color: "#FFF"`)).toBe(1)
    expect(probe('white label', `? 'white'`)).toBe(1)
    expect(probe('colour literal (non-grey hex / rgb / hsl)', `'#69f0ae'`)).toBe(1)
    expect(probe('colour literal (non-grey hex / rgb / hsl)', `rgb(255, 77, 109)`)).toBe(1)
    expect(probe('colour literal (non-grey hex / rgb / hsl)', `'#000'`)).toBe(0)
    expect(probe('colour literal (non-grey hex / rgb / hsl)', `rgba(255,255,255,0.05)`)).toBe(0)
  })
})
