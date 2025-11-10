# Issue #147: Smoke Testing - Complete Guide & Summary

**Status:** ✅ Ready for Execution
**Priority:** P0 - Critical
**Environment:** Staging
**Estimated Time:** 2-3 hours
**Commit:** df6297c

---

## Overview

Issue #147 involves comprehensive smoke testing of 10 critical user journeys in the staging environment before production deployment. All documentation is now ready for execution.

---

## Available Documentation

### 1. **SMOKE_TESTING_EXECUTION_GUIDE.md** (15KB)
**Comprehensive step-by-step guide**

**Contains:**
- Prerequisites and setup checklist
- Detailed instructions for all 10 journeys
- Time estimates per journey (2-3 hours total)
- Success criteria for each test
- Common issues and troubleshooting
- Performance verification procedures
- Test results template
- RBAC verification matrix

**Use when:** You're ready to execute the tests and need detailed instructions

---

### 2. **SMOKE_TESTING_QUICK_CHECKLIST.md** (4KB)
**Printable quick reference checklist**

**Contains:**
- Checkbox-style format for quick tracking
- One-line summaries of each journey
- Time tracking fields
- Issues checklist
- Performance metrics section
- Sign-off section

**Use when:** You're actively testing and need a quick reference to track progress

---

### 3. **SMOKE_TESTING_GUIDE_SPRINT7.md** (from Sprint 7 branch)
**Original detailed specifications**

**Contains:**
- Comprehensive test specifications
- Test environment setup details
- All 10 journeys with detailed steps
- Success criteria for each journey
- Test results template

**Reference:** Already in repository, use as supplementary reference

---

## The 10 Critical User Journeys

### Journey 1: User Registration & Email Verification ⏱️ 5-8 min
- Sign up with new account
- Verify email verification works
- Confirm redirect to dashboard

### Journey 2: Sign-In with MFA ⏱️ 5-7 min
- Sign in with TOTP code
- Verify MFA challenge
- Test session persistence

### Journey 3: Sign-Out & Session Cleanup ⏱️ 2-3 min
- Sign out from dashboard
- Verify cookies cleared
- Confirm protected route redirect

### Journey 4: Password Reset Flow ⏱️ 8-10 min
- Request password reset
- Use reset link
- Sign in with new password

### Journey 5: Coach Onboarding ⏱️ 8-10 min
- Complete onboarding wizard
- Set availability slots
- Verify dashboard welcome

### Journey 6: Client Booking ⏱️ 8-12 min
- Browse coach availability
- Book a session
- Verify session in dashboard

### Journey 7: Resource Library ⏱️ 10-15 min
- Coach uploads and shares resource
- Client accesses shared resource
- Verify progress tracking

### Journey 8: Practice Journal ⏱️ 8-10 min
- Client creates journal entry
- Toggle share with coach
- Verify coach access (RLS)

### Journey 9: Admin Dashboard ⏱️ 5-8 min
- Access admin dashboard
- View system health
- Check performance metrics

### Journey 10: Role-Based Access Control (RBAC) ⏱️ 10-12 min
- Test access restrictions by role
- Verify 403 errors for blocked actions
- Test clean redirects

---

## Total Time Estimate

| Component | Time |
|-----------|------|
| Setup & prerequisites | 10-15 min |
| 10 journeys | 80-110 min |
| Documentation & wrap-up | 10-20 min |
| **Total** | **2-3 hours** |

---

## Prerequisites Checklist

Before starting tests, ensure you have:

- [ ] **Staging Environment Access**
  - Staging URL
  - Reliable internet connection
  - Can load pages quickly

- [ ] **Test User Accounts** (created in staging)
  - Coach: `coach-test@loom-staging.com`
  - Client: `client-test@loom-staging.com`
  - Admin: `admin-test@loom-staging.com`
  - All accounts verified and active

- [ ] **Browser Setup**
  - Modern browser (Chrome, Firefox, Safari)
  - DevTools available
  - JavaScript enabled
  - Pop-ups allowed

- [ ] **DevTools Configuration**
  - Console tab visible
  - "Preserve log" enabled
  - Network tab visible
  - "Disable cache" checked

- [ ] **Supporting Services**
  - Email service accessible (for verification/reset emails)
  - MFA authenticator app ready (if testing MFA)
  - Backup codes available (as fallback)

- [ ] **Data & Resources**
  - Test files ready (for resource library upload)
  - Time blocked for uninterrupted testing
  - Notepad/template ready for results

---

## Quick Start Guide

### Step 1: Open Execution Guide
```bash
# Open this file in your favorite editor
docs/SMOKE_TESTING_EXECUTION_GUIDE.md
```

### Step 2: Open Checklist
```bash
# Print or open in another window
docs/SMOKE_TESTING_QUICK_CHECKLIST.md
```

### Step 3: Setup Staging Environment
- Navigate to staging URL
- Clear browser cache (Cmd+Shift+Delete)
- Open DevTools (F12 or Cmd+Option+I)

### Step 4: Start Testing
- Begin with Journey 1 (registration)
- Follow execution guide step-by-step
- Mark off checklist as you complete each journey
- Document any issues

### Step 5: Document Results
- Fill out test results template
- Take screenshots of failures
- Note any performance issues
- List blocking/critical issues

### Step 6: Sign-Off
- Complete sign-off checklist
- Update GitHub Issue #147 with results
- Proceed to E2E testing (Issue #149) if all pass

---

## Success Criteria

✅ **Smoke tests pass if:**

1. **All 10 journeys complete** without critical errors
2. **No console errors** in browser DevTools
3. **No RLS policy violations** logged
4. **API response times** within expected ranges
5. **Email notifications** sent successfully
6. **Session management** works correctly
7. **RBAC enforcement** prevents unauthorized access
8. **Performance metrics** show improvement from indexes (Issue #146)

❌ **Block production deployment if:**

- Any journey fails completely
- Critical console errors prevent functionality
- RLS policies not enforced correctly
- Performance severely degraded
- Authentication/authorization broken

---

## Key Testing Notes

### Browser DevTools
- **Console Tab:** Check for errors regularly
- **Network Tab:** Monitor response times (< 500ms target)
- **Application Tab:** Verify cookies/localStorage cleaned on logout

### Performance Benchmarks
- Dashboard load: < 1 second
- API calls: < 500ms average
- Database queries: 5-10ms (with new indexes)

### Email Testing
- Staging email service should catch all emails
- Check spam folder if needed
- Links should be valid and clickable

### MFA Testing
- Use authenticator app for TOTP
- Backup codes available as alternative
- Test time sync issues if TOTP fails

### RLS Policy Verification
- Coach cannot see client's private data
- Client cannot access admin functions
- Admin can see all data (when appropriate)

---

## Troubleshooting Common Issues

### "Network error" when calling API
**Possible causes:**
- Staging environment down
- CORS issue
- Browser connectivity issue
- Authentication token expired

**Solutions:**
- Check staging status
- Clear browser cache and cookies
- Restart browser
- Verify in new incognito window

### Email not arriving
**Possible causes:**
- Email service misconfigured
- Emails going to spam
- Staging not configured for email

**Solutions:**
- Check spam/junk folder
- Verify email service enabled in staging
- Check staging logs

### "RLS policy violation" error
**Possible causes:**
- User not authenticated correctly
- Token not sent in request
- Policy misconfigured

**Solutions:**
- Verify user is fully signed in
- Check Network tab for auth header
- Review RLS policy in database

### MFA not working
**Possible causes:**
- Device time out of sync
- TOTP secret incorrect
- Backup codes used up

**Solutions:**
- Sync device time with NTP
- Use backup code instead
- Re-enable MFA with new secret

---

## What to Expect

### Successful Test Run
- All 10 journeys complete within 2-3 hours
- 0-5 minor issues (typos, CSS, non-blocking)
- Performance metrics show 10x+ improvement on dashboard queries
- All users report smooth experience
- No security issues detected

### Typical Issues Found
- Missing error messages
- Slow load times for specific features
- UI/UX improvements
- Missing validation messages
- Email delivery delays

### Blocking Issues (fix before production)
- Authentication fails
- Authorization bypass possible
- Data visibility issues (RLS)
- Crashes or 500 errors
- Performance < 50% of target

---

## After Testing

### If All Tests Pass ✅
1. Document results in template
2. Update GitHub Issue #147 with "PASSED"
3. Proceed to E2E testing (Issue #149)
4. Prepare for production deployment

### If Issues Found ⚠️
1. Categorize by severity (Critical/High/Medium/Low)
2. Create GitHub issues for each blocker
3. Fix blocking issues before proceeding
4. Re-test fixed areas
5. Complete re-test before moving forward

### If Critical Issues Found ❌
1. Document all critical failures
2. Escalate immediately
3. Don't proceed to E2E or production
4. Fix issues and re-test from scratch

---

## Documentation Hierarchy

Use these docs in this order:

1. **START HERE:** This file (ISSUE_147_SMOKE_TESTING_SUMMARY.md)
2. **EXECUTE:** SMOKE_TESTING_EXECUTION_GUIDE.md (detailed steps)
3. **QUICK REF:** SMOKE_TESTING_QUICK_CHECKLIST.md (during testing)
4. **REFERENCE:** SMOKE_TESTING_GUIDE_SPRINT7.md (full specs)

---

## Related Issues & Documentation

- **Issue #146:** Database migrations (performance optimization)
- **Issue #148:** ESLint audit (code quality)
- **Issue #149:** E2E testing (automated validation)
- **Migration Guide:** docs/MIGRATION_DEPLOYMENT_CHECKLIST.md
- **E2E Testing:** docs/E2E_TESTING_GUIDE_SPRINT7.md

---

## Helpful Commands

### Check Staging Status
```bash
curl https://staging.loom-app.com/api/health
# Should return: {"status":"ok",...}
```

### View Test Results in Git
```bash
# After testing, commit results to a results file
# Then view with:
git log --oneline | head -5
```

### Reset Test Data
```bash
# Clear browser storage (from DevTools Console)
localStorage.clear();
sessionStorage.clear();
```

---

## Key Contacts

For issues during testing:
- **GitHub:** Issue #147 on https://github.com/Tomerg91/Loom
- **Documentation:** All guides in `/docs/`
- **Staging Issues:** Check staging logs

---

## Success Checklist

Before declaring tests complete:

- [ ] All 10 journeys tested
- [ ] Results documented
- [ ] Issues categorized by severity
- [ ] Screenshots taken of failures
- [ ] GitHub Issue #147 updated
- [ ] No blocking issues
- [ ] Performance metrics acceptable
- [ ] Ready for E2E testing
- [ ] Ready for production deployment
- [ ] Sign-off completed

---

## Final Notes

**Smoke testing is critical for:**
- Validating core functionality
- Catching user-facing bugs
- Verifying security controls
- Benchmarking performance
- Building confidence before production

**This is NOT:**
- Comprehensive feature testing (that's E2E tests)
- Performance load testing
- Security penetration testing
- Production deployment

---

## Questions?

Refer to:
1. SMOKE_TESTING_EXECUTION_GUIDE.md (detailed instructions)
2. SMOKE_TESTING_GUIDE_SPRINT7.md (comprehensive specs)
3. SMOKE_TESTING_QUICK_CHECKLIST.md (quick reference)
4. GitHub Issue #147 (team discussion)

---

**Ready to test? Start with SMOKE_TESTING_EXECUTION_GUIDE.md!** 🚀
