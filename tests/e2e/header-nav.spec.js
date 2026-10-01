// A6 Phase 1 step 1 — the compact header: ← → top-left (greyed when there is
// nothing back / ahead), the page's NAME (brand only on "/"), ▶ · Save · 🔍
// top-right, ONE row ≤ 64 px tall at 390 px. Real Chromium: the greying reads
// `history.state.idx`, which jsdom + MemoryRouter never set.
//
// Run solo:
//   npx playwright test header-nav --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

const MAX_HEADER_PX = 64

async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance.getEntriesByType('resource')
      .find((r) => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found')
    window.__STORE = (await import(url)).default
  })
}

// Fresh learner, first-run tour offer silenced (it would cover the header).
async function freshVisit(page, path) {
  await page.goto(path, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
  await page.evaluate(() => window.__STORE.getState().markGuideSeen('quick'))
}

const back = (page) => page.getByRole('button', { name: 'Back', exact: true })
const forward = (page) => page.getByRole('button', { name: 'Forward', exact: true })
const title = (page) => page.locator('header h1')
// The app bar — some pages (For You, Privacy, Terms) have an in-page <header> too.
const bar = (page) => page.locator('header', { has: page.locator('h1') })

test('fresh visit to /word-families: header names the page, ← and → are greyed, one row ≤ 64 px', async ({ page }) => {
  await freshVisit(page, '/word-families')
  await expect(title(page)).toHaveText('Word Families')
  await expect(page.locator('header')).not.toContainText('boogada')
  await expect(back(page)).toBeDisabled()
  await expect(forward(page)).toBeDisabled()
  const box = await page.locator('header').boundingBox()
  expect(box.height, `header is ${box?.height}px tall`).toBeLessThanOrEqual(MAX_HEADER_PX)
  // The name never runs under the controls: its box ends before the first
  // right-hand control starts.
  const name = await title(page).boundingBox()
  const tour = await page.getByRole('button', { name: /Tour this page/i }).boundingBox()
  expect(name.x + name.width).toBeLessThanOrEqual(tour.x + 0.5)
  // The in-page duplicate is gone — one "Word Families" heading, the header's.
  await expect(page.getByRole('heading', { name: 'Word Families' })).toHaveCount(1)
})

test('brand only on "/"; ← returns to the previous page; → goes ahead again, then greys', async ({ page }) => {
  await freshVisit(page, '/')
  await expect(page.locator('header')).toContainText('boogada')
  await expect(back(page)).toBeDisabled()
  await page.locator('[data-tour="nav-study"]').click()
  await expect(page).toHaveURL(/\/study$/)
  await expect(title(page)).toHaveText('Study')
  await expect(back(page)).toBeEnabled()
  await expect(forward(page)).toBeDisabled()

  await back(page).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(back(page)).toBeDisabled()
  await expect(forward(page)).toBeEnabled()

  await forward(page).click()
  await expect(page).toHaveURL(/\/study$/)
  await expect(forward(page)).toBeDisabled()
  await expect(back(page)).toBeEnabled()
})

test('a new page from the middle of the stack drops "ahead"; reload keeps it', async ({ page }) => {
  await freshVisit(page, '/')
  await page.locator('[data-tour="nav-study"]').click()
  await expect(page).toHaveURL(/\/study$/)
  await page.locator('[data-tour="nav-grammar"]').click()
  await expect(page).toHaveURL(/\/grammar$/)
  await back(page).click()
  await expect(page).toHaveURL(/\/study$/)
  await expect(forward(page)).toBeEnabled()
  await page.reload({ waitUntil: 'networkidle' })
  await expect(forward(page)).toBeEnabled()
  await page.locator('[data-tour="nav-roleplay"]').click()
  await expect(page).toHaveURL(/\/roleplay$/)
  await expect(forward(page)).toBeDisabled()
  await expect(back(page)).toBeEnabled()
})

// Fix-up after the driver's LOOK (2026-10-01): at 390 px three names were cut
// with "…" (Comprehensi…, Exam Rehears…, Mistake Journ…) and seven pages still
// repeated their exact header name as the page's first heading. Every route's
// FULL name must read at 390 px, in ONE row ≤ 64 px, clear of the controls.
import { ROUTE_META } from '../../src/lib/routeMeta.js'

for (const [path, { name }] of Object.entries(ROUTE_META)) {
  test(`390 px: "${name}" reads in full on ${path} — no "…", one row ≤ ${MAX_HEADER_PX} px`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' })
    const h1 = title(page)
    await expect(h1).toBeVisible()
    if (path !== '/') await expect(h1).toHaveText(name)
    // Clipped text (text-overflow "…" or an overflowing line-clamp) overflows its
    // box: scrollWidth/Height > client. sr-only spans (1 px boxes) are skipped.
    const clipped = await h1.evaluate((el) =>
      [el, ...el.querySelectorAll('*')]
        .filter((n) => n.clientWidth > 1)
        .filter((n) => n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1)
        .map((n) => `${n.tagName}: ${n.scrollWidth}×${n.scrollHeight} in ${n.clientWidth}×${n.clientHeight}`))
    expect(clipped, `"${name}" is clipped: ${clipped.join('; ')}`).toEqual([])
    const header = await bar(page).boundingBox()
    expect(header.height, `header is ${header.height}px tall`).toBeLessThanOrEqual(MAX_HEADER_PX)
  })
}

// The seven pages the driver found still carrying their name twice. Case-blind
// ("Cloze listening" under "Cloze Listening" is still a repeat).
for (const path of ['/cloze-listening', '/dictation', '/for-you', '/listening', '/pdf-reader', '/privacy', '/terms']) {
  const { name } = ROUTE_META[path]
  test(`${path}: "${name}" is a heading once — the header's`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' })
    await expect(title(page)).toHaveText(name)
    await expect(page.getByRole('heading', { name: new RegExp(`^${name}$`, 'i') })).toHaveCount(1)
  })
}
