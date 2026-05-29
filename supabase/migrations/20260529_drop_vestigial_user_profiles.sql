-- Migration: drop the vestigial `public.user_profiles` table.
--
-- ⚠️ PREPARED, NOT AUTO-APPLIED. Review and run manually (Supabase SQL editor
--    / Management API) when you're ready. Committing this file does NOT execute
--    it — migrations in this repo are applied by hand (see RESUME_HERE.md
--    "Supabase prod schema drift").
--
-- WHY THIS IS SAFE TO REMOVE (investigation 2026-05-29):
--   • `user_profiles` appears NOWHERE in application code (`src/`) — verified by
--     grep. The app reads/writes the `profiles` table exclusively
--     (`fetchUserProfile` / `toProfileRow` in `src/config/supabase.js`).
--   • It is NOT in the committed schema (`supabase/setup_all_tables.sql`); it
--     only survives in historical design docs (docs/PHASE_1_SUPABASE_MIGRATION.md,
--     docs/plans/). It was an early Phase-1 artifact superseded by `profiles`.
--   • RESUME_HERE notes the live table is vestigial (id / display_name only).
--
-- SELF-GUARDING: this only drops the table IF IT IS EMPTY. If it still holds
-- rows (e.g. stray display_names from very early sign-ins), it refuses and
-- raises a notice so a human can decide — so running it can never silently
-- destroy data. Idempotent: safe to run more than once.

DO $$
DECLARE
  n bigint;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    EXECUTE 'SELECT count(*) FROM public.user_profiles' INTO n;
    IF n = 0 THEN
      EXECUTE 'DROP TABLE public.user_profiles';
      RAISE NOTICE 'Dropped empty vestigial table public.user_profiles.';
    ELSE
      RAISE NOTICE 'user_profiles has % row(s) — NOT dropping. Inspect the rows and confirm they are not needed before removing manually.', n;
    END IF;
  ELSE
    RAISE NOTICE 'user_profiles does not exist — nothing to do.';
  END IF;
END $$;
