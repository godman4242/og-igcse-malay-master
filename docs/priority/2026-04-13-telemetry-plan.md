# Telemetry Plan (P0/P1)

## Event Schema
- Required base fields:
  - `event`
  - `ts`
  - `sessionId`
  - `networkStatus`
  - `appVersion`

## P0 Events
- `sync_queue_enqueued`
  - `eventType`, `queueLength`
- `sync_flush_started`
  - `queueLength`
- `sync_flush_succeeded`
  - `processed`, `remaining`, `durationMs`
- `sync_flush_failed`
  - `error`, `processed`, `remaining`
- `network_status_changed`
  - `status`

## P1 Events
- `daily_challenge_generated`
  - `reviewTarget`, `grammarTarget`
- `daily_challenge_completed`
  - `timeToCompleteMin`
- `streak_freeze_awarded`
  - `milestone`, `inventoryCount`
- `streak_freeze_consumed`
  - `inventoryCount`
- `install_prompt_shown`
  - `surface`
- `install_prompt_accepted`
  - `surface`

## Success Thresholds
- P0:
  - sync success rate >= 98%
  - median queue drain time <= 5s
  - offline session completion >= 95%
- P1:
  - challenge completion >= 45% of active days
  - D7 retention uplift >= +8 percentage points from baseline
  - streak continuity uplift >= +10 percentage points

## Instrumentation Approach
- Start with local event log utility in `src/lib/telemetry.js`.
- Keep provider-agnostic envelope for later PostHog/Supabase analytics export.
