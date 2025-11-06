# Supabase Database Refactoring Plan (Revised)

**Generated**: 2025-10-21  
**Project**: Loom Coaching Platform  
**Database**: Supabase PostgreSQL  
**Total Migrations in Repo**: 64  
**Schema Coverage Reviewed**: `/supabase/migrations/*.sql` & application usage in `src/`

---

## Executive Summary

The Loom schema has matured through 64 committed migrations that already provision comprehensive indexing, row level security, and domain-specific functions for the coaching experience.【ebcd53†L1-L2】【F:supabase/migrations/20250817000001_database_completeness_enhancement.sql†L18-L33】【F:supabase/migrations/20250807000003_file_management_rls_policies.sql†L4-L145】 The previous refactoring outline assumed many of these structures were missing and recommended destructive changes (for example, dropping `push_subscriptions` and `users.mfa_enabled`). Those actions would break active features—`push_subscriptions` powers the notification service today, and `users.mfa_enabled` is relied upon by multiple API routes and dashboards.【F:src/lib/services/push-notification-service.ts†L66-L120】【F:src/lib/database/mfa-admin.ts†L117-L193】

This revision retains proven components and concentrates on high-leverage hardening: standardising security-definer functions, repairing newly added resource-library policies, and sequencing MFA consolidation without destabilising production. The roadmap below is organised into phases so each change set can be reviewed, rolled out, and observed independently.

---

## Verified Baseline

### Schema & Access Control Inventory

- **Indexes already exist for the high-traffic surfaces** (`sessions`, `messages`, `notifications`, `file_uploads`, `session_files`, etc.). These were introduced in migrations such as `20250817000001_database_completeness_enhancement.sql`, which added the composite and partial indexes earlier flagged as "missing."【F:supabase/migrations/20250817000001_database_completeness_enhancement.sql†L18-L33】
- **File management tables are fully protected by RLS policies**, covering creator ownership, coach/client sharing flows, and admin overrides.【F:supabase/migrations/20250807000003_file_management_rls_policies.sql†L4-L145】
- **Resource library tables were added with supporting indexes and constraints** via `20260108000001_resource_library_schema.sql` (covering `resource_collections`, `resource_collection_items`, and `resource_client_progress`).【F:supabase/migrations/20260108000001_resource_library_schema.sql†L18-L120】

### Application Usage Validation

- `push_subscriptions` is queried for CRUD operations in the push notification service; deleting or renaming the table would break subscription lifecycle flows.【F:src/lib/services/push-notification-service.ts†L66-L120】
- The `users.mfa_enabled` flag is consumed by the MFA admin service and reporting surfaces, so it cannot be dropped until the application layer is reworked.【F:src/lib/database/mfa-admin.ts†L117-L193】

### Observability & Enforcement Assets

- Background maintenance functions exist for file analytics and push subscriptions, but many are declared `SECURITY DEFINER` without an explicit `SET search_path`, leaving them susceptible to search path manipulation if an attacker gains function definition control.【F:supabase/migrations/20250807000006_file_download_tracking.sql†L250-L328】
- New RLS policies for the resource library reference non-existent column aliases (`resource_id`) and therefore evaluate to errors or unintended denials.【F:supabase/migrations/20260109000001_resource_library_rls.sql†L82-L186】【F:supabase/migrations/20260108000001_resource_library_schema.sql†L66-L120】

---

## Priority Findings & Recommended Actions

### 1. Standardise SECURITY DEFINER Functions

**Problem.** At least 120 functions remain declared `SECURITY DEFINER` without `SET search_path`, including the file download analytics suite (`log_file_download`, `get_file_download_stats`, etc.).【F:supabase/migrations/20250807000006_file_download_tracking.sql†L250-L328】 Supabase runs migrations with a restrictive search path today, but runtime invocations still inherit the caller's search path; this opens privilege-escalation opportunities.

**Actions.**

1. Inventory all `SECURITY DEFINER` functions and procedures; flag those lacking `SET search_path` or explicit schema-qualification.
2. Produce a patch migration that wraps each affected definition with `SET search_path = ''` (or `= public`) and fully qualifies table references. Follow the precedent set by `20250914000002_fix_function_search_path_security.sql` for style consistency.【F:supabase/migrations/20250914000002_fix_function_search_path_security.sql†L13-L22】
3. Add unit tests in `supabase/tests` (or automated SQL checks) that fail when new security-definer functions are created without the search path clause.

### 2. Repair Resource Library RLS Policies

**Problem.** The RLS policies introduced in `20260109000001_resource_library_rls.sql` reference `resource_collection_items.resource_id` and `resource_client_progress.resource_id`, but the underlying tables only expose `file_id`. This causes policy evaluation errors and blocks legitimate inserts/updates.【F:supabase/migrations/20260108000001_resource_library_schema.sql†L66-L120】【F:supabase/migrations/20260109000001_resource_library_rls.sql†L82-L186】

**Actions.**

1. Draft a corrective migration that renames the erroneous references to `file_id` and expands the coach visibility checks accordingly.
2. Backfill automated tests in `supabase/tests` that create resource collections/items and assert RLS success paths for both coach and client roles.
3. Roll out a data validation script to identify any partially inserted records that may have failed due to the broken policy, notifying affected coaches if remediation is required.

### 3. MFA Domain Consolidation (Non-Destructive Phase)

**Problem.** Multiple migrations added overlapping MFA tables (`user_mfa_settings`, `user_mfa_methods`, `user_mfa`). The original plan proposed dropping `users.mfa_enabled`, but the flag is still referenced throughout the app (admin dashboards, analytics APIs, service logic).【F:supabase/migrations/20250730000001_add_mfa_support.sql†L3-L67】【F:src/lib/database/mfa-admin.ts†L117-L193】

**Actions.**

1. Capture current usage by instrumenting the Supabase queries that read/write MFA state (e.g., via logging or temporary views) to understand which tables are authoritative today.
2. Design a "single source of truth" (`user_mfa_status_mv` or function) that can coexist with the legacy column and expose a consistent API to the application. Ship application changes that read from the new source while continuing to maintain `users.mfa_enabled` via triggers.
3. Only after the application no longer depends on the column should we schedule a later migration to drop `users.mfa_enabled` and deprecate redundant tables.

### 4. Function & Policy Regression Tests

**Problem.** Several migrations mix schema changes with large PL/pgSQL bodies. The absence of automated regression tests allowed the resource-library policy typo and prior search-path gaps to slip through.

**Actions.**

1. Extend the existing migration verification harness (`supabase/tests` and `verify-security-migrations.sql`) with specific cases for each new domain (practice journal, resource library, file analytics) covering RLS and security-definer behaviour.
2. Integrate the harness into CI (e.g., `pnpm supabase:test`) so that every migration PR executes the suite before merge.
3. Document the required test cases in `AUTH_SECURITY_CONFIG.md` (or similar) to guide contributors.

---

## Execution Roadmap

| Phase   | Scope                    | Key Deliverables                                                                              | Owners         |
| ------- | ------------------------ | --------------------------------------------------------------------------------------------- | -------------- |
| Phase 0 | Inventory & Test Harness | Search-path inventory report, updated SQL regression suite                                    | Database + QA  |
| Phase 1 | Security Hardening       | Migration adding `SET search_path` to all security-definer functions; CI enforcement          | Database       |
| Phase 2 | Resource Library Fixes   | Corrected RLS migration, automated tests, data backfill script                                | Database + App |
| Phase 3 | MFA Alignment            | Telemetry on MFA usage, app updates consuming unified view/function, follow-up migration plan | App + Database |

Each phase should produce a deployable migration (or code change set) that can be rolled back independently. Avoid bundling `CREATE INDEX CONCURRENTLY` calls; continue using the existing `CREATE INDEX IF NOT EXISTS` approach that aligns with Supabase's transactional runner.【F:supabase/migrations/20250817000001_database_completeness_enhancement.sql†L18-L33】

---

## Testing & Rollout Guidelines

- **Pre-deployment:** Run `supabase db diff` against staging to ensure migrations are idempotent, and execute the expanded regression suite locally.
- **Post-deployment:** Monitor Supabase function logs for search-path warnings and resource-library access errors; the repaired policies should reduce `permission denied` incidents.
- **Rollback plan:** Maintain SQL scripts that revert individual migrations (e.g., restore previous policy definitions) so each phase can be undone without affecting unrelated domains.

---

## Appendix

- Reference: Push notification feature relying on `push_subscriptions` CRUD operations.【F:src/lib/services/push-notification-service.ts†L66-L120】
- Reference: Active MFA dashboards querying `users.mfa_enabled`.【F:src/lib/database/mfa-admin.ts†L117-L193】
