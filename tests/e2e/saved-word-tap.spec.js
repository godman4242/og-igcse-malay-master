// Proof for the tappable saved-word REVIEW popover (spec 2026-06-02 v2, MVP).
// Tapping (or keyboard-selecting) an already-saved word while reading opens a
// read-only review popover (meaning + 🔊 + example). The hard quality bars are
// pinned here: it must NOT break text selection, must NOT hijack links, and MUST
// be keyboard-operable + Esc-dismissible with sane focus (WCAG 1.4.13 / 2.1.1).
// Run:
//   npx playwright test saved-word-tap --config tests/e2e/playwright.config.js
import { test, expect } from '@playwright/test'

async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance.getEntriesByType('resource')
      .find(r => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found')
    const mod = await import(url)
    window.__STORE = mod.default
  })
}

// Seed a saved word (with an example), inject prose containing it at the top of
// <main>, and wait until the highlighter has painted it (so it's truly tappable).
// `recall` selects which Tier-2 branch the popover opens in: false (default) →
// a STRONG, settled card (instant gloss); true → a New card (recall-first reveal).
async function seedAndInject(page, { word = 'keluarga', english = 'family', ex = 'Saya sayang keluarga saya.', prose, recall = false } = {}) {
  await page.evaluate(({ word, english, ex, prose, recall }) => {
    window.__STORE.getState().addCard({ m: word, e: english, ex, t: 'Saved' })
    if (!recall) {
      // Force a strong, not-yet-due Review card → instant mode.
      window.__STORE.setState(s => ({
        cards: s.cards.map(c => c.m === word
          ? { ...c, state: 2, due: new Date(Date.now() + 7 * 86400000).toISOString(), stability: 100, lapses: 0 }
          : c),
      }))
    }
    const p = document.createElement('p')
    p.id = 'hl-prose'
    p.textContent = prose
    document.querySelector('main').prepend(p)
    window.scrollTo(0, 0)
  }, { word, english, ex, prose, recall })
  await expect.poll(() => page.evaluate(() => {
    const h = 'highlights' in CSS && CSS.highlights.get('saved-words')
    return h ? h.size : 0
  }), { timeout: 4000 }).toBeGreaterThan(0)
}

// Centre viewport coords of the first occurrence of `word` inside #hl-prose.
async function wordCenter(page, word) {
  return page.evaluate((word) => {
    const host = document.querySelector('#hl-prose')
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
    const node = walker.nextNode()
    const i = node.textContent.toLowerCase().indexOf(word.toLowerCase())
    const r = document.createRange()
    r.setStart(node, i); r.setEnd(node, i + word.length)
    const rect = r.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }, word)
}

const reviewDialog = (page) => page.getByRole('dialog', { name: /Review saved word/i })

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('igcse-malay-store'))
  await page.reload({ waitUntil: 'networkidle' })
  await bindStore(page)
})

test('tapping a highlighted word opens the review popover (meaning + 🔊 + example) — dark + light', async ({ page }) => {
  await seedAndInject(page, { prose: 'Saya jumpa keluarga di bandar semalam.' })
  const c = await wordCenter(page, 'keluarga')
  await page.mouse.click(c.x, c.y)

  await expect(reviewDialog(page)).toBeVisible()
  await expect(reviewDialog(page)).toContainText('family')
  await expect(reviewDialog(page)).toContainText(/Saya sayang keluarga/)
  await expect(reviewDialog(page).getByRole('button', { name: /Pronounce/i })).toBeVisible()
  await expect(reviewDialog(page).getByRole('button', { name: /Review in Study/i })).toBeVisible()
  await page.screenshot({ path: 'test-results/saved-word-tap/dark.png', fullPage: false })

  // Light mode
  await page.keyboard.press('Escape')
  await page.evaluate(() => window.__STORE.setState({ theme: 'light' }))
  await page.waitForTimeout(150)
  const c2 = await wordCenter(page, 'keluarga')
  await page.mouse.click(c2.x, c2.y)
  await expect(reviewDialog(page)).toBeVisible()
  await page.screenshot({ path: 'test-results/saved-word-tap/light.png', fullPage: false })
})

test('a drag-selection does NOT open the review popover (selection stays intact)', async ({ page }) => {
  // Stub translate so SelectionToCard (which DOES fire on a drag) never hits the network.
  await page.route('**/api/translate', r => r.abort())
  await page.route('**/translate_a/single**', r => r.fulfill({
    contentType: 'application/json',
    body: JSON.stringify([[['a lot', 'sangat banyak', null, null, 10]], null, 'ms']),
  }))
  await seedAndInject(page, { prose: 'Saya sayang keluarga saya sangat banyak hari ini.' })

  // Drag across the non-saved tail ("sangat banyak") — a real selection gesture.
  const start = await wordCenter(page, 'sangat')
  const end = await wordCenter(page, 'banyak')
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y, { steps: 8 })
  await page.mouse.up()

  await expect(reviewDialog(page)).toHaveCount(0)
  expect(await page.evaluate(() => window.getSelection().toString().trim().length)).toBeGreaterThan(0)
})

test('tapping a non-saved word does nothing', async ({ page }) => {
  await seedAndInject(page, { prose: 'Saya sayang keluarga saya sangat.' })
  const c = await wordCenter(page, 'sangat') // not a saved card
  await page.mouse.click(c.x, c.y)
  await page.waitForTimeout(250)
  await expect(reviewDialog(page)).toHaveCount(0)
})

test('a highlighted word inside a link is NOT hijacked (link still works)', async ({ page }) => {
  await seedAndInject(page, { prose: 'Lihat keluarga di sini.' })
  // Replace the prose with a link wrapping the saved word.
  await page.evaluate(() => {
    const p = document.querySelector('#hl-prose')
    p.innerHTML = 'Lihat <a href="#tappable-link-test" id="lnk">keluarga</a> di sini.'
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(300)
  const rect = await page.evaluate(() => {
    const r = document.querySelector('#lnk').getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })
  await page.mouse.click(rect.x, rect.y)

  await expect(reviewDialog(page)).toHaveCount(0) // not hijacked
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#tappable-link-test') // link fired
})

test('keyboard-selecting a saved word opens the review popover; Esc dismisses with focus restored (WCAG 1.4.13/2.1.1)', async ({ page }) => {
  await seedAndInject(page, { prose: 'Saya jumpa keluarga di sini.' })

  // No pointer involved — set a real text selection over the saved word, which
  // fires selectionchange (the MVP keyboard trigger, e.g. Shift+Arrow).
  await page.evaluate(() => {
    const host = document.querySelector('#hl-prose')
    const node = document.createTreeWalker(host, NodeFilter.SHOW_TEXT).nextNode()
    const i = node.textContent.indexOf('keluarga')
    const range = document.createRange()
    range.setStart(node, i); range.setEnd(node, i + 'keluarga'.length)
    const sel = window.getSelection()
    sel.removeAllRanges(); sel.addRange(range)
  })

  const dialog = reviewDialog(page)
  await expect(dialog).toBeVisible()
  // Accessible name present; focus moved into the dialog.
  await expect(dialog).toHaveAttribute('aria-label', /Review saved word/i)
  expect(await page.evaluate(() => document.activeElement?.closest('[data-saved-word-popover]') !== null)).toBe(true)

  // Esc dismisses without obscuring/trapping; focus returns out of the dialog.
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  expect(await page.evaluate(() => document.activeElement?.closest('[data-saved-word-popover]') )).toBeNull()
})

test('dismisses on outside-click and on scroll', async ({ page }) => {
  await seedAndInject(page, { prose: 'Saya jumpa keluarga di bandar.' })

  // Outside click
  let c = await wordCenter(page, 'keluarga')
  await page.mouse.click(c.x, c.y)
  await expect(reviewDialog(page)).toBeVisible()
  await page.mouse.click(5, 5) // far from the popover
  await expect(reviewDialog(page)).toHaveCount(0)

  // Scroll
  c = await wordCenter(page, 'keluarga')
  await page.mouse.click(c.x, c.y)
  await expect(reviewDialog(page)).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')))
  await expect(reviewDialog(page)).toHaveCount(0)
})

// ─── Tier-2: recall-first reveal + soft forgot-signal ──────────────────────────

test('Tier-2: a DUE/weak word opens in recall mode — meaning hidden until "Show meaning"', async ({ page }) => {
  await seedAndInject(page, { prose: 'Saya jumpa keluarga di sini.', recall: true })
  const c = await wordCenter(page, 'keluarga')
  await page.mouse.click(c.x, c.y)

  const dialog = reviewDialog(page)
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Show meaning/i })).toBeVisible()
  await expect(dialog).not.toContainText('family') // answer hidden during retrieval

  await dialog.getByRole('button', { name: /Show meaning/i }).click()
  await expect(dialog).toContainText('family') // revealed = feedback
  await expect(dialog.getByRole('button', { name: /I forgot this/i })).toBeVisible()
  await page.screenshot({ path: 'test-results/saved-word-tap/recall.png', fullPage: false })
})

test('Tier-2: a STRONG word opens instant (no "Show meaning", no forgot-signal)', async ({ page }) => {
  await seedAndInject(page, { prose: 'Saya jumpa keluarga di sini.' }) // recall:false → strong
  const c = await wordCenter(page, 'keluarga')
  await page.mouse.click(c.x, c.y)

  const dialog = reviewDialog(page)
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('family') // shown immediately
  await expect(dialog.getByRole('button', { name: /Show meaning/i })).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: /I forgot this/i })).toHaveCount(0)
})

test('Tier-2 GUARDRAIL: "I forgot this" logs exactly ONE mistake and NEVER reschedules the card', async ({ page }) => {
  await seedAndInject(page, { prose: 'Saya jumpa keluarga di sini.', recall: true })

  const before = await page.evaluate(() => {
    const card = window.__STORE.getState().cards.find(c => c.m === 'keluarga')
    return { due: card.due, stability: card.stability, state: card.state, lapses: card.lapses, mistakes: window.__STORE.getState().mistakes.length }
  })

  const c = await wordCenter(page, 'keluarga')
  await page.mouse.click(c.x, c.y)
  const dialog = reviewDialog(page)
  await dialog.getByRole('button', { name: /Show meaning/i }).click()
  await dialog.getByRole('button', { name: /I forgot this/i }).click()
  await expect(dialog).toContainText(/Added to your fix-up/i)

  const after = await page.evaluate(() => {
    const card = window.__STORE.getState().cards.find(c => c.m === 'keluarga')
    return { due: card.due, stability: card.stability, state: card.state, lapses: card.lapses, mistakes: window.__STORE.getState().mistakes.length }
  })

  // Exactly one mistake logged…
  expect(after.mistakes).toBe(before.mistakes + 1)
  // …and the card's FSRS scheduling is byte-identical (the hard guardrail).
  expect(after.due).toBe(before.due)
  expect(after.stability).toBe(before.stability)
  expect(after.state).toBe(before.state)
  expect(after.lapses).toBe(before.lapses)
})
