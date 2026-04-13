# P0 Technical Spec - Reliability Foundation

## Goals
- Prevent silent data loss.
- Make sync state visible and understandable.
- Support offline-first usage with deterministic retry behavior.

## Data Model
- Add `sync` object to Zustand store:
  - `networkStatus`: `online | offline`
  - `syncStatus`: `synced | pending | syncing | error`
  - `queue`: array of outbox events
  - `lastSyncAt`: ISO timestamp or null
  - `lastError`: string or null
- Outbox event shape:
  - `id` (uuid)
  - `type` (`card_reviewed`, `grammar_reviewed`, `streak_updated`, `study_minutes_logged`)
  - `payload`
  - `createdAt`, `updatedAt`
  - `attempts`
  - `idempotencyKey`

## Sync Engine Contract (`src/lib/syncEngine.js`)
- `createSyncEvent(type, payload)`
- `enqueueEvent(queue, event)`
- `processQueue({ queue, isOnline })`
  - if offline: no-op, keep queue intact
  - if online: process in FIFO order
  - transient failures increment `attempts` and keep event
  - hard failures are surfaced in `lastError`
- `maxAttempts`: 5 before parking event in queue
- Idempotency:
  - deterministic key based on `event.id`
  - server writes use upsert patterns where possible

## Queue Producers
- `reviewCardAction()` emits `card_reviewed`.
- `reviewGrammarDrill()` emits `grammar_reviewed`.
- `updateStreak()` emits `streak_updated`.
- `addStudyMinutes()` emits `study_minutes_logged`.

## Service Worker Policy
- Register SW in `src/main.jsx`.
- `public/sw.js`:
  - static assets: cache-first with revalidate
  - navigation: network-first fallback to cached shell
  - same-origin GET API: stale-while-revalidate
  - fallback response for failed requests when cached copy exists
- Include versioned cache namespace.

## Status UX
- Add top-level status chip/banner in `src/components/Layout.jsx`.
- Show:
  - offline indicator
  - queue length
  - sync status text
  - retry action when in error/pending

## Non-goals (P0)
- No leaderboard/social ranking.
- No push notification system.
- No complex conflict UI.
