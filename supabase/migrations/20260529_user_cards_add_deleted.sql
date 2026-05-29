-- 2026-05-29 — Fix: user_cards never populated in production.
--
-- Root cause: the LIVE user_cards table was provisioned from an older schema
-- that predated the `deleted` column. The committed schema
-- (phase-b-cloud-sync.sql / setup_all_tables.sql) already declares it, but the
-- migration was never applied to prod. Both the read path
-- (src/lib/cloudSync.js → fetchCloudCards: `.eq('deleted', false)`) and the
-- write path (upsertCloudCards: writes `deleted: false`) reference the column,
-- so every card sync threw `column user_cards.deleted does not exist`:
--   • hydrateCloudData died at the fetch step (24,238 swallowed failures in
--     telemetry_events) and never uploaded the deck,
--   • every card_reviewed / card_added flush failed (sync_flush_failed ×269),
--     and pre-28c8f49 those exhausted-retry events were silently dropped.
--
-- Diagnosed via the Supabase Management API: telemetry_events payload error,
-- then confirmed against information_schema.columns (deleted column absent).
--
-- Fix is additive, idempotent and reversible (DROP COLUMN). Applied to prod
-- 2026-05-29; after it landed, hydrateCloudData succeeded and user_cards went
-- 0 → 264 (full deck), PC↔phone sync verified identical.
--
-- Apply to any other environment that was provisioned from the same old schema.

ALTER TABLE public.user_cards
  ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
