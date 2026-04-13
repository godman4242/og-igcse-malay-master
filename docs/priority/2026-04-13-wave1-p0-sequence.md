# Wave 1 (P0) Implementation Sequence

## Execution Order
1. Add sync primitives and queue model to store.
2. Add standalone sync engine utility (queue processing + retry policy).
3. Wire queue producers from study actions.
4. Add global network/sync status UI in layout.
5. Register and harden service worker.
6. Run lint/build verification.

## Verification Checklist
- Queue receives events on card/grammar/streak actions.
- Offline mode sets status to `offline` and blocks flush attempts.
- Online mode can flush queue and update status transitions.
- Sync status UI reflects `pending/syncing/synced/error`.
- Service worker registers successfully and app shell is cached.
- Build and lint pass.

## Rollout Safety
- Keep sync behavior additive and non-destructive.
- If remote sync is unavailable, keep app fully functional locally.
- Never block study actions on network requirements.
