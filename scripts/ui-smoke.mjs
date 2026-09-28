#!/usr/bin/env node
// scripts/ui-smoke.mjs — LOOK at the app the way a learner does, and fail on what
// unit tests can't see. Born from the 2026-09-28 bug hunt: 2600+ green unit tests
// missed a header that sat ON the title on every phone page, a false "Synced"
// badge and permanent white screens — all obvious in a screenshot.
//
// For every route × theme (dark, light) × width (390 phone, 1280 desktop) it
// records console errors, page errors, failed requests, horizontal overflow, a
// blank page, and header buttons overlapping the title/subtitle TEXT. Screenshots
// land in test-results/ui-smoke/ (gitignored) — open them; the numbers are the
// floor, not the look.
//
//   node scripts/ui-smoke.mjs                                   # production, all routes
//   node scripts/ui-smoke.mjs --base http://localhost:4199 --routes /study,/grammar
//
// Exit 1 on any finding. Runs signed out, so on the live site nothing reaches the
// cloud (cloud telemetry is signed-in only). Seeds the beginner deck through the
// real button so study screens have cards.
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : def
}
const BASE = arg('base', 'https://upg-igcse-malay-master.vercel.app').replace(/\/$/, '')
const ALL = ['/', '/study', '/roleplay', '/grammar', '/writing', '/import', '/settings', '/mistakes',
  '/word-families', '/cikgu', '/comprehension', '/pdf-reader', '/speaking', '/exam-rehearsal', '/listening',
  '/dictation', '/cloze-listening', '/smart-study', '/practice', '/saved-cloze', '/for-you', '/privacy', '/terms']
const ROUTES = arg('routes', '') ? arg('routes').split(',').map(r => r.trim()).filter(Boolean) : ALL
const OUT = path.resolve(arg('out', 'test-results/ui-smoke'))
fs.mkdirSync(OUT, { recursive: true })
// Vercel Web Analytics is only served on Vercel — a 404 for it on a local preview is expected.
const IGNORE = /\/_vercel\/insights\//

const browser = await chromium.launch()
const findings = []
let shots = 0

for (const width of [390, 1280]) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 800 } })
  const page = await ctx.newPage()
  let bucket = []
  // "Failed to load resource" console lines carry no URL; the response listener below
  // reports every failed request WITH its URL (and applies IGNORE), so skip them here.
  page.on('console', m => {
    if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) bucket.push(`console: ${m.text().slice(0, 200)}`)
  })
  page.on('pageerror', e => bucket.push(`page error: ${e.message.slice(0, 200)}`))
  page.on('response', r => { if (r.status() >= 400 && !IGNORE.test(r.url())) bucket.push(`HTTP ${r.status()} ${r.url().replace(BASE, '')}`) })

  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /maybe later/i }).click().catch(() => {})
  await page.getByRole('button', { name: /add the beginner deck/i }).click().catch(() => {})
  await page.waitForTimeout(500)
  if (!(await page.evaluate(() => localStorage.getItem('igcse-malay-store')))) {
    // Not the app (a login wall, an error page) — fail loudly, never report "clean".
    findings.push(`${width}px: the app did not load at ${BASE} (no saved state after the first visit)`)
    await ctx.close()
    continue
  }

  for (const theme of ['dark', 'light']) {
    await page.evaluate((t) => {
      const s = JSON.parse(localStorage.getItem('igcse-malay-store'))
      s.state.theme = t
      localStorage.setItem('igcse-malay-store', JSON.stringify(s))
    }, theme)
    for (const route of ROUTES) {
      bucket = []
      await page.goto(BASE + route, { waitUntil: 'networkidle' }).catch(e => bucket.push(`navigation: ${e.message.slice(0, 120)}`))
      await page.waitForTimeout(500)
      const m = await page.evaluate(() => {
        const text = (el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect() }
        const hdr = document.querySelector('header')
        const overlaps = []
        const title = hdr?.querySelector('div[aria-hidden="true"]')
        const sub = hdr?.querySelector('p')
        if (hdr && title && sub && hdr.getBoundingClientRect().height > 0) {
          const boxes = [text(title), text(sub)]
          for (const b of hdr.querySelectorAll('button')) {
            const q = b.getBoundingClientRect()
            if (!q.width) continue
            if (boxes.some(t => q.left < t.right && q.right > t.left && q.top < t.bottom && q.bottom > t.top))
              overlaps.push(b.getAttribute('aria-label') || b.textContent.trim())
          }
        }
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          bodyText: document.body.innerText.trim().length,
          overlaps,
        }
      })
      const where = `${route} ${theme} ${width}px`
      for (const b of bucket) findings.push(`${where}: ${b}`)
      if (m.overflow > 0) findings.push(`${where}: page scrolls sideways by ${m.overflow}px`)
      if (m.bodyText < 40) findings.push(`${where}: blank page`)
      for (const o of m.overlaps) findings.push(`${where}: header button "${o.split(' —')[0]}" overlaps the title text`)
      const file = path.join(OUT, `${width}-${theme}${route === '/' ? '-home' : route.replace(/\//g, '-')}.png`)
      await page.screenshot({ path: file })
      shots++
    }
  }
  await ctx.close()
}
await browser.close()

console.log(`ui-smoke: ${ROUTES.length} route(s) × 2 themes × 2 widths = ${shots} screenshots in ${path.relative(process.cwd(), OUT) || OUT}`)
if (findings.length) {
  console.log(`✗ ${findings.length} finding(s):`)
  for (const f of findings) console.log('  - ' + f)
  process.exit(1)
}
console.log('✓ no console/page errors, failed requests, sideways scroll, blank pages or header overlaps')
