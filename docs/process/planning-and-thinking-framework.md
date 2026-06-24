# Planning & thinking framework — "Compass · Two Gears · Tight Loops"

**Approved by Kheshav 2026-06-24** (conditional on a final improvement pass — done; this is v2).
Supersedes the implicit "research → plan → implement" ordering as the *mental model*; the
mechanics in [`feature-development-methodology.md`](./feature-development-methodology.md) (session
modes, gate-green, TDD) still stand — this is the *why/when*, that is the *how*.

## Why this exists

Kheshav felt the old "research, then plan, then implement" line was wrong, and was torn: planning
first feels more visionary, but pure directed research also misses the *serendipitous* discoveries
that come from not looking straight at the problem (his speed-of-light example — Ole Rømer inferred
light's finite speed in 1676 while timing Jupiter's moon Io). Both intuitions are right. The
resolution, grounded in research, is that the order isn't the problem — the **linearity** is.

Grounding (real sources, not memory):
- **Pasteur's Quadrant** (Donald Stokes, 1997): the most productive work is *use-inspired* — it
  pursues deep understanding **and** real-world use *at the same time*, not one then the other. A
  real goal *directs* what's worth researching. → the **Compass**.
- **Serendipity in science** (~half of major discoveries involve it; over-focusing milestones can
  be a mistake): breakthroughs need a *prepared mind* ("chance favours the prepared mind", Pasteur)
  built by exploration + tools, not pure luck or pure directed search. → the **Explore gear**.
- **Diverge → converge** (design practice): alternate widening and narrowing; don't pretend it's a
  straight pipeline.

## The framework

### 🧭 Compass — always on
Every cycle must plausibly **improve a real learner's exam outcome per minute spent** (the GOAL.md
north-star). The compass also says **NO** — it kills low-leverage ideas before they cost anything.
*Failure it prevents:* building neat things no learner's outcome needs (knowledge/feature for its
own sake).

### 🔭 Explore gear — DIVERGE (the piece we were missing)
Regular, time-boxed, **undirected**. Use the app as a real student; read adjacent fields, products
(e.g. Zen browser for personalization), and learning science; collect anomalies + ideas in a
**spark log**. Not tied to any current task. This builds the prepared mind so serendipity can
strike — it's where *innovation* (not just execution) comes from.
*Failure it prevents:* only ever grinding the known backlog → no innovation, blind spots pile up.

### ⚙️ Execute gear — CONVERGE
For a chosen bet: **Vision/plan** (measurable Done + what-not-to-break) → **directed research** of
the plan's open questions (grounded, with practitioner reviews — never from memory) → **build**
(TDD, gate-green) → **verify** (Claude reviews its own work). The plan is a **living document, not a
pipeline**: research can send you back to replan — or **kill the bet**.
*Failure it prevents:* thrash, and shipping unverified.

### 🔁 Tight loops — the real "mistakes don't pile up" lever
Small batches; verify every step so errors surface in minutes, not after they compound. Includes a
**stop-rule**: kill a bet the moment evidence says it isn't paying off (honest updating,
sunk-cost-proof). This — not a from-scratch rebuild — is how mistakes stop piling up.

### 🔗 The handoff (closes the loop)
Explore's **spark log** → triaged into the **GOAL.md backlog** → becomes an Execute **bet**. So
exploration continuously feeds execution; execution surfaces new sparks. One system, two gears.

## What this is NOT
- **Not a from-scratch rebuild.** Kheshav's instinct to "rebuild planning from the ground up" was
  overridden (brainstorm-partner critique): big-bang rebuilds trigger the *second-system effect*
  (re-introducing solved problems). The working parts — decide-and-flag, gate-green/TDD,
  research-as-a-workstream, the GOAL.md loop — are **kept**. This *adds* the Explore gear + names
  the loop discipline.
- **Not a fixed order.** "Plan first" holds *within* an Execute bet (use-inspired), but research can
  bounce you back, and the Explore gear runs in parallel regardless.

## How we apply it (current cadence)
- **Aspect deep-dives** (one per focused/live session): pick the highest-Compass aspect, run the
  Explore→Execute loop on it — real research (reviews) → spec → plan → build. Order set 2026-06-24:
  **personalization → learning science → code quality** (revisit after each).
- The autonomous build loop runs **Execute** on pre-vetted bounded bets; **Explore** + any
  product/UX/pedagogy judgment stays in attended sessions.
