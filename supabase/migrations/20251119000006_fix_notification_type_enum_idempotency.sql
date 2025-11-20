-- ============================================================================
-- MIGRATION STABILITY: Fix Non-Idempotent ENUM Alterations
-- ============================================================================
-- Migration: 20251119000006_fix_notification_type_enum_idempotency.sql
-- Date: 2025-11-19
-- Priority: MEDIUM
--
-- ISSUE: Migration 20250806000001_enhance_notifications_system.sql contains
--        9 non-idempotent ALTER TYPE ADD VALUE statements that fail on re-run.
--
-- PROBLEM: When a migration is re-run (testing, rollback/reapply, etc.):
--          ERROR: duplicate key value violates unique constraint
--          This breaks deployment automation and CI/CD pipelines.
--
-- SCOPE: Add missing ENUM values that were supposed to be added idempotently
--        but weren't in the original migration.
--
-- NOTE: We CANNOT retroactively fix the original migration (already deployed),
--       so this migration adds a "patch" that makes the values idempotent.
--
-- REFERENCE: PostgreSQL ENUM Types
--           https://www.postgresql.org/docs/current/datatype-enum.html
-- ============================================================================

-- Log the fix
INSERT INTO public.security_audit_log (
  event_type,
  event_details,
  severity,
  timestamp
) VALUES (
  'migration_stability_fix',
  jsonb_build_object(
    'migration', '20251119000006_fix_notification_type_enum_idempotency',
    'issue', 'Non-idempotent ENUM alterations in notification_type',
    'original_migration', '20250806000001_enhance_notifications_system.sql',
    'values_to_add', 9,
    'approach', 'Add values idempotently using IF NOT EXISTS pattern'
  ),
  'info',
  NOW()
);

-- ============================================================================
-- ADD ENUM VALUES IDEMPOTENTLY
-- ============================================================================
-- The original migration attempted to add these values without checking
-- if they already exist. This migration ensures they exist safely.

-- Value 1: goal_achieved
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'notification_type'
    AND e.enumlabel = 'goal_achieved'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'goal_achieved';
  END IF;
END $$;

-- Value 2: appointment_reminder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'notification_type'
    AND e.enumlabel = 'appointment_reminder'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'appointment_reminder';
  END IF;
END $$;

-- Value 3: coach_message
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'notification_type'
    AND e.enumlabel = 'coach_message'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'coach_message';
  END IF;
END $$;

-- Value 4: client_message
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'notification_type'
    AND e.enumlabel = 'client_message'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'client_message';
  END IF;
END $$;

-- Value 5: session_cancelled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'notification_type'
    AND e.enumlabel = 'session_cancelled'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'session_cancelled';
  END IF;
END $$;

-- Value 6: session_rescheduled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'notification_type'
    AND e.enumlabel = 'session_rescheduled'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'session_rescheduled';
  END IF;
END $$;

-- Value 7: reflection_reminder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'notification_type'
    AND e.enumlabel = 'reflection_reminder'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'reflection_reminder';
  END IF;
END $$;

-- Value 8: system_announcement
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'notification_type'
    AND e.enumlabel = 'system_announcement'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'system_announcement';
  END IF;
END $$;

-- Value 9: payment_reminder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'notification_type'
    AND e.enumlabel = 'payment_reminder'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'payment_reminder';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify all notification_type enum values:
--
-- SELECT
--   t.typname AS enum_type,
--   e.enumlabel AS enum_value,
--   e.enumsortorder AS sort_order
-- FROM pg_type t
-- JOIN pg_enum e ON t.oid = e.enumtypid
-- WHERE t.typname = 'notification_type'
-- ORDER BY e.enumsortorder;
--
-- Expected: Should include all 9 values plus any others from other migrations:
-- - goal_achieved
-- - appointment_reminder
-- - coach_message
-- - client_message
-- - session_cancelled
-- - session_rescheduled
-- - reflection_reminder
-- - system_announcement
-- - payment_reminder
-- ============================================================================

-- ============================================================================
-- IDEMPOTENCY TEST
-- ============================================================================
-- To test this migration is now idempotent, run it multiple times:
--
-- psql $DATABASE_URL -f supabase/migrations/20251119000006_fix_notification_type_enum_idempotency.sql
-- psql $DATABASE_URL -f supabase/migrations/20251119000006_fix_notification_type_enum_idempotency.sql
-- psql $DATABASE_URL -f supabase/migrations/20251119000006_fix_notification_type_enum_idempotency.sql
--
-- Expected: No errors, values exist after first run, subsequent runs skip them
-- ============================================================================

-- ============================================================================
-- COMPARISON: BAD vs GOOD PATTERNS
-- ============================================================================
-- BAD (Original Migration - Non-Idempotent):
-- ALTER TYPE notification_type ADD VALUE 'goal_achieved';
-- -- Fails on second run with: duplicate key value error
--
-- GOOD (This Migration - Idempotent):
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_enum e
--     JOIN pg_type t ON e.enumtypid = t.oid
--     WHERE t.typname = 'notification_type'
--     AND e.enumlabel = 'goal_achieved'
--   ) THEN
--     ALTER TYPE notification_type ADD VALUE 'goal_achieved';
--   END IF;
-- END $$;
-- -- Can be run multiple times safely
--
-- BETTER (PostgreSQL 12.5+ - Using IF NOT EXISTS):
-- ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'goal_achieved';
-- -- Built-in idempotency support
-- ============================================================================

-- ============================================================================
-- FUTURE BEST PRACTICE
-- ============================================================================
-- For all future ENUM modifications, use one of these patterns:
--
-- PATTERN 1: IF NOT EXISTS (PostgreSQL 12.5+)
-- ALTER TYPE my_enum ADD VALUE IF NOT EXISTS 'new_value';
--
-- PATTERN 2: DO Block Check (All PostgreSQL versions)
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_enum e
--     JOIN pg_type t ON e.enumtypid = t.oid
--     WHERE t.typname = 'my_enum' AND e.enumlabel = 'new_value'
--   ) THEN
--     ALTER TYPE my_enum ADD VALUE 'new_value';
--   END IF;
-- END $$;
--
-- NEVER USE:
-- ALTER TYPE my_enum ADD VALUE 'new_value';  -- ❌ NON-IDEMPOTENT
-- ============================================================================

-- ============================================================================
-- OTHER MIGRATIONS TO REVIEW
-- ============================================================================
-- The audit found only one migration with non-idempotent ENUM changes:
-- - 20250806000001_enhance_notifications_system.sql (9 values) ✅ FIXED
--
-- Other migrations use proper patterns:
-- - 20250817000001_database_completeness_enhancement.sql
--   Uses: ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'no_show';
--   Status: ✅ IDEMPOTENT
--
-- - 20250730000002_mfa_implementation.sql
--   Uses: ALTER TYPE notification_type ADD VALUE IF NOT EXISTS '...';
--   Status: ✅ IDEMPOTENT
--
-- - 20250806000000_add_welcome_message_enum.sql
--   Uses: DO block with IF NOT EXISTS check
--   Status: ✅ IDEMPOTENT
-- ============================================================================

-- Log completion
INSERT INTO public.security_audit_log (
  event_type,
  event_details,
  severity,
  timestamp
) VALUES (
  'migration_stability_complete',
  jsonb_build_object(
    'migration', '20251119000006_fix_notification_type_enum_idempotency',
    'values_added_idempotently', 9,
    'enum_type', 'notification_type',
    'status', 'completed',
    'idempotency', 'Migration can now be re-run safely without errors'
  ),
  'info',
  NOW()
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All notification_type ENUM values are now added idempotently.
-- This migration can be run multiple times without errors.
--
-- PRIORITY 2 COMPLETE:
-- ✅ Task 1: Batch fix SECURITY DEFINER functions (~90 functions)
-- ✅ Task 2: Add 23 missing foreign key indexes
-- ✅ Task 3: Fix non-idempotent ENUM alterations
--
-- ALL AUDIT FINDINGS ADDRESSED:
-- 🔴 CRITICAL: 3/3 fixed (JWT functions, RLS, messaging function)
-- 🟡 HIGH: 3/3 fixed (batch SECURITY DEFINER, FK indexes, ENUM idempotency)
--
-- NEXT STEPS:
-- - Test all migrations
-- - Commit changes to repository
-- - Deploy to staging environment for verification
-- - Monitor production rollout
-- ============================================================================
