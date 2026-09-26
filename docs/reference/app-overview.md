# App overview — features, routes, SEO, FSRS, React perf notes

Moved out of the root `CLAUDE.md` on 2026-09-26 so it loads on demand instead of into every session.

## Feature list

**IGCSE Malay Master** ("ooga da boogadamalay") — a React SPA for IGCSE Malay AND English language learning (0546 / 0500 / 0510). Features: FSRS-6 spaced repetition, 7 study modes (incl. a selectable Produce/productive-recall mode), AI roleplay with scoring (bilingual), expert-system grammar tutor (Cikgu Maya), reading comprehension, IGCSE Paper 4 listening practice, interactive bilingual grammar drills, writing analysis (21 IGCSE formats with band-6 exemplars), pronunciation practice via Web Speech API, word family explorer, universal mistake journal with auto-promotion to FSRS cards, exam countdown planner, a 30-min spaced exam rehearsal mode with composite Readiness %, and **past-paper photo/scan study via free on-device OCR** (Tesseract.js — photograph a printed page and study it in the same reveal-gated reader; an optional consent-gated BYOK-vision "Sharper read" re-reads messy photos/handwriting on the user's own AI key), and **"study from a recording" via free on-device speech-to-text** (transformers.js + Whisper ONNX — upload or record an audio clip and study its transcript in the same reader; the audio never leaves the device). The reflow reader is fully **keyboard/switch-operable** (roving tabindex + pure `readerKeymap.js` dispatcher), every drill announces correct/incorrect via a polite live region (`FeedbackLive`), and header/toolbar/SearchModal targets meet ≥44px (WCAG 2.1.1 / 4.1.3 / 2.5.5 — shipped 2026-06-12, P1-5). All state persists locally via Zustand + localStorage with optional Supabase cloud sync.

## Spaced repetition

The app uses **FSRS-6** (via the `ts-fsrs` library) in `src/lib/fsrs.js` — not SM-2. `fsrs.js` never pins a weight array; it uses `generatorParameters()` defaults, so the app runs whatever algorithm version ts-fsrs ships — currently **FSRS-6.0 (21-weight set)** in ts-fsrs 5.3.2. (A guard in `fsrs.test.js` pins this so the label can't drift from the library again.) `fsrs.js` is the active algorithm. Cards are rated with `Rating.Again/Hard/Good/Easy`. FSRS manages `stability`, `difficulty`, `state` (New/Learning/Review/Relearning), and `due` dates.

## Routing

21 routes defined in `src/App.jsx` (+ a `*` catch-all), all wrapped in `<Layout>` (header + bottom nav), `<ErrorBoundary>`, and `<Suspense>` (every page except Dashboard is `lazyWithRetry()`-imported — NOT bare `React.lazy`; it reloads once on a stale-chunk error instead of dropping to the ErrorBoundary — splitting the bundle):
`/` `/study` `/roleplay` `/grammar` `/writing` `/import` `/settings` `/mistakes` `/word-families` `/cikgu` `/comprehension` `/pdf-reader` `/speaking` `/exam-rehearsal` `/listening` `/dictation` `/cloze-listening` `/smart-study` `/practice` `/saved-cloze` `/for-you`

Bottom nav shows 4 primary items + "More" drawer (defined in `src/components/Layout.jsx`).

**Crawler SEO — build-time per-route `<head>` (shipped 2026-07-15).** `src/lib/routeMeta.js` is the single source of truth mapping each route → `{ name, title, description, index }`. The `seoPrerender` Vite plugin (`vite.config.js`, `apply:'build'`+`enforce:'post'`) reads the built `index.html` and `emitFile`s a static `dist/<route>/index.html` per route with its own title/description/canonical/OG (pure logic in `src/lib/seoHead.js`), plus generated `robots.txt`+`sitemap.xml` — so a no-JS crawler sees per-route meta (Vercel serves the file; filesystem beats the SPA catch-all rewrite). Per-deployment `VITE_BASE_URL`/`VITE_NOINDEX` (build-time env) set the host + noindex the `og-` mirror. `public/robots.txt`/`sitemap.xml` are **generated, not committed** — don't re-add static ones. The Layout H1 is a route-derived `sr-only` page name (`metaForPath(location.pathname).name`); the client `<Meta>` keeps canonical/OG in sync on navigation. Pure logic is unit-tested (`routeMeta.test.js`/`seoHead.test.js`); `scripts/verify-seo.mjs` + `tests/e2e/seo-h1.spec.js` verify the built output.

## Styling detail

- 3D flashcard flip: CSS `perspective`, `preserve-3d`, `backface-hidden`, `rotate-y-180`.

## Performance pitfalls (React)

- **Memo prop boundaries**: `React.memo(Component)` only helps if the props are referentially stable. If you pass an arrow callback (`onRetry={() => ...}`), the closure changes every render. Either use `useCallback` or pass primitives + a stable `navigate` so the component constructs the closure internally.
- **Code splitting is in App.jsx**: don't add eager imports for new pages. Wrap them in `lazyWithRetry(() => import('./pages/X'), 'X')` (corrected 2026-09-26 — the old text said bare `lazy`, which contradicted Routing and `App.jsx`) and the existing `<Suspense>` will handle the fallback.
