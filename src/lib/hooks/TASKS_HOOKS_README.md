# Tasks Module - Hooks & State Management

This document describes the state management implementation for the Tasks Module (Phase 6).

## Overview

The Tasks Module uses a combination of:
- **TanStack Query** for server state management
- **Zustand** for client-side filter state
- **Supabase Realtime** for real-time updates

## Files Created

### Query Hooks
**File**: `src/lib/hooks/use-tasks.ts`

Query hooks for fetching task data:
- `useCoachTasks(coachId, filters)` - Query tasks for a coach
- `useTaskTemplates(coachId)` - Query reusable task templates
- `useTaskById(taskId)` - Get single task details
- `useClientAssignedTasks(clientId, status?)` - Query assigned tasks for a client
- `useTaskInstance(instanceId)` - Get task instance with progress
- `useTaskCategories(coachId)` - Query task categories

**Features**:
- Proper cache keys for query invalidation
- Stale time: 30s for coach views, 15s for client views (more real-time)
- Automatic refetch on window focus
- TypeScript typing

### Mutation Hooks
**File**: `src/lib/hooks/use-tasks-mutations.ts`

Mutation hooks for modifying task data:
- `useCreateTask()` - Create new task
- `useUpdateTask()` - Update existing task
- `useDeleteTask()` - Delete task
- `useAssignTasks()` - Assign task to clients
- `useCreateCategory()` - Create task category
- `useUpdateCategory()` - Update task category
- `useDeleteCategory()` - Delete task category
- `useCreateProgress()` - Add progress update
- `useUpdateProgress()` - Update progress entry
- `useCompleteTask()` - Mark task as complete (with optimistic update)

**Features**:
- Automatic query invalidation on success
- Toast notifications (success/error)
- Optimistic updates for task completion
- Error handling and rollback

### Filter Store
**File**: `src/lib/stores/task-filter-store.ts`

Zustand store for managing task filters with persistence:

**State**:
- `statusFilter` - Filter by task status
- `priorityFilter` - Filter by priority
- `categoryFilter` - Filter by category
- `searchQuery` - Search text
- `sortBy` - Sort field (dueDate, createdAt, priority, status)
- `sortOrder` - Sort direction (asc, desc)
- `includeArchived` - Show archived tasks
- `dueDateFrom/To` - Date range filters

**Actions**:
- `setStatusFilter(status)` - Set status filter
- `setPriorityFilter(priority)` - Set priority filter
- `setCategoryFilter(categoryId)` - Set category filter
- `setSearchQuery(query)` - Set search text
- `setSortBy(field)` - Set sort field
- `setSortOrder(order)` - Set sort order
- `toggleSortOrder()` - Toggle asc/desc
- `setIncludeArchived(include)` - Toggle archived
- `setDateRange(from, to)` - Set date range
- `reset()` - Clear all filters

**Selectors** (for optimized re-renders):
- `useStatusFilter()`
- `usePriorityFilter()`
- `useCategoryFilter()`
- `useSearchQuery()`
- `useSortBy()`
- `useSortOrder()`
- `useIncludeArchived()`
- `useDateRange()`
- `useHasActiveFilters()` - Check if any filters active
- `useActiveFilterCount()` - Get count for badge

### Real-time Subscriptions
**File**: `src/lib/realtime/task-subscriptions.ts`

Low-level subscription functions:
- `subscribeToProgressUpdates(instanceId, callback)` - Subscribe to progress changes
- `subscribeToTaskAssignments(clientId, callback)` - Subscribe to new assignments
- `subscribeToTaskUpdates(coachId, callback)` - Subscribe to task changes
- `subscribeToInstanceStatusChanges(clientId, callback)` - Subscribe to status changes
- `isRealtimeConnected()` - Check connection status

**File**: `src/lib/hooks/use-task-subscriptions.ts`

React hooks for real-time subscriptions:
- `useProgressSubscription(instanceId, options)` - Auto-subscribe to progress
- `useTaskAssignmentSubscription(clientId, options)` - Auto-subscribe to assignments
- `useTaskUpdateSubscription(coachId, options)` - Auto-subscribe to task updates
- `useInstanceStatusSubscription(clientId, options)` - Auto-subscribe to status changes

**Features**:
- Automatic cleanup on unmount
- Connection status tracking
- Query invalidation integration
- Toast notifications for new assignments
- Custom callbacks support

## Usage Examples

### Fetch and Display Tasks (Coach)

```tsx
import { useCoachTasks } from '@/lib/hooks/use-tasks';
import { useTaskUpdateSubscription } from '@/lib/hooks/use-task-subscriptions';

function CoachTaskList({ coachId }: { coachId: string }) {
  // Fetch tasks
  const { data, isLoading, error } = useCoachTasks(coachId, {
    status: ['PENDING', 'IN_PROGRESS'],
    sort: 'dueDate',
    sortOrder: 'asc',
  });

  // Subscribe to real-time updates
  const { isConnected } = useTaskUpdateSubscription(coachId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {!isConnected && <ConnectionWarning />}
      {data?.data.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
```

### Create a Task

```tsx
import { useCreateTask } from '@/lib/hooks/use-tasks-mutations';

function CreateTaskForm() {
  const createTask = useCreateTask();

  const handleSubmit = async (formData) => {
    await createTask.mutateAsync({
      title: formData.title,
      description: formData.description,
      clientId: formData.clientId,
      priority: 'MEDIUM',
      dueDate: formData.dueDate,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={createTask.isPending}>
        {createTask.isPending ? 'Creating...' : 'Create Task'}
      </button>
    </form>
  );
}
```

### Assign Task to Clients

```tsx
import { useAssignTasks } from '@/lib/hooks/use-tasks-mutations';

function AssignTaskDialog({ taskId }: { taskId: string }) {
  const assignTasks = useAssignTasks();

  const handleAssign = async (clientIds: string[]) => {
    await assignTasks.mutateAsync({
      taskId,
      data: {
        clientIds,
        dueDate: new Date().toISOString(),
      },
    });
  };

  return (
    <Dialog>
      <ClientSelector onSubmit={handleAssign} />
    </Dialog>
  );
}
```

### Client View with Real-time

```tsx
import { useClientAssignedTasks } from '@/lib/hooks/use-tasks';
import { useTaskAssignmentSubscription } from '@/lib/hooks/use-task-subscriptions';

function ClientTaskBoard({ userId }: { userId: string }) {
  // Fetch assigned tasks
  const { data, isLoading } = useClientAssignedTasks(userId);

  // Subscribe to new assignments
  const { isConnected, newAssignmentCount, resetCount } =
    useTaskAssignmentSubscription(userId, {
      showNotifications: true,
    });

  // Reset count when user views tasks
  useEffect(() => {
    if (newAssignmentCount > 0) {
      resetCount();
    }
  }, [newAssignmentCount, resetCount]);

  return (
    <div>
      {newAssignmentCount > 0 && (
        <Badge>{newAssignmentCount} new tasks</Badge>
      )}

      <KanbanBoard
        pending={data?.byStatus.pending}
        inProgress={data?.byStatus.in_progress}
        completed={data?.byStatus.completed}
      />
    </div>
  );
}
```

### Task Progress with Real-time

```tsx
import { useTaskInstance } from '@/lib/hooks/use-tasks';
import { useCreateProgress, useCompleteTask } from '@/lib/hooks/use-tasks-mutations';
import { useProgressSubscription } from '@/lib/hooks/use-task-subscriptions';

function TaskDetailPage({ instanceId }: { instanceId: string }) {
  const { data: instance } = useTaskInstance(instanceId);
  const createProgress = useCreateProgress();
  const completeTask = useCompleteTask();

  // Subscribe to real-time progress updates
  useProgressSubscription(instanceId, {
    onUpdate: (progress) => {
      console.log('Progress updated:', progress.completionPercentage);
    },
  });

  const handleAddProgress = async (notes: string, percentage: number) => {
    await createProgress.mutateAsync({
      instanceId,
      data: { notes, completionPercentage: percentage },
    });
  };

  const handleComplete = async () => {
    await completeTask.mutateAsync(instanceId);
  };

  return (
    <div>
      <TaskHeader task={instance?.task} />
      <ProgressBar percentage={instance?.completionPercentage} />
      <ProgressForm onSubmit={handleAddProgress} />
      <Button onClick={handleComplete}>Mark Complete</Button>
    </div>
  );
}
```

### Using Filters

```tsx
import { useTaskFilterStore } from '@/lib/stores/task-filter-store';
import { useCoachTasks } from '@/lib/hooks/use-tasks';

function TaskListWithFilters({ coachId }: { coachId: string }) {
  const {
    statusFilter,
    priorityFilter,
    searchQuery,
    sortBy,
    sortOrder,
    setStatusFilter,
    reset,
  } = useTaskFilterStore();

  // Build query from filter state
  const { data } = useCoachTasks(coachId, {
    status: statusFilter !== 'all' ? [statusFilter] : undefined,
    priority: priorityFilter !== 'all' ? [priorityFilter] : undefined,
    search: searchQuery || undefined,
    sort: sortBy,
    sortOrder,
  });

  return (
    <div>
      <FilterBar
        status={statusFilter}
        onStatusChange={setStatusFilter}
      />
      <Button onClick={reset}>Clear Filters</Button>
      <TaskList tasks={data?.data} />
    </div>
  );
}
```

## Integration with API Endpoints

All hooks integrate with the following API routes:

- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:taskId` - Get task
- `PUT /api/tasks/:taskId` - Update task
- `DELETE /api/tasks/:taskId` - Delete task
- `POST /api/tasks/:taskId/assign` - Assign task
- `GET /api/tasks/assigned` - Get assigned tasks
- `GET /api/tasks/assigned/:instanceId` - Get instance
- `POST /api/tasks/assigned/:instanceId/progress` - Create progress
- `PUT /api/tasks/assigned/:instanceId/progress/:updateId` - Update progress
- `PATCH /api/tasks/assigned/:instanceId/complete` - Complete task
- `GET /api/task-categories` - List categories
- `POST /api/task-categories` - Create category
- `PUT /api/task-categories/:categoryId` - Update category
- `DELETE /api/task-categories/:categoryId` - Delete category

## Real-time Database Tables

Subscriptions monitor these Supabase tables:
- `tasks` - Task definitions
- `task_instances` - Task assignments to clients
- `task_progress_updates` - Progress updates

## Best Practices

1. **Use query keys properly**: Always use the `taskKeys` factory for consistent cache management
2. **Handle loading states**: Check `isLoading` and `isPending` states
3. **Handle errors**: Display error messages to users
4. **Clean up subscriptions**: Hooks handle cleanup automatically in useEffect
5. **Optimistic updates**: Use for better UX (implemented in `useCompleteTask`)
6. **Toast notifications**: Already integrated in mutation hooks
7. **Connection status**: Display connection indicators when needed

## Next Steps (Phase 7)

The next phase will implement UI components that use these hooks:
- Task list components
- Task creation/edit forms
- Progress tracking UI
- Kanban boards
- Filter controls
