import { test, expect } from '@playwright/test'

// Each route's single <h1> is its own page name (sr-only), not the brand codename.
// /practice, /dictation, /cloze-listening and /for-you are here deliberately: each once
// carried a second, page-level heading that collided with the sr-only one (the 2026-07-15
// regression that turned e2e CI red). Keep them in the loop so the invariant stays pinned.
for (const [path, name] of [
  ['/study', 'Study'], ['/writing', 'Writing'], ['/grammar', 'Grammar'],
  ['/practice', 'Practice'], ['/dictation', 'Dictation'],
  ['/cloze-listening', 'Cloze Listening'], ['/for-you', 'For You'],
]) {
  test(`H1 on ${path} is "${name}"`, async ({ page }) => {
    // networkidle, NOT the default 'load': every route but Dashboard is React.lazy, so
    // `goto` resolves while Suspense is still pending and ONLY Layout's sr-only <h1>
    // exists. A count assertion there passes on the fallback and never re-checks — it
    // would sail straight past the very double-<h1> regression this test exists to catch.
    await page.goto(path, { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveText(name)
    await expect(page.locator('h1', { hasText: 'ooga' })).toHaveCount(0)
  })
}
