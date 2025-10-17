# Module Migration Plan

_Last updated: 2025-10-16_

## 1. Current State Audit

### 1.1 App Router (`src/app`)

- Locale-specific routing lives under `src/app/[locale]` with nested `(auth)`, `(dashboard)`, and content folders.
- Legacy top-level routes such as `coach`, `client`, and `sessions` still rely on duplicated layouts and API calls.
- Shared error boundaries (`error.tsx`, `global-error.tsx`) and loading states remain colocated at the root instead of within domain modules.

### 1.2 Components (`src/components`)

- Auth UI (e.g., `auth/*`, `onboarding/*`) mixes Next.js server/client components without clear boundaries.
- Dashboard UI is split across `dashboard/`, `layout/`, and `navigation/`, with duplicated sidebar/topbar patterns.
- Platform-level utilities such as `providers/*`, `pwa/*`, and `environment-check.tsx` intermingle with pure presentation components.

### 1.3 Libraries (`src/lib`)

- Supabase access lives in `supabase/*` and `services/*`, with auth/session helpers under `auth/`.
- Domain logic (coach dashboards, payments, notifications) is scattered inside `coach-dashboard/`, `payments/`, `notifications/`, etc., often mixing data fetching with view logic.
- Shared utilities (`utils`, `queryKeys.ts`, `store/`) have broad dependencies, making it difficult to reason about module ownership.

### 1.4 Existing Modules (`src/modules`)

- Only `tasks/` follows the desired module pattern (API, components, hooks, services, types).
- `tasks/README.md` already documents conventions that can guide new modules.

## 2. Target Module Boundaries

| Module      | Scope                                                                | Initial Migration Candidates                                                                                                                 |
| ----------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`      | Authentication flows, MFA, session management, role-aware redirects. | `src/components/auth`, `src/lib/auth`, `src/lib/services/auth`, `src/app/[locale]/(auth)` shared logic.                                      |
| `dashboard` | Coach/client dashboards, layout shell, widgets, data loaders.        | `src/components/dashboard`, `src/components/layout`, `src/components/navigation`, `src/lib/coach-dashboard`, `src/app/[locale]/(dashboard)`. |
| `sessions`  | Scheduling, attendance, session history, analytics.                  | `src/app/sessions`, `src/components/sessions`, `src/lib/services/session*`, `src/lib/queries/sessions`.                                      |
| `platform`  | Supabase client factories, environment config, monitoring, logging.  | `src/lib/supabase`, `src/lib/config`, `src/lib/monitoring`, `src/components/providers`, `src/env/*`.                                         |
| `i18n`      | Locale negotiation, translation helpers, localized UI primitives.    | `src/i18n`, `src/components/shared/LocaleSwitcher`, `src/app/[locale]/layout.tsx` helpers.                                                   |

## 3. Migration Sequencing

1. **Establish Shared Patterns (Phase 0)**
   - Finalize module scaffolding (this change) and align on conventions from `src/modules/tasks`.
   - Draft coding standards for server/client boundaries inside each module.
2. **Platform Foundations (Phase 1)**
   - Move Supabase client creation and environment guards into `platform/`.
   - Create shared auth session helpers in `auth/` to support middleware hardening.
3. **Dashboard Refactor (Phase 2)**
   - Introduce `dashboard/` layout shell and migrate navigation components.
   - Relocate dashboard data loaders and React Query hooks into the module.
4. **Sessions & Tasks Domain Alignment (Phase 3)**
   - Mirror `tasks/` patterns for `sessions/`, consolidating API routes and services.
   - Update tests to reflect new import paths and domain-specific fixtures.
5. **Localization Hardening (Phase 4)**
   - Extract locale switcher UI and translation loaders into `i18n/`.
   - Remove duplicated translation utilities from `src/lib` and `src/components/shared`.

## 4. Risks & Mitigations

- **Import churn**: Moving files across directories will break relative imports.
  - _Mitigation_: Perform module migrations incrementally and rely on TypeScript path aliases to smooth transitions.
- **Coupled hooks/services**: Many utilities currently blend auth and dashboard responsibilities.
  - _Mitigation_: Introduce explicit interfaces between modules (e.g., `AuthContext` provider exposed via `auth/`).
- **Testing gaps**: Relocated files may lose coverage if tests are not moved.
  - _Mitigation_: Update Vitest/Playwright suites in the same PRs that relocate code.

## 5. Action Items

- [ ] Confirm domain ownership and reviewers for each module.
- [ ] Prepare TypeScript path alias updates once modules contain source files.
- [ ] Schedule follow-up work to migrate existing `tasks/` module into the new structure for consistency.
