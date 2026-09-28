# 2026-09-28 bug hunt — 4 adversarial reviewers + a live-UI chaos pass

**43 findings at HEAD `5603d88`: 1 × P0 · ~20 × P1 · the rest P2.** Every finding carries proof — a probe
that ran the real code (CONFIRMED) or a line-by-line trace (TRACED). The probe scripts lived in a session
scratchpad and were not kept; each report quotes the probe's output and the exact scenario, which is enough
to rebuild the red test.

| Report | Area | Counts |
|---|---|---|
| [R1-data-sync.md](R1-data-sync.md) | store, FSRS, sync, backup, streaks | P0 1 · P1 3 · P2 6 |
| [R2-learning-flows.md](R2-learning-flows.md) | study modes, drills, writing graders | P1 6 · P2 6 · known 1 |
| [R3-security.md](R3-security.md) | AI proxy, RLS, keys, XSS, shared device | P1 2 · P2 4 |
| [R4-robustness.md](R4-robustness.md) | mic/speech, PDF/OCR, Import, SSE, PWA | P1 5 · P2 3 |
| UI (below) | the live site, driven in a real browser | P1 5 · P2 2 · P3 3 |

## UI findings — live site, Playwright, 390 px + 320/768/1280, dark + light, signed out

Automated sweep: 23 routes × 2 themes = 46 loads → **0 console errors, 0 page errors, 0 failed requests,
0 horizontal overflow** (390 and 320 px). The defects below were only visible by LOOKING at screenshots or by
abusing the app.

- **U1 · P1 · Header icons sit on top of the site title on every phone page** (< ~620 px). The ▶ tour
  button covers "boogada"; the "Save" pill's label is unreadable under "malay". `Layout.jsx` — the icon row
  is `absolute right-4 top-5` over a centred title with no space reserved.
- **U2 · P1 · A signed-out learner is told "Synced"** (`syncStatus.js` `cloudPillLabel` never checks auth),
  directly under a card saying "Your progress isn't saved yet". Offline it says "Offline · 0 queued". A
  learner who trusts "Synced" and clears the browser loses everything.
- **U3 · P1 · Two tabs lose study progress.** Tab A reviews 5 cards; tab B (opened earlier) reviews 1; after a
  reload the saved history says 1 review. Same root as R1 #4 (no cross-tab `storage` listener).
- **U4 · P1 · Some corrupt saves white-screen EVERY route, permanently** — a `null` card or a non-array
  `cards` → `i.filter is not a function` / `reading 't'` with no way to reach Settings. The route
  `ErrorBoundary` sits inside `Layout`, so a crash in Layout/providers has no boundary. (Garbage JSON, a
  `null` state, a newer-version save and a v1 save all recover fine.)
- **U5 · P2 · First-time visitor goes offline, taps a page → blank white page** that stays blank after
  reconnecting. `lazyWithRetry` reloads on a chunk error; offline, the reload lands on the browser's error
  page. Returning visitors are fine (the service worker precaches 156 files within ~2 s).
- **U6 · P1 · Signed-out learners see "AI Roleplay available — 50 calls remaining today"** (Roleplay; same
  pattern in Cikgu Maya), but the AI tier requires sign-in — they only find out after typing a reply.
- **U7 · P3 · "Keys: Space=flip · 1=Again…" shows on phones** (Study), where there is no keyboard.
- **U8 · P3 · A very long unbroken word runs off its chip** on Import.
- **U9 · P3 · Grammar tab chips are cut at the right edge** with no scroll cue (scrolls, but looks broken).

Survived (no defect): 60 rapid rating key-presses (no double count, no invalid dates) · 40 route switches in
~2 s · `<img onerror>` / `<script>` in Import, Writing and Cikgu (nothing executed) · a 66 000-character essay
· a save from a newer app version (kept, not wiped).

## Status (updated as fixes land)

See the "🐛 2026-09-28 bug hunt" block in `RESUME_HERE.md` for what shipped, and `docs/loop/GOAL.md` →
"🐛 Bug-hunt queue" for what the loop builds next.
