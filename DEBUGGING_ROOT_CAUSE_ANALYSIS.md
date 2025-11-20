# Root Cause Analysis & Comprehensive Fix Plan

## Executive Summary

After systematic debugging following the four-phase methodology, I've identified the root causes of broken pages/features. The issues are **NOT in the actual pages** (clients, insights, availability) but rather in:

1. **Test setup problems** in email-communication integration tests
2. **Module resolution issues** in worktree environments
3. **Minor UI state issues** from recent UX improvements

---

## Phase 1: Root Cause Investigation (COMPLETED)

### Evidence Summary

#### Test Failures Analyzed

- **Email Communication Tests**: 11 failures out of 14 tests
- **System Health Tests**: 31 failures out of 34 tests
- **Session Booking Tests**: 6 failures out of 31 tests
- **MFA Tests**: Multiple failures

#### Error Categories Identified

| Category                | Examples                           | Root Cause                             | Severity |
| ----------------------- | ---------------------------------- | -------------------------------------- | -------- |
| **Module Resolution**   | Cannot find '@/lib/database'       | Vitest config in worktree, stale cache | HIGH     |
| **Form State Issues**   | Input fields empty, values not set | Mock hooks don't update state          | HIGH     |
| **Mock/Spy Failures**   | Function calls not recorded        | Component handlers not firing          | HIGH     |
| **DOM Element Missing** | Elements not found in tree         | Conditional rendering broken           | MEDIUM   |

#### Affected vs. Unaffected Features

**UNAFFECTED (Working Correctly):**

- Coach clients page (/coach/clients)
- Coach insights dashboard (/coach/insights)
- Coach availability management (/coach/availability)
- Session booking core logic
- Authentication (except MFA edge cases)

**AFFECTED (Broken):**

- Email verification flows (tests only, likely not production)
- Password reset flows (tests only, likely not production)
- Newsletter subscription (tests only)
- Multi-channel notifications (tests only)
- Session reminders (tests only)

---

## Phase 2: Pattern Analysis (COMPLETED)

### Patterns Discovered

#### Pattern 1: Test Framework Issues

**Finding**: All failures are in test files, not production code

```
Root Cause: email-communication.test.tsx mocks React hooks directly
const React = {
  useState: vi.fn(),
  useEffect: vi.fn(),
  useCallback: vi.fn(),
};
```

**Impact**: Components can't maintain state, event handlers don't work

#### Pattern 2: Worktree Environment Issues

**Finding**: Module resolution fails only in `.worktrees/coach-dashboard-realtime`

```
Tests run from main: ✓ Can resolve paths
Tests run from worktree: ✗ Cannot find '@/lib/database'
```

**Impact**: Entire test suites blocked in feature branches

#### Pattern 3: Recent UX Changes

**Finding**: Sprint 3 updates (empty states, skeleton loaders) may have side effects

**Changed Files**:

- src/app/[locale]/(authenticated)/coach/clients/page.tsx
- src/app/[locale]/(authenticated)/coach/insights/page.tsx
- src/components/coach/notes-management.tsx
- src/components/session-rating-dialog.tsx

**Potential Issues**:

- Conditional rendering logic for empty states
- Loading skeleton states not properly transitioning
- Mobile responsiveness media queries affecting behavior

---

## Phase 3: Root Cause Hypotheses (COMPLETED)

### Primary Hypothesis (90% Confidence)

**Test Setup in email-communication.test.tsx is fundamentally broken**

The test file manually mocks React.useState/useEffect instead of using proper test utilities. This breaks:

1. State management in rendered components
2. Event handler execution
3. Mock assertions (no state changes = no handler calls)

**Supporting Evidence**:

- All form-related failures are in this one test file
- Same pattern across multiple test cases
- Component mocking is bypassed by hook mocking

**Fix Complexity**: Medium - Need to rewrite test setup

### Secondary Hypothesis (85% Confidence)

**Vitest/Module Resolution Broken in Worktrees**

The worktree environments have:

1. Stale vitest cache
2. Incomplete node_modules installation
3. Different vitest.config.ts path alias resolution

**Supporting Evidence**:

- Error only occurs in `.worktrees/coach-dashboard-realtime`
- Module exists but can't be resolved
- Same code works in main branch

**Fix Complexity**: Low - Clear path resolution/cache issue

### Tertiary Hypothesis (60% Confidence)

**Minor Component Issues from UX Refactoring**

Recent changes to empty states/skeleton loaders may have:

1. Changed conditional rendering logic
2. Broken state transitions
3. Affected event handler connections

**Supporting Evidence**:

- Recent commits specifically target these areas
- Pattern matches changed files
- Some production issues might manifest in tests first

**Fix Complexity**: Medium - Need to review conditional rendering

---

## Phase 4: Comprehensive Fix Plan

### FIX CATEGORY 1: Test Setup Issues (HIGHEST PRIORITY)

#### Issue 1.1: email-communication.test.tsx Mock Hooks

**File**: `src/test/integration/email-communication.test.tsx`
**Problem**: React hooks are mocked as plain objects, breaking state management
**Impact**: 11 test failures

**Current Code**:

```typescript
const React = {
  useState: vi.fn(),
  useEffect: vi.fn(),
  useCallback: vi.fn(),
};
```

**Fix Approach**:

1. Remove direct hook mocking
2. Use proper test utilities (renderWithProviders)
3. Mock only the email service, not React itself
4. Use actual React context providers

**Verification Steps**:

1. Test file can import components properly
2. Form inputs accept and display values
3. Event handlers fire and call mocked services
4. Spy assertions match actual calls

**Estimated Effort**: 3-4 hours

---

#### Issue 1.2: system-health.test.ts Module Resolution

**File**: `src/test/api/admin/system-health.test.ts`
**Problem**: Cannot resolve '@/lib/database' in worktree context
**Impact**: 31 test failures (cascading from import error)

**Root Cause**: Vitest module alias resolution fails in worktree

**Fix Approach**:

1. Clear vitest cache: `npx vitest --clearCache`
2. Reinstall dependencies: `npm ci`
3. Verify vitest.config.ts path aliases are correct
4. Check tsconfig.json paths match

**Verification Steps**:

1. Tests run without module resolution errors
2. System health endpoint returns valid data
3. Admin auth validation passes
4. Database health checks complete

**Estimated Effort**: 30 minutes - 1 hour

---

### FIX CATEGORY 2: Component State Issues (MEDIUM PRIORITY)

#### Issue 2.1: Form Input Values Not Persisting

**Affected Components**:

- Email verification flows
- Password reset forms
- Newsletter subscription
- Message input fields

**Problem**: Input values not updating in state during tests

**Potential Root Causes**:

1. Event handlers not properly bound
2. State updates not triggering re-renders
3. Form library (React Hook Form) misconfigured
4. Test setup not providing proper context

**Fix Approach**:

1. Review actual component implementations
2. Verify onChange handlers are wired correctly
3. Check React Hook Form setup in components
4. Ensure test setup uses renderWithProviders properly

**Verification Steps**:

1. Input fields can be typed into
2. Values appear in component state
3. Form submissions trigger correctly
4. spy assertions match actual calls

**Estimated Effort**: 2-3 hours

---

#### Issue 2.2: Conditional Rendering After UX Updates

**Affected Components**:

- Empty state displays
- Skeleton loaders
- Loading states
- Error boundaries

**Problem**: Conditional rendering may have broken state transitions

**Changed Files to Review**:

- src/components/coach/notes-management.tsx (18 changes)
- src/components/coach/clients-page.tsx (38 changes)
- src/components/session-rating-dialog.tsx (47 changes)
- src/components/profile-settings-card.tsx (34 changes)

**Fix Approach**:

1. Review conditional rendering logic
2. Check if empty state conditions are correct
3. Verify skeleton loader transitions
4. Ensure loading states don't block interactivity

**Verification Steps**:

1. Empty states show when data is empty
2. Loaders disappear when data loads
3. Content appears after loading completes
4. Error states display properly

**Estimated Effort**: 2-4 hours

---

### FIX CATEGORY 3: Environment Issues (LOW PRIORITY)

#### Issue 3.1: Worktree Cache Staleness

**Problem**: Vitest/Node cache not properly cleared in worktrees

**Quick Fix**:

```bash
# In each worktree:
rm -rf node_modules/.vite
rm -rf .next
npx vitest --clearCache
npm run build
```

**Estimated Effort**: 15 minutes

---

#### Issue 3.2: Import Path Consistency

**Problem**: Path aliases may not resolve correctly across worktrees

**Verification**:

```bash
# Check vitest.config.ts paths
cat vitest.config.ts | grep "@"

# Check tsconfig.json paths
cat tsconfig.json | grep -A2 "paths"

# These should match:
# '@': './src'
```

**Estimated Effort**: 10 minutes

---

## Implementation Order

### Phase 1: Quick Fixes (Day 1 - 1 hour)

1. Clear caches in worktrees
2. Reinstall dependencies
3. Verify path aliases
4. Run tests to see which failures persist

### Phase 2: Test Setup Fixes (Day 1-2 - 4-6 hours)

1. Rewrite email-communication test setup
2. Fix module resolution in system-health tests
3. Verify all test utilities are imported correctly
4. Add proper mock setup with renderWithProviders

### Phase 3: Component Reviews (Day 2-3 - 3-5 hours)

1. Review conditional rendering in affected components
2. Verify form handlers are properly connected
3. Check state management flow
4. Add missing event handler connections if needed

### Phase 4: Verification (Day 3 - 2-3 hours)

1. Run full test suite
2. Check that all tests pass
3. Run dev server to verify no runtime issues
4. Create minimal reproduction test cases

---

## Summary Table

| Issue                        | Category    | Priority | Root Cause                    | Fix Effort | Impact        |
| ---------------------------- | ----------- | -------- | ----------------------------- | ---------- | ------------- |
| React hook mocking           | Test Setup  | CRITICAL | Direct hook mocks break state | 3-4h       | 11 tests      |
| Module resolution            | Test Setup  | CRITICAL | Vitest cache/aliases broken   | 1h         | 31 tests      |
| Form values not persisting   | Components  | HIGH     | Event handlers or test setup  | 2-3h       | UX flows      |
| Conditional rendering broken | Components  | MEDIUM   | Recent UX changes             | 2-4h       | UI display    |
| Worktree cache stale         | Environment | LOW      | Cache not cleared             | 15m        | All worktrees |

---

## Success Criteria

✅ All tests pass in main branch
✅ Tests pass in all worktrees after cache clear
✅ Email/communication flows work (tests and production)
✅ Form inputs accept and display values correctly
✅ Event handlers fire and call services
✅ Mock assertions match actual behavior
✅ Conditional rendering shows correct states
✅ No console errors or warnings during test runs

---

## Risk Assessment

**Low Risk**:

- Cache clearing and reinstalling dependencies
- Test setup rewrites (isolated changes)

**Medium Risk**:

- Component conditional rendering changes
- Event handler wiring modifications

**Mitigation**:

- Run tests frequently during fixes
- Use git branches for each fix category
- Verify changes don't break other components
