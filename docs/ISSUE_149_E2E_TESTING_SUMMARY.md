# Issue #149: E2E Testing - Complete Guide & Summary

**Status:** ✅ Ready for Execution
**Priority:** P1 - High
**Environment:** Staging
**Estimated Time:** 1-2 hours
**Framework:** Playwright
**Test Count:** 14 automated tests

---

## Overview

Issue #149 involves executing 14 automated end-to-end tests using Playwright in the staging environment. These tests validate critical user journeys, API integrations, and database state before production deployment.

---

## Available Documentation

### 1. **E2E_TESTING_EXECUTION_GUIDE.md** (18KB)
**Comprehensive step-by-step guide**

**Contains:**
- Prerequisites and environment setup
- Configuration instructions (.env.test)
- 7 different ways to run tests
- Test suite breakdown (14 tests across 6 categories)
- Performance benchmarks
- Debugging techniques
- Report generation
- CI/CD integration
- Troubleshooting common issues
- Best practices

**Use when:** You're ready to execute tests and need detailed instructions

---

### 2. **E2E_TESTING_QUICK_CHECKLIST.md** (4KB)
**Printable quick reference checklist**

**Contains:**
- Setup verification checklist
- Environment variable checklist
- Test category tracking
- Results table
- Performance metrics section
- Failure logging template
- Debug information section
- Next steps decision tree

**Use when:** You're actively running tests and need quick reference

---

### 3. **E2E_TESTING_GUIDE_SPRINT7.md** (from Sprint 7 branch)
**Original detailed specifications**

**Contains:**
- Comprehensive test specifications
- Test file locations
- Test categories and counts
- Environment setup details
- Performance benchmarks
- Failure handling guides

**Reference:** Already in repository, use as supplementary reference

---

## The 14 Automated Tests

### Category 1: Authentication (4 tests) ⏱️ ~25 sec
- User registration with email and password
- User sign-in with email and password
- User sign-out and session cleanup
- Password reset flow

**Validates:** User account lifecycle

### Category 2: MFA (2 tests) ⏱️ ~30 sec
- Coach can enable MFA
- User can sign in with MFA

**Validates:** Multi-factor authentication security

### Category 3: Session Booking (2 tests) ⏱️ ~35 sec
- Client can book session with coach
- Coach can view booked sessions

**Validates:** Core booking functionality

### Category 4: Resource Library (2 tests) ⏱️ ~45 sec
- Coach can upload and share resource
- Client can view shared resources

**Validates:** Resource management and sharing

### Category 5: Practice Journal (2 tests) ⏱️ ~25 sec
- Client can create practice journal entry
- Coach can view client shared journal

**Validates:** Journal functionality and privacy (RLS)

### Category 6: Admin Functions (2 tests) ⏱️ ~25 sec
- Admin can access system dashboard
- Non-admin users cannot access admin routes (RBAC)

**Validates:** Admin access and authorization

---

## Total Time Estimate

| Component | Time |
|-----------|------|
| Setup & prerequisites | 10-20 min |
| Running 14 tests | 3-5 min |
| Reviewing results | 5-10 min |
| Documenting issues (if any) | 5-10 min |
| **Total** | **1-2 hours** |

---

## Prerequisites Checklist

Before running E2E tests, ensure you have:

### System Requirements
- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Git installed
- [ ] 500MB+ free disk space

### Local Setup
- [ ] Repository cloned
- [ ] `npm install` completed
- [ ] `npx playwright install` completed
- [ ] `.env.test` file created with credentials

### Staging Environment
- [ ] Staging URL accessible
- [ ] Database up and running
- [ ] Migrations applied (Issue #146)
- [ ] Smoke tests passed (Issue #147)
- [ ] Email service working
- [ ] API health check passes

### Test Accounts
- [ ] Coach account: `test-coach@loom-staging.com`
- [ ] Client account: `test-client@loom-staging.com`
- [ ] Admin account: `test-admin@loom-staging.com`
- [ ] All accounts verified and active
- [ ] MFA enabled (if testing MFA)

---

## Quick Start Guide

### Step 1: Setup Environment
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Verify installation
npx playwright --version
```

### Step 2: Configure Credentials
Create `.env.test` with:
```bash
NEXT_PUBLIC_APP_URL=https://staging.loom-app.com
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TEST_COACH_EMAIL=...
TEST_COACH_PASSWORD=...
TEST_CLIENT_EMAIL=...
TEST_CLIENT_PASSWORD=...
TEST_ADMIN_EMAIL=...
TEST_ADMIN_PASSWORD=...
```

### Step 3: Verify Staging
```bash
curl https://staging.loom-app.com/api/health
# Should return: {"status":"ok",...}
```

### Step 4: Run Tests
```bash
# Run all 14 tests
npm run test:e2e

# Or run with UI to watch
npm run test:e2e:ui

# Or run specific category
npx playwright test tests/e2e/auth.spec.ts
```

### Step 5: Review Results
```bash
# View HTML report
npx playwright show-report

# Check results and next steps
```

---

## Ways to Run Tests

### 1. **All Tests (Default)**
```bash
npm run test:e2e
# Runs all 14 tests, outputs results
```

### 2. **With Visual UI**
```bash
npm run test:e2e:ui
# Open interactive Playwright test runner
```

### 3. **Headed Mode (See Browser)**
```bash
npm run test:e2e:headed
# Watch tests run in actual browser
```

### 4. **Debug Mode**
```bash
npm run test:e2e:debug
# Verbose output for troubleshooting
```

### 5. **Specific Category**
```bash
npx playwright test tests/e2e/auth.spec.ts
# Run only auth tests
```

### 6. **Pattern Matching**
```bash
npx playwright test --grep "booking"
# Run only tests matching pattern
```

### 7. **Single Test**
```bash
npx playwright test --grep "user can sign in"
# Run one specific test
```

---

## Success Criteria

✅ **All E2E tests pass if:**

1. All 14 tests execute successfully
2. No flaky tests (consistent results)
3. Test suite completes < 5 minutes
4. No timeout errors (> 30 seconds per test)
5. All performance targets met
6. No unhandled exceptions
7. Database state correct after tests

❌ **Block production if:**

- Any test fails consistently
- Critical functionality broken
- Security issues found
- Performance significantly degraded

---

## Performance Benchmarks

| Test | Target | Warning | Critical |
|------|--------|---------|----------|
| Auth (4 tests) | < 5s | 5-10s | > 10s |
| MFA (2 tests) | < 8s | 8-15s | > 15s |
| Booking (2 tests) | < 10s | 10-20s | > 20s |
| Resources (2 tests) | < 15s | 15-30s | > 30s |
| Journal (2 tests) | < 5s | 5-10s | > 10s |
| Admin (2 tests) | < 5s | 5-10s | > 10s |
| **All 14 Tests** | **< 5 min** | **5-10 min** | **> 10 min** |

---

## What Tests Validate

### Functional Testing
- ✅ User registration and email verification
- ✅ Authentication flows (sign-in, sign-out)
- ✅ Multi-factor authentication (MFA)
- ✅ Password reset
- ✅ Session booking and management
- ✅ Resource upload and sharing
- ✅ Journal entry creation and privacy
- ✅ Admin dashboard access

### Security Testing
- ✅ Authorization enforcement (RBAC)
- ✅ Role-based access control
- ✅ Private data protection (RLS)
- ✅ Session management
- ✅ Token validation

### Integration Testing
- ✅ API endpoint functionality
- ✅ Database operations
- ✅ Email service integration
- ✅ Authentication service integration

### Database Testing
- ✅ Data persistence
- ✅ RLS policy enforcement
- ✅ Constraint validation
- ✅ State consistency

---

## Common Test Outcomes

### All Pass (Optimal) ✅
```
✓ 14 passed (4m 23s)
  ✓ Authentication (4)
  ✓ MFA (2)
  ✓ Session Booking (2)
  ✓ Resource Library (2)
  ✓ Practice Journal (2)
  ✓ Admin Functions (2)
```
**Action:** Proceed to production deployment

### Some Fail (Needs Investigation) ⚠️
```
✗ 1 failed
  ✓ 13 passed
  ✗ Resource Library
```
**Action:** Debug failed test, fix issue, re-run

### Critical Fail (Block) ❌
```
✗ Multiple failed
  ✓ Few passed
  ✗ Authentication
```
**Action:** Escalate immediately, fix issues, re-test

---

## Troubleshooting

### Common Issues

**Timeout Error**
```
Error: timeout after 30000ms
```
- Staging server slow
- Network issues
- Increase timeout

**Element Not Found**
```
Error: Target element closed
```
- UI changed
- Selector invalid
- Add wait conditions

**Authentication Failed**
```
Error: Invalid credentials
```
- Test account doesn't exist
- Password wrong
- Reset account

**Network Error**
```
Error: ECONNREFUSED
```
- Staging down
- No internet
- Check connectivity

---

## Debugging Failed Tests

### Method 1: Run with UI Mode
```bash
npm run test:e2e:ui
# Visually step through execution
```

### Method 2: Run Single Test
```bash
npx playwright test tests/e2e/auth.spec.ts --grep "signin"
# Focus on one failing test
```

### Method 3: Enable Debug Output
```bash
DEBUG=pw:api npm run test:e2e
# See all API calls and responses
```

### Method 4: Check Screenshots
```bash
# Automatically captured in:
# playwright-report/[test-name]/
```

---

## After Tests Complete

### If All Pass ✅
1. Review HTML report: `npx playwright show-report`
2. Check performance metrics
3. Document results
4. Update GitHub Issue #149: "PASSED"
5. Proceed to production deployment

### If Issues Found ⚠️
1. Document failed test names
2. Run with debug mode to understand issues
3. Review error messages carefully
4. Fix underlying issues (code, data, config)
5. Re-run failed tests
6. Repeat until all pass

### If Critical Failures ❌
1. Document all failures
2. Review staging logs for errors
3. Escalate immediately to team
4. Don't proceed to production
5. Fix issues thoroughly
6. Re-run full test suite

---

## Reports & Documentation

### HTML Report
```bash
npx playwright show-report
```
Shows:
- Test results by category
- Timing for each test
- Screenshots of failures
- Video recordings (if enabled)
- Network logs

### JSON Report
```bash
npx playwright test --reporter=json > results.json
```
For CI integration

### Console Report
```bash
npx playwright test --reporter=list
```
Quick overview

---

## CI/CD Integration

Tests can run in GitHub Actions:

**Location:** `.github/workflows/e2e-tests.yml`

**Triggers:**
- Push to main/develop
- Pull requests
- Manual trigger

**Output:**
- Test results artifact
- Playwright report
- Failed screenshots

---

## Documentation Hierarchy

Use these docs in order:

1. **START HERE:** This summary (5 min read)
2. **SETUP:** E2E_TESTING_EXECUTION_GUIDE.md (10 min review)
3. **DURING TEST:** E2E_TESTING_QUICK_CHECKLIST.md (quick ref)
4. **REFERENCE:** E2E_TESTING_GUIDE_SPRINT7.md (details)

---

## Related Issues & Dependencies

- **Issue #146:** Database migrations (applied first)
- **Issue #147:** Smoke testing (passed first)
- **Issue #148:** ESLint audit (code quality)

**Timeline:**
```
#146 Migrations → #147 Smoke Tests → #149 E2E Tests → Production
```

---

## Key Contacts & Resources

- **Playwright Docs:** https://playwright.dev
- **Test Files:** `tests/e2e/`
- **Config:** `playwright.config.ts`
- **GitHub Issue:** #149
- **Supabase Docs:** https://supabase.io/docs

---

## Success Checklist

Before declaring E2E testing complete:

- [ ] All 14 tests executed
- [ ] All tests passed
- [ ] No timeout errors
- [ ] Performance acceptable
- [ ] Results documented
- [ ] HTML report reviewed
- [ ] Issues (if any) addressed
- [ ] GitHub Issue #149 updated
- [ ] Ready for production

---

## Final Notes

**E2E testing is critical for:**
- Validating complete user workflows
- Detecting integration issues
- Catching data corruption
- Verifying security controls
- Building deployment confidence

**This validates:**
- What smoke tests don't (automated validation)
- Full API integration
- Database state consistency
- User journeys end-to-end

---

## Ready to Test?

1. Open: `E2E_TESTING_EXECUTION_GUIDE.md`
2. Follow: Setup instructions
3. Run: `npm run test:e2e`
4. Review: Results and report

---

**Status:** ✅ Ready for Execution

**Next step:** `npm run test:e2e` 🚀
