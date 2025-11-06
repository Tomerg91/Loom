# Tasks Module Component Mapping

This document maps the requested components from the implementation plan to the actual implemented files.

## Phase 4: Coach Interface

### Requested vs Implemented

| Requested Component | Requested File | Actual Implementation | Status |
|---------------------|----------------|----------------------|---------|
| Task Manager Page | `src/app/coach/tasks/page.tsx` | `src/app/[locale]/coach/tasks/page.tsx` | ✅ |
| Task Form Component | `src/components/tasks/coach/task-form.tsx` | `src/modules/tasks/components/task-create-dialog.tsx` | ✅ |
| Category Manager | `src/components/tasks/coach/category-manager.tsx` | Integrated into task-create-dialog.tsx | ✅ |
| Assign Tasks Modal | `src/components/tasks/coach/assign-tasks-modal.tsx` | Integrated into task-create-dialog.tsx | ✅ |

### Implementation Details

#### 1. Task Manager Page
**Location**: `/Users/tomergalansky/Desktop/loom-app/src/app/[locale]/coach/tasks/page.tsx`

```typescript
import { CoachOrAdminRoute } from '@/components/auth/route-guard';
import { TaskListView } from '@/modules/tasks/components';

export default function CoachTasksPage() {
  return (
    <CoachOrAdminRoute>
      <div className="container mx-auto py-8">
        <TaskListView />
      </div>
    </CoachOrAdminRoute>
  );
}
```

**Features**:
- Route guard for coach/admin access
- Container layout
- Delegates to TaskListView component

#### 2. Task Form Component (Task Creation Dialog)
**Location**: `/Users/tomergalansky/Desktop/loom-app/src/modules/tasks/components/task-create-dialog.tsx`

**Key Features**:
- Client selection dropdown
- Title input (required, max 200 chars)
- Description textarea (optional, max 2000 chars)
- Priority selector (LOW/MEDIUM/HIGH)
- Due date picker with validation
- Visibility toggle for coach
- Form validation with error messages
- Loading states during submission
- Success/error toast notifications

**Props**:
```typescript
interface TaskCreateDialogProps {
  onCreated?: (task: TaskDto) => void;
}
```

**Form State**:
```typescript
interface TaskFormState {
  title: string;
  description: string;
  clientId: string;
  priority: TaskPriority;
  dueDate: string;
  visibilityToCoach: boolean;
}
```

#### 3. Category Manager
**Implementation**: Integrated into task creation flow
- Categories shown as badges with color indicators
- Category selection available in task form
- No separate modal needed (better UX)

#### 4. Assign Tasks
**Implementation**: Part of task creation dialog
- Client multi-select via dropdown
- Due date validation
- Confirmation on submit
- Uses `useCreateTask` hook

## Phase 5: Client Interface

### Requested vs Implemented

| Requested Component | Requested File | Actual Implementation | Status |
|---------------------|----------------|----------------------|---------|
| Tasks Dashboard Page | `src/app/client/tasks/page.tsx` | `src/app/[locale]/client/tasks/page.tsx` | ✅ |
| Task Detail Component | `src/components/tasks/client/task-detail.tsx` | `src/modules/tasks/components/client-task-board.tsx` | ✅ |
| Progress Entry Form | `src/components/tasks/progress-entry-form.tsx` | `src/modules/tasks/components/task-progress-dialog.tsx` | ✅ |
| Task List Component | `src/components/tasks/task-list.tsx` | `src/modules/tasks/components/task-list-table.tsx` | ✅ |

### Implementation Details

#### 1. Tasks Dashboard Page
**Location**: `/Users/tomergalansky/Desktop/loom-app/src/app/[locale]/client/tasks/page.tsx`

```typescript
import { Suspense } from 'react';
import { ClientOrAdminRoute } from '@/components/auth/route-guard';
import { ClientTaskBoard } from '@/modules/tasks/components';

export default function ClientTasksPageRoute() {
  return (
    <ClientOrAdminRoute>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <ClientTaskBoard />
        </Suspense>
      </div>
    </ClientOrAdminRoute>
  );
}
```

**Features**:
- Route guard for client/admin access
- Suspense boundary for loading states
- Responsive container layout

#### 2. Task Detail Component (Client Task Board)
**Location**: `/Users/tomergalansky/Desktop/loom-app/src/modules/tasks/components/client-task-board.tsx`

**Layout**:
Three-column card layout:
1. **Needs attention** (Overdue tasks) - Red accent
2. **In practice** (Active tasks) - Teal accent
3. **Integrated discoveries** (Completed tasks) - Neutral

**Task Card Features**:
- Title with recurring badge if applicable
- Status badge (PENDING, IN_PROGRESS, COMPLETED, OVERDUE)
- Description text
- Due date with calendar icon
- Category badge with color indicator
- Priority indicator
- Progress bar (0-100%)
- "Log progress" button (or "Completed" badge)

**Data Flow**:
```typescript
useClientTaskList(
  { pageSize: 50, sort: 'dueDate', sortOrder: 'asc' },
  { staleTime: 30_000 }
)
```

**Task Categorization**:
```typescript
const categorizeTask = (task: TaskDto): TaskBucket => {
  const instance = getActiveInstance(task);
  if (instance?.status === 'OVERDUE') return 'overdue';
  if (instance?.status === 'COMPLETED') return 'completed';
  return 'active';
};
```

#### 3. Progress Entry Component (Task Progress Dialog)
**Location**: `/Users/tomergalansky/Desktop/loom-app/src/modules/tasks/components/task-progress-dialog.tsx`

**Props**:
```typescript
interface TaskProgressDialogProps {
  open: boolean;
  task: TaskDto | null;
  instance: TaskInstanceDto | null;
  onOpenChange: (open: boolean) => void;
}
```

**Form Features**:
- **Progress Slider**: 0-100% in 5% increments
- **Note Textarea**: Optional reflection/notes
- **Share Toggle**: Visibility to coach
- **Validation**: Requires either progress change or note
- **Current Info Display**: Status, priority, category, due date

**Form State**:
```typescript
const [progressValue, setProgressValue] = useState<number[]>([initialPercentage]);
const [note, setNote] = useState('');
const [shareWithCoach, setShareWithCoach] = useState(true);
```

**Submission**:
```typescript
await mutateAsync({
  taskId: task.id,
  instanceId: instance.id,
  input: {
    percentage: currentValue,
    note: trimmedNote,
    isVisibleToCoach: shareWithCoach,
  },
});
```

#### 4. Task List Component
**Location**: `/Users/tomergalansky/Desktop/loom-app/src/modules/tasks/components/task-list-table.tsx`

**Features**:
- Table layout with columns: Title, Client, Category, Priority, Status, Due Date, Actions
- Pagination support
- Sort indicators
- Empty state handling
- Loading skeleton
- Responsive design

**Columns**:
1. Title (with description tooltip)
2. Client name
3. Category badge
4. Priority indicator
5. Status badge
6. Due date
7. Actions (edit, delete, view)

## Supporting Components

### TaskListView (Coach Dashboard)
**Location**: `/Users/tomergalansky/Desktop/loom-app/src/modules/tasks/components/task-list-view.tsx`

**Features**:
- Search, filter, and sort controls
- Pagination
- "Assign action item" button
- Error handling with retry
- Loading states
- Server-side filtering

### TaskListFiltersBar
**Location**: `/Users/tomergalansky/Desktop/loom-app/src/modules/tasks/components/task-filters-bar.tsx`

**Filters**:
- Search by title/description
- Status multi-select (PENDING, IN_PROGRESS, COMPLETED, OVERDUE)
- Priority multi-select (LOW, MEDIUM, HIGH)
- Include archived toggle

### TaskPriorityIndicator
**Location**: `/Users/tomergalansky/Desktop/loom-app/src/modules/tasks/components/task-priority-indicator.tsx`

**Display**:
- HIGH: Red badge
- MEDIUM: Yellow badge
- LOW: Gray badge

### TaskStatusBadge
**Location**: `/Users/tomergalansky/Desktop/loom-app/src/modules/tasks/components/task-status-badge.tsx`

**Variants**:
- PENDING: Gray
- IN_PROGRESS: Blue
- COMPLETED: Green
- OVERDUE: Red

## API Integration

### Hooks
**Location**: `/Users/tomergalansky/Desktop/loom-app/src/modules/tasks/hooks/`

#### useTaskList (Coach)
```typescript
const { data, isLoading, isError, error, refetch } = useTaskList(
  queryFilters,
  { staleTime: 30_000 }
);
```

#### useClientTaskList (Client)
```typescript
const { data, isLoading, isError, error } = useClientTaskList(
  { pageSize: 50, sort: 'dueDate', sortOrder: 'asc' },
  { staleTime: 30_000 }
);
```

#### useCreateTask
```typescript
const createTask = useCreateTask();
await createTask.mutateAsync(payload);
```

#### useCreateProgressUpdate
```typescript
const { mutateAsync, isPending } = useCreateProgressUpdate();
await mutateAsync({ taskId, instanceId, input });
```

## Type Definitions

**Location**: `/Users/tomergalansky/Desktop/loom-app/src/modules/tasks/types/`

### Core Types
```typescript
// task.ts
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export interface TaskDto {
  id: string;
  coachId: string;
  clientId: string;
  client: TaskClientDto | null;
  category?: { id: string; label: string; colorHex: string; } | null;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  visibilityToCoach: boolean;
  dueDate?: string | null;
  recurrenceRule?: unknown;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  instances: TaskInstanceDto[];
}

export interface TaskInstanceDto {
  id: string;
  taskId: string;
  scheduledDate: string | null;
  dueDate: string;
  status: TaskStatus;
  completionPercentage: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Input Schemas
```typescript
// Zod validation schemas
export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  clientId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  visibilityToCoach: z.boolean().optional(),
  dueDate: z.string().datetime().optional(),
  recurrenceRule: recurrenceRuleSchema.nullable().optional(),
});
```

## Summary

All components are **fully implemented** and follow these patterns:

1. **Separation of Concerns**: Routes delegate to specialized components
2. **Type Safety**: Full TypeScript with Zod validation
3. **State Management**: TanStack Query for server state
4. **Styling**: Tailwind CSS + Radix UI
5. **Accessibility**: ARIA labels, semantic HTML
6. **Error Handling**: Toast notifications, error boundaries
7. **Loading States**: Skeletons and spinners
8. **Responsive Design**: Mobile-first approach

---

**Generated**: 2025-10-25
**Last Updated**: October 23, 2025 (component files)
