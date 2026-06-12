# Reader + drill keyboard / SR accessibility — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL — use superpowers:test-driven-development
> (write each test red first) and superpowers:executing-plans / subagent-driven-development
> to work task-by-task. Steps use `- [ ]` for tracking.

**Goal:** make the reflow PDF reader fully keyboard- and switch-operable, and give every
drill/flashcard feedback + the SearchModal proper screen-reader semantics — **additively**,
with the phone pointer path and the reveal-gated gloss→FSRS core byte-for-byte unchanged.

**Spec (read first):** `docs/superpowers/specs/2026-06-12-reader-drill-a11y-design.md` — WHY,
the key map (§3.3), the D1–D9 decision log, invariants (§2), acceptance F1–F11 (§7), test
plan (§8).

**Architecture (nothing rewritten):** the keyboard layer is plumbing over existing mode-aware
functions. A new **pure** `readerKeymap.js` maps key+state→action (mirrors `gestureModel.js`);
PDFReader's reflow container gets one delegated `onKeyDown` + roving `tabIndex` on tokens; the
action handlers **call** `handleCommit` / `classifyGesture` / `revealGloss` / `addGloss`
unchanged. `useSelectionMode.js` + `gestureModel.js` are **not edited**.

---

## Verified anchors (live source, 2026-06-12)

- Reflow container `data-testid="reader-reflow"` + pointer handlers — `PDFReader.jsx:1529-1537`.
- Content token span `<span data-token-i={p.i}>` (no a11y attrs) — `PDFReader.jsx:1615-1633`.
- `handleCommit({startIndex,endIndex,kind})` (mode-aware) — `PDFReader.jsx:519`; `showSelection
  = mode==='select'` — `:471`; `addToSelection` — `:504`; `addSelectionToDeck` (focusable
  "Add to deck") — `:586`.
- `revealGloss(i)` — `:638`; `addGloss(g)` — `:644`; `glossByIndex` use — `:1605`; `isRevealed`
  — `:1637`.
- `groupMode` toolbar toggle — `:101`, buttons `:1147/:1151`; Translate/Select toggle — `:1138`.
- `sel = useSelectionMode(handleCommit, groupMode ? 'phrase' : 'words')` — `:551`.
- Pure classifier `classifyGesture` — `gestureModel.js:23`. Hit-test primitive — `useSelectionMode.js:27`.
- `tokenized.pages[].paragraphs[].{kind:'word'|'space'|'punct', i, text}` — render loop
  `:1539-1646` (build the content-token `order` from this: keep `kind==='word'`).
- DocGloss aria-live pattern to mirror — `DocGloss.jsx:54`.
- Study feedback render: `ClozeMode.jsx:40`, `ListenMode.jsx:43`, `TypeMode.jsx:32`,
  `QuizMode.jsx:15/37`, `FlashcardMode.jsx:51/57/63/69`.
- Grammar feedback state: `Grammar.jsx:201,254,275,284,293`.
- SearchModal overlay (plain div, autoFocus input) — `SearchModal.jsx:33-48`.
- Header/toolbar small targets — `Layout.jsx:188/259/145`, `SearchModal.jsx:47/71/77/95`.
- e2e store-binding pattern (`bindStore`, Vite `?t=` trap) — `tests/e2e/mistake-promotion.spec.js`.

---

## File structure (decomposition locked here)

- **Create** `src/lib/readerKeymap.js` — pure `resolveReaderKey({key,shiftKey}, ctx)`.
- **Create** `src/lib/readerKeymap.test.js` — every key × both modes × range parity.
- **Create** `src/components/FeedbackLive.jsx` — shared polite status line.
- **Create** `src/components/__tests__/feedbackLive.test.jsx`.
- **Create** `src/lib/useFocusTrap.js` — reusable dialog focus trap.
- **Create** `src/lib/__tests__/useFocusTrap.test.js`.
- **Modify** `src/pages/PDFReader.jsx` — roving `tabIndex`/`aria-label`/`onKeyDown` on tokens
  + container `role`/`aria-label`/`aria-keyshortcuts` + delegated key handler + `kbRange`
  state + `FeedbackLive`. **No change to `handleCommit`/`revealGloss`/`addGloss` bodies.**
- **Modify** `src/index.css` — add `.sr-only` + a token `:focus-visible` ring (if absent).
- **Modify** `src/components/SearchModal.jsx` — dialog role/aria-modal + `useFocusTrap`.
- **Modify** study modes — `ClozeMode.jsx`, `ListenMode.jsx`, `TypeMode.jsx`, `QuizMode.jsx`,
  `FlashcardMode.jsx` — render `<FeedbackLive>` off existing `fb`.
- **Modify** `src/pages/Grammar.jsx` — `<FeedbackLive>` off existing feedback state.
- **Modify** 44 px offenders — `SearchModal.jsx`, `Layout.jsx`, `PDFReader.jsx` toolbar.
- **Create** `src/components/__tests__/searchModalA11y.test.jsx`.
- **Create** `tests/e2e/reader-keyboard.spec.js` (F1–F7) + tap-target sweep (F10).
- **Modify** `RESUME_HERE.md` + `CLAUDE.md` — feature note (final commit).

**Build order:** 1 pure `readerKeymap` (+test) → 2 `FeedbackLive` (+test) wired into study +
Grammar (#2) → 3 `useFocusTrap` (+test) + SearchModal dialog (#4) → 4 PDFReader reader
keyboard wiring (#1) + e2e → 5 44 px sweep (#3) + tap-target e2e → 6 docs/verify/deploy.

*(Order rationale: the self-contained, lowest-risk pieces (#2 live region, #4 modal) land
first and bank green tests; the reader (#1) — the largest surface — lands once its pure
dispatcher is already proven. #3 is a mechanical sweep last.)*

---

## Task 1 — Pure key dispatcher `src/lib/readerKeymap.js`  (#1 core, no DOM)
- [ ] TDD: write `readerKeymap.test.js` first (red). Cover: `←/↑`→prev, `→/↓`→next, clamp at
      ends, `Home/End`, `Enter` no-range→`activate`, `Enter` with range→`commitRange` whose
      `kind` equals `classifyGesture(...)` for the same span (assert `'words'` vs `'phrase'`
      by `groupOn`), `Shift+Arrow`→`extend`, `a`→`addDeck`, `Esc`→`clearRange`, unknown→`null`.
- [ ] Implement `resolveReaderKey`. `order` is the content-token index array; neighbour =
      position in `order`. `commitRange` calls `classifyGesture` internally.
- [ ] VERIFY: `npm run test:run -- readerKeymap` green; test was red before impl.

## Task 2 — Shared live region + drill/flashcard feedback (#2 → F9)
- [ ] Create `FeedbackLive.jsx` (spec §4) + `.sr-only` in `src/index.css` (if missing).
- [ ] TDD `feedbackLive.test.jsx` (red): renders `role="status"`/`aria-live="polite"` with text.
- [ ] Wire one `<FeedbackLive text=...>` into each: `ClozeMode`, `ListenMode`, `TypeMode`,
      `QuizMode`, `FlashcardMode` (each sub-mode's `fb`), and `Grammar.jsx` (drill/sva/art/tense).
      Text = the same string shown (e.g. `fb.correct ? 'Correct' : \`Not quite — ${fb.answer}\``).
      **Do not touch** auto-advance timers or visual feedback.
- [ ] VERIFY: tests green; manually confirm a SR (or the a11y tree) announces on answer.

## Task 3 — Focus trap + SearchModal dialog (#4 → F11)
- [ ] TDD `useFocusTrap.test.js` (red): Tab/Shift+Tab wrap; Esc→onClose; focus returns to trigger.
- [ ] Implement `src/lib/useFocusTrap.js` (spec §6).
- [ ] `SearchModal.jsx`: add `role="dialog"`, `aria-modal="true"`, `aria-label`, `ref`, and
      `useFocusTrap(ref,{active:open,onClose})`. Keep backdrop click-close.
- [ ] TDD `searchModalA11y.test.jsx` (red→green): role/aria-modal present, Esc closes, focus returns.
- [ ] VERIFY: tests green.

## Task 4 — Reader keyboard wiring in PDFReader (#1 → F1–F8)
- [ ] Build memoized `order` (content-token indices) from `tokenized.pages`.
- [ ] State: `activeTokenIndex` (default first), `kbRange` ({anchor,focus}|null).
- [ ] Token span (`:1615`): add `tabIndex={i===activeTokenIndex?0:-1}`, `id={\`tok-${p.i}\`}`,
      `aria-label` **only when** selected/phrase/lowConf/revealed-meaning, and the range
      highlight bg (reuse `--color-accent-subtle`) when in `kbRange`. **Keep all existing
      pointer/title/style.**
- [ ] Container (`:1529`): add `role="group"`, `aria-label`, `aria-keyshortcuts`, and a single
      `onKeyDown` that calls `resolveReaderKey(...)` then performs the action:
      `move/extend`→set active + `.focus()` the new token; `activate`→gloss-if-present
      `revealGloss(i)` else `handleCommit({startIndex:i,endIndex:i,kind:'word'})`;
      `commitRange`→`handleCommit({...})`; `addDeck`→`addGloss(glossByIndex.get(i))` or polite
      hint; `clearRange`→reset. **`onKeyDown` is the ONLY new container prop.**
- [ ] Add `<FeedbackLive>` for reader results (reveal text / "Added X" / "Selecting N words").
- [ ] `:focus-visible` ring on tokens in `src/index.css`.
- [ ] TDD `tests/e2e/reader-keyboard.spec.js` (red→green): F1–F7; deck add via `bindStore`.
- [ ] VERIFY F8: existing `gestureModel`/`useSelectionMode` unit tests + PDFReader pointer e2e
      still green and those two files show **no diff**.

## Task 5 — 44 px target-size sweep (#3 → F10)
- [ ] Audit header/toolbar/SearchModal chips in Chromium; list every control <44 px.
- [ ] Apply the density-preserving idiom (spec §5): `min-w-[44px] min-h-[44px]
      inline-flex items-center justify-center`, or a transparent overlay where a row would grow.
- [ ] e2e tap-target sweep: `boundingBox()` ≥44 over the enumerated controls.
- [ ] VERIFY: e2e green; visual density unchanged (screenshot dark + light).

## Task 6 — Docs + verify + deploy
- [ ] Update `RESUME_HERE.md` (mark P1-5 shipped) + the CLAUDE.md a11y note, same commit.
- [ ] Full gate: `npm run build` (re-record chunk baselines), `npm run test:run`,
      `npm run lint` (0 new warnings), content-lint. 19 routes render; dark+light; reload-persist.
- [ ] Commit (gate auto-runs build/test/lint) → push → confirm Vercel READY on upg-.

---

## Definition of done
F1–F11 all green and previously red-proofed; pointer path + `gestureModel.js` /
`useSelectionMode.js` unchanged (F8); reveal-gate intact (focus never reveals); MS/EN toggles
+ gloss→FSRS core unaffected; gate green; Vercel READY.
