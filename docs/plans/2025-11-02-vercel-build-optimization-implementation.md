# Vercel Build Performance Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce Vercel build time from 4 minutes to <3 minutes (30-50% improvement) by optimizing build process, dependencies, and code cleanup.

**Architecture:** Three-phase optimization: (1) skip type-checking on Vercel/run in CI instead, (2) dynamic imports for heavy libraries, (3) remove unused build artifacts and scripts.

**Tech Stack:** Next.js 15 with Turbopack, Supabase, TypeScript, Vercel deployment platform

---

## Phase 1: Build Process Optimization (Quick Wins)

### Task 1: Update package.json build script to skip TypeScript on Vercel

**Files:**

- Modify: `package.json`

**Context:** The build script currently runs `next build`, but Next.js will invoke TypeScript checking if `typescript` is configured. We need to skip this on Vercel while keeping it for local development.

**Step 1: Examine current build script**

Run: `cat package.json | grep -A2 '"build"'`

Current output:

```
"build": "next build && node scripts/cache-bust-deployment.js",
```

**Step 2: Update build script to conditionally skip type-check**

Replace in `package.json` (line 7):

From:

```json
"build": "next build && node scripts/cache-bust-deployment.js",
```

To:

```json
"build": "next build",
```

(We'll remove the cache-bust script separately - it's handled by Vercel headers)

Also add a new script for type-checking:

Add before the `build` script:

```json
"type-check": "tsc --noEmit",
```

**Step 3: Create Vercel build environment detection**

Add to `vercel.json` (create if doesn't exist):

```json
{
  "buildCommand": "npm run build",
  "env": {
    "SKIP_ENV_VALIDATION": "1"
  },
  "functions": {
    "api/**/*.ts": {
      "memory": 3008,
      "maxDuration": 60
    }
  },
  "crons": []
}
```

**Step 4: Verify changes**

Run: `npm run build`

Expected: Build completes without TypeScript checking (faster)

**Step 5: Commit**

```bash
git add package.json vercel.json
git commit -m "perf: skip type-check in Vercel build, run in CI instead"
```

---

### Task 2: Create .vercelignore to prevent uploading non-essential files

**Files:**

- Create: `.vercelignore`

**Context:** Vercel builds everything, including test files and docs. We'll exclude these to reduce slug size and build time.

**Step 1: Create .vercelignore file**

Create file `.vercelignore` with content:

```
# Test files
**/*.test.ts
**/*.test.tsx
**/*.spec.ts
**/*.spec.tsx
tests/
test/

# Documentation (don't need to build docs)
docs/
docs/**/*.md
README.md

# Development utilities
.env.local
.env.*.local
.husky/
.git/
.gitignore
.prettierignore
.eslintignore

# Analysis and monitoring scripts (don't run in production)
scripts/analyze-bundle.js
scripts/bundle-monitor.js
scripts/bundle-performance-monitor.js
scripts/performance-audit.js
scripts/dev-watch.js
scripts/validate-api-docs.js

# Build artifacts
.next/cache/
dist/
build/
.turbo/
.vitest/
.playwright/
coverage/

# Node modules (Vercel installs from package.json)
node_modules/.bin/
node_modules/.cache/

# IDE and OS files
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store
Thumbs.db
```

**Step 2: Verify file is created**

Run: `cat .vercelignore | head -20`

Expected: First 20 lines of .vercelignore

**Step 3: Commit**

```bash
git add .vercelignore
git commit -m "perf: add .vercelignore to prevent uploading unnecessary files"
```

---

### Task 3: Optimize environment loading in src/env/runtime.js

**Files:**

- Modify: `src/env/runtime.js`

**Context:** Environment variables are loaded per module import. We'll cache them to avoid repeated lookups during build.

**Step 1: Read current file**

Run: `cat src/env/runtime.js`

**Step 2: Update to cache environment variables**

Replace entire file with:

```javascript
/**
 * Server-side environment variables loader
 * Cached to avoid repeated lookups during build and runtime
 */

const envCache = {};

function getEnvVar(key, defaultValue) {
  if (envCache[key] !== undefined) {
    return envCache[key];
  }

  const value = process.env[key] ?? defaultValue;
  envCache[key] = value;
  return value;
}

// Validate critical environment variables exist
function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_APP_URL',
  ];

  const missing = required.filter(key => !process.env[key] && !envCache[key]);

  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    console.error(
      'Missing required environment variables:',
      missing.join(', ')
    );
    // Don't throw - Vercel might set these after initial load
  }
}

// Cache environment variables once at startup
validateEnv();

const serverEnv = {
  // Supabase configuration
  NEXT_PUBLIC_SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  NEXT_PUBLIC_SUPABASE_PROJECT_HOST: getEnvVar(
    'NEXT_PUBLIC_SUPABASE_PROJECT_HOST'
  ),

  // App configuration
  NEXT_PUBLIC_APP_URL: getEnvVar(
    'NEXT_PUBLIC_APP_URL',
    'http://localhost:3000'
  ),
  NEXT_PUBLIC_APP_NAME: getEnvVar('NEXT_PUBLIC_APP_NAME', 'Loom'),

  // Feature flags
  NEXT_PUBLIC_ENABLE_ANALYTICS: getEnvVar(
    'NEXT_PUBLIC_ENABLE_ANALYTICS',
    'true'
  ),

  // Database
  DATABASE_URL: getEnvVar('DATABASE_URL'),

  // Auth
  SUPABASE_SERVICE_ROLE_KEY: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),

  // API keys
  SENTRY_AUTH_TOKEN: getEnvVar('SENTRY_AUTH_TOKEN'),
};

module.exports = { serverEnv };
```

**Step 3: Verify file syntax**

Run: `node -c src/env/runtime.js`

Expected: No syntax errors

**Step 4: Commit**

```bash
git add src/env/runtime.js
git commit -m "perf: cache environment variables to reduce build-time lookups"
```

---

## Phase 2: Bundle & Dependency Optimization

### Task 4: Add dynamic imports for heavy libraries (framer-motion, recharts, pdf-lib)

**Files:**

- Find and modify: Files importing `framer-motion`, `recharts`, `pdf-lib`

**Context:** These libraries are large (45-68KB each) and not needed for initial page load. We'll use dynamic imports to load them on-demand.

**Step 1: Find files importing heavy libraries**

Run: `grep -r "from ['\"]framer-motion" src/ --include="*.tsx" --include="*.ts" | head -10`

Expected: List of files importing framer-motion

**Step 2: Example - Update a Framer Motion component for dynamic import**

For components using framer-motion, wrap with dynamic import:

Find: `src/components/motion/` directory

For each component file, replace:

From:

```typescript
import { motion } from 'framer-motion';

export function AnimatedCard() {
  return (
    <motion.div>
      {/* content */}
    </motion.div>
  );
}
```

To:

```typescript
import dynamic from 'next/dynamic';

const motion = dynamic(
  () => import('framer-motion').then(mod => ({ default: mod.motion })),
  { ssr: false }
);

export const AnimatedCard = dynamic(() => import('./AnimatedCard.inner'), {
  ssr: false,
});
```

**Step 3: Update Recharts usage**

Find files importing `recharts`. Wrap chart components:

From:

```typescript
import { LineChart, Line } from 'recharts';

export function Dashboard() {
  return <LineChart data={data}><Line /></LineChart>;
}
```

To:

```typescript
import dynamic from 'next/dynamic';

const LineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  { loading: () => <div>Loading chart...</div> }
);

export const Dashboard = dynamic(() => import('./Dashboard.inner'));
```

**Step 4: PDF Library - Update export functionality**

Find: `src/` files importing `pdf-lib`

Wrap PDF functionality in dynamic import:

From:

```typescript
import { PDFDocument } from 'pdf-lib';

export async function exportPDF(data) {
  const pdf = await PDFDocument.create();
  // ...
}
```

To:

```typescript
export async function exportPDF(data) {
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  // ...
}
```

**Step 5: Verify no build errors**

Run: `npm run build 2>&1 | grep -i error`

Expected: No errors (warnings about dynamic imports are OK)

**Step 6: Test dynamic imports work**

Run: `npm run test:run -- --include="**/integration/**" 2>&1 | tail -20`

Expected: Integration tests pass

**Step 7: Commit**

```bash
git add -A
git commit -m "perf: use dynamic imports for heavy libraries (framer-motion, recharts, pdf-lib)"
```

---

### Task 5: Extend optimizePackageImports in next.config.js

**Files:**

- Modify: `next.config.js` (lines 13-25)

**Context:** The config already has `optimizePackageImports`, but we can extend it to more libraries.

**Step 1: Read current optimizePackageImports section**

Run: `sed -n '13,25p' next.config.js`

**Step 2: Update to include more libraries**

Replace lines 13-25:

From:

```javascript
optimizePackageImports: [
  '@radix-ui/react-icons',
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-select',
  '@radix-ui/react-tabs',
  '@radix-ui/react-toast',
  'lucide-react',
  '@supabase/supabase-js',
  '@tanstack/react-query',
  'recharts',
  'date-fns',
],
```

To:

```javascript
optimizePackageImports: [
  '@radix-ui/react-icons',
  '@radix-ui/react-accordion',
  '@radix-ui/react-alert-dialog',
  '@radix-ui/react-avatar',
  '@radix-ui/react-checkbox',
  '@radix-ui/react-collapsible',
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-hover-card',
  '@radix-ui/react-label',
  '@radix-ui/react-menubar',
  '@radix-ui/react-navigation-menu',
  '@radix-ui/react-popover',
  '@radix-ui/react-progress',
  '@radix-ui/react-radio-group',
  '@radix-ui/react-scroll-area',
  '@radix-ui/react-select',
  '@radix-ui/react-separator',
  '@radix-ui/react-slider',
  '@radix-ui/react-slot',
  '@radix-ui/react-switch',
  '@radix-ui/react-tabs',
  '@radix-ui/react-toast',
  '@radix-ui/react-toggle',
  '@radix-ui/react-tooltip',
  'lucide-react',
  '@supabase/supabase-js',
  '@supabase/ssr',
  '@tanstack/react-query',
  'recharts',
  'date-fns',
  'zod',
],
```

**Step 3: Verify syntax**

Run: `node -c next.config.js`

Expected: No syntax errors

**Step 4: Commit**

```bash
git add next.config.js
git commit -m "perf: extend optimizePackageImports to more Radix UI components"
```

---

## Phase 3: Code Cleanup & Build Artifact Reduction

### Task 6: Audit and remove unused scripts from scripts/ directory

**Files:**

- Audit: `scripts/` directory
- Delete: Unused scripts

**Context:** Many scripts are dev-only or for analysis and don't need to be in production builds.

**Step 1: List all scripts**

Run: `ls -la scripts/ | grep "\.js\|\.sh"`

Expected: List of all scripts

**Step 2: Identify non-production scripts**

These are safe to remove from build:

- `analyze-bundle.js` - Dev analysis only
- `bundle-monitor.js` - Dev monitoring
- `bundle-performance-monitor.js` - Dev monitoring
- `performance-audit.js` - Dev analysis
- `dev-watch.js` - Development only
- `validate-api-docs.js` - Dev validation
- `run-baseline-suite.js` - Test runner

**Step 3: Move dev-only scripts to separate directory**

Run:

```bash
mkdir -p scripts/dev-only
mv scripts/analyze-bundle.js scripts/dev-only/
mv scripts/bundle-monitor.js scripts/dev-only/
mv scripts/bundle-performance-monitor.js scripts/dev-only/
mv scripts/performance-audit.js scripts/dev-only/
mv scripts/dev-watch.js scripts/dev-only/
mv scripts/validate-api-docs.js scripts/dev-only/
```

**Step 4: Update package.json to reference new location**

Run: `grep -n "analyze" package.json | head -3`

Update all analyze scripts in package.json to point to `scripts/dev-only/`:

From:

```json
"analyze": "node scripts/analyze-bundle.js",
"analyze:quick": "node scripts/bundle-monitor.js --quick",
```

To:

```json
"analyze": "node scripts/dev-only/analyze-bundle.js",
"analyze:quick": "node scripts/dev-only/bundle-monitor.js --quick",
```

And similar for other moved scripts.

**Step 5: Verify build still works**

Run: `npm run build 2>&1 | tail -10`

Expected: Build completes successfully

**Step 6: Commit**

```bash
git add scripts/ package.json
git commit -m "perf: move dev-only scripts to separate directory to reduce build artifacts"
```

---

### Task 7: Verify Sentry initialization is client-side only

**Files:**

- Find: Sentry initialization files

**Context:** Sentry should not initialize during build compilation, only at runtime on the client.

**Step 1: Find Sentry initialization**

Run: `grep -r "Sentry\\.init\|sentry/nextjs" src/ --include="*.ts" --include="*.tsx" | head -10`

**Step 2: Check instrumentation.ts or sentry.client.config.ts**

Run: `find src/ -name "*sentry*" -o -name "*instrumentation*"`

Expected: Files like `src/sentry.client.config.ts` or similar

**Step 3: Verify Sentry is client-only**

Check file should have:

```typescript
// Mark as client-side only
'use client';

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // Only on client
  enabled: typeof window !== 'undefined',
});
```

**Step 4: If Sentry is in server code, move initialization**

If you find `Sentry.init` in server-side code (like `src/middleware.ts` or API routes), wrap with client check:

```typescript
// Only initialize on client-side
if (typeof window !== 'undefined') {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });
}
```

**Step 5: Verify build**

Run: `npm run build 2>&1 | grep -i "sentry\|instrumentation" | head -5`

Expected: No build-time Sentry initialization errors

**Step 6: Commit if changes made**

```bash
git add src/
git commit -m "perf: ensure Sentry initialization is client-side only"
```

---

### Task 8: Optimize webpack configuration for better tree-shaking

**Files:**

- Modify: `next.config.js` (webpack section)

**Context:** The config already has good optimizations. We'll add explicit side-effects exclusions for more libraries.

**Step 1: Read webpack optimization section**

Run: `sed -n '282,335p' next.config.js`

**Step 2: Add more aggressive tree-shaking**

Find the `splitChunks` section (around line 286) and ensure `sideEffects` is properly configured:

The webpack section should have (already present in your config):

```javascript
optimization: {
  usedExports: true,
  sideEffects: false,  // Remove side effects globally
  concatenateModules: true,  // Module concatenation
}
```

**Step 3: Add webpack rule to mark pure libraries**

In the webpack callback function, before `return config`, add:

```javascript
// Mark specific libraries as side-effect free for better tree-shaking
config.module.rules.forEach(rule => {
  if (rule.test && rule.test.toString().includes('js')) {
    rule.sideEffects = false;
  }
});
```

**Step 4: Verify configuration**

Run: `node -c next.config.js`

Expected: No syntax errors

**Step 5: Build and check optimization**

Run: `npm run build 2>&1 | grep -i "chunk\|bundle" | tail -10`

Expected: Build output shows optimized chunks

**Step 6: Commit**

```bash
git add next.config.js
git commit -m "perf: enhance webpack tree-shaking configuration for better optimization"
```

---

## Phase 4: Testing & Verification

### Task 9: Run local build and verify functionality

**Files:**

- Test: Full application build

**Step 1: Clean build artifacts**

Run: `rm -rf .next && npm run build`

Expected: Fresh build completes in <2 minutes locally

**Step 2: Verify no type errors (locally, for validation)**

Run: `npm run type-check 2>&1`

Expected: TypeScript validation passes (0 errors)

**Step 3: Start dev server**

Run: `npm run dev`

Expected: Development server starts successfully

**Step 4: Test critical features in browser**

Navigate to:

- Home page: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard
- Settings: http://localhost:3000/settings
- Any page with animations, charts, or PDF export

Expected: All features work correctly

**Step 5: Check console for errors**

Open browser DevTools console:

Expected: No errors related to failed imports or dynamic loading

**Step 6: Run test suite**

Run: `npm run test:run 2>&1 | tail -20`

Expected: All tests pass

**Step 7: Commit test verification**

```bash
git add -A
git commit -m "test: verify build optimizations maintain full functionality"
```

---

### Task 10: Build and test on Vercel-like environment

**Files:**

- Test: Production build

**Step 1: Build for production**

Run: `SKIP_ENV_VALIDATION=1 npm run build 2>&1`

Expected: Build completes in <3 minutes

**Step 2: Check build output**

Run: `ls -lh .next/static/chunks/ | head -10`

Expected: Individual chunk files are present and reasonable size (<250KB each)

**Step 3: Create production server start**

Run: `npm run start`

Expected: Production server starts

**Step 4: Test production functionality**

In browser, test same critical features:

- Pages load
- Animations/charts work when accessed
- No console errors

Expected: Full functionality maintained

**Step 5: Stop server**

Run: `Ctrl+C` to stop production server

**Step 6: Measure build time**

Run: `time npm run build`

Expected: Time report shows <3 minutes for Vercel-like environment

**Step 7: Final commit**

```bash
git add -A
git commit -m "test: verify production build optimizations complete successfully"
```

---

## Phase 5: Deployment & Monitoring

### Task 11: Deploy to Vercel and measure results

**Files:**

- Monitor: Vercel deployment logs

**Context:** Push the optimized code to Vercel and measure actual build time improvement.

**Step 1: Push changes to git**

Run: `git log --oneline | head -10`

Expected: Latest commits show optimization changes

**Step 2: Push to remote**

Run: `git push origin feat/vercel-build-optimization`

Expected: Branch pushed successfully

**Step 3: Create pull request on GitHub**

Run: `gh pr create --title "perf: optimize Vercel build performance" --body "Reduces build time from 4 min to <3 min through process optimization, bundle improvements, and cleanup"`

Expected: PR created and shows in GitHub

**Step 4: Monitor Vercel deployment**

Go to Vercel dashboard and watch the build:

- Note the Build Time in the deployment log
- Check for any build errors or warnings

Expected: Build completes successfully in <3 minutes

**Step 5: Test deployed version**

Visit deployed preview URL and test:

- Pages load and render correctly
- No console errors
- All features work

Expected: Production deployment works perfectly

**Step 6: Merge PR to main if successful**

Run: `git checkout main && git pull && git merge feat/vercel-build-optimization`

Or use GitHub UI to merge PR

**Step 7: Final commit on main**

The merge is the final commit.

---

## Success Criteria Checklist

- [ ] Package.json build script no longer includes type-check
- [ ] .vercelignore created and preventing unnecessary uploads
- [ ] Environment loading is cached in src/env/runtime.js
- [ ] Heavy libraries use dynamic imports (framer-motion, recharts, pdf-lib)
- [ ] optimizePackageImports extended to all Radix UI components
- [ ] Dev-only scripts moved to scripts/dev-only/
- [ ] Sentry initialization is client-side only
- [ ] Webpack tree-shaking properly configured
- [ ] Local build time <2 minutes
- [ ] Production build time <3 minutes
- [ ] All tests passing
- [ ] All features functional
- [ ] Vercel build time reduced from 4 minutes to <3 minutes
- [ ] PR merged to main

---

## Rollback Plan

If any issues occur post-deployment:

1. Revert to previous main commit: `git revert <commit-hash>`
2. Redeploy from main
3. Investigate specific optimization causing issue
4. Fix in new feature branch
5. Test thoroughly before re-deploying

Key commits to reference for rollback:

- Before optimization: `git log main | head -1` (get latest before PR merge)

---

## Notes for Implementation

- Use `@superpowers:test-driven-development` for any new test requirements
- Run tests frequently - don't skip validation steps
- Each commit should represent one logical change
- Keep commit messages clear and descriptive
- If you hit issues, refer back to design document in `docs/plans/2025-11-02-vercel-build-optimization-design.md`
