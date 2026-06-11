# Website fixes — triage + design spec (2026-06-11)

**Source:** Kheshav's live-use bug/UX report (2026-06-11, while using the deployed app).
**Session type:** triage + Design (Issue 2 fixed inline; Issues 1/3/4/5 designed, not built).
**Invariants:** no paywall · free paths byte-identical · Malay **and** English learning quality first ·
don't break MS/EN toggles · word-gloss→FSRS core untouched. See `[[project_invariants]]`.

Each item: root cause (live-code), severity, fix approach, options, open Qs (defaults bracketed),
build estimate. Decide-and-flag: defaults chosen on **learning quality > simplicity > convenience**.

---

## ✅ Issue 2 — Grammar drill shows the WRONG option green (FIXED + shipped)
**Report:** "It says I got the correct answer, but another option is highlighted green even though my
answer was correct."
**Root cause:** `src/pages/Grammar.jsx:625` (the "Find the Error" drill) hard-coded the **"No error"**
option's text to `var(--color-green)` **at all times** — even before answering and even when the
sentence HAS an error (so "No error" is not the answer). Green everywhere else means "this is the
correct answer," so the always-green "No error" reads as a second correct option. Tense / Confusables /
SVA / Articles / generic MCQ cards were checked and are correct (green only on `opt === answer` *after*
`fb`).
**Fix (shipped):** line 625 → `color: 'var(--color-text)'`. Green is now reserved for the
bg+border-on-the-answer logic (lines 621–624), which only fires after answering. Affects both MS and EN
"Find Error" tabs. **Verified:** build clean (Grammar 47.3 KB). **Deliberately skipped:** a Playwright
color-regression test — brittle for a 1-line color constant; the diff is self-evident. Eyeball both
themes when convenient.

---

## Issue 1 — Import "Word-by-Word" view is a messy wall of text
**Report:** "translated words overlap, like a plain text file, very messy and hard to read."
**Root cause:** `src/pages/Import.jsx:280–295` renders the word-by-word result as an inline
`flex flex-wrap` of `<span>word<span>(meaning)</span> </span>` — coloured words with tiny parenthetical
meanings all flowing inline, so it reads as one dense paragraph. There's no per-word separation, and the
meaning is a cramped `text-[10px]` aside.
**Severity:** MED (usability; the feature works, but is unpleasant — discourages use).
**Chosen design:** render each token as a discrete **chip/card** — Malay word on top, meaning beneath,
a subtle border + the source colour as a small dot/badge (dict/stem/Google), in a responsive grid
(`grid grid-cols-2 sm:grid-cols-3` or wrapped fixed-width chips). Skipped/punctuation tokens render as
plain inline separators (or are dropped). Keep the legend. This turns a text wall into a scannable
vocab grid.
**Options:** (a) chip grid [chosen]; (b) two-column table (word | meaning) — cleaner for long text but
less mobile-friendly; (c) keep inline but add line-per-sentence breaks — minimal, still cramped
(rejected). 
**Open Q1.1:** chip grid [default] vs table? *(Default chip grid — mobile-first, matches the app's card
aesthetic.)*
**Estimate:** ~30–45 min (pure render change in one component; e2e: paste text → WBW → assert chips
render + light/dark).

## Issue 3 — "SRS" vs "Cram" feel identical
**Report:** "srs and cram no difference. I do not fully understand how the study mode changes when I
switch to cram mode."
**Root cause (it DOES differ — it's a communication gap, not a bug):** `Grammar.jsx:103–108` —
**SRS mode** = `sortDrillsBySRS` (due-first, then unseen, then not-yet-due; respects spaced repetition).
**Cram mode** = `shuffle(...)` a stable random order over ALL drills, ignoring SRS. The difference is
real but invisible: same card UI, no label explaining what each mode does or why.
**Severity:** LOW-MED (confusion; both modes work).
**Chosen design:** make the mode's effect legible — (a) a one-line description under the toggle ("Smart:
reviews what's due, spaced for memory" vs "Cram: every drill, shuffled — for a quick pre-exam blast");
(b) a small badge on the drill card showing the active mode + (in SRS) the "next review" timing that
already exists (`getNextReview`), hidden in cram. Optionally show a tiny "due N / total M" count in SRS.
No logic change — purely making the existing difference perceivable.
**Open Q3.1:** copy only [default] vs also add a due-count indicator? *(Default: copy + reuse the
existing next-review badge; due-count is a nice-to-have.)*
**Estimate:** ~20–30 min (copy + conditional badge; e2e optional).

## Issue 4 — Exam Rehearsal & Smart Session mix Malay and English (want per-subject)
**Report:** "Spaced exam rehearsal has both English and malay in it, same as smart session, should be
all malay or all English by default, an exam rehearsal and smart session for each subject."
**Root cause — ⚠️ REVISED 2026-06-11 after Kheshav questioned the box; the two surfaces are NOT the same
problem:**
- **Exam Rehearsal** (`ExamRehearsal.jsx:24 pickPassage`) picks a random passage **60/40 MS/EN each
  run** — passages genuinely exist in both languages (`p.lang`), so over repeated rehearsals you get an
  uncontrolled language mix and can't drill one subject. **A subject toggle is the right fix.**
- **Smart Session** (`interleavedQueue.js`) — **was mis-diagnosed.** The app has **NO English
  vocabulary**: `dictionary.js` is 804 Malay→English entries, every vocab card is a Malay word, and
  **cards carry no language field**. The Smart Session is a Malay-vocab engine (`selectFocalCards` →
  cycles around each Malay word). The "English + Malay" the learner sees is **not two subjects mixing**
  — it's the practice **micro-prompts switching language at random** (`src/data/microPrompts.js`:
  `writing` = 3 Malay + 1 English template, `speaking` = 2 Malay + 1 English, `getRandomPrompt` picks
  uniformly). So a Malay-vocab session randomly fires an English instruction. **The real fix is prompt
  language consistency, NOT a subject toggle.** There is no "English Smart Session" to build without new
  English vocab content (a separate epic).
**Severity:** MED-HIGH (touches the bilingual invariant + a load-bearing study surface).
**Chosen design (REVISED 2026-06-11 — the two surfaces get DIFFERENT fixes):**
- **Exam Rehearsal (4a) — subject toggle.** A Malay/English chooser at the top of a rehearsal;
  `pickPassage(lang)` filters `PASSAGES` by `p.lang`; the derived writing/speaking prompts already branch
  on `passage.lang`, so they follow automatically. Default to the learner's last choice (persisted) or
  Malay (0546 primary). Mirrors the `Roleplay.jsx` lang switch. **This is the genuine per-subject win.**
- **Smart Session (4b) — prompt-language consistency, NOT a toggle.** The engine is Malay-vocab-only
  (no English vocab exists, cards have no `lang`). The fix: make `src/data/microPrompts.js` consistently
  Malay (drop or relocate the lone English templates), so a Malay-vocab session never randomly shows an
  English instruction. Optionally audit `WritingMicroPrompt.jsx` / `SpeakingMicroTurn.jsx` /
  `TaskAdapter.jsx` for any stray English UI copy in the Malay flow. **A true English Smart Session is
  out of scope** — it needs an English vocabulary corpus + a language tag on cards, i.e. a separate epic.
**Options / open Qs:**
- **Q4.1 — Exam Rehearsal: ✅ DECIDED 2026-06-11 = a simple Malay/English TOGGLE** (mirror
  Roleplay/Speaking/Grammar), not separate streams. Kheshav's call — smaller, consistent, low risk.
- **Q4.2 — Smart Session: the toggle premise was WRONG (no English vocab).** Fix = consistent-Malay
  prompts. **Open product question for a true English study mode** (a NEW epic, not this batch): is
  making Smart Session reliably Malay enough for now [recommended default], or does Kheshav want a
  separate English study session (would need an English vocab corpus + card language tags)? *(Default:
  consistent-Malay now; English study mode = its own future spec if wanted.)*
- **Q4.3 — Exam Rehearsal default subject:** [last-used, else Malay] (0546 is the primary syllabus).
**Estimate:** Exam Rehearsal toggle ~30–45 min (clean — `pickPassage(lang)` + a chooser). Smart Session
prompt-consistency fix ~15–20 min (`microPrompts.js` — drop/relocate the English templates + a quick
audit of the micro-task components). A true English study mode = a separate epic (not estimated here).

## Issue 5 — Jargon settings need a visual preview (starting with Inline/Bottom-panel)
**Report:** the PDF sentence-reveal setting ("Where the English appears… Inline / Bottom panel",
`Settings.jsx:1132–1142`) is "fuzzy to visualize." Wants a **(?) info icon** or a **hover (1–2s) →
visual/animation/picture** of what each option looks like. Prefers the question-mark icon. **Generalises
it:** "many more buttons or features… seem like jargon to a 5 yr old and need a visual to make it
intuitive."
**Severity:** MED (intuitiveness / onboarding; recurring across the app).
**Chosen design — a reusable pattern, not a one-off:**
1. A small reusable **`InfoPreview`** component: a `(?)`/info icon next to a jargon control that, on
   hover (desktop) **and tap (mobile — hover doesn't exist on touch, so this is required)**, shows a
   popover with a tiny **visual** (a simple SVG/CSS mock, not a screenshot — cheaper + theme-safe) of
   what the option does. a11y: keyboard-focusable, `aria-describedby`, Esc to close, dismiss on
   outside-tap.
2. **First application:** the Inline vs Bottom-panel setting — show a 2-up mini-mock (a phone frame with
   the English under the line vs a fixed bottom sheet).
3. Then reuse it on the next-most-jargony controls (recall-probe Default/Strict, sentence toggle, etc.).
**Options:** (a) `(?)` icon with click/hover popover [chosen — works on touch, his stated preference];
(b) pure hover-delay tooltip (rejected as the *primary* — no hover on mobile, and the app is mobile-first);
(c) inline always-on mini-mock (rejected — clutters Settings). Note his "hover 1–2s" idea is desktop-only;
the `(?)`-tap covers mobile, so we do the icon as the trigger and can add hover-open on desktop.
**Open Q5.1:** SVG/CSS mock [default] vs a tiny recorded GIF/animation? *(Default mock — no asset
pipeline, theme-aware, tiny.)*
**Estimate:** reusable component ~45–60 min + ~15 min per control applied. Highest *leverage* because it
pays back across the whole app.

---

## Prioritisation (Impact × Confidence ÷ Effort) + recommended order
| Issue | Sev | I | C | E | Score | Order |
|---|---|---|---|---|---|---|
| 2 grammar green bug | HIGH | 4 | 5 | 1 | **20** | ✅ DONE |
| 5 visual-preview pattern | MED | 4 | 4 | 2 | **8** | 2nd (reusable leverage) |
| 1 Import WBW redesign | MED | 3 | 4 | 2 | **6** | 3rd |
| 3 SRS/Cram clarity | LOW-MED | 2 | 5 | 1 | **10** | 1st of the builds (trivial) |
| 4a Exam Rehearsal toggle | MED-HIGH | 4 | 4 | 2 | **8** | 4th |
| 4b Smart Session prompt-consistency | MED | 3 | 5 | 1 | **15** | with 4a (trivial — `microPrompts.js`) |

**Recommended build order:** 3 (trivial copy) → 5 (reusable preview + apply to Inline/Sheet) → 1
(Import chips) → 4a (Exam Rehearsal toggle) → 4b (Smart Session consistent-Malay prompts — trivial).
No decision gate — a true English study mode is a separate future epic, not part of this batch.

## What needs KHESHAV (product calls)
1. **Exam Rehearsal (4a):** ✅ DECIDED 2026-06-11 — a Malay/English toggle. Buildable now.
2. **Smart Session (4b):** no toggle (no English vocab exists) → fix = consistent-Malay prompts,
   buildable now by default. **The only genuinely open product question:** do you want a *separate
   English study mode* later (a new epic needing English vocabulary content), or is a reliably-Malay
   Smart Session enough? *(Default: enough; English study mode = its own future spec if you want it —
   not blocking this batch.)*
3. **Q5.1** — `(?)`-icon-with-mock matches your stated preference; building it that way unless you object.
4. Everything else (chip grid, SRS/Cram copy, Exam-Rehearsal toggle, default subject) taken by the
   bracketed defaults. **Nothing blocks the build** — item 2's open question only affects a *future*
   English-study-mode epic, not this batch.

## Test plan (per build step)
Pure logic where it exists (`pickPassage(lang)` filter; any WBW grouping helper) → unit tests first.
e2e per surface (go-wild): Import chips render + add-to-deck intact; Grammar mode-label visible;
Exam-Rehearsal language toggle filters passages; InfoPreview opens on tap + Esc + outside-dismiss;
light + dark. Build (<70 KB page chunks) + lint (0 err) + test:run each step.
