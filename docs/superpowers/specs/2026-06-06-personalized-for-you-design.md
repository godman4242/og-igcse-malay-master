# "For You" — personalized home + AI custom decks (Design & Research, 2026-06-06)

A Design & Research session output (Template A). Kheshav's 2026-06-06 "Picked for
you" pitch, researched + converged into a build-ready spec. The headline finding:
**most of the personalization signals already exist in the codebase** — this is
largely a shelf-based UI layer + connecting the (already-present) goal field to
content, NOT building personalization from scratch. AI-generated decks are a
*later, key-gated* phase, grounded by a verified dictionary for accuracy.

Companion plan: `docs/superpowers/plans/2026-06-06-personalized-for-you.md`.
Origin memory: [[project_idea_personalized_ai_deck]].

---

## 1. Problem + who
Our self-directed IGCSE teen has no teacher to say "you, specifically, should
practise *this* next." The app captures rich per-learner signals (weak topics,
lapses, saved words, a written goal) but the **home screen shows the same generic
dashboard to everyone** and never turns those signals into "here's what's picked
for *you* today." The result: the learner decides what to study (decision cost,
ADD-unfriendly) instead of being handed a personalized, motivating queue.

Kheshav's framing: a Spotify-style home — "Picked for you", "Still remember
these?", "Recents" — plus (with an API key) AI-generated decks and roleplays
shaped by the learner's goal. He explicitly flagged this **needs a UI reformat**,
not a bolt-on.

---

## 2. What already exists  (the grounded reuse map — verified 2026-06-06)
This is the most important section: the foundation is largely built.

| Capability | Where | Status / reuse |
|---|---|---|
| **Goal field** (free-text "my goal in one sentence") | `identity.idealSelf` (store), Settings UI L521 | EXISTS. Add presets alongside it. Currently only a motivational nudge — doesn't drive content yet. That link is the new value. |
| **Weak-topic + strength derivation** | `src/lib/learnerProfile.js` `buildLearnerProfile()` | EXISTS + unit-tested. Returns `focusTopics` (ranked weak categories), `recentStrengths`, lapse/confusion signals. The engine for "Picked for you." |
| **Interleaved session engine** | `/smart-study` → `SmartSession` + `src/lib/interleave.js` | EXISTS but **ORPHANED** — a route with no nav/CTA reaching it. "Recognition→production micro-cycles." Surface this as the "Picked for you" session. |
| **Daily plan queue** | `src/lib/dailyPlan.js` `buildDailyPlan()`, Dashboard "Daily Plan spine" | EXISTS. "Keep going" shelf can reuse it. |
| **FSRS stability + recall-due** | `src/lib/fsrs.js` `isDueForRecall()`, card `stability`/`state`/`lapses` | EXISTS. The "Still remember these?" lapse-probe is a pure selector over these. |
| **Personal interests (UDL)** | `src/lib/interests.js`, `toggleUserInterest` | EXISTS. Optional input to AI deck topics. |
| **Saved words + cloze** | 'Saved' deck, `src/lib/clozeBuilder.js` (shipped 2026-06-06) | EXISTS. Feeds "Recents" + the produce session. |
| **3-tier AI fallback chain** | `src/lib/ai.js` (Claude proxy), `openrouter.js` (free models), expert system; `VITE_AI_MOCK` | EXISTS. Reuse for Phase-2 AI generation. Already key-gated + rate-limited + circuit-broken. |
| **Confidence / metacognition** | `confidenceLog` | EXISTS. "Sure but wrong" feeds focus. |

**Implication:** Phase 1 (non-AI shelves) is mostly *new UI + one pure shelf-builder
+ wiring existing signals*. High confidence, low risk.

---

## 3. Evidence (decision-linked)
- **Generation effect** (produce > recognise) for L2 vocab, d≈0.40 — already the
  basis of the shipped cloze feature; AI/custom decks should keep producing. · high
- **Goal-setting → effort + persistence** (Locke & Latham): specific, self-chosen
  goals raise engagement. Justifies turning `idealSelf`/presets into a visible,
  content-shaping commitment (not just a nudge). · high
- **Spaced retrieval / lapse-probing**: re-testing items you *think* are solid
  (high stability, marked Easy a while ago) catches silent forgetting — the
  "Still remember these?" shelf is a spacing probe, not filler. · high
- **Personalization / interest (UDL)**: relevance to the learner's own goals +
  interests improves attention and recall. Justifies goal- and interest-shaped
  AI decks. · med-high
- **Desirable difficulty caveat**: personalization must keep items in the
  "almost-can-produce" band — gate AI cards to the learner's level, always give
  the answer as feedback. · med-high
- **Caveat against gamification-for-its-own-sake**: shelves must serve retrieval,
  not vanity metrics (project invariant: learning-quality first). · design rule

---

## 4. Decisions — LOCKED (Kheshav, 2026-06-06)
1. **Goal model = presets + free-text sentence.** Keep `identity.idealSelf`; add a
   preset list (Pass IGCSE / Scholarship / Speak confidently / Target date / Custom).
2. **Home layout = a NEW 'For You' landing tab.** A real shelf-based reformat;
   Dashboard stays as the stats/progress view. For You becomes the default landing.
3. **AI scope = key-gated graceful degradation** (Kheshav's refinement, adopted):
   - **No API key → Phase-1 "smart shelves" only** (built from existing signals,
     free, instant, zero bad-card risk).
   - **API key present → Phase-2 AI decks/roleplays unlock.**
   This matches the app's existing 3-tier AI degradation and the no-paywall invariant.
4. **Auto multi-key model router ("Perplexity auto" mode) = PARKED as its own
   separate spec.** Good idea, but it's standalone infra (multi-key vault +
   task→model router); reuse the existing fallback chain for v1. Tracked in §9.
5. **Verified-dictionary grounding = the accuracy backbone for AI cards** (Kheshav's
   best idea, adopted): every AI-proposed Malay↔English pair is validated against a
   trusted dictionary; only verified pairs auto-accept, the rest are flagged. Also a
   standalone win: expand the base dictionary. Sources researched in §7.

---

## 5. Chosen design

### 5.1 The "For You" tab (Phase 1 — no AI needed)
A new `/for-you` route + `ForYou.jsx`, set as the landing route; a bottom-nav
"Home/For You" entry. A pure builder assembles **shelves** from a store snapshot:

| Shelf | Source (existing) | Item → action |
|---|---|---|
| **Picked for you** | `buildLearnerProfile().focusTopics` + due cards | Launch a focused/interleaved session (surface `SmartSession`) biased to weak topics. |
| **Still remember these?** | pure selector: high-`stability`, last rated Easy/Good ≥ N days ago, not currently due | A quick recall probe over those cards (reuse cloze/flashcard). |
| **From your saved words** | 'Saved' deck (recents) | The shipped produce/cloze session (`/saved-cloze`). |
| **Keep going** | `buildDailyPlan()` + streak | Resume today's plan / next due review. |
| **Toward your goal** | goal preset/sentence → curated surface (e.g. Speaking for "speak confidently") | Deep-link to the surface that serves the stated goal. |

Each shelf is **self-hiding when empty** (a new learner sees a clean "get started"
state, not empty rails). Built mobile-first horizontal-scroll rails.

### 5.2 Goal model + guided intake "/grillme" (Phase 1)
- Settings: keep the existing one-sentence field; add a preset chooser. Store
  `identity.goalPreset` (+ migration, bump `STORE_VERSION`).
- A pure `goalToFocus(goalPreset, sentence)` maps goal → which surfaces/shelves to
  emphasise (e.g. "Speak confidently" boosts the Speaking shelf + speak-variant
  sessions). Unit-tested; no AI.
- **Guided intake questionnaire ("/grillme") — Kheshav 2026-06-06.** A short, static
  (NO AI) intake that turns a lazy/vague goal into STRUCTURED signals the app can act
  on: goal preset, exam date, level/band, interests (reuse `interests.js`), self-rated
  weak areas, weekly time budget. Output = a `personalizationProfile` object the shelf
  builder + `goalToFocus` consume. One-time on first run; re-runnable anytime as "Tune
  my plan." This is the highest-leverage fix for "garbage-in" personalization — a vague
  free-text goal can't drive content; a structured profile can. **Key-gated upgrade
  (Phase 2):** an AI-conversational version that "grills" via free chat and extracts the
  same structured fields. Start static (works for everyone, no key).

### 5.3 AI custom decks (Phase 2 — gated on API key)
- Entry: a "Make me a deck" CTA on For You, **visible only when an AI key is
  configured** (`SUPABASE_CONFIG.enabled` / BYOK key present) — otherwise hidden
  with a soft "add a key to unlock AI decks" hint.
- Flow: goal + `focusTopics` + interests → AI proposes N `{m, e, ex}` candidates
  (reuse the 3-tier chain; mock via `VITE_AI_MOCK`) → **dictionary-grounding gate
  (§5.4)** filters/flags → accepted cards land in a named deck (e.g. "AI · Speak
  confidently") → studied via the normal FSRS pipeline. Rate-limited (existing 10–50
  calls/day guard).
- AI roleplay personalization: generate a scenario seeded by goal+interests, run
  through the existing Roleplay AI evaluator.

#### 5.3a Long/heavy requests → resumable incremental generation (NOT overnight)
For a big ask (e.g. "500 cards across 20 topics"), do NOT batch overnight (see the
rejected overnight model in [[project_idea_ai_provider_router]] — a web app can't run
while closed/asleep). Instead: **checkpointed incremental generation that runs while
the app is OPEN and resumes on next open.** Generate in chunks behind a progress UI
("made 40/200…"), persist a cursor + accepted cards to the store/Supabase after each
chunk, and respect the existing per-day AI rate limit. If the tab closes mid-job it
PAUSES; reopening resumes from the cursor. This delivers Kheshav's "it keeps working
and remembers where it stopped" instinct WITHOUT requiring the user's computer on
overnight or storing their key server-side. (A true server-cron "freshen overnight"
with ONE central app-key is a separate, later, maybe-never option — cost + key-storage
trade-offs in §9 / the router memory.)

### 5.4 Dictionary-grounding gate (the accuracy backbone)
- A build-time-generated local lookup from a verified MS↔EN source (§7):
  `verifyPair(malay, english) → { verified: boolean, canonicalEn?, suggestion? }`.
- AI candidate pairs that match the dictionary → auto-accept. Mismatches → either
  drop or surface "AI suggested X; dictionary says Y — keep which?" (learner-in-the-loop,
  never silently ship a wrong pair).
- Standalone value: the same verified set can **expand `src/data/dictionary.js`**
  (more tap-translate coverage, fewer fallbacks) independent of AI.

---

## 6. Staged build plan (summary — full TDD steps in the plan doc)
- **Phase 1 — Smart shelves + goal link (no AI).** Pure `forYouShelves.js` builder
  (TDD) → `ForYou.jsx` + `/for-you` landing + nav → goal presets in Settings +
  `goalToFocus` → surface the orphaned `SmartSession`. *Ships value to everyone,
  no key.* ~3–4 h.
- **Phase 2 — AI decks + dictionary grounding (key-gated).** Build the verified
  dictionary asset + `verifyPair` (TDD) → AI deck generator behind the key gate →
  grounding filter → "Make me a deck" CTA → AI roleplay seed. ~4–6 h + a data/licensing
  pass on the dictionary source.
- **Separate future specs (parked):** auto multi-key model router; base-dictionary
  expansion as its own data PR.

Each phase is independently shippable and **one feature per session** (the
big-session regression trap). Phase 1 first.

---

## 7. Verified-dictionary sources (researched 2026-06-06)
| Source | Format | License | Notes |
|---|---|---|---|
| **kaikki.org** (wiktextract) | per-language JSON, machine-readable | CC-BY-SA | Best candidate: structured Wiktionary extraction incl. a Malay edition; regularly updated. |
| `open-dsl-dict/wiktionary-dict` | offline bilingual dict files | CC-BY-SA (Wiktionary) | Prebuilt bilingual pairs from Wiktionary. |
| Malaya / `malaysian-dataset` | corpora + lexica | CC-BY 4.0 | Bahasa Malaysia NLP datasets; good for coverage/validation. |
| DBP PRPM / Kamus Dewan | web lookup | **NOT open** | Authoritative but not openly licensed/redistributable — do not bundle. |

**Licensing caveat (must resolve before shipping a bundled list):** Wiktionary
data is **CC-BY-SA (share-alike)**. *Using* it to validate pairs at runtime is low-
risk, but **redistributing a derived word-list file** triggers attribution +
share-alike obligations on that file. Decide: runtime-validate only vs. ship a
derived asset (then add attribution + license the derived file accordingly). Flag
for a licensing check in Phase 2.

Sources: [kaikki.org](https://kaikki.org/dictionary/index.html) ·
[open-dsl-dict/wiktionary-dict](https://github.com/open-dsl-dict/wiktionary-dict) ·
[malaysian-dataset](https://malaysian-dataset.readthedocs.io/en/latest/) ·
[OpenCorpus index](https://github.com/madhav1k/OpenCorpus).

---

## 8. Open decisions (defaults bold — confirm at Phase-1 kickoff)
1. **Does For You REPLACE `/` (Dashboard) as the landing, or sit beside it?**
   **Default (REVISED after the 2026-06-06 adversarial/verification pass): For You is
   an ADDITIVE new tab + route; Dashboard STAYS at `/`. Defer the landing-swap to a
   separate, deliberate change.** Rationale: swapping `/` is the single biggest-blast-
   radius item in the feature — it touches `FirstRunCard`, the `first-run-tour.spec`
   + `daily-plan.spec` e2e, the `Home` nav entry, and the SEO canonical (`index.html`
   → `/`). Making Phase 1 additive-only keeps it low-risk; decide the landing after
   For You proves out. (The earlier "becomes `/`" default was the riskier call.)
2. **"Still remember these?" probe interval N.** **Default: stability ≥ 21d AND last
   reviewed ≥ 14d ago AND not due.** Tunable; confirm the numbers.
3. **Shelf count/order on first paint.** **Default: Keep going → Picked for you →
   Still remember these? → Saved words → Toward your goal.** Confirm.
4. **AI deck size + placement.** **Default: 10 cards, lands in a deck named
   "AI · {goal}".** Confirm.

---

## 9. Risks & mitigations
- **AI card accuracy** → §5.4 dictionary gate + learner-in-the-loop; never silent-ship.
- **CC-BY-SA share-alike** → §7 caveat; default to runtime-validate, decide before bundling.
- **Scope creep (auto-router, base-dict expansion)** → explicitly parked as separate specs.
- **Dashboard churn / regressions** → For You is ADDITIVE (new route); Dashboard
  untouched in Phase 1 except the landing-route swap (decision §8.1). Don't rewrite
  Dashboard's 857 lines.
- **Shelf perf** → pure builder over a single store snapshot; no per-shelf store
  subscriptions (follow the CLAUDE.md selector rules).
- **Empty/new-learner state** → every shelf self-hides; a dedicated first-run state.

---

## 10. Test plan
- **Unit (TDD):** `forYouShelves.js` (each shelf's include/exclude + empty-hiding +
  ordering); `goalToFocus()` (each preset → emphasis); the "still remember" selector
  (boundary on stability/recency/not-due); Phase 2 `verifyPair()` (verified /
  mismatch / unknown) + the AI-candidate grounding filter (mock AI in, filtered out).
- **E2E:** seed signals → `/for-you` renders the right shelves, launches sessions;
  goal preset changes emphasis; (Phase 2, mock AI) "Make me a deck" → grounded cards
  land in a deck. Light + dark. `bindStore` (Vite `?t=` trap).
- **Gates:** build clean · lint 0 · test:run all · e2e green · eyeball both themes.

---

## 11. Estimate
- Phase 1 (smart shelves + goal link): **~3–4 h** (mostly new UI + one pure builder).
- Phase 2 (AI decks + dictionary grounding): **~4–6 h** + a data/licensing pass.
- Parked specs (auto-router, base-dict expansion): separate, later.
