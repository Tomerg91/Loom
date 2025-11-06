# E2E Testing Guide - Sprint 7

**Issue:** #149 - Run E2E tests in staging environment
**Priority:** P1 - High
**Created:** November 6, 2025

## Overview

This guide provides comprehensive instructions for executing the 14 end-to-end test cases in the staging environment. These automated tests validate critical user journeys, API integrations, and database state.

## Current Status

✅ **Tests Written:** 14 test cases (from Sprint 06)
✅ **Test Framework:** Playwright
⏳ **Status:** Tests written but blocked by network restrictions in development
🎯 **Goal:** Execute in staging/CI environment

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] Staging environment accessible
- [ ] Environment variables configured
- [ ] Database migrations applied (Issue #146)
- [ ] Smoke tests passed (Issue #147)

## Test Suite Overview

### Test Coverage

| Category | Test Count | Files |
|----------|-----------|-------|
| Authentication | 4 | `auth.spec.ts`, `mfa.spec.ts` |
| Session Booking | 2 | `session-booking.spec.ts` |
| Resource Library | 2 | `resource-library.spec.ts` |
| Practice Journal | 2 | `practice-journal.spec.ts` |
| Admin Functions | 2 | `admin.spec.ts` |
| API Integration | 2 | `api-integration.spec.ts` |
| **Total** | **14** | **6 files** |

### Test Files Location

```
tests/
├── e2e/
│   ├── auth.spec.ts                 # Authentication flows (4 tests)
│   ├── mfa.spec.ts                  # MFA flows (2 tests)
│   ├── session-booking.spec.ts      # Booking flows (2 tests)
│   ├── resource-library.spec.ts     # Resource management (2 tests)
│   ├── practice-journal.spec.ts     # Journal functionality (2 tests)
│   └── admin.spec.ts                # Admin operations (2 tests)
├── fixtures/
│   ├── test-users.json              # Test user data
│   ├── test-resources/              # Sample files for upload
│   └── test-data.sql                # Database seed data
├── global-setup.ts                  # Test environment setup
├── global-teardown.ts               # Cleanup after tests
└── playwright.config.ts             # Playwright configuration
```

## Environment Setup

### 1. Install Dependencies

```bash
# Install Node packages
npm install

# Install Playwright browsers
npx playwright install

# Verify installation
npx playwright --version
```

### 2. Configure Environment Variables

Create `.env.test` file:

```bash
# Staging Environment Configuration
NODE_ENV=test
NEXT_PUBLIC_APP_URL=https://staging.loom-app.com

# Supabase Staging
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

### 3. Verify Staging Access

```bash
# Test staging API connectivity
curl https://staging.loom-app.com/api/health

# Expected response:
# {"status":"ok","timestamp":"2025-11-06T..."}
```

## Running E2E Tests

### Local Execution

#### Run All Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (visual test runner)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run with debug mode
npm run test:e2e:debug
```

#### Run Specific Test Files

```bash
# Run only auth tests
npx playwright test tests/e2e/auth.spec.ts

# Run only resource library tests
npx playwright test tests/e2e/resource-library.spec.ts

# Run tests matching pattern
npx playwright test --grep "booking"
```

#### Run Single Test

```bash
# Run specific test by name
npx playwright test --grep "user can sign in with email and password"
```

### CI/CD Execution

#### GitHub Actions

The E2E tests should run automatically in CI. Configuration in `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop, 'claude/*']
  pull_request:
    branches: [main, develop]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.STAGING_SERVICE_ROLE_KEY }}
          TEST_COACH_EMAIL: ${{ secrets.TEST_COACH_EMAIL }}
          TEST_COACH_PASSWORD: ${{ secrets.TEST_COACH_PASSWORD }}
          TEST_CLIENT_EMAIL: ${{ secrets.TEST_CLIENT_EMAIL }}
          TEST_CLIENT_PASSWORD: ${{ secrets.TEST_CLIENT_PASSWORD }}
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

#### Manual CI Trigger

```bash
# Trigger E2E tests manually on GitHub
gh workflow run e2e-tests.yml --ref claude/sprint-7-milestones-011CUrqxvHXRZF7euhHnoA2c
```

### Staging Environment Execution

```bash
# Point tests to staging
export NODE_ENV=staging
export NEXT_PUBLIC_APP_URL=https://staging.loom-app.com

# Run tests against staging
npm run test:e2e
```

## Test Details

### 1. Authentication Tests (`auth.spec.ts`)

**Test 1: User Registration**
```typescript
test('user can register with email and password', async ({ page }) => {
  // Navigate to signup
  // Fill registration form
  // Submit and verify email sent
  // Confirm email and verify login
});
```

**Test 2: Sign-In**
```typescript
test('user can sign in with email and password', async ({ page }) => {
  // Navigate to signin
  // Enter credentials
  // Verify redirect to dashboard
  // Check session persists
});
```

**Test 3: Sign-Out**
```typescript
test('user can sign out successfully', async ({ page }) => {
  // Sign in first
  // Click sign out
  // Verify redirect and session cleared
});
```

**Test 4: Password Reset**
```typescript
test('user can reset password', async ({ page }) => {
  // Request password reset
  // Click reset link (from email)
  // Set new password
  // Sign in with new password
});
```

### 2. MFA Tests (`mfa.spec.ts`)

**Test 5: MFA Setup**
```typescript
test('coach can enable MFA', async ({ page }) => {
  // Navigate to settings
  // Enable MFA
  // Scan QR code (use test TOTP)
  // Verify MFA enabled
});
```

**Test 6: MFA Sign-In**
```typescript
test('user can sign in with MFA', async ({ page }) => {
  // Sign in with credentials
  // Enter TOTP code
  // Verify successful authentication
});
```

### 3. Session Booking Tests (`session-booking.spec.ts`)

**Test 7: Client Books Session**
```typescript
test('client can book session with coach', async ({ page }) => {
  // Sign in as client
  // Navigate to booking page
  // Select coach and time slot
  // Confirm booking
  // Verify session in dashboard
});
```

**Test 8: Coach Views Bookings**
```typescript
test('coach can view booked sessions', async ({ page }) => {
  // Sign in as coach
  // Navigate to sessions
  // Verify booked session appears
  // Check session details
});
```

### 4. Resource Library Tests (`resource-library.spec.ts`)

**Test 9: Coach Uploads Resource**
```typescript
test('coach can upload and share resource', async ({ page }) => {
  // Sign in as coach
  // Navigate to resources
  // Upload file
  // Share with client
  // Verify resource listed
});
```

**Test 10: Client Accesses Resource**
```typescript
test('client can view shared resources', async ({ page }) => {
  // Sign in as client
  // Navigate to resources
  // Verify shared resource appears
  // Download/view resource
});
```

### 5. Practice Journal Tests (`practice-journal.spec.ts`)

**Test 11: Client Creates Entry**
```typescript
test('client can create practice journal entry', async ({ page }) => {
  // Sign in as client
  // Navigate to journal
  // Create new entry
  // Add content and mood
  // Save entry
});
```

**Test 12: Coach Views Shared Entry**
```typescript
test('coach can view client shared journal', async ({ page }) => {
  // Sign in as coach
  // Navigate to client profile
  // View practice journal
  // Verify shared entries visible
});
```

### 6. Admin Tests (`admin.spec.ts`)

**Test 13: Admin Dashboard Access**
```typescript
test('admin can access system dashboard', async ({ page }) => {
  // Sign in as admin
  // Navigate to admin dashboard
  // Verify system metrics display
  // Check user management accessible
});
```

**Test 14: RBAC Enforcement**
```typescript
test('non-admin users cannot access admin routes', async ({ page }) => {
  // Sign in as client
  // Attempt to access admin routes
  // Verify 403 or redirect
  // Ensure no unauthorized access
});
```

## Performance Benchmarks

Each test should complete within these timeframes:

| Test | Target | Warning | Critical |
|------|--------|---------|----------|
| Authentication | < 5s | 5-10s | > 10s |
| MFA Flow | < 8s | 8-15s | > 15s |
| Session Booking | < 10s | 10-20s | > 20s |
| Resource Upload | < 15s | 15-30s | > 30s |
| Journal Entry | < 5s | 5-10s | > 10s |
| Admin Dashboard | < 5s | 5-10s | > 10s |

### Performance Monitoring

Tests automatically collect performance metrics:

```typescript
// Performance tracking in tests
test('booking performance benchmark', async ({ page }) => {
  const startTime = Date.now();

  // Perform booking flow
  await page.goto('/client/book');
  await page.fill('[name="session-type"]', 'coaching');
  await page.click('[data-testid="confirm-booking"]');
  await page.waitForSelector('[data-testid="booking-success"]');

  const duration = Date.now() - startTime;

  // Assert performance target
  expect(duration).toBeLessThan(10000); // 10 seconds
});
```

## Success Criteria

✅ **All tests pass if:**

1. **Execution:**
   - All 14 tests pass
   - No flaky tests (consistent results across 3 runs)
   - Test suite completes in < 10 minutes

2. **Performance:**
   - All tests within target timeframes
   - API calls < 2 seconds
   - Page loads < 3 seconds

3. **Quality:**
   - No test timeouts
   - No unhandled errors
   - Clean test output

4. **Documentation:**
   - Test results saved
   - Screenshots captured for failures
   - Performance metrics recorded

## Handling Test Failures

### Debugging Failed Tests

```bash
# Run with debug output
DEBUG=pw:api npm run test:e2e

# Run single failed test with trace
npx playwright test --trace on tests/e2e/auth.spec.ts

# View trace file
npx playwright show-trace trace.zip
```

### Common Failure Scenarios

**Timeout Errors:**
```
Test timeout of 30000ms exceeded
```
**Solution:**
- Increase timeout in `playwright.config.ts`
- Check network latency to staging
- Verify staging server not overloaded

**Element Not Found:**
```
Error: locator.click: Target closed
```
**Solution:**
- Check if element selector changed
- Verify page navigation working
- Add wait conditions

**Authentication Failures:**
```
Error: Invalid credentials
```
**Solution:**
- Verify test account exists in staging
- Check password hasn't expired
- Reset test account if needed

### Test Retries

Configure automatic retries in `playwright.config.ts`:

```typescript
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  timeout: 60000,
  expect: {
    timeout: 10000
  }
});
```

## Test Reports

### HTML Report

After running tests:

```bash
# Generate and open HTML report
npx playwright show-report

# Report location: playwright-report/index.html
```

Report includes:
- Test pass/fail status
- Execution time per test
- Screenshots of failures
- Video recordings (if enabled)
- Network logs

### JSON Report

Export results as JSON:

```bash
# Generate JSON report
npx playwright test --reporter=json > test-results.json

# Parse results
cat test-results.json | jq '.suites[].specs[]' | jq '{title: .title, status: .tests[0].status}'
```

### CI Dashboard

View test results in GitHub Actions:
1. Go to repository → Actions
2. Select "E2E Tests" workflow
3. View latest run
4. Download artifacts (screenshots, videos, traces)

## Database State Verification

Some tests verify database state after operations:

```typescript
import { createClient } from '@supabase/supabase-js';

test('booking creates database record', async ({ page }) => {
  // Perform booking in UI
  // ...

  // Verify in database
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('client_id', testClientId)
    .single();

  expect(error).toBeNull();
  expect(data).toBeDefined();
  expect(data.status).toBe('scheduled');
});
```

## Test Data Management

### Setup

```bash
# Run global setup (creates test users, seed data)
npm run test:e2e:setup
```

### Teardown

```bash
# Clean up test data
npm run test:e2e:teardown
```

### Test Isolation

Each test should be independent:
- Create its own test data
- Clean up after itself
- Not depend on other tests

Example:

```typescript
test('resource upload', async ({ page }) => {
  // Setup: Create test coach
  const coach = await createTestCoach();

  // Test: Upload resource
  await signInAs(page, coach);
  // ... test logic ...

  // Teardown: Delete test data
  await deleteTestCoach(coach.id);
});
```

## Troubleshooting

### Network Restrictions

If tests fail due to network restrictions:

```bash
# Check connectivity
curl -I https://staging.loom-app.com

# Test from CI environment
# (Should work in CI even if local network blocks it)
```

### Staging Database Issues

```bash
# Check database health
curl https://staging.loom-app.com/api/health

# Verify migrations applied
# (See Issue #146 guide)
```

### Browser Issues

```bash
# Reinstall browsers
npx playwright install --force

# Clear Playwright cache
rm -rf ~/.cache/ms-playwright
npx playwright install
```

## Test Results Template

```markdown
## E2E Test Results - [Date]

**Environment:** Staging
**Tester:** [Name/CI]
**Duration:** [Total time]
**Playwright Version:** [Version]

### Summary
- Total Tests: 14
- Passed: [X]
- Failed: [Y]
- Skipped: [Z]
- Success Rate: [X]%

### Detailed Results

| # | Test Name | Status | Duration | Notes |
|---|-----------|--------|----------|-------|
| 1 | User Registration | ✅ | 4.2s | |
| 2 | Sign-In | ✅ | 2.1s | |
| 3 | Sign-Out | ✅ | 1.5s | |
| 4 | Password Reset | ✅ | 6.8s | |
| 5 | MFA Setup | ✅ | 7.3s | |
| 6 | MFA Sign-In | ✅ | 5.1s | |
| 7 | Client Books Session | ✅ | 8.9s | |
| 8 | Coach Views Bookings | ✅ | 3.2s | |
| 9 | Coach Uploads Resource | ✅ | 12.4s | |
| 10 | Client Accesses Resource | ✅ | 4.1s | |
| 11 | Client Creates Journal Entry | ✅ | 3.8s | |
| 12 | Coach Views Shared Journal | ✅ | 2.9s | |
| 13 | Admin Dashboard Access | ✅ | 3.5s | |
| 14 | RBAC Enforcement | ✅ | 2.2s | |

### Performance Metrics
- Average test duration: [X]s
- Slowest test: [Test name] ([X]s)
- Fastest test: [Test name] ([X]s)

### Failed Tests Details
[List any failures with error messages and screenshots]

### Flaky Tests
[List tests that passed on retry]

### Recommendations
- [Recommendation 1]
- [Recommendation 2]

### Sign-Off
- [ ] All tests passed
- [ ] No flaky tests
- [ ] Performance targets met
- [ ] Ready for production

**Tested by:** [Name]
**Date:** [Date]
```

## Next Steps

After E2E tests pass:

1. **Update Issue #149** with results
2. **Complete any remaining Sprint 7 tasks**
3. **Proceed to production deployment**
4. **Continue monitoring in production**

## Related Documentation

- [Issue #146: Database Migrations](./STAGING_MIGRATION_GUIDE.md)
- [Issue #147: Smoke Testing](./SMOKE_TESTING_GUIDE_SPRINT7.md)
- [Issue #148: ESLint Fixes](./ESLINT_AUDIT_SPRINT7.md)
- [Launch Checklist](./launch/checklist.md)

## Contact

For issues or questions:
- GitHub Issue: #149
- Slack: #loom-dev
- Email: dev-team@loom-app.com
