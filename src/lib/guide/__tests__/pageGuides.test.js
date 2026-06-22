import { describe, it, expect } from 'vitest'
import { PAGE_GUIDES, buildPageSteps } from '../pageGuides'
import { PAGE_GUIDE_ROUTES } from '../pageGuideRoutes'
import { APP_ROUTES } from '../tourSteps'

const SELECTOR_RE = /^\[data-(tour|guide)="[a-z0-9-]+"\]$/

describe('pageGuides content', () => {
  it('every step has a non-empty title + body and a valid anchor selector', () => {
    for (const [route, steps] of Object.entries(PAGE_GUIDES)) {
      expect(Array.isArray(steps), route).toBe(true)
      for (const s of steps) {
        expect(s.title?.trim(), `${route} title`).toBeTruthy()
        expect(s.body?.trim(), `${route} body`).toBeTruthy()
        if (s.arrow !== 'none') expect(s.selector, `${route} selector`).toMatch(SELECTOR_RE)
      }
    }
  })

  it('all route keys are real app routes', () => {
    for (const route of Object.keys(PAGE_GUIDES)) expect(APP_ROUTES).toContain(route)
  })

  it('PAGE_GUIDE_ROUTES stays in sync with PAGE_GUIDES (eager seam cannot drift)', () => {
    expect([...PAGE_GUIDE_ROUTES].sort()).toEqual(Object.keys(PAGE_GUIDES).sort())
  })
})

// T9 increment 2 — the PDF reader deep-dive content. Pins that the guide exists,
// covers every meaningful loaded-state control via a [data-guide="pdf-…"] anchor
// that EXISTS in PDFReader.jsx (no arrow pointing at a missing node), and opens
// with the sample step so a blank-page user lands where the arrows resolve.
describe('pageGuides — /pdf-reader deep dive', () => {
  const steps = PAGE_GUIDES['/pdf-reader']

  it('exists with a centered intro + several anchored steps', () => {
    expect(Array.isArray(steps)).toBe(true)
    expect(steps.length).toBeGreaterThanOrEqual(7)
    expect(steps[0].arrow).toBe('none') // intro, no pointer
  })

  it('covers each meaningful control with a real pdf anchor', () => {
    const selectors = steps.map(s => s.selector).filter(Boolean)
    for (const anchor of [
      '[data-guide="pdf-sample"]',
      '[data-guide="pdf-reading"]',
      '[data-guide="pdf-mode"]',
      '[data-guide="pdf-translate"]',
      '[data-guide="pdf-sentences"]',
      '[data-guide="pdf-fulltranslation"]',
      '[data-guide="pdf-view"]',
      '[data-guide="pdf-replace"]',
    ]) {
      expect(selectors, anchor).toContain(anchor)
    }
  })

  it('opens with the sample step so the loaded-state arrows resolve', () => {
    const firstAnchored = steps.find(s => s.selector)
    expect(firstAnchored.selector).toBe('[data-guide="pdf-sample"]')
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

  it('returns [] for a route with no page guide', () => {
    expect(buildPageSteps('/nope')).toEqual([])
  })
})
