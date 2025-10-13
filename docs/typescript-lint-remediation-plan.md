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
