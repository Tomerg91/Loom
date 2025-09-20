-- Ensure 'welcome_message' enum value exists before using it in later migrations
-- This avoids the "unsafe use of new value" error when inserting rows that reference it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'notification_type'
      AND e.enumlabel = 'welcome_message'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'welcome_message';
  END IF;
END
$$;

