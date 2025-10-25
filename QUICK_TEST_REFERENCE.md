# Quick Test Reference - Tasks Module

## Test Commands

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Specific Test File
```bash
# API tests
npm test -- src/app/api/tasks/__tests__/create-task.test.ts
npm test -- src/app/api/tasks/__tests__/list-tasks.test.ts
npm test -- src/app/api/tasks/__tests__/task-progress.test.ts

# Component tests
npm test -- src/modules/tasks/components/__tests__/task-create-dialog.test.tsx
npm test -- src/modules/tasks/components/__tests__/task-list-view-complete.test.tsx
npm test -- src/modules/tasks/components/__tests__/task-progress-dialog.test.tsx

# Integration tests
npm test -- src/__tests__/tasks-integration.test.ts

# E2E tests
npx playwright test tests/tasks-flow.spec.ts
```

### Run Tests by Pattern
```bash
# All task-related tests
npm test -- tasks

# All progress-related tests
npm test -- progress

# All API tests
npm test -- src/app/api/tasks/__tests__

# All component tests
npm test -- src/modules/tasks/components/__tests__
```

### Generate Coverage Report
```bash
npm test -- --coverage

# View HTML coverage report
open coverage/index.html
```

### Run E2E Tests
```bash
# All E2E tests
npx playwright test

# Tasks flow only
npx playwright test tests/tasks-flow.spec.ts

# With UI
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

## Test File Locations

```
.worktrees/feature-tasks-module/
├── src/
│   ├── app/api/tasks/__tests__/
│   │   ├── create-task.test.ts      # POST /api/tasks
│   │   ├── list-tasks.test.ts       # GET /api/tasks
│   │   └── task-progress.test.ts    # POST progress updates
│   │
│   ├── modules/tasks/components/__tests__/
│   │   ├── task-create-dialog.test.tsx
│   │   ├── task-list-view-complete.test.tsx
│   │   └── task-progress-dialog.test.tsx
│   │
│   └── __tests__/
│       └── tasks-integration.test.ts
│
└── tests/
    └── tasks-flow.spec.ts           # Playwright E2E

Existing tests:
- tests/api/tasks.test.ts            # Original API tests
- tests/api/progress.test.ts         # Original progress tests
- tests/components/task-form.test.tsx
```

## Quick Test Examples

### API Route Test Pattern
```typescript
describe('POST /api/tasks', () => {
  it('creates a task for the authenticated coach', async () => {
    mockValidateRequestBody.mockReturnValue({
      success: true,
      data: { title: 'Task', clientId },
    });
    mockTaskService.createTask.mockResolvedValue(sampleTask);

    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Task', clientId }),
    });

    const response = await POST(request);
    
    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(mockTaskService.createTask).toHaveBeenCalled();
  });
});
```

### Component Test Pattern
```typescript
describe('TaskCreateDialog', () => {
  it('creates task successfully with valid data', async () => {
    const user = userEvent.setup();
    render(<TaskCreateDialog />);
    
    await user.click(screen.getByRole('button'));
    await user.type(screen.getByLabelText(/title/i), 'New Task');
    await user.click(screen.getByRole('button', { name: /create/i }));
    
    await waitFor(() => {
      expect(createTaskMutation.mutateAsync).toHaveBeenCalled();
    });
  });
});
```

### E2E Test Pattern
```typescript
test('should create a new task', async ({ page }) => {
  await page.goto('/coach/tasks');
  await page.click('button:has-text("Create Task")');
  await page.fill('input[name="title"]', 'New Task');
  await page.click('button:has-text("Create")');
  
  await expect(page.locator('text=Task created successfully')).toBeVisible();
});
```

## Test Coverage by Category

### Task Creation (17 tests)
- API validation
- Component form handling
- E2E user flow
- Error scenarios

### Task Listing & Filtering (29 tests)
- Pagination
- Status filtering
- Priority filtering
- Search
- Empty states

### Progress Updates (29 tests)
- Percentage validation
- Notes field
- File attachments
- Auto-completion
- History tracking

### Authentication & Authorization (11 tests)
- Coach-only access
- Client access
- Admin access
- Unauthorized scenarios

### Error Handling (15 tests)
- Validation errors
- Network errors
- Service errors
- Edge cases

### Accessibility (3 tests)
- Keyboard navigation
- ARIA labels
- Screen readers

### User Workflows (9 tests)
- Coach complete flow
- Client complete flow
- Integration scenarios

## Debugging Tests

### Run Single Test
```bash
npm test -- -t "creates a task for the authenticated coach"
```

### Run Test File in Debug Mode
```bash
node --inspect-brk node_modules/.bin/vitest src/app/api/tasks/__tests__/create-task.test.ts
```

### Playwright Debug
```bash
# Debug mode
npx playwright test --debug

# Specific test
npx playwright test tests/tasks-flow.spec.ts:10 --debug

# Show browser
npx playwright test --headed

# Slow motion
npx playwright test --slow-mo=1000
```

## Common Test Patterns

### Mock Supabase Auth
```typescript
mockGetUser.mockResolvedValue({
  data: { user: { id: userId } },
  error: null,
});
mockSingle.mockResolvedValue({
  data: { role: 'coach' },
  error: null,
});
```

### Test Loading States
```typescript
it('displays loading skeleton', () => {
  useTaskList.mockReturnValue({
    isLoading: true,
    data: undefined,
  });
  
  render(<TaskListView />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
```

### Test Error States
```typescript
it('displays error message', async () => {
  useTaskList.mockReturnValue({
    isError: true,
    error: { message: 'Failed to load' },
  });
  
  render(<TaskListView />);
  await expect(screen.findByText(/failed/i)).toBeVisible();
});
```

### Test Form Validation
```typescript
it('shows validation error', async () => {
  const user = userEvent.setup();
  render(<TaskForm />);
  
  await user.click(screen.getByRole('button', { name: /submit/i }));
  
  await expect(screen.findByText(/required/i)).toBeVisible();
});
```

## Coverage Goals

- Line Coverage: >80%
- Branch Coverage: >75%
- Function Coverage: >80%
- Statement Coverage: >80%

## CI/CD Integration

Add to `.github/workflows/test.yml`:
```yaml
- name: Run Tests
  run: npm test -- --coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

## Maintenance Notes

- Keep test mocks in sync with actual implementation
- Update E2E tests when UI changes
- Review failing tests before pushing
- Add tests for new features before implementation
- Refactor tests when refactoring code
