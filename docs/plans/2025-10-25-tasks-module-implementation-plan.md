# Tasks Module - Implementation Plan

**Target Branch:** `feature/tasks-module`
**Design Document:** `docs/plans/2025-10-25-tasks-module-design.md`

---

## Phase 1: Database Migration & Schema

### Task 1.1: Create Database Migration File

**File:** `supabase/migrations/20251025000000_add_tasks_domain.sql`

Create migration with all tables:

```sql
-- Create task_categories table
CREATE TABLE task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(coach_id, name)
);

-- Create tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES task_categories(id) ON DELETE SET NULL,
  is_template BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create task_instances table
CREATE TABLE task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, client_id)
);

-- Create task_progress_updates table
CREATE TABLE task_progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES task_instances(id) ON DELETE CASCADE,
  progress_percentage INTEGER NOT NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_tasks_coach_id ON tasks(coach_id);
CREATE INDEX idx_task_categories_coach_id ON task_categories(coach_id);
CREATE INDEX idx_task_instances_client_id ON task_instances(client_id);
CREATE INDEX idx_task_instances_task_id ON task_instances(task_id);
CREATE INDEX idx_task_progress_updates_instance_id ON task_progress_updates(instance_id);

-- Enable RLS
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_progress_updates ENABLE ROW LEVEL SECURITY;

-- Task Categories RLS
CREATE POLICY "Coaches can view their own categories"
  ON task_categories FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert categories"
  ON task_categories FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their own categories"
  ON task_categories FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their own categories"
  ON task_categories FOR DELETE
  USING (auth.uid() = coach_id);

-- Tasks RLS
CREATE POLICY "Coaches can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can insert tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = coach_id);

-- Task Instances RLS
CREATE POLICY "Coaches can view instances of their tasks"
  ON task_instances FOR SELECT
  USING (
    task_id IN (SELECT id FROM tasks WHERE coach_id = auth.uid()) OR
    client_id = auth.uid()
  );

CREATE POLICY "Coaches can assign task instances"
  ON task_instances FOR INSERT
  WITH CHECK (
    task_id IN (SELECT id FROM tasks WHERE coach_id = auth.uid())
  );

CREATE POLICY "Coaches can update instances of their tasks"
  ON task_instances FOR UPDATE
  USING (task_id IN (SELECT id FROM tasks WHERE coach_id = auth.uid()));

CREATE POLICY "Coaches can delete instances of their tasks"
  ON task_instances FOR DELETE
  USING (task_id IN (SELECT id FROM tasks WHERE coach_id = auth.uid()));

-- Task Progress Updates RLS
CREATE POLICY "Users can view progress on their instances"
  ON task_progress_updates FOR SELECT
  USING (
    instance_id IN (
      SELECT id FROM task_instances WHERE client_id = auth.uid() OR
      task_id IN (SELECT id FROM tasks WHERE coach_id = auth.uid())
    )
  );

CREATE POLICY "Clients can insert progress updates"
  ON task_progress_updates FOR INSERT
  WITH CHECK (
    instance_id IN (SELECT id FROM task_instances WHERE client_id = auth.uid())
  );

CREATE POLICY "Clients can update their own progress updates"
  ON task_progress_updates FOR UPDATE
  USING (
    instance_id IN (SELECT id FROM task_instances WHERE client_id = auth.uid())
  );

CREATE POLICY "Clients can delete their own progress updates"
  ON task_progress_updates FOR DELETE
  USING (
    instance_id IN (SELECT id FROM task_instances WHERE client_id = auth.uid())
  );
```

**Verification:**

- [ ] Migration file created
- [ ] Apply migration: `npx supabase db push`
- [ ] Verify tables in Supabase dashboard
- [ ] Test RLS policies with different user roles

---

## Phase 2: Type Generation & Service Layer

### Task 2.1: Generate TypeScript Types

**Command:** `npx supabase gen types typescript --project-id <PROJECT_ID> > src/lib/database/schema.types.ts`

Update existing stub types in `src/modules/tasks/types/stub-types.ts` to import from generated types.

**Verification:**

- [ ] Types generated without errors
- [ ] Import `Database` type from schema.types.ts
- [ ] Remove stub type file references

### Task 2.2: Create Task Database Service

**File:** `src/lib/database/tasks.ts`

Implement functions:

```typescript
// Query functions
export async function getTasksByCoachId(supabase, coachId: string);
export async function getTaskById(supabase, taskId: string);
export async function getTemplatesByCoachId(supabase, coachId: string);
export async function getTaskInstancesByClientId(supabase, clientId: string);
export async function getTaskInstanceById(supabase, instanceId: string);
export async function getProgressUpdates(supabase, instanceId: string);
export async function getCategoriesByCoachId(supabase, coachId: string);

// Mutation functions
export async function createTask(supabase, data);
export async function updateTask(supabase, taskId: string, data);
export async function deleteTask(supabase, taskId: string);
export async function createTaskCategory(supabase, data);
export async function updateTaskCategory(supabase, categoryId: string, data);
export async function deleteTaskCategory(supabase, categoryId: string);
export async function assignTaskToClient(
  supabase,
  taskId: string,
  clientId: string,
  dueDate: string
);
export async function createProgressUpdate(supabase, instanceId: string, data);
export async function updateProgressUpdate(supabase, updateId: string, data);
export async function deleteProgressUpdate(supabase, updateId: string);
export async function completeTaskInstance(supabase, instanceId: string);
```

**Verification:**

- [ ] All functions typed correctly
- [ ] Error handling implemented
- [ ] RLS policies tested for each function

### Task 2.3: Create Task Service Class

**File:** `src/lib/services/task-service.ts`

Wrapper service:

```typescript
export class TaskService {
  constructor(private supabase: SupabaseClient) {}

  async createTaskAndAssign(taskData, clientIds, dueDate);
  async getCoachDashboard(coachId);
  async getClientDashboard(clientId);
  async bulkAssignTask(taskId, clientIds, dueDate);
  async updateTaskWithValidation(taskId, data);
  async validateTaskAccess(taskId, userId, role);
}
```

**Verification:**

- [ ] Service methods work end-to-end
- [ ] Validation errors caught properly
- [ ] Supabase integration tested

---

## Phase 3: API Endpoints (Backend)

### Task 3.1: Create Coach Task Endpoints

**Files:**

- `src/app/api/tasks/route.ts` - GET, POST
- `src/app/api/tasks/[taskId]/route.ts` - GET, PUT, DELETE
- `src/app/api/tasks/[taskId]/assign/route.ts` - POST

**Endpoints:**

```
POST /api/tasks
  Body: { title, description?, categoryId?, isTemplate? }
  Response: { id, ...task }

GET /api/tasks
  Query: ?templateOnly=true
  Response: Task[]

GET /api/tasks/:taskId
  Response: Task with category

PUT /api/tasks/:taskId
  Body: { title?, description?, categoryId?, isTemplate? }
  Response: Updated task

DELETE /api/tasks/:taskId
  Response: { success: true }

POST /api/tasks/:taskId/assign
  Body: { clientIds: string[], dueDate: string }
  Response: { created: number, failed: number }
```

**Validation:**

- Title required, max 255 chars
- Due date must be future date
- Category must exist and belong to coach
- Client must exist and be coached by auth user

### Task 3.2: Create Task Category Endpoints

**File:** `src/app/api/task-categories/route.ts`

```
GET /api/task-categories
  Response: TaskCategory[]

POST /api/task-categories
  Body: { name, color }
  Response: Created category

PUT /api/task-categories/:categoryId
  Body: { name?, color? }
  Response: Updated category

DELETE /api/task-categories/:categoryId
  Response: { success: true }
```

### Task 3.3: Create Client Progress Endpoints

**Files:**

- `src/app/api/tasks/assigned/route.ts` - GET
- `src/app/api/tasks/assigned/[instanceId]/route.ts` - GET
- `src/app/api/tasks/assigned/[instanceId]/progress/route.ts` - POST
- `src/app/api/tasks/assigned/[instanceId]/progress/[updateId]/route.ts` - PUT, DELETE
- `src/app/api/tasks/assigned/[instanceId]/complete/route.ts` - PATCH

**Endpoints:**

```
GET /api/tasks/assigned
  Query: ?status=pending|in_progress|completed&sort=dueDate|createdAt&order=asc|desc
  Response: TaskInstance[]

GET /api/tasks/assigned/:instanceId
  Response: TaskInstance with full progress history

POST /api/tasks/assigned/:instanceId/progress
  Body: { progressPercentage, notes?, attachments? }
  Response: Created progress update

PUT /api/tasks/assigned/:instanceId/progress/:updateId
  Body: { progressPercentage?, notes?, attachments? }
  Response: Updated progress update

DELETE /api/tasks/assigned/:instanceId/progress/:updateId
  Response: { success: true }

PATCH /api/tasks/assigned/:instanceId/complete
  Response: { success: true }
```

**Verification:**

- [ ] All endpoints return correct status codes
- [ ] Validation errors return 400 with details
- [ ] Unauthorized access returns 403
- [ ] RLS properly restricts data

---

## Phase 4: Frontend Components - Coach Interface

### Task 4.1: Create Task Manager Page

**File:** `src/app/coach/tasks/page.tsx`

Features:

- Tab navigation: "My Tasks" | "Templates"
- Task list with columns: title, category, assigned count, created date, actions
- "Create New Task" button opens form
- Filter/sort controls

**Verification:**

- [ ] Page renders without errors
- [ ] Tabs switch correctly
- [ ] Task list fetches and displays

### Task 4.2: Create Task Form Component

**File:** `src/components/tasks/task-form.tsx`

Inputs:

- Text: title (required, validated)
- Textarea: description
- Select: category (with "+ New Category" option)
- Checkbox: is_template
- Buttons: Save | Cancel

**Verification:**

- [ ] Form validates required fields
- [ ] Category select works
- [ ] Submit handler calls API correctly

### Task 4.3: Create Category Manager Component

**File:** `src/components/tasks/category-manager.tsx`

Modal/dropdown with:

- List of categories with color indicators
- Create form: name + color picker
- Edit/delete actions with confirmation

**Verification:**

- [ ] Categories display correctly
- [ ] Create category works
- [ ] Edit/delete with confirmation

### Task 4.4: Create Assign Tasks Modal

**File:** `src/components/tasks/assign-tasks-modal.tsx`

Modal for bulk assignment:

- Multi-select: clients from coach's roster
- Date picker: due date
- Confirmation before submit

**Verification:**

- [ ] Client multi-select works
- [ ] Date picker validates future dates
- [ ] Submit calls assign endpoint

---

## Phase 5: Frontend Components - Client Interface

### Task 5.1: Create Tasks Dashboard Page

**File:** `src/app/client/tasks/page.tsx`

Features:

- Filter buttons: All | Pending | In Progress | Completed
- Task cards with:
  - Title, category badge, due date
  - Progress bar from latest update
  - Quick actions: View | Mark Complete

**Verification:**

- [ ] Page renders and fetches tasks
- [ ] Filter buttons work
- [ ] Task cards display correctly

### Task 5.2: Create Task Detail Component

**File:** `src/components/tasks/task-detail.tsx`

Modal/expandable showing:

- Task title, description, category
- Due date, current status
- Progress timeline (chronological updates)
- "Add Progress" button

**Verification:**

- [ ] Fetches task instance with progress history
- [ ] Progress timeline displays chronologically
- [ ] Add Progress button opens form

### Task 5.3: Create Progress Entry Component

**File:** `src/components/tasks/progress-entry-form.tsx`

Form fields:

- Percentage slider (0-100) or number input
- Textarea: notes (optional)
- File upload: attachments (optional, multiple)
- Buttons: "Save Progress" | "Mark Complete" | Cancel

**Verification:**

- [ ] Percentage input validates 0-100
- [ ] File upload accepts multiple files
- [ ] "Mark Complete" auto-sets percentage to 100
- [ ] Submit calls progress endpoint

### Task 5.4: Create Task List Component

**File:** `src/components/tasks/task-list.tsx`

Reusable component:

- List of tasks with status badges
- Filter and sort props
- Pagination support

**Verification:**

- [ ] Renders task items correctly
- [ ] Responsive on mobile

---

## Phase 6: State Management & Hooks

### Task 6.1: Create Task Query Hooks

**File:** `src/lib/hooks/use-tasks.ts`

Hooks:

```typescript
export function useCoachTasks(coachId: string);
export function useTaskTemplates(coachId: string);
export function useTaskById(taskId: string);
export function useClientAssignedTasks(clientId: string, status?: string);
export function useTaskInstance(instanceId: string);
export function useTaskCategories(coachId: string);
```

**Implementation:**

- Use TanStack Query (useQuery, useInfiniteQuery)
- Stale time: 30s (coach) / 15s (client)
- Refetch on window focus

### Task 6.2: Create Task Mutation Hooks

**File:** `src/lib/hooks/use-tasks-mutations.ts`

Hooks:

```typescript
export function useCreateTask();
export function useUpdateTask();
export function useDeleteTask();
export function useAssignTasks();
export function useCreateCategory();
export function useDeleteCategory();
```

**Implementation:**

- Use useMutation
- Error handling with toast notifications
- Invalidate queries on success

### Task 6.3: Create Task Filter Store

**File:** `src/lib/stores/task-filter-store.ts`

Zustand store:

```typescript
interface TaskFilterState {
  statusFilter: 'all' | 'pending' | 'in_progress' | 'completed';
  sortBy: 'dueDate' | 'createdAt';
  order: 'asc' | 'desc';
  setStatusFilter(status);
  setSortBy(field);
  setOrder(order);
}
```

**Verification:**

- [ ] Store initializes correctly
- [ ] Filter changes update components

### Task 6.4: Setup Real-time Subscriptions

**File:** `src/lib/realtime/task-subscriptions.ts`

Subscriptions:

```typescript
export function subscribeToProgressUpdates(instanceId: string, callback);
export function subscribeToTaskAssignments(clientId: string, callback);
export function subscribeToTaskUpdates(coachId: string, callback);
```

**Verification:**

- [ ] Subscriptions connect without errors
- [ ] Real-time updates trigger callbacks

---

## Phase 7: Integration & Polish

### Task 7.1: Wire Up Navigation

- Add "Tasks" link to coach dashboard sidebar
- Add "My Tasks" link to client dashboard sidebar
- Update navigation menus

### Task 7.2: Add Translations

**File:** `public/locales/*/tasks.json`

Translation keys:

- `tasks.title`, `tasks.myTasks`, `tasks.templates`
- `tasks.createTask`, `tasks.editTask`, `tasks.deleteTask`
- `tasks.assignTasks`, `tasks.addProgress`, `tasks.markComplete`
- `tasks.category`, `tasks.dueDate`, `tasks.progress`
- Error messages for validation

**Verification:**

- [ ] All text in UI is translated
- [ ] Language switching works

### Task 7.3: Add Loading & Error States

- Loading skeletons for task lists
- Error boundaries with retry buttons
- Empty state messages

**Verification:**

- [ ] Loading states appear during fetch
- [ ] Errors display with helpful messages

---

## Phase 8: Testing

### Task 8.1: API Tests

**Files:** `src/app/api/tasks/*.test.ts`

Test cases:

- Create task: valid/invalid inputs
- List tasks: filtering, pagination
- Assign task: validate client exists
- Progress updates: CRUD operations
- RLS: unauthorized access blocked

### Task 8.2: Component Tests

**Files:** `src/components/tasks/*.test.tsx`

Test cases:

- Task form: validation, submission
- Task list: rendering, filtering
- Progress entry: file upload, percentage validation

### Task 8.3: Integration Tests

**Files:** `src/__tests__/tasks-integration.test.ts`

Test flows:

- Coach creates task → assigns to client → client updates progress
- Category filtering works correctly
- Real-time updates propagate

### Task 8.4: E2E Tests (Playwright)

**File:** `tests/tasks-flow.spec.ts`

Test scenarios:

- Complete user flow: create → assign → track progress
- Error scenarios: validation, unauthorized access

**Verification:**

- [ ] All tests pass
- [ ] Coverage > 80% for critical paths

---

## Phase 9: Deployment & Validation

### Task 9.1: Database Migration

- [ ] Apply migration to staging
- [ ] Verify all tables created
- [ ] Test RLS policies
- [ ] Apply migration to production

### Task 9.2: Type Safety Verification

- [ ] No `any` types in tasks module
- [ ] TypeScript build passes
- [ ] Supab types imported correctly

### Task 9.3: Manual Testing Checklist

**Coach Flow:**

- [ ] Create task with category
- [ ] Save task as template
- [ ] Assign task to client(s)
- [ ] Edit existing task
- [ ] View client progress
- [ ] Manage categories

**Client Flow:**

- [ ] View assigned tasks
- [ ] Filter by status
- [ ] Add progress update with notes
- [ ] Upload attachment to progress
- [ ] Mark task complete
- [ ] View progress history

### Task 9.4: Production Deployment

- [ ] Create PR from `feature/tasks-module` to `main`
- [ ] Code review approved
- [ ] CI/CD passes
- [ ] Merge to main
- [ ] Deploy to production
- [ ] Verify in production environment

---

## Success Criteria Verification

After all phases complete:

**Database:**

- [ ] All tables exist with correct schema
- [ ] Indexes created for performance
- [ ] RLS policies enforced
- [ ] Foreign keys validated

**API:**

- [ ] All 15+ endpoints implemented
- [ ] Validation works correctly
- [ ] Error responses standardized
- [ ] Status codes correct (200, 400, 403, 404)

**Frontend:**

- [ ] Coach can complete full task workflow
- [ ] Client can track progress end-to-end
- [ ] Real-time updates visible
- [ ] Responsive on mobile/desktop

**Quality:**

- [ ] Type safety: no stub types remain
- [ ] Tests passing: >80% coverage
- [ ] No console errors/warnings
- [ ] Performance: <1s page load

---

## Estimated Timeline

- **Phase 1:** 1-2 hours (migration + testing)
- **Phase 2:** 2-3 hours (types + services)
- **Phase 3:** 3-4 hours (API endpoints)
- **Phase 4:** 4-5 hours (coach components)
- **Phase 5:** 4-5 hours (client components)
- **Phase 6:** 2-3 hours (hooks + state)
- **Phase 7:** 2-3 hours (integration)
- **Phase 8:** 3-4 hours (testing)
- **Phase 9:** 1-2 hours (deployment)

**Total:** ~22-31 hours

---

## Roll-back Plan

If critical issues found:

1. Revert migration: `npx supabase db reset`
2. Delete worktree: `git worktree remove .worktrees/feature-tasks-module`
3. Switch to main: `git checkout main`
4. Investigate issues and create new worktree for fixes
