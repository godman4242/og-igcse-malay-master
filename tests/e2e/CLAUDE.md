# tests/e2e/ — Playwright notes

Folder-local supplement to the root `CLAUDE.md` (auto-loaded when you read a file under `tests/e2e/`). The two traps that bite BEFORE you open a spec — port squatting and the Vite `?t=` module URL — stay in root `CLAUDE.md` → E2E tests. Moved out of the root `CLAUDE.md` on 2026-09-26 so it loads on demand instead of into every session.

Playwright suite under `tests/e2e/` (config: `tests/e2e/playwright.config.js`). Pins Phase 4 page transitions and the Phase 5 mistake → FSRS promotion pipeline. `past-paper-ocr.spec.js` covers the OCR feature (cold Tesseract WASM is slow → those tests raise the per-test timeout to 120 s; fixtures are generated + OCR-validated by `scripts/gen-ocr-fixtures.mjs`). `reader-keyboard.spec.js` pins the reader's keyboard loop (F1–F7: roving focus, Enter-reveal, Shift+Arrow select-to-deck) and `a11y-tap-targets.spec.js` sweeps ≥44px targets via real Chromium `getBoundingClientRect` (jsdom has no layout). Two pre-existing flaky specs (`full-translation.spec.js:153`, `instruct-router.spec.js:156` — AI-mock/timing) fail under full-suite load independent of OCR.

```bash
npm run test:e2e        # headless run (chromium only, viewport 390x844)
npm run test:e2e:ui     # interactive runner
```

The config's `webServer` auto-spawns `npm run dev` on `:5173` and reuses an existing one outside CI. Browsers resolve from `~/Library/Caches/ms-playwright/` (currently `chromium_headless_shell-1223/` + `chromium-1223/`); `npx playwright install chromium` is a no-op after the first install.

Artifacts (`test-results/`, `playwright-report/`, `playwright/.cache/`) are gitignored.
