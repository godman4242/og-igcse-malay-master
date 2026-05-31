// Smoke for friction #1 — the Practice hub. Verifies the bottom-nav "Practice"
// tab opens /practice, the page renders every skill group + tile (nothing
// buried), and a tile navigates to its surface. Screenshot → test-results/smoke/.
// Run: npx playwright test practice-hub --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

const GROUPS = ['Speaking', 'Writing', 'Reading & Listening', 'Grammar & Vocab', 'Review', 'Tools']
const TILES = [
  'Roleplay', 'Speaking', 'Cikgu Maya', 'Writing', 'Mistakes', 'Comprehension',
  'Listening', 'PDF Reader', 'Grammar', 'Word Families', 'Study', 'Exam Rehearsal',
  'Import Text', 'Settings',
]

test('Practice tab opens the hub with every surface grouped', async ({ page }) => {
  await page.goto('/')

  // Reach the hub from the bottom nav (not by typing the URL).
  await page.getByRole('button', { name: /Practice — all learning surfaces/i }).click()
  await expect(page).toHaveURL(/\/practice$/)

  // Every skill group heading is present.
  for (const heading of GROUPS) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  }

  // Every surface tile is present (nothing buried). Scope to <main> so the
  // bottom-nav tabs (Study/Grammar/Roleplay) don't collide with the tiles.
  // Tile accessible name is the label, optionally suffixed with ", N due".
  const content = page.getByRole('main')
  for (const label of TILES) {
    await expect(content.getByRole('button', { name: new RegExp('^' + label) })).toBeVisible()
  }

  await page.screenshot({ path: 'test-results/smoke/5-practice-hub-dark.png', fullPage: true })

  // A tile navigates to its surface.
  await content.getByRole('button', { name: /^Speaking/ }).click()
  await expect(page).toHaveURL(/\/speaking$/)
})
