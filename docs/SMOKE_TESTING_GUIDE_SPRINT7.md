# Smoke Testing Guide - Sprint 7

**Issue:** #147 - Smoke test critical user journeys in staging
**Priority:** P0 - Critical
**Created:** November 6, 2025

## Overview

This guide provides comprehensive smoke testing procedures for validating 10 critical user journeys in the staging environment. These tests must pass before production deployment.

## Prerequisites

- [ ] Access to staging environment
- [ ] Test user accounts (coach and client)
- [ ] Browser DevTools open (for console error monitoring)
- [ ] Staging database migrations applied (see Issue #146)
- [ ] Performance monitoring enabled

## Success Criteria

✅ **All tests pass if:**
1. All critical flows complete without errors
2. No console errors in browser DevTools
3. API responses within expected timeframes (<2 seconds for most operations)
4. Database queries using optimization indexes (verify with performance metrics)

## Test Environment Setup

### 1. Access Staging

```
Staging URL: https://staging.loom-app.com (or your staging domain)
```

### 2. Test Accounts

Create or use existing test accounts:

**Coach Account:**
- Email: `coach-test@loom-staging.com`
- Password: [Use secure password]
- Role: Coach

**Client Account:**
- Email: `client-test@loom-staging.com`
- Password: [Use secure password]
- Role: Client

**Admin Account:**
- Email: `admin-test@loom-staging.com`
- Password: [Use secure password]
- Role: Admin

### 3. Browser Setup

- Open Chrome/Firefox with DevTools
- Switch to Console tab
- Enable "Preserve log" to catch errors across page transitions
- Open Network tab to monitor API response times

## Critical User Journeys

### Journey 1: User Registration and Email Verification

**Purpose:** Validate new user signup flow and email verification

**Steps:**
1. Navigate to `/auth/signup`
2. Fill in registration form:
   - First name: "Test"
   - Last name: "User"
   - Email: `newuser-${timestamp}@test.com`
   - Password: "SecurePass123!"
   - User type: Client
3. Submit form
4. Verify redirect to email confirmation page
5. Check email inbox (use mailtrap/staging email service)
6. Click verification link
7. Verify redirect to dashboard

**Expected Results:**
- ✅ Form submission successful
- ✅ Confirmation email sent within 30 seconds
- ✅ Email contains valid verification link
- ✅ Verification completes without errors
- ✅ User redirected to appropriate dashboard
- ✅ No console errors
- ✅ API response time < 2 seconds

**Console Check:**
- No errors related to auth, supabase, or network failures

---

### Journey 2: Sign-In with MFA Enabled

**Purpose:** Validate multi-factor authentication flow

**Prerequisites:**
- Test user with MFA enabled
- Authenticator app or backup codes ready

**Steps:**
1. Navigate to `/auth/signin`
2. Enter email and password
3. Submit credentials
4. Verify MFA challenge page displays
5. Enter TOTP code from authenticator app
6. Submit MFA code
7. Verify successful sign-in
8. Check dashboard loads correctly

**Expected Results:**
- ✅ Initial login accepted
- ✅ MFA challenge displays
- ✅ TOTP code validation works
- ✅ Dashboard loads after MFA
- ✅ Session persists (refresh page, still logged in)
- ✅ No console errors
- ✅ API response time < 2 seconds

**Alternative Path - Backup Code:**
1. On MFA challenge, click "Use backup code"
2. Enter valid backup code
3. Verify successful authentication

**Console Check:**
- No auth errors
- No session persistence errors

---

### Journey 3: Sign-Out and Session Cleanup

**Purpose:** Validate complete sign-out process

**Prerequisites:**
- User currently signed in

**Steps:**
1. From dashboard, click user avatar/menu
2. Click "Sign Out"
3. Verify redirect to landing page
4. Check DevTools → Application → Cookies
   - No Supabase auth cookies remaining
5. Check DevTools → Application → Local Storage
   - No sensitive data remaining
6. Try accessing dashboard URL directly
7. Verify redirect to sign-in page

**Expected Results:**
- ✅ Sign-out completes instantly
- ✅ All auth cookies cleared
- ✅ Local storage cleaned
- ✅ Protected routes inaccessible
- ✅ Redirect to sign-in works
- ✅ No console errors

**Console Check:**
- No auth state errors
- No failed API calls after sign-out

---

### Journey 4: Password Reset Flow

**Purpose:** Validate password recovery process

**Steps:**
1. Navigate to `/auth/signin`
2. Click "Forgot password?"
3. Enter email address
4. Submit form
5. Check email for reset link
6. Click reset link
7. Enter new password (twice)
8. Submit password reset
9. Verify redirect to sign-in
10. Sign in with new password

**Expected Results:**
- ✅ Reset email sent within 30 seconds
- ✅ Reset link valid and secure
- ✅ Password update successful
- ✅ Can sign in with new password
- ✅ Old password no longer works
- ✅ No console errors
- ✅ API response time < 2 seconds

**Security Checks:**
- Reset link contains secure token
- Link expires after use
- Password validation enforced

**Console Check:**
- No auth errors
- No failed password update API calls

---

### Journey 5: Coach Onboarding Workflow

**Purpose:** Validate coach setup and profile completion

**Prerequisites:**
- Fresh coach account (newly registered)

**Steps:**
1. Sign in as new coach
2. Complete onboarding wizard:
   - Professional info
   - Availability setup
   - Service offerings
   - Pricing (if applicable)
3. Set weekly availability
   - Add at least 3 time slots
4. Save and complete onboarding
5. Verify redirect to coach dashboard
6. Check dashboard displays correctly

**Expected Results:**
- ✅ Onboarding wizard displays all steps
- ✅ Form validation works
- ✅ Availability saved correctly
- ✅ Dashboard shows welcome message
- ✅ Profile completion status: 100%
- ✅ No console errors
- ✅ API response time < 2 seconds

**Data Verification:**
- Check database: coach profile created
- Availability slots saved correctly

**Console Check:**
- No form submission errors
- No database write errors

---

### Journey 6: Client Booking Flow

**Purpose:** Validate session booking from client perspective

**Prerequisites:**
- Client account signed in
- Coach with available time slots

**Steps:**
1. Navigate to "Book Session" or `/client/book`
2. Select a coach (if multiple available)
3. View coach's availability calendar
4. Select available time slot
5. Choose session type/duration
6. Add notes (optional)
7. Confirm booking
8. Verify confirmation message
9. Check "My Sessions" page
10. Verify session appears in list

**Expected Results:**
- ✅ Coach availability displays correctly
- ✅ Time slots in correct timezone
- ✅ Booking confirmation instant
- ✅ Session appears in dashboard
- ✅ Coach receives notification (if enabled)
- ✅ Email confirmation sent
- ✅ No console errors
- ✅ API response time < 2 seconds

**Data Verification:**
- Session created in database
- Status: "scheduled"
- Correct coach and client IDs

**Console Check:**
- No booking errors
- No notification failures

---

### Journey 7: Resource Library Access and Assignment

**Purpose:** Validate resource sharing and client access

**Prerequisites:**
- Coach account with resources uploaded
- Client account associated with coach

**Coach Steps:**
1. Sign in as coach
2. Navigate to Resources Library
3. Upload new resource (PDF, video, or link)
4. Create a collection (e.g., "Welcome Kit")
5. Add resource to collection
6. Share resource with specific client OR all clients
7. Verify share confirmation

**Client Steps:**
1. Sign in as client
2. Navigate to Resources
3. Verify shared resource appears
4. Click to view/download resource
5. Mark resource as "completed"
6. Verify progress tracked

**Expected Results:**

**Coach side:**
- ✅ File upload successful
- ✅ Collection created
- ✅ Sharing works (individual or all clients)
- ✅ Analytics show client access

**Client side:**
- ✅ Shared resources visible
- ✅ Can access/download resources
- ✅ Progress tracking works
- ✅ Collections display correctly

**Common:**
- ✅ No console errors
- ✅ API response time < 2 seconds for listing
- ✅ File operations complete reasonably (<5s for large files)

**Data Verification:**
- Resource stored in database
- RLS policies enforced (client can't see other clients' private resources)

**Console Check:**
- No file upload errors
- No RLS policy violations

---

### Journey 8: Practice Journal Functionality

**Purpose:** Validate journal entry creation and sharing

**Client Steps:**
1. Sign in as client
2. Navigate to Practice Journal
3. Create new journal entry:
   - Add title
   - Write content
   - Select mood rating (1-10)
   - Add insights
4. Save entry
5. Toggle "Share with coach"
6. Verify entry saved

**Coach Steps:**
1. Sign in as coach
2. Navigate to client's profile
3. View Practice Journal tab
4. Verify shared entries visible
5. Verify private entries NOT visible

**Expected Results:**

**Client side:**
- ✅ Journal entry created
- ✅ Entry saved successfully
- ✅ Share toggle works
- ✅ Entry appears in list

**Coach side:**
- ✅ Shared entries visible
- ✅ Private entries hidden (RLS enforced)
- ✅ Can view entry details

**Common:**
- ✅ No console errors
- ✅ API response time < 1 second

**Security Check:**
- Coach cannot access private entries (verify in Network tab)

**Console Check:**
- No database errors
- No RLS violations

---

### Journey 9: Admin Dashboard Access

**Purpose:** Validate admin functionality and system monitoring

**Prerequisites:**
- Admin account

**Steps:**
1. Sign in as admin
2. Navigate to Admin Dashboard
3. Check system health metrics:
   - Database status
   - Active users
   - Error rates
4. View user management:
   - List all users
   - Filter by role
5. View system logs (if available)
6. Check performance metrics
7. Verify all admin tools accessible

**Expected Results:**
- ✅ Admin dashboard loads
- ✅ System health displays (green/healthy)
- ✅ User list displays correctly
- ✅ Can filter and search users
- ✅ Performance metrics accurate
- ✅ No unauthorized access errors
- ✅ No console errors
- ✅ Dashboard queries fast (<1 second)

**Security Check:**
- Non-admin users cannot access admin routes (test with client account)

**Console Check:**
- No permission errors
- No missing admin functions

---

### Journey 10: Role-Based Access Control (RBAC)

**Purpose:** Validate authorization and access restrictions

**Test Matrix:**

| Resource/Action | Client | Coach | Admin | Expected |
|----------------|--------|-------|-------|----------|
| View own dashboard | ✅ | ✅ | ✅ | Allow |
| View own profile | ✅ | ✅ | ✅ | Allow |
| Edit own profile | ✅ | ✅ | ✅ | Allow |
| View other user's private data | ❌ | ❌ | ✅ | Client/Coach: Deny, Admin: Allow |
| Create session (as coach) | ❌ | ✅ | ✅ | Allow for Coach/Admin only |
| Upload resources | ❌ | ✅ | ✅ | Allow for Coach/Admin only |
| Access admin panel | ❌ | ❌ | ✅ | Allow for Admin only |
| View all users list | ❌ | ❌ | ✅ | Allow for Admin only |
| Delete any user | ❌ | ❌ | ✅ | Allow for Admin only |

**Testing Steps:**

1. **As Client:**
   - Try accessing `/coach/resources`
   - Try accessing `/admin`
   - Verify: Both redirect to dashboard or show 403

2. **As Coach:**
   - Access `/coach/dashboard` ✅
   - Try accessing `/admin`
   - Verify: Admin redirects or shows 403

3. **As Admin:**
   - Access all routes ✅
   - Verify full access

**Expected Results:**
- ✅ All access restrictions enforced
- ✅ Appropriate error messages
- ✅ No console errors
- ✅ Clean redirects (no flash of unauthorized content)

**API-Level Checks:**
- Use DevTools → Network tab
- Verify API endpoints return 403 for unauthorized requests

**Console Check:**
- No authorization bypass errors
- No RLS policy failures

---

## Performance Verification

After completing all journeys, verify performance improvements from Issue #146:

### Dashboard Load Times

```bash
# Use browser DevTools → Network → Timing

Target metrics:
- Dashboard initial load: < 1 second
- API calls: < 500ms (average)
- Database queries: 5-10ms (with new indexes)
```

### Database Query Performance

Run in Supabase SQL Editor:

```sql
-- Check index usage
SELECT * FROM get_index_usage_stats()
WHERE idx_scan > 0
ORDER BY idx_scan DESC
LIMIT 20;

-- Verify performance metrics
SELECT * FROM get_performance_metrics();
```

**Expected Results:**
- New indexes showing usage (idx_scan > 0)
- Dashboard queries 10x+ faster
- Average query time < 50ms

---

## Console Error Monitoring

### Common Acceptable Messages

These are NOT errors:
- React DevTools warnings
- Next.js dev mode hot reload messages
- [HMR] messages (dev only)

### Critical Errors to Watch For

❌ **Must fix immediately:**
- Database connection errors
- Authentication failures
- RLS policy violations
- Network errors (5xx responses)
- Unhandled promise rejections
- React component errors

### How to Monitor

```javascript
// Run in browser console before starting tests
const errors = [];
window.addEventListener('error', (e) => {
  errors.push({ type: 'error', message: e.message, stack: e.error?.stack });
});
window.addEventListener('unhandledrejection', (e) => {
  errors.push({ type: 'promise', reason: e.reason });
});

// After tests, check collected errors
console.table(errors);
```

---

## Test Results Template

Use this template to document results:

```markdown
## Smoke Test Results - [Date]

**Tester:** [Name]
**Environment:** Staging
**Duration:** [Time taken]

### Summary
- Total Journeys: 10
- Passed: [X]
- Failed: [Y]
- Blocked: [Z]

### Journey Results

| # | Journey | Status | Notes |
|---|---------|--------|-------|
| 1 | User Registration | ✅/❌ | [Notes] |
| 2 | Sign-In with MFA | ✅/❌ | [Notes] |
| 3 | Sign-Out | ✅/❌ | [Notes] |
| 4 | Password Reset | ✅/❌ | [Notes] |
| 5 | Coach Onboarding | ✅/❌ | [Notes] |
| 6 | Client Booking | ✅/❌ | [Notes] |
| 7 | Resource Library | ✅/❌ | [Notes] |
| 8 | Practice Journal | ✅/❌ | [Notes] |
| 9 | Admin Dashboard | ✅/❌ | [Notes] |
| 10 | RBAC | ✅/❌ | [Notes] |

### Console Errors
[List any console errors encountered]

### Performance Metrics
- Dashboard load time: [X]ms
- Average API response: [X]ms
- Database query time: [X]ms

### Issues Found
1. [Issue description] - [Severity: Critical/High/Medium/Low]
2. [Issue description] - [Severity: Critical/High/Medium/Low]

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
**Signature:** ___________
```

---

## Troubleshooting

### Common Issues

**Issue: "Network error" on API calls**
- Check: Staging API URL configured correctly
- Check: CORS settings
- Check: Database connection

**Issue: "RLS policy violation"**
- Check: User signed in correctly
- Check: Token in request headers
- Check: Policy allows the operation

**Issue: Slow performance**
- Check: Database indexes applied (Issue #146)
- Check: Network latency
- Check: Server resources

**Issue: MFA not working**
- Check: Time sync on device
- Check: MFA secret correctly stored
- Check: Backup codes available

---

## Next Steps

After completing smoke tests:

1. **Document Results:**
   - Fill out test results template
   - Attach screenshots of any issues
   - Update GitHub Issue #147

2. **Fix Blocking Issues:**
   - Critical issues must be fixed before proceeding
   - High priority issues should be addressed

3. **Proceed to E2E Tests:**
   - If all smoke tests pass, proceed to Issue #149
   - Run automated E2E test suite

4. **Production Deployment:**
   - After E2E tests pass, ready for production
   - Follow deployment checklist

---

## Related Documentation

- [Issue #146: Database Migrations](./STAGING_MIGRATION_GUIDE.md)
- [Issue #149: E2E Testing](./E2E_TESTING_GUIDE_SPRINT7.md)
- [Admin Guide](./ADMIN_GUIDE.md)
- [Launch Checklist](./launch/checklist.md)

---

## Contact

For issues or questions:
- GitHub Issue: #147
- Slack: #loom-dev
- Email: dev-team@loom-app.com
