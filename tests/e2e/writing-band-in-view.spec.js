import { test, expect } from '@playwright/test'

// 🐛 #43: after Analyze on a phone the "Band N/6" panel landed at y 1085 with
// scrollY 0 — below the fold, so the learner saw no grade unless they scrolled.

const ESSAY = `Dear Sir,

I am writing to complain about the noise from the new factory near my home. Every night the machines run until midnight and my family cannot sleep. I hope you will take action soon.

Yours faithfully,
Ali`

const KARANGAN = `Pada hari Sabtu yang lalu, saya dan keluarga pergi berkelah di pantai. Kami bertolak awal pagi kerana ingin mengelakkan kesesakan jalan raya. Setibanya di sana, ayah memasang khemah manakala ibu menyediakan makanan. Saya dan adik bermain bola di tepi pantai. Pada waktu petang, kami berenang bersama-sama. Akhirnya, kami pulang ke rumah dengan gembira.`

async function setup(page, viewport, lang = 'English', essay = ESSAY) {
  await page.setViewportSize(viewport)
  // Signed out → the AI grade fails and its note + key nudge land ABOVE the band.
  await page.route('**/api/gemini', route => route.abort())
  await page.goto('/writing', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: lang, exact: true }).click()
  const box = page.locator('[data-guide="writing-compose"]')
  await box.click()
  await box.fill(essay)
  return page.locator('[data-guide="writing-analyze"]')
}

// Fully on screen: below the top edge and above the fixed bottom nav.
async function expectBandInView(page, { ai = true } = {}) {
  const panel = page.getByText(/^Band \d\/6$/).locator('xpath=../..')
  if (ai) await expect(page.getByText(/AI grade unavailable/)).toBeVisible() // the run has settled
  await expect(page.locator('[data-guide="writing-analyze"]')).toHaveText(/^Analyze /)
  await expect.poll(async () => {
    const r = await panel.boundingBox()
    const navTop = await page.locator('nav.fixed').evaluate(n => n.getBoundingClientRect().top)
    return r.y >= 0 && r.y + r.height <= navTop
  }, { message: 'the Band panel must be fully in view after Analyze' }).toBe(true)
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  test(`after Analyze the Band panel is in view (${viewport.width}px)`, async ({ page }) => {
    const analyze = await setup(page, viewport)
    await analyze.click()
    await expectBandInView(page)
  })
}

// Malay free-write grades locally, so the button never disables (an AI run's
// disabled button drops focus on its own — GOAL #44): the scroll must not move it.
test('keyboard: Analyze via Enter shows the Band and keeps focus on the button', async ({ page }) => {
  const analyze = await setup(page, { width: 390, height: 844 }, 'Bahasa Melayu', KARANGAN)
  await analyze.focus()
  await page.keyboard.press('Enter')
  await expectBandInView(page, { ai: false })
  await expect(analyze).toBeFocused()
})
