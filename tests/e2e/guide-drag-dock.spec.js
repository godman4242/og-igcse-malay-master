import { test, expect } from '@playwright/test'

// Phase 2 — drag the guide box to an edge → it docks + minimizes (controls still
// reachable); drag back to the centre → it detaches. Plus keyboard dock parity.
// Playwright's page.mouse synthesizes pointer events in Chromium, so the
// controller's pointerdown/move/up drag loop runs faithfully.
//
// NOTE: the e2e viewport is 390x844 (mobile). Centre ≈ (195, 422); the top band
// is y<=80, so (195, 12) lands in the 'top' zone and (195, 422) is the free centre.

test('guide: drag to an edge docks + minimizes; drag out detaches', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /Quick tour/i }).click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  const handle = popover.locator('.guide-drag-handle')
  await expect(handle).toBeVisible()

  // Drag the handle toward the top edge.
  const hb = await handle.boundingBox()
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
  await page.mouse.down()
  await page.mouse.move(195, 300, { steps: 6 })          // mid-flight: zones appear
  await expect(page.locator('.guide-dock-zones')).toBeVisible()
  await page.mouse.move(195, 12, { steps: 6 })           // into the top band
  await page.mouse.up()

  await expect(popover).toHaveClass(/guide-docked/)      // docked + minimized
  // Footer controls remain reachable while docked.
  await expect(popover.getByRole('button', { name: /Next/i })).toBeVisible()

  // Drag back to the centre → detaches.
  const hb2 = await handle.boundingBox()
  await page.mouse.move(hb2.x + hb2.width / 2, hb2.y + hb2.height / 2)
  await page.mouse.down()
  await page.mouse.move(195, 422, { steps: 8 })          // centre = no zone
  await page.mouse.up()
  await expect(popover).not.toHaveClass(/guide-docked/)
})

test('guide: docked box collapses control labels to icons; hover restores them (R4/T2)', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /Quick tour/i }).click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  const handle = popover.locator('.guide-drag-handle')
  await expect(handle).toBeVisible()

  // Dock to the top edge by POINTER drag. (Keyboard docking keeps focus inside the
  // box → :focus-within re-expands labels — pointer leaves the clean minimized state.)
  const hb = await handle.boundingBox()
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
  await page.mouse.down()
  await page.mouse.move(195, 300, { steps: 6 })
  await page.mouse.move(195, 12, { steps: 6 })
  await page.mouse.up()
  await expect(popover).toHaveClass(/guide-docked/)

  // Move the pointer off the box + drop focus → the minimized state: every control
  // LABEL is hidden, only the icon controls remain (the spec's "no visible label text").
  await page.mouse.move(195, 600)
  await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur() })
  await expect(popover.locator('.guide-btn-label:visible')).toHaveCount(0)
  await expect(popover.locator('.guide-btn-ico').first()).toBeVisible()
  // Controls stay reachable by name — aria-label survives the icon-only collapse.
  await expect(popover.getByRole('button', { name: /Next/i })).toBeVisible()

  // Hover the docked box → labels return (the box also re-expands its width).
  await popover.hover()
  await expect(popover.locator('.guide-btn-label:visible').first()).toBeVisible()
})

test('guide: keyboard docks via arrow keys (same arrow again floats)', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /Quick tour/i }).click()

  const popover = page.locator('.driver-popover.guide-theme')
  const handle = popover.locator('.guide-drag-handle')
  await handle.focus()
  await handle.press('ArrowUp')
  await expect(popover).toHaveClass(/guide-docked-top/)
  await handle.press('ArrowUp') // same edge again → float
  await expect(popover).not.toHaveClass(/guide-docked/)
})
