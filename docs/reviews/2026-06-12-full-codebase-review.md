# Full codebase review — 2026-06-12

**Scope:** everything — security, correctness, performance, code health, UX/a11y, PWA/SEO, learning-science alignment, product/features. **Read-only** (no fixes applied; this doc + RESUME_HERE kickoffs are the only changes).
**Method:** 5 parallel area auditors (security / correctness / perf+health / UX-a11y-PWA-SEO / product+learning-science), each instructed to *refute findings before reporting* and label **DEMONSTRATED vs HYPOTHESIS**; live Supabase policies + advisors queried; deployed prod bundle + endpoints probed; headline P1/P2 claims re-verified at source by the lead session. Severities are honest — nothing inflated.
**Quantified snapshot (2026-06-12):** 940 unit tests green · lint 0 errors / 3 known warnings · `npm audit`: **2 high** (react-router/react-router-dom, GHSA-rxv8-25v2-qmq8, fix = 7.17.0) · eager `index` 462.20 KB (gz 147.88) vs ~462 budget — PASS · all route chunks ≤ 68 KB vs 70 budget — PASS (Roleplay + PDFReader at 68, 2 KB headroom) · **no secrets in any tracked file or in git history** (root `test-*.mjs`, canvases, full-history grep for `hf_`/`sk-or`/`AIza` patterns — clean) · prod bundle contains only the by-design-public Supabase publishable key.

---

## P1 — fix-first (5)

### P1-1 · Settings-only changes are silently REVERTED by cloud restore (data loss) — DEMONSTRATED
`src/store/useStore.js`: ~10 persisted mutations never stamp `lastMutationAt` / never `triggerCloudSync` — e.g. `setExamDate` (:1521), `markMistakeReviewed` (:1457), `toggleTheme` (:1598), `setDailyGoalLevel` (:1051), identity setters (:710-735), `markGuideSeen` (:1614). Push only fires from `enqueueSyncEventAction` (:278). `src/components/AuthGuard.jsx:134-136`: tie-break `cloudMs > localMs → restoreFromCloud()` — cloud `updated_at` is stamped at push time (~5 s *after* the last stamped mutation), so any later settings-only change loses and is overwritten on the next signed-in reload.
**Repro:** sign in → set exam date → don't review any card → hard reload → date reverts.
**Fix shape:** funnel every persisted-pref setter through one helper that stamps `lastMutationAt` + debounce-pushes (or stamp in a store middleware).

### P1-2 · Sync events enqueued during a flush are dropped — DEMONSTRATED
`src/store/useStore.js:329` captures `get().sync.queue`; after the awaited network work, `:370-378` **replaces** the queue with `result.remainingQueue` — clobbering anything enqueued mid-flight. No re-entrancy guard at entry; `Layout.jsx:84-86`'s `online` handler calls it unguarded (doubles the window). A `card_removed` lost here never reaches the cloud (adds eventually heal via the sign-in union; deletes don't).
**Fix shape:** re-slice the live queue by processed event ids instead of replacing; add an in-flight guard.

### P1-3 · Two grammar error-drills mark the CORRECT learner wrong — DEMONSTRATED (verified verbatim)
`src/data/grammar.js:108` (`error-mentadbir`) and `:113` (`error-menterjemahkan`): `answer === correction` (identical strings), and each explanation states the flagged form **is accepted** — so "No error" (the defensible answer) is graded wrong while the explanation agrees with the learner. Direct learner harm + trust damage.

### P1-4 · Wrong dictionary gloss taught into FSRS — DEMONSTRATED (verified verbatim)
`src/data/dictionary.js:368` — `'persahabatan': 'friendly (match)'`. *persahabatan* = **friendship** ("friendly match" = *perlawanan persahabatan*). Propagates into the Health & Sports topic pack (`src/data/topics.js:6`) → flashcards → exam vocabulary.

### P1-5 · PDF reader's core interaction is pointer-only (keyboard/switch users fully excluded) — DEMONSTRATED
`src/pages/PDFReader.jsx:1529-1535` (pointer handlers on the container) + `:1615-1633` (word spans: no `tabIndex`/`role`/`onKeyDown`). Tab skips every token — the page's primary function (tap-to-translate, select-to-deck) is unreachable without a pointer.

---

## P2 — fix-soon (selected; 14)

**Security / cost-abuse**
- **P2-S1 · `api/translate.js` = unauthenticated proxy on the owner's keys** — DEMONSTRATED live (`api/translate.js:4-13`: no auth/origin/rate-limit; endpoint reachable in prod; currently saved only by DeepL/Google keys not being configured yet). Fix: same Supabase-JWT gate as `api/gemini.js` + per-user cap.
- **P2-S2 · `api/gemini.js`: auth but NO server-side rate limit** — DEMONSTRATED. Open signup + `checkUserRole` auto-granting `enhanced` (`src/config/supabase.js:68-73`) ⇒ any registrant can drain the owner's `GEMINI_KEY` (client `DAILY_LIMIT=50` in `src/lib/ai.js:14` is bypassable by direct fetch). Fix: per-uid daily counter server-side.
- **P2-S3 · `react-router-dom` 7.13.2 → 7.17.0** — npm-audit HIGH (DoS via reflected input in single-fetch). Exploitability in this pure client-side SPA is low (no SSR/single-fetch), but the upgrade is one line; do it.

**Correctness**
- **P2-C1 · `reviewCardAction` matches by word only (`c.m !== malay`, `useStore.js:1102-1105`)** — reviewing a word reschedules its copy in EVERY deck (identity elsewhere is `m::t`). DEMONSTRATED.
- **P2-C2 · Cross-device delete resurrection** — delete on device A (`cloudSync.js:52-67` sets `deleted:true`), device B's sign-in union re-upserts it `deleted:false` (`useStore.js:829-853` + `cloudSync.js:40-48`). DEMONSTRATED.
- **P2-C3 · Two "day" definitions** — `getTodayISO()` is UTC (`useStore.js:79`, drives heatmap/challenge/AI quota); streak uses local `toDateString()` (:1100,:1174). In MY (UTC+8) the heatmap day rolls at 08:00 local. DEMONSTRATED.
- **P2-C4 · Single-due-card session never shows the summary** — stale closure on `sessionStats.reviewed` in `useStudySession.js:147`. DEMONSTRATED.
- **P2-C5 · No double-rate latch on flashcards** — `useStudySession.rate` (:122) + live keyboard 1-4 during the advance window (`FlashcardMode.jsx:82-85`) ⇒ double FSRS reviews. Typed modes guard; flashcards don't. DEMONSTRATED.
- **P2-C6 · Export/import drops data** — `exportData` (`useStore.js:1644-1681`) omits `examAttempts`, `guide`, `pdfReader`, `examRehearsalLang`, more; `importData` ignores exported `ai`. Device migration loses exam history. DEMONSTRATED.
- **P2-C7 · PDFReader "Replace" with a corrupt file destroys the open doc silently** — `destroyDoc()` before load (`PDFReader.jsx:205`); error only renders in the empty state. DEMONSTRATED (code).
- **P2-C8 · Selection/reveal indices leak across Reflow⇄Layout views** (own index spaces, shared `selIdx`/`glossState`) — wrong words highlighted after a switch. DEMONSTRATED (code).
- **P2-C9 · Scanned-PDF OCR un-cancellable during rasterise** — `acceptPdfOcr` shows progress before `ocrAbortRef` exists (`PDFReader.jsx:409-418`). DEMONSTRATED (code).
- **P2-C10 · Grammar cram serves stale wrong-language decks after MS⇄EN switch** (`Grammar.jsx:167-175` vs `:355-365`). DEMONSTRATED.

**Perf / UX**
- **P2-P1 · SW precaches `og-image.png` (752 KB) for every install** — only crawlers use it. One-line `globIgnores` fix (`vite.config.js:61`). DEMONSTRATED in `dist/sw.js`.
- **P2-U1 · Light mode keeps the dark-tuned neon palette** — `.light` (`src/index.css:111-130`) doesn't override `--color-accent/green/orange/cyan`; computed contrasts ≈ 1.6–3.2:1 on light bg where used as text. HYPOTHESIS (manual math; verify with a contrast tool). Adjacent: `--color-dim` on cards ≈ 3.9–4.1:1 in dark at 10–11 px.

Also in this band: TheaterModeProvider remounts the whole app subtree per navigation (`TheaterModeProvider.jsx:39` key on pathname — mechanism DEMONSTRATED, cost HYPOTHESIS); unstable `onRetry` busts `memo(AnnotatedWritingFeedback)` (`Writing.jsx:453` / `useWritingEvaluator.js:104`); tracked fossil repo copy `igcse-malay-master/` (46 files, nothing imports it); SW silent auto-reload mid-session risk (`skipWaiting` + hourly update — could reload during a 30-min Exam Rehearsal); touch targets <44 px across header/toolbar/chips (PRD says ≥44); no aria-live on any drill/flashcard answer feedback; SearchModal lacks dialog semantics/focus trap; Grammar auto-advance timers (2.2–5 s) with no pause (WCAG 2.2.1).

---

## P3 — worthwhile (selected; ~25)
Security hardening: telemetry_events anon INSERT `WITH CHECK (true)` (flood/poison; advisor-flagged) · `translations` cache writable by any authed user (cache poisoning) · client-set `user_id` in telemetry (spoofable) · no security headers/CSP in `vercel.json` · leaked-password protection off in Supabase Auth · `rls_auto_enable()` RPC executable (inert but revoke) · prompt injection via OCR/PDF/essay text into AI calls (DEMONSTRATED but low blast radius: user's own key, escaped output, no tools — optionally delimit untrusted text).
Correctness: streak DST edge (±1 day around spring-forward) · freeze consumption eats the comeback day (possibly intended) · repeat-escalated mistakes never auto-promote (only first-adds do) · cached Tesseract worker keeps first-mount progress logger (bar stuck at 0% on later docs) · `${c.m}${c.t}` queue key lacks delimiter (aliasing, latent) · `fetchSentenceEnglish` missing `.catch` (stranded pending state, hypothesis) · `shuffle()` in render path on cram-toggle frame (StrictMode divergence).
Health/docs: `src/lib/sm2.js` + root `tailwind.css` dead · root junk tracked (`test-*.mjs/webp/jpg`, `Untitled*.canvas`, `.verb.md`) · ~10 one-off scripts + 212 KB JSON artifacts to archive · **README.md:23 says "FSRS-4.5" and ARCHITECTURE.md still describes SM-2** (public-facing doc rot) · NEXT_SESSION_PROMPT/MASTER_PLAN/PHASE_0_DELIVERY fossils · RESUME_HERE at 261 KB (rotate closed entries) · CLAUDE.md chunk-budget list missing `use-reduced-motion` 120 KB + supabase `dist` 180 KB · dictionary header says 804, actual 790 · CLAUDE.md says 6 listening passages, actual 8.
UX/PWA: manifest lacks `shortcuts`/`screenshots`/`id`; single dark `theme-color` · sitemap missing 6 newer routes · Malay content lacks `lang="ms"` (SR reads Malay in English voice) · `speak()` silent no-op without TTS in ListenMode (Listening page guards; ListenMode doesn't) · "Open in Chrome" advice wrong on iOS · Dashboard stat tiles are `<button>`s that do nothing · dict-icon runtime cache (294 icons vs `maxEntries: 64` → eviction) · `#69f0ae` hardcoded hex (`Writing.jsx:39`).
Content: GRAMMAR_RULES meN- table lists `menulis` under "no change" row + dubious `merenang` (`grammar.js:145,16`) · duplicate MCQ option `an` (`grammarEng.js:57`) · `semalam` used in drills but missing from dictionary (hurts gloss coverage + unknownDensity) · `mewarnai` expected from a prefix-only drill (`grammar.js:21`) · gloss POS inconsistencies (`mesej: 'messages'`, `menjahit: 'sewing'`).

## Actively REFUTED (verified clean — trust anchors)
No XSS sink: the single HTML sink (`export.js:120 document.write`) escapes every field; no `dangerouslySetInnerHTML` anywhere; compare-links are `encodeURIComponent`-safe. BYOK keys: never in store/blob/URLs/telemetry; prod bundle secret-scan clean. RLS user-scoping correct on all 7 user tables (verified live). Store migrations v1→30: no clobbering found. Zustand selector discipline: repo-wide sweep clean. All 18 non-Dashboard routes lazy; wikidata chunk properly dynamic. Speech-API guards wrap all 30+ recognition entry points. No dead-end screens; offline UX genuinely strong. SEO head (OG/twitter/canonical/JSON-LD) strong.

---

## Feature suggestions (scored Impact×Confidence÷Effort, invariants respected)
| # | Feature | I | C | E | Score | Why |
|---|---|---|---|---|---|---|
| 1 | **Content-lint CI guard** (answer≠correction, unique MCQ options, answer∈options, gloss sanity, drill-words-in-dictionary) wired into the existing pre-commit gate | 4 | 5 | 1 | **20** | Would have mechanically caught P1-3, P1-4, the duplicate-option and `semalam` bugs |
| 2 | Auto-extract dictionary gaps from drill/passage/scenario corpora | 3 | 5 | 1 | 15 | Fixes the `semalam` class; improves gloss + unknownDensity accuracy |
| 3 | **Close the calibration loop**: "You were sure, but…" panel in SessionSummary + smart-study priority boost (wire the dead `getHypercorrectionTargets`, `useStore.js:701`) | 4 | 5 | 2 | 10 | Hypercorrection effect is well-evidenced; data already collected, getter already written, zero consumers today |
| 4 | Listening stage in Exam Rehearsal + Readiness composite (currently comp 30/writing 35/speaking 35 — Paper 4 invisible) | 4 | 4 | 2 | 8 | Readiness % is structurally blind to one paper |
| 5 | Dictation mode (TTS → type → diff feedback) | 4 | 4 | 2 | 8 | Doubles Paper-4 surface from existing TTS + diff libs |
| 6 | Retire XP or tie it to a meaning loop | 2 | 4 | 1 | 8 | Only surface serving no learning-science principle |
| 7 | Per-paper balance meter on Dashboard ("Listening: 0 min this week") | 3 | 4 | 2 | 6 | Distributed practice across papers; data already in store |
| 8 | Parameterized listening passages (shuffle names/times/numbers) | 4 | 3 | 3 | 4 | 8-passage bank is memorized after ~2 rounds |
| 9 | Record-and-compare in Speaking (audioRecorder.js exists) | 3 | 3 | 2 | 4.5 | Pronunciation feedback specificity, no new deps |
| 10 | Cloze-listening (gap-fill transcript while audio plays) | 4 | 3 | 3 | 4 | Stronger retrieval than MCQ; reuses clozeBuilder |

## Top-10 fix backlog (ranked)
1. **Content correctness batch + lint guard** (P1-3, P1-4, dup option, meN- table, `semalam`; then feature #1 locks it) — 20
2. **react-router-dom → 7.17.0** (P2-S3; one line + gate run) — 15
3. **Settings-sync revert** (P1-1: stamp `lastMutationAt` in every persisted mutation + tie-break sanity) — 10
4. **Queue clobber + re-entrancy guard** (P1-2) — 10
5. **API proxy hardening** (P2-S1/S2: JWT-gate translate, per-uid cap on gemini; + security headers in vercel.json) — 10
6. **Calibration loop** (feature #3) — 10
7. **og-image precache exclusion** (P2-P1; one line) — 10
8. **Repo hygiene sweep** (fossil dir, root junk, dead files, README "FSRS-4.5", script archive) — 10
9. **Light-mode contrast palette** (P2-U1) + dim-color bump — 8
10. **Reader/drill a11y pass** (P1-5 keyboard path, aria-live on feedback, 44 px sweep, SearchModal dialog semantics) — 8

## Coverage appendix (by auditor, with verdicts)
**Security** (api/* · supabase SQL + live policies/advisors · all AI/key/telemetry libs · store sync slice · vercel.json · index.html · prod bundle + live endpoints): 2×P2, 5×P3, XSS/keys/RLS refuted-clean. **Correctness** (useStore full read · sync engine/status/cloudSync · fsrs · Study + hooks + study libs · PDFReader · purity sweep): 2×P1, 10×P2, 8×P3; migrations/selectors refuted-clean. **Perf/health** (selector sweep all pages+components · App.jsx · contexts · dist chunk graph · PWA config · scripts/ · root): 4×P2, 10×P3; budgets PASS. **UX/a11y/PWA/SEO** (index.html · manifest/SW · Layout + 5 biggest pages · modals · speech guards · offline states): 1×P1, 8×P2, 12×P3; SEO/offline/empty-states refuted-strong. **Product/learning-science** (full CLAUDE.md rubric × all pages · dictionary/grammar/scenarios/exemplars/listening sampled ~30 entries each · funnel trace · invariants): 2×P1, 7×P2/P3 + 10 scored features; funnel + rubric-direction-(a) clean.
**Known limits:** contrast figures are manual computations (run a tooling pass before trusting exact ratios); CikguBot.jsx, Writing grader internals, wordFamilies content, and wikidata data quality were sampled, not exhaustively read; no runtime profiling (re-render costs are mechanism-verified, not measured); listening/grammar content checked against general standard-Malay knowledge, not DBP — have a native speaker confirm P1-3/P3-content items before editing.
