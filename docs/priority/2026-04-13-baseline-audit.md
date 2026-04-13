# Baseline Audit (P0/P1)

## Scope
- Canonical app: `src/`
- Audit targets: P0 reliability foundation and P1 engagement core.

## P0 Findings (Reliability)
- No sync queue or outbox model exists in `src/store/useStore.js`.
- No explicit online/offline state model exists in store or UI.
- No sync status UI exists in `src/components/Layout.jsx`.
- Service worker is present but minimal in `public/sw.js`:
  - no cache strategy separation by request class
  - no version migration helper messages
  - no background sync hooks
- Service worker is not registered in `src/main.jsx`.
- Supabase integration file exists (`src/config/supabase.js`) but there is no queue-based sync orchestration.

## P1 Findings (Engagement)
- Dashboard already includes forecast and heatmap in `src/pages/Dashboard.jsx`.
- Streak exists in `src/store/useStore.js` but no freeze mechanic or grace policy.
- Milestone animation exists in `src/lib/confetti.js` but no reward inventory.
- No daily challenge engine exists.
- No install funnel (`beforeinstallprompt`) exists.

## Existing Strengths To Preserve
- FSRS flow and migration logic in `src/store/useStore.js`.
- Roleplay scoring and speaking loop in `src/pages/Roleplay.jsx`.
- Dashboard analytics widgets in `src/pages/Dashboard.jsx`.

## Gap Summary
- P0 is mostly missing and must be implemented before additional engagement mechanics.
- P1 should build on P0 state/status primitives instead of adding disconnected UI logic.
