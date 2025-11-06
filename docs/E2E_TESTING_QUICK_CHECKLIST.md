# E2E Testing Quick Checklist - Issue #149

**Print this page or keep it open while testing**

---

## Pre-Test Setup

- [ ] Node.js 18+ installed: `node --version`
- [ ] Playwright installed: `npx playwright --version`
- [ ] Dependencies installed: `npm install`
- [ ] Playwright browsers installed: `npx playwright install`
- [ ] `.env.test` file created with staging credentials
- [ ] Staging environment accessible
- [ ] Database migrations applied (Issue #146)
- [ ] Smoke tests passed (Issue #147)

---

## Environment Variables Configured

- [ ] `NEXT_PUBLIC_APP_URL=https://staging.loom-app.com`
- [ ] `NEXT_PUBLIC_SUPABASE_URL=[staging-url]`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]`
- [ ] `SUPABASE_SERVICE_ROLE_KEY=[service-role-key]`
- [ ] `TEST_COACH_EMAIL=test-coach@loom-staging.com`
- [ ] `TEST_COACH_PASSWORD=[password]`
- [ ] `TEST_CLIENT_EMAIL=test-client@loom-staging.com`
- [ ] `TEST_CLIENT_PASSWORD=[password]`
- [ ] `TEST_ADMIN_EMAIL=test-admin@loom-staging.com`
- [ ] `TEST_ADMIN_PASSWORD=[password]`

---

## Test Accounts Verified

- [ ] Coach account exists and can log in
- [ ] Client account exists and can log in
- [ ] Admin account exists and can log in
- [ ] All accounts verified/active
- [ ] MFA enabled (if testing MFA)

---

## Run Tests

### Option A: Run All Tests
```bash
npm run test:e2e
```
- [ ] Command executed
- [ ] Tests started
- [ ] **Waiting for completion...**

### Option B: Run with UI
```bash
npm run test:e2e:ui
```
- [ ] UI opened in browser
- [ ] Tests running visually
- [ ] Can step through execution

### Option C: Run Specific Category
```bash
# Examples:
npx playwright test tests/e2e/auth.spec.ts
npx playwright test --grep "booking"
npx playwright test --grep "mfa"
```
- [ ] Command executed
- [ ] Specific tests running

---

## Test Categories

Check off each category as tests pass:

### Authentication (4 tests) ⏱️ ~25 sec
- [ ] User registration
- [ ] User sign-in
- [ ] User sign-out
- [ ] Password reset
- **Status:** ✅ PASS / ❌ FAIL

### MFA (2 tests) ⏱️ ~30 sec
- [ ] Coach enable MFA
- [ ] User sign-in with MFA
- **Status:** ✅ PASS / ❌ FAIL

### Session Booking (2 tests) ⏱️ ~35 sec
- [ ] Client book session
- [ ] Coach view bookings
- **Status:** ✅ PASS / ❌ FAIL

### Resource Library (2 tests) ⏱️ ~45 sec
- [ ] Coach upload & share
- [ ] Client access resource
- **Status:** ✅ PASS / ❌ FAIL

### Practice Journal (2 tests) ⏱️ ~25 sec
- [ ] Client create entry
- [ ] Coach view shared entry
- **Status:** ✅ PASS / ❌ FAIL

### Admin Functions (2 tests) ⏱️ ~25 sec
- [ ] Admin dashboard access
- [ ] RBAC enforcement
- **Status:** ✅ PASS / ❌ FAIL

---

## Results

| Category | Tests | Passed | Failed | Time |
|----------|-------|--------|--------|------|
| Auth | 4 | ☐ | ☐ | |
| MFA | 2 | ☐ | ☐ | |
| Booking | 2 | ☐ | ☐ | |
| Resources | 2 | ☐ | ☐ | |
| Journal | 2 | ☐ | ☐ | |
| Admin | 2 | ☐ | ☐ | |
| **TOTAL** | **14** | **☐** | **☐** | |

---

## Test Execution Summary

**Start time:** _______________

**End time:** _______________

**Total duration:** _______________

**Total passed:** ___ / 14

**Total failed:** ___ / 14

**Success rate:** ___ %

---

## Performance Check

### Target Metrics
- Total suite: < 5 minutes
- Average test: < 30 seconds
- Slowest allowed: < 10 seconds per test

### Actual Results
- Total time: _____ minutes
- Fastest test: _____ seconds
- Slowest test: _____ seconds
- Tests > 10 seconds: _____

**Performance status:** ✅ PASS / ❌ FAIL

---

## Failures & Errors

| Test | Error Message | Severity |
|------|---------------|----------|
| | | C/H/M/L |
| | | C/H/M/L |
| | | C/H/M/L |

**Total failures:** _____

---

## Debug Information (if failed)

### Failed Test Name: ___________________

**Error Message:**
```
_________________________________________________________

_________________________________________________________
```

**Actions taken to debug:**
- [ ] Ran with UI mode
- [ ] Enabled debug logging (DEBUG=pw:api)
- [ ] Checked staging logs
- [ ] Reviewed screenshot

**Result:** _________________________________________________________

---

## Reports Generated

- [ ] HTML report exists: `playwright-report/`
- [ ] Screenshots captured (if failures)
- [ ] Test videos saved (if enabled)
- [ ] JSON report exported

**To view HTML report:**
```bash
npx playwright show-report
```

---

## Issue Investigation Checklist

If tests failed, verify:

- [ ] Staging environment is accessible
- [ ] Database is responding
- [ ] Migrations applied (Issue #146)
- [ ] Test accounts exist and are accessible
- [ ] Email service working
- [ ] Network connectivity good
- [ ] No rate limiting issues
- [ ] Check staging logs for errors

---

## Final Sign-Off

- [ ] All 14 tests completed
- [ ] No timeout errors
- [ ] All critical tests passed
- [ ] Performance acceptable
- [ ] No blocking issues found
- [ ] Ready to proceed to deployment

---

## Next Steps

Choose one:

- [ ] **All Pass:** Proceed to production deployment
- [ ] **Some Fail:** Debug and re-run failed tests
- [ ] **Critical Fail:** Stop and escalate issues

---

## Commands Reference

```bash
# Run all tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific file
npx playwright test tests/e2e/auth.spec.ts

# Run matching pattern
npx playwright test --grep "signin"

# Run with debug
DEBUG=pw:api npm run test:e2e

# Show report
npx playwright show-report
```

---

## Important Notes

Use this space for observations and issues:

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

---

## Tested By

**Name:** ___________________________________

**Date:** ___________________________________

**Time spent:** ___________________________________

**Notes:** _________________________________________________________________

_________________________________________________________________

---

## Quick Links

- Full guide: `E2E_TESTING_EXECUTION_GUIDE.md`
- Summary: `ISSUE_149_E2E_TESTING_SUMMARY.md`
- Smoke tests: Issue #147
- Issue #149: https://github.com/Tomerg91/Loom/issues/149

---

**Status:** ✅ Ready to Execute
