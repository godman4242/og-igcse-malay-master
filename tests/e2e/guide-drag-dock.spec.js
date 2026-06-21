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

test('guide: docked box collapses labels to PERSISTENT icons — hover does NOT re-expand (R4/T2★)', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /Quick tour/i }).click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  const handle = popover.locator('.guide-drag-handle')
  await expect(handle).toBeVisible()

  // Dock to the top edge by POINTER drag.
  const hb = await handle.boundingBox()
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
  await page.mouse.down()
  await page.mouse.move(195, 300, { steps: 6 })
  await page.mouse.move(195, 12, { steps: 6 })
  await page.mouse.up()
  await expect(popover).toHaveClass(/guide-docked/)

  // Minimized state: every control LABEL is hidden, only the icon controls remain.
  await page.mouse.move(195, 600)
  await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur() })
  await expect(popover.locator('.guide-btn-label:visible')).toHaveCount(0)
  await expect(popover.locator('.guide-btn-ico').first()).toBeVisible()
  // Controls stay reachable by name — aria-label survives the icon-only collapse.
  await expect(popover.getByRole('button', { name: /Next/i })).toBeVisible()

  // T2★: hovering the docked box must NOT restore labels — the icons are persistent.
  await popover.hover()
  await expect(popover.locator('.guide-btn-label:visible')).toHaveCount(0)
})

test('guide: docked box shows the step explanation in a SEPARATE box, not hidden (T2c★)', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /Quick tour/i }).click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  const handle = popover.locator('.guide-drag-handle')
  await expect(handle).toBeVisible()

  // Dock to the top edge by POINTER drag.
  const hb = await handle.boundingBox()
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
  await page.mouse.down()
  await page.mouse.move(195, 300, { steps: 6 })
  await page.mouse.move(195, 12, { steps: 6 })
  await page.mouse.up()
  await expect(popover).toHaveClass(/guide-docked/)

  // The step explanation renders as its OWN separate box when minimized (sketch
  // 1): visible, distinct from the icon-control strip (the footer), AND visually
  // boxed (its own border) — not bare, unstyled inline text crammed into the
  // narrow docked body.
  const desc = popover.locator('.driver-popover-description')
  await expect(desc).toBeVisible()
  await expect(desc).toContainText(/Tap Next/i)
  await expect(desc).toHaveCSS('border-top-width', '1px')   // the "separate box" treatment
  await expect(popover.locator('.driver-popover-footer')).toBeVisible()
  await expect(popover.locator('.guide-btn-ico').first()).toBeVisible()
})

test('guide: docked box keeps the N-of-M jumper visible + tappable to jump (T2b★)', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /Quick tour/i }).click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  const handle = popover.locator('.guide-drag-handle')
  await expect(handle).toBeVisible()

  // Dock to the top edge by POINTER drag.
  const hb = await handle.boundingBox()
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
  await page.mouse.down()
  await page.mouse.move(195, 300, { steps: 6 })
  await page.mouse.move(195, 12, { steps: 6 })
  await page.mouse.up()
  await expect(popover).toHaveClass(/guide-docked/)

  // The "N of M" jumper stays visible in the minimized strip, showing the step.
  const jump = popover.locator('.guide-progress-jump')
  await expect(jump).toBeVisible()
  await expect(jump).toHaveText('1')

  // Tapping it opens the input → typing a step jumps WHILE still minimized
  // (Quick steps 1→2 share route '/', so no navigation interrupts the dock).
  await jump.click()
  const input = popover.locator('.guide-progress-input')
  await expect(input).toBeVisible()
  await input.fill('2')
  await input.press('Enter')

  await expect(popover.locator('.guide-progress-jump')).toHaveText('2')
  await expect(popover).toHaveClass(/guide-docked/)
})

test('guide: double-clicking the docked box restores it — undocked, labels back (T6/R5d)', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /Quick tour/i }).click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()
  const handle = popover.locator('.guide-drag-handle')
  await expect(handle).toBeVisible()

  // Dock to the top edge by POINTER drag.
  const hb = await handle.boundingBox()
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
  await page.mouse.down()
  await page.mouse.move(195, 300, { steps: 6 })
  await page.mouse.move(195, 12, { steps: 6 })
  await page.mouse.up()
  await expect(popover).toHaveClass(/guide-docked/)
  await expect(popover.locator('.guide-btn-label:visible')).toHaveCount(0)

  // Double-click the box BODY (the title — not an action control) → restore.
  await popover.locator('.driver-popover-title').dblclick()
  await expect(popover).not.toHaveClass(/guide-docked/)         // undocked
  await expect(popover.locator('.guide-btn-label:visible').first()).toBeVisible() // labels back
})

test('guide: minimizing turns OFF the backdrop dim (free-roam); un-minimize restores it (Tdim★)', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /Quick tour/i }).click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()

  // Spotlight by default: the dim veil is active (no free-roam class on the root).
  await expect(page.locator('.driver-active.guide-explore')).toHaveCount(0)
  await expect(page.locator('.driver-overlay')).not.toHaveCSS('opacity', '0')

  // Minimize via keyboard dock (deterministic) → docks to the top edge.
  const handle = popover.locator('.guide-drag-handle')
  await handle.focus()
  await handle.press('ArrowUp')
  await expect(popover).toHaveClass(/guide-docked/)

  // Minimized = FREE-ROAM: the backdrop dim is OFF (whole page interactive +
  // undimmed) WHILE the box + step explanation stay visible (un-dimmed, not hidden).
  await expect(page.locator('.driver-active.guide-explore')).toHaveCount(1)
  await expect(page.locator('.driver-overlay')).toHaveCSS('opacity', '0')
  await expect(popover.locator('.driver-popover-description')).toBeVisible()

  // Un-minimize (same arrow floats it) → the spotlight dim returns.
  await handle.press('ArrowUp')
  await expect(popover).not.toHaveClass(/guide-docked/)
  await expect(page.locator('.driver-active.guide-explore')).toHaveCount(0)
  await expect(page.locator('.driver-overlay')).not.toHaveCSS('opacity', '0')
})

test('guide: closing while minimized clears the free-roam class from the root — no stale veil-off (Tdim★)', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: /Quick tour/i }).click()

  const popover = page.locator('.driver-popover.guide-theme')
  await expect(popover).toBeVisible()

  // Minimize (free-roam ON — the class is on driver's root, i.e. <body>).
  const handle = popover.locator('.guide-drag-handle')
  await handle.focus()
  await handle.press('ArrowUp')
  await expect(page.locator('.driver-active.guide-explore')).toHaveCount(1)

  // Close the tour while minimized.
  await popover.locator('.driver-popover-close-btn').click()
  await expect(popover).toHaveCount(0)

  // The veil-off class must NOT linger on the driver root after teardown — else a
  // re-opened tour (driver re-adds `driver-active` to <body>) would wrongly start
  // undimmed by re-matching `.driver-active.guide-explore`.
  const stale = await page.evaluate(() => document.body.classList.contains('guide-explore'))
  expect(stale).toBe(false)
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
