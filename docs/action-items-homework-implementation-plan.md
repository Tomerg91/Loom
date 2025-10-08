# Implementation Plan

## Project Setup & Foundations

- [ ] Step 1: Audit existing codebase and align prerequisites
  - **Task**: Review current Next.js/Supabase configuration, confirm authentication patterns, and catalog reusable components relevant to coaching workflows. Document any gaps that influence upcoming steps.
  - **Files**:
    - `README.md`: Add prerequisites checklist for contributors.
    - `docs/action-items-homework-implementation-plan.md`: Update with findings if adjustments needed.
  - **Step Dependencies**: None
  - **User Instructions**: Ensure access to Supabase project credentials and Firebase push notification keys.

- [ ] Step 2: Establish domain-specific workspace
  - **Task**: Create `/src/modules/tasks` directory scaffold with subfolders for `api`, `components`, `hooks`, `services`, `types`, and placeholder index files to enforce structure.
  - **Files**:
    - `src/modules/tasks/README.md`: Document module purpose and structure.
    - `src/modules/tasks/api/index.ts`: Placeholder export file.
    - `src/modules/tasks/components/index.ts`: Placeholder export file.
    - `src/modules/tasks/hooks/index.ts`: Placeholder export file.
    - `src/modules/tasks/services/index.ts`: Placeholder export file.
    - `src/modules/tasks/types/index.ts`: Placeholder export file.
  - **Step Dependencies**: Step 1
  - **User Instructions**: None

## Database & Schema

- [ ] Step 3: Define Prisma schema extensions for tasks domain
  - **Task**: Extend `prisma/schema.prisma` with entities (`TaskCategory`, `Task`, `TaskInstance`, `ProgressUpdate`, `Attachment`, `NotificationJob`, `ExportLog`) and relationships; add enums for task status and priority. Generate initial migration.
  - **Files**:
    - `prisma/schema.prisma`: Add new models and relations.
    - `prisma/migrations/*`: Auto-generated migration files.
    - `docs/action-items-homework-implementation-plan.md`: Note migration command and verification steps.
  - **Step Dependencies**: Step 2
  - **User Instructions**: Run `npx prisma migrate dev --name init_tasks_domain` after defining schema.

- [ ] Step 4: Seed reference data and helper scripts
  - **Task**: Introduce seed scripts for default task categories and demo data for local environments.
  - **Files**:
    - `prisma/seed.ts`: Extend with category/task examples.
    - `package.json`: Add `prisma db seed` npm script if missing.
    - `docs/action-items-homework-implementation-plan.md`: Document seeding usage.
  - **Step Dependencies**: Step 3
  - **User Instructions**: Execute `npm run db:seed` (or documented command) post-migration.

## Backend APIs & Services

- [ ] Step 5: Implement task CRUD API route handlers
  - **Task**: Create Next.js route handlers for `/api/tasks` with POST, GET, PATCH methods using Prisma. Validate payloads via Zod and enforce role checks.
  - **Files**:
    - `src/app/api/tasks/route.ts`: Implement collection-level handlers.
    - `src/app/api/tasks/[taskId]/route.ts`: Implement item-level handlers.
    - `src/modules/tasks/types/task.ts`: Define request/response DTOs.
    - `src/modules/tasks/services/task-service.ts`: Encapsulate Prisma logic.
    - `src/lib/auth/permissions.ts`: Add helper for coach role verification (if needed).
    - `tests/api/tasks.test.ts`: Add integration tests.
  - **Step Dependencies**: Step 3
  - **User Instructions**: None

- [ ] Step 6: Build recurrence scheduling utilities
  - **Task**: Add recurrence parser/generator utilities using `rrule` library, create service to produce `TaskInstance` entries, and integrate with task creation.
  - **Files**:
    - `src/modules/tasks/services/recurrence-service.ts`: Implement recurrence expansion.
    - `src/modules/tasks/types/recurrence.ts`: Define recurrence interfaces.
    - `package.json`: Add `rrule` dependency.
    - `src/modules/tasks/services/task-service.ts`: Hook recurrence generation into creation/update flows.
    - `tests/unit/recurrence-service.test.ts`: Unit tests for recurrence logic.
  - **Step Dependencies**: Step 5
  - **User Instructions**: Run `npm install rrule`.

- [ ] Step 7: Create progress update and attachment APIs
  - **Task**: Implement endpoints for client progress submissions, visibility toggles, and attachment metadata storage using signed URLs.
  - **Files**:
    - `src/app/api/tasks/[taskId]/instances/[instanceId]/progress/route.ts`: Handle POST requests.
    - `src/modules/tasks/types/progress.ts`: Define DTOs.
    - `src/modules/tasks/services/progress-service.ts`: Encapsulate logic.
    - `src/app/api/attachments/sign/route.ts`: Provide signed URL endpoints.
    - `tests/api/progress.test.ts`: Integration tests covering permissions and validation.
  - **Step Dependencies**: Step 3, Step 5
  - **User Instructions**: Configure Supabase storage bucket and env vars for signed URL secrets.

- [ ] Step 8: Notification scheduling and dispatch service
  - **Task**: Configure queue worker (e.g., BullMQ) to manage reminder jobs, integrate Firebase push logic, and expose admin/test endpoint.
  - **Files**:
    - `src/server/queue/index.ts`: Initialize BullMQ connection.
    - `src/server/queue/jobs/task-reminders.ts`: Define job processing.
    - `src/server/services/notification-service.ts`: Wrap Firebase push calls.
    - `package.json`: Add BullMQ and Firebase Admin dependencies.
    - `scripts/worker.ts`: Entry script for worker process.
    - `tests/unit/notification-service.test.ts`: Unit tests using mocks.
  - **Step Dependencies**: Step 3, Step 5, Step 6
  - **User Instructions**: Provision Redis instance and set `REDIS_URL`, `FIREBASE_*` env vars.

- [ ] Step 9: PDF export pipeline
  - **Task**: Implement export API that enqueues PDF job, render using React-PDF or Puppeteer, and store in Supabase bucket with log entry.
  - **Files**:
    - `src/app/api/exports/client/[clientId]/route.ts`: API handler.
    - `src/server/services/export-service.ts`: Fetch data and trigger job.
    - `src/server/queue/jobs/export-pdf.ts`: Worker job to render PDF.
    - `src/modules/tasks/components/export-template.tsx`: React template for PDF rendering.
    - `tests/api/exports.test.ts`: Integration test for export request lifecycle.
  - **Step Dependencies**: Step 3, Step 5, Step 8
  - **User Instructions**: Ensure PDF renderer dependencies installed (e.g., `npm install @react-pdf/renderer` or `puppeteer`).

## Frontend Client Experience

- [ ] Step 10: Shared UI primitives and design tokens
  - **Task**: Extend Tailwind config and shared components (buttons, badges, cards) to match design system; document tokens.
  - **Files**:
    - `tailwind.config.ts`: Add color palette, typography settings.
    - `src/components/ui/Button.tsx`: Update variants if needed.
    - `src/components/ui/Badge.tsx`: Introduce status chips.
    - `src/components/ui/Card.tsx`: Create/extend card layout.
    - `docs/design-system.md`: Summarize tokens.
  - **Step Dependencies**: Step 2
  - **User Instructions**: Run `npm run lint` to ensure Tailwind classes compiled.

- [ ] Step 11: Coach task management interface
  - **Task**: Build coach dashboard page with task list, filters, and create/edit modal using React Hook Form + Zod.
  - **Files**:
    - `src/app/(coach)/dashboard/page.tsx`: Page implementation.
    - `src/modules/tasks/components/TaskList.tsx`: List view component.
    - `src/modules/tasks/components/TaskFormModal.tsx`: Create/edit modal.
    - `src/modules/tasks/hooks/useTaskFilters.ts`: Client-side state management.
    - `src/modules/tasks/api/useTasksQuery.ts`: React Query hooks.
    - `tests/e2e/coach-dashboard.spec.ts`: Playwright scenario for task creation.
  - **Step Dependencies**: Step 5, Step 10
  - **User Instructions**: None

- [ ] Step 12: Client dashboard and progress workflows
  - **Task**: Implement client task view grouped by status with progress drawer, attachments, and optimistic updates.
  - **Files**:
    - `src/app/(client)/dashboard/page.tsx`
    - `src/modules/tasks/components/ClientTaskCard.tsx`
    - `src/modules/tasks/components/ProgressDrawer.tsx`
    - `src/modules/tasks/hooks/useProgressMutations.ts`
    - `src/modules/tasks/api/useTaskInstancesQuery.ts`
    - `tests/e2e/client-dashboard.spec.ts`
  - **Step Dependencies**: Step 7, Step 10
  - **User Instructions**: None

- [ ] Step 13: Coach analytics and reporting UI
  - **Task**: Build analytics widgets (charts, tables) and export trigger UI with proper access control.
  - **Files**:
    - `src/app/(coach)/dashboard/analytics.tsx`
    - `src/modules/tasks/components/CompletionChart.tsx`
    - `src/modules/tasks/components/OverdueTable.tsx`
    - `src/modules/tasks/hooks/useAnalyticsData.ts`
    - `tests/e2e/coach-analytics.spec.ts`
  - **Step Dependencies**: Step 9, Step 11
  - **User Instructions**: None

- [ ] Step 14: Notification preferences UI
  - **Task**: Provide settings screens for clients to manage push notification consent and snooze options.
  - **Files**:
    - `src/app/(client)/settings/notifications/page.tsx`
    - `src/modules/tasks/components/NotificationToggle.tsx`
    - `src/modules/tasks/hooks/useNotificationPreferences.ts`
    - `tests/e2e/notification-preferences.spec.ts`
  - **Step Dependencies**: Step 8, Step 10
  - **User Instructions**: Verify push token registration flow in staging devices.

## Background Jobs & Operations

- [ ] Step 15: Deployment-ready worker configuration
  - **Task**: Add Docker/PM2 scripts for worker deployment, configure environment variables, and document runbooks.
  - **Files**:
    - `Dockerfile.worker`: Worker image definition.
    - `package.json`: Add `worker:start` script.
    - `docs/runbooks/task-reminder-worker.md`: Operational guide.
    - `vercel.json` or infra config: Ensure worker excluded from frontend build.
  - **Step Dependencies**: Step 8, Step 9
  - **User Instructions**: Provision hosting environment (e.g., Fly.io, Railway) if not on Vercel.

- [ ] Step 16: Monitoring, logging, and analytics events
  - **Task**: Integrate Sentry/Logflare logging in new services, emit analytics events for key actions.
  - **Files**:
    - `src/lib/analytics/events.ts`: Define event constants.
    - `src/server/services/task-service.ts`: Emit events upon creation/completion.
    - `src/server/services/notification-service.ts`: Log delivery outcomes.
    - `src/server/services/export-service.ts`: Track export usage.
    - `tests/unit/analytics-events.test.ts`: Ensure events fire correctly.
  - **Step Dependencies**: Step 5, Step 8, Step 9
  - **User Instructions**: Configure Sentry DSN and analytics API keys.

## Testing & Quality Assurance

- [ ] Step 17: Comprehensive automated testing suite
  - **Task**: Finalize unit, integration, and E2E test coverage for critical paths; set up coverage thresholds.
  - **Files**:
    - `vitest.config.ts`: Update coverage settings if needed.
    - `tests/api/**/*.test.ts`: Ensure CRUD, progress, export tests complete.
    - `tests/unit/**/*.test.ts`: Validate services/utilities.
    - `tests/e2e/**/*.spec.ts`: Finalize Playwright flows.
    - `package.json`: Add combined test script `npm run test:all`.
  - **Step Dependencies**: Steps 5-14
  - **User Instructions**: Run `npm run test:all` and review reports.

- [ ] Step 18: Accessibility and performance audits
  - **Task**: Execute accessibility audits (axe, screen reader) and performance profiling (Lighthouse) on key dashboards; document findings and fixes.
  - **Files**:
    - `tests/accessibility/coach-dashboard.spec.ts`: Automated axe checks.
    - `tests/performance/lighthouse-config.json`: Define audit settings.
    - `docs/qa/a11y-performance-report.md`: Summarize results and remediation tasks.
  - **Step Dependencies**: Step 11, Step 12, Step 13
  - **User Instructions**: Run `npm run test:a11y` and `npm run test:performance` (scripts to be added if absent).

## Deployment & Release

- [ ] Step 19: Update CI/CD pipeline
  - **Task**: Extend GitHub Actions to include linting, testing, migration checks, worker deployment triggers, and artifact uploads for PDFs.
  - **Files**:
    - `.github/workflows/ci.yml`: Modify pipeline steps.
    - `.github/workflows/worker-deploy.yml`: New workflow for worker.
    - `docs/deployment/checklist.md`: Document release process.
  - **Step Dependencies**: Steps 5-17
  - **User Instructions**: Configure secrets for database, Redis, Firebase, and storage in repository settings.

- [ ] Step 20: Production readiness review
  - **Task**: Conduct final audit covering environment configs, backup strategies, rollback plan, and stakeholder sign-off.
  - **Files**:
    - `docs/production-readiness.md`: Checklist and sign-off log.
    - `docs/action-items-homework-implementation-plan.md`: Mark plan steps as complete with final notes.
  - **Step Dependencies**: Steps 1-19
  - **User Instructions**: Schedule review meeting with coaching team, capture sign-off in documentation.

---

## Summary

This implementation plan sequences development from foundational setup through database modeling, backend services, frontend experiences, background processing, and quality assurance. Each step keeps file touch counts manageable and highlights operational considerations like worker deployment, monitoring, and CI/CD enhancements. Completing the steps in order ensures the Action Items & Homework feature set progresses cohesively toward a production-ready release while maintaining documentation for onboarding and audits.
