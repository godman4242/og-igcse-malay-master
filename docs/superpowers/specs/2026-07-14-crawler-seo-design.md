# Crawler-facing SEO — build-time per-route `<head>` — design spec

**Date:** 2026-07-14 · **Status:** awaiting Kheshav's review · **Branch:** `feat/crawler-seo`
**Source epic:** `docs/loop/GOAL.md` → 🎖️ Kheshav-ranked epics **#1** · audit `~/Downloads/igcse-malay-master-audit.md` §3.1–3.6, §7
**Decision authority:** Kheshav delegated the approach choice ("choose which is best and why", 2026-07-14).

---

## 1. Problem (grounded, not restated from the audit)

Google's crawler reads a page's **raw HTML** — the bytes in the first HTTP response, before any JavaScript runs. This app renders everything with JS *after* load, so:

- The crawler sees `index.html`'s **static** `<head>`: one homepage `<title>`, one description, one `<link rel=canonical>` pointing at `/`, one set of OG tags — **identical across all 21 routes**. (Verified: `index.html:9–53`.)
- The per-route `<Meta>` component (`src/components/Meta.jsx`) sets title + description **client-side only**, inside a `useEffect` — invisible to a crawler that doesn't run/wait for JS. (Verified: all 21 pages call `<Meta>`; it only touches `document.title` + `meta[name=description]` in an effect.)
- `public/robots.txt` + `public/sitemap.xml` are **static, committed, and hardcode `upg-…`** — so the `og-` mirror deployment points crawlers at `upg-`, and every canonical/OG URL is the homepage. (Verified.)

**Net effect:** to Google, all 21 routes look like duplicate copies of the homepage → none can rank for their own topic; the `og-` mirror is a duplicate-content liability.

## 2. Goal & measurable "done"

Each route's **own** `<title>` / `<meta name=description>` / `<link rel=canonical self-URL>` / per-route OG tags appear in the **raw HTML** a crawler receives — proven against a real crawler check, not just "the build passed".

**DONE (mirrors the kickoff PROVE-IT):**
1. `curl -A Googlebot <route>` **and** the built `dist/<route>/index.html` show a **unique** title + description + self-referential canonical + per-route OG for 2–3 sampled routes.
2. The `og-` deployment serves a `noindex` robots + `noindex` page meta; `upg-` stays indexable.
3. Each page's H1 is its own name (not "ooga da boogadamalay").
4. Gate green (build + ~2174 tests + lint), Vercel READY on `upg-`, no `STORE_VERSION` change.

## 3. Approach decision

### Chosen: **A — build-time head-only static shell** (a Vite build step)

After `vite build`, a small Vite plugin writes `dist/<route>/index.html` for every route = the **built** `index.html` shell (same hashed asset tags, so the app still boots) with **only its `<head>` meta swapped** for that route's values, pulled from one central `routeMeta` table. No React render, no server-side rendering, no new dependency. The `<body>` stays `<div id="root">` and the SPA hydrates client-side exactly as today.

Vercel serves these files to crawlers because **the filesystem is checked before rewrites** — a real `dist/study/index.html` wins over the catch-all `/(.*) → /index.html`, which stays as the SPA fallback for paths with no file. (Confirmed: Vercel routing docs + empirical proof — the app's own hashed JS/CSS load today *despite* that same catch-all, which is only possible if files beat rewrites.)

### Why A over the alternatives (evidence-based)

The pending question was whether a heavier full-render approach was warranted. A dedicated SSR-safety audit of the **eager** module graph (main.jsx → App.jsx → all non-lazy imports) found it is **SSR-safe at import time**: the only unguarded browser-global is `document.getElementById` in `main.jsx` (which any prerender replaces with its own entry), and the critical Zustand `persist`/`localStorage` path **does not crash** in Node because zustand v5's `createJSONStorage` swallows the missing `localStorage` and skips hydration. So full SSR is *feasible* — but still **not worth it**:

| | **A — head-only (chosen)** | **B — headless-browser prerender** (`@prerenderer`+puppeteer) | **C — full Node SSR** (`vite-react-ssg`) |
|---|---|---|---|
| Meets the measurable goal (head in raw HTML) | ✅ exactly | ✅ (also body) | ✅ (also body) |
| Extra body content it adds | none (JS-rendered, as Google already handles) | full app body — but **logged-out / empty state** (no user cards, 0 streak) → low SEO value + hydration-flash risk | same low-value empty body |
| New heavy dependency | none | puppeteer + Chromium in the Vercel build | SSR entry + toolchain |
| Build-pipeline blast radius (**a crash blocks ALL deploys**) | ~none (deterministic string templating we own + unit-test) | high (app can hang/error during Chromium render) | high (SSR entry, `BrowserRouter`→`StaticRouter`, make `virtual:pwa-register` + `@vercel/analytics` resolve under SSR, verify no render-body globals) |

A is the **lightest option that measurably meets the goal** (the kickoff's explicit instruction) and has the smallest blast radius on the prod pipeline. It is also faithful to GOAL.md approach (c) as written — *"a Vite build step that renders each route to static HTML carrying its own `<head>`… the client-side `<Meta>` already supplies the per-route content."*

**Veto note:** pick C only if the *page body text* must be indexable without Google running JS. For an interactive study tool (not an articles site) that value is low and not worth the deploy risk. Rejected on that basis.

## 4. Architecture (isolated units)

Follows the app's established **pure-core + thin-impure-boundary** pattern (cf. `ocr.js`/`ocrEngine.js`).

### 4.1 `src/lib/routeMeta.js` — single source of truth (pure, no browser globals)
```
export const SITE = { name, defaultOgImage, twitterCard, … }
export const ROUTE_META = {
  '/':        { name: 'Home', title: '…', description: '…', index: true },
  '/study':   { name: 'Study',  title: 'Study | IGCSE Malay Master', description: '…', index: true },
  … all 21 routes … (titles reconciled to match what each page already passes to <Meta>)
  '/settings':{ name: 'Settings', title: '…', description: '…', index: false },
  '/import':  { … index: false },
  '/mistakes':{ … index: false },
}
export function metaForPath(path) { return ROUTE_META[path] ?? ROUTE_META['/'] }
```
- `title`/`description` = the crawler-visible head values (base values; dynamic pages layer runtime detail on top client-side — see 4.5).
- `name` = the page's short H1 name.
- `index` = whether the route belongs in the sitemap and is crawlable (utility routes = `false`).
- Consumed by: the build plugin (4.2), robots/sitemap generation (4.3), the Layout H1 (4.4), and the client `<Meta>` (4.5). **One table, no drift.**

### 4.2 Build-time prerender — pure core + Vite plugin
- **Pure core** `injectRouteMeta(builtShellHtml, { meta, baseUrl, path, noindex })` → returns a new HTML string with these tags replaced/updated in the shell's `<head>`: `<title>`, `meta[name=description]`, `link[rel=canonical]` (= `baseUrl + path`), `og:url`/`og:title`/`og:description`, `twitter:title`/`twitter:description`, JSON-LD `url`, and a `<meta name=robots content="noindex,nofollow">` inserted when `noindex || !meta.index`. **All other head tags (charset, viewport, icons, fonts, the hashed `<script>`/asset links) are preserved byte-for-byte** so the app still boots. Dependency-free targeted string replacement; unit-tested against a fixture mirroring `index.html`.
- **Thin Vite plugin** `seoPrerender()` in `vite.config.js`, hook `closeBundle` (runs **after** VitePWA so per-route files are *not* added to the SW precache — crawler-only, no precache bloat): reads `dist/index.html`, then for each `ROUTE_META` key writes the transformed HTML — `'/'` overwrites `dist/index.html`; every other `/x` writes `dist/x/index.html`. Reads `VITE_BASE_URL` + `VITE_NOINDEX` from `process.env` (build-time).

### 4.3 `robots.txt` + `sitemap.xml` — generated at build (delete the static committed files)
The same plugin also writes `dist/robots.txt` + `dist/sitemap.xml` from `VITE_BASE_URL` + `ROUTE_META`:
- **Indexable build** (`upg-`, `VITE_NOINDEX` unset): `robots.txt` = `Allow: /` + `Sitemap: {base}/sitemap.xml`; `sitemap.xml` lists only `index:true` routes with host = `{base}`.
- **Noindex build** (`og-`, `VITE_NOINDEX=true`): `robots.txt` = `User-agent: *` / `Disallow: /` (no sitemap line); every prerendered page also carries `<meta name=robots content=noindex,nofollow>`.
- `public/robots.txt` and `public/sitemap.xml` are **deleted** (their hardcoded-`upg-` values are the bug); the plugin is now the sole producer.

### 4.4 Per-page H1 (`src/components/Layout.jsx`)
- Demote the brand: `Layout.jsx:209` `<h1>ooga da boogadamalay</h1>` → a non-heading styled element (keep the gradient look, drop the `<h1>`).
- Add one route-derived visually-hidden heading rendered by Layout: `<h1 className="sr-only">{metaForPath(pathname).name}</h1>`. Screen readers announce the real page name; sighted users keep the brand; Google's rendered view sees a correct H1. Single place, single source (`routeMeta`). *(Alternative, more churn: promote each page's visible heading to `<h1>` in 21 files — flagged, not chosen.)*

### 4.5 Client `<Meta>` (`src/components/Meta.jsx`) — small extension
Extend the existing effect to also keep `link[rel=canonical]` + `og:url`/`og:title`/`og:description` in sync on client navigation, using `VITE_BASE_URL + location.pathname` and the passed title/description. Keeps the client DOM consistent with the prerendered head for JS-running scrapers; one-file change; existing title/description behavior unchanged. *(Nice-to-have for consistency, not required for the crawler goal — crawlers read the raw prerendered head.)*

## 5. Data flow
`ROUTE_META` (static table) → **at build:** `seoPrerender` plugin → per-route `dist/**/index.html` + `dist/robots.txt` + `dist/sitemap.xml`, all stamped with `VITE_BASE_URL`/`VITE_NOINDEX`. → **at request:** Vercel serves the matching static file to a crawler (filesystem-before-rewrite); browsers boot the SPA from it. → **at runtime:** `<Meta>` + Layout H1 read `ROUTE_META` for the live route.

## 6. Error handling
The plugin must **fail loud** (throw) on a malformed shell or a missing expected tag — a broken build is caught by the **pre-commit gate** (`build` runs there) and the Vercel build, *before* bad HTML ships. The pure core has no I/O and is deterministic; the plugin's only I/O is reading/writing `dist`. No partial writes: build each route's string fully, then write.

## 7. Testing (red-proofed before implementation)
**Unit (Vitest, `src/lib/__tests__/`):**
- `routeMeta.test.js` — every entry has non-empty title+description; titles and descriptions are **unique** across routes; keys ⊆ the 21 App.jsx routes; `settings`/`import`/`mistakes` are `index:false`; all others `index:true`.
- `seoPrerender.test.js` (pure core) — given a fixture shell, `injectRouteMeta` yields the right title/description/canonical(`base+path`)/OG/twitter/JSON-LD-url; inserts `noindex` when `!index` or `noindex`; **preserves the hashed `<script>`/asset tags unchanged**.
- `robotsSitemap.test.js` — indexable vs noindex mode produce the correct `robots.txt`; sitemap host = base, lists only `index:true` routes, valid XML.

**Build/integration verification (the crawler evidence):** `scripts/verify-seo.mjs` — runs a build, reads `dist/index.html`, `dist/study/index.html`, `dist/writing/index.html` and asserts unique per-route title/description/canonical/OG; runs a second build with `VITE_NOINDEX=true VITE_BASE_URL=https://og-…` and asserts `Disallow: /` + `noindex` meta. Paste its output as evidence.

**Regression:** `a11y-tap-targets.spec.js` + guide specs stay green; a new assertion that Layout renders the route-derived `sr-only` H1 with the page name. No `STORE_VERSION` touched (no store change).

## 8. Non-goals (YAGNI)
- Full body SSR / prerendered body content (Approach C) — rejected in §3.
- Per-route OG **images** — keep the shared `og-image.png`; only per-route OG **text** changes.
- Other audit items (CSP enforce, Permissions-Policy, font self-hosting, og-image compression) — separate work; the contrast quick-win already shipped (GOAL #1a).
- Cross-domain canonical from `og-`→`upg-` — superseded by the simpler `noindex` mirror.

## 9. Risks & mitigations
| Risk | Mitigation |
|---|---|
| Plugin throws → blocks ALL deploys | Deterministic, unit-tested pure core; pre-commit `build` catches it locally before Vercel |
| String-replace brittle if `index.html` head changes | Unit test pins the transform against an `index.html`-shaped fixture; a head change fails the test with a clear diff |
| `VITE_BASE_URL` unset on `og-` | `VITE_NOINDEX=true` makes `og-` invisible regardless of base → no dup-content harm even if base is wrong; numbered step sets both |
| SW precache bloat / SPA-fallback break | Plugin runs at `closeBundle` (after VitePWA) → per-route files excluded from precache; `navigateFallback: /index.html` unchanged; verified in test |
| Trailing-slash canonical mismatch | Canonical uses the no-slash form (`{base}/study`), matching Vercel clean-URL serving |

## 10. Verification checklist (maps to §2 DONE)
- [ ] `npm run build` green; `node scripts/verify-seo.mjs` prints unique head per sampled route + correct robots for both modes
- [ ] `curl -A Googlebot https://upg-…/writing` shows the Writing title/description/canonical/OG (post-deploy)
- [ ] `curl https://og-…/robots.txt` → `Disallow: /`; an `og-` page head has `noindex`
- [ ] Gate green (build + tests + lint); Vercel READY on `upg-`; RESUME_HERE.md + GOAL.md refreshed; no `STORE_VERSION` change
