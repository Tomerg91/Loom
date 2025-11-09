# GitHub Issues from Usability Analysis

This document contains all GitHub issues to be created based on the usability analysis in `docs/plans/2025-01-09-usability-user-flow-analysis.md`.

**How to use:** Copy each issue template below and create it in GitHub. Issues are organized by priority.

---

## 🔴 CRITICAL PRIORITY (Create First)

### Issue #1: [UX] Admin Dashboard Shows Empty Placeholder

**Title:** `[UX] Admin dashboard shows empty placeholder`

**Labels:** `type:bug`, `priority:critical`, `component:dashboard`, `ux`

**Body:**

````
## Problem
Admins see a generic "placeholder" message instead of an actual admin dashboard, leaving them with no functionality.

## Impact
**Severity:** CRITICAL - Admins are completely blocked from using the dashboard

## Location
`src/components/dashboard/dashboard-content.tsx:97-108`

## Current Code
```typescript
{role !== 'coach' && role !== 'client' && (
  <Card>
    <CardHeader>
      <CardTitle>{t('adminPlaceholder.title')}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        {t('adminPlaceholder.body')}
      </p>
    </CardContent>
  </Card>
)}
````

## What Needs to Happen

- [ ] Design admin dashboard layout (what should admins see?)
- [ ] Implement AdminDashboard component
- [ ] Show system metrics (total users, total coaches, total sessions, etc.)
- [ ] Add admin-specific quick actions (user management, system settings, etc.)
- [ ] Update route guards to allow admin access
- [ ] Add tests for admin dashboard
- [ ] Update navigation to include admin-only menu items

## Acceptance Criteria

- Admin users see a functional dashboard (not placeholder)
- Dashboard shows relevant metrics for system management
- Admin actions are accessible from dashboard
- Tests pass with admin role verified
- No console errors when loading as admin

## Effort Estimate

2-3 days

## Related

- Analysis: `docs/plans/2025-01-09-usability-user-flow-analysis.md`

```

---

### Issue #2: [UX] Coach Insights Dashboard Shows Hardcoded Placeholder Data

**Title:** `[UX] Coach insights dashboard shows hardcoded placeholder data`

**Labels:** `type:bug`, `priority:critical`, `component:insights`, `data`, `ux`

**Body:**
```

## Problem

The coach insights page displays hardcoded and placeholder values instead of real analytics data. This makes the analytics completely unreliable.

## Impact

**Severity:** CRITICAL - Coaches see fake data and can't trust the analytics for decision-making

## Location

Multiple hardcoded values in `src/components/coach/insights-page.tsx`:

- Line 110: Client retention rate hardcoded to 85%
- Line 111: Placeholder revenue calculation ($100/session)
- Line 116: Progress score hardcoded calculations
- Line 126: Rating hardcoded to 4.5
- Line 130-134: Goal analysis completely hardcoded
- Line 138: Feedback array empty

## Current Hardcoded Code Examples

```typescript
// Line 110
clientRetentionRate: 85, // Hardcoded placeholder

// Line 127
averageRating: 4.5, // Placeholder - would need actual ratings

// Line 127
revenue: metric.completed * 100, // $100 per session placeholder

// Lines 130-134
mostCommonGoals: [
  { goal: 'Career Development', count: 8, successRate: 75 },
  { goal: 'Leadership Skills', count: 6, successRate: 83 },
  { goal: 'Work-Life Balance', count: 5, successRate: 60 },
], // Placeholder - would need goals table

// Line 138
feedback: [], // Placeholder - would need feedback/ratings table
```

## What Needs to Happen

- [ ] Remove all hardcoded values
- [ ] Calculate client retention from database
- [ ] Calculate actual revenue from transactions/payments table
- [ ] Query actual coaching goals from database
- [ ] Fetch real client feedback/ratings
- [ ] Implement proper progress score calculations
- [ ] Update API endpoint `/api/coach/insights` to return real data
- [ ] Add data transformation tests
- [ ] Verify all metrics match business logic

## Acceptance Criteria

- No hardcoded values in component (except test IDs)
- All metrics calculated from database
- Revenue accurately reflects actual transactions
- Client retention accurately calculated
- Goal analysis pulls from actual goals table
- Feedback populates from ratings/feedback table
- All test IDs preserved for testing
- No placeholder values visible in UI

## Effort Estimate

3-4 days (includes backend work)

## Database Tables Needed

- Session/transaction table (for revenue)
- Goal tracking table (for goal analysis)
- Feedback/rating table (for client feedback)
- Client history table (for retention calculation)

## Related

- Analysis: `docs/plans/2025-01-09-usability-user-flow-analysis.md`

```

---

## 🟠 HIGH PRIORITY (Fix Before Release)

### Issue #3: [UX] Add Breadcrumb Navigation to Multi-Level Pages

**Title:** `[UX] Add breadcrumb navigation for page context`

**Labels:** `type:feature`, `priority:high`, `component:navigation`, `ux`

**Body:**
```

## Problem

Users navigating to detail pages (sessions, clients, etc.) don't have breadcrumb navigation showing where they are in the app hierarchy. This causes navigation confusion, especially on mobile.

## Impact

**Severity:** HIGH - Users get lost on detail pages and can't easily navigate back to parent pages

## Example Flows

- Dashboard → Sessions → Session Detail (no breadcrumbs)
- Dashboard → Insights → Session Details (no breadcrumbs)
- Dashboard → Clients → Client Detail (no breadcrumbs)

## What Needs to Happen

- [ ] Create Breadcrumb component at `src/components/layout/breadcrumb.tsx`
- [ ] Accept dynamic breadcrumb items array
- [ ] Support locale-aware links
- [ ] Add to session detail page
- [ ] Add to client detail page
- [ ] Add to insights client detail (if exists)
- [ ] Style to match design system
- [ ] Test on mobile and desktop

## Breadcrumb Component Spec

```typescript
interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  locale: string;
}
```

## Acceptance Criteria

- Breadcrumb component exists and is reusable
- Breadcrumbs appear on all detail pages
- Links are locale-aware (e.g., /fr/sessions vs /en/sessions)
- Breadcrumbs work on mobile
- Last item is not a link (current page)
- Styled consistently with app theme
- ARIA labels for accessibility

## Effort Estimate

1 day

## Related

- Analysis: `docs/plans/2025-01-09-usability-user-flow-analysis.md`

```

---

### Issue #4: [UX] Wire Real Data to Session Stats Cards

**Title:** `[UX] Session stats cards display hardcoded numbers instead of real data`

**Labels:** `type:bug`, `priority:high`, `component:sessions`, `data`

**Body:**
```

## Problem

The quick stat cards on the sessions page (/sessions) show hardcoded fake numbers (12 upcoming, 8 clients, 45 completed) instead of real data.

## Impact

**Severity:** HIGH - Coaches see incorrect metrics every time they view sessions

## Location

`src/app/[locale]/(authenticated)/sessions/sessions-page-client.tsx:94-141`

## Current Hardcoded Values

```typescript
// Line 104
<div className="text-2xl font-bold">12</div>  // Upcoming Sessions
<p className="text-xs text-muted-foreground">
  {dashboardT('stats.thisWeek')}
</p>

// Line 119
<div className="text-2xl font-bold">8</div>   // Active Clients
<p className="text-xs text-muted-foreground">
  {dashboardT('stats.total')}
</p>

// Line 134
<div className="text-2xl font-bold">45</div>  // Completed Sessions
<p className="text-xs text-muted-foreground">
  {dashboardT('stats.thisMonth')}
</p>
```

## What Needs to Happen

- [ ] Create API endpoint to fetch coach stats or use existing endpoint
- [ ] Query upcoming sessions for current week
- [ ] Query active clients for coach
- [ ] Query completed sessions for current month
- [ ] Update SessionsPageClient to fetch and display real data
- [ ] Show loading skeleton while fetching
- [ ] Show proper error state if fetch fails
- [ ] Add tests for stat calculations

## Acceptance Criteria

- Stats show real data from database
- Numbers update when sessions change
- Loading state shows while fetching
- Error state handled gracefully
- Stats match business logic (e.g., "this week" = current week)
- Numbers refresh on page load
- Mobile and desktop both display correctly

## Data Needed

- Upcoming sessions in next 7 days
- Count of unique active clients
- Completed sessions in current month

## Effort Estimate

1 day

## Related

- Analysis: `docs/plans/2025-01-09-usability-user-flow-analysis.md`

```

---

### Issue #5: [UX] Improve Error Messages and Add Retry Buttons

**Title:** `[UX] Improve error messages and add retry functionality`

**Labels:** `type:improvement`, `priority:high`, `component:error-handling`, `ux`

**Body:**
```

## Problem

Error messages throughout the app are too generic and lack retry functionality. Users can't easily recover from errors.

## Impact

**Severity:** HIGH - Users confused when something fails and don't know how to recover

## Examples

- Insights page: "Error loading insights" (generic, no retry)
- Activity feed: "Error loading insights" (wrong page name, no retry)
- No specific error codes or reasons

## What Needs to Happen

- [ ] Create reusable ErrorState component with retry button
- [ ] Update insights-page.tsx error handling (line 178-191)
- [ ] Update recent-activity-feed.tsx error handling (line 99-103)
- [ ] Add specific error messages based on error type
- [ ] Implement retry logic in TanStack Query
- [ ] Show error details in console for debugging
- [ ] Style error states consistently

## Error Component Spec

```typescript
interface ErrorStateProps {
  title: string;
  message: string;
  onRetry: () => void;
  details?: string; // for console logging
}
```

## Acceptance Criteria

- All error states show specific error messages
- Retry buttons present in error states
- Retry functionality works properly
- Error details logged to console for debugging
- Error states styled consistently
- Tests for error state handling exist

## Effort Estimate

1 day

## Related

- Analysis: `docs/plans/2025-01-09-usability-user-flow-analysis.md`

```

---

## 🟡 MEDIUM PRIORITY (Schedule for Next Sprint)

### Issue #6: [Performance] Optimize Dashboard Data Fetching

**Title:** `[Performance] Optimize coach dashboard data fetching`

**Labels:** `type:performance`, `priority:medium`, `component:dashboard`

**Body:**
```

## Problem

The coach dashboard makes multiple parallel API calls (TodaysAgenda, RecentActivityFeed, ClientSnapshot) which may cause waterfall loading and slow perceived performance.

## Impact

**Severity:** MEDIUM - Dashboard loads slower than optimal

## Location

`src/components/dashboard/coach/coach-dashboard.tsx`

## Current API Calls

1. /api/sessions?coachId={userId}&status=scheduled&from={startOfDay}&to={endOfDay}
2. /api/coach/activity?limit=6
3. /api/coach/... (ClientSnapshot unknown)

## What Needs to Happen

- [ ] Analyze if calls can be combined into single endpoint
- [ ] Implement parallel data fetching if separate endpoints needed
- [ ] Consider batching API requests
- [ ] Measure impact with Lighthouse
- [ ] Optimize staleTime values if needed
- [ ] Add performance tests

## Acceptance Criteria

- Dashboard initial load time < 2 seconds
- No waterfall requests (all parallel)
- Core Web Vitals pass Lighthouse
- No regression in other performance metrics

## Effort Estimate

1-2 days

## Related

- Analysis: `docs/plans/2025-01-09-usability-user-flow-analysis.md`

```

---

### Issue #7: [UX] Add Pagination to Coach Insights Client List

**Title:** `[UX] Add pagination to client progress table in insights`

**Labels:** `type:feature`, `priority:medium`, `component:insights`, `ux`

**Body:**
```

## Problem

The client progress list in insights shows all clients without pagination, which causes slow rendering for coaches with many clients.

## Impact

**Severity:** MEDIUM - Page loads slowly for coaches with 20+ clients

## Location

`src/components/coach/insights-page.tsx:380-411`

## Current Code

```typescript
{insights?.clientProgress.map((client) => (
  <div key={client.clientId} className="flex items-center justify-between p-4 border rounded-lg">
    // Client progress item
  </div>
))}
```

## What Needs to Happen

- [ ] Add pagination controls to client progress table
- [ ] Show 10 clients per page
- [ ] Add page navigation (prev/next or page numbers)
- [ ] Remember current page in component state
- [ ] Update API to support pagination
- [ ] Add total client count display
- [ ] Test with large number of clients

## Acceptance Criteria

- Client list shows in paginated chunks
- Users can navigate between pages
- Page size is sensible (10 per page)
- Total count displayed
- Performance improved for large lists
- Mobile friendly pagination

## Effort Estimate

1 day

## Related

- Analysis: `docs/plans/2025-01-09-usability-user-flow-analysis.md`

```

---

### Issue #8: [UX] Replace Spinner with Skeleton Loader on Insights Page

**Title:** `[UX] Improve loading state on insights page`

**Labels:** `type:improvement`, `priority:medium`, `component:insights`, `ux`

**Body:**
```

## Problem

The insights page shows a generic spinner while loading instead of skeleton loaders that match the content layout. This provides poor perceived performance.

## Impact

**Severity:** MEDIUM - Users perceive page as slow (CLS issues)

## Location

`src/components/coach/insights-page.tsx:162-175`

## Current Loading Code

```typescript
if (isLoading) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
      </div>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    </div>
  );
}
```

## What Needs to Happen

- [ ] Create InsightsSkeleton component
- [ ] Match layout of actual insights page
- [ ] Show skeleton cards for metrics
- [ ] Show skeleton for chart areas
- [ ] Show skeleton for table rows
- [ ] Use Skeleton component from UI library
- [ ] Remove center spinner

## Acceptance Criteria

- Skeleton loader matches insights layout
- No layout shift when loading completes
- Skeleton appears immediately
- Animation is subtle (not spinning)
- Mobile and desktop both look good

## Effort Estimate

1 day

## Related

- Analysis: `docs/plans/2025-01-09-usability-user-flow-analysis.md`

```

---

## 🟢 LOW PRIORITY (Polish/Enhancement)

### Issue #9: [UX] Improve Sidebar User Summary Display

**Title:** `[UX] Improve sidebar user summary display`

**Labels:** `type:improvement`, `priority:low`, `component:navigation`, `ux`

**Body:**
```

## Problem

Sidebar user summary only displays if userSummary prop is provided, which may result in incomplete user context.

## Impact

**Severity:** LOW - Nice to have, doesn't block functionality

## Location

`src/components/layout/Sidebar.tsx:165-196`

## What Needs to Happen

- [ ] Ensure userSummary is always provided to Sidebar component
- [ ] Add fallback display if user data unavailable
- [ ] Show loading state while user data loads
- [ ] Verify user summary displays correctly in all routes

## Acceptance Criteria

- User summary always visible in sidebar
- Handles null/undefined gracefully
- Shows loading state appropriately

## Effort Estimate

0.5 days

## Related

- Analysis: `docs/plans/2025-01-09-usability-user-flow-analysis.md`

```

---

### Issue #10: [UX] Add "New Activity" Indicator to Activity Feed

**Title:** `[UX] Add visual indicator for new activity in feed`

**Labels:** `type:enhancement`, `priority:low`, `component:dashboard`, `realtime`

**Body:**
```

## Problem

Users don't know if the activity feed contains new items since the last view. The feed updates every 30 seconds but provides no visual feedback.

## Impact

**Severity:** LOW - Enhancement, not blocking

## Location

`src/components/dashboard/coach/recent-activity-feed.tsx`

## What Needs to Happen

- [ ] Track last viewed timestamp for activity
- [ ] Show "New Activity" badge when new items available
- [ ] Add refresh indicator when data is being fetched
- [ ] Highlight newly added items briefly
- [ ] Consider auto-scrolling to new activity

## Acceptance Criteria

- Visual indicator shows when new activity available
- Indicator disappears when user views activity
- No breaking changes to current layout
- Mobile and desktop both show indicator

## Effort Estimate

1 day

## Related

- Analysis: `docs/plans/2025-01-09-usability-user-flow-analysis.md`

```

---

### Issue #11: [Docs] Complete Client Dashboard UX Analysis

**Title:** `[Docs] Complete client dashboard UX analysis`

**Labels:** `type:documentation`, `priority:low`, `component:dashboard`

**Body:**
```

## Problem

The usability analysis focused on coach flows. Client dashboard needs detailed analysis.

## Impact

**Severity:** LOW - For completeness of documentation

## What Needs to Happen

- [ ] Analyze ClientDashboard component structure
- [ ] Review ClientUpcomingSessions component
- [ ] Review ClientGoalProgress component
- [ ] Review ClientRecentMessages component
- [ ] Compare with coach dashboard UX patterns
- [ ] Identify UX gaps specific to client experience
- [ ] Document findings

## Related

- Analysis: `docs/plans/2025-01-09-usability-user-flow-analysis.md`

```

---

### Issue #12: [Performance] Measure Core Web Vitals

**Title:** `[Performance] Establish Core Web Vitals baseline`

**Labels:** `type:performance`, `priority:low`, `component:performance`

**Body:**
```

## Problem

No baseline measurements for Core Web Vitals (LCP, FID, CLS) exist.

## Impact

**Severity:** LOW - Important for long-term performance monitoring

## What Needs to Happen

- [ ] Run Lighthouse audit on main flows
- [ ] Measure LCP (Largest Contentful Paint)
- [ ] Measure FID (First Input Delay)
- [ ] Measure CLS (Cumulative Layout Shift)
- [ ] Document baseline metrics
- [ ] Set performance targets
- [ ] Create performance monitoring

## Success Criteria

- All Core Web Vitals > 75 (green)
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1

## Related

- Analysis: `docs/plans/2025-01-09-usability-user-flow-analysis.md`

````

---

## Summary

**Total Issues:** 12
- Critical: 2
- High: 4
- Medium: 4
- Low: 2

**Total Effort Estimate:** 8-10 days (critical + high priority)

**Recommended Timeline:**
- Days 1-2: Quick wins (breadcrumbs, session stats)
- Days 3-6: Critical blockers (admin, insights)
- Days 7-10: High priority improvements (errors, testing)
- Later: Medium/low priority enhancements

---

## How to Create These Issues in GitHub

### Option 1: Manual Creation (Via GitHub Web UI)
1. Go to your repository on GitHub
2. Click "Issues" tab
3. Click "New issue"
4. Copy each issue template above
5. Paste title and body
6. Select labels
7. Create issue

### Option 2: Using GitHub CLI
```bash
# Install: brew install gh
# Authenticate: gh auth login

gh issue create --title "[UX] Admin dashboard shows empty placeholder" \
  --body "$(cat - <<EOF
... [paste issue body from above]
EOF
)" \
  --label "type:bug,priority:critical,component:dashboard,ux"
````

### Option 3: GitHub API

Use GitHub's REST API to create issues programmatically.

---

**Document Created:** January 9, 2025
**Related Analysis:** `docs/plans/2025-01-09-usability-user-flow-analysis.md`
