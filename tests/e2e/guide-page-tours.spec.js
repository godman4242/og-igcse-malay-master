// Every Full Page Guide ("▶ Tour this page"), on every route, in TWO states:
//   • empty  — a brand-new learner (fresh store, nothing loaded)
//   • filled — beginner deck + a few mistakes, and the reader/writing sample open
//
// Data-driven from PAGE_GUIDES, so rewording a step never breaks this spec (the
// old per-route specs pinned prose and rotted on every copy edit). What it pins
// is the BEHAVIOUR Kheshav asked for (2026-09-28):
//   1. each step lights up its real control — the highlighted element IS the
//      step's anchor (an anchor-less step is a centred card, nothing lit);
//   2. only controls actually on screen get a step — the tour is exactly the
//      steps whose anchor exists at launch, in order, ending on "Done";
//   3. a click on the dark area never hides or closes the box;
//   4. the walk never hangs (bounded), and the ✕ is the way out.
//
// Run solo:
//   npm run test:e2e -- guide-page-tours
import { test, expect } from '@playwright/test'
import { PAGE_GUIDES } from '../../src/lib/guide/pageGuides.js'

const WALK_BOUND_MS = 20_000
const POPOVER = '.driver-popover.guide-theme'

async function bindStore(page) {
  await page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .find((r) => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found in resource timing')
    window.__STORE = (await import(url)).default
  })
}

async function prep(page, filled) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-malay-telemetry')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
  await page.evaluate(() => window.__STORE.setState({ guide: { seenQuick: true, seenFull: false } }))
  if (!filled) return
  await page.getByRole('button', { name: /add the beginner deck/i }).click()
  await expect(page.getByRole('button', { name: /add the beginner deck/i })).toHaveCount(0)
  await page.evaluate(() => {
    const { addMistake } = window.__STORE.getState()
    addMistake({ type: 'vocab', word: 'makan', correct: 'eat', surface: 'makan', language: 'ms' })
    addMistake({ type: 'vocab', word: 'minum', correct: 'drink', surface: 'minum', language: 'ms' })
  })
}

// Page-specific "filled" setup that lives on the page itself.
const OPEN_CONTENT = {
  '/pdf-reader': async (page) => {
    await page.getByRole('button', { name: /try a sample/i }).first().click()
    await expect(page.locator('[data-token-i]').first()).toBeVisible()
  },
}

// Which of a route's anchored steps are on screen right now — the same rule the
// controller uses (the element exists AND has a size; an empty wrapper doesn't count).
async function onScreen(page, route) {
  return page.evaluate(
    (sels) => sels.map((s) => {
      if (!s) return true
      const el = document.querySelector(s)
      if (!el) return false
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    }),
    PAGE_GUIDES[route].map((s) => s.selector || null),
  )
}

// The steps the tour should show right now: anchor-less, or anchor on screen.
async function expectedSteps(page, route) {
  const present = await onScreen(page, route)
  return PAGE_GUIDES[route].filter((_, i) => present[i])
}

for (const filled of [false, true]) {
  for (const route of Object.keys(PAGE_GUIDES)) {
    test(`page tour ${route} (${filled ? 'filled' : 'empty'}): each step lights up its control`, async ({ page }) => {
      await prep(page, filled)
      await page.goto(route, { waitUntil: 'networkidle' })
      if (filled && OPEN_CONTENT[route]) await OPEN_CONTENT[route](page)

      const expected = await expectedSteps(page, route)
      await page.getByRole('button', { name: /Tour this page/i }).first().click()
      const popover = page.locator(POPOVER)
      await expect(popover).toBeVisible()

      const started = Date.now()
      for (let i = 0; i < expected.length; i++) {
        const step = expected[i]
        await expect(popover.locator('.driver-popover-title'), `${route} step ${i}`).toHaveText(step.title)
        // driver.js moves the highlight a beat after the text (animated), so poll.
        await expect.poll(() => page.evaluate((sel) => {
          const el = document.querySelector('.driver-active-element')
          if (!el) return 'none'
          if (el.id === 'driver-dummy-element') return 'centred'
          return sel && el.matches(sel) ? 'match' : `wrong:${el.outerHTML.slice(0, 80)}`
        }, step.selector || null), { message: `${route} step ${i} "${step.title}"` })
          .toBe(step.selector ? 'match' : 'centred')

        // A click on the dark area never hides or closes the box (only ✕ does).
        if (i === 0) {
          await page.mouse.click(4, 4)
          await expect(popover).toBeVisible()
          await expect(page.locator('.guide-paused')).toHaveCount(0)
        }

        const isLast = i === expected.length - 1
        await popover.getByRole('button', { name: isLast ? /Done/i : /Next/i }).click()
      }
      await expect(popover).toHaveCount(0)
      expect(Date.now() - started, `${route} walk time`).toBeLessThan(WALK_BOUND_MS)
    })
  }
}

// Controls that need history these two states don't build (a day of study, a
// graded essay, saved words…). Each is still taught when it IS on screen; the
// reason is here so the list can't quietly grow.
const NOT_IN_TEST_STATES = {
  '[data-guide="writing-task"]': 'only for formats with tasks; Auto-detect has none',
  '[data-guide="mistakes-trends"]': 'needs a weak graded essay or speaking answer',
  '[data-guide="mistakes-patterns"]': 'needs several mistakes sharing one grammar rule',
  '[data-guide="foryou-still-remember"]': 'needs words learned a while ago',
  '[data-guide="foryou-saved"]': 'needs words saved while reading',
  '[data-guide="foryou-goal"]': 'needs a goal set in Settings',
  '[data-guide="savedcloze-card"]': 'needs words saved while reading',
}

// Self-contained on purpose: it visits every route in both states itself, so a
// retry (a fresh worker) or a -g filter can never skip it into a false pass.
test('every highlighted step shows in the empty or the filled state (fail-closed)', async ({ page }) => {
  test.setTimeout(180_000)
  const seen = {}
  for (const filled of [false, true]) {
    await prep(page, filled)
    for (const route of Object.keys(PAGE_GUIDES)) {
      await page.goto(route, { waitUntil: 'networkidle' })
      if (filled && OPEN_CONTENT[route]) await OPEN_CONTENT[route](page)
      const present = await onScreen(page, route)
      seen[route] ??= new Set()
      PAGE_GUIDES[route].forEach((s, i) => { if (s.selector && present[i]) seen[route].add(s.selector) })
    }
  }
  const missing = []
  for (const [route, steps] of Object.entries(PAGE_GUIDES)) {
    for (const s of steps) {
      if (s.selector && !seen[route]?.has(s.selector) && !NOT_IN_TEST_STATES[s.selector]) missing.push(`${route} ${s.selector}`)
    }
  }
  expect(missing).toEqual([])
  // Stale-check the exceptions: one that DID show up must come off the list.
  const allSeen = new Set(Object.values(seen).flatMap((set) => [...set]))
  expect(Object.keys(NOT_IN_TEST_STATES).filter((sel) => allSeen.has(sel))).toEqual([])
})

test('page tour: the red ✕ closes the tour', async ({ page }) => {
  await prep(page, false)
  await page.goto('/grammar', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Tour this page/i }).first().click()
  const popover = page.locator(POPOVER)
  await expect(popover).toBeVisible()
  await popover.locator('.driver-popover-close-btn').click()
  await expect(popover).toHaveCount(0)
  await expect(page.locator('.driver-active-element')).toHaveCount(0)
})

// Fast tapping (a skimming learner) used to leave EVERY passed control lit:
// driver.js only un-highlights the element of the last FINISHED transition, so a
// Next inside its ~400ms animation stranded the previous one. Exactly one lit.
test('page tour: fast Next taps never leave two controls lit', async ({ page }) => {
  await prep(page, false)
  await page.goto('/grammar', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Tour this page/i }).first().click()
  const popover = page.locator(POPOVER)
  await expect(popover).toBeVisible()
  for (let i = 0; i < 3; i++) {
    await popover.getByRole('button', { name: /Next/i }).click()
    await page.waitForTimeout(100)
  }
  await expect(popover.locator('.driver-popover-title')).toHaveText(PAGE_GUIDES['/grammar'][3].title)
  await expect.poll(() => page.evaluate(() =>
    [...document.querySelectorAll('.driver-active-element')].map((e) => e.getAttribute('data-guide'))))
    .toEqual(['grammar-tabs'])
})

// A wrapper that renders but holds nothing (e.g. For You's "Where you stand" for
// a learner with no cards) must not be spotlit as an empty gold line.
test('page tour: a control with no size (an empty wrapper) is left out', async ({ page }) => {
  await prep(page, false)
  await page.goto('/grammar', { waitUntil: 'networkidle' })
  await page.evaluate(async () => {
    const probe = document.createElement('div')
    probe.setAttribute('data-guide', 'empty-probe')
    document.querySelector('main, #root').appendChild(probe)
    const mod = await import('/src/lib/guide/guideController.js')
    mod.startTour([
      { id: 'a', route: '/grammar', title: 'Intro step', body: 'b' },
      { id: 'b', route: '/grammar', selector: '[data-guide="empty-probe"]', title: 'Empty step', body: 'b' },
      { id: 'c', route: '/grammar', selector: '[data-guide="grammar-mode"]', title: 'Real step', body: 'b' },
    ], { tier: 'page', navigate: async () => {}, onEvent: () => {}, getPath: () => '/grammar' })
  })
  const popover = page.locator(POPOVER)
  await expect(popover.locator('.driver-popover-title')).toHaveText('Intro step')
  await popover.getByRole('button', { name: /Next/i }).click()
  await expect(popover.locator('.driver-popover-title')).toHaveText('Real step')
  await expect(popover.getByRole('button', { name: /Done/i })).toBeVisible()
})

// ── Doing what the step asks moves the tour on (Kheshav 2026-09-28: "it should
// automatically go to the next step after I click the button it asks of me").
const TITLE = `${POPOVER} .driver-popover-title`

async function startAt(page, route, title) {
  await page.getByRole('button', { name: /Tour this page/i }).first().click()
  const popover = page.locator(POPOVER)
  for (let i = 0; i < 20 && (await popover.locator('.driver-popover-title').textContent()) !== title; i++) {
    await popover.getByRole('button', { name: /Next/i }).click()
    await page.waitForTimeout(150)
  }
  await expect(page.locator(TITLE)).toHaveText(title)
}

test('page tour: clicking the highlighted control moves the tour on by itself', async ({ page }) => {
  await prep(page, false)
  await page.goto('/grammar', { waitUntil: 'networkidle' })
  await startAt(page, '/grammar', 'SRS or Cram')
  await page.locator('[data-guide="grammar-mode"]').click()
  await expect(page.locator(TITLE)).toHaveText('Malay or English?', { timeout: 3000 })
  await expect.poll(() => page.evaluate(() => document.querySelector('.driver-active-element')?.getAttribute('data-guide')))
    .toBe('grammar-lang')
})

test('page tour: click the control, then Next straight away — exactly one step on', async ({ page }) => {
  await prep(page, false)
  await page.goto('/grammar', { waitUntil: 'networkidle' })
  await startAt(page, '/grammar', 'SRS or Cram')
  await page.locator('[data-guide="grammar-mode"]').click()
  await page.locator(POPOVER).getByRole('button', { name: /Next/i }).click()
  await expect(page.locator(TITLE)).toHaveText('Malay or English?')
  await page.waitForTimeout(1500)                                    // any pending auto-step would land by now
  await expect(page.locator(TITLE)).toHaveText('Malay or English?')
})

test('page tour: typing into a highlighted box does not skip ahead', async ({ page }) => {
  await prep(page, false)
  await page.goto('/import', { waitUntil: 'networkidle' })
  await startAt(page, '/import', 'Your text')
  await page.locator('[data-guide="import-text"]').click()
  await page.keyboard.type('makan minum')
  await page.waitForTimeout(1500)
  await expect(page.locator(TITLE)).toHaveText('Your text')
})

test('page tour: on the empty reader, "Try a sample" carries the tour on to the toolbar', async ({ page }) => {
  await prep(page, false)
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  await startAt(page, '/pdf-reader', 'Try a sample')
  await page.locator('[data-guide="pdf-sample"]').click()
  await expect(page.locator(TITLE)).toHaveText('Replace file', { timeout: 5000 })
  await expect.poll(() => page.evaluate(() => document.querySelector('.driver-active-element')?.getAttribute('data-guide')))
    .toBe('pdf-replace')
})

test('page tour: the highlight follows its control when the page shifts', async ({ page }) => {
  await prep(page, false)
  await page.goto('/pdf-reader', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /try a sample/i }).first().click()
  await expect(page.locator('[data-token-i]').first()).toBeVisible()
  await startAt(page, '/pdf-reader', 'Tap a word')
  await page.waitForTimeout(600)
  // A panel appears above the text (as the Translation panel does on a word tap).
  await page.evaluate(() => {
    const spacer = document.createElement('div')
    spacer.style.height = '220px'
    const el = document.querySelector('[data-guide="pdf-reading"]')
    el.parentElement.insertBefore(spacer, el)
  })
  await page.waitForTimeout(800)
  // The whole lit control must be un-dimmed: its lower edge is not under the overlay.
  const covered = await page.evaluate(() => {
    const el = document.querySelector('[data-guide="pdf-reading"]')
    const r = el.getBoundingClientRect()
    const y = Math.min(r.bottom - 12, innerHeight - 12)
    const hit = document.elementFromPoint(r.left + r.width / 2, y)
    return !!hit?.closest('.driver-overlay')
  })
  expect(covered).toBe(false)
})

// Kheshav 2026-09-28: the 1 s pause "felt like a delay — usually it's instant".
// "Instant" = as fast as pressing Next yourself (driver.js animates every step
// change the same ~220 ms). Timed INSIDE the page (click → new title), because
// Playwright's own click/poll overhead is bigger than the thing being measured.
test('page tour: the step after your click comes as fast as pressing Next', async ({ page }) => {
  await prep(page, false)
  await page.goto('/grammar', { waitUntil: 'networkidle' })
  await startAt(page, '/grammar', 'SRS or Cram')
  await page.waitForTimeout(700)
  const timeTo = async (locator, want) => {
    await page.evaluate((want) => {
      window.__lat = null
      const t0 = { v: null }
      document.addEventListener('click', () => { t0.v ??= performance.now() }, { capture: true, once: true })
      const mo = new MutationObserver(() => {
        if (document.querySelector('.driver-popover-title')?.textContent === want && t0.v != null) {
          window.__lat = performance.now() - t0.v; mo.disconnect()
        }
      })
      mo.observe(document.body, { subtree: true, childList: true, characterData: true })
    }, want)
    const box = await locator.boundingBox()
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await expect.poll(() => page.evaluate(() => window.__lat)).not.toBeNull()
    return page.evaluate(() => window.__lat)
  }
  const manual = await timeTo(page.locator('.driver-popover-next-btn'), 'Malay or English?')
  await page.locator(POPOVER).getByRole('button', { name: /Back/i }).click()
  await expect(page.locator(TITLE)).toHaveText('SRS or Cram')
  await page.waitForTimeout(700)
  const auto = await timeTo(page.locator('[data-guide="grammar-mode"]'), 'Malay or English?')
  expect(auto - manual, `auto ${Math.round(auto)} ms vs manual Next ${Math.round(manual)} ms`).toBeLessThan(100)
})

// The reflex: tap the lit button, then reach for Next out of habit. The tour has
// already moved on by itself, so that Next must not skip a step nobody read.
test('page tour: tap the control, then a reflex Next half a second later — still one step', async ({ page }) => {
  await prep(page, false)
  await page.goto('/grammar', { waitUntil: 'networkidle' })
  await startAt(page, '/grammar', 'SRS or Cram')
  await page.locator('[data-guide="grammar-mode"]').click()
  await page.waitForTimeout(450)
  await page.locator(POPOVER).getByRole('button', { name: /Next/i }).click()
  await page.waitForTimeout(1200)
  await expect(page.locator(TITLE)).toHaveText('Malay or English?')
})

// A lit control that vanishes (the page changed under it) moves the tour on to
// what IS there, instead of pointing at nothing.
test('page tour: if the lit control disappears, the tour moves on', async ({ page }) => {
  await prep(page, false)
  await page.goto('/grammar', { waitUntil: 'networkidle' })
  await startAt(page, '/grammar', 'SRS or Cram')
  await page.waitForTimeout(700)
  await page.evaluate(() => document.querySelector('[data-guide="grammar-mode"]').remove())
  await expect(page.locator(TITLE)).toHaveText('Malay or English?', { timeout: 2000 })
})
