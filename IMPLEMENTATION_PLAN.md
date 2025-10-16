# Implementation Plan

## Phase 0 – Architecture Alignment & Tooling

- [x] Step 1: Audit current module boundaries and prepare scaffolding ✅ (docs/architecture/migration-plan.md, src/modules/\* scaffolds)
  - **Task**: Catalogue existing `src/app`, `src/components`, and `src/lib` usage, create placeholder module directories (`src/modules/{auth,dashboard,sessions,platform,i18n}`), and document migration notes to guide later moves without changing imports yet.
  - **Files**:
    - `src/modules/README.md`: Outline module responsibilities and migration checklist.
    - `src/modules/auth/.gitkeep`: Scaffold directory.
    - `src/modules/dashboard/.gitkeep`
    - `src/modules/sessions/.gitkeep`
    - `src/modules/platform/.gitkeep`
    - `src/modules/i18n/.gitkeep`
    - `docs/architecture/migration-plan.md`: Capture audit findings and sequencing.
  - **Step Dependencies**: None
  - **User Instructions**: Confirm team alignment on module scope before continuing.

- [x] Step 2: Harden environment and configuration validation ✅ (`src/env/{client,server,runtime}.(ts|js)`, `next.config.js`, `docs/configuration.md`)
  - **Task**: Introduce runtime validation for client/server env vars using `zod`, split environment loaders into `src/env/client.ts` and `src/env/server.ts`, and update Next.js config to consume typed env helpers.
  - **Files**:
    - `src/env/runtime.js`: Shared CommonJS runtime consumed by Next.js and scripts.
    - `src/env/runtime.d.ts`: Type declarations for runtime exports.
    - `src/env/client.ts`: Re-export client-safe variables.
    - `src/env/server.ts`: Server-only accessors and backwards-compatible alias.
    - `src/env/index.ts`: Export helpers.
    - `next.config.js`: Reference validated env values.
    - `docs/configuration.md`: Document required variables.
  - **Step Dependencies**: Step 1
  - **User Instructions**: Update `.env.local` with any new variables before running the app.

- [x] Step 3: Establish shared Supabase client factories ✅ (`src/modules/platform/supabase/*`, `docs/platform/supabase.md`)
  - **Task**: Move Supabase client creation into `src/modules/platform/supabase` with separate server/browser factories, inject retry policies, and refactor existing usages in app router middleware and services.
  - **Files**:
    - `src/modules/platform/supabase/client.ts`: Browser client.
    - `src/modules/platform/supabase/server.ts`: Server client with Service Role usage guard.
    - `src/middleware.ts`: Consume new factory.
    - `src/lib/auth/*`: Update imports to new platform module.
    - `docs/platform/supabase.md`: Usage instructions.
  - **Step Dependencies**: Steps 1-2
  - **User Instructions**: Re-run lint/type-check to verify no stray imports remain.

## Phase 1 – Authentication & Access Control

- [ ] Step 4: Finalize MFA-aware auth flows
  - **Task**: Implement Supabase MFA enrollment/verification screens, ensure locale coverage, and wire React Query mutations to new `/api/auth/mfa` endpoints.
  - **Files**:
    - `src/app/[locale]/(auth)/signin/page.tsx`: Trigger MFA flow.
    - `src/app/[locale]/(auth)/mfa/setup/page.tsx`: Enrollment UI.
    - `src/app/[locale]/(auth)/mfa/verify/page.tsx`: Verification UI.
    - `src/app/api/auth/mfa/route.ts`: Handle enrollment/verify.
    - `src/modules/auth/api/mfa.ts`: Client hooks.
    - `src/modules/auth/components/MfaForm.tsx`
    - `src/modules/auth/hooks/useMfa.ts`
    - `src/modules/auth/types.ts`: Define payloads.
    - `src/i18n/locales/en/auth.json`: Add copy.
    - `src/i18n/locales/he/auth.json`
  - **Step Dependencies**: Steps 1-3
  - **User Instructions**: Configure MFA factors in Supabase dashboard before testing.

- [ ] Step 5: Tighten auth middleware and role-based redirects
  - **Task**: Expand `middleware.ts` to enforce locale negotiation, session hydration, and role-aware routing; add unit tests covering redirect matrix.
  - **Files**:
    - `src/middleware.ts`: Add chained middleware.
    - `src/modules/auth/server/session.ts`: Session fetch with role data.
    - `src/modules/auth/constants.ts`: Route definitions.
    - `src/modules/auth/utils/redirect.ts`: Helper.
    - `tests/auth/middleware.test.ts`: Vitest coverage.
    - `docs/auth/redirects.md`: Document behavior.
  - **Step Dependencies**: Step 4
  - **User Instructions**: Ensure Supabase RLS policies return role metadata.

## Phase 2 – Dashboard Foundations

- [ ] Step 6: Implement dashboard layout shell with navigation states
  - **Task**: Create shared dashboard layout housing sidebar, topbar, locale switcher, and skeleton placeholders; wire to design system tokens.
  - **Files**:
    - `src/app/[locale]/(dashboard)/layout.tsx`: Layout composition.
    - `src/components/layout/DashboardShell.tsx`: Shared structure.
    - `src/components/layout/Sidebar.tsx`: Navigation links.
    - `src/components/layout/Topbar.tsx`: Session/user info.
    - `src/styles/dashboard.css` or Tailwind layer adjustments.
    - `src/modules/i18n/components/LocaleSwitcher.tsx`
    - `src/components/ui/Skeleton.tsx`: Loading states.
    - `src/types/navigation.ts`: Nav config.
  - **Step Dependencies**: Step 5
  - **User Instructions**: Review design with product before wiring data.

- [ ] Step 7: Deliver initial coach dashboard widgets
  - **Task**: Build React Query loaders for sessions, tasks, and clients; render overview cards and lists with server-prefetch using `dehydrate` in server components.
  - **Files**:
    - `src/app/[locale]/(dashboard)/coach/page.tsx`: Server loader + hydration.
    - `src/modules/dashboard/api/useCoachOverview.ts`: React Query hook.
    - `src/modules/dashboard/components/CoachOverview.tsx`
    - `src/modules/dashboard/components/widgets/SessionsList.tsx`
    - `src/modules/dashboard/components/widgets/TasksSummary.tsx`
    - `src/modules/dashboard/components/widgets/ClientProgress.tsx`
    - `src/modules/dashboard/server/loaders.ts`: Supabase queries.
    - `src/modules/dashboard/types.ts`
    - `tests/dashboard/coach-overview.test.tsx`: Component test.
  - **Step Dependencies**: Step 6
  - **User Instructions**: Seed Supabase with fixture data for testing.

- [ ] Step 8: Build client dashboard parity
  - **Task**: Mirror Step 7 for client view with personalized tasks/sessions, add CTA for booking sessions.
  - **Files**:
    - `src/app/[locale]/(dashboard)/client/page.tsx`
    - `src/modules/dashboard/api/useClientOverview.ts`
    - `src/modules/dashboard/components/ClientOverview.tsx`
    - `src/modules/dashboard/components/widgets/UpcomingSessions.tsx`
    - `src/modules/dashboard/components/widgets/MyTasks.tsx`
    - `src/modules/dashboard/components/widgets/GoalsProgress.tsx`
    - `src/modules/dashboard/server/client-loaders.ts`
    - `tests/dashboard/client-overview.test.tsx`
    - `src/i18n/locales/en/dashboard.json`
    - `src/i18n/locales/he/dashboard.json`
  - **Step Dependencies**: Step 7
  - **User Instructions**: Verify RLS policies allow clients to only see their data.

## Phase 3 – Sessions & Tasks Domain

- [ ] Step 9: Implement tasks CRUD API and hooks
  - **Task**: Add Supabase SQL migrations for `tasks`, build `/api/tasks` REST endpoints with validation, and expose React Query hooks and forms.
  - **Files**:
    - `supabase/migrations/2025XXXX_tasks.sql`: Create table/indexes.
    - `src/app/api/tasks/route.ts`: List/create.
    - `src/app/api/tasks/[id]/route.ts`: Read/update/delete.
    - `src/modules/sessions/validators/task.ts`: Zod schemas.
    - `src/modules/sessions/api/tasks.ts`: Fetch/mutate hooks.
    - `src/modules/sessions/components/TaskForm.tsx`
    - `src/modules/sessions/components/TaskList.tsx`
    - `src/modules/sessions/types.ts`
    - `tests/api/tasks.test.ts`: Route tests.
    - `tests/components/task-form.test.tsx`
  - **Step Dependencies**: Step 8
  - **User Instructions**: Run `supabase db push` or migration command after review.

- [ ] Step 10: Build session scheduling workflows
  - **Task**: Design session entity migrations, create booking API, integrate calendar UI, and enable coaches to approve/reschedule sessions.
  - **Files**:
    - `supabase/migrations/2025XXXX_sessions.sql`
    - `src/app/api/sessions/route.ts`
    - `src/app/api/sessions/[id]/route.ts`
    - `src/modules/sessions/api/sessions.ts`
    - `src/modules/sessions/components/ScheduleSessionModal.tsx`
    - `src/modules/sessions/components/SessionTimeline.tsx`
    - `src/modules/sessions/hooks/useSessionActions.ts`
    - `src/modules/sessions/server/queries.ts`
    - `tests/api/sessions.test.ts`
    - `tests/components/schedule-session-modal.test.tsx`
  - **Step Dependencies**: Step 9
  - **User Instructions**: Coordinate with calendar provider (if integrating external APIs) for API credentials.

## Phase 4 – Marketing Site & Localization

- [ ] Step 11: Replace placeholder landing content with CMS-backed data
  - **Task**: Integrate a CMS or structured JSON for hero copy, testimonials, and pricing; update English/Hebrew content and ensure ISR/static generation for marketing pages.
  - **Files**:
    - `src/app/[locale]/page.tsx`: Fetch CMS content.
    - `src/modules/platform/cms/client.ts`: CMS SDK wrapper or JSON loader.
    - `src/modules/platform/cms/types.ts`
    - `src/components/features/landing/Hero.tsx`
    - `src/components/features/landing/Testimonials.tsx`
    - `src/components/features/landing/Pricing.tsx`
    - `src/i18n/locales/en/landing.json`
    - `src/i18n/locales/he/landing.json`
    - `docs/marketing/content-workflow.md`: Authoring guide.
  - **Step Dependencies**: Step 6
  - **User Instructions**: Populate CMS entries or JSON files before build.

- [ ] Step 12: Implement locale-aware routing and RTL polishing
  - **Task**: Enhance `src/modules/i18n` with locale negotiation, configure RTL styles for Hebrew, and ensure shared components respect direction.
  - **Files**:
    - `src/modules/i18n/config.ts`: Locale metadata.
    - `src/modules/i18n/routing.ts`: Negotiation helpers.
    - `src/app/layout.tsx`: Apply direction attribute.
    - `src/app/[locale]/layout.tsx`: Provide locale context.
    - `src/styles/globals.css`: Add `[dir="rtl"]` overrides.
    - `src/components/ui/Button.tsx`: Ensure RTL-safe icons.
    - `src/components/layout/Sidebar.tsx`: RTL adjustments.
    - `tests/i18n/routing.test.ts`
    - `tests/i18n/rtl-visual.test.tsx`: Snapshot for critical components.
  - **Step Dependencies**: Step 11
  - **User Instructions**: Review translations with native speaker before release.

## Phase 5 – Platform Reliability & Observability

- [ ] Step 13: Add performance optimizations and caching
  - **Task**: Configure static rendering for marketing/legal pages, implement React Query caching policies, and add Next.js route segment revalidation timings.
  - **Files**:
    - `next.config.js`: Static generation settings.
    - `src/app/[locale]/(marketing)/privacy/page.tsx`: Mark as static.
    - `src/app/[locale]/(marketing)/terms/page.tsx`
    - `src/modules/dashboard/api/queryOptions.ts`: Shared cache settings.
    - `docs/performance/playbook.md`: Guidance.
  - **Step Dependencies**: Steps 7-12 (performance touches multiple areas)
  - **User Instructions**: Benchmark before/after using Lighthouse script.

- [ ] Step 14: Integrate observability and security guards
  - **Task**: Ensure Sentry DSN, analytics, and Supabase function guards are configured; add logging utilities and alert documentation.
  - **Files**:
    - `sentry.client.config.js`: Verify DSN usage.
    - `sentry.server.config.js`: Server instrumentation.
    - `src/modules/platform/logging/logger.ts`
    - `src/modules/platform/security/httpGuard.ts`: Block unsafe Supabase HTTP calls.
    - `src/modules/platform/security/index.ts`: Export guards.
    - `src/app/api/*`: Apply guards where relevant (≤5 endpoints per step to stay under limit).
    - `docs/operations/observability.md`: Alert runbook.
  - **Step Dependencies**: Step 13
  - **User Instructions**: Configure Sentry project keys and alert policies post-deploy.

## Phase 6 – Quality Engineering & Release Readiness

- [ ] Step 15: Expand automated testing suites
  - **Task**: Wire Vitest “production readiness” suite, extend Playwright smoke tests for auth and dashboards, and add accessibility/performance scripts to CI.
  - **Files**:
    - `package.json`: Add new test scripts.
    - `vitest.config.ts`: Configure new test suite.
    - `tests/playwright/auth.spec.ts`: E2E coverage.
    - `tests/playwright/dashboard.spec.ts`
    - `tests/accessibility.test.ts`: Axe checks.
    - `.github/workflows/ci.yml`: Run new checks.
    - `docs/testing/strategy.md`: Update methodology.
  - **Step Dependencies**: Steps 4-14
  - **User Instructions**: Install Playwright browsers locally via `npx playwright install`.

- [ ] Step 16: Final staging checklist and launch preparation
  - **Task**: Compile go-live checklist covering environment promotion, seed scripts, support tooling, and beta feedback channels; run full regression and document known issues.
  - **Files**:
    - `docs/launch/checklist.md`: End-to-end launch tasks.
    - `docs/launch/support-playbook.md`: Support process.
    - `scripts/seed/staging.ts`: Seed automation.
    - `docs/launch/known-issues.md`: Track blockers.
    - `README.md`: Update with launch instructions.
  - **Step Dependencies**: Steps 1-15
  - **User Instructions**: Schedule stakeholder sign-off meeting before production cutover.

---

## Summary

This plan establishes modular scaffolding first, then iteratively delivers authentication hardening, dashboard value, and domain capabilities for tasks and sessions. Marketing localization and platform reliability follow, capped with robust testing and launch operations. Each step keeps touchpoints under ~20 files, includes documentation, and highlights manual coordination tasks so the team can execute confidently toward a production-ready release.
