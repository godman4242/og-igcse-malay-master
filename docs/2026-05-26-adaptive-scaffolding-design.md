# Adaptive Scaffolding + Annotated Writing Feedback — Design

**Date:** 2026-05-26
**Author:** Brainstorming session with the project owner
**Phase:** Master Plan #3 — Adaptive Scaffolding (Desirable Difficulty)
**Status:** Spec ready for review → implementation plan → execution
**Surfaces in this phase:** Writing feedback (MS + EN), Roleplay in-turn examiner (MS + EN)

---

## 1. Goal

Tune the AI evaluators so cognitive load drops when a student is struggling and tightens when they are confident, and replace the current paragraph-of-text writing feedback with a two-layer annotated view (highlighted student text with numbered groupings + a model rewrite with key phrases coloured) that mirrors the chunking pattern in the reference walkthrough PDF.

The design is UDL-aligned (multiple means of representation, action, engagement) and grounded in:
- **Cognitive Load Theory** — cap categories per response; group related fixes under shared numbers.
- **Desirable Difficulty** (Bjork) — model rewrite hidden by default on heavy scaffolding; revealed on demand.
- **Worked Examples → Faded Scaffolding** — heavy scaffolding shows the model rewrite of the weakest sentence; medium shows full rewrite; light skips rewrite and adds a stretch goal.
- **Dual Coding** — highlight colour + numbered pill + label + tooltip = three concurrent representation channels.

## 2. Non-goals (phase 1)

- Speaking grader adaptation.
- Comprehension question generator adaptation.
- Cikgu Maya chat adaptation (free-model JSON enforcement is unreliable).
- Grammar drill difficulty ramp (FSRS already provides this).
- A/B telemetry (no analytics layer in this codebase by design).
- Spaced re-attempt with progressively faded scaffolding (natural phase 2).

## 3. Learner Profile

**New file:** `src/lib/learnerProfile.js`. Pure function:

```js
buildLearnerProfile(store, { lang }) → {
  scaffoldLevel: 'heavy' | 'medium' | 'light',
  focusTopics: string[],     // ≤3 hot areas pulled from `mistakes`
  recentStrengths: string[], // ≤2 wins, used to lead feedback
  signals: {
    writingBandRolling: number | null, // avg last 3 essays in this lang
    fsrsLapseRate7d: number,           // 0..1 fraction of Again-rated reviews
    confusionHits14d: number,          // confidenceLog: confident + wrong
    severityEscalations7d: number,     // mistakes whose severity rose this week
  },
}
```

### Scaffold-level thresholds (deterministic)

- **heavy** — `writingBandRolling < 3` OR `fsrsLapseRate7d > 0.4` OR `severityEscalations7d ≥ 3`.
- **light** — `writingBandRolling ≥ 5` AND `fsrsLapseRate7d < 0.15` AND `severityEscalations7d == 0`.
- **medium** — everything else, including new users with insufficient data (no premature scaffolding).

### Why these signals and not more

They cover the four orthogonal feedback channels: writing quality (band), retrieval strength (FSRS), metacognitive calibration (confusion hits), worsening mistakes (escalations). Cap at four to keep the profile small (~500 chars max) and avoid feature-stuffing the prompt.

### `focusTopics` and `recentStrengths` derivation (pinned)

- **focusTopics** — from `store.mistakes`, group by `category` over the last 14 days, weight by `severity` (1×low, 2×medium, 4×high) and recency (last 3 days ×2). Take the top 3 categories. Map each to a human label (`'imbuhan' → 'imbuhan:meN-'` if the matching mistake's `surface` starts with a meN-form; else `'imbuhan'`). Empty array if no mistakes — never invent struggle.
- **recentStrengths** — from `store.confidenceLog`, group by `mode` over the last 14 days; a category is a "strength" if (correct count ≥ 5) AND (wrong count == 0) AND it appears in the curriculum for the current `lang`. Take up to 2. Empty array for new users — never invent praise.

Both lists are deterministic and unit-testable. Both are passed verbatim to the AI; the AI uses them only as anchors for the `strengths[]` and `fixes[]` arrays it returns.

### Why deterministic over LLM-judged

Unit-testable; no extra token cost; the AI still sees raw `signals` and can reason about *why* scaffolding is what it is.

### Privacy

Profile contains aggregated numbers and IGCSE category strings only. No essay text, card content, names, or emails. Transient in request payload; nothing new persists in Supabase.

## 4. Server Contract

**File:** `supabase/functions/ai-proxy/index.ts`. One redeploy via `supabase functions deploy ai-proxy`.

### 4.1 New action — `writing-feedback-v2`

Bilingual (`lang: 'ms' | 'en'`). Payload accepts:

```ts
{
  text: string,         // student's essay
  format: string,       // 'formal-letter' | 'narrative' | 'article' | ...
  lang: 'ms' | 'en',
  learnerProfile: { ... } | null,
}
```

The server appends an adaptation block to the base system prompt. **Pinned prompt text** (do not paraphrase during implementation):

**Heavy:**
```
SCAFFOLD LEVEL: heavy.
RULES:
- Lead with ONE genuine strength drawn from `recentStrengths` if present; otherwise from the essay itself. Never manufacture praise.
- Surface AT MOST 3 fixes, grouped under AT MOST 2 numbered themes in `groups[]`.
- `modelRewrite` covers only the WEAKEST sentence (one sentence, not the whole essay).
- Tone: warm and concrete. No exam-doom phrases ("you will lose marks", "this is wrong", "below standard").
- Anchor at least one fix in `focusTopics` if non-empty — the student has been working on these.
```

**Medium:**
```
SCAFFOLD LEVEL: medium.
RULES:
- Up to 5 fixes across up to 3 numbered themes.
- `modelRewrite` is a full-paragraph rewrite (~50-80 words).
- Balanced tone. Cite the rule by name when correcting (e.g. "meN- + p → mem-").
```

**Light:**
```
SCAFFOLD LEVEL: light.
RULES:
- Full feedback. Up to 5 fixes; up to 4 groups.
- `modelRewrite` is a full-paragraph rewrite.
- Add a `nextStep` that pushes toward the NEXT band (e.g. "Try one passive-voice sentence with `di-` + agent.").
- You may suggest stylistic flourishes (e.g. peribahasa, advanced kata hubung) the student has not yet used.
```

If `learnerProfile == null`, treat as **medium**.

### 4.2 Output schema (`writing-feedback-v2`)

```json
{
  "band": 4,
  "overall": "One-paragraph diagnosis in plain prose.",
  "scaffoldLevelApplied": "heavy",

  "studentText": {
    "spans": [
      { "text": "Saya suka ", "category": null, "groupId": null },
      { "text": "makan", "category": "imbuhan", "groupId": 1,
        "note": "use 'menjamu selera' for register" },
      { "text": " nasi lemak kerana ia ", "category": null, "groupId": null },
      { "text": "sangat sedap", "category": "vocab-upgrade", "groupId": 2,
        "note": "'menyelerakan' lifts the register" }
    ],
    "groups": [
      { "id": 1, "label": "Verb form (imbuhan)", "category": "imbuhan" },
      { "id": 2, "label": "Vocabulary lift", "category": "vocab-upgrade" }
    ]
  },

  "modelRewrite": {
    "spans": [
      { "text": "Saya ", "isKey": false },
      { "text": "gemar menikmati", "isKey": true, "lift": "verb upgrade" },
      { "text": " nasi lemak kerana cita rasanya ", "isKey": false },
      { "text": "begitu menyelerakan", "isKey": true, "lift": "adverbial lexicon" }
    ]
  },

  "strengths": ["clear topic sentence", "consistent past tense"],
  "fixes": [
    { "groupId": 1, "issue": "...", "fix": "..." },
    { "groupId": 2, "issue": "...", "fix": "..." }
  ],
  "nextStep": "One concrete drill for tomorrow."
}
```

### 4.3 Category enum (fixed)

`imbuhan | verb-form | vocab-upgrade | cohesion | sophisticated-lexicon | spelling | register | sentence-structure`

`imbuhan` is MS-only; English uses `verb-form`. The rest are language-agnostic.

### 4.4 Span coverage invariant

The concatenation of all `studentText.spans[].text` values, in order, MUST equal `payload.text` exactly — character for character, whitespace and punctuation included. This is what lets the renderer treat the spans as a partitioning of the original essay. The validator enforces this and rejects responses that fail.

### 4.5 Token budget

`payload.maxTokens` for `writing-feedback-v2` is set to **2048** by the client (the server cap). The v2 schema with full spans on a 200-word essay typically lands around 1100–1400 output tokens; 2048 leaves comfortable headroom. If a response is truncated (Anthropic stop_reason `max_tokens`), the parser rejects and falls back to v1.

### 4.6 Updates to existing actions

- **`roleplay`** — system prompt gets adaptation rules; payload accepts optional `learnerProfile`. Output schema unchanged (no breaking change).
- **`roleplay-score`** — same payload addition; rubric unchanged; on `heavy` scaffold, `strengths` array required to be ≥2 items.
- **`writing-feedback`** (old action) — kept intact for backwards compatibility and OpenRouter fallback.

### 4.7 Design rationale

- **Spans, not HTML strings** — rendering choices belong in the React component, not the server.
- **`groupId` + `groups[]`** — mirrors the PDF chunking; renderer can dim non-active groups for focused study.
- **`scaffoldLevelApplied` echoed back** — drives a UI badge so the student understands *why* the feedback feels different, and lets QA verify the AI honoured the dial.
- **New action name (`-v2`)** instead of mutating the old one — no breaking change; v1 stays available as fallback.

## 5. Client Renderer

**New file:** `src/components/AnnotatedWritingFeedback.jsx`. Lazy-loaded from `Writing.jsx`, never on cold load.

### 5.1 Contract

```jsx
<AnnotatedWritingFeedback
  data={writingFeedbackV2Json}
  lang="ms"          // 'ms' | 'en' — affects category labels only
  onRetry={...}
/>
```

Pure presentational. No store reads. No risk of the infinite-loop Zustand selector trap noted in `CLAUDE.md`.

### 5.2 Layout

```
┌─────────────────────────────────────────────────────┐
│  Band 4   ·  Adaptive: heavy scaffolding   [info]   │
├─────────────────────────────────────────────────────┤
│  One-paragraph diagnosis...                          │
├─────────────────────────────────────────────────────┤
│  YOUR WRITING           [filter: all ▾]              │
│  Saya ⚡suka⚡ makan ❷nasi lemak❷ kerana ia          │
│  ❶sangat sedap❶...                                   │
│  ❶ Vocabulary lift   ❷ Verb form (imbuhan)           │
├─────────────────────────────────────────────────────┤
│  MODEL REWRITE          [show/hide]                  │
│  Saya 𝗴𝗲𝗺𝗮𝗿 𝗺𝗲𝗻𝗶𝗸𝗺𝗮𝘁𝗶 nasi lemak kerana cita      │
│  rasanya 𝗯𝗲𝗴𝗶𝘁𝘂 𝗺𝗲𝗻𝘆𝗲𝗹𝗲𝗿𝗮𝗸𝗮𝗻...                 │
├─────────────────────────────────────────────────────┤
│  ✓ Strengths            ✗ Fixes            → Next   │
└─────────────────────────────────────────────────────┘
```

### 5.3 Colour scheme

New CSS custom properties added to `@theme` in `src/index.css`, with `.light` overrides:

- `--color-annot-yellow` — warm highlight ~rgba(255 215 105 / 0.45)
- `--color-annot-pill-bg`, `--color-annot-pill-fg` — numbered group pills
- `--color-annot-rewrite-key` — warm red for model rewrite key phrases
- `--color-annot-green`, `--color-annot-orange` — roleplay used/missed chips

All access via inline `style={{ color: 'var(--color-annot-*)' }}` — never hardcoded hex. Light and dark inherit automatically.

### 5.4 Group filter (chunking + focus mode)

- Each group is a clickable chip in the legend: `❶ Vocabulary lift`.
- Click → highlights filter to that group; others fade to 30% opacity.
- "All" chip restores full view; "None" chip hides highlights for clean re-reading (desirable-difficulty toggle).

### 5.5 UDL & accessibility

- `aria-label="Group 1, vocabulary lift: <note>"` on each highlight span.
- Keyboard-focusable spans; Enter expands a popover with the `note`.
- Model rewrite key phrases use `<mark>` for screen-reader semantics + colour change (dual coding).
- "Show/hide rewrite" defaults **hidden on heavy scaffolding**, **visible on medium/light** (faded scaffolding pedagogy).
- `prefers-reduced-motion` respected; no transition flourishes.

### 5.6 Performance

- One `useMemo` to group spans by `groupId`. No store calls.
- `React.memo` wrapper; parent passes stable `data` ref.
- Lazy-imported in `Writing.jsx`:
  ```js
  const AnnotatedWritingFeedback = lazy(() => import('../components/AnnotatedWritingFeedback'))
  ```
- Inside `<Suspense fallback={<FeedbackSkeleton />}>`.

### 5.7 Integration in `Writing.jsx`

- New `useWritingEvaluatorV2` hook (or extension to `useWritingEvaluator`) calls action `writing-feedback-v2` with `payload.learnerProfile = buildLearnerProfile(store, { lang })`.
- On parse failure, falls back to existing markdown renderer with a single toast.
- v2 pipeline gated behind `ui.useAdaptiveScaffolding` (Settings toggle, default `true`; see §8).

## 6. Roleplay Adaptation

**Files:** `src/components/RoleplaySession.jsx`, `src/components/RoleplayScorecard.jsx`, `src/pages/Roleplay.jsx` (fallback-message string only), new `src/components/RoleplayTurnFeedback.jsx`.

### 6.1 Server-side (Section 4)

Both `roleplay` and `roleplay-score` accept optional `learnerProfile`. Examiner prompts adapt:

- **heavy** → high-frequency vocab only; ≤2-sentence prompts; one closed question per turn; per-turn `vocabMissed` capped at 2 items.
- **medium** → existing baseline.
- **light** → richer vocab + 3–4-sentence prompts with embedded follow-ups; scorecard adds stretch goal.

### 6.2 Session wiring

```js
const profile = useMemo(
  () => buildLearnerProfile(store, { lang: scenario.lang }),
  [scenario.lang]
)
```

Built once at session start; passed verbatim into every turn so examiner behaviour stays consistent within a session (no mid-session difficulty shift). Header shows a small "Adaptive: heavy" chip so the student knows.

### 6.3 `RoleplayTurnFeedback.jsx` — colour-coded per-turn display

Reuses the same colour vocabulary as writing:

```
You used:   ✓ menjamu  ✓ kerana   ✓ -kan (correctly)
You missed: ⚠ telinga berdesing       ⚠ walaupun
Tip:        meN- + p → mem- (mem-pukul, not me-pukul)
```

- Used items → `--color-annot-green` chips.
- Missed items → `--color-annot-orange` chips; click opens tooltip. **MS roleplay:** look up the word in `src/data/dictionary.js` (495 entries) for English gloss + example sentence; if absent, use the AI-supplied note. **EN roleplay:** dictionary lookup is skipped (no dictionary file for EN); the AI hint is the only source — this is acceptable because EN roleplay already requires AI for grading.
- `grammarNote` rendered in a bordered card with the rule highlighted in `--color-annot-yellow` (same system as writing → cross-surface visual consistency).
- On heavy scaffold, missed items above the cap collapse behind "Show N more".

### 6.4 Scorecard tweaks (`RoleplayScorecard.jsx`)

- `scaffoldLevelApplied` echo badge at the top.
- On `heavy`: strengths first and visually larger; fixes quieter.
- On `light`: extra "Stretch goal" panel below fixes (AI-generated one-liner toward band 6).

### 6.5 Bilingual handling

- MS roleplay: unaffected when profile is `medium` (default for new users) — feels identical to today.
- EN roleplay: static-mode fallback message gets one extra line on `heavy` pointing at `/grammar` static drills (already FSRS-adaptive).

## 7. Fallbacks & Error Handling

| Failure | Detection | Fallback |
|---|---|---|
| `writing-feedback-v2` JSON malformed (incl. truncated `max_tokens`) | Validator in `src/lib/writingFeedbackV2Parser.js` | Falls back to v1 markdown renderer. Single toast. `console.warn` with the validator's reject reason — no persisted log (engineering telemetry does not belong in `confidenceLog`, which is student-facing). |
| Circuit-breaker tripped | `AIError.code === 'circuit_open'` | Existing 120s cooldown banner. Cached v1 response (if any) shown read-only. |
| Daily rate limit | `AIError.code === 'rate_limited'` | Existing message. v2 adds no extra calls (payload-only addition). |
| `buildLearnerProfile` throws | try/catch in caller | Passes `learnerProfile: null`. Server treats null as `medium`. Logged as `console.warn` only. |
| OpenRouter fallback returns plain text | Same validator | Falls back to v1 markdown. |

**Key constraint:** v1 endpoint and renderer **stay shipped**. v2 is purely additive. Any single failure transparently rolls back to v1.

## 8. Feature Flag

New store field, persisted under `ui`:

```js
ui: { useAdaptiveScaffolding: true }   // default true
```

- Toggle in `Settings.jsx`: "Adaptive scaffolding (beta) — annotated writing feedback and personalised roleplay difficulty".
- **Gates both surfaces.** When off:
  - Writing renders v1 markdown (no v2 call, no annotated view).
  - Roleplay stops sending `learnerProfile` in payloads → server applies baseline (medium-equivalent) behaviour. No "Adaptive: heavy" chip in the header.
- Bumps `STORE_VERSION` to 13.
- Migration is additive: existing users get `useAdaptiveScaffolding: true`; same defensive pattern as v11→v12.

## 9. Kill Switches

Biggest-blast-radius first:

1. **Feature flag off** (per user) → Writing renders v1; Roleplay stops sending `learnerProfile`.
2. **Roll back the edge function** (`supabase functions deploy ai-proxy --version <previous>`) → v2 action 404s; client falls into parse-failure branch; v1 markdown renders. No client deploy needed.
3. **Revert the commit** (single PR) → full restore. No persisted store damage; the only schema change is one additive field.

## 10. Testing

### 10.1 Unit tests (vitest, target 194/194 by ship)

- `src/lib/__tests__/learnerProfile.test.js` — threshold boundaries, null/empty store, focusTopics ranking, profile size budget (≤500 chars). ~12 tests.
- `src/lib/__tests__/writingFeedbackV2Parser.test.js` — well-formed passes, missing `spans` rejected, orphan `groupId` rejected, span text coverage check, category enum validation. ~8 tests.
- `src/components/__tests__/AnnotatedWritingFeedback.test.jsx` — renders on min/max payloads; filter chip dims non-active groups; rewrite hidden on heavy; keyboard nav; ARIA labels. ~6 tests using @testing-library/react.

**Total:** 168 existing + ~26 new = ~194 passing. Existing 168 must not regress.

### 10.2 Manual QA matrix (Brave/Chrome + Safari, light + dark)

| # | Scenario | What to look for |
|---|---|---|
| 1 | MS writing, heavy | Yellow highlights, group pills, rewrite hidden by default, ≤3 fixes, strength leads |
| 2 | MS writing, light | Rewrite visible, full feedback, stretch goal present |
| 3 | EN writing, heavy | Same as #1; category labels in English; `verb-form` instead of `imbuhan` |
| 4 | EN writing, light | Same as #2 |
| 5 | MS roleplay, heavy | Short examiner prompts, missed-vocab capped at 2, "Adaptive: heavy" chip |
| 6 | MS roleplay, light | Richer prompts, scorecard stretch goal |
| 7 | EN roleplay, heavy + light | Same as #5/#6; fallback message includes grammar-drill line on heavy |
| 8 | All four writing combos in **light + dark** | Highlight colours readable; WCAG AA contrast (4.5:1); reduced-motion respected |
| E1 | Force malformed JSON (mock mode) | v1 markdown renders; toast once; no crash |
| E2 | Disable feature flag mid-session | Writing flips to v1 next render; Roleplay stops sending profile |
| E3 | Empty store / new user | `scaffoldLevel: 'medium'`; UI identical to today's baseline |
| E4 | Kill Supabase env → OpenRouter path | v1 markdown fallback works gracefully |

### 10.3 Build & lint gauntlet (per commit)

```bash
npm run build       # zero errors, no INEFFECTIVE_DYNAMIC_IMPORT
                    # main chunk index-*.js: ≤ ~410 KB / gz ≤ ~132 KB
                    # AnnotatedWritingFeedback chunk: < 15 KB gzipped
npm run test:run    # 194 / 194
npm run lint        # 0 errors; only the 3 pre-existing warnings
```

If `index-*.js` grows >3 KB gzipped, the new component is not lazy-imported correctly — fix before commit.

## 11. Ship Checklist

1. ☐ `src/lib/learnerProfile.js` + tests.
2. ☐ `src/lib/writingFeedbackV2Parser.js` + tests.
3. ☐ Deploy edge function (`supabase functions deploy ai-proxy`); smoke-test before any client work using the curl block in §13.
4. ☐ Wire `useWritingEvaluatorV2` hook; keep v1 path intact behind feature flag.
5. ☐ Build `AnnotatedWritingFeedback.jsx` + tests; lazy-import from `Writing.jsx`.
6. ☐ Wire `learnerProfile` into `RoleplaySession.jsx`.
7. ☐ Build `RoleplayTurnFeedback.jsx`.
8. ☐ Scaffold-aware tweaks to `RoleplayScorecard.jsx`.
9. ☐ Bump `STORE_VERSION` 12→13; migration with `ui.useAdaptiveScaffolding: true` default.
10. ☐ Settings toggle.
11. ☐ Add 5 new CSS custom properties to `@theme` in `src/index.css` (+ `.light` overrides).
12. ☐ Run full QA matrix (12 scenarios).
13. ☐ Handoff at `docs/sessions/2026-05-26-adaptive-scaffolding-session.md`.
14. ☐ Update `RESUME_HERE.md` banner.
15. ☐ Update auto-memory at `~/.claude/projects/-Users-kheshav-Kheshav-kheshav-code-og-igcse-malay-master/memory/project_state_2026_05_25.md`.
16. ☐ Hand the user a copy-paste git block (no auto-commit per 8 GB RAM rule).

## 12. Edge-function smoke tests (pre-client work)

After `supabase functions deploy ai-proxy`, run these from a terminal. Replace `<PROJECT>` with the Supabase project ref and `<ANON_KEY>` with the anon JWT.

**`writing-feedback-v2` happy path (MS, heavy scaffold):**

```bash
curl -X POST "https://<PROJECT>.supabase.co/functions/v1/ai-proxy" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "writing-feedback-v2",
    "stream": false,
    "payload": {
      "text": "Saya suka makan nasi lemak kerana ia sangat sedap.",
      "format": "narrative",
      "lang": "ms",
      "maxTokens": 2048,
      "learnerProfile": {
        "scaffoldLevel": "heavy",
        "focusTopics": ["imbuhan:meN-"],
        "recentStrengths": [],
        "signals": { "writingBandRolling": 2.5, "fsrsLapseRate7d": 0.45, "confusionHits14d": 3, "severityEscalations7d": 4 }
      }
    }
  }' | jq .
```

Expected: 200 OK; `response.studentText.spans` array exists; `concat(spans[].text) === payload.text`; `scaffoldLevelApplied === "heavy"`; ≤3 fixes; ≤2 groups; `modelRewrite.spans` covers one sentence only.

**`roleplay` with learnerProfile (MS):**

```bash
curl -X POST "https://<PROJECT>.supabase.co/functions/v1/ai-proxy" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "roleplay",
    "stream": false,
    "payload": {
      "messages": [{ "role": "user", "content": "Hai, saya nak tempah tiket." }],
      "scenarioContext": "Kapal Terbang — student is a passenger booking a flight ticket.",
      "learnerProfile": { "scaffoldLevel": "heavy", "focusTopics": [], "recentStrengths": [], "signals": { "writingBandRolling": null, "fsrsLapseRate7d": 0.5, "confusionHits14d": 0, "severityEscalations7d": 0 } }
    }
  }' | jq .
```

Expected: 200 OK; examiner response ≤2 sentences; `feedback.vocabMissed.length <= 2`.

**Legacy `roleplay` without learnerProfile (regression check):**

```bash
curl -X POST "https://<PROJECT>.supabase.co/functions/v1/ai-proxy" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "roleplay",
    "stream": false,
    "payload": {
      "messages": [{ "role": "user", "content": "Hai." }],
      "scenarioContext": "Kapal Terbang"
    }
  }' | jq .
```

Expected: 200 OK; behaviour identical to today (medium baseline). Confirms backwards compatibility for any old client that hasn't updated yet.

## 13. Risks & Open Questions

**Risk: AI returns spans that don't cover the essay exactly.**
The model might paraphrase or drop whitespace. Mitigation: the validator rejects and falls back to v1. We accept that some essays will not get the annotated view on the first pass; if this happens >20% of the time in QA, escalate the system prompt with an explicit "do not modify the original text — split it into spans" instruction and re-test.

**Risk: scaffold-level chip feels patronising on "heavy".**
A 16-year-old being told "we've made this easier for you" can feel infantilising. Mitigation: copy says "Adaptive: focused" (not "heavy" or "easier") on the user-facing chip. Internal value stays `heavy`. Settings toggle gives the student final control.

**Risk: 8 GB RAM dev box hits issues building two new components + tests in one go.**
Mitigation: ship the four steps in §11 as four `npm run build` checkpoints, not one. If memory pressure shows up, commit in stages (still one PR, but git-stage-then-stash-then-commit per scope so the working tree never holds all four scopes simultaneously).

**Risk: bilingual prompt drift.**
The same v2 system prompt drives MS and EN essays. Risk that the model bleeds Malay rules into an EN essay or vice versa. Mitigation: the prompt receives `payload.lang` explicitly; QA matrix rows 3 and 4 catch any contamination. Add a regression test if it shows up.

**Open question: do we want per-format prompts?**
Today's writing-feedback action handles all 21 formats with one prompt + format hint. v2 could ship per-format prompts (formal-letter vs narrative have very different rubrics). Out of scope for phase 1; revisit if QA shows generic feedback on letter formats.

**Open question: how do we calibrate `scaffoldLevel` over time?**
The thresholds in §3 are educated guesses. We have no telemetry, so calibration is "does it feel right?" If usage feels wrong, the thresholds are one-line edits and the test suite has the boundary tests pinned. Document any tuning in a follow-up handoff.

## 14. References

- Reference for the highlighting pattern: `/Users/kheshav/Downloads/NO STRESS, JUST SUCCESS WALKTHROUGH.pdf` (Cambridge IGCSE FLE Paper 1 walkthrough with yellow source highlights + numbered groupings and red key-phrase model answers).
- Master Plan phase 3 — `CLAUDE.md` §"The Zero-Waste Cognitive Engine Master Plan".
- Prior session: `docs/sessions/2026-05-25-perf-cleanup-session.md` (where Adaptive Scaffolding was queued as recommended next item).
- Store invariants: `src/store/useStore.js` (current `STORE_VERSION = 12`; v6 introduced `confidenceLog`, `mistakeReasons`, `sessionFeedback`).
- Existing AI pipeline: `src/lib/ai.js` (50 calls/day, circuit breaker), `src/lib/openrouter.js` (free-model fallback), `supabase/functions/ai-proxy/index.ts` (5 actions today).
