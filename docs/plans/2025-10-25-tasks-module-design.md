# Tasks Module Implementation Design

**Date:** October 25, 2025
**Status:** Approved for Implementation
**Approach:** Hybrid Pragmatic

---

## Overview

Full-stack implementation of task management system for coaching platform. Coaches assign tasks to clients, clients track progress through updates. System supports task categories and reusable templates.

---

## Core Features

1. **Task Creation & Assignment** - Coaches create tasks, assign to clients with deadlines
2. **Progress Tracking** - Clients log progress with percentage, notes, and attachments
3. **Task Categories** - Reusable categories per coach
4. **Task Templates** - Save tasks as templates for repeated use
5. **Simple Deadlines** - Due dates on assignments, no automated reminders

---

## Database Schema

### Tables

**`task_categories`**

```sql
id (uuid, primary key)
coach_id (uuid, foreign key → users)
name (text)
color (text, hex color code)
created_at (timestamptz)
updated_at (timestamptz)

Unique constraint: (coach_id, name)
RLS: Coaches see only their own categories
```

**`tasks`**

```sql
id (uuid, primary key)
coach_id (uuid, foreign key → users)
title (text)
description (text)
category_id (uuid, foreign key → task_categories, nullable)
is_template (boolean, default false)
created_at (timestamptz)
updated_at (timestamptz)

RLS: Coaches see only their own tasks
```

**`task_instances`**

```sql
id (uuid, primary key)
task_id (uuid, foreign key → tasks)
client_id (uuid, foreign key → users)
assigned_at (timestamptz)
due_date (date)
status (enum: pending, in_progress, completed)
completed_at (timestamptz, nullable)
created_at (timestamptz)
updated_at (timestamptz)

Unique constraint: (task_id, client_id) per coach
RLS: Clients see only their instances, coaches see instances for their tasks
```

**`task_progress_updates`**

```sql
id (uuid, primary key)
instance_id (uuid, foreign key → task_instances)
progress_percentage (integer, 0-100)
notes (text)
attachments (jsonb, array of {id, url, filename})
created_at (timestamptz)

Check constraint: progress_percentage between 0 and 100
RLS: Clients see only their updates, coaches see updates for their assigned tasks
```

---

## API Endpoints

### Coach Endpoints (Task Management)

| Method | Endpoint                           | Description                    |
| ------ | ---------------------------------- | ------------------------------ |
| POST   | `/api/tasks`                       | Create new task or template    |
| GET    | `/api/tasks?templateOnly=true`     | List coach's templates         |
| GET    | `/api/tasks`                       | List coach's tasks             |
| GET    | `/api/tasks/:taskId`               | Get task details with category |
| PUT    | `/api/tasks/:taskId`               | Update task                    |
| POST   | `/api/tasks/:taskId/assign`        | Create instances (bulk assign) |
| DELETE | `/api/tasks/:taskId`               | Delete task                    |
| GET    | `/api/task-categories`             | List coach's categories        |
| POST   | `/api/task-categories`             | Create category                |
| PUT    | `/api/task-categories/:categoryId` | Update category                |
| DELETE | `/api/task-categories/:categoryId` | Delete category                |

### Client Endpoints (Progress Tracking)

| Method | Endpoint                                             | Description                        |
| ------ | ---------------------------------------------------- | ---------------------------------- |
| GET    | `/api/tasks/assigned`                                | List assigned instances            |
| GET    | `/api/tasks/assigned/:instanceId`                    | Get instance with progress history |
| POST   | `/api/tasks/assigned/:instanceId/progress`           | Log progress update                |
| PUT    | `/api/tasks/assigned/:instanceId/progress/:updateId` | Edit progress entry                |
| DELETE | `/api/tasks/assigned/:instanceId/progress/:updateId` | Delete progress entry              |
| PATCH  | `/api/tasks/assigned/:instanceId/complete`           | Mark instance as complete          |

### Response Shape

**Task Instance Response:**

```json
{
  "id": "uuid",
  "taskId": "uuid",
  "task": {
    "id": "uuid",
    "title": "Complete reading chapter 5",
    "description": "Read pages 100-150",
    "category": {
      "id": "uuid",
      "name": "Homework",
      "color": "#3b82f6"
    }
  },
  "dueDate": "2025-12-25",
  "status": "in_progress",
  "completedAt": null,
  "progressUpdates": [
    {
      "id": "uuid",
      "progressPercentage": 50,
      "notes": "Completed first half, excellent insights",
      "attachments": [
        {
          "id": "uuid",
          "url": "/storage/...",
          "filename": "notes.pdf"
        }
      ],
      "createdAt": "2025-10-25T14:30:00Z"
    }
  ],
  "createdAt": "2025-10-20T10:00:00Z",
  "updatedAt": "2025-10-25T14:30:00Z"
}
```

---

## UI Components

### Coach Interface

**Task Manager Page** (`/coach/tasks`)

- Tab navigation: "My Tasks" | "Templates"
- Task list with columns: title, category, assigned count, actions
- Create/Edit task form:
  - Text input: title (required)
  - Textarea: description
  - Select: category (with "+ New Category" option)
  - Checkbox: is_template
  - Button: Save as Template / Create Task
- Bulk assign modal:
  - Multi-select: clients
  - Date picker: due date
  - Submit button with confirmation

**Category Manager**

- Modal or sidebar dropdown
- List of categories with color indicators
- Create new: form with name + color picker
- Edit/Delete actions with confirmation

### Client Interface

**Tasks Dashboard** (`/client/tasks`)

- Filter buttons: All | Pending | In Progress | Completed
- Task cards showing:
  - Task title and category badge
  - Due date with visual urgency (overdue = red)
  - Progress bar (aggregated from latest update)
  - Quick action button: "View" or "Mark Complete"

**Task Detail View**

- Expandable/modal view showing:
  - Task title, description, category
  - Due date, current status
  - Progress timeline (chronological list of updates)
  - "Add Progress" button

**Progress Entry Form**

- Input fields:
  - Percentage slider (0-100) or number input
  - Textarea: notes (optional)
  - File upload: attachments (optional, supports multiple)
- Action buttons:
  - "Save Progress" button
  - "Mark Complete" quick action (auto-sets percentage to 100)
- Cancel option

---

## State Management

**Data Fetching (TanStack Query):**

- `useQuery` for tasks list, task detail, progress history
- `useMutation` for create/update/delete operations
- Stale time: 30 seconds (coach) / 15 seconds (client, more real-time)
- Refetch on window focus

**Client State (Zustand):**

- Filter store: `{ statusFilter: 'all' | 'pending' | 'in_progress' | 'completed' }`
- Sort store: `{ sortBy: 'dueDate' | 'createdAt', order: 'asc' | 'desc' }`

**Real-time Updates:**

- Supabase real-time subscriptions on `task_progress_updates` table
- Clients subscribe to their own progress updates
- Coaches subscribe to updates on their assigned tasks

---

## Error Handling & Validation

### Request Validation

| Field               | Validation                               | Error Code          |
| ------------------- | ---------------------------------------- | ------------------- |
| title               | Required, max 255 chars                  | INVALID_TITLE       |
| description         | Optional, max 5000 chars                 | INVALID_DESCRIPTION |
| due_date            | Required, must be future date            | INVALID_DUE_DATE    |
| category_id         | Optional, must exist and belong to coach | INVALID_CATEGORY    |
| progress_percentage | Required, 0-100                          | INVALID_PERCENTAGE  |

### Error Response Format

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "dueDate": "Must be a future date",
    "title": "Cannot be empty"
  }
}
```

### Common Error Scenarios

| Scenario                     | Status | Code             | Message                      |
| ---------------------------- | ------ | ---------------- | ---------------------------- |
| Missing required field       | 400    | VALIDATION_ERROR | Field-specific error         |
| Due date is past             | 400    | INVALID_DUE_DATE | Must be in the future        |
| Task not found               | 404    | NOT_FOUND        | Task does not exist          |
| Unauthorized access          | 403    | FORBIDDEN        | You don't have permission    |
| Category doesn't exist       | 400    | INVALID_CATEGORY | Category not found           |
| Task already completed       | 400    | INVALID_STATUS   | Cannot modify completed task |
| Client not in coach's roster | 400    | INVALID_CLIENT   | Cannot assign to this client |

### RLS Security Policies

**Coach Access:**

- Can create/edit/delete only their own tasks
- Can view categories they created
- Can assign tasks to clients in their roster
- Can view progress on their task instances

**Client Access:**

- Can view only their assigned task instances
- Can create/edit/delete their own progress updates
- Cannot view other clients' tasks or progress

**Immutability:**

- Progress updates immutable after creation (soft constraint)
- Completed task instances cannot be reopened

---

## Implementation Order

1. **Phase 1: Database** - Create migration file with all tables and RLS policies
2. **Phase 2: API Backend** - Implement all endpoints with validation
3. **Phase 3: Type Generation** - Generate Supabase types to replace stubs
4. **Phase 4: Service Layer** - Create task and progress service classes
5. **Phase 5: Coach UI** - Build task manager and category components
6. **Phase 6: Client UI** - Build task list, detail view, progress tracker
7. **Phase 7: Integration** - Wire up real-time subscriptions
8. **Phase 8: Testing** - Write tests for critical paths

---

## Success Criteria

- [ ] All database tables created and RLS policies enforced
- [ ] All API endpoints tested and returning correct responses
- [ ] Coach can create tasks and assign to clients
- [ ] Clients can view assigned tasks and log progress
- [ ] Categories filter tasks properly
- [ ] Templates can be created and reused
- [ ] Type safety: No stub types in use, fully typed from Supabase
- [ ] Real-time progress updates visible without refresh
- [ ] All error scenarios handled gracefully
- [ ] Comprehensive test coverage (API + Components)

---

## Dependencies & Integration Points

**Existing Systems:**

- Supabase Auth (users, sessions)
- TanStack Query (data fetching)
- Zustand (client state)
- Supabase Real-time (subscriptions)
- Next.js App Router (API routes, pages)
- Radix UI (components)
- Tailwind CSS (styling)

**New Files to Create:**

- Database migration: `20251025000000_add_tasks_domain.sql`
- API routes: `/app/api/tasks/*`, `/app/api/task-categories/*`
- Services: `/lib/database/tasks.ts`, `/lib/services/task-service.ts`
- Components: `/components/tasks/*` (coach and client subdirs)
- Types: Auto-generated from Supabase schema
- Hooks: `/lib/hooks/use-tasks.ts`, `/lib/hooks/use-task-progress.ts`

---

## Notes

- Avoid sending notifications for deadlines (simple deadlines only)
- Template creation happens by flagging existing task, no separate creation flow
- Focus on core features first, defer advanced features like recurring tasks
- All timestamps in UTC, format as ISO 8601 in responses
