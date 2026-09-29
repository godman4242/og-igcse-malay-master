import { test, expect } from '@playwright/test'

// 🐛 #42: pressing Analyze while the essay box has focus blurs it → theater mode
// ends and the example panel mounts above → the button jumps before the mouse is
// released, so the first click never fires. A real press is held ~100–150 ms;
// Playwright's instant click() releases before React re-renders and hides it.

const ESSAY = `Dear Sir,

I am writing to complain about the noise from the new factory near my home. Every night the machines run until midnight and my family cannot sleep. I hope you will take action soon.

Yours faithfully,
Ali`

for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  test(`one mouse press on Analyze with the essay box focused grades it (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport)
    // The local band is the assertion; keep the AI grade request off the network.
    await page.route('**/api/gemini', route => route.abort())
    await page.goto('/writing', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'English', exact: true }).click()

    const box = page.locator('[data-guide="writing-compose"]')
    await box.click()
    await box.fill(ESSAY)
    const analyze = page.locator('[data-guide="writing-analyze"]')
    await analyze.scrollIntoViewIfNeeded()
    await box.focus()
    await expect(box).toBeFocused()

    const r = await analyze.boundingBox()
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(150)
    const held = await analyze.boundingBox()
    await page.mouse.up()

    expect(held.y, 'the button must not move while it is pressed').toBe(r.y)
    await expect(page.getByText(/^Band \d\/6$/)).toBeVisible()
    // Theater mode still lets go once the essay is graded — chrome comes back.
    await expect(box).not.toBeFocused()
  })
}
