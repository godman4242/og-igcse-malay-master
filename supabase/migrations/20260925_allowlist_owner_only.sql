-- allowed_users becomes owner-only. The "every signed-in user can read" policy
-- would expose each promoted learner's email to all learners; nothing needs it
-- (checkUserRole() no longer reads this table; listAllowedUsers() is owner-only
-- and is covered by "Owner can manage allowlist"). Mirrored in setup_all_tables.sql.
-- Undo: CREATE POLICY "Authenticated can read allowlist" ON allowed_users
--         FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated can read allowlist" ON allowed_users;
