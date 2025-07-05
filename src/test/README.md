# Testing Guide

This document provides comprehensive information about the testing setup and practices for the Loom coaching platform.

## Testing Stack

- **Unit & Integration Tests**: Vitest + React Testing Library
- **E2E Tests**: Playwright
- **Coverage**: Vitest with v8 provider
- **Mocking**: Vitest built-in mocks + MSW for API mocking

## Test Structure

```
src/test/
├── setup.ts                 # Test environment setup
├── utils.tsx                # Testing utilities and helpers
├── coverage.config.ts       # Coverage configuration
├── jest.polyfills.js       # Environment polyfills
├── components/             # Component unit tests
│   ├── auth/
│   ├── notifications/
│   ├── sessions/
│   └── ...
├── api/                    # API route tests
│   ├── sessions.test.ts
│   ├── notifications.test.ts
│   └── ...
├── integration/            # Integration tests
│   ├── auth-flow.test.tsx
│   ├── session-booking.test.tsx
│   └── ...
├── e2e/                    # End-to-end tests
│   ├── auth.spec.ts
│   ├── session-booking.spec.ts
│   ├── coach-dashboard.spec.ts
│   └── ...
└── lib/                    # Service layer tests
    ├── database/
    ├── auth/
    └── ...
```

## Running Tests

### Unit & Integration Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- signin-form.test.tsx

# Run tests matching pattern
npm run test -- --grep "authentication"
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui

# Run specific E2E test
npx playwright test auth.spec.ts

# Run E2E tests in specific browser
npx playwright test --project=chromium
```

### Coverage Reports

Coverage reports are generated in the `coverage/` directory:

- `coverage/index.html` - HTML coverage report
- `coverage/lcov.info` - LCOV format for CI/CD
- `coverage/coverage-final.json` - JSON format

## Writing Tests

### Component Tests

```tsx
import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { MyComponent } from '@/components/my-component';

describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    renderWithProviders(<MyComponent />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await expect(screen.getByText('Clicked')).toBeVisible();
  });
});
```

### API Route Tests

```tsx
import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/sessions/route';

describe('/api/sessions', () => {
  it('creates session successfully', async () => {
    const request = new Request('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Session' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
  });
});
```

### E2E Tests

```tsx
import { test, expect } from '@playwright/test';

test('user can book a session', async ({ page }) => {
  await page.goto('/sessions');
  
  await page.click('[data-testid="book-session"]');
  await page.fill('[data-testid="title"]', 'Test Session');
  await page.click('[data-testid="submit"]');
  
  await expect(page.locator('text=Session booked')).toBeVisible();
});
```

## Testing Utilities

### Test Data Factories

```tsx
import { createMockSession, createMockUser } from '@/test/utils';

const session = createMockSession({
  title: 'Custom Session',
  status: 'scheduled',
});
```

### Mocking

```tsx
// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

// Mock API responses
mockFetch({
  success: true,
  data: { id: '123' },
});

// Mock TanStack Query
const mockUseQuery = vi.fn().mockReturnValue({
  data: mockData,
  isLoading: false,
});
```

## Coverage Requirements

- **Components**: 85% coverage (branches, functions, lines, statements)
- **API Routes**: 90% coverage
- **Database Services**: 95% coverage
- **Auth Services**: 95% coverage
- **Overall**: 80% coverage

## Best Practices

### 1. Test Structure

- Use descriptive test names
- Group related tests with `describe` blocks
- Follow AAA pattern (Arrange, Act, Assert)

### 2. Component Testing

- Test user interactions, not implementation details
- Use semantic queries (`getByRole`, `getByLabelText`)
- Test accessibility features
- Mock external dependencies

### 3. API Testing

- Test all HTTP methods and status codes
- Validate request/response schemas
- Test authentication and authorization
- Test error handling

### 4. E2E Testing

- Focus on critical user journeys
- Use data-testid attributes for reliable selectors
- Test cross-browser compatibility
- Keep tests independent and isolated

### 5. Mocking Strategy

- Mock external services (Supabase, APIs)
- Mock time-dependent functions
- Use MSW for complex API mocking
- Avoid mocking internal application code

## CI/CD Integration

Tests run automatically on:

- Pull requests
- Main branch pushes
- Nightly builds

### GitHub Actions

```yaml
- name: Run tests
  run: npm run test:coverage

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Debugging Tests

### Common Issues

1. **Async operations**: Use `waitFor` for async assertions
2. **Component state**: Use `act` for state updates
3. **Mocks not working**: Check mock setup in beforeEach
4. **E2E flakiness**: Add proper waits and selectors

### Debug Tools

```bash
# Debug specific test
npm run test -- --no-coverage signin-form.test.tsx

# Debug E2E test
npx playwright test --debug auth.spec.ts

# View test UI
npm run test:ui
```

## Performance Testing

Run performance tests for critical paths:

```bash
# Performance test example
npm run test:perf

# Lighthouse CI
npm run lighthouse
```

## Security Testing

- Authentication/authorization flows
- Input validation and sanitization
- XSS prevention
- CSRF protection
- SQL injection prevention

## Accessibility Testing

- Screen reader compatibility
- Keyboard navigation
- Color contrast
- Focus management
- ARIA attributes

## Maintenance

### Regular Tasks

- Update test dependencies monthly
- Review and update test data factories
- Clean up obsolete tests
- Update E2E selectors as UI changes

### Monitoring

- Track test execution time
- Monitor coverage trends
- Review flaky test patterns
- Update test environment as needed