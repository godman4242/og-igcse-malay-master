# tests/e2e/ — Playwright notes

Folder-local supplement to the root `CLAUDE.md` (auto-loaded when you read a file under `tests/e2e/`). The two traps that bite BEFORE you open a spec — port squatting and the Vite `?t=` module URL — stay in root `CLAUDE.md` → E2E tests. Moved out of the root `CLAUDE.md` on 2026-09-26 so it loads on demand instead of into every session.

Playwright suite under `tests/e2e/` (config: `tests/e2e/playwright.config.js`). Pins Phase 4 page transitions and the Phase 5 mistake → FSRS promotion pipeline. `past-paper-ocr.spec.js` covers the OCR feature (cold Tesseract WASM is slow → those tests raise the per-test timeout to 120 s; fixtures are generated + OCR-validated by `scripts/gen-ocr-fixtures.mjs`). `reader-keyboard.spec.js` pins the reader's keyboard loop (F1–F7: roving focus, Enter-reveal, Shift+Arrow select-to-deck) and `a11y-tap-targets.spec.js` sweeps ≥44px targets via real Chromium `getBoundingClientRect` (jsdom has no layout). `axe-routes.spec.js` is the axe gate (GOAL #53): every `ROUTE_META` route on the preview (:4173), 390 px, dark + light, 0 serious/critical — a queued, unfixed violation is one rule off on one route in its `KNOWN` map, naming its GOAL item; its first test plants an unnamed button and must go red. Two pre-existing flaky specs (`full-translation.spec.js:153`, `instruct-router.spec.js:156` — AI-mock/timing) fail under full-suite load independent of OCR.

```bash
npm run test:e2e        # headless run (chromium only, viewport 390x844)
npm run test:e2e:ui     # interactive runner
```

The config's `webServer` auto-spawns `npm run dev` on `:5173` and reuses an existing one outside CI. Browsers resolve from `~/Library/Caches/ms-playwright/` (currently its `chromium_headless_shell-1223` and `chromium-1223` folders); `npx playwright install chromium` is a no-op after the first install.

Artifacts (`test-results/`, `playwright-report/`, `playwright/.cache/`) are gitignored.
