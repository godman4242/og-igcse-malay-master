# Friction #5 — Per-surface empty-state CTAs (design + audit)

**Status:** SPEC / ready to build. Needs your sign-off on the copy (flagged ⬅️ YOU below).
**Source:** friction plan `2026-05-30-friction-convenience-plan.md` §5.
**Goal:** a brand-new student (no data yet) never lands on a blank panel. Every
data-dependent surface says *"here's what this does + start here."*

---

## 1. Audit — what each surface shows a brand-new student (today)

Verified by reading each page + light-mode prod screenshots (2026-05-31).

| Surface | File | First-visit state today | Verdict |
|---|---|---|---|
| **MistakeJournal** | `MistakeJournal.jsx:77` | 🎉 icon + "No Mistakes!" + **Go Study** button | ✅ **Gold standard** — reuse this pattern |
| Study | `Study.jsx:41` | 🎓 + "No cards to study!" | ✅ good (could gain a CTA button) |
| PDF Reader | `PDFReader.jsx:242` | Upload button + "Stays in your browser" reassurance | ✅ good |
| Dashboard | `Dashboard.jsx` | FirstRunCard + `cards.length===0` branch | ✅ good |
| Import | `Import.jsx:180` | "Import Text" + "Paste any Malay text. Known words are highlighted…" | ✅ good ("what this does" present) |
| Roleplay | `Roleplay.jsx:204` | Scenario list + "No roleplay history yet…" | ✅ good |
| Speaking | `Speaking.jsx` | Intro line "Practise IGCSE Paper 3 speaking. Pick a topic…" + topic list | ✅ good |
| **Writing** | `Writing.jsx:105` | `<h2>Writing Analyzer</h2>` → format dropdown → **empty textarea** (placeholder only) | ⚠️ **GAP — feels blank** |
| Comprehension | `Comprehension.jsx` | "Paper 1 Comprehension" heading + passage list | 🔶 list = implicit "start here", **no one-line "what this does"** |
| Word Families | `WordFamilies.jsx` | Full list shown; only *search-empty* handled (`:142`) | 🔶 no intro line (minor) |
| Grammar | `Grammar.jsx` | Drill tabs always shown | 🔶 no intro line (minor) |
| Listening | `Listening.jsx` | Passage list shown | 🔶 no intro line (minor) |
| Exam Rehearsal | `ExamRehearsal.jsx` | Passage selection shown | 🔶 no intro line (minor) |

**Takeaway:** this is NOT a big multi-surface rebuild. One real gap (**Writing**),
plus a cheap consistency pass (one-line "what this does" subtitle on the 🔶 list
surfaces). The pattern already exists in the codebase — we standardize it.

---

## 2. The pattern (reuse, don't reinvent)

Two reusable pieces, both light/dark token-safe (`var(--color-*)` only):

**A. `SurfaceIntro`** — a one-line "what this does" subtitle under a page `<h2>`.
For 🔶 surfaces that have a list/grid (so "start here" is the list itself) but
lack a framing sentence.
```
<h2>Comprehension</h2>
<SurfaceIntro>Read a passage, then answer exam-style questions. Pick one below to start.</SurfaceIntro>
```

**B. `EmptyState`** — the MistakeJournal pattern, extracted: `icon` + `title` +
`body` + optional `cta {label, onClick}`. For genuinely-empty panels (Writing's
blank composer, future zero-data states).
```
<EmptyState icon="✍️" title="Analyze your writing"
  body="Paste an essay (or try a sample) and get an instant IGCSE band + fixes."
  cta={{ label: 'Try a sample essay', onClick: loadSample }} />
```
Place both in `src/components/`. `EmptyState` should be a thin extraction of the
existing MistakeJournal markup so the voice stays consistent.

---

## 3. Per-surface build list

1. **Writing (the real one).** Above/around the textarea on first visit (when
   `text` is empty and no result yet), show the `EmptyState` framing instead of a
   bare box. Decide: does "Try a sample" load a canned example essay (tiny new
   feature, ~1 exemplar per lang from `src/data/exemplars.js` — already exists!)
   or do we just add a "what this does" line and keep the textarea? ⬅️ YOU
2. **Consistency pass (cheap).** Add a `SurfaceIntro` one-liner to: Comprehension,
   Word Families, Grammar, Listening, Exam Rehearsal. Copy below ⬅️ YOU.
3. **Optional polish.** Add a CTA button to Study's empty deck ("Add words" →
   `/import`) to match the MistakeJournal pattern. Low priority.

---

## 4. ⬅️ YOUR decisions (the part I shouldn't guess — your product voice)

This is why #5 is a *your-call* session, not a solo build. Draft copy below — edit
or approve. Keep it short, warm, non-gamified (per the project's anti-cheap-dopamine rule).

- **Writing — sample essay?** (a) "Try a sample" loads an exemplar so a blank-page
  student sees the tool work, or (b) just a one-line intro. → a
- **Writing intro copy:** *"Paste an essay and get an instant IGCSE band + specific fixes. New here? Try a sample."* → approved
- **Comprehension:** *"Read a passage, then answer exam-style questions. Pick one to start."* →  looks good, approved
- **Word Families:** *"See how Malay words branch from a root (e.g. ajar → mengajar, pelajar). Search or browse below."* → approved ("i thought we already had that in the website")
- **Grammar:** *"Short drills on the rules examiners test. Pick a tab and go."* → approved
- **Listening:** *"Paper 4 practice — listen, then answer. Tap a passage to begin."* → approved
- **Exam Rehearsal:** *"A timed run-through of a full paper. Pick a passage when you're ready."* → approved

- **Voice check:** English-only, or bilingual intros on the MS surfaces? → billingual, so that people have more options
- some things to add, for the select feature. make it so that they can select translate and add any word on the website to thir cards, not simply words that come from the import pdf page, EVERY word on th website. selected words must be highlighted, for user convenience
- i would also like you to thik and research wether this actually helps by follow ing UDL and other learning science. as well as help suggest more ideas
---

## 5. Build order (next session)

1. Get your copy decisions (§4) — 5 minutes, async is fine.
2. TDD nothing here (pure presentational) — but extract `EmptyState` from
   MistakeJournal *without* changing MistakeJournal's rendered output (snapshot it
   first by eye / e2e).
3. Build `EmptyState` + `SurfaceIntro`, wire Writing first (the real gap), then the
   consistency one-liners.
4. Verify: `npm run build` · `npm run lint` · `npm run test:run` (340 baseline) ·
   light + dark screenshots of each touched surface (the light-mode token trap from
   this arc means *eyeball light mode*, don't assume).
5. Atomic commits per logical group; update `RESUME_HERE.md` in the same commit.

## 6. Risk / scope guard
Low risk, presentational only, no store/schema/FSRS changes. Do **not** let this
balloon into an onboarding-flow redesign (that's friction #4, separate). Empty
states only.
