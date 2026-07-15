#!/usr/bin/env node
// Run AFTER `npm run build`. Reads dist/ and asserts each sampled route has a
// unique title + self-canonical, and prints the head for evidence.
import { readFileSync } from 'node:fs'

const SAMPLE = ['/', '/study', '/writing', '/settings']
const pick = (html, re) => (html.match(re) || [])[1]
const rows = []
for (const r of SAMPLE) {
  const file = r === '/' ? 'dist/index.html' : `dist${r}/index.html`
  const html = readFileSync(file, 'utf8')
  const row = {
    route: r,
    title: pick(html, /<title>([\s\S]*?)<\/title>/),
    description: pick(html, /<meta name="description"[^>]*content="([^"]*)"/),
    canonical: pick(html, /<link rel="canonical"[^>]*href="([^"]*)"/),
    robots: pick(html, /<meta name="robots"[^>]*content="([^"]*)"/),
  }
  rows.push(row)
  console.log(`\n${r}\n  title:       ${row.title}\n  description: ${row.description?.slice(0, 70)}…\n  canonical:   ${row.canonical}\n  robots:      ${row.robots}`)
}
console.log('\n--- dist/robots.txt ---\n' + readFileSync('dist/robots.txt', 'utf8'))

const titles = rows.map(r => r.title)
if (new Set(titles).size !== titles.length) { console.error('\n✗ titles are NOT unique'); process.exit(1) }
for (const r of rows) {
  const expected = r.route === '/' ? '/' : r.route
  if (!r.canonical?.endsWith(expected)) { console.error(`\n✗ ${r.route} canonical wrong: ${r.canonical}`); process.exit(1) }
}
if (rows.find(r => r.route === '/settings')?.robots !== 'noindex, nofollow') { console.error('\n✗ /settings not noindex'); process.exit(1) }
console.log('\n✓ per-route heads unique + self-canonical + utility noindex')
