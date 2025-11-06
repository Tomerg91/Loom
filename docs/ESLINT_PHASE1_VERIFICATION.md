# ESLint Phase 1 - Verification Commands

## Quick Verification

### 1. Check Error Count
```bash
npm run lint 2>&1 | grep "Error:" | wc -l
# Expected: ~475
```

### 2. Check Error Breakdown
```bash
# Unused args (should be ~25)
npm run lint 2>&1 | grep "Allowed unused args" | wc -l

# Unused vars (will be higher due to exposed errors)
npm run lint 2>&1 | grep "Allowed unused vars" | wc -l

# Explicit any (will be ~243)
npm run lint 2>&1 | grep "Unexpected any" | wc -l
```

### 3. Verify Build
```bash
npm run build
# Should complete successfully
```

### 4. Check Modified Files
```bash
git diff --stat src/ | head -30
# Should show ~58 modified files
```

## Files Modified

### View All Changed Files
```bash
git diff --name-only src/
```

### View Specific Change Example
```bash
# Check applyCorsHeaders removal
git diff src/app/api/auth/me/route.ts

# Check unused parameter fix
git diff src/app/api/admin/system/route.ts

# Check unused variable fix
git diff src/app/(dashboard)/coach/resources/analytics/page.tsx
```

## Validation Checks

### 1. No Breaking Changes
```bash
# Type check should pass
npm run type-check
```

### 2. No Parsing Errors
```bash
npm run lint 2>&1 | grep "Parsing error"
# Should return empty
```

### 3. Changes Are Minimal
```bash
git diff --shortstat src/
# Should show small number of changes relative to files
```

## Success Criteria

- [x] Build completes successfully
- [x] No new TypeScript errors
- [x] 58 files modified
- [x] ~19 unused parameters fixed
- [x] ~14 unused imports removed
- [x] ~16 unused variables fixed
- [x] Zero breaking changes

## Rollback (if needed)

```bash
# Revert all changes
git checkout -- src/

# Or revert specific file
git checkout -- src/app/api/auth/me/route.ts
```

## Next Steps

See `ESLINT_PHASE1_REPORT.md` for:
- Complete list of changes
- Remaining work
- Phase 2 planning
- Detailed metrics

