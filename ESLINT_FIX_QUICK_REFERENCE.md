# ESLint Fix - Quick Reference Guide

## TL;DR
- **Total Errors:** 473 across 123 files
- **Estimated Fix Time:** 12-20 hours
- **Top Issue:** Unused variables (56%)
- **Second Issue:** `any` types (33%)

---

## Priority Order

### 🟢 Phase 1: Quick Wins (3-5 hours)
1. ⚡ Prefix 48 unused params with `_` (1 hour)
2. ⚡ Fix 31 HTML entity errors (45 min)
3. 🔧 Remove 203 unused imports (2-3 hours)

### 🟡 Phase 2: Type Safety (6-12 hours)
4. 🎯 Fix 70 `any` types in API routes (4-6 hours)
5. 🎯 Fix 88 `any` types in components (4-6 hours)
6. 🔧 Fix 8 empty object types (30 min)

### 🔴 Phase 3: Cleanup (2-3 hours)
7. 🧹 Fix 62 unused assigned variables (2-3 hours)
8. ⚠️ Fix 5 React Hook violations (1 hour)
9. 🔧 Fix 6 import issues (30 min)

---

## Top 10 Files to Fix First

| # | Errors | File |
|---|--------|------|
| 1 | 25 | `src/app/api/admin/notifications/analytics/route.ts` |
| 2 | 24 | `src/components/files/advanced-file-manager.tsx` |
| 3 | 20 | `src/app/coach/sessions/page.tsx` |
| 4 | 17 | `src/components/admin/notification-analytics-dashboard.tsx` |
| 5 | 15 | `src/app/api/monitoring/business-metrics/route.ts` |
| 6 | 12 | `src/app/api/admin/system-health/route.ts` |
| 7 | 12 | `src/app/client/client-dashboard.tsx` |
| 8 | 12 | `src/app/client/coach/[id]/page.tsx` |
| 9 | 11 | `src/components/coach/file-management.tsx` |
| 10 | 11 | `src/components/files/file-browser.tsx` |

**Fixing these 10 files = 159 errors (34% of total)**

---

## Common Fix Patterns

### Unused Parameters
```typescript
// Before
async function GET(request: NextRequest, context: any) {

// After  
async function GET(_request: NextRequest, _context: any) {
```

### HTML Entities
```tsx
// Before
<p>Don't worry</p>

// After
<p>Don&apos;t worry</p>
```

### Any Types
```typescript
// Before
const data: any = await fetch(...).then(r => r.json());

// After
interface ApiResponse { id: string; name: string; }
const data: ApiResponse = await fetch(...).then(r => r.json());
```

### Unused Imports
```typescript
// Before
import { useState, useEffect, useMemo } from 'react'; // useMemo not used

// After
import { useState, useEffect } from 'react';
```

---

## Quick Commands

```bash
# Run linter
npm run lint

# Count remaining errors
npm run lint 2>&1 | grep "Error:" | wc -l

# Fix auto-fixable issues (import order, etc.)
npm run lint -- --fix

# Type check
npm run type-check
```

---

## Most Common Unused Items

**Unused Imports (can bulk remove):**
- `request` parameter (24×)
- `applyCorsHeaders` (14×)
- `context` parameter (9×)
- UI components: `CardTitle`, `CardDescription`, `CardHeader` (14×)
- Chart icons: `BarChart3`, `TrendingUp`, etc. (10+×)

---

## Team Distribution Suggestion

**Developer 1:** API routes - unused params + type fixes  
**Developer 2:** Components - unused imports  
**Developer 3:** Components - type fixes  
**Developer 4:** Pages - all errors  
**Developer 5:** Tests + final cleanup  

---

## Success Checkpoints

✅ After Phase 1: <200 errors remaining  
✅ After Phase 2: <100 errors remaining  
✅ After Phase 3: 0 errors remaining  

---

## Don't Forget

1. Test after each phase
2. Commit after each major milestone
3. Some "unused" variables may indicate incomplete features
4. Add pre-commit hooks after fixing to prevent regression

---

For detailed information, see: `ESLINT_FIX_ANALYSIS.md`
