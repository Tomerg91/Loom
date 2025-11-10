# Phase 2 ESLint Analysis: TypeScript `any` Type Errors

## Executive Summary

- **Total `any` errors**: 164 occurrences
- **Files affected**: 51 files
- **Target**: Reduce from 164 to ~60 errors (63% reduction)
- **Estimated time**: 6-8 hours

## Top 20 Files by Error Count

| Rank | File | Errors | Category |
|------|------|--------|----------|
| 1 | `src/app/api/admin/notifications/analytics/route.ts` | 20 | API Route |
| 2 | `src/app/api/monitoring/business-metrics/route.ts` | 9 | API Route |
| 3 | `src/app/api/widgets/sessions/route.ts` | 8 | API Route |
| 4 | `src/components/charts/performance-optimized-chart.tsx` | 8 | Component |
| 5 | `src/app/api/widgets/feedback/route.ts` | 7 | API Route |
| 6 | `src/components/charts/optimized-lazy-chart.tsx` | 6 | Component |
| 7 | `src/components/client/progress-page.tsx` | 6 | Component |
| 8 | `src/components/dashboard/shared/hooks.ts` | 6 | Utility |
| 9 | `src/app/api/admin/system-health/route.ts` | 5 | API Route |
| 10 | `src/app/api/widgets/progress/route.ts` | 5 | API Route |
| 11 | `src/components/dashboard/client/recent-messages.tsx` | 5 | Component |
| 12 | `src/app/api/analytics/dashboard/route.ts` | 4 | API Route |
| 13 | `src/components/client/shared-files.tsx` | 4 | Component |
| 14 | `src/components/coach/file-management.tsx` | 4 | Component |
| 15 | `src/components/files/file-browser.tsx` | 4 | Component |
| 16 | `src/app/api/auth/session/route.ts` | 3 | API Route |
| 17 | `src/app/api/files/route.ts` | 3 | API Route |
| 18 | `src/app/api/files/share/bulk/route.ts` | 3 | API Route |
| 19 | `src/app/api/sessions/[id]/files/route.ts` | 3 | API Route |
| 20 | `src/components/charts/enhanced-chart-components.tsx` | 3 | Component |

## Error Pattern Analysis

### 1. Database Query Results (35% of errors)
**Pattern**: `notifications: any[]`, `data: any`, `row: any`
**Locations**: API routes, database queries
**Solution**: Use Supabase types from `Database` type

### 2. Array Iteration Callbacks (25% of errors)
**Pattern**: `(item: any) =>`, `forEach((n: any) =>)`
**Locations**: Data processing, filtering, mapping
**Solution**: Infer from parent array type or use generics

### 3. Chart/Widget Data (20% of errors)
**Pattern**: `data: any[]`, `chartData: any`
**Locations**: Chart components, widget API routes
**Solution**: Create shared chart data types

### 4. Function Parameters (15% of errors)
**Pattern**: `function generateTimeSeriesData(notifications: any[])`
**Locations**: Utility functions, helpers
**Solution**: Define specific interfaces

### 5. Props with Generic Data (5% of errors)
**Pattern**: `React.cloneElement(children as React.ReactElement<{ data?: any[] }>)`
**Locations**: HOC components, wrapper components
**Solution**: Use TypeScript generics properly

## Proposed Type Definitions

### Create `src/types/api.ts`
```typescript
// Database row types
export interface DatabaseRow {
  id: string;
  created_at: string;
  updated_at?: string;
  [key: string]: unknown;
}

// API response types
export interface ApiSuccessResponse<T> {
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: Record<string, unknown>;
}

export type ApiResult<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Notification analytics types
export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  channel?: 'email' | 'push' | 'inapp';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  sent_at?: string;
  read_at?: string;
  metadata?: Record<string, unknown>;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  sent: number;
  delivered: number;
  opened: number;
}

export interface NotificationStats {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  deliveryRate: number;
  openRate: number;
}

// Session analytics types
export interface SessionRow {
  id: string;
  coach_id: string;
  client_id: string;
  title: string;
  description?: string;
  scheduled_at: string;
  duration: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  session_type?: 'video' | 'phone' | 'in-person';
  rating?: number;
  feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface SessionStats {
  total: number;
  completed: number;
  cancelled: number;
  upcoming: number;
  averageRating: number;
  completionRate: number;
}
```

### Create `src/types/charts.ts`
```typescript
// Base chart data types
export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface CategoryDataPoint {
  category: string;
  value: number;
  percentage?: number;
}

// Chart configuration types
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title?: string;
  subtitle?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  colors?: string[];
}

// Widget data types
export interface WidgetData<T = unknown> {
  data: T;
  loading: boolean;
  error?: string;
  lastUpdated?: string;
}

export interface ChartWidgetProps<T = ChartDataPoint[]> {
  data: T;
  config?: ChartConfig;
  onDataPointClick?: (point: T extends Array<infer U> ? U : never) => void;
  loading?: boolean;
  error?: string;
}
```

### Create `src/types/filters.ts`
```typescript
// Generic filter types
export interface FilterOptions<T> {
  searchFields?: (keyof T)[];
  sortField?: keyof T;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface FilterResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// Date range filter
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
  range?: '1d' | '7d' | '30d' | '90d' | 'custom';
}

// Analytics filters
export interface AnalyticsFilter extends DateRangeFilter {
  channel?: 'email' | 'push' | 'inapp';
  type?: string;
  userId?: string;
}
```

## File-by-File Fix Plan

### Priority 1: High-Impact API Routes (Estimated: 3 hours)

#### 1. `src/app/api/admin/notifications/analytics/route.ts` (20 errors)
**Time**: 30 min
**Changes**:
- Line 24: `notifications: any[]` → `notifications: NotificationRow[]`
- Lines 148, 167, 168: Use `NotificationRow` type for filter/map callbacks
- Lines 214-267: Type all aggregate functions with proper return types

#### 2. `src/app/api/monitoring/business-metrics/route.ts` (9 errors)
**Time**: 25 min
**Changes**:
- Lines 85, 103: Type database query results with proper row types
- Lines 139, 167, 200: Use typed aggregation functions
- Lines 234, 265, 293, 341: Type helper function parameters

#### 3. `src/app/api/widgets/sessions/route.ts` (8 errors)
**Time**: 20 min
**Changes**:
- Lines 115-118: Type session query results as `SessionRow[]`
- Lines 124, 138, 145, 151: Type map/filter callbacks

#### 4. `src/app/api/widgets/feedback/route.ts` (7 errors)
**Time**: 20 min
**Changes**:
- Lines 73-74: Type feedback query results
- Lines 127-128: Type aggregation results
- Lines 178-180: Type filter callbacks

#### 5. `src/app/api/admin/system-health/route.ts` (5 errors)
**Time**: 15 min
**Changes**:
- Lines 79, 199, 209, 223, 237: Type error catch blocks as `unknown`

#### 6. `src/app/api/widgets/progress/route.ts` (5 errors)
**Time**: 15 min
**Changes**:
- Lines 143 (2x): Type progress data properly
- Lines 164, 170, 176: Type calculation functions

#### 7. `src/app/api/analytics/dashboard/route.ts` (4 errors)
**Time**: 15 min
**Changes**:
- Lines 52, 93, 121, 159: Type analytics query results

### Priority 2: Chart Components (Estimated: 2 hours)

#### 8. `src/components/charts/performance-optimized-chart.tsx` (8 errors)
**Time**: 30 min
**Changes**:
- Line 12: `data: any[]` → `data: T[]` with generic type parameter
- Line 77: Properly type React.cloneElement with generics
- Lines 96, 133, 137, 178, 183, 213: Use generic type throughout

#### 9. `src/components/charts/optimized-lazy-chart.tsx` (6 errors)
**Time**: 20 min
**Changes**:
- Lines 50, 53: Type chart data with `ChartDataPoint[]`
- Lines 111-115: Type render functions properly

#### 10. `src/components/charts/enhanced-chart-components.tsx` (3 errors)
**Time**: 15 min
**Changes**:
- Lines 61, 69, 75: Use proper chart data types

### Priority 3: Dashboard Utilities (Estimated: 1 hour)

#### 11. `src/components/dashboard/shared/hooks.ts` (6 errors)
**Time**: 20 min
**Changes**:
- Line 6: `data: any` → `data: T` with generic
- Lines 13, 15, 23, 28, 56: Use proper generic constraints

#### 12. `src/components/dashboard/client/recent-messages.tsx` (5 errors)
**Time**: 20 min
**Changes**:
- Lines 63, 99, 110, 113, 127: Type message data properly

#### 13. `src/components/client/progress-page.tsx` (6 errors)
**Time**: 20 min
**Changes**:
- Lines 107 (3x), 129, 134, 138: Type progress data

### Priority 4: File Management (Estimated: 1.5 hours)

#### 14-16. File-related routes and components
**Time**: 45 min total
**Changes**: Type file metadata properly using existing types

### Priority 5: Remaining Files (Estimated: 1 hour)

#### 17-20. Misc API routes and components
**Time**: 60 min total
**Changes**: Address remaining low-count files

## Shared Type Definitions to Create

1. **`src/types/api.ts`** - API response types, database row types
2. **`src/types/charts.ts`** - Chart data types, widget types
3. **`src/types/filters.ts`** - Filter and pagination types
4. **`src/types/analytics.ts`** - Analytics-specific types

## Implementation Strategy

### Phase 2A: Create Type Definitions (30 min)
1. Create the 4 new type files
2. Export from `src/types/index.ts`
3. Verify compilation

### Phase 2B: Fix API Routes (3-4 hours)
1. Start with notification analytics (highest count)
2. Move to monitoring/business metrics
3. Complete widget routes
4. Finish with smaller API routes

### Phase 2C: Fix Components (2-3 hours)
1. Fix chart components with generics
2. Update dashboard hooks
3. Fix remaining UI components

### Phase 2D: Verification (30 min)
1. Run `npm run typecheck`
2. Run `npm run lint`
3. Verify error count reduction
4. Run tests to ensure no breakage

## Success Criteria

- [ ] Reduce `any` errors from 164 to ~60 (63% reduction)
- [ ] All top 15 files fixed completely
- [ ] New type definitions created and documented
- [ ] Type safety improved in critical paths (API routes, charts)
- [ ] No new TypeScript compilation errors
- [ ] All existing tests pass

## Notes

- Some `any` types may need to remain (external library types, dynamic data)
- Use `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with explanation for necessary cases
- Prefer `unknown` over `any` when type is truly unknown
- Use generics for reusable components/functions
- Leverage existing `Database` type from Supabase for DB queries
