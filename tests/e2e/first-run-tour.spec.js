import { test, expect } from '@playwright/test'

// Mirrors the bindStore pattern from mistake-promotion.spec.js (see
// CLAUDE.md "## E2E tests" for the Vite ?t= module-URL trap).
async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .find(r => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found in resource timing')
    const mod = await import(url)
    window.__STORE = mod.default
    return url
  })
}

async function resetState(page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-malay-telemetry')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
}

async function injectUnreviewedCard(page) {
  await page.evaluate(() => {
    window.__STORE.getState().addCard({
      m: 'sebab', e: 'reason', t: 'first-run-test',
    })
  })
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
}

test.describe('First-Run Tour — activation card on Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page)
  })

  test('Fresh empty-deck state shows empty-deck variant', async ({ page }) => {
    await expect(
      page.getByRole('region', { name: /welcome.*build your deck/i })
    ).toBeVisible()
    const cta = page.getByRole('button', { name: /add words/i })
    await expect(cta).toBeVisible()
    await cta.click()
    await expect(page).toHaveURL(/\/word-families$/)
  })

  test('Populated deck (never reviewed) shows study variant', async ({ page }) => {
    await injectUnreviewedCard(page)
    await expect(
      page.getByRole('region', { name: /your first session is ready/i })
    ).toBeVisible()
    const cta = page.getByRole('button', { name: /start studying/i })
    await expect(cta).toBeVisible()
    await cta.click()
    await expect(page).toHaveURL(/\/study$/)
  })

  test('Rating a card unmounts the card', async ({ page }) => {
    await injectUnreviewedCard(page)
    await expect(
      page.getByRole('region', { name: /your first session/i })
    ).toBeVisible()
    await page.evaluate(() => {
      // Rating.Good === 3 in ts-fsrs (verified via node REPL).
      window.__STORE.getState().reviewCardAction('sebab', 3)
    })
    await expect(
      page.getByRole('region', { name: /your first session/i })
    ).toHaveCount(0)
    await expect(
      page.getByRole('region', { name: /welcome.*build/i })
    ).toHaveCount(0)
  })

  test('After activation, refresh keeps the card hidden', async ({ page }) => {
    await injectUnreviewedCard(page)
    await page.evaluate(() => {
      window.__STORE.getState().reviewCardAction('sebab', 3)
    })
    await page.reload({ waitUntil: 'networkidle' })
    await expect(
      page.getByRole('region', { name: /your first session/i })
    ).toHaveCount(0)
    await expect(
      page.getByRole('region', { name: /welcome.*build/i })
    ).toHaveCount(0)
  })

  test('Telemetry events fire with the right variant', async ({ page }) => {
    await injectUnreviewedCard(page)
    // Clear any pre-existing telemetry from the empty-mount window.
    await page.evaluate(() => localStorage.removeItem('igcse-malay-telemetry'))
    await page.reload({ waitUntil: 'networkidle' })
    await bindStore(page)
    await page.getByRole('button', { name: /start studying/i }).click()
    await page.waitForURL(/\/study/)

    const events = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('igcse-malay-telemetry') || '[]')
    })
    const shown = events.find(e =>
      e.event === 'first_run_card_shown' && e.payload?.variant === 'populated'
    )
    const clicked = events.find(e =>
      e.event === 'first_run_cta_clicked' && e.payload?.variant === 'populated'
    )
    expect(shown).toBeTruthy()
    expect(clicked).toBeTruthy()
  })
})
