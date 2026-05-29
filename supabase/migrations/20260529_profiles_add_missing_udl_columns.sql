-- 2026-05-29 — Schema-parity audit follow-up to the user_cards fix.
--
-- The live DB was provisioned from an older schema. A full column diff of
-- every live table vs the committed SQL (setup_all_tables.sql) turned up ONE
-- other drift besides user_cards: the `profiles` table was missing four
-- columns the committed schema declares — identity, exam_date, theme,
-- daily_goal.
--
-- IMPORTANT — this is a LATENT landmine, not an active bug (unlike user_cards):
--   • The only profile_updated payload currently enqueued carries just
--     { userInterests } (src/store/useStore.js), so toProfileRow only ever
--     touched the existing user_interests column → those writes succeeded.
--   • fetchUserProfile (src/config/supabase.js) selects all 8 columns and
--     WOULD throw on the missing ones, but it has zero callers in app code.
-- The moment anyone wires theme/identity/examDate/dailyGoal into a
-- profile_updated payload, or calls fetchUserProfile, the missing columns
-- would break profile sync the same way user_cards.deleted did. Adding them
-- now keeps prod aligned with the committed schema and defuses that.
--
-- Additive, idempotent, reversible. Applied to prod 2026-05-29; verified the
-- full PROFILE_COLUMNS select runs without error afterward.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS identity   JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS exam_date  DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme      TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_goal INTEGER;
