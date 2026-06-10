# Go-wild smoke test — current live app — 2026-06-10

Adversarial "chaotic user / teacher" abuse pass (per `[[feedback_go_wild_smoke_test]]`), run
interactively via a throwaway Playwright spec (deleted after). Goal: find what testers miss.

## Result: ROBUST — no real bugs found.

| Scenario | Result |
|---|---|
| Corrupted persisted store (`cards` not an array, `_version` mismatch) + reload | ✅ recovers, no white screen, no pageerror |
| Totally malformed JSON in `igcse-malay-store` + reload | ✅ recovers (persist drops bad blob) |
| Rapid nav across all 19 routes × 3 sweeps, racing the lazy chunks (`waitUntil: commit`) | ✅ no pageerror, never blank (Suspense + ErrorBoundary hold) |
| Theme thrash × 25 + viewport resize mid-render | ✅ no pageerror |
| Extreme garbage input (8 000 chars + emoji + `<script>` + `\n`×200) into /writing, /comprehension, /cikgu, then click analyze/submit | ✅ ErrorBoundary NOT triggered; only an expected, gracefully-caught AI-network console.error (no key in test env); no uncaught pageerror |

## Two "failures" investigated → both test artifacts, not app bugs
1. **Indiscriminate button-spam closed the headless context.** Root cause: `src/lib/export.js:114`
   `exportToPDF` does `window.open(...)` + `printWindow.print()` — spamming the export/print button
   detaches the headless page. Real users get a normal print dialog; not a bug. (Targeted re-test
   that clicked only analyze/submit buttons — never export/print — passed cleanly.)
2. **Offline + full-page reload = blank in DEV.** The Vite dev server can't serve while offline and
   there's no service worker in dev. **Production has the PWA service worker** (vite-plugin-pwa)
   which caches the app shell, so prod offline behaves differently. Worth a prod-side offline check
   sometime, but not a dev bug. (Client-side nav while offline — the realistic case — was fine.)

## Takeaways folded forward
- The store's persist/migrate is genuinely resilient to corruption — good.
- The new user-guide e2e (plan Task 9) inherits these go-wild patterns (nav-away mid-tour,
  theme-swap, spam, offline, resize) — the tour controller must match this robustness bar.
- Optional future check (low priority): confirm prod offline (PWA SW) serves the shell; confirm the
  export-PDF print window UX on a real browser.
