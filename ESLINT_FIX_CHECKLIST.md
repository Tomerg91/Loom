# ESLint Fix Progress Checklist

**Total Errors:** 473  
**Started:** [Date]  
**Target Completion:** [Date]  
**Current Status:** Not Started

---

## Phase 1: Quick Wins (3-5 hours) - 282 errors

### 1A. Unused Function Parameters (48 errors) - Est. 1 hour
**Status:** [ ] Not Started | [ ] In Progress | [ ] Complete  
**Assigned to:** _______________  
**Started:** ______  **Completed:** ______

**Checklist:**
- [ ] Fix 24 unused `request` parameters (prefix with `_`)
- [ ] Fix 9 unused `context` parameters (prefix with `_`)
- [ ] Fix remaining 15 unused params
- [ ] Run `npm run lint` to verify (should show ~425 errors)
- [ ] Test affected API routes
- [ ] Commit: "fix: prefix unused function parameters with underscore"

**Files to check:**
- [ ] `src/app/api/admin/maintenance/history/route.ts`
- [ ] `src/app/api/admin/maintenance/route.ts`
- [ ] `src/app/api/admin/mfa/settings/route.ts`
- [ ] `src/app/api/admin/mfa/statistics/route.ts`
- [ ] All other API routes with unused params

---

### 1B. HTML Entity Escaping (31 errors) - Est. 45 minutes
**Status:** [ ] Not Started | [ ] In Progress | [ ] Complete  
**Assigned to:** _______________  
**Started:** ______  **Completed:** ______

**Checklist:**
- [ ] Replace unescaped single quotes with `&apos;` or wrap in `{}`
- [ ] Replace unescaped double quotes with `&quot;` or wrap in `{}`
- [ ] Run `npm run lint` to verify (should show ~394 errors)
- [ ] Visual check for rendering issues
- [ ] Commit: "fix: escape HTML entities in JSX"

**Common files:**
- [ ] Component files with text content
- [ ] Error message components
- [ ] Form labels and descriptions

---

### 1C. Remove Unused Imports (203 errors) - Est. 2-3 hours
**Status:** [ ] Not Started | [ ] In Progress | [ ] Complete  
**Assigned to:** _______________  
**Started:** ______  **Completed:** ______

**Bulk removals (can automate):**
- [ ] Remove 14 `applyCorsHeaders` imports
- [ ] Remove 6 `CardTitle` imports
- [ ] Remove 4 `CardDescription` imports
- [ ] Remove 4 `CardHeader` imports
- [ ] Remove 4 `useEffect` imports (if truly unused)
- [ ] Remove 4 `BarChart3` imports

**Manual review required:**
- [ ] `advanced-file-manager.tsx` (likely many unused imports)
- [ ] `coach/sessions/page.tsx` (20 errors total)
- [ ] `notification-analytics-dashboard.tsx` (17 errors total)
- [ ] All component files with 5+ errors

**Verification:**
- [ ] Run `npm run lint` to verify (should show ~191 errors)
- [ ] Check bundle size (should decrease)
- [ ] Run tests: `npm test`
- [ ] Commit: "chore: remove unused imports"

---

## Phase 2: Type Safety (6-12 hours) - 166 errors

### 2A. Fix `any` Types in API Routes (70 errors) - Est. 4-6 hours
**Status:** [ ] Not Started | [ ] In Progress | [ ] Complete  
**Assigned to:** _______________  
**Started:** ______  **Completed:** ______

**Priority files (in order):**

#### File 1: `src/app/api/admin/notifications/analytics/route.ts` (20 errors)
- [ ] Define `NotificationAnalyticsQuery` interface
- [ ] Define `NotificationStats` interface
- [ ] Type database query results
- [ ] Type aggregation results
- [ ] Test analytics endpoints

#### File 2: `src/app/api/monitoring/business-metrics/route.ts` (9 errors)
- [ ] Define `BusinessMetrics` interface
- [ ] Type metric calculation functions
- [ ] Test metrics endpoints

#### File 3: `src/app/api/widgets/sessions/route.ts` (8 errors)
- [ ] Define `SessionWidget` interface
- [ ] Type session data structures
- [ ] Test widget endpoints

#### File 4: `src/app/api/widgets/feedback/route.ts` (7 errors)
- [ ] Define `FeedbackWidget` interface
- [ ] Type feedback data
- [ ] Test feedback endpoints

#### File 5: `src/app/api/admin/system-health/route.ts` (5 errors)
- [ ] Define `SystemHealthCheck` interface
- [ ] Type health check results

#### File 6: `src/app/api/widgets/progress/route.ts` (5 errors)
- [ ] Define `ProgressWidget` interface
- [ ] Type progress metrics

**General tasks:**
- [ ] Create `src/types/api.ts` for shared API types
- [ ] Document all new interfaces
- [ ] Run `npm run lint` to verify (should show ~121 errors)
- [ ] Run type check: `npm run type-check`
- [ ] Test all modified API routes
- [ ] Commit: "feat: add TypeScript types for API routes"

---

### 2B. Fix `any` Types in Components (88 errors) - Est. 4-6 hours
**Status:** [ ] Not Started | [ ] In Progress | [ ] Complete  
**Assigned to:** _______________  
**Started:** ______  **Completed:** ______

**Priority files (in order):**

#### File 1: `src/components/charts/performance-optimized-chart.tsx` (8 errors)
- [ ] Define `ChartDataPoint` interface
- [ ] Type chart props
- [ ] Type event handlers

#### File 2: `src/components/charts/optimized-lazy-chart.tsx` (6 errors)
- [ ] Use consistent chart types
- [ ] Type lazy loading logic

#### File 3: `src/components/client/progress-page.tsx` (6 errors)
- [ ] Define `ProgressData` interface
- [ ] Type progress calculations

#### File 4: `src/components/dashboard/shared/hooks.ts` (6 errors)
- [ ] Type custom hook returns
- [ ] Type hook parameters

**General tasks:**
- [ ] Create `src/types/charts.ts` for chart types
- [ ] Create `src/types/components.ts` for component props
- [ ] Run `npm run lint` to verify (should show ~33 errors)
- [ ] Run type check: `npm run type-check`
- [ ] Visual test all modified components
- [ ] Commit: "feat: add TypeScript types for components"

---

### 2C. Fix Empty Object Types (8 errors) - Est. 30 minutes
**Status:** [ ] Not Started | [ ] In Progress | [ ] Complete  
**Assigned to:** _______________  
**Started:** ______  **Completed:** ______

**Checklist:**
- [ ] Replace `{}` with `object` or proper interface
- [ ] Review each case for appropriate type
- [ ] Run `npm run lint` to verify (should show ~25 errors)
- [ ] Commit: "fix: replace empty object types with proper types"

---

## Phase 3: Cleanup (2-3 hours) - 73 errors

### 3A. Fix Unused Assigned Variables (62 errors) - Est. 2-3 hours
**Status:** [ ] Not Started | [ ] In Progress | [ ] Complete  
**Assigned to:** _______________  
**Started:** ______  **Completed:** ______

**Categories to review:**

#### State setters never used:
- [ ] Review all `[value, setValue]` where `setValue` is unused
- [ ] Decision: Remove state or implement feature?
- [ ] Document incomplete features if found

#### Query results never used:
- [ ] Review all `{ data, error }` where variables unused
- [ ] Only destructure what's actually used
- [ ] Consider if this indicates incomplete implementation

#### Computed values never used:
- [ ] Review all assigned variables that are computed but unused
- [ ] Remove computation or use the value
- [ ] May reveal logic issues

**Verification:**
- [ ] Run `npm run lint` to verify (should show ~11 errors)
- [ ] Run full test suite
- [ ] Manual smoke test of affected features
- [ ] Commit: "chore: remove unused assigned variables"

---

### 3B. Fix React Hook Violations (5 errors) - Est. 1 hour
**Status:** [ ] Not Started | [ ] In Progress | [ ] Complete  
**Assigned to:** _______________  
**Started:** ______  **Completed:** ______

**Known issues:**
- [ ] Fix conditional call of `useRealtimeBookings`
- [ ] Fix conditional call of `useRealtimeBooking`
- [ ] Fix conditional call of `useMutation`
- [ ] Fix conditional call of `useMemo`
- [ ] Fix display name issue

**Pattern:**
Move hooks to top level, use conditions inside hooks:
```typescript
// Before
if (condition) {
  const data = useHook();
}

// After
const data = useHook();
if (condition && data) {
  // use data
}
```

**Verification:**
- [ ] Run `npm run lint` to verify (should show ~6 errors)
- [ ] Test all affected components thoroughly
- [ ] Commit: "fix: resolve React Hook rule violations"

---

### 3C. Fix Import Issues (6 errors) - Est. 30 minutes
**Status:** [ ] Not Started | [ ] In Progress | [ ] Complete  
**Assigned to:** _______________  
**Started:** ______  **Completed:** ______

**Checklist:**
- [ ] Fix 3 import order violations (run `npm run lint -- --fix`)
- [ ] Add `uuid` to package.json dependencies
- [ ] Add `sharp` to package.json dependencies
- [ ] Run `npm install`
- [ ] Run `npm run lint` to verify (should show 0 errors!)
- [ ] Commit: "fix: resolve import issues and add missing dependencies"

---

## Final Verification

### All Phases Complete
- [ ] Run `npm run lint` - should show 0 errors
- [ ] Run `npm run type-check` - should pass
- [ ] Run full test suite - should pass
- [ ] Manual smoke test of major features
- [ ] Check bundle size - should be smaller
- [ ] Review all commits for quality

---

## Post-Fix Setup (Prevent Regression)

### Setup Pre-commit Hooks
- [ ] Install Husky: `npm install --save-dev husky lint-staged`
- [ ] Add lint-staged config to package.json
- [ ] Initialize Husky: `npx husky install`
- [ ] Add pre-commit hook: `npx husky add .husky/pre-commit "npx lint-staged"`
- [ ] Test pre-commit hook
- [ ] Commit: "chore: add pre-commit hooks for linting"

### Update CI/CD
- [ ] Add lint step to CI pipeline
- [ ] Set max-warnings to 0
- [ ] Test CI pipeline
- [ ] Update team documentation

### Team Training
- [ ] Document ESLint rules in team wiki
- [ ] Share TypeScript best practices
- [ ] Review common patterns in team meeting
- [ ] Add to code review checklist

---

## Metrics & Tracking

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total Errors | 473 | ___ | ___% |
| Files with Errors | 123 | ___ | ___% |
| Unused Variables | 265 | ___ | ___% |
| Type Safety Issues | 158 | ___ | ___% |
| Bundle Size | ___KB | ___KB | ___KB saved |

---

## Notes & Issues Discovered

**Incomplete Features Found:**
- 

**Bugs Found:**
- 

**Technical Debt Identified:**
- 

**Questions for Team:**
- 

---

**Completion Date:** ____________  
**Total Time Spent:** ______ hours  
**Team Members Involved:** _________________

---

🎉 **CONGRATULATIONS!** 🎉  
All 473 ESLint errors have been resolved!
