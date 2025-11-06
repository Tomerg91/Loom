# Coach Dashboard Testing Guide

This guide helps you test and debug the coach dashboard functionality.

## Quick Start

### 1. Check Your Setup

Make sure you have a coach user created. You can verify this by:

```bash
# Check browser console for auth state logs
# Look for: [DashboardContent] Auth State: { userRole: 'coach' }
```

### 2. View Console Logs

Open browser DevTools (F12) and check the Console tab for diagnostic logs:

```
[DashboardContent] Auth State: { ... }
[/api/coach/stats] Auth check: { ... }
[/api/coach/clients] Auth check: { ... }
[/api/coach/activity] Auth check: { ... }
```

### 3. Check Network Tab

Open Network tab in DevTools and look for these requests:
- `/api/coach/stats` - Should return 200 with stats data
- `/api/coach/clients` - Should return 200 with clients array
- `/api/coach/activity` - Should return 200 with activities array

## Common Issues & Solutions

### Issue: Dashboard is Empty

**Symptoms:**
- Dashboard loads but shows no data
- All widgets display "No data" messages

**Check:**
1. **Browser Console** - Look for auth logs:
   ```
   [DashboardContent] Auth State: { userRole: 'coach' }
   ```
   - If `userRole` is NOT 'coach', you don't have coach permissions

2. **Network Tab** - Check API responses:
   - `/api/coach/stats` returning 403 → User is not a coach
   - `/api/coach/stats` returning empty data → No sessions in database

3. **Database** - Verify user role:
   ```sql
   SELECT id, email, role FROM users WHERE email = 'your@email.com';
   ```

**Solutions:**

**A. User is not a coach:**
```sql
-- Update user role to coach
UPDATE users SET role = 'coach' WHERE email = 'your@email.com';
```

**B. No session data:**
```bash
# Run the seed script to create test data
./scripts/seed-dev-data.sh

# Or manually run:
psql "$DATABASE_URL" -f supabase/seed.sql
```

### Issue: 401 Unauthorized Errors

**Symptoms:**
- Network tab shows 401 errors
- Console shows: `[/api/coach/stats] No session or user found`

**Solutions:**

1. **Sign out and sign in again:**
   - Click profile → Sign Out
   - Sign back in with your coach account

2. **Clear browser storage:**
   ```javascript
   // Run in browser console
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

3. **Check cookies:**
   - DevTools → Application → Cookies
   - Verify Supabase cookies are present

### Issue: 403 Forbidden Errors

**Symptoms:**
- Network tab shows 403 errors
- Console shows: `Coach access required. Current role: client`

**Solutions:**

Update user role in database:
```sql
UPDATE users SET role = 'coach' WHERE id = 'your-user-id';
```

Then refresh the page and sign in again.

### Issue: Empty Stats (All Zeros)

**Symptoms:**
- API returns 200 OK
- But all stats show 0 (totalSessions, completedSessions, etc.)

**Solution:**

You need session data. Run the seed script:
```bash
./scripts/seed-dev-data.sh
```

Or create sessions manually through the app.

## Testing with Seed Data

### Step 1: Create Test Users in Supabase Auth

Go to: https://supabase.com/dashboard → Your Project → Authentication → Users

Create these users:
- coach@example.com (password: test1234)
- client1@example.com (password: test1234)
- client2@example.com (password: test1234)

### Step 2: Run Seed Script

```bash
./scripts/seed-dev-data.sh
```

### Step 3: Update User IDs

The seed script uses placeholder UUIDs. You need to replace them with actual user IDs:

1. Get user IDs from Supabase Auth dashboard
2. Edit `supabase/seed.sql`
3. Replace `00000000-0000-0000-0000-000000000001` with actual coach ID
4. Replace client UUIDs with actual client IDs
5. Re-run the seed script

### Step 4: Sign In as Coach

1. Go to http://localhost:3001/en/auth/signin
2. Sign in with coach@example.com
3. You should be redirected to dashboard
4. Dashboard should show:
   - 6 total sessions
   - 3 completed sessions
   - 3 upcoming sessions
   - 3 unique clients

## Debugging Checklist

- [ ] User is authenticated (check browser console)
- [ ] User has role='coach' (check database)
- [ ] API endpoints return 200 (check Network tab)
- [ ] Sessions exist in database (check database or run seed script)
- [ ] No console errors (check browser console)
- [ ] RLS policies allow coach to query sessions (check Supabase dashboard)

## Database Queries for Debugging

### Check user role:
```sql
SELECT id, email, role, first_name, last_name
FROM users
WHERE email = 'your@email.com';
```

### Check sessions for coach:
```sql
SELECT s.id, s.title, s.status, s.scheduled_at,
       c.first_name || ' ' || c.last_name as client_name
FROM sessions s
JOIN users c ON c.id = s.client_id
WHERE s.coach_id = 'your-coach-id'
ORDER BY s.scheduled_at DESC;
```

### Check client count:
```sql
SELECT COUNT(DISTINCT client_id) as unique_clients
FROM sessions
WHERE coach_id = 'your-coach-id';
```

### Check stats:
```sql
SELECT
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'scheduled') as upcoming
FROM sessions
WHERE coach_id = 'your-coach-id';
```

## Manual Testing Steps

1. **Sign in as coach**
   - Navigate to /en/auth/signin
   - Enter coach credentials
   - Verify redirect to /en/dashboard

2. **Check dashboard header**
   - Should show "Welcome, [FirstName]"
   - Should show role badge: "Coach"

3. **Check Today's Agenda widget**
   - Should show upcoming sessions for today
   - If none, should show "No sessions scheduled for today"

4. **Check Client Snapshot widget**
   - Should show stats: Active Clients, Total Clients, etc.
   - Should list next 3 upcoming sessions

5. **Check Activity Feed widget**
   - Should show recent completed sessions
   - Should show recently scheduled sessions
   - Should show recent notes (if any)

6. **Check Quick Actions widget**
   - Should have buttons:
     - Add Client
     - View Calendar
     - Manage Availability

## Expected Console Logs (Success Case)

```
[DashboardContent] Auth State: {
  hasUser: true,
  userId: "abc-123-...",
  userRole: "coach",
  userEmail: "coach@example.com",
  isAuthLoading: false
}

[/api/coach/stats] Auth check: {
  hasSession: true,
  hasUser: true,
  userId: "abc-123-...",
  userRole: "coach"
}

[/api/coach/stats] Fetching stats for coach: abc-123-...

[/api/coach/stats] Sessions query result: {
  count: 6,
  hasError: false
}

[/api/coach/stats] Returning stats: {
  totalSessions: 6,
  completedSessions: 3,
  upcomingSessions: 3,
  totalClients: 3,
  activeClients: 3,
  ...
}
```

## Need Help?

1. Check browser console for error messages
2. Check Network tab for failed API calls
3. Check database for user role and session data
4. Review the logs above to identify the issue
5. Try the solutions in the "Common Issues" section

## Production Deployment

**IMPORTANT:** Before deploying to production:

1. Remove or comment out all `console.log` statements
2. Remove the seed.sql script or ensure it's not accessible
3. Set up proper user onboarding flow
4. Add proper error boundaries and user-friendly error messages
5. Remove test credentials from documentation
