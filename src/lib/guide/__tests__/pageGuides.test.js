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
