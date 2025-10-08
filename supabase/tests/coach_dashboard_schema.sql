-- Coach Dashboard Schema Verification
-- -----------------------------------
-- These queries help confirm that the critical tables used by the coach dashboard
-- (notes, goals, feedback, and profiles) exist with the expected columns and
-- security settings. Run this script against your Supabase/Postgres instance to
-- quickly validate that migrations were applied correctly.

-- 1. Ensure the required tables are present
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('coach_notes', 'client_goals', 'session_feedback', 'session_ratings', 'coach_profiles')
ORDER BY table_name;

-- 2. Inspect key columns for each table
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('coach_notes', 'client_goals', 'session_feedback', 'session_ratings', 'coach_profiles')
ORDER BY table_name, ordinal_position;

-- 3. Confirm row-level security is enabled on every table the dashboard reads
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname IN ('coach_notes', 'client_goals', 'session_feedback', 'session_ratings', 'coach_profiles')
ORDER BY relname;

-- 4. Verify the updated_at triggers exist so analytics always receive fresh data
SELECT
  t.tgname AS trigger_name,
  c.relname AS table_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE t.tgenabled = 'O'
  AND c.relname IN ('coach_notes', 'client_goals', 'session_feedback', 'session_ratings', 'coach_profiles')
ORDER BY c.relname, t.tgname;

-- 5. Double-check that goal progress metrics have sane bounds
SELECT
  MIN(progress_percentage) AS min_progress,
  MAX(progress_percentage) AS max_progress
FROM client_goals;
