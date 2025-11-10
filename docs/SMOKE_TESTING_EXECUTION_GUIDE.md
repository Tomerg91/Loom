# Issue #147: Smoke Testing Execution Guide

**Status:** Ready to Execute
**Priority:** P0 - Critical
**Estimated Time:** 2-3 hours
**Environment:** Staging

---

## Overview

This guide provides practical instructions for executing 10 critical smoke tests in the staging environment. These manual tests validate core user journeys before production deployment.

**Reference:** See `SMOKE_TESTING_GUIDE_SPRINT7.md` for detailed test specifications.

---

## Prerequisites Checklist

Before starting, verify you have:

- [ ] Access to staging environment (URL)
- [ ] Test user accounts created in staging:
  - Coach: `coach-test@loom-staging.com` / [password]
  - Client: `client-test@loom-staging.com` / [password]
  - Admin: `admin-test@loom-staging.com` / [password]
- [ ] Browser with DevTools open
  - Console tab visible for error monitoring
  - Network tab for response time tracking
  - Application tab for cookie/storage inspection
- [ ] Test data prepared (if needed)
- [ ] Fresh browser session (clear cache if needed)

---

## Test Execution Workflow

### Before Each Test

1. **Open DevTools:**
   - F12 or Cmd+Option+I
   - Console tab → Check "Preserve log"
   - Network tab → Check "Disable cache"

2. **Note start time** for performance tracking

3. **Clear previous test data** (cookies/localStorage) between user roles

### After Each Test

1. **Document results** in the test results template (see bottom)
2. **Take screenshot** if issues occur
3. **Check console** for any errors
4. **Record API response times** from Network tab

---

## Journey 1: User Registration & Email Verification

**Time Estimate:** 5-8 minutes

### Steps

1. Navigate to `/auth/signup`
2. Fill registration form:
   - First name: `Test`
   - Last name: `User`
   - Email: `newuser-${timestamp}@test.com` (use unique email each time)
   - Password: `SecurePass123!`
   - User type: `Client`
3. Click "Sign Up"
4. **Expected:** Redirect to email confirmation page

5. Check staging email service for verification email
   - Should arrive within 30 seconds
   - Click verification link

6. **Expected:** Redirect to dashboard / login

### Success Criteria
- ✅ Form submits without errors
- ✅ Email sent within 30 seconds
- ✅ Email contains valid verification link
- ✅ Verification completes without errors
- ✅ No console errors
- ✅ API response time < 2 seconds

### Issues to Watch For
- ❌ "Email already exists" (use unique email)
- ❌ Network errors (check connectivity)
- ❌ RLS policy errors in console

---

## Journey 2: Sign-In with MFA

**Time Estimate:** 5-7 minutes

### Prerequisites
- Test user with MFA enabled
- Authenticator app or backup codes

### Steps

1. Navigate to `/auth/signin`
2. Enter email: `coach-test@loom-staging.com`
3. Enter password
4. Click "Sign In"
5. **Expected:** MFA challenge page displays

6. Enter TOTP code from authenticator app
7. Click "Verify Code"
8. **Expected:** Redirect to dashboard

9. **Verify persistence:**
   - Refresh page (F5)
   - Should still be logged in

### Alternative Path: Backup Code
1. On MFA challenge, click "Use backup code"
2. Enter valid backup code
3. Click "Verify Code"

### Success Criteria
- ✅ Initial login accepted
- ✅ MFA challenge displays
- ✅ TOTP code validation works
- ✅ Dashboard loads after MFA
- ✅ Session persists after refresh
- ✅ No console errors
- ✅ API response time < 2 seconds

---

## Journey 3: Sign-Out & Session Cleanup

**Time Estimate:** 2-3 minutes

### Steps

1. From dashboard, locate user menu (top right)
2. Click avatar/menu icon
3. Click "Sign Out"
4. **Expected:** Redirect to landing page

5. **Verify cleanup:**
   - DevTools → Application tab
   - Cookies: No Supabase auth cookies
   - Local Storage: No sensitive data

6. Try accessing dashboard directly
   - **Expected:** Redirect to sign-in page

### Success Criteria
- ✅ Sign-out completes instantly
- ✅ All auth cookies cleared
- ✅ Local storage cleaned
- ✅ Protected routes inaccessible
- ✅ Redirect to sign-in works
- ✅ No console errors

---

## Journey 4: Password Reset Flow

**Time Estimate:** 8-10 minutes

### Steps

1. Navigate to `/auth/signin`
2. Click "Forgot password?"
3. Enter email address
4. Click "Send Reset Link"
5. **Expected:** Confirmation message

6. Check email for reset link
   - Should arrive within 30 seconds
7. Click reset link
8. Enter new password (twice)
9. Click "Reset Password"
10. **Expected:** Redirect to sign-in

11. **Verify:** Sign in with new password
    - Should succeed
    - Old password should not work

### Success Criteria
- ✅ Reset email sent within 30 seconds
- ✅ Reset link valid and secure
- ✅ Password update successful
- ✅ Can sign in with new password
- ✅ Old password no longer works
- ✅ No console errors
- ✅ API response time < 2 seconds

---

## Journey 5: Coach Onboarding

**Time Estimate:** 8-10 minutes

### Prerequisites
- Fresh coach account (newly registered)

### Steps

1. Sign in as new coach
2. **Onboarding wizard:**
   - Complete professional info
   - Set availability (add 3+ time slots)
   - Configure service offerings
   - Save and complete

3. **Verify:** Dashboard shows
   - Welcome message
   - Profile completion status: 100%
   - Availability visible

### Success Criteria
- ✅ Onboarding wizard displays all steps
- ✅ Form validation works
- ✅ Availability saved correctly
- ✅ Dashboard shows welcome message
- ✅ Profile completion: 100%
- ✅ No console errors
- ✅ API response time < 2 seconds

---

## Journey 6: Client Booking

**Time Estimate:** 8-12 minutes

### Prerequisites
- Client account signed in
- Coach with available time slots

### Steps

1. Navigate to "Book Session" or `/client/book`
2. Select a coach (if multiple available)
3. **Calendar view:**
   - Browse coach availability
   - Verify correct timezone
4. Select available time slot
5. Choose session type/duration
6. Add notes (optional)
7. Click "Confirm Booking"
8. **Expected:** Confirmation message

9. Navigate to "My Sessions"
   - **Expected:** Session appears in list
   - Status should be "scheduled"

### Success Criteria
- ✅ Coach availability displays correctly
- ✅ Time slots in correct timezone
- ✅ Booking confirmation instant
- ✅ Session appears in dashboard
- ✅ Coach receives notification
- ✅ Email confirmation sent
- ✅ No console errors
- ✅ API response time < 2 seconds

---

## Journey 7: Resource Library

**Time Estimate:** 10-15 minutes

### Prerequisites
- Coach account signed in
- Client associated with coach

### Coach Steps

1. Navigate to Resources Library
2. Upload new resource (PDF, video, or link)
3. Create collection (e.g., "Welcome Kit")
4. Add resource to collection
5. Share with:
   - Specific client, OR
   - All clients
6. Click "Share"
7. **Expected:** Share confirmation

### Client Steps

1. Sign in as client
2. Navigate to Resources
3. **Verify:** Shared resource appears
4. Click to view/download
5. Mark as "completed"
6. **Verify:** Progress tracked

### Success Criteria
- **Coach side:**
  - ✅ File upload successful
  - ✅ Collection created
  - ✅ Sharing works
  - ✅ Analytics show client access

- **Client side:**
  - ✅ Shared resources visible
  - ✅ Can access/download
  - ✅ Progress tracking works
  - ✅ Collections display correctly

- **Common:**
  - ✅ No console errors
  - ✅ API response time < 2 seconds
  - ✅ File operations < 5 seconds

---

## Journey 8: Practice Journal

**Time Estimate:** 8-10 minutes

### Prerequisites
- Client and coach accounts

### Client Steps

1. Sign in as client
2. Navigate to Practice Journal
3. Create new entry:
   - Title: "Test Entry"
   - Content: Write some text
   - Mood rating: Select 1-10
   - Insights: Add notes
4. Toggle "Share with coach"
5. Click "Save"
6. **Expected:** Entry appears in list

### Coach Steps

1. Sign in as coach
2. Navigate to client profile
3. View Practice Journal tab
4. **Verify:**
   - Shared entries visible
   - Private entries hidden (RLS enforced)

### Success Criteria
- **Client side:**
  - ✅ Journal entry created
  - ✅ Entry saved successfully
  - ✅ Share toggle works
  - ✅ Entry appears in list

- **Coach side:**
  - ✅ Shared entries visible
  - ✅ Private entries hidden
  - ✅ Can view entry details

- **Security:**
  - ✅ Coach cannot access private entries
  - ✅ No RLS violations

- **Common:**
  - ✅ No console errors
  - ✅ API response time < 1 second

---

## Journey 9: Admin Dashboard

**Time Estimate:** 5-8 minutes

### Prerequisites
- Admin account signed in

### Steps

1. Sign in as admin
2. Navigate to Admin Dashboard
3. **Check system health:**
   - Database status (should be green)
   - Active users count
   - Error rates
4. **View user management:**
   - List all users
   - Filter by role
5. **Check performance metrics:**
   - Dashboard load time
   - Query execution times
6. **Verify all admin tools accessible**

### Success Criteria
- ✅ Admin dashboard loads
- ✅ System health displays (green/healthy)
- ✅ User list displays correctly
- ✅ Can filter and search users
- ✅ Performance metrics accurate
- ✅ No unauthorized access errors
- ✅ No console errors
- ✅ Dashboard queries < 1 second

---

## Journey 10: Role-Based Access Control (RBAC)

**Time Estimate:** 10-12 minutes

### Test Matrix

Run these access tests as each user type:

| Action | Client | Coach | Admin | Expected |
|--------|--------|-------|-------|----------|
| View own dashboard | ✅ | ✅ | ✅ | Allow all |
| View own profile | ✅ | ✅ | ✅ | Allow all |
| Edit own profile | ✅ | ✅ | ✅ | Allow all |
| View other user's private data | ❌ | ❌ | ✅ | Block C/Co, Allow Ad |
| Create session (as coach) | ❌ | ✅ | ✅ | Block client |
| Upload resources | ❌ | ✅ | ✅ | Block client |
| Access admin panel | ❌ | ❌ | ✅ | Block client/coach |
| View all users list | ❌ | ❌ | ✅ | Block client/coach |

### Steps

1. **As Client:**
   - Try accessing `/coach/resources`
   - Try accessing `/admin`
   - **Expected:** 403 or redirect

2. **As Coach:**
   - Access `/coach/dashboard` ✅
   - Try accessing `/admin`
   - **Expected:** 403 or redirect

3. **As Admin:**
   - Access all routes ✅
   - Verify full access

### Success Criteria
- ✅ All access restrictions enforced
- ✅ Appropriate error messages
- ✅ No console errors
- ✅ Clean redirects (no flash of unauthorized content)
- ✅ API endpoints return 403 for unauthorized

---

## Performance Verification

### Dashboard Load Times
```
Target metrics:
- Dashboard initial load: < 1 second
- API calls: < 500ms (average)
- Database queries: 5-10ms (with new indexes from Issue #146)
```

### How to Check:
1. DevTools → Network tab
2. Reload dashboard
3. Check "Timing" column for each request
4. Sum total time

---

## Test Results Template

```markdown
## Smoke Test Results - [Date]

**Tester:** [Your Name]
**Environment:** Staging
**Duration:** [Time taken]

### Summary
- Total Journeys: 10
- Passed: [ ]
- Failed: [ ]
- Blocked: [ ]

### Journey Results

| # | Journey | Status | Time (ms) | Notes |
|---|---------|--------|-----------|-------|
| 1 | User Registration | ✅/❌ | | |
| 2 | Sign-In with MFA | ✅/❌ | | |
| 3 | Sign-Out | ✅/❌ | | |
| 4 | Password Reset | ✅/❌ | | |
| 5 | Coach Onboarding | ✅/❌ | | |
| 6 | Client Booking | ✅/❌ | | |
| 7 | Resource Library | ✅/❌ | | |
| 8 | Practice Journal | ✅/❌ | | |
| 9 | Admin Dashboard | ✅/❌ | | |
| 10 | RBAC | ✅/❌ | | |

### Console Errors
[List any console errors]

### Performance Metrics
- Dashboard load time: [ ]ms
- Average API response: [ ]ms
- Database query time: [ ]ms

### Issues Found
1. [Issue description] - Severity: Critical/High/Medium/Low
2. [Issue description] - Severity: Critical/High/Medium/Low

### Recommendations
- [Recommendation 1]
- [Recommendation 2]

### Sign-Off
- [ ] All critical journeys pass
- [ ] No console errors
- [ ] Performance targets met
- [ ] Ready for production

**Tested by:** [Name]
**Date:** [Date]
**Time spent:** [X hours]
```

---

## Common Issues & Solutions

### "Network error" on API calls
- ✅ Check staging API URL configured correctly
- ✅ Verify CORS settings
- ✅ Check database connection
- ✅ Restart browser session

### "RLS policy violation"
- ✅ Verify user signed in correctly
- ✅ Check token in request headers
- ✅ Verify policy allows operation
- ✅ Clear browser cache

### Slow performance
- ✅ Check if migration from Issue #146 applied to staging
- ✅ Monitor network latency
- ✅ Check server resources
- ✅ Run performance test queries

### MFA not working
- ✅ Sync device time
- ✅ Verify MFA secret stored correctly
- ✅ Use backup codes as alternative

---

## Success Criteria Summary

✅ **All tests pass if:**

1. ✅ All 10 journeys complete without errors
2. ✅ No console errors in browser DevTools
3. ✅ API responses within expected timeframes
4. ✅ Database performance is good (verify indexes applied)
5. ✅ No RLS policy violations
6. ✅ Session management works correctly
7. ✅ Email notifications sent
8. ✅ RBAC enforced properly

---

## Next Steps After Smoke Tests

1. **Document Results:**
   - Fill out test results template above
   - Attach screenshots of any issues
   - Update GitHub Issue #147

2. **Fix Blocking Issues:**
   - Critical issues: Fix before proceeding
   - High priority: Address soon
   - Medium/Low: Track for future sprints

3. **Proceed to E2E Tests:**
   - If all smoke tests pass → Issue #149
   - Run automated E2E test suite

4. **Production Deployment:**
   - After all tests pass
   - Follow deployment checklist
   - Monitor production closely

---

## Resources

- Full test specs: `SMOKE_TESTING_GUIDE_SPRINT7.md`
- Migration guide: `MIGRATION_DEPLOYMENT_CHECKLIST.md`
- E2E testing: `E2E_TESTING_GUIDE_SPRINT7.md`
- Admin guide: `ADMIN_GUIDE.md`

---

## Contact & Support

For issues or questions:
- GitHub Issue #147 for smoke testing
- Check console errors in browser DevTools
- Review application logs in staging
