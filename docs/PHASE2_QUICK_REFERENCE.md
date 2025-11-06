# Phase 2: TypeScript `any` Type Fixes - Quick Reference

## Current Status
- **Total `any` errors**: 164
- **Files affected**: 51
- **Target**: Reduce to ~60 errors (63% reduction)

## Quick Wins (Top 10 Files = 95 errors, 58% of total)

1. `src/app/api/admin/notifications/analytics/route.ts` - 20 errors
2. `src/app/api/monitoring/business-metrics/route.ts` - 9 errors
3. `src/app/api/widgets/sessions/route.ts` - 8 errors
4. `src/components/charts/performance-optimized-chart.tsx` - 8 errors
5. `src/app/api/widgets/feedback/route.ts` - 7 errors
6. `src/components/charts/optimized-lazy-chart.tsx` - 6 errors
7. `src/components/client/progress-page.tsx` - 6 errors
8. `src/components/dashboard/shared/hooks.ts` - 6 errors
9. `src/app/api/admin/system-health/route.ts` - 5 errors
10. `src/app/api/widgets/progress/route.ts` - 5 errors

## Common Patterns & Fixes

### Pattern 1: Database Query Results
**Before**: `notifications: any[]`
**After**: `notifications: NotificationRow[]`
**Impact**: 35% of errors

### Pattern 2: Array Callbacks
**Before**: `data.filter((item: any) => ...)`
**After**: `data.filter((item: NotificationRow) => ...)`
**Impact**: 25% of errors

### Pattern 3: Chart Data
**Before**: `data: any[]`
**After**: `data: T[]` (generic) or `data: ChartDataPoint[]`
**Impact**: 20% of errors

### Pattern 4: Error Handlers
**Before**: `catch (error: any)`
**After**: `catch (error: unknown)`
**Impact**: 15% of errors

### Pattern 5: Generic Props
**Before**: `React.cloneElement(children as React.ReactElement<{ data?: any[] }>)`
**After**: `React.cloneElement(children as React.ReactElement<{ data?: T[] }>)`
**Impact**: 5% of errors

## New Type Files to Create

### 1. `src/types/api.ts`
Database rows, API responses, notification types, session types

### 2. `src/types/charts.ts`
Chart data points, time series, categories, widget props

### 3. `src/types/filters.ts`
Filter options, date ranges, analytics filters

### 4. `src/types/analytics.ts`
Analytics-specific types, metrics, stats

## Execution Order

### Step 1: Create Types (30 min)
```bash
# Create new type files
touch src/types/api.ts src/types/charts.ts src/types/filters.ts src/types/analytics.ts
# Update src/types/index.ts to export new types
```

### Step 2: Fix Top 3 API Routes (1.5 hours)
1. Notification analytics route (30 min)
2. Business metrics route (25 min)
3. Widget sessions route (20 min)

### Step 3: Fix Chart Components (1 hour)
1. Performance optimized chart (30 min)
2. Optimized lazy chart (20 min)
3. Enhanced chart components (15 min)

### Step 4: Fix Dashboard Utilities (1 hour)
1. Dashboard hooks (20 min)
2. Recent messages (20 min)
3. Progress page (20 min)

### Step 5: Remaining Files (2 hours)
Work through remaining 41 files systematically

## Testing Commands

```bash
# Check current error count
npm run lint 2>&1 | grep "Unexpected any" | wc -l

# Run type checking
npm run typecheck

# Run tests
npm test

# Full verification
npm run lint && npm run typecheck && npm test
```

## Success Metrics

- [ ] Error count: 164 → ~60 (63% reduction)
- [ ] All top 10 files: 100% fixed
- [ ] Top 20 files: 90%+ fixed
- [ ] New type files: Created and documented
- [ ] Tests: All passing
- [ ] TypeCheck: No new errors

## Common Gotchas

1. **Supabase Types**: Use `Database` type for queries
2. **React Generic Components**: Use `<T,>` syntax for generic functions
3. **Unknown vs Any**: Always prefer `unknown` for error handling
4. **Type Constraints**: Use `extends` for generic constraints
5. **Array Inference**: TypeScript can infer callback types from arrays

## Quick Fix Templates

### Template 1: Database Query
```typescript
import { Database } from '@/types/supabase';

const { data } = await supabase
  .from('notifications')
  .select('*');

// Type data properly based on table schema
```

### Template 2: Generic Function
```typescript
function processData<T extends Record<string, unknown>>(
  items: T[]
): ProcessedData<T> {
  return items.map((item: T) => transform(item));
}
```

### Template 3: Chart Component
```typescript
interface ChartProps<T = ChartDataPoint> {
  data: T[];
  config?: ChartConfig;
}

export const Chart = <T = ChartDataPoint,>({ 
  data, 
  config 
}: ChartProps<T>) => {
  // Implementation
};
```

### Template 4: Error Handler
```typescript
try {
  // risky operation
} catch (error: unknown) {
  const message = error instanceof Error 
    ? error.message 
    : 'Unknown error';
  console.error(message);
}
```

## Next Steps After Phase 2

1. Phase 3: Fix remaining unused variables
2. Phase 4: Fix import/order issues
3. Phase 5: Fix react/no-unescaped-entities
4. Phase 6: Final cleanup and optimization

## Resources

- Full Analysis: `docs/PHASE2_ANY_ANALYSIS.md`
- Before/After Examples: `docs/PHASE2_BEFORE_AFTER_EXAMPLES.md`
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/
- Supabase Types: https://supabase.com/docs/guides/api/typescript-support

