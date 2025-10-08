# Action Items & Homework Implementation Plan Notes

## Step 1 – Platform Audit (Completed)

### Next.js & Supabase Configuration Overview

- The application runs on **Next.js 15** with the App Router enabled and strict mode active (`next.config.js`). Performance optimizations include optimized package imports and Turbopack rules for SVG assets.
- Supabase access is centralized in `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`. Both modules validate `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` at runtime and expose singleton clients to avoid redundant GoTrue sessions.
- Server-side administration uses `createAdminClient`, which depends on `SUPABASE_SERVICE_ROLE_KEY`. This key is optional in `src/env/index.ts`, so any feature requiring privileged Supabase calls (e.g., background migrations) must verify the variable before use.
- Environment handling is consolidated through `@t3-oss/env-nextjs` (`src/env/index.ts`). The helper already maps new Supabase environment names (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`) to the expected Next.js variables, reducing friction for local vs. hosted setups.

### Authentication Patterns Confirmed

- Authentication flows rely on `AuthService` (`src/lib/auth/auth.ts`), which constructs either a server or client Supabase instance and caches user profiles fetched through `createUserService`.
- The service supplements Supabase session data with additional profile metadata (role, onboarding status, MFA flags) and manages session refresh with retry logic and forced sign-out when tokens become invalid.
- Middleware and client hooks (`src/lib/auth/middleware.ts`, `src/lib/auth/use-auth.ts`) wrap these services to enforce role-based routing. Route handlers and server components should continue to use `AuthService.create(true)` to respect cache invalidation.

### Reusable Coaching Components & Utilities

- Coach-specific UI lives primarily in `src/components/dashboard/coach`, with supporting widgets in `src/components/dashboard/widgets` and shared layout primitives under `src/components/dashboard/shared`.
- Scheduling and client relationship features already exist in `src/components/sessions` and `src/components/coach`, which will help shape task assignment experiences.
- Supabase-aware hooks (`src/lib/hooks`), TanStack Query helpers (`src/lib/queries`), and permissions utilities (`src/lib/auth/permissions.ts`) provide a foundation for enforcing access in forthcoming task APIs.

### Identified Gaps & Considerations for Upcoming Steps

- **Database schema coverage**: Prisma models for tasks, instances, progress updates, and notifications are absent; Step 3 must introduce them and regenerate types. Note that Supabase Database typings are currently “loose” in `server.ts`, signalling the need to resync generated types after migrations.
- **Environment readiness**: Firebase credentials and Redis URL are not yet defined in `src/env/index.ts`. We will extend the schema when notification workers (Step 8) are implemented.
- **Module scaffold**: There is no `/src/modules/tasks` directory yet. Step 2 will introduce the module structure and documentation to isolate domain logic from existing dashboards.
- **Notification infrastructure**: While there is an existing notifications directory (`src/components/notifications`), background job orchestration is not configured. Future steps should align with the planned BullMQ worker.

### Recommendations Before Proceeding to Step 2

- Confirm that contributors possess Supabase service-role access as highlighted in the README checklist to prevent runtime failures in server-side actions.
- Plan to regenerate Prisma client and Supabase type definitions immediately after Step 3 migrations to bring typings back in sync with the new task domain tables.

## Step 2 – Tasks Module Scaffolding (Completed)

- Created the `src/modules/tasks` workspace with dedicated subdirectories for `api`, `components`, `hooks`, `services`, and `types` so future features can be developed in isolation.
- Documented module conventions, folder responsibilities, and roadmap alignment in `src/modules/tasks/README.md` to streamline onboarding and code reviews.
- Added placeholder `index.ts` files in each subdirectory to establish public export hubs that will be expanded as APIs, UI, and services are implemented in later steps.

## Step 3 – Prisma Schema & Migration (Completed)

- Added a dedicated `prisma/schema.prisma` that introduces enums for task status, task priority, notification job type, and notification job status alongside models for task categories, tasks, task instances, progress updates, attachments, notification jobs, and export logs.
- Established relational links across the task domain (e.g., tasks to categories, instances to tasks, attachments to both instances and progress updates) while preserving Supabase ownership of user identity tables by using UUID foreign key fields.
- Authored an initial migration (`prisma/migrations/20250209120000_init_tasks_domain/migration.sql`) that creates the necessary enums, tables, indices, and timestamp triggers to keep the domain schema synchronized with Prisma definitions.
- Next action for contributors: run `npx prisma migrate dev --name init_tasks_domain` against a local database, followed by `npx prisma generate`, to materialize the tables and client before proceeding to seeding in Step 4.

## Step 4 – Demo Seed Data (Completed)

- Authored dual seed scripts (`prisma/seed.ts` for typed references and `prisma/seed.js` for runtime execution) that hydrate the tasks domain with three representative categories, recurring and one-off tasks, task instances spanning pending/in-progress/overdue states, nested progress updates, attachments, notification jobs, and an example export log entry.
- Updated the `npm run db:seed` workflow to call `prisma db seed`, wiring Prisma's seed hook to execute the JavaScript runtime script so the dataset can be refreshed idempotently.
- Seed helpers accept optional `SEED_COACH_ID` and `SEED_CLIENT_ID` environment variables; when omitted, deterministic demo IDs are used so contributors can explore the feature end-to-end without provisioning Supabase users upfront.
- Recommended workflow: `npx prisma migrate dev --name init_tasks_domain` → `npm run db:seed` (optionally overriding IDs) to ensure local databases reflect the example tasks before API development continues in Step 5.

## Step 5 – Task CRUD API (Completed)

- Implemented collection and item route handlers under `/api/tasks` using the shared API utility wrappers to enforce authentication, coach-role authorization, and structured JSON responses.
- Added a Prisma-backed `TaskService` that encapsulates task creation, listing with pagination and filtering, detailed retrieval, and update logic while performing ownership checks for coaches, admins, and clients.
- Introduced Zod DTO schemas for task payloads and query parameters alongside a Prisma singleton helper to standardize database access across the new domain modules.
- Expanded the auth permission matrix with task-centric permissions and delivered Vitest API unit tests that exercise success paths and error handling for the new endpoints.

## Step Tracking

- [x] Step 1: Audit existing codebase and align prerequisites (this document).
- [x] Step 2: Establish domain-specific workspace.
- [x] Step 3: Define Prisma schema extensions for tasks domain.
- [x] Step 4: Seed reference data and helper scripts.
- [x] Step 5: Implement task CRUD API route handlers.
- [ ] Steps 6-20: Pending as outlined in the implementation roadmap.
