# Build plan — tappable saved-word highlights (2026-06-02)

Spec: `docs/superpowers/specs/2026-06-02-tappable-highlights-design.md`.
Read the spec FIRST — especially §3 (the non-negotiable quality bars) and §4 (the
design that satisfies them by construction). The whole point of this feature is to
add it WITHOUT breaking text selection / accessibility; if a step risks a bar in
§3, stop and re-scope.

> **v2 (2026-06-03):** plan upgraded to match the v2 spec — adds the **mandatory
> a11y step (WCAG 1.4.13)** to the MVP and a **Tier-2 section** (recall-first +
> forgot-signal). Spec §7 decisions are now Kheshav-APPROVED (staged MVP→Tier-2,
> soft forgot-signal). Build Steps 1–5 = the MVP; Steps 6–7 = Tier-2 (separate,
> optional, can be a later session).

## Pre-flight (do before any code)
1. Verify baseline: `git status` clean, `npm run test:run` (should be 384),
   `npm run lint` (0 errors / 3 warnings), prod READY. If counts differ, read
   `git log` — work landed since this plan was written.
2. Spec §7 decisions are pre-approved (2026-06-03). Only re-confirm if you're
   deviating. Defaults: instant-gloss MVP + example sentence; tappable =
   whatever's currently highlighted; "Review in Study" link included; MVP keyboard
   story per spec §4a/D4; forgot-signal = Tier-2 soft-signal only.

## Build order (TDD — pure logic first, DOM glue second)

### Step 1 — pure `wordAtOffset` (TDD)
- Add to `src/lib/savedWordHighlight.js`:
  `wordAtOffset(text, offset, words) → word | null`.
  Implementation: run `findSavedWordMatches(text, words)`; return the `word` of the
  match whose `start <= offset < end`, else null.
- Tests in `src/lib/__tests__/savedWordHighlight.test.js`:
  offset inside a match → word; offset on the space between words → null; offset
  inside a non-saved word → null; multi-word phrase mid-phrase → the phrase;
  offset past end / empty inputs → null.
- RED → GREEN. Keep `npm run test:run` green.

### Step 2 — the tap hook (DOM glue; verify via e2e, not unit)
- New `src/hooks/useSavedWordTap.js`, mounted once in `Layout` next to
  `useSavedWordHighlights()`:
  - Read `cards` + `highlightMode`; derive `words = savedWordsForMode(...)`.
  - `pointerdown` records `{x, y}`. `pointerup`: if moved > 6px → bail (it was a
    drag/selection). If `window.getSelection()` is non-collapsed → bail.
  - Hit-test: `caretRangeFromPoint(x,y)` (fallback `caretPositionFromPoint`) →
    `{ node, offset }`. Guard: node is a text node, parent not inside
    `[data-no-highlight], a, button, input, textarea`.
  - `word = wordAtOffset(node.textContent, offset, words)`. If null → bail.
  - Find the card: `cards.find(c => c.m.toLowerCase() === word)`. Set popover
    state `{ word, english: card.e, ex: card.ex, rect: <word's range rect> }`.
  - Feature-detect: if no `caretRangeFromPoint`/`caretPositionFromPoint`, no-op.
- Keep it a no-op when `highlightMode === 'off'` or `words` is empty.

### Step 3 — the review popover (presentational)
- New `src/components/SavedWordPopover.jsx` (or extract a shared `WordPopover`
  from `SelectionToCard.jsx` if it stays clean — surgical, don't regress the save
  popover). Read-only: bold Malay word · 🔊 (`speak(word, 'ms-MY')`) · English
  meaning · optional "Review in Study" link (navigate('/study')). Reuse the
  dismiss-on-Escape/scroll/outside-click pattern + the `animate-fadeUp` styling +
  theme `var(--color-*)`. NO save button.
- Render it from `Layout` driven by the hook's state.

### Step 3b — accessibility (WCAG 1.4.13, bar #5 — MANDATORY, not optional)
- The popover MUST have `role="dialog"` + an accessible name, be **Esc-
  dismissible** (reuse SelectionToCard's keydown effect), and **return focus** to a
  sane anchor on close. Move focus INTO the popover on open so a keyboard/AT user
  isn't stranded.
- `::highlight()` ranges aren't focusable DOM nodes, so the MVP keyboard *trigger*
  story is per spec §4a/D4 (select-to-card covers AT users; the popover itself is
  fully keyboard-operable once open). A dedicated keyboard trigger over highlighted
  words is Tier-2, not MVP. Do NOT ship a pointer-only popover with no Esc/focus
  handling — that fails the law.

### Step 4 — eyeball + e2e
- `tests/e2e/saved-word-tap.spec.js` per spec §8 (6 tests). Reuse `bindStore` +
  the inject-prose pattern from `saved-word-highlight.spec.js`. CRITICAL tests:
  selection-not-broken (press-drag → no popover), link-safety, and the **a11y**
  test (Esc dismisses; `role="dialog"` + name; focus returns).
- Screenshot the review popover light + dark; eyeball both.

### Step 5 — ship the MVP
- `npm run build` (clean) · `lint` (0 err) · `test:run` (all) · the new e2e green.
- Commit (atomic) + refresh `RESUME_HERE.md` in the SAME commit. Auto-push →
  Vercel auto-deploys → confirm READY via the Vercel MCP
  (project `prj_WuRvwtonuh4XvdG42dIlTVLnd4Nn`, team `team_nmTUChWxLgUOQBpoiRKx0hZy`).

## Tier-2 (separate / optional — recall-first + forgot-signal; spec §4b)
Build ONLY after the MVP is shipped + eyeballed. Adaptive, never forced.

### Step 6 — recall-first reveal for due words
- In `SavedWordPopover`, branch on the tapped card's FSRS state. **Due/weak** =
  `due <= Date.now()` OR `state ∈ {New, Learning, Relearning}` OR `(lapses||0) >= 3`
  (use the named `State` enum from `lib/fsrs.js` — do NOT write `state <= 1`, that
  misses `Relearning`=3, a lapsed card. Mirror the tiering in
  `src/data/drillVariants.js` — the precedent for FSRS-state-driven presentation).
- Due → **recall mode**: show Malay word + 🔊 + a "Show meaning" button, meaning
  hidden until tapped (retrieval attempt → reveal = feedback). Strong → instant
  mode (the MVP gloss). "Show meaning" is always one tap — never gate/score it.
- e2e: due word → meaning hidden until "Show meaning"; strong word → instant.

### Step 7 — forgot-signal (soft only)
- In recall mode, after reveal, show a subtle **"I forgot this"** button →
  `addMistake({ type:'review', category:'vocab', source:'tappable-review',
  language:'ms', word, correct: card.e, severity:'low' })`.
- **GUARDRAIL (hard rule):** do NOT call any FSRS `Rating` / reschedule. Touch
  `lastReviewedAt` via `addMistake` only. A tap must never change `due`/`stability`.
- e2e: "I forgot this" adds exactly ONE `mistakes` entry AND the card's
  `due`/`stability` are byte-identical before/after.

## Gotchas
- **Vite `?t=` module trap** in e2e: rebind the store via the live resource URL
  after every goto/reload (see `bindStore` in existing specs).
- **caretRangeFromPoint is cross-browser-split** — Chromium/WebKit use
  `document.caretRangeFromPoint`; Firefox uses `document.caretPositionFromPoint`
  (returns `{offsetNode, offset}`). Handle both; Playwright is chromium here but
  write it portably.
- **Don't subscribe Layout to `cards` reactively in a way that churns** — follow
  the `useSavedWordHighlights` pattern (read via getState in the handler; key only
  for re-subscribe). Tap handler reads live state at click time anyway.
- **Mobile:** `pointerup` covers touch; the 6px drag-guard prevents a scroll/long-
  press from firing the popover.
- **Coexistence with `SelectionToCard` (both mount in Layout, both watch the
  document).** They must be mutually exclusive by construction: SAVE fires on a
  drag-**selection** (non-collapsed range); REVIEW fires on a no-drag **click** /
  keyboard-select landing on an already-saved word. A plain tap leaves the
  selection collapsed, so SelectionToCard no-ops — verify it doesn't flash. For the
  shared `selectionchange` keyboard path, route by "is the selected word already a
  saved card?": already-saved → REVIEW popover; not-saved → SAVE popover. Never show
  both at once. Add an e2e: keyboard-select a saved word → review (not save).

## Paste-ready kickoff prompt for the new session
> You are a fresh Claude Code session on the IGCSE Malay Master app
> ("ooga da boogadamalay"), React/Vite SPA, live at
> https://upg-igcse-malay-master.vercel.app. select-to-card + Tier-2 saved-word
> highlights (CSS Custom Highlight API) + the Off/Saved/All setting are already
> shipped. The tappable spec + plan were just upgraded to **v2 (2026-06-03)** in a
> learning-science / UDL design session — read them FRESH; the decisions are settled.
>
> READ FIRST: your auto-memory MEMORY.md (esp. [[feedback_layman_explanations]],
> [[feedback_standing_commit_permission]], [[feedback_time_estimates_add]],
> [[feedback_self_review_pass]], [[project_skills_triage]]), then `RESUME_HERE.md`
> (top blocks), then `docs/superpowers/specs/2026-06-02-tappable-highlights-design.md`
> (the WHOLE v2 spec — §3 quality bars are non-negotiable) and
> `docs/superpowers/plans/2026-06-02-tappable-highlights.md` (this plan).
>
> TASK: build the tappable saved-word highlights **MVP** = tap (or keyboard-select)
> an already-highlighted word while reading → a small READ-ONLY review popover
> (meaning + 🔊 + the example sentence + a "Review in Study" link), distinct from
> select-to-card's save flow. Follow the plan's TDD build order: **Steps 1–5 = MVP**
> (build these); **Steps 6–7 = Tier-2** (recall-first reveal for due words +
> soft "I forgot this" signal — optional this session or a later one). Two hard bars
> from §3: (a) MUST NOT break text selection/copy or links — the drag-guard +
> click-based + additive design guarantees that; (b) **accessibility is a POSITIVE
> requirement, not just "don't break it"**: a keyboard trigger via `selectionchange`
> (Shift+Arrow opens the popover via the same hit-test), Esc dismiss, `role="dialog"`
> + focus management (WCAG 1.4.13 / 2.1.1). Do NOT lean on select-to-card for the
> keyboard path — it's mouse/touch-only today.
>
> HOW I WANT YOU TO WORK (standing prefs): explain in plain layman terms, assume I
> forget context between sessions, evaluate my choices and recommend better ones,
> lead with a short time estimate before non-trivial steps, and do one bounded
> self-review pass before claiming done. Standing permission to stage/commit/sync —
> verified, atomic units; main auto-deploys, so confirm Vercel READY after. TDD pure
> logic first; verify build+lint+test; eyeball light AND dark via a Playwright
> screenshot spec; refresh RESUME_HERE in the same commit.
>
> START BY: (1) verifying the baseline (git clean, test:run, lint, prod READY),
> then (2) Step 1 of the plan (TDD `wordAtOffset`). The spec §7 decisions are
> PRE-APPROVED (2026-06-03): tappable = whatever's currently highlighted; popover =
> meaning + 🔊 + example + a "Review in Study" link; MVP keyboard trigger =
> `selectionchange` (Shift+Arrow); forgot-signal = Tier-2 soft-signal only (must
> NEVER reschedule FSRS). Do NOT re-ask these — only surface a question if you hit a
> NEW fork the spec didn't cover. Quality over speed.

## Step-by-step (plain-language version, for Kheshav)
1. New session, paste the prompt above.
2. It checks everything still works (the baseline).
3. It builds straight away — the design decisions are already locked, so it won't
   pester you with questions unless it genuinely hits something new.
4. It builds the "did I tap on a saved word?" logic first, with tests.
5. It wires up the tap → popover, makes it keyboard-reachable (Shift+Arrow + Esc),
   then tests it can't break selecting/copying text or links.
6. It shows you screenshots (light + dark), then commits + deploys, and confirms
   it's live.
7. (Optional) If there's time, it adds the smarter Tier-2 bits: a "do you remember?"
   reveal for words you're due to practise, and a gentle "I forgot this" button.
