# Loom App — Refactor & Enhancement Master Plan

This document provides a step‑by‑step plan to refactor, harden, and enhance the Loom App. It’s designed to be executable by a single developer or a small team, with clear sequencing, acceptance criteria, and validation steps.

- Target stack: Next.js 15 (App Router), React 19, TypeScript, Tailwind v4, Radix UI, Supabase, React Query v5, Zustand, next-intl, Vitest, Playwright, Sentry
- CI/CD: GitHub Actions → Vercel (staging/prod), Supabase CLI migrations, Lighthouse CI, Trivy

---

## 1) Goals & Non‑Goals

- Maintainability: Clear module boundaries, shared guards/utilities, reduced duplication
- Reliability: Consistent auth/permission checks, validated inputs, uniform security headers
- Performance: Smaller client bundles, smart caching, server/client boundary hygiene
- DX: Single env source, strict lint rules, Storybook, strong tests, useful docs
- I18n: Predictable locale routing and redirects, zero interference with static assets

Non‑goals: Rewriting features, changing product scope, large visual redesigns.

---

## 2) Repository Map (High Level)

- `src/app` — App Router pages and API route handlers
  - `[locale]/*` — localized pages (admin, auth, client, coach, dashboard, files, sessions, settings)
  - `api/*` — server route handlers (admin, auth, files, notes, notifications, sessions, share, users, widgets)
- `src/components` — feature components + `ui`, `providers`, `monitoring`
- `src/lib` — cross‑cutting code (auth, api, security, database, performance, notifications, supabase, utils)
- `src/i18n` — next‑intl routing/config
- `src/messages` — locale JSON bundles
- `src/middleware.ts` — i18n + auth gating + headers
- `supabase` — migrations, seeds, config
- Tests: `tests/*` (Playwright), `src/test/*` (Vitest)
- Tooling: `eslint.config.mjs`, `tailwind.config.ts`, `playwright*.ts`, `vitest.config.ts`

---

## 3) Guiding Principles

- Single Source of Truth: one env module; one guard pattern for API routes; one query key factory
- Server/Client Separation: keep server logic out of client bundles; prefer server components where possible
- Edge‑safe Middleware: minimal logic; deterministic ordering; zero static asset interference
- Cohesion & Encapsulation: co‑locate domain logic; keep modules small and composable
- Test‑First High‑Risk Changes: middleware, guards, env loading, and security headers get tests before refactors
- Incremental, Reversible Steps: feature‑flag or route‑by‑route migrations; measure before/after

---

## 4) Phased Roadmap

Each phase lists concrete tasks, acceptance criteria (AC), and validation steps.

### Phase 1 — Foundation & Conventions (1 week)

1. Consolidate env handling
   - Current: `src/env.mjs`, `src/env-server.mjs` (two sources; risk of drift)
   - Target: `src/env/index.ts` exporting `env.server` and `env.client` using `@t3-oss/env-nextjs`
   - AC:
     - All imports reference `@/env` only
     - Build/dev/tests pass without accessing undefined env vars
   - Validate:
     - Run `npm run validate:env` (existing script) and `npm run type-check`

2. ESLint import rules & boundaries
   - Add/prefer: import order, disallow deep imports across domains, prevent cycles
   - AC:
     - CI lint passes with new rules
   - Validate:
     - `npm run lint` locally; fix violations incrementally

3. Barrel exports for core folders
   - Add `index.ts` to `src/lib/{auth,security,api}` and `src/components/ui`
   - AC:
     - Imports use `@/lib/auth` or `@/components/ui` consistently
   - Validate:
     - `rg "from '@/lib/auth/"` finds only module‑level imports

4. CONTRIBUTING.md
   - Include: setup, env, DB migrations, running tests, code style, commit guidance
   - AC:
     - New dev can run app and tests with listed steps

### Phase 2 — Middleware Slim‑Down & API Guards (1–2 weeks)

1. Slim middleware
   - Keep: i18n routing, static asset bypass, security headers application
   - Move out: auth route protection to server components/API guards
   - AC:
     - Static assets always bypass; i18n redirects correct; no auth logic divergence
   - Validate:
     - Add Vitest integration tests for static bypass and locale redirect rules

2. API guard utilities
   - Introduce `src/lib/api/guard.ts` with composable wrappers:
     - `withAuth(handler)` — ensure session
     - `withRole(roles)(handler)` — role‑based access
     - `withRateLimit(key?, opts?)(handler)` — consistent rate limit
     - `compose(handler, ...guards)` — helper to layer guards
   - AC:
     - 1–2 critical routes migrated (e.g., `app/api/notifications/*`, `app/api/files/*`)
   - Validate:
     - Unit tests for each guard; integration test for a migrated route

3. Security headers uniformity
   - Ensure `applySecurityHeaders` runs once per response path (middleware + API as fallback)
   - AC:
     - Snapshot test of headers on key routes (HTML + JSON)

### Phase 3 — Components & Design System (2 weeks)

1. Design tokens & theming
   - Define CSS variables (colors, spacing, typography, radii) and Tailwind theme tokens
   - AC:
     - Global tokens referenced by `components/ui/*` without hardcoded values
   - Validate:
     - Visual parity checks; Lighthouse accessibility unaffected or improved

2. Component API normalization
   - Consistent prop names (`onChange`, `variant`, `size`, `disabled`, `className`)
   - AC:
     - Updated `Button`, `Input`, `Select`, `Dialog`, `Toast` foundations; docs in Storybook

3. Storybook setup
   - Add Storybook, initial stories for `ui` and one feature component per domain
   - AC:
     - Commands: `npm run storybook`; stories render without errors

### Phase 4 — State & Data (1–2 weeks)

1. React Query key factories
   - `src/lib/queryKeys.ts` with stable keys per domain: `auth`, `files`, `notifications`, `sessions`, `users`
   - AC:
     - Queries/mutations use factory keys; invalidations standardized

2. Zustand audit
   - Ensure global UI‑only state; migrate server data state into React Query
   - AC:
     - No server‑sourced data in Zustand stores; SSR hydration consistent

3. Data fetching co‑location
   - Co‑locate service functions and hooks per domain, export via barrels
   - AC:
     - Reduced cross‑domain imports; easier tree‑shaking

### Phase 5 — Security & Performance (1–2 weeks)

1. Rate limit consolidation
   - `withRateLimit` to use single implementation with route overrides (token bucket or sliding window)
   - AC:
     - All protected routes adopt it; tests verify limits and headers

2. Bundle hygiene & code splitting
   - Identify heavy components; use `next/dynamic` + suspense boundaries
   - AC:
     - Bundle size CI check green; no hydration mismatches

3. Server/client boundary review
   - Ensure server‑only code not bundled for client; use `server-only` package where applicable
   - AC:
     - Analyzer shows reduced client bundle for targeted routes

### Phase 6 — Testing & QA (ongoing)

- Expand unit/integration tests: env loading, guards, headers, i18n routing
- E2E: auth flows, file upload/share, notifications, session booking
- Flaky detection: retry with trace on failure; artifact retention for reports

---

## 5) Detailed Implementation Guide

Below are concrete actions, file paths, code scaffolds, and validation steps.

### 5.1 Consolidate Env Handling

- Create `src/env/index.ts`:

```ts
// src/env/index.ts
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    SENTRY_DSN: z.string().optional(),
    // ...add other server-only vars
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    // ...add other public vars
  },
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SENTRY_DSN: process.env.SENTRY_DSN,
  },
});

export const serverEnv = env; // alias for clarity where needed
export const clientEnv = env; // same object; TS types constrain server/client usage
```

- Replace imports of `src/env.mjs` and `src/env-server.mjs` with `@/env`
- Remove deprecated modules after migration
- Validate with `npm run validate:env` and `npm run type-check`

### 5.2 ESLint Import Rules & Boundaries

- In `eslint.config.mjs`, add rules:

```js
// eslint.config.mjs (excerpt)
import pluginImport from 'eslint-plugin-import';

export default [
  // ...existing config
  {
    plugins: { import: pluginImport },
    rules: {
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [
            { pattern: '@/**', group: 'internal', position: 'after' },
          ],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-cycle': 'warn',
      'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.test.*', 'tests/**', 'scripts/**'] }],
    },
    settings: { 'import/resolver': { typescript: true } },
  },
];
```

- Fix surfaced issues incrementally

### 5.3 Barrel Exports

- Add `index.ts` in key folders (example):

```ts
// src/lib/auth/index.ts
export * from './auth';
export * from './auth-context';
export * from './middleware';
export * from './permissions';
```

```ts
// src/lib/security/index.ts
export * from './headers';
export * from './rate-limit';
export * from './rate-limit-simple';
export * from './validation';
export * from './cors';
export * from './admin-middleware';
export * from './file-security-middleware';
```

```ts
// src/components/ui/index.ts
export * from './button';
export * from './input';
export * from './select';
// ...add remaining primitives progressively
```

- Search and update deep imports to module‑level imports

### 5.4 Middleware Slim‑Down

- Current responsibilities: i18n, static bypass, UA validation, auth gating, security headers
- Target: i18n + static bypass + headers only; move auth gating to pages/API
- Steps:
  1) Add integration tests that lock current behavior for static assets and i18n redirects
  2) Remove auth route gating; ensure equivalent checks in server components (loader functions) and API guards
  3) Keep UA validation if needed at edge; otherwise move to API guard

- Example server component guard usage:

```ts
// example: src/app/[locale]/dashboard/page.tsx
import { requireAuth } from '@/lib/auth';

export default async function Page() {
  const user = await requireAuth();
  return <Dashboard user={user} />;
}
```

### 5.5 API Guard Utilities

- Create `src/lib/api/guard.ts` with composable wrappers:

```ts
// src/lib/api/guard.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAuthService } from '@/lib/auth';
import { applySecurityHeaders } from '@/lib/security';
import { rateLimit } from '@/lib/security/rate-limit';

export type RouteHandler = (req: NextRequest) => Promise<Response> | Response;

export function withAuth(handler: RouteHandler): RouteHandler {
  return async (req) => {
    const auth = createAuthService(true);
    const user = await auth.getCurrentUser();
    if (!user) return applySecurityHeaders(req, new NextResponse('Unauthorized', { status: 401 }));
    return handler(req);
  };
}

export function withRole(roles: string[]) {
  return (handler: RouteHandler): RouteHandler => async (req) => {
    const auth = createAuthService(true);
    const user = await auth.getCurrentUser();
    if (!user || !roles.includes(user.role)) {
      return applySecurityHeaders(req, new NextResponse('Forbidden', { status: 403 }));
    }
    return handler(req);
  };
}

export function withRateLimit(keyFn?: (req: NextRequest) => string, opts?: Parameters<typeof rateLimit>[1]) {
  return (handler: RouteHandler): RouteHandler => async (req) => {
    const key = keyFn ? keyFn(req) : `ip:${req.headers.get('x-forwarded-for') ?? req.ip ?? 'unknown'}`;
    const { success, headers } = await rateLimit(key, opts);
    if (!success) return new NextResponse('Too Many Requests', { status: 429, headers });
    const res = await handler(req);
    headers.forEach((v, k) => res.headers.set(k, v));
    return res;
  };
}

export function compose(handler: RouteHandler, ...wrappers: ((h: RouteHandler) => RouteHandler)[]): RouteHandler {
  return wrappers.reduceRight((acc, wrap) => wrap(acc), handler);
}
```

- Example usage in a route handler:

```ts
// src/app/api/notifications/route.ts (example skeleton)
import { NextResponse } from 'next/server';
import { compose, withAuth, withRole, withRateLimit } from '@/lib/api/guard';

async function baseHandler() {
  return NextResponse.json({ ok: true });
}

export const GET = compose(baseHandler, withAuth, withRole(['admin']), withRateLimit());
```

### 5.6 React Query Key Factories

- Add `src/lib/queryKeys.ts`:

```ts
// src/lib/queryKeys.ts
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  files: {
    list: (folderId?: string) => ['files', 'list', { folderId }] as const,
    detail: (id: string) => ['files', 'detail', id] as const,
  },
  notifications: {
    list: ['notifications', 'list'] as const,
  },
  sessions: {
    list: ['sessions', 'list'] as const,
    detail: (id: string) => ['sessions', 'detail', id] as const,
  },
  users: {
    detail: (id: string) => ['users', 'detail', id] as const,
  },
};
```

- Use in hooks and mutations; standardize invalidations

### 5.7 Rate Limit Consolidation

- Ensure `src/lib/security/rate-limit.ts` is the single implementation; create `withRateLimit` wrapper above
- Add tests covering success, limit exceeded, and headers propagation

### 5.8 Design Tokens & Tailwind

- In `tailwind.config.ts`:
  - Define theme tokens via CSS variables
  - Enable dark mode class strategy
- Add `src/styles/tokens.css` and import in `app/globals.css`:

```css
:root {
  --color-bg: 255 255 255;
  --color-fg: 15 23 42;
  --radius: 0.5rem;
  /* ... */
}

.dark {
  --color-bg: 17 24 39;
  --color-fg: 243 244 246;
}
```

- Update UI primitives to reference tokens

### 5.9 Storybook Setup

- Install and init:

```bash
npx storybook@latest init --builder @storybook/builder-vite
```

- Add stories for `Button`, `Input`, `Dialog`, and one feature component
- Configure static assets and Tailwind in `.storybook/preview.ts`

### 5.10 Testing Expansion

- Unit: guards, env loader, query key factories, security headers
- Integration: middleware behavior (static/i18n), API routes using guards
- E2E: auth, files, notifications, sessions; ensure screenshots/traces on failure
- CI: keep existing GH Actions; optionally add size checks (`analyze:size-check`) as required step before build

---

## 6) CI/CD Adjustments

- Keep `quality`, `test`, `e2e`, `build`, `security`, `lighthouse` jobs
- Optional: add a job to run `npm run analyze:size-check` after build
- Ensure environment variables in CI map to new env module (no code change needed; only import path changes)

---

## 7) Risks & Mitigations

- Middleware changes causing regressions → Write tests first; migrate gradually; monitor 4xx/5xx
- Env consolidation breaking builds → Ship as PR with exhaustive type checking and fallback envs in CI
- Guard adoption drift → Create examples and a checklist; enforce via code reviews
- Bundle regressions → Analyzer gate in CI; watch largest pages after dynamic imports

---

## 8) Rollout Plan

- Route‑by‑route guard migration (start with low‑risk APIs)
- Canary deploy to staging; run E2E; compare Lighthouse, Sentry error rates
- Roll forward in small PRs; use feature flags where feasible

---

## 9) Success Metrics

- Code quality: lint clean, no cycle warnings, stable import structure
- Security: uniform headers on HTML and JSON, passing rate‑limit tests
- Performance: reduced JS for target routes; Lighthouse P90 ≥ existing baseline
- Reliability: lower auth‑related errors in Sentry; fewer 401/403 mismatches
- DX: new dev setup ≤ 15 minutes; CONTRIBUTING followed without blockers

---

## 10) Phase Checklists

- Phase 1
  - [x] `src/env/index.ts` created and adopted
  - [x] ESLint import rules enabled (import/order, no-cycle, extraneous deps)
  - [x] Initial barrels in `lib/*` and `components/ui`
  - [x] CONTRIBUTING.md drafted

- Phase 2
  - [ ] Middleware tests added; middleware slimmed
  - [x] `lib/api/guard.ts` created; 2 routes migrated
  - [ ] Security headers snapshot tests passing

- Phase 3
  - [ ] Tokens defined; core UI uses variables
  - [ ] Storybook running with core components documented

- Phase 4
  - [ ] `queryKeys` adopted across domains
  - [ ] Zustand limited to UI state only

- Phase 5
  - [ ] `withRateLimit` used on protected routes
  - [ ] Dynamic imports for heavy components; bundle check green

- Phase 6
  - [ ] Unit/integration/E2E coverage improved on critical flows

---

## 11) Quick Commands

```bash
# Lint, type check, format
npm run lint && npm run type-check && npm run format:check

# Unit / Integration / E2E
npm run test:run && npm run test:integration && npm run test:e2e

# Analyze bundle
npm run analyze:size-check

# Supabase local
npm run supabase:start
npm run db:seed
```

---

## 12) Appendix — Suggested File Additions

- `src/env/index.ts` — unified env module
- `src/lib/api/guard.ts` — API guard combinators
- `src/lib/queryKeys.ts` — React Query key factories
- `src/components/ui/index.ts` — UI barrel (progressively add)
- `src/lib/{auth,security,api}/index.ts` — barrels for clean imports

These can be introduced gradually and adopted route‑by‑route to minimize risk.

---

## 13) Progress Log

- 2025-09-02: Tag `refactor-phase1-env-and-guards` (commit 41d1be9)
  - Consolidated env to `@/env`; removed legacy env modules
  - Added barrels for `lib/auth` and `lib/security`
  - Enhanced ESLint import rules
  - Added CONTRIBUTING.md
  - Migrated two share routes to guard pattern with `withRateLimit`

