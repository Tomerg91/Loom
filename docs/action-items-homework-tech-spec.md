# Action Items & Homework Checklist Project Specification

---

## 1. Planning & Discovery

### 1.1 Core Purpose & Success

- **Mission Statement**: Provide coaches with a centralized workspace to assign, monitor, and evaluate actionable homework tasks that keep clients accountable between sessions.
- **Core Purpose & Goals**: Translate coaching insights into structured assignments, streamline client follow-through, and surface progress insights for coaches so that sessions build on measurable outcomes.
- **Success Indicators**: Percentage of tasks completed on time, weekly active client participation, reduction in overdue assignments, coach satisfaction scores gathered post-session, and export frequency for compliance or review.
- **Experience Qualities**: Supportive, organized, transparent.

### 1.2 Project Classification & Approach

- **Complexity Level**: Complex App – multiple user types, recurring task automation, export, notifications, and analytics.
- **Primary User Activity**: Acting – coaches create/manage tasks, clients execute and update progress.
- **Primary Use Cases**:
  1. Coach creates tailored, categorized assignments with due dates and recurrence options.
  2. Client reviews upcoming and recurring homework, logs progress notes, and uploads evidence.
  3. Coach reviews task completion trends, visibility-filtered updates, and exports client homework summaries.

### 1.3 Feature-Selection Rationale

- **Core Problem Analysis**: Coaching sessions often lack structured follow-up; clients forget or deprioritize assignments, leaving coaches without insight into inter-session progress.
- **User Context**: Coaches operate from desktop web during working hours; clients interact through mobile and desktop dashboards between sessions.
- **Critical Path**: Coach logs in → navigates to client profile → creates categorized task with due date/recurrence → client receives notification → client logs progress → coach reviews visibility-permitted updates before next session.
- **Key Moments**: Task creation (capturing clear expectations), client progress update (notes/attachments), coach review (insightful dashboard and export).

### 1.4 High-Level Architecture Overview

- **Client Applications**: Web dashboard (React/Next.js) for both coaches and clients with role-based rendering.
- **APIs**: Next.js API routes (or dedicated Node service) handling task CRUD, recurrence scheduling, progress updates, notification dispatch, and PDF exports.
- **Database**: PostgreSQL (Supabase-hosted) storing users, clients, tasks, recurrence patterns, progress logs, attachments metadata, and notification jobs.
- **Background Services**: Worker queue (e.g., BullMQ with Redis or Supabase Edge Functions) for recurring task generation, reminder scheduling, and PDF rendering.
- **Storage**: Supabase Storage or S3-compatible bucket for attachments and generated PDFs.
- **Third-Party Services**: Push notification provider (e.g., Firebase Cloud Messaging) abstracted behind notification service.

### 1.5 Essential Features

1. **Task Authoring & Assignment**
   - **Functionality**: Coaches create/edit/delete tasks with categories, due dates, recurrence, optional progress visibility to coach, attachments, and notes.
   - **Purpose**: Codifies client homework in actionable format.
   - **Validation**: Unit tests for API validation, integration tests covering creation flows, UI tests verifying form interactions.

2. **Client Task Dashboard**
   - **Functionality**: Clients view assigned tasks by status, update progress (percentage, notes, attachments), manage recurrence instances, and control coach visibility toggles.
   - **Purpose**: Empowers clients to stay accountable and communicate progress.
   - **Validation**: E2E tests ensuring updates persist, visibility toggles respect permissions.

3. **Coach Monitoring & Analytics**
   - **Functionality**: Coach dashboards show upcoming/overdue tasks, completion rates, and visibility-eligible notes; includes filters by category and date.
   - **Purpose**: Supports informed session prep and coaching adjustments.
   - **Validation**: API tests on aggregation queries, UI snapshot and data correctness tests.

4. **Notifications & Reminders**
   - **Functionality**: Push notifications for assignment creation, upcoming due dates, overdue reminders, and recurrence prompts configurable by frequency.
   - **Purpose**: Keeps clients engaged between sessions.
   - **Validation**: Automated tests for scheduling logic, manual verification with device tokens in staging.

5. **PDF Export**
   - **Functionality**: Coaches export client task summaries including status, notes, attachments references, and progress history.
   - **Purpose**: Enables offline review, compliance, and sharing.
   - **Validation**: Snapshot tests on PDF templates, integration tests verifying data accuracy.

---

## 2. System Architecture & Technology

### 2.1 Tech Stack

- **Languages & Frameworks**: TypeScript, Next.js (App Router), Node.js runtime, React 18, Tailwind CSS.
- **Libraries & Dependencies**: Prisma ORM, Zod for validation, React Query (TanStack Query) for data fetching, Day.js for dates, BullMQ/Redis for background jobs, Puppeteer or Playwright for PDF rendering, Firebase Admin SDK or web push libraries for notifications.
- **Database & ORM**: PostgreSQL (Supabase) with Prisma schema management.
- **DevOps & Hosting**: Vercel for frontend/API, Supabase for database/storage/auth, Upstash Redis (or Supabase Edge Functions) for queues, AWS S3-compatible storage if Supabase Storage insufficient.
- **CI/CD Pipeline**: GitHub Actions with linting, tests, database migration checks, and staging deploy previews.

### 2.2 Project Structure

- **Folder Organization**:
  - `/src/app` – Next.js route handlers and pages (App Router).
  - `/src/components` – Shared React components.
  - `/src/modules/tasks` – Domain-specific logic (UI + hooks + services).
  - `/src/server` – API route handlers, services, Prisma client.
  - `/src/lib` – Utilities (date helpers, notification client, PDF generator).
  - `/prisma` – Prisma schema and migration scripts.
  - `/tests` – Integration and E2E suites.
- **Naming Conventions**: Use domain-prefixed filenames (e.g., `task-form.tsx`, `tasks.service.ts`), camelCase for files, PascalCase for components.
- **Key Modules**: Auth (Supabase session management), Tasks (CRUD), Recurrence Scheduler, Notifications, Exports, Attachments.

### 2.3 Component Architecture

#### Server / Backend

- **Framework**: Next.js API routes using Route Handlers (`app/api/**/route.ts`).
- **Data Models & Domain Objects**: Task, TaskCategory, TaskInstance, ProgressUpdate, Attachment, NotificationPreference, CoachVisibilitySetting.
- **Error Boundaries**: Centralized error middleware returning structured JSON (`{ errorCode, message }`), logging via Sentry.

#### Client / Frontend

- **State Management**: React Query for server state, Zustand or Context API for local UI state (filters, modals).
- **Routing**: Role-based layouts with server-side session checks; protected routes redirecting unauthenticated users to sign-in.
- **Type Definitions**: Shared TypeScript types generated from Prisma via `@prisma/client`, plus custom DTOs for API responses.

### 2.4 Data Flow & Real-Time

- **Request/Response Lifecycle**: Client uses React Query to call Next.js API routes; responses typed via Zod schemas.
- **State Sync**: React Query cache invalidation on mutations; optimistic updates for progress changes.
- **Real-Time Updates**: Optional Supabase Realtime channel or server-sent events to push progress updates to coach dashboards; fallback to polling.

---

## 3. Database & Server Logic

### 3.1 Database Schema

- **Entities**:
  - `User` (id, role [coach|client], name, email, timezone, notification_token, created_at).
  - `CoachClient` (coach_id FK, client_id FK, status, relationship_started_at).
  - `TaskCategory` (id, coach_id FK, label, color_hex, created_at).
  - `Task` (id, coach_id FK, client_id FK, title, description, category_id FK, due_date, recurrence_rule JSON, visibility_to_coach boolean, priority enum, created_at, updated_at, archived_at).
  - `TaskInstance` (id, task_id FK, scheduled_date, due_date, status enum [pending|in_progress|completed|overdue], completion_percentage, completed_at).
  - `ProgressUpdate` (id, task_instance_id FK, author_id FK, percentage, note, is_visible_to_coach boolean, created_at).
  - `Attachment` (id, progress_update_id FK nullable, task_instance_id FK nullable, file_url, file_name, file_size, mime_type, uploaded_by_id FK, created_at).
  - `NotificationJob` (id, task_instance_id FK, type enum [assignment_created|upcoming_due|overdue|recurring_prompt], scheduled_at, status enum, payload JSON, created_at, sent_at).
  - `ExportLog` (id, coach_id FK, client_id FK, generated_at, file_url, filters JSON).
- **Relationships**: `User` to `CoachClient` (many-to-many), `Task` belongs to `TaskCategory`, `Task` has many `TaskInstance`, `TaskInstance` has many `ProgressUpdate` and `Attachment`, `NotificationJob` references `TaskInstance`.
- **Indexes**: Composite indexes on (`client_id`, `due_date`), (`task_id`, `scheduled_date`), and partial indexes for filtering overdue tasks.
- **Migrations**: Managed via Prisma Migrate; run pre-deployment with auto-backup; maintain SQL snapshots for auditing.

### 3.2 Server Actions

#### Database Actions

- **CRUD Operations**:
  - Create Task: Validate input, create base `Task`, generate initial `TaskInstance` (and recurrence schedule entries as needed).
  - Read Tasks: Filter by status, category, due date range; include aggregated completion metrics.
  - Update Task: Support editing metadata and recurrence (with strategy to regenerate future instances).
  - Delete/Archive Task: Soft delete via `archived_at`, cascade to future instances.
  - Progress Updates: Create updates with percentage + note + attachments, toggle visibility.
  - Notification Jobs: Insert scheduled reminders; mark as sent post-delivery.
  - Export Logs: Persist metadata when PDF generated.
- **Endpoints / GraphQL Queries** (REST examples):
  - `POST /api/tasks` – create task.
  - `PATCH /api/tasks/{taskId}` – update task metadata.
  - `POST /api/tasks/{taskId}/instances/{instanceId}/progress` – add progress update.
  - `GET /api/clients/{clientId}/tasks` – list tasks with filters.
  - `POST /api/exports/client/{clientId}` – generate PDF.
  - `POST /api/notifications/test` – send test push.
- **ORM/Query Examples**: Use Prisma `task.create({ data: { ..., instances: { create: [...] } } })`; use `taskInstance.findMany` with `orderBy: { due_date: 'asc' }` and `where: { status: 'overdue' }` for reminders.

#### Other Backend Logic

- **External API Integrations**: Firebase Cloud Messaging for push notifications (store tokens per user, handle invalid tokens gracefully).
- **File / Media Handling**: Attachments uploaded via signed URLs to Supabase Storage; metadata saved in `Attachment` table. Virus scanning optional (clamav container) before finalizing.
- **Background Jobs / Workers**: Cron-like scheduler to:
  - Generate upcoming `TaskInstance` rows based on recurrence rule (RRULE parsing via `rrule` library).
  - Dispatch reminders X days before due date and at due date.
  - Mark tasks overdue nightly and trigger notifications.
  - Render PDFs asynchronously to avoid blocking API.

---

## 4. Feature Specifications

### 4.1 Task Authoring & Assignment

- **User Story**: As a coach, I want to create homework assignments categorized by focus area with due dates and recurrence so my client has clear expectations between sessions.
- **Implementation Details**:
  1. Coach selects client and opens modal/form.
  2. Form fields: Title (required), Description (rich text optional), Category (dropdown with create option), Due Date (date picker with timezone awareness), Recurrence (none/daily/weekly/custom RRULE builder), Visibility Toggle (default true), Priority (low/medium/high), Attachments (optional references from template library).
  3. Validate with Zod; submit to `/api/tasks`.
  4. Backend stores task, generates first instance, enqueues reminder jobs.
- **Edge Cases & Error Handling**: Prevent due dates in the past (unless marking as catch-up), conflict detection when recurrence would overlap (resolve by generating sequential due dates), handle missing notification tokens gracefully.
- **UI/UX Considerations**: Stepper for advanced recurrence, inline category color preview, accessible form controls with keyboard navigation.

### 4.2 Client Task Dashboard

- **User Story**: As a client, I need an organized list of my assignments with progress controls so I can stay accountable.
- **Implementation Details**:
  1. Dashboard lists tasks grouped by status (Due Soon, Overdue, Completed) with filter chips for categories.
  2. Each task card shows due date, recurrence badge, completion percentage, attachments, and quick actions (update progress, add note, upload file).
  3. Progress drawer allows slider (0-100%), text area for notes, toggle for coach visibility, attachment uploader.
  4. Mutation updates `TaskInstance` and optionally `ProgressUpdate` record; UI optimistically updates.
- **Edge Cases & Error Handling**: Constrain attachments by size/type, show sync errors with retry option, warn before reducing completion percentage below previous entry.
- **UI/UX Considerations**: Mobile-first layout with collapsible sections, success confetti for completed tasks, accessible notifications (ARIA live regions).

### 4.3 Coach Monitoring & Analytics

- **User Story**: As a coach, I want to monitor client progress to prepare effectively.
- **Implementation Details**:
  1. Dashboard aggregates completion stats per client, highlights overdue tasks, and surfaces latest visible notes.
  2. Filters by category, date range, recurrence type.
  3. Charts using Recharts or Victory showing completion over time.
  4. Exports leverage same query pipeline, feed into PDF template (React-PDF) with sections for each category.
- **Edge Cases & Error Handling**: Hide notes marked private, handle clients with no tasks gracefully, degrade charts when data incomplete (display message).
- **UI/UX Considerations**: Color-coded status tags, accessible charts with data tables, tooltips explaining recurrence.

### 4.4 Notifications & Reminders

- **User Story**: As a client, I want timely reminders so I don’t miss deadlines.
- **Implementation Details**:
  1. Notification preference per user (toggle in settings) stored in DB.
  2. When task created, schedule reminder jobs: default 24h before due, at due time, and 24h after if incomplete.
  3. Worker resolves job, sends push via Firebase; failure retries exponential backoff.
  4. Notification payload deep-links into task on dashboard.
- **Edge Cases & Error Handling**: Handle revoked push permissions by disabling token, ensure duplicates avoided for recurring tasks (dedupe by instance ID).
- **UI/UX Considerations**: Provide preview of notification copy, allow clients to snooze reminders, accessible settings screen.

### 4.5 PDF Export

- **User Story**: As a coach, I need downloadable records of client assignments for reviews.
- **Implementation Details**:
  1. Coach selects date range and categories, triggers `/api/exports/client/{id}`.
  2. API enqueues PDF job; worker fetches data, renders template with header (coach/client info), sections for tasks (status, notes, attachments link).
  3. File stored in storage bucket; signed URL returned (and optionally emailed).
- **Edge Cases & Error Handling**: Large exports paginated to avoid memory spikes, include placeholder for private notes redacted, handle storage failures with retries/logging.
- **UI/UX Considerations**: Show progress indicator while export processing, deliver toast with download link, support accessible PDF structure (headings/bookmarks).

---

## 5. Design System

### 5.1 Visual Tone & Identity

- **Branding & Theme**: Calm, professional palette aligning with Loom app; emphasis on trust and growth.
- **Emotional Response**: Motivating, reassuring, clear.
- **Design Personality**: Modern, supportive, slightly playful to encourage engagement.
- **Visual Metaphors**: Progress paths, growth arcs, checkmarks.
- **Simplicity Spectrum**: Balanced – informative dashboards without clutter.

### 5.2 Color Strategy

- **Color Scheme Type**: Analogous blues/greens with warm accent.
- **Primary Color**: Deep teal (#1D7A85) symbolizing growth and stability.
- **Secondary Colors**: Soft blue (#4FA3C4) for informational states, sage green (#6BBF8E) for completed status.
- **Accent Color**: Coral (#F76C5E) for call-to-action/reminder badges.
- **Color Psychology**: Teal encourages balance, coral prompts attention without anxiety.
- **Color Accessibility**: Maintain 4.5:1 contrast for text; use high-contrast backgrounds for status chips.
- **Foreground/Background Pairings**: Dark text (#1F2933) on white (#FFFFFF); reverse text (#FFFFFF) on primary/secondary backgrounds.

### 5.3 Typography System

- **Font Pairing Strategy**: Sans-serif pairing for clarity; headline vs. body weights.
- **Typographic Hierarchy**: H1 32px/40, H2 24px/32, H3 20px/28, body 16px/24, small 14px/20.
- **Font Personality**: Friendly yet professional (e.g., "Inter" for body, "Poppins" for headings).
- **Readability Focus**: 60-75 character line length, 1.5 line height.
- **Typography Consistency**: Use Tailwind theme tokens for sizes/weights.
- **Which Fonts**: Google Fonts Inter & Poppins.
- **Legibility Check**: Ensure strong contrast; test on mobile for size.

### 5.4 Visual Hierarchy & Layout

- **Attention Direction**: Primary focus on upcoming tasks; secondary on analytics.
- **White Space Philosophy**: Generous spacing around task cards, 8px spacing scale.
- **Grid System**: 12-column responsive grid; breakpoints at 640/768/1024/1280.
- **Responsive Approach**: Stack sections on mobile, multi-column analytics on desktop.
- **Content Density**: Moderate – allow scanning without overwhelming.
- **Layout & Spacing**: Use Tailwind spacing multiples; maintain consistent card padding (24px desktop, 16px mobile).

### 5.5 Animations

- **Purposeful Meaning**: Subtle progress animations when tasks updated.
- **Hierarchy of Movement**: Primary action buttons and completion transitions; avoid constant motion.
- **Contextual Appropriateness**: Use 200-300ms ease-out transitions.

### 5.6 UI Elements & Components

- **Common Elements**: Buttons (primary, secondary, tertiary), segmented filters, modals, drawer, tabs, cards, charts, upload inputs.
- **Component Usage**: Modals for create/edit task; drawers for progress update; cards for tasks.
- **Component Customization**: Tailwind classes for color themes; custom icons aligning with brand.
- **Component States**: Hover, focus, active, disabled defined via Tailwind variants.
- **Interaction States**: Provide loading spinners on submission; success toasts.
- **Reusable Patterns**: Notification banner, filter bar, status pills.
- **Icon Selection**: Use Heroicons or Phosphor for consistent style.
- **Component Hierarchy**: Primary buttons for main CTAs; secondary for supporting actions.
- **Spacing System**: Tailwind scale (2, 4, 6, 8…); align to 4px baseline.
- **Mobile Adaptation**: Collapsible sections, bottom sheet for progress updates.

### 5.7 Visual Consistency Framework

- **Design System Approach**: Component-based (Storybook recommended).
- **Style-Guide Elements**: Document color tokens, typography, spacing, component variants.
- **Visual Rhythm**: Consistent card and list patterns; maintain predictable navigation.
- **Brand Alignment**: Illustrations or icons representing coaching themes.

### 5.8 Accessibility & Readability

- **Accessibility Considerations**: Ensure keyboard navigability, ARIA labels on status indicators, descriptive alt text for attachments.
- **Contrast Goal**: WCAG AA for text; AAA for primary interactive elements where possible.

---

## 6. Security & Compliance

- **Encryption**: TLS for data in transit; database encryption at rest via Supabase; encrypt stored files with bucket policies.
- **Compliance**: Assess for GDPR (EU clients) – consent for notifications, data export rights; maintain audit logs.
- **Threat Modeling**: Protect against unauthorized access (row-level security per coach/client), validate file uploads (type/size), prevent CSRF/XSS via Next.js defaults and Content Security Policy.
- **Secrets Management**: Use environment variables managed via Vercel/Supabase secrets; restrict Redis and storage credentials.

---

## 7. Optional Integrations

### 7.1 Payment Integration

_Not in scope presently; placeholder for future coaching subscription management._

### 7.2 Analytics Integration

- **Tracking Tools**: Segment or PostHog; track events like `task_created`, `task_completed`, `progress_update_visible`.
- **Event Naming Conventions**: snake_case with prefixes by role (e.g., `coach_task_created`).
- **Reporting & Dashboards**: Use analytics tool dashboards; optionally surface key metrics in admin panel.

---

## 8. Environment Configuration & Deployment

- **Local Setup**: `.env` with Supabase keys, Redis URL, Firebase credentials; npm scripts `dev`, `lint`, `test`; optional Docker compose for PostgreSQL/Redis.
- **Staging / Production Environments**: Staging on separate Supabase project and storage bucket; production with read replicas for analytics queries.
- **CI/CD**: GitHub Actions pipeline: lint → unit tests → integration tests → deploy preview; apply migrations using `prisma migrate deploy` before production deploy.
- **Monitoring & Logging**: Sentry for error tracking, Logflare or Vercel logs, Supabase audit logs, alerting via Slack webhook.

---

## 9. Testing & Quality Assurance

- **Unit Testing**: Vitest/Jest for services (task creation, recurrence logic); coverage >80% critical modules.
- **Integration Testing**: Prisma + Supertest for API routes; test row-level security.
- **End-to-End Testing**: Playwright for coach/client flows (task creation, progress update, export).
- **Performance & Security Testing**: k6 load tests on API; OWASP ZAP scans for vulnerabilities.
- **Accessibility Tests**: Playwright + axe for key pages; manual screen reader testing.

---

## 10. Edge Cases, Implementation Considerations & Reflection

- **Potential Obstacles**: Complex recurrence conversions across timezones, push notification deliverability, storage quotas for attachments.
- **Edge-Case Handling**: Daylight saving adjustments when generating recurrence; fallback email notifications if push unavailable; archiving old attachments automatically.
- **Technical Constraints**: Supabase auth limits (per-project) and Redis connection caps; ensure queue service scalable.
- **Scalability Needs**: Partition data by coach for large teams; leverage read replicas for analytics; consider caching aggregated stats.
- **Testing Focus**: Validate recurrence expansion, visibility toggles, and export accuracy with sample datasets.
- **Critical Questions**: Preferred due date defaults? How many attachments per task? Notification cadence customization beyond defaults?
- **Approach Suitability**: Leverages existing Loom infrastructure (Next.js + Supabase) while introducing modular background processing.
- **Assumptions to Challenge**: Clients consistently accept push notifications; coaches manage categories manually.
- **Exceptional Solution Definition**: Seamless scheduling UI, reliable reminders, insightful analytics, and polished exports that delight coaches.

---

## 11. Summary & Next Steps

- **Recap**: Defined end-to-end architecture for coach-assigned homework with recurrence, progress tracking, notifications, and exports built on Next.js, Supabase, and background workers. Detailed schema, APIs, UI flows, and design system.
- **Open Questions**: Confirm due date defaulting rules, dashboard layout preferences (single vs. multi-tab), reminder cadence customization, sharing options for exports (email vs. download only).
- **Future Enhancements**: Add integrations (calendar sync, CRM), habit streak gamification, coach feedback loops on progress updates, AI suggestions for assignments.

---
