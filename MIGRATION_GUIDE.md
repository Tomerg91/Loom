# Database Migration Guide: Tasks Module

## Overview

This migration adds the complete database schema for the Tasks Module, enabling coaches to assign action items to clients and track their progress.

**Migration File:** `supabase/migrations/20251025000000_add_tasks_domain.sql`

**Created:** October 25, 2025

## What This Migration Creates

### Tables

#### 1. `task_categories`
Stores categorization options for tasks, allowing coaches to organize tasks by type.

**Columns:**
- `id` (UUID) - Primary key
- `coach_id` (UUID) - References auth.users(id), CASCADE delete
- `name` (TEXT) - Category name
- `color` (TEXT) - Hex color code, default '#3b82f6'
- `created_at` (TIMESTAMPTZ) - Auto-set timestamp
- `updated_at` (TIMESTAMPTZ) - Auto-updated timestamp

**Constraints:**
- Unique constraint on (coach_id, name) - prevents duplicate category names per coach

#### 2. `tasks`
Main table storing task templates and metadata.

**Columns:**
- `id` (UUID) - Primary key
- `coach_id` (UUID) - References auth.users(id), CASCADE delete
- `title` (TEXT) - Task title (required)
- `description` (TEXT) - Optional task description
- `category_id` (UUID) - References task_categories(id), SET NULL on delete
- `is_template` (BOOLEAN) - Whether task is a reusable template, default false
- `created_at` (TIMESTAMPTZ) - Auto-set timestamp
- `updated_at` (TIMESTAMPTZ) - Auto-updated timestamp

#### 3. `task_instances`
Individual assignments of tasks to clients with due dates and status tracking.

**Columns:**
- `id` (UUID) - Primary key
- `task_id` (UUID) - References tasks(id), CASCADE delete
- `client_id` (UUID) - References auth.users(id), CASCADE delete
- `assigned_at` (TIMESTAMPTZ) - When task was assigned
- `due_date` (DATE) - When task is due
- `status` (TEXT) - One of: 'pending', 'in_progress', 'completed'
- `completed_at` (TIMESTAMPTZ) - When task was marked complete
- `created_at` (TIMESTAMPTZ) - Auto-set timestamp
- `updated_at` (TIMESTAMPTZ) - Auto-updated timestamp

**Constraints:**
- Unique constraint on (task_id, client_id) - prevents duplicate assignments
- CHECK constraint on status - must be one of the three valid values

#### 4. `task_progress_updates`
Client progress updates and notes on assigned tasks.

**Columns:**
- `id` (UUID) - Primary key
- `instance_id` (UUID) - References task_instances(id), CASCADE delete
- `progress_percentage` (INTEGER) - 0-100, with CHECK constraint
- `notes` (TEXT) - Optional progress notes
- `attachments` (JSONB) - Array of attachment metadata, default []
- `created_at` (TIMESTAMPTZ) - Auto-set timestamp

**Constraints:**
- CHECK constraint on progress_percentage - must be between 0 and 100

### Indexes

Performance indexes created for common query patterns:

1. `idx_tasks_coach_id` - Speeds up coach task lookups
2. `idx_task_categories_coach_id` - Speeds up coach category queries
3. `idx_task_instances_client_id` - Speeds up client task lookups
4. `idx_task_instances_task_id` - Speeds up task instance queries
5. `idx_task_progress_updates_instance_id` - Speeds up progress lookups

### Row Level Security (RLS) Policies

All tables have RLS enabled with comprehensive policies:

#### task_categories
- **SELECT:** Coaches can view their own categories
- **INSERT:** Coaches can create categories
- **UPDATE:** Coaches can update their own categories
- **DELETE:** Coaches can delete their own categories

#### tasks
- **SELECT:** Coaches can view their own tasks
- **INSERT:** Coaches can create tasks
- **UPDATE:** Coaches can update their own tasks
- **DELETE:** Coaches can delete their own tasks

#### task_instances
- **SELECT:** Coaches can view instances of their tasks; Clients can view their own assignments
- **INSERT:** Coaches can assign task instances (verified via task ownership)
- **UPDATE:** Coaches can update instances of their tasks
- **DELETE:** Coaches can delete instances of their tasks

#### task_progress_updates
- **SELECT:** Coaches can view progress on their tasks; Clients can view their own progress
- **INSERT:** Clients can add progress updates to their assigned tasks
- **UPDATE:** Clients can update their own progress updates
- **DELETE:** Clients can delete their own progress updates

## Prerequisites

### Before Applying This Migration

- [ ] Supabase project is accessible and running
- [ ] You have admin/service_role access to the database
- [ ] You have backed up the database (recommended)
- [ ] All previous migrations are applied successfully
- [ ] The `auth.users` table exists (required for foreign keys)

### No Dependencies

This migration is self-contained and does not depend on any custom tables beyond the default Supabase `auth.users` table.

## Deployment Steps

### Staging Environment

1. **Navigate to Supabase Dashboard**
   - Open your staging project
   - Go to SQL Editor

2. **Apply Migration**
   - Copy the entire contents of `supabase/migrations/20251025000000_add_tasks_domain.sql`
   - Paste into SQL Editor
   - Click "Run"

3. **Verify Tables Created**
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('task_categories', 'tasks', 'task_instances', 'task_progress_updates');
   ```

   Expected result: 4 rows

4. **Verify Indexes Created**
   ```sql
   SELECT indexname
   FROM pg_indexes
   WHERE schemaname = 'public'
   AND tablename IN ('task_categories', 'tasks', 'task_instances', 'task_progress_updates');
   ```

   Expected result: At least 5 custom indexes (plus default primary key indexes)

5. **Verify RLS Enabled**
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename IN ('task_categories', 'tasks', 'task_instances', 'task_progress_updates');
   ```

   Expected result: All 4 tables with rowsecurity = true

6. **Test RLS Policies**
   - Create a test coach user
   - Create a test client user
   - Create a test task as coach
   - Verify coach can see task
   - Verify client cannot see unassigned task
   - Assign task to client
   - Verify client can now see task
   - Add progress update as client
   - Verify coach can see progress update

### Production Environment

Follow the same steps as staging, but:

1. **Schedule During Low-Traffic Window**
   - This migration creates new tables and won't affect existing data
   - However, apply during maintenance window if possible

2. **Monitor After Deployment**
   - Check for any RLS policy violations in logs
   - Verify API endpoints respond correctly
   - Monitor database performance metrics

3. **Communication**
   - Notify users of new feature availability after deployment
   - Update documentation with new capabilities

## Rollback Procedure

If you need to rollback this migration:

```sql
-- Drop all tables (CASCADE will remove dependent objects)
DROP TABLE IF EXISTS task_progress_updates CASCADE;
DROP TABLE IF EXISTS task_instances CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS task_categories CASCADE;

-- Note: This will permanently delete all task data
-- Ensure you have a backup before running this
```

**IMPORTANT:** Rollback will result in data loss. Only perform if:
- Migration failed midway
- Critical security issue discovered
- Database backup is available to restore from

## Post-Migration Verification

### Functional Tests

1. **Coach Workflow**
   - Create a task category
   - Create a task
   - Assign task to a client
   - View client's progress

2. **Client Workflow**
   - View assigned tasks
   - Add progress update
   - Mark task complete

3. **Edge Cases**
   - Delete category with tasks (should SET NULL on tasks.category_id)
   - Delete task with instances (should CASCADE delete instances)
   - Delete client with tasks (should CASCADE delete their task instances)
   - Delete coach (should CASCADE delete all their tasks)

### Security Tests

1. **RLS Enforcement**
   - Client cannot view another client's tasks
   - Client cannot modify coach's task metadata
   - Coach cannot view tasks from another coach
   - Non-authenticated users cannot access any task data

2. **Foreign Key Integrity**
   - Cannot create task with invalid coach_id
   - Cannot create instance with invalid task_id or client_id
   - Cannot create progress update with invalid instance_id

## Migration Summary

**Tables Added:** 4
**Indexes Added:** 5
**RLS Policies Added:** 16 (4 per table: SELECT, INSERT, UPDATE, DELETE)
**Foreign Keys Added:** 5
**Check Constraints Added:** 2

**Estimated Migration Time:** < 1 second (empty database)

**Database Size Impact:** Minimal (schema only, no initial data)

## Support

If you encounter issues during migration:

1. Check Supabase logs for error details
2. Verify all prerequisites are met
3. Ensure no naming conflicts with existing tables
4. Contact development team with error messages

## Next Steps After Migration

1. Deploy API endpoints for tasks module
2. Deploy frontend UI components
3. Run integration tests
4. Enable feature for beta users
5. Monitor for errors and performance issues
6. Gather user feedback
7. Full production rollout
