# 2026-05-27 — Playwright e2e harness for Phase 4 + Phase 5

**One-line:** Ported the 2026-05-27 verify-session scratch driver
(`/tmp/igcse-verify/drive2.mjs`) into a permanent `tests/e2e/` Playwright
suite. 9 specs, all pass, build unchanged.

## Context

The two prior sessions on 2026-05-27 shipped Phase 4 (CSS page
transitions) and Phase 5 (visible mistake → FSRS promotion toast). A
manual post-ship Playwright verify caught a centering bug on
`MistakeToast` (Tailwind v4 `translate` stacking with the inline
transform) that landed as `88ed252`. The driver that found that bug
lived in `/tmp` and would have died with the next reboot.

This session locks the driver in as `tests/e2e/`, so the next
regression — whether it's a `framer-motion` re-entry, an `addMistake`
shape change, or another Tailwind v4 surprise — gets caught by CI-
runnable specs instead of ad-hoc curl-and-screenshot passes.

## What shipped

1. **`@playwright/test` 1.60.0** added as a devDependency. Browsers
   already cached at `~/Library/Caches/ms-playwright/chromium*1223/`;
   `npx playwright install chromium` ran as a no-op.
2. **`tests/e2e/playwright.config.js`** — chromium-only project, viewport
   390×844 (matches the verify driver's iPhone 14 Pro shape), `workers:
   1` and `fullyParallel: false` because the dev server is a singleton.
   `webServer` auto-spawns `npm run dev` and `reuseExistingServer` is on
   outside CI. `trace: 'retain-on-failure'` so any future flake gets a
   trace.zip for free.
3. **`tests/e2e/page-transitions.spec.js`** — 3 cases:
   - `.page-transition` wrapper renders with `animationName=fadeUp` and
     duration `0.22s` (or `220ms`, depending on serialisation).
   - Re-mounts on navigation across both cold and warm lazy chunks
     (`/study` cold → `/grammar` cold → `/study` warm).
   - `prefers-reduced-motion: reduce` context flips `animationName` to
     `none`.
4. **`tests/e2e/mistake-promotion.spec.js`** — 6 cases:
   - Malay vocab + severity med → returns a `promotedCard`, both
     `[role="status"]` toasts coexist on the page.
   - "Open deck" CTA navigates to `/study`.
   - Dismiss `X` removes the promoted toast within `EXIT_MS + 100`.
   - Same-content second call within 24h → `added: null, bumped: truthy,
     promotedCard: null`.
   - Severity `low` Malay vocab → logged but no promotion, no emerald
     toast.
   - Language `en` mistake → logged but no promotion, no emerald toast.
5. **npm scripts** — `test:e2e` and `test:e2e:ui` added.
6. **CLAUDE.md** — new `## E2E tests` subsection documents the run
   commands, the browser cache location, and the Vite `?t=…` module-URL
   trap so future agents don't burn time rediscovering it.

## The Vite `?t=` trap (also in CLAUDE.md)

In dev, when `page.evaluate(() => import('/src/store/useStore.js'))`
runs, Vite returns a DIFFERENT module instance than the one React's
component tree subscribed to — because Vite appends a `?t=<timestamp>`
HMR cache-buster to the React-side import URL. The detached instance's
`getState().setX()` updates state but never triggers a re-render.
Result: the toast never mounts, assertions read as a code bug,
investigation goes in the wrong direction.

The workaround used by both specs:

```js
async function bindStore(page) {
  return page.evaluate(async () => {
    const url = performance
      .getEntriesByType('resource')
      .find(r => r.name.includes('/src/store/useStore.js'))?.name
    if (!url) throw new Error('useStore URL not found in resource timing')
    const mod = await import(url)
    window.__STORE = mod.default
    return url
  })
}
```

This pulls the URL React's `<script type="module">` already loaded
(including the `?t=…`) out of the browser's resource timing buffer and
dynamic-imports it. The module cache then hands back the SAME instance
React subscribed to.

Note: `bindStore` must run after EVERY `page.goto` / `page.reload`,
because navigation clears `window.__STORE`.

## Verification gates (all green)

- `npm run lint` → 0 errors, 3 pre-existing warnings (unchanged).
  Briefly failed with 3 `no-undef` errors on `process` references in
  the config; fixed by adding `import process from 'node:process'`
  (more surgical than editing `eslint.config.js`).
- `npm run test:run` → 214/214 vitest pass.
- `npm run test:e2e` → 9/9 specs pass, 22.6s wall time.
- `npm run build` → clean. `index-*.js` 409.13 KB / gz 131.37 KB
  (vs. baseline 409.15 KB / gz 131.36 KB — effectively unchanged; e2e
  deps are dev-only).

## Why a `--config` flag in the npm script

User spec called for `"test:e2e": "playwright test"`, but Playwright
auto-discovers `playwright.config.{js,ts}` from the cwd. Since the spec
also places the config at `tests/e2e/playwright.config.js` (co-located
with the specs), `playwright test` from the project root would fail to
find it. The script uses
`playwright test --config tests/e2e/playwright.config.js` — minimum
change to satisfy both placement intents.

## Files touched

- `package.json` — `@playwright/test` devDep, two new scripts.
- `package-lock.json` — auto-update.
- `tests/e2e/playwright.config.js` — new.
- `tests/e2e/page-transitions.spec.js` — new.
- `tests/e2e/mistake-promotion.spec.js` — new.
- `CLAUDE.md` — new `## E2E tests` subsection.
- `RESUME_HERE.md` — fresh `LATEST SESSION (2026-05-27, e2e)` block on
  top.
- `docs/sessions/2026-05-27-e2e-harness-session.md` — this file.

`.gitignore` already had `test-results/`, `playwright-report/`, and
`playwright/.cache/` from the 2026-05-27 401-fix session's preemptive
add — no change needed.

## Next steps (parked, user picks)

- **First-Run Tour** — onboarding/activation for new invitees. Highest
  product impact next.
- **Phase 2 Content Expansion** — more vocab packs, more roleplay
  scenarios, more reading passages.
- **Row 7 cosmetic gap (B)** — punted; invite-only users essentially
  never hit the EN quota cap.
