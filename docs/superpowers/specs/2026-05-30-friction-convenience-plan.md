# Friction & Convenience Plan — for review (no code yet)

**Status:** PLAN / DISCOVERY — written autonomously 2026-05-30 while the user
was out. **Nothing here is built.** Each item is sized + risk-rated so the next
session can pick and execute fast, WITH Kheshav's product judgment on the calls
that need it.

**Principle (from CLAUDE.md):** zero-waste, frictionless, no cheap
gamification. So "reduce friction" = fewer taps to value + fewer dead ends +
clearer next steps — NOT more features. Several items below are deliberately
flagged "don't build" or "needs your call."

---

## How I judged "friction"

Every extra tap, every hidden feature, every dead-end message, and every moment
a student doesn't know what to do next is friction. I walked the real entry →
nav → key flows (Layout nav, Dashboard/Daily Plan, Settings, Speaking) and
grounded each item in actual code, not generic UX advice.

---

## P1 — High value, low risk (do these first)

### 1. Navigation discoverability — the biggest friction
**Reality:** the bottom nav has only 4 primary tabs (Home, Study, Grammar,
Roleplay). **Behind "More" sit Speaking, Writing, Comprehension, Listening,
Cikgu Maya, Mistakes, Exam Rehearsal, Word Families, Import, PDF Reader,
Settings** (`Layout.jsx` `NAV`). Seven *core learning surfaces* require opening
a drawer to reach — a student may never discover Speaking or Comprehension.
**The Daily Plan mitigates this by routing, but only for the one task it picks.**

**Options (needs your call — this is product judgment):**
- (a) **Make the 4 tabs context-aware** — swap the least-relevant primary tab for
  the student's current focus skill (e.g. surface Speaking when it's their
  weakest). Low risk, high cleverness.
- (b) **A "Practice" hub tab** that opens a clean grid of all learning surfaces
  (instead of the cramped More drawer), so everything is two taps and visually
  scannable.
- (c) **Reorder the static 4** to the highest-traffic surfaces once telemetry
  shows what people actually use (you now have `*_clicked` events).
**Recommendation:** (b) — a real "Practice" hub is the least gimmicky and most
discoverable. Medium build, low risk. This was a previously-parked task
("Nav restructure — More-drawer → primary surfaces").

### 2. AI quota → BYOK nudge (closes a loop we just built)
**Reality:** AI is capped at 50/day client-side. When a student hits the cap or
sees an "AI quota exhausted" fallback (e.g. EN roleplay), there's now a real
answer — **add your own key (Settings → Use your own AI key)** — but nothing
points them there. **Fix:** when an AI feature is rate-limited/unavailable, show
a one-line "Out of AI for today — add your own free key to keep going →" linking
to Settings. Tiny, high-value, reuses what shipped today. **Low risk.**

### 3. Replace the writing-grade `alert()` with an inline message
**Reality:** `useWritingEvaluator.js` pops a browser `alert()` on AI-grade
failure ("AI Grading failed (falling back to local grade)"). A modal popup is
jarring and blocks the UI. **Fix:** surface it inline (it already falls back to
the local band gracefully; just replace the `alert` with a small non-blocking
notice). **Low risk, pure UX win.** (Found during today's review.)

### 4. First-run momentum check
**Reality:** new users pick topics + a daily goal, then see FirstRunCard. Worth
verifying (browser) that a brand-new guest reaches their first *reviewed card*
in under ~60 seconds with no confusion. **Fix (if needed):** trim the topic-pick
step to a single sensible default deck with "customise later." **Low risk;
needs a real first-run walkthrough to confirm it's even a problem.**

---

## P2 — Convenience, medium value

### 5. Per-surface empty states with a clear CTA
Audit each route for the "new student, no data yet" view. Speaking/Writing/
Comprehension should each say "here's what this does + start here," never a
blank panel. Cheap, friendly, reduces bounce. Low risk.

### 6. Mic-permission pre-prompt for Speaking
**Reality:** Speaking needs mic permission; a cold browser prompt mid-flow is
friction and easy to deny by reflex. **Fix:** a one-line "we'll ask for your
mic so you can speak your answer" *before* triggering the browser prompt, so the
student knows why. Low risk.

### 7. Offline clarity
Confirm the offline banner + that AI/import features visibly disable (not
silently fail) when offline. The PRD called for this; verify it still holds
after the PWA auto-update change. Low risk.

### 8. "Add to Home Screen" nudge timing
The PWA install prompt exists (Enhanced tier). Make sure it appears *after* a
student has felt value (e.g. first completed session), not on first load — a
too-early install prompt is friction people dismiss forever. Low risk, telemetry
can confirm.

---

## P3 — Deliberately NOT recommended now (anti-friction = restraint)

- **More gamification / badges / XP surfacing.** Fights the "no cheap
  gamification" principle. Skip unless a retention metric demands it.
- **A second daily counter / streak widget.** The Daily Plan already owns
  "what to do today." Don't dilute it.
- **More AI surfaces.** The AI is already everywhere it needs to be; adding more
  AI entry points adds cost + decision fatigue, not value.
- **Routing the writing band-grader through BYOK.** See the BYOK spec §8 — a
  deliberate exception (Gemini JSON mode is more reliable; circular-import risk).

---

## Suggested order for the next session

1. #2 (BYOK nudge) and #3 (kill the `alert`) — tiny, safe, ship same session.
2. #1 (nav "Practice" hub) — the big discoverability win; brainstorm the option
   with Kheshav first (it's a product call), then build.
3. #5–#8 — a convenience polish pass once the above land.

Content depth (more topics/passages aligned to real 0546/0500 papers) remains
the highest *grade-moving* lever, but it's Kheshav-led (subject expertise), not
an autonomous build.

---

## Paste-ready next-session kickoff prompt

> Continue work on the IGCSE Malay Master app (clean checkpoint on `main`,
> everything committed + pushed, 320 vitest pass / 0 lint errors). Read
> `RESUME_HERE.md` top-to-bottom first — the last entries cover Speaking
> Progression v1, BYOK v1, and a review pass.
>
> Two real-world checks are still pending from the user: (1) paste a real
> OpenRouter key in Settings → Test (✓) → tap the Speaking Progress "AI coach"
> button; (2) eyeball the Speaking Progress widget (trend at ≥3 attempts,
> sparkline at ≥5, dark + light).
>
> Then work the friction plan at
> `docs/superpowers/specs/2026-05-30-friction-convenience-plan.md`. Start with
> the two tiny safe wins — **#2 (AI-quota → "add your own key" nudge)** and
> **#3 (replace the writing-grade `alert()` with an inline notice)** — using the
> brainstorming → spec → TDD-build → verify → merge discipline on a feature
> branch. Then brainstorm **#1 (nav "Practice" hub)** WITH the user before
> building (it's a product call). Budget-conscious: no token-heavy tooling
> unless asked; surgical diffs; verify before claiming done.
