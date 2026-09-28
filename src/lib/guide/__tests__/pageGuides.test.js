import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { PAGE_GUIDES, buildPageSteps } from '../pageGuides'
import { PAGE_GUIDE_ROUTES } from '../pageGuideRoutes'
import { APP_ROUTES } from '../tourSteps'
import { PRACTICE_GROUPS } from '../../practiceSurfaces'

const here = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(here, '../../..')

const SELECTOR_RE = /^\[data-(tour|guide)="([a-z0-9-]+)"\]$/
const words = (text) => text.split(/\s+/).filter((t) => /[\p{L}0-9]/u.test(t)).length
const ALL_STEPS = Object.entries(PAGE_GUIDES).flatMap(([route, steps]) => steps.map((s) => ({ route, ...s })))

describe('pageGuides content', () => {
  it('every step has a non-empty title + body and a valid anchor selector (if any)', () => {
    for (const s of ALL_STEPS) {
      expect(s.title?.trim(), `${s.route} title`).toBeTruthy()
      expect(s.body?.trim(), `${s.route} body`).toBeTruthy()
      if (s.selector) expect(s.selector, `${s.route} ${s.title}`).toMatch(SELECTOR_RE)
    }
  })

  it('all route keys are real app routes', () => {
    for (const route of Object.keys(PAGE_GUIDES)) expect(APP_ROUTES).toContain(route)
  })

  it('PAGE_GUIDE_ROUTES stays in sync with PAGE_GUIDES (eager seam cannot drift)', () => {
    expect([...PAGE_GUIDE_ROUTES].sort()).toEqual(Object.keys(PAGE_GUIDES).sort())
  })

  it('every tour opens with an anchor-less intro, so it always has a first step', () => {
    for (const [route, steps] of Object.entries(PAGE_GUIDES)) {
      expect(steps[0].selector, route).toBeUndefined()
    }
  })
})

// Kheshav 2026-09-28 — "the Netflix rule": many tiny highlighted steps, never a
// wall of text. A skimming learner reads one line, sees the lit-up control, and
// clicks it. Supersedes the 2026-06-24 "≤5 steps" micro-guide cap.
describe('pageGuides — short steps (the Netflix rule)', () => {
  it('no step carries an example line', () => {
    for (const s of ALL_STEPS) expect(s.example, `${s.route} ${s.title}`).toBeUndefined()
  })

  it('every body is at most 14 words', () => {
    for (const s of ALL_STEPS) expect(words(s.body), `${s.route} "${s.body}"`).toBeLessThanOrEqual(14)
  })

  it('every title is at most 5 words', () => {
    for (const s of ALL_STEPS) expect(words(s.title), `${s.route} "${s.title}"`).toBeLessThanOrEqual(5)
  })

  it('after the intro, steps light up a real control — at most 1 in 10 is an unanchored card', () => {
    const afterIntro = Object.values(PAGE_GUIDES).flatMap((steps) => steps.slice(1))
    const unanchored = afterIntro.filter((s) => !s.selector).length
    expect(unanchored / afterIntro.length).toBeLessThanOrEqual(0.1)
  })

  it('the reading lab lights up every toolbar button, one step each', () => {
    const anchors = PAGE_GUIDES['/pdf-reader'].map((s) => s.selector).filter(Boolean)
    for (const a of ['pdf-replace', 'pdf-reading', 'pdf-mode', 'pdf-translate', 'pdf-unknowns',
      'pdf-sentences', 'pdf-fulltranslation', 'pdf-view']) {
      expect(anchors, a).toContain(`[data-guide="${a}"]`)
    }
  })
})

// Non-tautological: every anchor a tour points at must exist in the REAL
// component source, so renaming/removing a data-guide in a page fails here
// (a missing anchor would otherwise be skipped silently at runtime).
function sourceAnchors() {
  const names = new Set()
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) { if (e.name !== '__tests__') walk(p) }
      else if (e.name.endsWith('.jsx')) {
        const src = readFileSync(p, 'utf8')
        for (const m of src.matchAll(/data-(?:guide|tour)="([a-z0-9-]+)"/g)) names.add(m[1])
        for (const m of src.matchAll(/'data-guide':\s*'([a-z0-9-]+)'/g)) names.add(m[1])
        for (const m of src.matchAll(/data-(?:guide|tour)=\{([^}]*)\}/g)) {
          for (const q of m[1].matchAll(/'([a-z0-9-]+)'/g)) names.add(q[1])
        }
        for (const m of src.matchAll(/\btour:\s*'([a-z0-9-]+)'/g)) names.add(m[1])  // data-tour={s.tour}
        for (const m of src.matchAll(/\bguide="([a-z0-9-]+)"/g)) names.add(m[1])    // <EmptyState guide=…>
      }
    }
  }
  walk(join(SRC, 'pages'))
  walk(join(SRC, 'components'))
  // Data-driven anchors: practice groups carry their own `guide`; For You shelves
  // are `foryou-${shelf.id}` (the template is pinned below).
  for (const g of PRACTICE_GROUPS) names.add(g.guide)
  const shelves = readFileSync(join(SRC, 'lib/forYouShelves.js'), 'utf8')
  for (const m of shelves.matchAll(/\bid: '([a-z0-9-]+)'/g)) names.add(`foryou-${m[1]}`)
  return names
}

describe('pageGuides — every anchor exists in the page source', () => {
  it('For You shelves carry the foryou-${id} anchor template', () => {
    const src = readFileSync(join(SRC, 'pages/ForYou.jsx'), 'utf8')
    expect(src).toContain('data-guide={`foryou-${shelf.id}`}')
  })

  it('every practice group has a unique practice-* anchor', () => {
    const guides = PRACTICE_GROUPS.map((g) => g.guide)
    for (const g of guides) expect(g).toMatch(/^practice-[a-z]+$/)
    expect(new Set(guides).size).toBe(guides.length)
  })

  it('every selector in every tour resolves to an anchor in the code', () => {
    const names = sourceAnchors()
    for (const s of ALL_STEPS.filter((x) => x.selector)) {
      const name = s.selector.match(SELECTOR_RE)[2]
      expect(names.has(name), `${s.route} → ${s.selector}`).toBe(true)
    }
  })
})

describe('buildPageSteps', () => {
  it('stamps the given route on every step and maps to the engine shape', () => {
    const steps = buildPageSteps('/')
    expect(steps.length).toBeGreaterThan(0)
    for (const s of steps) {
      expect(s.route).toBe('/')
      expect(s).toHaveProperty('id')
      expect(s).toHaveProperty('title')
      expect(s).toHaveProperty('body')
    }
  })

  it('passes the body through unchanged (no example line appended)', () => {
    const [first] = buildPageSteps('/pdf-reader')
    expect(first.body).toBe(PAGE_GUIDES['/pdf-reader'][0].body)
  })

  it('returns [] for a route with no page guide', () => {
    expect(buildPageSteps('/nope')).toEqual([])
  })
})
