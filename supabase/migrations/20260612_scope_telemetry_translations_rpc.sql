-- P3 security scoping (2026-06-12 review):
--   1. telemetry_events anon INSERT was WITH CHECK (true) — flood/poison
--      surface. Scope to sane shapes: short event names, object payloads,
--      ≤8 KB. Live data maxes: event_type 25 chars, payload 304 bytes — this
--      breaks nothing. (RLS can't stop many-small-rows flooding; residual
--      risk noted in the review. Inserts are fire-and-forget client-side, so
--      an over-limit row is dropped silently by design.)
--   2. translations cache: drop the any-authed-user UPDATE policy. The
--      client writes via upsert(onConflict: 'key') and swallows failures, so
--      existing keys become first-write-wins — an attacker can no longer
--      overwrite good cached entries (poisoning now limited to first-write
--      of new keys). Also pin created_by to the real caller.
--   3. rls_auto_enable(): inert but executable by client roles — revoke.

-- 1. telemetry_events ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can insert telemetry" ON telemetry_events;
CREATE POLICY "Anyone can insert sane telemetry"
  ON telemetry_events FOR INSERT
  WITH CHECK (
    length(event_type) <= 64
    AND jsonb_typeof(payload) = 'object'
    AND pg_column_size(payload) <= 8192
  );

-- 2. translations ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated can update translations" ON translations;
DROP POLICY IF EXISTS "Authenticated can insert translations" ON translations;
CREATE POLICY "Authenticated can insert translations"
  ON translations FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND length(key) <= 600
    AND length(text) <= 20000
    AND created_by = auth.uid()
  );

-- 3. rls_auto_enable ────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION rls_auto_enable() FROM PUBLIC, anon, authenticated;
