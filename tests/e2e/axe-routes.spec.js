/* global process */
// GOAL #53 — the axe sweep as a gate. Every route in ROUTE_META, 390 px, dark + light, on the
// production PREVIEW build (:4173), with the beginner deck added so the Dashboard / Study widgets
// render: 0 serious/critical axe violations, or the failure names rule + selector. bypassCSP lifts
// the enforced CSP so the injected axe script can run (csp.spec.js guards the CSP itself);
// serviceWorkers 'block' keeps the PWA worker from serving a stale build. The first test plants an
// unnamed button and must see it — so a green run can't be axe silently never running.
//
// Run solo:
//   npm run test:e2e -- axe-routes
import { test, expect } from '@playwright/test'
import { createRequire } from 'node:module'
import { ROUTE_META } from '../../src/lib/routeMeta.js'

// E2E_PREVIEW_URL: point at another preview port when something else squats on :4173 locally.
const PREVIEW = process.env.E2E_PREVIEW_URL || 'http://localhost:4173'
const AXE = createRequire(import.meta.url).resolve('axe-core/axe.min.js')
const STORE_KEY = 'igcse-malay-store'

// A violation queued in GOAL.md and not fixed yet: that ONE rule is off on that ONE route, so the
// gate starts green and tightens when the item ships (delete its line here in the same commit).
// Shape: '/route': ['axe-rule-id'], // GOAL #NN — what a learner hits
const KNOWN = {
  '/study': ['button-name'], // GOAL #68 — the flashcard front's 🔊 (FlashcardMode.jsx ~178) has no name
}

test.use({ bypassCSP: true, serviceWorkers: 'block' })

// localStorage after a fresh learner dismissed the tour offer and added the beginner deck.
let seeded

test.beforeAll(async ({ browser }) => {
  const ctx = await browser.newContext({ bypassCSP: true, serviceWorkers: 'block', viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.goto(`${PREVIEW}/`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /maybe later/i }).click({ timeout: 3_000 }).catch(() => {})
  await page.getByRole('button', { name: /add the beginner deck/i }).click()
  await expect(page.getByRole('button', { name: /add the beginner deck/i })).toHaveCount(0)
  seeded = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))
  await ctx.close()
  expect(JSON.parse(seeded[STORE_KEY]).state.cards.length, 'beginner deck added').toBeGreaterThan(0)
})

async function open(page, route, theme) {
  const s = JSON.parse(seeded[STORE_KEY])
  s.state.theme = theme
  await page.addInitScript((kv) => { for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v) },
    { ...seeded, [STORE_KEY]: JSON.stringify(s) })
  await page.goto(`${PREVIEW}${route}`, { waitUntil: 'networkidle' })
  await expect(page.locator('#root')).not.toBeEmpty()
  // Not vacuous: a route dropped from App.jsx falls to `*` → '/', a theme that didn't apply measures dark twice,
  // and a page that crashed would have axe scan the ErrorBoundary's screen instead.
  expect(new URL(page.url()).pathname, 'still on the route').toBe(route)
  expect(await page.locator('#root > .light').count(), 'theme applied').toBe(theme === 'light' ? 1 : 0)
  await page.waitForTimeout(500) // let page-transition fades finish — mid-fade text fails contrast
  await expect(page.getByText(/^(Something went wrong|Couldn't load this page)$/)).toHaveCount(0)
}

// Every serious/critical node as "rule (impact): selector — summary".
async function blocking(page, skip = []) {
  await page.addScriptTag({ path: AXE })
  return page.evaluate(async (off) => {
    const rules = Object.fromEntries(off.map((id) => [id, { enabled: false }]))
    const { violations } = await window.axe.run(document, { rules, resultTypes: ['violations'] })
    return violations.flatMap((v) => v.nodes
      .filter((n) => n.impact === 'serious' || n.impact === 'critical')
      .map((n) => `${v.id} (${n.impact}): ${n.target.join(' ')} — ${n.failureSummary.split('\n')[1]?.trim() ?? v.help}`))
  }, skip)
}

test('the sweep goes red on a planted unnamed button', async ({ page }) => {
  await open(page, '/', 'dark')
  expect(await blocking(page)).toEqual([])
  await page.evaluate(() => {
    const b = document.createElement('button')
    b.id = 'planted-unnamed'
    b.innerHTML = '<svg width="20" height="20" aria-hidden="true"></svg>'
    document.querySelector('main').append(b)
  })
  expect((await blocking(page)).join('\n')).toContain('button-name (critical): #planted-unnamed')
})

for (const theme of ['dark', 'light']) {
  test.describe(`${theme} theme`, () => {
    for (const route of Object.keys(ROUTE_META)) {
      test(`${route} has 0 serious/critical axe violations`, async ({ page }) => {
        await open(page, route, theme)
        const found = await blocking(page, KNOWN[route])
        expect(found, `axe on ${route} (${theme}, 390 px):\n${found.join('\n')}`).toEqual([])
      })
    }
  })
}
