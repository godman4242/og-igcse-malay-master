import { test, expect } from '@playwright/test'

// Issue 5 — reusable InfoPreview ((?) icon) for jargon controls. First applied
// to the Settings "PDF sentence translation" Inline/Bottom-panel control, which
// Kheshav reported as "fuzzy to visualize". The popover shows a tiny CSS mock of
// each option. a11y contract: focusable trigger, aria-expanded toggles, Esc
// closes, outside tap/click dismisses. See
// docs/superpowers/specs/2026-06-11-website-fixes-triage-design.md (Issue 5).

const TRIGGER = '[data-testid="info-sentence-render"]'
const PANEL = '[data-testid="info-sentence-render-panel"]'

async function resetState(page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-malay-telemetry')
  })
  await page.reload({ waitUntil: 'networkidle' })
}

test.describe('Issue 5 — InfoPreview on the PDF sentence-translation control', () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page)
    await page.goto('/settings', { waitUntil: 'networkidle' })
  })

  test('a (?) trigger exists next to the PDF sentence-translation control', async ({ page }) => {
    const trigger = page.locator(TRIGGER)
    await expect(trigger).toHaveCount(1)
    await trigger.scrollIntoViewIfNeeded()
    await expect(trigger).toBeVisible()
    // Closed by default — no popover until invoked.
    await expect(page.locator(PANEL)).toHaveCount(0)
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  test('opens on tap/click and shows a mock of BOTH options', async ({ page }) => {
    const trigger = page.locator(TRIGGER)
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()
    const panel = page.locator(PANEL)
    await expect(panel).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    // The mock must label both choices so the option becomes intuitive.
    await expect(panel).toContainText(/inline/i)
    await expect(panel).toContainText(/bottom/i)
  })

  test('Escape closes the popover', async ({ page }) => {
    const trigger = page.locator(TRIGGER)
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()
    await expect(page.locator(PANEL)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator(PANEL)).toHaveCount(0)
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  test('clicking outside dismisses the popover', async ({ page }) => {
    const trigger = page.locator(TRIGGER)
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()
    await expect(page.locator(PANEL)).toBeVisible()
    // Click a neutral element well away from the popover.
    await page.getByRole('heading', { name: /Settings & Tools/i }).click()
    await expect(page.locator(PANEL)).toHaveCount(0)
  })

  test('the underlying Inline/Bottom-panel toggle still works (no regression)', async ({ page }) => {
    // The (?) must not break the control it annotates.
    const sheetBtn = page.getByRole('button', { name: 'Bottom panel' })
    await sheetBtn.scrollIntoViewIfNeeded()
    await sheetBtn.click()
    const render = await page.evaluate(() => {
      const raw = localStorage.getItem('igcse-malay-store')
      return raw ? JSON.parse(raw).state?.pdfReader?.sentenceRender : null
    })
    expect(render).toBe('sheet')
  })
})
