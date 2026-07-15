# Crawler-facing SEO — build-time per-route `<head>` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each route serves its own `<title>`/description/canonical/OG in the raw HTML a crawler receives, generated at build time — no SSR, no new dependency.

**Architecture:** One pure source-of-truth table (`routeMeta.js`) + pure string builders (`seoHead.js`) + a thin `apply:'build'` Vite plugin that, in `generateBundle`, reads the built `index.html` shell and `emitFile`s a per-route `dist/<route>/index.html` (plus `robots.txt`/`sitemap.xml`) with each route's head swapped in. Vercel serves those static files to crawlers (filesystem beats the SPA catch-all rewrite); the app boots client-side exactly as today. Per-deployment `VITE_BASE_URL`/`VITE_NOINDEX` make `upg-` indexable and the `og-` mirror `noindex`.

**Tech Stack:** Vite 8 (`generateBundle` + `this.emitFile`, `process.env` for build-time flags), React 19, react-router 7, Vitest (node + `// @vitest-environment jsdom`), Playwright e2e.

**Design spec:** `docs/superpowers/specs/2026-07-14-crawler-seo-design.md`

## Global Constraints

*(Every task implicitly includes these — exact values from the spec.)*
- **No new dependencies.** Dependency-free string templating only.
- **No `STORE_VERSION` change** — this touches no app state.
- Vite **8.0.14**, React **19.2.4**, react-router **7.17** — do not change versions.
- Plugin is **`apply: 'build'`** (never runs in dev/serve) and **`enforce: 'post'`** (its `generateBundle` runs after Vite's build-html plugin, so `bundle['index.html']` is the final HTML with hashed asset tags).
- **`ROUTE_META` is the crawler-facing source of truth** for all 21 routes. Utility routes = `/settings`, `/import`, `/mistakes` (`index: false`); every other route `index: true`.
- **Canonical / og:url use the no-slash form** for sub-routes (`{base}/study`), and `{base}/` only for root — matching Vercel clean-URL serving.
- **Delete** `public/robots.txt` + `public/sitemap.xml` (their hardcoded `upg-` values are the bug; the plugin becomes the sole producer). Emitting `robots.txt` while `public/robots.txt` still exists is a duplicate-asset build error.
- The per-route `index.html` files **may** end up in the PWA precache — that is **harmless** (workbox dedupes; the same app boots to the same route). Do not add ordering hacks to prevent it.
- Gate must stay green: `npm run build` (0 errors) + `npm run test:run` (~2174 tests) + `npm run lint` (0 errors, 3 known warnings).
- `upg-` needs **no env var** (defaults to the upg URL). Only the `og-` Vercel project sets `VITE_BASE_URL` + `VITE_NOINDEX=true`.

---

## File Structure

- **Create** `src/lib/routeMeta.js` — `SITE` constants + `ROUTE_META` (21 routes) + `metaForPath()`. Pure; imported by the plugin (build) **and** `Layout.jsx` (runtime).
- **Create** `src/lib/seoHead.js` — pure `injectRouteMeta()`, `genRobots()`, `genSitemap()`. Imports `routeMeta.js`.
- **Create** `src/lib/__tests__/routeMeta.test.js`, `src/lib/__tests__/seoHead.test.js`, `src/components/__tests__/meta.test.js`.
- **Create** `scripts/verify-seo.mjs` — reads `dist/` after a build and prints/asserts per-route heads + robots (evidence).
- **Create** `tests/e2e/seo-h1.spec.js` — asserts each route's H1 is its page name.
- **Modify** `vite.config.js` — add the `seoPrerender()` plugin.
- **Modify** `src/components/Layout.jsx` — demote the brand `<h1>` to an `aria-hidden` element; add a route-derived `sr-only <h1>`.
- **Modify** `src/components/Meta.jsx` — also upsert canonical + OG/Twitter on client navigation (Task 5, flagged optional).
- **Delete** `public/robots.txt`, `public/sitemap.xml`.
- **Docs** (Task 6): `RESUME_HERE.md`, `docs/loop/GOAL.md`, `README.md`, `CLAUDE.md`.

---

## Task 1: `routeMeta.js` — single source of truth

**Files:**
- Create: `src/lib/routeMeta.js`
- Test: `src/lib/__tests__/routeMeta.test.js`

**Interfaces:**
- Produces: `SITE` (`{ name, defaultBaseUrl, ogImage }`), `ROUTE_META` (`Record<path, { name, title, description, index }>`), `metaForPath(path) → entry` (falls back to `ROUTE_META['/']`).

- [ ] **Step 1: Write the failing test** — `src/lib/__tests__/routeMeta.test.js`

```js
import { describe, it, expect } from 'vitest'
import { ROUTE_META, metaForPath, SITE } from '../routeMeta.js'

// The 21 routes wired in src/App.jsx (the `*` catch-all redirects to `/`).
const ROUTES = ['/', '/study', '/roleplay', '/grammar', '/writing', '/import', '/settings',
  '/mistakes', '/word-families', '/cikgu', '/comprehension', '/pdf-reader', '/speaking',
  '/exam-rehearsal', '/listening', '/dictation', '/cloze-listening', '/smart-study',
  '/practice', '/saved-cloze', '/for-you']

describe('ROUTE_META', () => {
  it('covers exactly the 21 app routes', () => {
    expect(Object.keys(ROUTE_META).sort()).toEqual([...ROUTES].sort())
  })
  it('every entry has a non-empty name, title and description', () => {
    for (const [p, m] of Object.entries(ROUTE_META)) {
      expect(m.name, p).toBeTruthy()
      expect(m.title, p).toBeTruthy()
      expect(m.description, p).toBeTruthy()
    }
  })
  it('titles and descriptions are unique across routes', () => {
    const titles = Object.values(ROUTE_META).map(m => m.title)
    const descs = Object.values(ROUTE_META).map(m => m.description)
    expect(new Set(titles).size).toBe(titles.length)
    expect(new Set(descs).size).toBe(descs.length)
  })
  it('only settings/import/mistakes are noindex', () => {
    const noindex = Object.entries(ROUTE_META).filter(([, m]) => m.index === false).map(([p]) => p).sort()
    expect(noindex).toEqual(['/import', '/mistakes', '/settings'])
  })
  it('metaForPath falls back to home for unknown paths', () => {
    expect(metaForPath('/nope')).toBe(ROUTE_META['/'])
    expect(metaForPath('/study').name).toBe('Study')
  })
  it('SITE.defaultBaseUrl is the upg host with no trailing slash', () => {
    expect(SITE.defaultBaseUrl).toBe('https://upg-igcse-malay-master.vercel.app')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- routeMeta`
Expected: FAIL — `Cannot find module '../routeMeta.js'`.

- [ ] **Step 3: Write minimal implementation** — `src/lib/routeMeta.js`

```js
// Single crawler-facing source of truth for per-route <head> meta.
// Consumed at BUILD time by the seoPrerender Vite plugin (raw HTML the crawler
// sees) and at RUNTIME by Layout.jsx (the sr-only per-page <h1>).
// Titles/descriptions mirror what each page passes to <Meta> — keep them in
// sync when a page's <Meta> copy changes. Two deliberate divergences:
//   - '/' uses the marketing title (a logged-in user's tab still shows
//     "Dashboard | …" via the client <Meta>).
//   - dynamic pages (/study, /comprehension) carry a stable BASE title here;
//     the client <Meta> refines it at runtime (deck / passage name).
export const SITE = {
  name: 'IGCSE Malay Master',
  defaultBaseUrl: 'https://upg-igcse-malay-master.vercel.app',
  ogImage: '/og-image.png',
}

export const ROUTE_META = {
  '/':                { name: 'Home',           index: true,  title: 'IGCSE Malay Master — Flashcards, AI Roleplay & Exam Revision', description: 'IGCSE Malay revision with spaced-repetition flashcards, AI roleplay and writing feedback, grammar drills, pronunciation practice and exam rehearsal. Supports IGCSE English too.' },
  '/study':           { name: 'Study',          index: true,  title: 'Study | IGCSE Malay Master', description: 'Master IGCSE Malay vocabulary with spaced repetition and multiple interactive study modes.' },
  '/smart-study':     { name: 'Smart Study',     index: true,  title: 'Smart Study | IGCSE Malay Master', description: 'An adaptive interleaved IGCSE session that mixes vocabulary, grammar and speaking around the words you owe today.' },
  '/practice':        { name: 'Practice',        index: true,  title: 'Practice — IGCSE Malay Master', description: 'Every learning surface in one place: speaking, writing, reading, listening, grammar, review and tools.' },
  '/for-you':         { name: 'For You',         index: true,  title: 'For You | IGCSE Malay Master', description: "Your personalized IGCSE study home — today's plan, a session picked for your weak spots, and where you stand." },
  '/word-families':   { name: 'Word Families',   index: true,  title: 'Word Families | IGCSE Malay Master', description: 'Explore Malay root words and their derived forms (imbuhan). Visual family trees to help you master vocabulary.' },
  '/comprehension':   { name: 'Comprehension',   index: true,  title: 'Comprehension | IGCSE Malay Master', description: 'Practice IGCSE reading skills with bilingual passages, interactive dictionary lookups, and AI-generated questions.' },
  '/writing':         { name: 'Writing',         index: true,  title: 'Writing Analyzer | IGCSE Malay Master', description: 'Analyze your IGCSE writing across 21 formats with band-6 exemplars and per-paragraph feedback in Malay or English.' },
  '/speaking':        { name: 'Speaking',        index: true,  title: 'Speaking Practice | IGCSE Malay Master', description: 'IGCSE speaking practice — speak on a topic, get a calibrated band and AI coaching in Malay or English.' },
  '/listening':       { name: 'Listening',       index: true,  title: 'Listening Practice | IGCSE Malay Master', description: 'IGCSE listening practice — hear a passage, then answer comprehension questions with instant feedback.' },
  '/dictation':       { name: 'Dictation',       index: true,  title: 'Dictation — IGCSE Malay Master', description: 'Listen to a sentence and type what you hear — spelling, listening and vocabulary in one exercise.' },
  '/cloze-listening': { name: 'Cloze Listening', index: true,  title: 'Cloze Listening — IGCSE Malay Master', description: 'Listen to a sentence and fill the missing words in its transcript — listening and vocabulary retrieval in one drill.' },
  '/grammar':         { name: 'Grammar',         index: true,  title: 'Grammar Drills | IGCSE Malay Master', description: 'Interactive spaced IGCSE grammar drills — Malay imbuhan and tense markers, English confusables and agreement.' },
  '/roleplay':        { name: 'Roleplay',        index: true,  title: 'Oral Practice | IGCSE Malay Master', description: 'Simulate IGCSE Paper 3 speaking exams. Interactive roleplay scenarios with real-time feedback on your Malay pronunciation and grammar.' },
  '/cikgu':           { name: 'Cikgu Maya',      index: true,  title: 'Cikgu Maya AI Tutor | IGCSE Malay Master', description: 'Ask Cikgu Maya, the AI grammar tutor, about IGCSE Malay and English — imbuhan, tenses, vocabulary, writing and exam tips.' },
  '/exam-rehearsal':  { name: 'Exam Rehearsal',  index: true,  title: 'Exam Rehearsal | IGCSE Malay Master', description: 'A timed IGCSE exam rehearsal across comprehension, listening, writing and speaking with a composite Readiness score.' },
  '/pdf-reader':      { name: 'PDF Reader',      index: true,  title: 'PDF Reader | IGCSE Malay Master', description: 'Read a Malay PDF, past-paper photo or recording with tap-to-reveal translation and build flashcards from the text.' },
  '/saved-cloze':     { name: 'Saved Words',     index: true,  title: 'Practise saved words | IGCSE Malay Master', description: 'Produce your saved Malay words in context — a generative retrieval session that feeds your spaced-repetition schedule.' },
  '/settings':        { name: 'Settings',        index: false, title: 'Settings | IGCSE Malay Master', description: 'Choose your study language, appearance and accessibility options, back up your progress, and connect an AI key.' },
  '/import':          { name: 'Import',          index: false, title: 'Import Words | IGCSE Malay Master', description: 'Paste text or upload a PDF and turn unknown words into spaced-repetition flashcards for IGCSE Malay or English.' },
  '/mistakes':        { name: 'Mistake Journal', index: false, title: 'Mistake Journal | IGCSE Malay Master', description: 'Every mistake you make is logged, clustered and re-drilled — turn your slips into targeted IGCSE revision.' },
}

export function metaForPath(path) {
  return ROUTE_META[path] ?? ROUTE_META['/']
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- routeMeta`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/routeMeta.js src/lib/__tests__/routeMeta.test.js
git commit -m "feat(seo): routeMeta — single source of truth for per-route head"
```

---

## Task 2: `seoHead.js` — pure head injection + robots + sitemap

**Files:**
- Create: `src/lib/seoHead.js`
- Test: `src/lib/__tests__/seoHead.test.js`

**Interfaces:**
- Consumes: `ROUTE_META`, `SITE` from Task 1.
- Produces:
  - `injectRouteMeta(html, { meta, baseUrl?, path, noindex? }) → string` — upserts title, description, canonical, og:url/title/description, twitter:title/description, robots; and swaps every occurrence of `SITE.defaultBaseUrl` for `baseUrl` (fixes og:image / JSON-LD host for the `og-` build). Preserves all other tags (scripts, icons, fonts) untouched.
  - `genRobots({ baseUrl?, noindex? }) → string`
  - `genSitemap({ baseUrl? }) → string` — lists only `index !== false` routes.

- [ ] **Step 1: Write the failing test** — `src/lib/__tests__/seoHead.test.js`

```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { injectRouteMeta, genRobots, genSitemap } from '../seoHead.js'
import { ROUTE_META, SITE } from '../routeMeta.js'

// Read the REAL index.html so the transform is tested against the live shell —
// if the shell's head changes shape, this test guides the fix.
const SHELL = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8')

describe('injectRouteMeta', () => {
  it('sets the route title, description and self-canonical (no trailing slash for sub-routes)', () => {
    const out = injectRouteMeta(SHELL, { meta: ROUTE_META['/writing'], path: '/writing' })
    expect(out).toContain('<title>Writing Analyzer | IGCSE Malay Master</title>')
    expect(out).toContain('content="Analyze your IGCSE writing across 21 formats')
    expect(out).toContain(`href="${SITE.defaultBaseUrl}/writing"`)
    expect(out).toContain(`content="${SITE.defaultBaseUrl}/writing"`) // og:url
  })
  it('root canonical keeps the trailing slash', () => {
    const out = injectRouteMeta(SHELL, { meta: ROUTE_META['/'], path: '/' })
    expect(out).toContain(`<link rel="canonical" href="${SITE.defaultBaseUrl}/"`)
  })
  it('sets per-route og:title / twitter:title', () => {
    const out = injectRouteMeta(SHELL, { meta: ROUTE_META['/speaking'], path: '/speaking' })
    expect(out).toContain('property="og:title" content="Speaking Practice | IGCSE Malay Master"')
    expect(out).toContain('name="twitter:title" content="Speaking Practice | IGCSE Malay Master"')
  })
  it('marks utility routes noindex, content routes index', () => {
    const settings = injectRouteMeta(SHELL, { meta: ROUTE_META['/settings'], path: '/settings' })
    expect(settings).toContain('name="robots" content="noindex, nofollow"')
    const study = injectRouteMeta(SHELL, { meta: ROUTE_META['/study'], path: '/study' })
    expect(study).toContain('name="robots" content="index, follow"')
  })
  it('noindex:true forces noindex even on a content route', () => {
    const out = injectRouteMeta(SHELL, { meta: ROUTE_META['/study'], path: '/study', noindex: true })
    expect(out).toContain('name="robots" content="noindex, nofollow"')
  })
  it('swaps the default host everywhere for a different baseUrl (og- mirror)', () => {
    const base = 'https://og-igcse-malay-master.vercel.app'
    const out = injectRouteMeta(SHELL, { meta: ROUTE_META['/'], path: '/', baseUrl: base })
    expect(out).not.toContain('upg-igcse-malay-master')       // og:image, JSON-LD, canonical all swapped
    expect(out).toContain(`href="${base}/"`)
  })
  it('preserves the module script tag untouched', () => {
    const shell = '<html><head><title>x</title></head><body><script type="module" src="/assets/index-abc.js"></script></body></html>'
    const out = injectRouteMeta(shell, { meta: ROUTE_META['/study'], path: '/study' })
    expect(out).toContain('<script type="module" src="/assets/index-abc.js"></script>')
    expect(out).toContain('<title>Study | IGCSE Malay Master</title>')
  })
  it('inserts missing tags on a minimal shell (upsert, not just replace)', () => {
    const shell = '<html><head></head><body></body></html>'
    const out = injectRouteMeta(shell, { meta: ROUTE_META['/study'], path: '/study' })
    expect(out).toContain('<title>Study | IGCSE Malay Master</title>')
    expect(out).toContain('rel="canonical"')
    expect(out).toContain('name="description"')
  })
})

describe('genRobots', () => {
  it('indexable build allows all + points at the sitemap', () => {
    const r = genRobots({ baseUrl: SITE.defaultBaseUrl })
    expect(r).toContain('Allow: /')
    expect(r).toContain(`Sitemap: ${SITE.defaultBaseUrl}/sitemap.xml`)
  })
  it('noindex build disallows everything and omits the sitemap line', () => {
    const r = genRobots({ noindex: true })
    expect(r).toContain('Disallow: /')
    expect(r).not.toContain('Sitemap:')
  })
})

describe('genSitemap', () => {
  it('lists content routes with the base host and excludes utility routes', () => {
    const s = genSitemap({ baseUrl: SITE.defaultBaseUrl })
    expect(s).toContain('<?xml version="1.0"')
    expect(s).toContain(`<loc>${SITE.defaultBaseUrl}/study</loc>`)
    expect(s).toContain(`<loc>${SITE.defaultBaseUrl}/</loc>`)
    expect(s).not.toContain('/settings')
    expect(s).not.toContain('/import')
    expect(s).not.toContain('/mistakes')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- seoHead`
Expected: FAIL — `Cannot find module '../seoHead.js'`.

- [ ] **Step 3: Write minimal implementation** — `src/lib/seoHead.js`

```js
// Pure builders for the crawler-facing <head>, robots.txt and sitemap.xml.
// No I/O, no browser globals — unit-tested against the real index.html shell.
import { ROUTE_META, SITE } from './routeMeta.js'

const DEFAULT_BASE = SITE.defaultBaseUrl
const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escAttr = (s) => escText(s).replace(/"/g, '&quot;')
const clean = (base) => base.replace(/\/+$/, '')

function setTitle(html, title) {
  const t = `<title>${escText(title)}</title>`
  return /<title>[\s\S]*?<\/title>/i.test(html)
    ? html.replace(/<title>[\s\S]*?<\/title>/i, t)
    : html.replace(/<\/head>/i, `  ${t}\n</head>`)
}
function setMeta(html, attr, key, content) {
  const re = new RegExp(`(<meta ${attr}="${key}"[^>]*content=")[^"]*(")`, 'i')
  const tag = `<meta ${attr}="${key}" content="${escAttr(content)}" />`
  return re.test(html) ? html.replace(re, `$1${escAttr(content)}$2`) : html.replace(/<\/head>/i, `  ${tag}\n</head>`)
}
function setCanonical(html, href) {
  const re = /(<link rel="canonical"[^>]*href=")[^"]*(")/i
  const tag = `<link rel="canonical" href="${escAttr(href)}" />`
  return re.test(html) ? html.replace(re, `$1${escAttr(href)}$2`) : html.replace(/<\/head>/i, `  ${tag}\n</head>`)
}

export function injectRouteMeta(html, { meta, baseUrl = DEFAULT_BASE, path, noindex = false }) {
  const base = clean(baseUrl)
  let out = html
  if (base !== DEFAULT_BASE) out = out.split(DEFAULT_BASE).join(base) // swap og:image / JSON-LD host
  const canonical = path === '/' ? `${base}/` : `${base}${path}`
  out = setTitle(out, meta.title)
  out = setMeta(out, 'name', 'description', meta.description)
  out = setMeta(out, 'property', 'og:title', meta.title)
  out = setMeta(out, 'property', 'og:description', meta.description)
  out = setMeta(out, 'property', 'og:url', canonical)
  out = setMeta(out, 'name', 'twitter:title', meta.title)
  out = setMeta(out, 'name', 'twitter:description', meta.description)
  out = setCanonical(out, canonical)
  out = setMeta(out, 'name', 'robots', (noindex || meta.index === false) ? 'noindex, nofollow' : 'index, follow')
  return out
}

export function genRobots({ baseUrl = DEFAULT_BASE, noindex = false }) {
  if (noindex) return 'User-agent: *\nDisallow: /\n'
  return `User-agent: *\nAllow: /\n\nSitemap: ${clean(baseUrl)}/sitemap.xml\n`
}

export function genSitemap({ baseUrl = DEFAULT_BASE }) {
  const base = clean(baseUrl)
  const urls = Object.entries(ROUTE_META)
    .filter(([, m]) => m.index !== false)
    .map(([p]) => `  <url><loc>${base}${p === '/' ? '/' : p}</loc></url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- seoHead`
Expected: PASS (all `injectRouteMeta`/`genRobots`/`genSitemap` cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/seoHead.js src/lib/__tests__/seoHead.test.js
git commit -m "feat(seo): pure injectRouteMeta + genRobots + genSitemap"
```

---

## Task 3: `seoPrerender` Vite plugin + delete static robots/sitemap + verify script

**Files:**
- Modify: `vite.config.js` (imports at top; add `seoPrerender()` to the `plugins` array; define the plugin factory)
- Delete: `public/robots.txt`, `public/sitemap.xml`
- Create: `scripts/verify-seo.mjs`

**Interfaces:**
- Consumes: `ROUTE_META`, `SITE` (Task 1); `injectRouteMeta`, `genRobots`, `genSitemap` (Task 2).
- Produces: `dist/index.html` (root, rewritten) + `dist/<route>/index.html` (20 files) + `dist/robots.txt` + `dist/sitemap.xml`.

- [ ] **Step 1: Add imports to `vite.config.js`** (top, after the existing imports)

```js
import { ROUTE_META, SITE } from './src/lib/routeMeta.js'
import { injectRouteMeta, genRobots, genSitemap } from './src/lib/seoHead.js'
```

- [ ] **Step 2: Add the plugin factory** (in `vite.config.js`, near the top-level, beside `asrPreviewNoStore`)

```js
// Build-time crawler SEO: emit a static per-route index.html carrying its own
// <head> (title/description/canonical/OG) plus robots.txt + sitemap.xml, all
// stamped with VITE_BASE_URL / VITE_NOINDEX. No SSR — the <body> stays the SPA
// shell and hydrates client-side. See docs/superpowers/specs/2026-07-14-crawler-seo-design.md.
// `process` is already declared global at the top of vite.config.js
// (`/* global process */`, used by the ANALYZE flag). Vercel injects
// VITE_BASE_URL / VITE_NOINDEX as process.env at build — read them directly.
function seoPrerender() {
  return {
    name: 'seo-prerender',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const baseUrl = (process.env.VITE_BASE_URL || SITE.defaultBaseUrl).replace(/\/+$/, '')
      const noindex = process.env.VITE_NOINDEX === 'true'
      const shell = bundle['index.html']
      if (!shell || shell.type !== 'asset') {
        throw new Error('[seo-prerender] dist/index.html not found in bundle — cannot prerender route heads')
      }
      const shellHtml = typeof shell.source === 'string' ? shell.source : Buffer.from(shell.source).toString('utf8')
      // Root: rewrite in place (also swaps the host for the og- build).
      shell.source = injectRouteMeta(shellHtml, { meta: ROUTE_META['/'], baseUrl, path: '/', noindex })
      // Every other route: a sibling static file Vercel serves to crawlers.
      for (const [routePath, meta] of Object.entries(ROUTE_META)) {
        if (routePath === '/') continue
        this.emitFile({
          type: 'asset',
          fileName: `${routePath.replace(/^\//, '')}/index.html`,
          source: injectRouteMeta(shellHtml, { meta, baseUrl, path: routePath, noindex }),
        })
      }
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: genRobots({ baseUrl, noindex }) })
      if (!noindex) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: genSitemap({ baseUrl }) })
    },
  }
}
```

- [ ] **Step 3: Register the plugin** — add `seoPrerender()` as the **last** entry of the `plugins` array in `vite.config.js` (after `VitePWA({...})`).

- [ ] **Step 4: Delete the hardcoded static files**

```bash
git rm public/robots.txt public/sitemap.xml
```

- [ ] **Step 5: Create the evidence script** — `scripts/verify-seo.mjs`

```js
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
```

- [ ] **Step 6: Build and verify**

Run: `npm run build && node scripts/verify-seo.mjs`
Expected: build succeeds; script prints 4 routes with **distinct** titles, each `canonical` ending in its own path (`/`, `/study`, `/writing`, `/settings`), `/settings` robots = `noindex, nofollow`, and ends with `✓ per-route heads unique…`. Confirm `dist/robots.txt` shows `Allow: /` + `Sitemap: …`.

- [ ] **Step 7: Confirm the PWA service worker still builds**

Run: `test -f dist/sw.js && grep -c "index.html" dist/sw.js`
Expected: `dist/sw.js` exists (non-zero count) — the workbox SW generated normally; `navigateFallback` unaffected.

- [ ] **Step 8: Commit**

```bash
git add vite.config.js scripts/verify-seo.mjs
git commit -m "feat(seo): build-time per-route head prerender + generated robots/sitemap"
```

---

## Task 4: Per-page H1 = the page name (`Layout.jsx`)

**Files:**
- Modify: `src/components/Layout.jsx` (import `metaForPath`; replace the brand `<h1>` block at ~line 209)
- Test: `tests/e2e/seo-h1.spec.js`

**Interfaces:**
- Consumes: `metaForPath` (Task 1); `location` already exists at `Layout.jsx:29` (`const location = useLocation()`).

- [ ] **Step 1: Write the failing e2e** — `tests/e2e/seo-h1.spec.js`

```js
import { test, expect } from '@playwright/test'

// Each route's single <h1> is its own page name (sr-only), not the brand codename.
for (const [path, name] of [['/study', 'Study'], ['/writing', 'Writing'], ['/grammar', 'Grammar']]) {
  test(`H1 on ${path} is "${name}"`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('h1')).toHaveText(name)
    await expect(page.locator('h1', { hasText: 'ooga' })).toHaveCount(0)
  })
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:e2e -- seo-h1`
Expected: FAIL — the only `<h1>` currently reads `ooga da boogadamalay` on every route.
(If it errors with a blank app / port issue, run `lsof -i :5173`, kill any stale dev server from another project, and re-run — see project memory `project_e2e_port_5173_collision`.)

- [ ] **Step 3: Implement — edit `src/components/Layout.jsx`**

First add the import near the top (with the other `../lib` imports):
```js
import { metaForPath } from '../lib/routeMeta'
```

Then replace the brand block (currently `Layout.jsx:209-212`):
```jsx
        <h1 className="text-2xl font-bold bg-gradient-to-r from-accent via-accent2 to-blue bg-clip-text text-transparent">
          ooga da boogadamalay
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>IGCSE Malay Master</p>
```
with:
```jsx
        {/* Real page name as the single H1 (sr-only) — screen readers + Google
            hear the page's own name, not the brand codename (a11y §3.5 / SEO). */}
        <h1 className="sr-only">{metaForPath(location.pathname).name}</h1>
        <div aria-hidden="true" className="text-2xl font-bold bg-gradient-to-r from-accent via-accent2 to-blue bg-clip-text text-transparent">
          ooga da boogadamalay
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--color-dim)' }}>IGCSE Malay Master</p>
```

- [ ] **Step 4: Run the e2e to verify it passes**

Run: `npm run test:e2e -- seo-h1`
Expected: PASS (3 tests). (Sanity: the `sr-only` `<h1>` is in the DOM; `toHaveText` reads its textContent regardless of visual hiding. If it ever flakes on visibility, assert `await page.locator('h1').textContent()` instead.)

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout.jsx tests/e2e/seo-h1.spec.js
git commit -m "feat(seo,a11y): per-page H1 = page name; demote brand to aria-hidden"
```

---

## Task 5: Client `<Meta>` keeps canonical + OG in sync on navigation (optional)

> **Flagged optional / cuttable.** The crawler goal is fully met by Tasks 1–4 (crawlers read the prerendered raw head). This only helps a JS-executing social scraper that follows an in-app client navigation. Small and improves consistency; skip if minimal scope is preferred.

**Files:**
- Modify: `src/components/Meta.jsx`
- Test: `src/components/__tests__/meta.test.js`

**Interfaces:**
- Produces: on mount/prop-change, upserts `document.title`, `meta[name=description]`, `link[rel=canonical]`, `og:url/title/description`, `twitter:title/description` for the current `window.location.pathname`.

- [ ] **Step 1: Write the failing test** — `src/components/__tests__/meta.test.js`

```js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import Meta from '../Meta'

let root, host
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

const attr = (sel, a) => document.head.querySelector(sel)?.getAttribute(a)

describe('Meta', () => {
  it('sets title, description, canonical and OG for the current path', () => {
    window.history.pushState({}, '', '/writing')
    act(() => root.render(<Meta title="Writing Analyzer | IGCSE Malay Master" description="Analyze your IGCSE writing." />))
    expect(document.title).toBe('Writing Analyzer | IGCSE Malay Master')
    expect(attr('meta[name="description"]', 'content')).toBe('Analyze your IGCSE writing.')
    expect(attr('link[rel="canonical"]', 'href')).toMatch(/\/writing$/)
    expect(attr('meta[property="og:title"]', 'content')).toBe('Writing Analyzer | IGCSE Malay Master')
    expect(attr('meta[property="og:url"]', 'content')).toMatch(/\/writing$/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- meta`
Expected: FAIL — no `link[rel=canonical]` / `og:title` is created by the current `Meta`.

- [ ] **Step 3: Implement — replace the body of `src/components/Meta.jsx`'s `useEffect`** (keep the component signature + defaults)

```jsx
  useEffect(() => {
    if (title && document.title !== title) document.title = title
    const base = (import.meta.env.VITE_BASE_URL || 'https://upg-igcse-malay-master.vercel.app').replace(/\/+$/, '')
    const path = window.location.pathname
    const canonical = path === '/' ? `${base}/` : `${base}${path.replace(/\/+$/, '')}`

    const setMeta = (sel, attr, key, content) => {
      if (content == null) return
      let el = document.head.querySelector(sel)
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }
    let link = document.head.querySelector('link[rel="canonical"]')
    if (!link) { link = document.createElement('link'); link.setAttribute('rel', 'canonical'); document.head.appendChild(link) }
    link.setAttribute('href', canonical)
    setMeta('meta[name="description"]', 'name', 'description', description)
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonical)
    setMeta('meta[property="og:title"]', 'property', 'og:title', title)
    setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title)
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)
  }, [title, description])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- meta`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Meta.jsx src/components/__tests__/meta.test.js
git commit -m "feat(seo): client Meta keeps canonical + OG in sync on navigation"
```

---

## Task 6: Full-gate verification + docs + finish

**Files:**
- Modify: `RESUME_HERE.md`, `docs/loop/GOAL.md`, `README.md`, `CLAUDE.md`

- [ ] **Step 1: Run the full gate**

Run: `npm run build && npm run test:run && npm run lint`
Expected: build 0 errors; all ~2174 tests pass; lint 0 errors (3 known warnings). Then `node scripts/verify-seo.mjs` → `✓`.

- [ ] **Step 2: Run the touched-area e2e**

Run: `npm run test:e2e -- seo-h1 a11y-tap-targets`
Expected: `seo-h1` (3) pass; `a11y-tap-targets` still green (Layout header change didn't shrink any target).

- [ ] **Step 3: Update docs** (behaviour-change commit rule)
- `README.md` — under architecture/build, add: build-time `seoPrerender` Vite plugin emits per-route static `<head>` + generated `robots.txt`/`sitemap.xml`; base URL via `VITE_BASE_URL`, mirror `noindex` via `VITE_NOINDEX`.
- `CLAUDE.md` — one line in the Architecture/Verification section noting `src/lib/routeMeta.js` (route-meta source of truth) + the `seoPrerender` build plugin, and that `public/robots.txt`/`sitemap.xml` are now generated (don't re-add static ones).
- `RESUME_HERE.md` — supersede the SEO kickoff with a short DONE note + the remaining Kheshav deploy step (og- env vars).
- `docs/loop/GOAL.md` — mark epic #1 crawler-SEO shipped.

- [ ] **Step 4: Commit docs**

```bash
git add README.md CLAUDE.md RESUME_HERE.md docs/loop/GOAL.md
git commit -m "docs(seo): record crawler-SEO prerender + og- noindex deploy step"
```

- [ ] **Step 5: Finish the branch** — invoke `superpowers:finishing-a-development-branch` to merge `feat/crawler-seo` → `main` (main push = prod deploy). After the push, confirm Vercel **READY** on the `upg-` project, then paste the deployed `curl -A Googlebot https://upg-…/writing` head as final evidence.

### Kheshav's deploy step (must be done for the `og-` mirror)
On the **`og-` Vercel project only** → Settings → Environment Variables (Production), add:
- `VITE_BASE_URL` = `https://og-igcse-malay-master.vercel.app`
- `VITE_NOINDEX` = `true`

Then redeploy `og-`. `upg-` needs nothing (defaults to the upg URL, indexable). This is not a regression if done shortly after merge — `og-` is already an indexable duplicate today, so the mirror is no worse until the vars land.

---

## Self-Review

**1. Spec coverage** — §2 goal → T1–T3 (per-route head in raw HTML) ✓; §4.1 routeMeta → T1 ✓; §4.2 pure core + plugin → T2/T3 ✓; §4.3 robots/sitemap + delete statics → T3 ✓; §4.4 H1 → T4 ✓; §4.5 client Meta → T5 ✓; §7 testing (unit + build verify + regression) → tests in T1/T2/T5 + verify-seo + seo-h1 ✓; §DONE (curl/Rich Results, og- noindex, gate, Vercel READY) → T6 ✓. No gaps.

**2. Placeholder scan** — every code/test step contains full runnable code and exact commands; no TBD/TODO. ✓

**3. Type/name consistency** — `metaForPath`, `injectRouteMeta({ meta, baseUrl, path, noindex })`, `genRobots({ baseUrl, noindex })`, `genSitemap({ baseUrl })`, `SITE.defaultBaseUrl`, `ROUTE_META[path].{name,title,description,index}` used identically across T1→T6. ✓
