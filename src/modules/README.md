# Modules Directory Overview

This directory houses the emerging domain-driven modules that will gradually replace the ad-hoc grouping currently spread across `src/app`, `src/components`, and `src/lib`. Each subfolder represents a business domain or cross-cutting platform concern that will provide colocated UI, data access, and helper utilities.

## Module Responsibilities

- `auth/`
  - Authentication flows, MFA, session management, and role-aware routing.
  - Supabase auth client helpers, server session utilities, and auth-specific UI components.
- `dashboard/`
  - Coach and client dashboard layouts, widgets, TanStack Query hooks, and Supabase data loaders.
  - Shared navigation, shell composition, and widget configuration for dashboard pages.
- `sessions/`
  - Session scheduling, participation management, analytics, and supporting UI.
  - Supabase RPC accessors and scheduling utilities.
- `platform/`
  - Cross-cutting infrastructure helpers (Supabase client factories, logging, error handling, analytics).
  - Environment configuration helpers and service abstractions shared across domains.
- `i18n/`
  - Locale negotiation utilities, translation loaders, and shared localization-aware UI (e.g., switchers).

Existing `src/modules/tasks` artifacts remain in place; the plan is to fold them into the new structure once downstream dependencies are updated.

## Migration Checklist

Use this checklist when migrating existing code into the module structure. Track progress in `docs/architecture/migration-plan.md`.

1. **Inventory current usage**
   - Identify components, hooks, and utilities in `src/app`, `src/components`, and `src/lib` that belong to the target domain.
   - Note any cross-module dependencies that require refactoring (e.g., shared hooks relying on auth state).
2. **Define clear module boundaries**
   - Co-locate server actions, API route helpers, and UI for the domain under a single module.
   - Extract common types/interfaces into the module or `src/types` if truly global.
3. **Create migration branches**
   - Move files incrementally, updating import paths and ensuring Storybook/tests continue to pass.
   - Introduce barrel files (`index.ts`) only after the module contents stabilize to avoid premature coupling.
4. **Update tests and documentation**
   - Relocate associated tests under the module or adjust import paths in existing suites.
   - Document the new structure in module-specific README files or the shared docs folder.
5. **Deprecate legacy locations**
   - Remove unused folders from `src/components` and `src/lib` once consumers are migrated.
   - Leave migration breadcrumbs (e.g., `TODO` comments) until all references are updated.

By following this checklist, we can migrate toward a cohesive, maintainable module system without disrupting ongoing development.
