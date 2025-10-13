# TypeScript and Lint Error Audit

## Command Summary

- `npx tsc --noEmit --pretty false` reports 672 errors touching application pages, API routes, shared libraries, and the test suite.
- `npx eslint src --ext .ts,.tsx` completes without reported issues, indicating TypeScript problems are the current blocker for lint workflows.

## Major TypeScript Error Clusters

### Dashboard analytics and charts

- `src/app/(dashboard)/coach/resources/analytics/page.tsx` references `LibraryAnalytics.byCategory` and assumes parsed stats objects, but the analytics type currently exposes neither property nor safe parsing, triggering property access on `unknown` values.
- `src/components/charts/enhanced-chart-components.tsx` and related lazy-loading helpers call into Recharts members such as `ZoomableLineChart`, pass `SyntheticEvent` where numbers are expected, and forward nullable refs to non-nullable APIs, breaking the chart pipeline.

### Messaging and route guards

- Every API handler wrapped with the authenticated route helper passes `{ params }` objects typed as `Promise<...>`; the helper signature currently expects an `unknown[]` variadic rest parameter, leading to incompatibility errors for message reaction, read receipts, typing indicators, and MFA routes.

### File management suite

- File manager components and hooks import `FolderMetadata`, `use-toast`, and `FileShareDialogProps` that no longer exist, while treating `FileMetadata` as if it provided `isPublic`, `mimeType`, `sizeBytes`, and version history fields that are absent in the generated Supabase types.

### Notifications and layout

- The notification center redefines `Notification` priority enums and passes analytics objects to helpers that expect `Record<string, unknown>`, while the layout footer attempts to coerce optional icons through a type predicate that narrows to an incompatible subtype.

### Performance instrumentation

- Sentry instrumentation treats transactions as `unknown`, casts arbitrary objects to `SpanAttributes`, and registers `beforeSend` handlers incompatible with the SDK’s `VercelEdgeOptions`. Lazy-loading utilities also attempt to return composite modules instead of default React components, causing dozens of generic mismatches.

### Database access layer

- Database service modules instantiate Postgrest builders with wrong generics, rely on helper types (`GetSessionsOptions`, `UpdateSessionData`) that were removed, and treat Supabase rows as if snake_case fields were camelCased (`userId`, `createdAt`).

### Session models and hooks

- Session-facing components expect enriched fields such as `coachName`, `coachAvatar`, and `keyInsights` that the canonical `Session` type does not provide, while hooks like `use-auth-monitor` compare Supabase auth events against custom string literals outside the union definition.

### Test suite

- Integration and API tests create mock services with incomplete shapes, rely on Vitest globals (`vi`, `within`) without importing them, and mutate `process.env.NODE_ENV`. Many utilities duplicate React Query symbols or leave callback parameters implicitly `any`, contributing the largest share of errors.

## Remediation Plan

1. **Stabilize shared domain types (Priority: High)**
   - Reconcile `LibraryAnalytics`, `Session`, `FileMetadata`, and notification-related types with actual Supabase and Prisma schemas.
   - Provide derived view models (e.g., `SessionWithCoachInfo`) when UI needs enriched fields, and update components to consume those types.

2. **Fix API route helper signatures (Priority: High)**
   - Update the authenticated route wrapper to accept the Next.js route context (e.g., `{ params }`) explicitly, or adjust call sites to match the helper’s variadic signature.
   - Add unit coverage around the wrapper to prevent regressions in other API routes.

3. **Refactor file management module (Priority: High)**
   - Restore or reimplement missing modules (`use-toast`, `file-version-history`) or replace their usage with existing UI primitives.
   - Align `FileMetadata` usage with the generated Supabase types, introducing adapter functions if additional fields are required.

4. **Resolve chart and lazy-loading mismatches (Priority: Medium)**
   - Audit Recharts usage to ensure only supported exports are consumed; replace placeholders like `ZoomableLineChart` with actual components.
   - Standardize lazy component factories to return `{ default: Component }` wrappers rather than entire module namespaces, and tighten the prop typing of deferred components.

5. **Harden monitoring and performance tooling (Priority: Medium)**
   - Update Sentry integration to use concrete SDK types (`Transaction`, `SpanAttributes`) and guard optional values before access.
   - Normalize performance optimization helpers to work with defined data contracts instead of `Record<string, unknown>` coercions.

6. **Clean up database utilities (Priority: Medium)**
   - Reintroduce or replace the missing helper types for session CRUD operations, and correct Supabase query builder generics to return filter builders with the expected methods.
   - Ensure snake_case fields are preserved or transformed consistently when mapping to application models.

7. **Repair the test harness (Priority: Medium)**
   - Provide shared mock factories that satisfy service interfaces, import Vitest helpers (`vi`, `within`) explicitly, and avoid mutating read-only environment properties by stubbing configuration modules.
   - Deduplicate React Query exports in `src/test/utils.tsx` and enforce strict typing on callback parameters.

8. **Verification**
   - After addressing the categories above, rerun `npx tsc --noEmit --pretty false` and `npx eslint src --ext .ts,.tsx` to confirm a clean type and lint pass.

## Step-by-Step Execution Details

### 1. Stabilize Shared Domain Types

- **Scope**: `src/types`, `src/lib/database`, dashboard pages consuming session/resource analytics, notification center components.
- **Subtasks**:
  - Diff Supabase generated types (`supabase/types`) against `src/types/supabase.ts` to catalog missing columns and enums.
  - Create explicit view models for enriched UI needs (sessions, resources) in `src/types/index.ts`, and add adapters in `src/lib/services` to map database rows to those view models.
  - Update consuming components (analytics dashboards, session widgets) to accept the new view models without optional chaining on non-existent properties.
- **Acceptance Criteria**:
  - TypeScript no longer reports property-access errors for analytics dashboards, session widgets, or notification drawers.
  - UI adapters convert snake_case fields to camelCase consistently and are covered by unit tests in `src/test/services/*`.

### 2. Fix API Route Helper Signatures

- **Scope**: `src/lib/api/utils.ts`, API route files under `src/app/api/**`.
- **Subtasks**:
  - Refine the authenticated route helper signature to accept `(handler: (context: RouteContext) => Promise<Response>)`.
  - Provide overloads for routes that need `NextRequest`, params, or search params.
  - Update all call sites to pass a single context object and remove ad-hoc tuple spreads.
  - Add regression tests in `src/test/api` ensuring handlers receive correctly typed params.
- **Acceptance Criteria**:
  - `npx tsc --noEmit` reports zero signature mismatch errors for API handlers.
  - Tests demonstrate that params are available and type safe.

### 3. Refactor File Management Module

- **Scope**: `src/lib/services/file-management-service.ts`, `src/components/files/**`, hooks under `src/hooks/files/**`.
- **Subtasks**:
  - Reconcile `FileMetadata` expectations with Supabase types, adding derived fields (e.g., `isPublic`, `sizeBytes`) via mapper utilities.
  - Replace deprecated imports (`use-toast`, `FileShareDialogProps`) with maintained equivalents or locally defined primitives.
  - Ensure version history helpers expose typed entries rather than `any`.
- **Acceptance Criteria**:
  - File-related components compile without implicit `any` or missing property errors.
  - Unit tests cover file sharing and version history flows with strict typing enabled.

### 4. Resolve Chart and Lazy-Loading Mismatches

- **Scope**: `src/components/charts`, `src/lib/performance/lazy-loading.ts`, feature dashboards that defer chart rendering.
- **Subtasks**:
  - Replace placeholder chart exports with actual Recharts components and adjust props to their documented signatures.
  - Standardize lazy loader to return `{ default: Component }` objects and supply fallbacks using `React.LazyExoticComponent`.
  - Add Storybook or component tests to validate typing for lazy-loaded charts.
- **Acceptance Criteria**:
  - No `unknown` or `never` propagation in chart components.
  - Lazy-loaded modules accept only the intended props and expose default exports.

### 5. Harden Monitoring and Performance Tooling

- **Scope**: `sentry.*.config.ts`, `src/lib/performance/**`.
- **Subtasks**:
  - Type the Sentry transaction helpers with SDK generics, guarding optional spans and breadcrumb data.
  - Refine performance helpers to consume explicit interfaces instead of `Record<string, unknown>`.
  - Add type tests or usage examples to confirm compatibility with Vercel edge runtime.
- **Acceptance Criteria**:
  - No TypeScript errors in instrumentation files.
  - Monitoring helpers compile when imported into both Node and edge contexts.

### 6. Clean Up Database Utilities

- **Scope**: `src/lib/database/**`, Supabase query wrappers.
- **Subtasks**:
  - Reintroduce session CRUD helper types with accurate generics for filters and updates.
  - Normalize snake_case vs camelCase via dedicated mapper utilities.
  - Validate query builder generics through integration tests using the local Supabase client.
- **Acceptance Criteria**:
  - Database modules no longer instantiate builders with `any` generics.
  - Mapper utilities are unit-tested and reused by API handlers.

### 7. Repair the Test Harness

- **Scope**: `src/test/**`, vitest configuration.
- **Subtasks**:
  - Add shared mocks for Supabase client, notification services, and analytics exporters with complete type coverage.
  - Ensure Vitest helpers (`vi`, `within`) are imported explicitly.
  - Remove environment mutations by injecting configuration via dependency inversion.
- **Acceptance Criteria**:
  - Test files run under `npx vitest typecheck` without implicit `any` or namespace errors.
  - Mock factories satisfy the interfaces used by production code.

### 8. Verification

- **Commands**: `npx tsc --noEmit --pretty false`, `npx eslint src --ext .ts,.tsx`, `npx vitest typecheck`.
- **Exit Criteria**: All commands complete without errors or warnings. Capture outputs and archive logs in `docs/typecheck-reports/` for future regressions.

## Tracking and Ownership

| Step | Owner                  | Status                  | Target Completion |
| ---- | ---------------------- | ----------------------- | ----------------- |
| 1    | Type Systems pod       | In progress             | T+2 days          |
| 2    | API Guild              | Blocked on Step 1 types | T+3 days          |
| 3    | File Experience squad  | Not started             | T+4 days          |
| 4    | Data Viz team          | Not started             | T+5 days          |
| 5    | Platform Observability | Not started             | T+5 days          |
| 6    | Data Platform          | Not started             | T+6 days          |
| 7    | QA & Tooling           | Not started             | T+6 days          |
| 8    | Release Engineering    | Pending previous steps  | T+7 days          |

## Risk Mitigation

- **Scope Creep**: Keep plan focused on TypeScript typing issues; defer product enhancements to separate tickets.
- **Regression Risk**: Require targeted tests for each fixed area and schedule pair reviews with domain owners.
- **Timeline Risk**: If Step 1 slips, pull engineers from lower-priority squads to unblock shared types.

## Communication Plan

- Share daily progress updates in `#proj-typescript-hardening`.
- Attach TypeScript error delta reports to the project board after each completed step.
- Hold a cross-team sync at the midpoint (T+4 days) to reassess priorities and blockers.

## Exit Report Template

Upon completion, populate `docs/typecheck-reports/final-summary.md` with:

- Summary of resolved error clusters with before/after counts.
- Links to relevant PRs and test artifacts.
- Follow-up work items deferred or discovered during remediation.
