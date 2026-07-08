# Tutor Output Contract v1 — Design Spec (2026-07-08)

**Status:** design, awaiting Kheshav's review → then implementation plan (writing-plans).
**Scope owner decision (2026-07-08):** pedagogy = **mode-aware** (approved). Direct-instruction stays for explanation requests; withhold-and-scaffold applies only to retrieval/attempt contexts.
**Source of truth:** strategy brief §8 (`docs/strategy/2026-07-08-strategic-deepdive-brief.local.md`, gitignored) + a code-grounded architecture map (file:line refs below).

---

## 1. Problem & goal

An AI tutor with no output discipline is a *defect*, not a feature: research shows uncontrolled AI help drives near-total cognitive offloading and can *lower* mastery, and weak/free models ignore system-prompt instructions that GPT-4-class models obey. Today "Cikgu" answers are shaped only by prompts, and those prompts **disagree across backends** (see §3) — so the quality bet cannot live in the prompt.

**Goal:** a **model-agnostic, app-side post-processor** that enforces short, scaffolded, honest, one-next-action tutor turns regardless of which backend produced the text — validated by the existing eval harness, not asserted.

**Success (v1, honest & measurable — per-run, offline, no cross-user %):**
1. **Length-cap conformance ≥95%** of tutor turns within the soft budget (deterministic, byte-checkable).
2. **One-next-action present** in ≥95% of turns (deterministic).
3. **Answer-leak flag rate** on a **fixed labeled set**, reported **alongside the detector's own measured recall** — so "0 leaks" can never secretly mean "detector missed them." The detector's precision/recall is **validated first** (see §9) before it gates anything.

## 2. Scope

**In (v1):** the Cikgu tutor surface only; the pure enforcer + its wiring at the one `CikguBot` seam; wiring `buildLearnerProfile` into Cikgu; the eval/test harness.

**Out (later waves, explicitly deferred):**
- BYOK routing of tutor surfaces (Wave 2) — the enforcer sits *above* whichever transport runs, so BYOK is a mechanical follow-up.
- Applying the contract to Writing feedback / Roleplay **scoring** (Wave 2). Roleplay **in-character** turns stay exempt forever (locked decision).
- **Hard** answer-leak blocking on drill surfaces (cloze/dictation), where "the answer" is well-defined — that is a separate, later surface (v1 on open-ended chat uses a *soft* flag + reveal valve, see §6).

## 3. Architecture (grounded)

**The seam is in the app layer, not the transport layer.** `src/lib/ai.js` (Supabase edge proxy, tier 3, the only streaming path) and `src/lib/instruct.js` (BYOK router) are shared plumbing used by OCR / writing-grading / deck-gen — and `instruct.js` **is not in the Cikgu path at all**. Cikgu's `sendMessage` (`src/pages/CikguBot.jsx:75–156`) runs **5 independent answer branches** (expert / Gemini / OpenRouter / edge-function / expert-fallback) that all converge on `addMessage({role:'assistant', …})` + `return`.

**Decision:** insert the enforcer at that convergence point. Refactor `sendMessage` so all branches compute one `rawText`, then call the enforcer **once** before the single `addMessage` + `return` (so rendered text **and** TTS-readback are the same post-processed string).

**The enforcer is a pure module:** `src/lib/enforceTutorTurn.js` (DOM-free, `now`-injectable), mirroring how `getExpertResponse` was extracted so `scripts/ai-tier-eval/harness.mjs:25` can import it directly. `CikguBot.jsx` stays the thin impure caller (repo convention: pure lib + thin impure boundary).

**Bonus fix (pre-existing drift):** the edge-function has its **own** `chat` system prompt (`supabase/functions/ai-proxy/index.ts:108–111`, Socratic) that diverges from the client `CIKGU_SYSTEM_PROMPT` (`src/core/agent/promptLibrary.ts:12–35`, direct-instruction) and is outside the pinned parity test. A post-hoc contract **unifies observable behavior across all three prompt-authors** without touching each prompt.

## 4. API contract

```
enforceTutorTurn(rawText: string, ctx: {
  mode: 'explain' | 'retrieval',        // see §5 mode detection
  userText: string,
  profile: LearnerProfile,              // buildLearnerProfile(state, {lang})
  attempted: boolean,                   // has the learner made a logged attempt this thread?
  concept?: string,                     // for element-interactivity budget scaling
  now: number,
}) => {
  text: string,                         // cleaned, control-block stripped, TTS-safe
  control: { hint_level, gave_answer, checked_understanding, next_action },
  gaveAnswer: boolean,
  truncated: boolean,
  softened: boolean,                    // did we ask for / apply a condense?
}
```

## 5. Mode detection (the mode-aware core)

- **Default = `explain`** → direct-instruction preserved (the current, evidence-backed stance; Kirschner–Sweller–Clark 2006). The enforcer does **not** withhold answers here — only shapes length / one-action / honesty.
- **`retrieval`** is entered only on explicit signals available in `sendMessage` scope: the caller passes `mode:'retrieval'` when the turn originates from a drill/attempt context, **or** the model self-declares `request_type:'solve'` in the control block **and** `attempted === false`. Because self-declaration is unreliable on weak models, v1 treats a `retrieval` classification on the **open-ended chat surface** as a **soft** gate (flag + reveal valve), never a hard block (§6). Hard blocking is reserved for drill surfaces where the target is unambiguous (deferred).

## 6. Rules

### Layer 1 — universal (every turn, every backend)
- **Soft length budget**, not a chop: target ~2–3 sentences, **scaled by concept element-interactivity** (a Malay *imbuhan* affix transform legitimately needs more words than a one-word gloss). On overflow, ask the model to **self-condense while keeping the worked step**; hard-truncate only as a last-resort safety net.
- **Exactly one next-action or understanding-check** per turn → surfaced via `FeedbackLive` (`src/components/FeedbackLive.jsx:8–14`) for a11y parity.
- **No-bluff hedge** on low confidence — **reuse** `buildUncertaintyResponse` / `MIN_CONFIDENCE` logic (`src/data/cikguKnowledge.js:1396,1417–1428`) so AI-tier turns hedge the same honest way expert-tier ones already do.
- **Learner-profile context** — feed `buildLearnerProfile` (`src/lib/learnerProfile.js:151–183`; today wired to Roleplay/Writing but **not Cikgu**) so the tutor sees the learner's own prior work / scaffold level. This is Khan's answer-leak-cutting move **and** a genuine upgrade.

### Layer 2 — conditional (only when `mode === 'retrieval'`)
- **Don't reveal the target answer before a logged attempt** (`attempted === false`).
- **Explicit "just show me" reveal valve** — a deliberate, logged choice; revealing is **never** framed as failure (matches the reader's reveal-gate philosophy).
- On the **open-ended chat** surface this is a **heuristic flag + reveal valve**, not a hard block (a correct grammar explanation legitimately contains the form). Hard block is drill-surface-only (deferred).

## 7. Control block, streaming, TTS

- Model emits a **delimited trailing control line** `⟦CTRL⟧{...json...}`; the enforcer parses then **strips from the delimiter onward**. Malformed/absent → default control values, text passes through (defensive).
- **Streaming (tier-3 only):** the ephemeral live bubble (`CikguBot.jsx:536–558`) renders `ai.streamedText` upstream of the enforcer. Mitigation: strip anything at/after `⟦CTRL⟧` **in the streamed-text render** too, so the control tail never flashes. (Only 1 of 5 branches streams; the other 4 resolve whole strings — trivial.)
- **TTS:** stripping happens **before** `sendMessage` returns, because `readResponse` (`CikguBot.jsx:173–211,259–267`) speaks the return value — so the control block is never read aloud.
- **Storage:** control metadata rides on the message object via `addCikguMessage` (`src/store/useStore.js:759–767`), which already stores arbitrary fields (cap 50). **No STORE_VERSION bump** (current version = 35). A bump is needed only if we later add a top-level compliance log.

## 8. Reuse map (don't rebuild)

| Need | Reuse (file:line) |
|---|---|
| Honest hedge | `buildUncertaintyResponse` / `MIN_CONFIDENCE` — `cikguKnowledge.js:1396,1417–1428` |
| Learner context | `buildLearnerProfile` — `learnerProfile.js:151–183` (+ `getFixUpQueue` `useStore.js:1819–1842`) |
| Socratic scaffold text | **Generalize** existing `getMetacognitivePrompt`/`getRelationalHookPrompt` — `promptLibrary.ts:37–63` (today siloed to `feedbackGenerator.ts`) |
| One-next-action a11y | `FeedbackLive` — `FeedbackLive.jsx:8–14` |
| Eval importability | pure `src/lib/` export, like `getExpertResponse` (`ai-tier-eval/harness.mjs:25`) |

## 9. Eval & test plan (validate before trusting)

1. **Validate the answer-leak detector FIRST.** Build a ~100-item labeled set (include *legitimate* Malay grammar explanations that contain the form, using Kheshav's Gemini key). Measure precision/recall. It does not gate anything until recall is known and acceptable.
2. **Unit tests** (`src/lib/__tests__/enforceTutorTurn.test.js`, red-proofed watched-failing first): soft-budget condense vs hard-cap; one-next-action presence; control-block parse + strip (render **and** TTS paths); hedge passthrough; `explain` mode never withholds; `retrieval`+`!attempted` flags/valves; malformed control block is defensive.
3. **Tier eval** (extend `scripts/ai-tier-eval`): report the **two honest numbers** — length-cap conformance **and** leak-flag rate *with detector recall printed alongside*. Pin one named Ollama model + snapshot the OpenRouter slug at eval time.
4. **Parity guard:** extend the pinned parity test to include the edge-function `chat` prompt so the 3 authors can't silently diverge again.

## 10. Rollout

Land behind an internal flag (default OFF), validate via eval + a manual smoke pass on real Cikgu turns (dark/light, streaming + non-streaming, voice mode), **then** flip default-ON. No user-facing toggle — this is invisible quality, not a preference.

## 11. Risks

1. **Pedagogy fork** — resolved (mode-aware). The enforcer must **not** withhold in `explain` mode, or it fights the direct-instruction system prompt.
2. **Streaming flash** — mitigated by stripping the control tail in the streamed-text render.
3. **Eval blind spot** — mitigated by the pure `src/lib/` export.
4. **Weak-model disobedience** — the whole reason the guarantee is app-side (Layer 1 is deterministic; it does not depend on the model obeying the prompt).

## 12. Open questions (non-blocking; defaulted, veto welcome)

- **Mode signal on chat:** v1 relies on caller-passed `mode` + model self-declared `request_type` (soft on chat). Acceptable for v1? *(Default: yes — hard gating waits for drill surfaces.)*
- **Budget numbers:** exact sentence/token targets per concept tier — tune during eval.
- **Flag → default-ON criteria:** propose flip once (1) eval conformance ≥95% and (2) leak-detector recall is known and a manual smoke pass reads well.
