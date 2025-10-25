# Deployment Guide: Tasks Module

## Overview

This guide provides step-by-step instructions for deploying the Tasks Module to staging and production environments.

**Feature Branch:** `feature-tasks-module` (in `.worktrees/feature-tasks-module`)
**Target Branch:** `main`
**Deployment Type:** Full-stack feature (Database + Backend + Frontend)

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All unit tests passing locally
  ```bash
  cd .worktrees/feature-tasks-module
  npm test
  ```

- [ ] All integration tests passing
  ```bash
  npm run test:integration
  ```

- [ ] No TypeScript compilation errors
  ```bash
  npx tsc --noEmit
  ```

- [ ] No ESLint errors
  ```bash
  npm run lint
  ```

- [ ] No console errors in browser during manual testing
  - Open browser DevTools
  - Navigate through Tasks UI
  - Verify no errors in Console tab

### Documentation

- [ ] MIGRATION_GUIDE.md reviewed and approved
- [ ] TYPE_SAFETY_CHECKLIST.md completed
- [ ] MANUAL_TESTING_CHECKLIST.md filled out with test results
- [ ] SUCCESS_CRITERIA.md verified
- [ ] README updated with new features (if applicable)

### Database

- [ ] Migration file validated: `supabase/migrations/20251025000000_add_tasks_domain.sql`
- [ ] Migration tested on local Supabase instance
- [ ] RLS policies tested and verified
- [ ] Foreign key constraints verified

### Environment Variables

- [ ] No new environment variables required (Tasks Module uses existing Supabase configuration)
- [ ] Existing variables verified:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

### Feature Branch Status

- [ ] Feature branch is up-to-date with `main`
  ```bash
  cd .worktrees/feature-tasks-module
  git fetch origin
  git merge origin/main
  # Resolve any conflicts
  ```

- [ ] All commits have descriptive messages
- [ ] No debug code or commented-out code blocks
- [ ] No temporary files or test data committed

---

## Staging Deployment

### Step 1: Push Feature Branch

```bash
cd /Users/tomergalansky/Desktop/loom-app/.worktrees/feature-tasks-module

# Ensure all changes committed
git status

# Push feature branch to remote
git push origin feature-tasks-module
```

### Step 2: Apply Database Migration to Staging

**Option A: Via Supabase Dashboard (Recommended)**

1. Log into Supabase Dashboard
2. Select **Staging Project**
3. Navigate to **SQL Editor**
4. Open migration file: `supabase/migrations/20251025000000_add_tasks_domain.sql`
5. Copy entire contents
6. Paste into SQL Editor
7. Click **Run**
8. Verify success message

**Option B: Via Supabase CLI**

```bash
cd /Users/tomergalansky/Desktop/loom-app/.worktrees/feature-tasks-module

# Link to staging project
supabase link --project-ref <staging-project-ref>

# Apply migrations
supabase db push

# Verify migration applied
supabase db diff
# Should show no differences
```

### Step 3: Verify Database Migration

Run verification queries in Supabase SQL Editor:

```sql
-- 1. Verify tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('task_categories', 'tasks', 'task_instances', 'task_progress_updates');
-- Expected: 4 rows

-- 2. Verify indexes exist
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_task%';
-- Expected: 5 rows

-- 3. Verify RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('task_categories', 'tasks', 'task_instances', 'task_progress_updates');
-- Expected: 4 rows, all with rowsecurity = true

-- 4. Verify foreign keys
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('task_categories', 'tasks', 'task_instances', 'task_progress_updates');
-- Expected: 5 foreign key relationships
```

### Step 4: Deploy Application to Staging

**If using Vercel:**

```bash
# Vercel will auto-deploy when branch is pushed
# Or trigger manually:
vercel --prod --scope=<your-team>
```

**If using other platform:**

Follow your platform's deployment procedure for the staging environment.

### Step 5: Run Smoke Tests on Staging

1. **Health Check**
   ```bash
   curl https://staging.loom-app.com/api/health
   # Expected: 200 OK
   ```

2. **API Endpoints**
   - Test GET /api/tasks (as coach)
   - Test POST /api/tasks (create task)
   - Test GET /api/client/tasks (as client)

3. **UI Verification**
   - Navigate to https://staging.loom-app.com/coach/tasks
   - Verify page loads without errors
   - Navigate to https://staging.loom-app.com/client/tasks
   - Verify page loads without errors

4. **Quick Functional Test**
   - Login as coach
   - Create a task
   - Assign to a client
   - Login as client
   - Verify task appears
   - Add progress update
   - Login as coach
   - Verify progress visible

### Step 6: Monitor Staging

Monitor for 24-48 hours:

- [ ] Check Sentry for errors
- [ ] Check Supabase logs for RLS violations
- [ ] Monitor API response times
- [ ] Gather feedback from internal testers

### Step 7: Complete Manual Testing Checklist

- [ ] Assign QA team to complete `MANUAL_TESTING_CHECKLIST.md`
- [ ] Document all bugs found
- [ ] Fix critical issues
- [ ] Re-deploy fixes to staging
- [ ] Re-test

---

## Production Deployment

**IMPORTANT:** Do not proceed to production until:
- [ ] All staging smoke tests passed
- [ ] Manual testing checklist completed and approved
- [ ] All critical bugs resolved
- [ ] Product team sign-off received

### Step 1: Create Pull Request

```bash
cd /Users/tomergalansky/Desktop/loom-app/.worktrees/feature-tasks-module

# Ensure branch is up-to-date
git fetch origin
git merge origin/main
# Resolve conflicts if any

# Push latest changes
git push origin feature-tasks-module
```

1. Go to GitHub repository
2. Click "New Pull Request"
3. Base: `main`, Compare: `feature-tasks-module`
4. Fill in PR template:
   - **Title:** "feat: Add Tasks Module for coach-client action item management"
   - **Description:**
     ```markdown
     ## Summary
     Implements complete Tasks Module allowing coaches to assign action items to clients and track progress.

     ## Changes
     - Database: 4 new tables with RLS policies
     - Backend: 15+ API endpoints for task CRUD and progress tracking
     - Frontend: Coach and client UIs for task management
     - State: TanStack Query integration
     - i18n: Full translation support
     - Tests: Unit and integration tests

     ## Testing
     - [x] All tests passing
     - [x] Manual testing completed
     - [x] Type safety verified
     - [x] Staging deployment successful

     ## Documentation
     - MIGRATION_GUIDE.md
     - TYPE_SAFETY_CHECKLIST.md
     - MANUAL_TESTING_CHECKLIST.md
     - DEPLOYMENT_GUIDE.md
     - SUCCESS_CRITERIA.md

     ## Breaking Changes
     None

     ## Migration Required
     Yes - see MIGRATION_GUIDE.md
     ```

5. Add reviewers (at least 2)
6. Add labels: `feature`, `database-migration`, `ready-for-review`

### Step 2: Code Review

- [ ] At least 2 approvals required
- [ ] All review comments addressed
- [ ] CI/CD checks passing:
  - [ ] TypeScript compilation
  - [ ] ESLint
  - [ ] Unit tests
  - [ ] Integration tests
  - [ ] Build succeeds

### Step 3: Schedule Production Deployment

**Recommended Deployment Window:**
- **Day:** Tuesday, Wednesday, or Thursday (avoid Fridays)
- **Time:** During low-traffic hours (e.g., 2-4 AM PST)
- **Avoid:** Weekends, holidays, or high-traffic periods

**Communication:**
1. Notify team in Slack #engineering channel:
   ```
   📢 Deployment Notice
   Feature: Tasks Module
   Scheduled: [Date] at [Time] PST
   Downtime: None expected
   Migration: Database schema changes (additive only, no data loss)
   Rollback plan: Available
   ```

2. Notify stakeholders:
   - Product team
   - Customer support team
   - QA team

### Step 4: Merge to Main

```bash
# Via GitHub UI
# Click "Merge Pull Request" → "Confirm Merge"

# Or via command line (after PR approved):
cd /Users/tomergalansky/Desktop/loom-app
git checkout main
git pull origin main
git merge feature-tasks-module
git push origin main
```

### Step 5: Apply Database Migration to Production

**CRITICAL: Backup Database First**

```bash
# Via Supabase Dashboard:
# 1. Go to Database → Backups
# 2. Click "Create Backup"
# 3. Wait for backup to complete
# 4. Verify backup exists before proceeding
```

**Apply Migration:**

```sql
-- Run in Supabase SQL Editor for PRODUCTION project

-- MIGRATION: 20251025000000_add_tasks_domain.sql
-- Copy and paste entire migration file here
-- Execute

-- VERIFY:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('task_categories', 'tasks', 'task_instances', 'task_progress_updates');
-- Expected: 4 rows
```

### Step 6: Deploy Application to Production

**If using Vercel:**

```bash
# Production deployment auto-triggers on main branch push
# Or trigger manually:
vercel --prod
```

**Monitor Deployment:**
1. Watch build logs
2. Verify build completes successfully
3. Verify deployment succeeds

### Step 7: Post-Deployment Verification

**Immediate Checks (within 5 minutes):**

1. **Health Check**
   ```bash
   curl https://loom-app.com/api/health
   # Expected: 200 OK
   ```

2. **Database Connection**
   ```bash
   curl https://loom-app.com/api/tasks
   # Expected: 401 Unauthorized (good - auth required)
   # Or 200 with empty data if authenticated
   ```

3. **Page Loads**
   - Navigate to https://loom-app.com/coach/tasks
   - Expected: Login prompt or tasks page (if logged in)
   - No 500 errors

4. **Sentry Check**
   - Open Sentry dashboard
   - Expected: No new errors
   - Filter by last 5 minutes

5. **Supabase Logs**
   - Check for RLS violations
   - Check for query errors
   - Expected: Normal traffic, no errors

**Full Verification (within 1 hour):**

1. **Functional Test**
   - Login as test coach account
   - Create a task
   - Assign to test client
   - Login as test client
   - Verify task visible
   - Add progress update
   - Verify no errors

2. **Performance Check**
   - Verify page load times < 2 seconds
   - Verify API response times < 500ms
   - Check database query performance

3. **Monitor Metrics**
   - Error rate (should be ~0%)
   - Response times (should be normal)
   - Database connections (should be stable)

### Step 8: Monitor Production (First 24 Hours)

**Hour 1:**
- [ ] Check Sentry every 15 minutes
- [ ] Monitor user activity logs
- [ ] Watch for error spikes

**Hour 2-4:**
- [ ] Check Sentry hourly
- [ ] Monitor database performance
- [ ] Review user feedback

**Hour 4-24:**
- [ ] Check Sentry every 4 hours
- [ ] Monitor key metrics
- [ ] Gather user feedback

**Monitoring Checklist:**
- [ ] No increase in error rate
- [ ] No performance degradation
- [ ] No RLS policy violations
- [ ] No user complaints
- [ ] Database queries performing well

### Step 9: Rollback Procedure (If Needed)

**When to Rollback:**
- Critical bugs affecting all users
- Data integrity issues
- Security vulnerabilities discovered
- Unacceptable performance degradation

**Rollback Steps:**

1. **Revert Code Deployment**
   ```bash
   # Via Vercel:
   # Go to Deployments → Find previous stable deployment → Click "Promote to Production"

   # Or via git:
   git revert <commit-hash>
   git push origin main
   ```

2. **Rollback Database (Only if absolutely necessary)**
   ```sql
   -- CAUTION: This will delete all task data
   DROP TABLE IF EXISTS task_progress_updates CASCADE;
   DROP TABLE IF EXISTS task_instances CASCADE;
   DROP TABLE IF EXISTS tasks CASCADE;
   DROP TABLE IF EXISTS task_categories CASCADE;
   ```

   **Better Alternative:** Fix forward instead of rolling back database

3. **Restore from Backup (If data corruption occurred)**
   - Go to Supabase Dashboard → Backups
   - Select pre-deployment backup
   - Click "Restore"
   - Verify data integrity

4. **Notify Team**
   ```
   🚨 Rollback Executed
   Feature: Tasks Module
   Reason: [describe issue]
   Status: Rolled back to previous version
   Next steps: [plan for fix]
   ```

---

## Post-Deployment Activities

### Immediate (Day 1)

- [ ] Send deployment success notification
  ```
  ✅ Deployment Successful
  Feature: Tasks Module
  Deployed: [timestamp]
  Status: All systems operational
  Monitoring: Ongoing for 24 hours
  ```

- [ ] Update documentation (if any public docs)
- [ ] Notify customer support team of new feature
- [ ] Prepare support materials (FAQ, how-to guides)

### Short-term (Week 1)

- [ ] Monitor user adoption metrics
- [ ] Gather user feedback
- [ ] Address any minor bugs reported
- [ ] Optimize queries based on real usage patterns

### Long-term (Month 1)

- [ ] Review feature analytics
- [ ] Plan improvements based on feedback
- [ ] Consider additional features
- [ ] Document lessons learned

---

## Deployment Checklist Summary

### Pre-Deployment
- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] Feature branch up-to-date with main
- [ ] Documentation complete
- [ ] Staging deployment successful
- [ ] Manual testing completed and approved

### Staging
- [ ] Database migration applied
- [ ] Application deployed
- [ ] Smoke tests passed
- [ ] Manual testing completed
- [ ] 24-hour monitoring period completed
- [ ] Product sign-off received

### Production
- [ ] Pull request created and approved
- [ ] Deployment window scheduled and communicated
- [ ] Database backed up
- [ ] Database migration applied
- [ ] Application deployed
- [ ] Post-deployment verification completed
- [ ] Monitoring active
- [ ] Team notified of success

---

## Contacts

**Deployment Lead:** [Your Name]
**On-Call Engineer:** [Name]
**Product Owner:** [Name]
**QA Lead:** [Name]

**Emergency Contacts:**
- Slack: #engineering-alerts
- PagerDuty: [Link]
- Incident Response: [Runbook link]

---

## Additional Resources

- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Database migration details
- [MANUAL_TESTING_CHECKLIST.md](./MANUAL_TESTING_CHECKLIST.md) - Testing procedures
- [SUCCESS_CRITERIA.md](./SUCCESS_CRITERIA.md) - Success verification
- [TYPE_SAFETY_CHECKLIST.md](./TYPE_SAFETY_CHECKLIST.md) - Type safety verification

---

## Deployment History

| Date | Environment | Version | Status | Notes |
|------|-------------|---------|--------|-------|
| [Date] | Staging | v1.0.0 | ✅ Success | Initial deployment |
| [Date] | Production | v1.0.0 | Pending | Scheduled for [datetime] |

---

**Last Updated:** October 25, 2025
**Document Version:** 1.0
**Maintained By:** Engineering Team
