# Vercel Build Performance Optimization Design

**Date:** November 2, 2025
**Status:** Design Approved
**Priority:** High - Reduce build time from ~4 minutes to <3 minutes

## Problem Statement

Vercel builds have gradually slowed from 1 minute to 4 minutes, impacting deployment velocity. Local builds are fast, indicating the slowdown is specific to Vercel's build environment.

## Goals

- Reduce Vercel build time by 30-50% (target: 2-2.5 minutes)
- Maintain full functionality and feature parity
- Improve deployment experience for the team
- Create sustainable build optimization practices

## Selected Approach: Hybrid Smart Optimization

The design combines three complementary strategies:

### 1. Build Process Optimization (25-35% improvement)

**Core Strategy:** Remove non-essential checks from the Vercel build pipeline and leverage better caching.

**Changes:**

- **Disable TypeScript checking on Vercel** - Move `tsc --noEmit` from build script to CI/GitHub Actions
  - TypeScript checking will run separately in parallel CI checks
  - Vercel build focuses only on Next.js compilation

- **Optimize Prisma build** - Pre-compile Prisma client to avoid runtime generation during build
  - Ensure `node_modules/.prisma` is preserved between builds
  - Leverage Vercel's caching for node_modules

- **Remove redundant build scripts** - The `cache-bust-deployment.js` adds overhead
  - Replace with Vercel's built-in cache invalidation headers

- **Optimize environment loading** - `src/env/runtime.js` should load once, not per-module
  - Reduce module load time during build compilation

**Impact:** 25-35% faster (4 min → ~2.5-3 min)

### 2. Bundle & Dependency Optimization (10-15% additional improvement)

**Core Strategy:** Ship less code upfront through strategic dynamic imports and tree-shaking.

**Changes:**

- **Dynamic imports for heavy libraries:**
  - `framer-motion` (12KB) - Only load when animations are used
  - `recharts` (45KB) - Load only in chart components
  - `pdf-lib` (68KB) - Load only in PDF export features

- **Extend aggressive tree-shaking:**
  - Add explicit `.sideEffects: false` for more dependencies in webpack config
  - Current `usedExports: true` helps; we'll add module concatenation

- **Optimize Radix UI imports:**
  - Extend `optimizePackageImports` list to capture all Radix components
  - Reduce individual component bundle overhead

- **Lazy-load route components:**
  - Dashboard routes load on first access
  - Admin routes load on demand
  - Uses Next.js's built-in dynamic imports

- **Audit unused dependencies:**
  - Remove or consolidate packages that aren't actively used
  - Review `node_modules` size in build output

**Impact:** 10-15% additional reduction (cumulative → ~2-2.5 min)

### 3. Code Cleanup & Build Artifact Reduction (10-20% additional improvement)

**Core Strategy:** Remove non-production artifacts and unused build scripts.

**Changes:**

- **Audit scripts directory:**
  - Remove unused monitoring/analysis scripts from production build
  - Keep only essential runtime scripts
  - Move dev-only scripts to a separate directory

- **Simplify Sentry integration:**
  - Defer non-critical Sentry initialization to client-side
  - Don't initialize Sentry during build compilation

- **Remove build-time linting:**
  - Already disabled via `ignoreDuringBuilds: true`
  - Verify no other linting runs during build

- **Optimize test artifacts:**
  - Exclude test files from production build
  - Ensure `.vitest` and `.playwright` caches don't bloat build

- **Create .vercelignore:**
  - Prevent uploading unnecessary files (test fixtures, docs, etc.)
  - Reduce slug size and upload time

**Impact:** 10-20% additional reduction (cumulative → <2.5 min target)

## Configuration Changes Summary

### Files to Modify

1. **next.config.js**
   - Update build script handling
   - Optimize webpack config (already partially optimized)
   - Ensure proper caching headers

2. **package.json**
   - Update build script to skip TypeScript checking on Vercel
   - Add conditional for `CI` environment variable
   - Keep type-check as separate command for local development

3. **src/env/runtime.js**
   - Optimize module loading to reduce compile time
   - Cache environment values

4. **.vercelignore** (create new)
   - Exclude test files, docs, node_modules artifacts

5. **vercel.json** (optional - create if needed)
   - Configure build cache strategy
   - Set environment-specific build commands

6. **scripts/** directory
   - Audit and remove unused monitoring/analysis scripts
   - Move dev-only utilities out of production path

## Implementation Order

1. Update `package.json` build script (quick win - skip type-check on Vercel)
2. Create `.vercelignore` and `vercel.json` for caching
3. Optimize `src/env/runtime.js` for faster loading
4. Update `next.config.js` with enhanced webpack optimizations
5. Add dynamic imports for heavy libraries
6. Audit and clean scripts directory
7. Verify Sentry initialization is client-side only
8. Test build locally with `npm run build`
9. Deploy to staging and measure Vercel build time

## Testing & Validation

**Before deployment:**

- Local build time (should be similar or faster)
- Bundle analysis to verify chunk sizes
- Functionality testing across main features
- Type-checking still works in CI

**After deployment:**

- Measure Vercel build time
- Verify no functionality loss
- Check for error/warning messages in Vercel logs
- Monitor staging environment for issues

## Success Criteria

- [ ] Vercel build time reduced from 4 minutes to <3 minutes (minimum 25% improvement)
- [ ] All features remain fully functional
- [ ] No increase in bundle size or performance degradation
- [ ] Type-checking still validates code before production
- [ ] Team can deploy confidently without waiting 4+ minutes

## Risk Assessment

**Low Risk:**

- Disabling type-check on Vercel (still runs in CI)
- Creating .vercelignore (reduces upload size)
- Removing unused scripts (tested before removal)

**Medium Risk:**

- Dynamic imports for libraries (requires testing of affected features)
- Prisma pre-compilation (needs verification of client generation)

**Mitigation:**

- Test staging deployment before production
- Keep rollback plan (revert to original build script if issues arise)
- Maintain separate CI checks for code quality

## Timeline

**Phase 1 (Quick wins):** 30 minutes

- Update package.json, create .vercelignore

**Phase 2 (Core optimizations):** 1-2 hours

- Environment loading, webpack config, dynamic imports

**Phase 3 (Polish & testing):** 1 hour

- Script cleanup, final testing, deployment

**Total:** 2.5-3.5 hours of implementation work

## Future Optimizations (Out of Scope)

- React Compiler (requires Next.js canary, PPR experimental)
- Next.js 16 upgrades and automatic optimizations
- Custom build caching strategies beyond Vercel defaults
- Database query optimization for build-time operations
