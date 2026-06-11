import { test, expect } from '@playwright/test'

// Issue 4a — Exam Rehearsal Malay/English subject toggle. Replaces the old
// uncontrolled 60/40 MS/EN random passage pick so a learner can drill ONE
// syllabus. The choice persists (STORE_VERSION 27, examRehearsalLang) and
// drives which passage a rehearsal opens with.
// See docs/superpowers/specs/2026-06-11-website-fixes-triage-design.md (Issue 4a).

const EN_TITLES = /The Empty Seat|Are Phones Really the Problem\?|The Cities Beneath the Waves/
const MS_TITLES = /Gotong-Royong di Kampung|Teknologi dalam Pendidikan|Menjaga Alam Sekitar|Keluarga Bahagia|Gaya Hidup Sihat/

const storedLang = (page) => page.evaluate(() => {
  const raw = localStorage.getItem('igcse-malay-store')
  return raw ? JSON.parse(raw).state?.examRehearsalLang : null
})

async function resetState(page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('igcse-malay-store')
    localStorage.removeItem('igcse-malay-telemetry')
  })
  await page.reload({ waitUntil: 'networkidle' })
}

test.describe('Issue 4a — Exam Rehearsal language toggle', () => {
  test.beforeEach(async ({ page }) => {
    await resetState(page)
    await page.goto('/exam-rehearsal', { waitUntil: 'networkidle' })
  })

  test('defaults to Malay and the toggle is shown', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Bahasa Melayu' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'false')
    expect(await storedLang(page)).toBe('ms')
  })

  test('switching to English persists across reload', async ({ page }) => {
    await page.getByRole('button', { name: 'English' }).click()
    await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
    expect(await storedLang(page)).toBe('en')

    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
    expect(await storedLang(page)).toBe('en')
  })

  test('starting with English selected opens an English passage', async ({ page }) => {
    await page.getByRole('button', { name: 'English' }).click()
    await page.getByRole('button', { name: /Start rehearsal/i }).click()
    // COMP stage renders the passage title — must be an English one.
    await expect(page.getByRole('heading', { name: EN_TITLES })).toBeVisible()
  })

  test('starting with Malay selected opens a Malay passage', async ({ page }) => {
    // Malay is the default; just start.
    await page.getByRole('button', { name: /Start rehearsal/i }).click()
    await expect(page.getByRole('heading', { name: MS_TITLES })).toBeVisible()
  })
})
