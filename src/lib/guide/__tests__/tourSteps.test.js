import { describe, it, expect } from 'vitest'
import { QUICK_TOUR, FULL_TOUR, APP_ROUTES } from '../tourSteps'

// Pure data invariants for the in-app guide. No browser needed.
// Spec: docs/superpowers/specs/2026-06-10-interactive-user-guide-design.md §5/Task 1.

function assertStepShape(step, where) {
  expect(typeof step.id, `${where}: id is a string`).toBe('string')
  expect(step.id.trim().length, `${where}: id non-empty`).toBeGreaterThan(0)
  expect(typeof step.title, `${where}: title is a string`).toBe('string')
  expect(step.title.trim().length, `${where}: title non-empty`).toBeGreaterThan(0)
  expect(typeof step.body, `${where}: body is a string`).toBe('string')
  expect(step.body.trim().length, `${where}: body non-empty`).toBeGreaterThan(0)
  if (step.route !== undefined) {
    expect(APP_ROUTES, `${where}: route is a real app route`).toContain(step.route)
  }
  if (step.selector !== undefined) {
    expect(typeof step.selector).toBe('string')
    // Convention: every spotlight selector targets a stable data-tour anchor.
    expect(step.selector.startsWith('[data-tour='), `${where}: selector targets a data-tour anchor`).toBe(true)
  }
}

function uniqueIds(steps) {
  return new Set(steps.map(s => s.id)).size === steps.length
}

describe('tourSteps — shared invariants', () => {
  it('exports two non-empty tour arrays and the route list', () => {
    expect(Array.isArray(QUICK_TOUR)).toBe(true)
    expect(Array.isArray(FULL_TOUR)).toBe(true)
    expect(Array.isArray(APP_ROUTES)).toBe(true)
    expect(QUICK_TOUR.length).toBeGreaterThan(0)
    expect(FULL_TOUR.length).toBeGreaterThan(0)
    expect(APP_ROUTES.length).toBeGreaterThan(0)
  })

  it('every step in both tours has a non-empty title + body and valid route/selector', () => {
    QUICK_TOUR.forEach((s, i) => assertStepShape(s, `QUICK[${i}]`))
    FULL_TOUR.forEach((s, i) => assertStepShape(s, `FULL[${i}]`))
  })

  it('step ids are unique within each tour', () => {
    expect(uniqueIds(QUICK_TOUR)).toBe(true)
    expect(uniqueIds(FULL_TOUR)).toBe(true)
  })

  it('a step with no selector is an intentional centered modal (intro/outro)', () => {
    // First + last step of each tour are modals (no selector) — welcome + sign-off.
    for (const tour of [QUICK_TOUR, FULL_TOUR]) {
      expect(tour[0].selector).toBeUndefined()
      expect(tour[tour.length - 1].selector).toBeUndefined()
    }
  })
})

describe('QUICK_TOUR', () => {
  it('is 6–8 steps (a ~60-second walkthrough)', () => {
    expect(QUICK_TOUR.length).toBeGreaterThanOrEqual(6)
    expect(QUICK_TOUR.length).toBeLessThanOrEqual(8)
  })

  it('crosses at least one route (the tour drives navigation)', () => {
    const routes = new Set(QUICK_TOUR.map(s => s.route).filter(Boolean))
    expect(routes.size).toBeGreaterThanOrEqual(2)
  })

  it('every QUICK route is also covered by FULL (Quick ⊆ Full concepts)', () => {
    const fullRoutes = new Set(FULL_TOUR.map(s => s.route).filter(Boolean))
    const quickRoutes = [...new Set(QUICK_TOUR.map(s => s.route).filter(Boolean))]
    quickRoutes.forEach(r => expect(fullRoutes).toContain(r))
  })
})

describe('FULL_TOUR', () => {
  it('visits every primary app route at least once', () => {
    const fullRoutes = new Set(FULL_TOUR.map(s => s.route).filter(Boolean))
    APP_ROUTES.forEach(r => {
      expect(fullRoutes.has(r), `FULL_TOUR should cover ${r}`).toBe(true)
    })
  })

  it('is a superset of the Quick walkthrough (≥ 20 steps for power learners)', () => {
    expect(FULL_TOUR.length).toBeGreaterThanOrEqual(QUICK_TOUR.length)
    expect(FULL_TOUR.length).toBeGreaterThanOrEqual(20)
  })
})
