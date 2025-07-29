# E2E Test Infrastructure

This directory contains the comprehensive E2E test infrastructure for the Loom App, providing reliable and consistent testing capabilities with proper database setup, user management, and test isolation.

## 🏗️ Architecture Overview

The test infrastructure consists of several key components:

### Core Components

- **Global Setup/Teardown**: Manages test database and user creation/cleanup
- **Database Manager**: Handles test data seeding and cleanup
- **User Manager**: Creates and manages test user accounts
- **Auth Helpers**: Provides authentication utilities for tests
- **Test Data Fixtures**: Predefined test data for consistent testing

### Directory Structure

```
tests/
├── README.md                 # This file
├── global-setup.ts          # Global test setup
├── global-teardown.ts       # Global test cleanup
├── helpers/                 # Test utility functions
│   ├── index.ts            # Helper exports
│   ├── test-data.ts        # Test fixtures and data
│   ├── test-env.ts         # Environment configuration
│   ├── database-manager.ts # Database operations
│   ├── user-manager.ts     # User management
│   └── auth-helpers.ts     # Authentication utilities
└── examples/               # Example test implementations
    └── auth-example.spec.ts # Authentication test examples
```

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Supabase CLI** (for local development)
3. **Playwright** (installed via npm)

### Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Install Playwright browsers**:
```bash
npx playwright install
```

3. **Start local Supabase** (optional, for local development):
```bash
supabase start
```

4. **Configure test environment**:
Copy `.env.test` to `.env.test.local` and customize if needed.

### Running Tests

#### Using the provided script (recommended):
```bash
# Run all E2E tests
./scripts/run-e2e-tests.sh

# Run specific test pattern
./scripts/run-e2e-tests.sh --pattern "auth"

# Run in debug mode
./scripts/run-e2e-tests.sh --debug

# Run with UI
./scripts/run-e2e-tests.sh --ui
```

#### Using Playwright directly:
```bash
# Run all tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug
```

## 👥 Test Users

The infrastructure automatically creates the following test users:

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| `test@example.com` | `password123` | client | General test client |
| `client@example.com` | `password123` | client | Specific client for role testing |
| `coach@example.com` | `password123` | coach | Primary test coach |
| `coach2@example.com` | `password123` | coach | Secondary test coach |
| `admin@example.com` | `password123` | admin | Administrator user |
| `client2@example.com` | `password123` | client | Secondary test client |

## 📊 Test Data

The infrastructure provides comprehensive test fixtures:

### Sessions
- Completed sessions for testing history
- Scheduled sessions for booking tests
- Various durations and statuses

### Coach Availability  
- Regular business hours
- Different timezones
- Varied schedules for testing

### Reflections
- Client progress reflections
- Mood ratings and insights
- Goals for next sessions

### Coach Notes
- Session documentation
- Private and shared notes
- Tagged content

## 🔧 Helper Functions

### Authentication Helpers

```typescript
import { createAuthHelper } from '../helpers';

const authHelper = createAuthHelper(page);

// Sign in with role
await authHelper.signInUserByRole('coach');

// Sign in with credentials
await authHelper.signInUser('test@example.com', 'password123');

// Check if signed in
const isSignedIn = await authHelper.isUserSignedIn();

// Sign out
await authHelper.signOutUser();
```

### Test Data Helpers

```typescript
import { getTestUserByRole, getTestCoaches } from '../helpers';

// Get specific test user
const coach = getTestUserByRole('coach');

// Get all coaches
const coaches = getTestCoaches();

// Get user by email
const user = getTestUserByEmail('test@example.com');
```

### Database Helpers

```typescript
import { TestDatabaseManager } from '../helpers';

const dbManager = new TestDatabaseManager(config);
await dbManager.connect();
await dbManager.cleanup();
await dbManager.seedDatabase();
```

## 🎯 Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { createAuthHelper, testConstants } from '../helpers';

test.describe('Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup runs automatically via global setup
    await page.goto('/');
  });

  test('should test feature', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    
    // Sign in as needed
    await authHelper.signInUserByRole('client');
    
    // Test your feature
    await page.click(testConstants.selectors.someButton);
    
    // Make assertions
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Using Test Constants

```typescript
import { testConstants } from '../helpers';

// Use predefined selectors
await page.click(testConstants.selectors.signInButton);

// Use timeout constants
await page.waitForSelector('div', { timeout: testConstants.DEFAULT_TIMEOUT });

// Use error messages
await expect(page.locator(`text=${testConstants.errorMessages.required}`)).toBeVisible();
```

## 🔒 Test Isolation

The infrastructure ensures test isolation through:

1. **Global Setup/Teardown**: Clean database state before and after test runs
2. **User Management**: Consistent test users across runs
3. **Storage State**: Clean browser storage for each test
4. **Database Cleanup**: Automatic cleanup of test data

## 🌍 Environment Configuration

### Environment Variables

Key environment variables for testing:

```bash
# Test Mode
NODE_ENV=test
TEST_MODE=true
PLAYWRIGHT_TEST=true

# Database (Local Supabase)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Test Configuration
TEST_TIMEOUT=60000
TEST_RETRIES=1
TEST_DEBUG=false
```

### Test vs Production

The infrastructure automatically detects the environment and configures accordingly:

- **Local Development**: Uses local Supabase instance
- **CI/CD**: Uses configured test database
- **Feature Flags**: Disabled for consistent testing

## 🐛 Debugging Tests

### Debug Mode
```bash
./scripts/run-e2e-tests.sh --debug
```

### Playwright UI
```bash
./scripts/run-e2e-tests.sh --ui
```

### Console Logging
```typescript
import { testChecks } from '../helpers';

if (testChecks.isDebug()) {
  console.log('Debug information');
}
```

### Screenshots and Videos
- Screenshots: Captured on failure
- Videos: Recorded for failed tests
- Traces: Available on retry

## 🚦 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: true
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_ROLE_KEY }}
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 📈 Best Practices

### 1. Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Keep tests focused and independent

### 2. Data Management
- Use provided test fixtures
- Don't create unnecessary test data
- Clean up custom test data if created

### 3. Authentication
- Use auth helpers for consistent sign-in
- Test both authenticated and unauthenticated states
- Verify role-based access control

### 4. Assertions
- Use specific selectors (data-testid preferred)
- Wait for elements to be visible/enabled
- Test both positive and negative cases

### 5. Error Handling
- Test error states and edge cases
- Verify error messages are displayed
- Test form validation

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure Supabase is running locally
   - Check environment variables
   - Verify database permissions

2. **Test Users Not Found**
   - Check global setup completed successfully
   - Verify user creation in logs
   - Check Supabase auth dashboard

3. **Tests Timing Out**
   - Increase timeout in playwright.config.ts
   - Check if application is running
   - Verify network connectivity

4. **Authentication Issues**
   - Clear browser storage between tests
   - Check auth token validity
   - Verify user permissions

### Debugging Steps

1. **Enable Debug Mode**:
```bash
TEST_DEBUG=true npm run test:e2e:debug
```

2. **Check Logs**:
   - Global setup logs
   - Database operation logs
   - Authentication logs

3. **Inspect Database**:
   - Check Supabase dashboard
   - Verify test data exists
   - Check user permissions

4. **Browser Developer Tools**:
   - Network tab for API calls
   - Console for JavaScript errors
   - Application tab for storage

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Testing](https://nextjs.org/docs/testing)
- [Project Documentation](../README.md)

## 🤝 Contributing

When adding new tests or modifying the infrastructure:

1. Follow the established patterns
2. Update test fixtures if needed
3. Add appropriate cleanup
4. Document new helpers or utilities
5. Test in both local and CI environments

For questions or issues, please refer to the project documentation or create an issue.