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

## Step Tracking

- [x] Step 1: Audit existing codebase and align prerequisites (this document).
- [x] Step 2: Establish domain-specific workspace.
- [ ] Step 3: Define Prisma schema extensions for tasks domain.
- [ ] Step 4: Seed reference data and helper scripts.
- [ ] Steps 5-20: Pending as outlined in the implementation roadmap.
