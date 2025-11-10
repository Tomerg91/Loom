# Issue #149: E2E Testing Execution Guide

**Status:** Ready to Execute
**Priority:** P1 - High
**Environment:** Staging
**Estimated Time:** 1-2 hours
**Framework:** Playwright
**Test Count:** 14 automated tests

---

## Overview

This guide provides step-by-step instructions for executing the 14 automated end-to-end tests in the staging environment. These tests validate critical user journeys, API integrations, and database state.

---

## Prerequisites Checklist

Before starting E2E tests, ensure you have:

### Environment Requirements
- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Staging environment accessible
- [ ] Database migrations applied (Issue #146)
- [ ] Smoke tests passed (Issue #147)

### Local Setup
- [ ] Project dependencies installed: `npm install`
- [ ] Playwright browsers installed: `npx playwright install`
- [ ] `.env.test` file configured with staging credentials

### Test Accounts
- [ ] Coach account created: `test-coach@loom-staging.com`
- [ ] Client account created: `test-client@loom-staging.com`
- [ ] Admin account created: `test-admin@loom-staging.com`
- [ ] All accounts verified and accessible

### Staging Configuration
- [ ] Staging URL accessible
- [ ] Database health check passed
- [ ] Performance indexes applied (Issue #146)
- [ ] Email service working
- [ ] MFA enabled (if testing MFA scenarios)

---

## Environment Configuration

### Step 1: Install Dependencies

```bash
# Navigate to project root
cd /Users/tomergalansky/Desktop/loom-app

# Install Node packages
npm install

# Install Playwright browsers
npx playwright install

# Verify Playwright installed
npx playwright --version
```

### Step 2: Configure Environment Variables

Create `.env.test` file in project root:

```bash
# Staging Environment Configuration
NODE_ENV=test
NEXT_PUBLIC_APP_URL=https://staging.loom-app.com

# Supabase Staging (get from Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://[staging-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[staging-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[staging-service-role-key]

# Test Accounts
TEST_COACH_EMAIL=test-coach@loom-staging.com
TEST_COACH_PASSWORD=[secure-password]
TEST_CLIENT_EMAIL=test-client@loom-staging.com
TEST_CLIENT_PASSWORD=[secure-password]
TEST_ADMIN_EMAIL=test-admin@loom-staging.com
TEST_ADMIN_PASSWORD=[secure-password]

# Test Configuration
TEST_TIMEOUT=60000
TEST_SLOW_THRESHOLD=10000
HEADLESS=true
```

### Step 3: Verify Staging Access

```bash
# Test staging API connectivity
curl https://staging.loom-app.com/api/health

# Expected response:
# {"status":"ok","timestamp":"2025-11-06T..."}
```

---

## Running E2E Tests

### Option 1: Run All Tests (Default)

```bash
# Run all 14 E2E tests
npm run test:e2e

# Expected output:
# ✓ 14 passed in ~5m
```

### Option 2: Run with UI (Visual Test Runner)

```bash
# Run tests with interactive UI
npm run test:e2e:ui

# This opens Playwright Inspector where you can:
# - Watch tests run in real-time
# - Pause and resume execution
# - Step through individual actions
# - View element locators
```

### Option 3: Run in Headed Mode (See Browser)

```bash
# Run tests with visible browser window
npm run test:e2e:headed

# Useful for:
# - Debugging visual issues
# - Understanding test flow
# - Verifying UI interactions
```

### Option 4: Run with Debug Mode

```bash
# Run tests with detailed debugging output
npm run test:e2e:debug

# Or enable debug for specific browser:
DEBUG=pw:api npm run test:e2e
```

### Option 5: Run Specific Test File

```bash
# Run only authentication tests
npx playwright test tests/e2e/auth.spec.ts

# Run only resource library tests
npx playwright test tests/e2e/resource-library.spec.ts

# Run only booking tests
npx playwright test tests/e2e/session-booking.spec.ts
```

### Option 6: Run Tests Matching Pattern

```bash
# Run only tests matching "signin"
npx playwright test --grep "signin"

# Run only tests matching "mfa"
npx playwright test --grep "mfa"

# Run all except admin tests
npx playwright test --grep-invert "admin"
```

### Option 7: Run Single Test

```bash
# Run specific test by name
npx playwright test --grep "user can register with email and password"

# Run specific test from specific file
npx playwright test tests/e2e/auth.spec.ts -g "user can sign in"
```

---

## Test Suite Breakdown

### Category 1: Authentication (4 tests) - `auth.spec.ts`

**Tests included:**
1. User registration with email and password
2. User sign-in with email and password
3. User sign-out and session cleanup
4. Password reset flow

**Expected duration:** 20-30 seconds

**Critical for:** User account lifecycle

---

### Category 2: MFA (2 tests) - `mfa.spec.ts`

**Tests included:**
1. Coach can enable MFA
2. User can sign in with MFA

**Expected duration:** 25-35 seconds

**Critical for:** Security - multi-factor authentication

---

### Category 3: Session Booking (2 tests) - `session-booking.spec.ts`

**Tests included:**
1. Client can book session with coach
2. Coach can view booked sessions

**Expected duration:** 30-40 seconds

**Critical for:** Core booking functionality

---

### Category 4: Resource Library (2 tests) - `resource-library.spec.ts`

**Tests included:**
1. Coach can upload and share resource
2. Client can view shared resources

**Expected duration:** 40-50 seconds

**Critical for:** Resource management and sharing

---

### Category 5: Practice Journal (2 tests) - `practice-journal.spec.ts`

**Tests included:**
1. Client can create practice journal entry
2. Coach can view client shared journal

**Expected duration:** 20-30 seconds

**Critical for:** Journal functionality and privacy

---

### Category 6: Admin Functions (2 tests) - `admin.spec.ts`

**Tests included:**
1. Admin can access system dashboard
2. Non-admin users cannot access admin routes (RBAC)

**Expected duration:** 20-30 seconds

**Critical for:** Admin access and authorization

---

## Interpreting Test Results

### Successful Test Run
```
✓ 14 passed (5m 23s)
  ✓ Authentication (4)
  ✓ MFA (2)
  ✓ Session Booking (2)
  ✓ Resource Library (2)
  ✓ Practice Journal (2)
  ✓ Admin Functions (2)
```

### Test Failure
```
✗ 1 failed
  ✗ User Registration
    Error: timeout after 30000ms
    Location: tests/e2e/auth.spec.ts:15:1
```

### What to Check If Tests Fail

1. **Timeout errors**
   - Check staging server performance
   - Verify network connectivity
   - Increase timeout in playwright.config.ts

2. **Element not found**
   - Verify UI elements haven't changed
   - Check selector paths
   - Run with UI mode to debug

3. **Authentication failures**
   - Verify test account exists in staging
   - Check password is correct
   - Verify email is not locked

4. **Database errors**
   - Check database is accessible
   - Verify migrations applied
   - Check RLS policies

---

## Performance Benchmarks

Each test should complete within these timeframes:

| Test Category | Target | Warning | Critical |
|---------------|--------|---------|----------|
| Authentication | < 5s | 5-10s | > 10s |
| MFA | < 8s | 8-15s | > 15s |
| Session Booking | < 10s | 10-20s | > 20s |
| Resource Upload | < 15s | 15-30s | > 30s |
| Journal | < 5s | 5-10s | > 10s |
| Admin | < 5s | 5-10s | > 10s |
| **Total Suite** | < 5 min | 5-10 min | > 10 min |

### Monitoring Performance

Tests automatically collect performance metrics. Check output:

```
Slow tests:
  0.5s User Registration (2.5s)
  1.2s Client Booking (8.3s)
```

---

## Debugging Failed Tests

### Method 1: Run with UI Mode

```bash
npm run test:e2e:ui

# Then:
# - Select failing test
# - Step through actions
# - View element locators
# - Check network requests
```

### Method 2: Run Single Test with Trace

```bash
npx playwright test tests/e2e/auth.spec.ts --trace on

# View trace file:
npx playwright show-trace trace.zip
```

### Method 3: Enable Debug Logging

```bash
DEBUG=pw:api npm run test:e2e

# Shows all API calls and responses
```

### Method 4: Take Screenshots on Failure

Screenshots are automatically captured in `playwright-report/` directory when tests fail.

---

## Generating Test Reports

### HTML Report

```bash
# Generate after tests run
npx playwright show-report

# Opens in browser:
# - Test results by category
# - Timing for each test
# - Screenshots of failures
# - Video recordings (if enabled)
# - Network logs
```

### JSON Report

```bash
# Export as JSON for CI integration
npx playwright test --reporter=json > test-results.json

# Parse results:
cat test-results.json | jq '.suites[].specs[].tests[0].status'
```

### List Report

```bash
# Print results to console
npx playwright test --reporter=list
```

---

## CI/CD Integration

### GitHub Actions

Tests can run in CI pipeline. Configuration in `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
          TEST_COACH_EMAIL: ${{ secrets.TEST_COACH_EMAIL }}
        run: npm run test:e2e

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Troubleshooting Common Issues

### Tests Timing Out

**Problem:** Tests exceed timeout (30000ms)

**Solutions:**
```bash
# Increase timeout in playwright.config.ts
timeout: 60000

# Or increase per test:
test.setTimeout(60000)
```

### Element Not Found

**Problem:** `Error: locator.click: Target element closed`

**Solutions:**
- Verify UI selectors in code match current UI
- Check if element appears after delay
- Add wait conditions: `waitForLoadState('networkidle')`

### Authentication Failures

**Problem:** `Error: Invalid credentials`

**Solutions:**
- Verify test account exists in staging
- Check password hasn't expired
- Reset test account if needed
- Verify email is correct

### Network Errors

**Problem:** API calls fail with 5xx errors

**Solutions:**
- Check staging server status
- Verify network connectivity
- Check API logs in staging
- Restart staging services if needed

### MFA Not Working

**Problem:** TOTP code rejected

**Solutions:**
- Sync device time with NTP
- Verify TOTP secret correct
- Use backup codes instead
- Re-enable MFA with new secret

---

## Best Practices

### Running Tests

1. **Run locally first** before pushing to CI
2. **Run against staging** not production
3. **Use headless mode** for CI/automation
4. **Use headed mode** for debugging locally
5. **Check reports** after each run

### Debugging

1. **Start with single test** to isolate issue
2. **Use UI mode** to see what's happening
3. **Check browser console** for JavaScript errors
4. **Review network tab** for API failures
5. **Check test logs** for detailed output

### Maintenance

1. **Update selectors** when UI changes
2. **Keep test data fresh** for consistency
3. **Monitor performance** trends over time
4. **Clean up old reports** periodically
5. **Review test coverage** regularly

---

## Success Criteria

✅ **All tests pass if:**

1. All 14 tests execute successfully
2. No flaky tests (consistent pass/fail)
3. Test suite completes in < 5 minutes
4. No timeout errors
5. All performance targets met
6. No unhandled errors
7. Clean test output

❌ **Block production if:**

- Any test fails consistently
- Tests timeout regularly
- Critical functionality broken
- Performance severely degraded
- Database state corrupted

---

## After Tests Complete

### If All Pass ✅
1. Review test report
2. Document results
3. Update GitHub Issue #149
4. Proceed to production deployment

### If Some Fail ⚠️
1. Review failure details
2. Check error messages
3. Run debug mode for failing test
4. Fix issues and re-run
5. Repeat until all pass

### If Critical Failures ❌
1. Document all failures
2. Escalate immediately
3. Don't deploy to production
4. Fix and re-test from scratch

---

## Test Results Template

```markdown
## E2E Test Results - [Date]

**Environment:** Staging
**Tester:** CI/Local
**Duration:** [X min]
**Playwright Version:** [X.Y.Z]

### Summary
- Total Tests: 14
- Passed: [X]
- Failed: [Y]
- Skipped: [Z]
- Success Rate: [X]%

### Category Results
| Category | Tests | Passed | Failed | Time |
|----------|-------|--------|--------|------|
| Auth | 4 | | | |
| MFA | 2 | | | |
| Booking | 2 | | | |
| Resources | 2 | | | |
| Journal | 2 | | | |
| Admin | 2 | | | |

### Failed Tests
[List any failed tests with error messages]

### Performance
- Average test time: [X]s
- Slowest test: [Test name] ([X]s)
- Fastest test: [Test name] ([X]s)

### Sign-Off
- [ ] All tests pass
- [ ] Performance acceptable
- [ ] Ready for production
- [ ] No blocking issues
```

---

## Next Steps

After E2E tests pass:

1. **Document Results**
   - Review test report
   - Check performance metrics
   - Update GitHub Issue #149

2. **Address Any Issues**
   - Fix failing tests
   - Improve slow tests
   - Update UI if needed

3. **Proceed to Deployment**
   - Follow deployment checklist
   - Deploy to production
   - Monitor in production

4. **Post-Deployment**
   - Monitor error rates
   - Check performance metrics
   - Gather user feedback

---

## Resources

- **Playwright Docs:** https://playwright.dev
- **Test Files:** `tests/e2e/`
- **Config:** `playwright.config.ts`
- **Related Guides:**
  - Issue #146: Migration guide
  - Issue #147: Smoke testing guide
  - Issue #148: ESLint audit

---

## Contact & Support

For issues during E2E testing:
- **GitHub:** Issue #149
- **Playwright:** Debug output and traces
- **Staging:** Check staging logs
- **Team:** Review test failures together

---

**Ready to run tests?** Start with: `npm run test:e2e` 🚀
