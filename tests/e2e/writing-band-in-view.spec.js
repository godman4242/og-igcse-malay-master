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

// Malay free-write grades locally, so no AI run (the English AI case is the next test):
// the scroll must not move focus.
test('keyboard: Analyze via Enter shows the Band and keeps focus on the button', async ({ page }) => {
  const analyze = await setup(page, { width: 390, height: 844 }, 'Bahasa Melayu', KARANGAN)
  await analyze.focus()
  await page.keyboard.press('Enter')
  await expectBandInView(page, { ai: false })
  await expect(analyze).toBeFocused()
})

// 🐛 #44: English runs the AI grade, and a `disabled` button mid-run made Chromium
// drop focus to <body> — the next Tab restarted at the top of the page.
async function slowAI(page) {
  const calls = { n: 0 }
  await page.unroute('**/api/gemini')
  await page.route('**/api/gemini', async route => { calls.n++; await new Promise(r => setTimeout(r, 800)); await route.abort() })
  return calls
}

test('keyboard: an AI-graded Analyze keeps focus on the button through the run', async ({ page }) => {
  const analyze = await setup(page, { width: 390, height: 844 })
  await slowAI(page)
  await analyze.focus()
  await page.keyboard.press('Enter')
  await expect(analyze).toHaveText(/Analyzing with AI/)
  await expect(analyze).toBeFocused()
  await expectBandInView(page)
  await expect(analyze).toBeFocused()
})

test('keyboard: a second Enter mid-run is a no-op — one AI grade', async ({ page }) => {
  const analyze = await setup(page, { width: 390, height: 844 })
  const calls = await slowAI(page)
  await analyze.focus()
  await page.keyboard.press('Enter')
  await expect(analyze).toHaveText(/Analyzing with AI/)
  await page.keyboard.press('Enter')
  await expect(page.getByText(/AI grade unavailable/)).toBeVisible()
  await expect(analyze).toBeFocused()
  expect(calls.n).toBe(1)
})

// 🐛 #45: the keep-in-view stopped on ANY keydown, so a 2nd Enter/Space on the busy
// button ended it and the AI note then pushed the Band under the nav.
for (const key of ['Enter', ' ']) {
  test(`keyboard: a second ${key === ' ' ? 'Space' : 'Enter'} mid-run still leaves the Band in view`, async ({ page }) => {
    const analyze = await setup(page, { width: 390, height: 844 })
    await slowAI(page)
    await analyze.focus()
    await page.keyboard.press('Enter')
    await expect(analyze).toHaveText(/Analyzing with AI/)
    await page.keyboard.press(key)
    await expectBandInView(page)
  })
}

// …while a key that scrolls or moves focus still hands the page back to the learner.
for (const key of ['ArrowUp', 'PageUp', 'Shift+Tab']) {
  test(`keyboard: ${key} mid-run ends the keep-in-view`, async ({ page }) => {
    const analyze = await setup(page, { width: 390, height: 844 })
    await slowAI(page)
    await analyze.focus()
    await page.keyboard.press('Enter')
    await expect(analyze).toHaveText(/Analyzing with AI/)
    await page.evaluate(() => window.scrollTo(0, 0)) // where the learner's key would take them
    await page.keyboard.press(key)
    await expect(page.getByText(/AI grade unavailable/)).toBeVisible()
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })
}

// 🐛 #46: on a first visit the floating "New here?" card (fixed above the nav)
// sat on top of the Band panel the keep-in-view had just scrolled to.
test('first visit: the "New here?" card does not cover the Band', async ({ page }) => {
  const analyze = await setup(page, { width: 390, height: 844 })
  const offer = page.locator('[data-tour="guide-offer"]')
  await expect(offer).toBeVisible({ timeout: 5_000 })
  await analyze.click()
  await expectBandInView(page)
  const panel = page.getByText(/^Band \d\/6$/).locator('xpath=../..')
  await expect.poll(async () => {
    const r = await panel.boundingBox()
    const o = await offer.boundingBox()
    return r.y + r.height <= o.y
  }, { message: 'the Band panel must end above the offer card' }).toBe(true)
  await offer.getByRole('button', { name: 'Maybe later' }).click() // the offer still works
  await expect(offer).toBeHidden()
})
