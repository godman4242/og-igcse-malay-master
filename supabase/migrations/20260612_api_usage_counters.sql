-- Per-uid daily API usage counters for the Vercel proxy caps
-- (api/_lib/guard.js enforceDailyCap). P2-S2 fix: the client-side
-- DAILY_LIMIT is UX-only and bypassable by direct fetch; this is the
-- server-side backstop.
--
-- Service-role only: RLS enabled with NO policies — anon/authenticated can
-- neither read nor write rows; the serverless functions use the service key,
-- which bypasses RLS. The RPC is likewise revoked from client roles.

CREATE TABLE IF NOT EXISTS api_usage_counters (
  uid       UUID NOT NULL,
  day       DATE NOT NULL DEFAULT CURRENT_DATE,
  endpoint  TEXT NOT NULL,
  count     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (uid, day, endpoint)
);

ALTER TABLE api_usage_counters ENABLE ROW LEVEL SECURITY;

-- Atomic increment; returns the new count for the caller to compare against
-- its cap. SECURITY DEFINER (runs as owner) with a pinned search_path;
-- EXECUTE revoked from client roles below — only the service role may call.
CREATE OR REPLACE FUNCTION increment_api_usage(p_uid UUID, p_endpoint TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_count INTEGER;
BEGIN
  INSERT INTO api_usage_counters (uid, day, endpoint, count)
  VALUES (p_uid, CURRENT_DATE, p_endpoint, 1)
  ON CONFLICT (uid, day, endpoint)
  DO UPDATE SET count = api_usage_counters.count + 1
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION increment_api_usage(UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- Belt-and-braces: RLS-with-no-policies already default-denies, but drop the
-- default table grants too so client roles hold no privilege at any layer.
REVOKE ALL ON TABLE api_usage_counters FROM anon, authenticated;
