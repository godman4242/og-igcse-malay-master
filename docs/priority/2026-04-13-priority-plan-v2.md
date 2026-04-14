# IGCSE Malay Master Priority Plan v2

## Scope

- Canonical codebase: `src/`
- Delivery philosophy: trust-first, research-first, incremental gates.

## Priority Ladder

### P0: Reliability Foundation

- Durable outbox queue and truthful sync status.
- Offline-first UI contract and hardened service worker.
- Gate: zero silent loss, no false synced states.

### P1: Engagement Core

- Daily challenge engine (reviews + grammar).
- Streak freeze fairness mechanics.
- Install funnel after meaningful usage.
- Gate: challenge completion and streak continuity uplift.

### P2: Learning Efficiency

- Interleaved session architecture.
- Error-to-drill closed loop.
- Pronunciation feedback expansion.

### P3: AI Exam Intelligence

- Dynamic Paper 3 turn quality.
- Rubric-grounded Paper 4 scoring and revision loops.

### P4: Optional Social Layer

- Weekly missions, opt-in leaderboard, share cards.

## KPI Gates

- P0: sync success, queue drain time, offline completion.
- P1: challenge completion, streak continuity, D7 uplift.
- P2: recall accuracy and weak-topic recovery.
- P3: AI latency p90 and completion quality.

## Connector Usage Policy

- Tavily: implementation research before major features.
- Supabase: cloud schema/sync/RLS and idempotency rollout.
- Figma: design fidelity and component mapping once UI fidelity tasks begin.
- Browser connector: post-change flow verification.

## Improvement Log (new ideas discovered during build)

1. Add a dedicated dead-letter screen for failed sync events with “retry now” and “discard safely”.
2. Add challenge templates by exam horizon (normal / exam week / final 3-day sprint).
3. Add optional low-pressure “micro challenge” mode for burnout prevention.
4. Add a freeze ledger in settings (awarded, consumed, reason).
5. Add install funnel A/B test (dashboard card vs post-session modal) with telemetry.
6. Add challenge mode shifting by exam horizon (`normal`, `exam_week`, `final_sprint`) to keep load realistic.

