# Tasks Module

This module centralizes task and homework functionality for both coaches and clients. It is designed to keep domain logic, API surface areas, UI primitives, and supporting utilities co-located so that future iterations can evolve independently from other product areas.

## Folder Structure

- `api/` – Client- and server-side request helpers, React Query hooks, and shared fetch utilities.
- `components/` – React components dedicated to task management experiences (lists, forms, drawers, etc.).
- `hooks/` – Custom React hooks used by task components for state management and side effects.
- `services/` – Domain services encapsulating business logic (Prisma accessors, recurrence utilities, notification helpers).
- `types/` – Shared TypeScript definitions and schema validators.

Each subdirectory exposes a local `index.ts` file to aggregate exports. When adding new modules, update the relevant index to maintain a clean public API for the tasks domain.

## Contribution Guidelines

1. Prefer colocating unit tests beside the implementation (e.g., `TaskFormModal.test.tsx`) when practical; otherwise use the existing `tests/` hierarchy for integration and end-to-end coverage.
2. Keep API layer logic thin by delegating business rules to services. This promotes reuse between Next.js route handlers, React Query hooks, and background jobs.
3. Export only stable interfaces from the root of each subdirectory to avoid breaking consumers unexpectedly. Re-export experimental utilities from feature-specific entry points instead.
4. Update this README whenever the module structure changes so onboarding engineers understand the intended architecture.

## Roadmap Alignment

The scaffolding created in Step 2 supports upcoming milestones:

- **Step 3:** Extend the Prisma schema with task-related entities and generate migrations.
- **Step 5:** Implement task CRUD APIs and shared DTOs.
- **Step 6:** Introduce recurrence utilities and integrate them into task services.
- **Steps 7-14:** Layer on progress updates, notifications, exports, and UI experiences specific to coaches and clients.

By establishing a dedicated workspace now, subsequent steps can evolve without leaking domain-specific logic into unrelated parts of the application.
