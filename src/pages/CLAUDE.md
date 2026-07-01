# src/pages/ — local rules for route/page components

Folder-local supplement to the root `CLAUDE.md`. Auto-loaded when you edit under `src/pages/`. One component per route (routes wired in `src/App.jsx`). The core rule: **read the whole file before editing — partial rewrites of these state machines cause regressions.**

## Which files are genuinely large (read-in-full is mandatory)
`wc -l` at last check:
- `PDFReader.jsx` **2236** (by far the largest; the reader) · `Settings.jsx` 1417 (long but mostly linear form sections) · `Grammar.jsx` 945 · `Dashboard.jsx` 929 · `Speaking.jsx` 900 · `ExamRehearsal.jsx` 822 · `CikguBot.jsx` 757 · `Roleplay.jsx` 592 · `Writing.jsx` 581.
- **`Study.jsx` is only ~186 lines** — it just wires modes via `useStudySession`. Editing *study behavior* means editing **`src/hooks/useStudySession.js`** and **`src/components/study/{Flashcard,Quiz,Type,Listen,Cloze,Produce}Mode.jsx`**, not this page. (The root CLAUDE.md calls Study a "complex state machine" — that complexity moved into the hook/mode components.)

## Lazy-loading convention (App.jsx)
- **`Dashboard` is the only eager page** (every cold load lands on it). Every other page uses **`lazyWithRetry(() => import('./pages/X'), 'X')`** — not bare `React.lazy` (`lazyWithRetry` reloads once on a stale-chunk error instead of dropping to the ErrorBoundary). All routes share one `<Suspense>`.
- New page → `const X = lazyWithRetry(() => import('./pages/X'), 'X')` + a `<Route>`. Never add an eager import.

## Bundle budget & keep-these-lazy
- Each per-route PAGE chunk must stay **< 70 KB raw** (`npm run build`, zero errors). Accepted exceptions: `PDFReader` ~71.7 KB gz-20.7, `CikguBot` ~76 KB (its bulk is the in-memory `cikguKnowledge.js` KB — do not gut it for the number).
- **Keep lazy** (heavy on-demand subtrees, confirmed live): `Roleplay` → `RoleplaySession`; `Writing` → `ExemplarPanel` + `WritingTutor` + `AnnotatedWritingFeedback`; `PDFReader` → `pdfreader/LayoutView` + `FullTranslationView`; `Dashboard` → its 7 widgets (`MixedSession`, `RecentPerformance`, `ProgressSparkline`, `WorstTurnWidget`, `SpeakingProgress`, `PaperBalance`, `MasteredWordsModal`).

## FeedbackLive is required for any drill surface
Every drill must announce correct/incorrect through a `<FeedbackLive>` polite live region (WCAG 4.1.3). Rendered directly by: `Comprehension`, `ClozeListening`, `Dictation`, `Listening`, `SavedWordCloze`, `Grammar` (5 sites — one per sub-mode), `PDFReader` (`kbAnnounce`, the keyboard layer). **Study delegates it to the mode components** (`src/components/study/*Mode.jsx`) — so "add a drill" means the surface must *reach* a FeedbackLive, which for study work is the mode component, not the page. Speaking/Roleplay/Writing don't render it at page level (their feedback is spoken / in lazy panels).

## Bilingual / studyLang coupling (don't leak languages across the divide)
- **Language-scoped** (filter content by `studyLang` via `cardsForLang` + scope helpers): `Dashboard`, `ForYou`, `SmartStudy` (Study scopes inside `useStudySession`). Cross-language data must never leak into a session.
- **Passage-pickers** (order by lang, don't filter): `Comprehension`, `Listening` — via `leadByLang`.
- **Seed-a-toggle** (init a local `lang` state from `studyLang`, then in-page toggleable): `Roleplay`, `Speaking`, `Grammar`, `Writing`. Seed from `studyLang`; never hardcode a language.
- **Gloss-source** follows active `studyLang`: `Import`, `PDFReader` via `glossPlanFor(studyLang)`.

## `pdfreader/` subfolder
One file: `LayoutView.jsx` — the non-default faithful-page-render reader mode, lazy-split into its own chunk to keep `PDFReader` under budget. Keep it lazy.

## Testing pages
- Unit (Vitest): `src/pages/__tests__/` — language-coupling regressions (`forYouLang`, `grammarCramLangSwitch`, `roleplaySttLocale`). `npm run test:run`.
- E2E (Playwright): `tests/e2e/` — nearly every page has a `guide-*.spec.js` / `*-lang.spec.js`; also `reader-keyboard.spec.js`, `a11y-tap-targets.spec.js`, `lazy-split.spec.js`. `npm run test:e2e`. Two known-flaky specs under full-suite load: `full-translation.spec.js`, `instruct-router.spec.js`. Run the touched page's spec before shipping UI.
