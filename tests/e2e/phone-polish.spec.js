import { test, expect } from '@playwright/test'

// 2026-09-28 bug hunt, README U7–U9 (GOAL.md bug-hunt #10) — three things a
// learner on a phone saw that no unit test could:
//   U7 the flashcard "Keys: Space=flip…" hint on a device with no keyboard;
//   U8 a very long unbroken word running off its chip on Import;
//   U9 Grammar tabs cut at the right edge, the rest hidden with no scroll cue.

async function freshWithDeck(page) {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /maybe later/i }).click().catch(() => {})
  await page.getByRole('button', { name: /add the beginner deck/i }).click()
  await expect(page.getByRole('button', { name: /add the beginner deck/i })).toHaveCount(0)
}

const KEYS_HINT = /Keys: Space=flip/

test.describe('phone (touch, 390 px)', () => {
  test.use({ hasTouch: true, isMobile: true })

  test('U7: no keyboard-shortcut hint under the flashcard', async ({ page }) => {
    await freshWithDeck(page)
    await page.goto('/study', { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: /next card/i })).toBeVisible()
    await expect(page.getByText(KEYS_HINT)).toBeHidden()
  })

  test('U8: a very long word stays inside its chip row on Import', async ({ page }) => {
    await freshWithDeck(page)
    await page.goto('/import', { waitUntil: 'networkidle' })
    const long = 'ketidakbertanggungjawabanmemperkemaskinikanpengkomputeran'
    await page.locator('textarea').first().fill(`Saya makan ${long}`)
    await page.getByRole('button', { name: /^process$/i }).click()
    const chip = page.getByRole('button', { name: long })
    await expect(chip).toBeVisible()
    const { chipRight, rowRight } = await chip.evaluate(el => ({
      chipRight: el.getBoundingClientRect().right,
      rowRight: el.parentElement.getBoundingClientRect().right,
    }))
    expect(chipRight).toBeLessThanOrEqual(rowRight + 0.5)
    // Selected, it also gets a details row (word · meaning · 🔊) — the word
    // wraps there too, and the speaker button stays reachable.
    await chip.click()
    const detail = page.locator('span.font-bold', { hasText: long })
    const d = await detail.evaluate(el => {
      const row = el.parentElement.getBoundingClientRect()
      return { word: el.getBoundingClientRect().right, speaker: el.parentElement.lastElementChild.getBoundingClientRect().right, row: row.right }
    })
    expect(d.word).toBeLessThanOrEqual(d.row + 0.5)
    expect(d.speaker).toBeLessThanOrEqual(d.row + 0.5)
  })

  test('U9: every Grammar tab is fully on screen', async ({ page }) => {
    await freshWithDeck(page)
    await page.goto('/grammar', { waitUntil: 'networkidle' })
    const tabs = page.locator('[data-guide="grammar-tabs"] > button')
    await expect(tabs.first()).toBeVisible()
    const vw = page.viewportSize().width
    for (const box of await tabs.evaluateAll(els => els.map(e => e.getBoundingClientRect().toJSON()))) {
      expect(box.left).toBeGreaterThanOrEqual(0)
      expect(box.right).toBeLessThanOrEqual(vw)
    }
  })
})

test.describe('desktop (mouse)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('U7 control: the keyboard hint still shows where there is a keyboard', async ({ page }) => {
    await freshWithDeck(page)
    await page.goto('/study', { waitUntil: 'networkidle' })
    await expect(page.getByText(KEYS_HINT)).toBeVisible()
  })
})
