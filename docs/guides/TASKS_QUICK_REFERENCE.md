# Tasks Module - Quick Reference Guide

## For Developers

### Accessing Task Pages

**Coach View**: Navigate to `/coach/tasks` (or `/en/coach/tasks` with locale)
**Client View**: Navigate to `/client/tasks` (or `/en/client/tasks` with locale)

### Creating a New Task (Coach)

```typescript
import { useCreateTask } from '@/modules/tasks/hooks';

const createTask = useCreateTask();

await createTask.mutateAsync({
  title: "Practice grounding exercise",
  description: "Focus on body sensations for 10 minutes daily",
  clientId: "uuid-of-client",
  priority: "MEDIUM",
  dueDate: "2025-11-01T12:00:00Z",
  visibilityToCoach: true,
});
```

### Fetching Tasks (Coach)

```typescript
import { useTaskList } from '@/modules/tasks/hooks';

const { data, isLoading } = useTaskList({
  status: ['PENDING', 'IN_PROGRESS'],
  priority: ['HIGH'],
  search: 'grounding',
  page: 1,
  pageSize: 20,
});

const tasks = data?.data ?? [];
```

### Fetching Tasks (Client)

```typescript
import { useClientTaskList } from '@/modules/tasks/hooks';

const { data, isLoading } = useClientTaskList({
  pageSize: 50,
  sort: 'dueDate',
  sortOrder: 'asc',
});

const tasks = data?.data ?? [];
```

### Logging Progress (Client)

```typescript
import { useCreateProgressUpdate } from '@/modules/tasks/hooks';

const { mutateAsync } = useCreateProgressUpdate();

await mutateAsync({
  taskId: "task-uuid",
  instanceId: "instance-uuid",
  input: {
    percentage: 75,
    note: "Felt more grounded today. Noticed tension release in shoulders.",
    isVisibleToCoach: true,
  },
});
```

## Component Import Paths

```typescript
// Main page components
import { TaskListView } from '@/modules/tasks/components';
import { ClientTaskBoard } from '@/modules/tasks/components';

// Dialog components
import { TaskCreateDialog } from '@/modules/tasks/components';
import { TaskProgressDialog } from '@/modules/tasks/components';

// UI components
import { TaskPriorityIndicator } from '@/modules/tasks/components';
import { TaskStatusBadge } from '@/modules/tasks/components';
import { TaskListTable } from '@/modules/tasks/components';
import { TaskListFiltersBar } from '@/modules/tasks/components';
```

## Type Imports

```typescript
import type {
  TaskDto,
  TaskInstanceDto,
  TaskPriority,
  TaskStatus,
  CreateTaskInput,
  UpdateTaskInput,
  TaskListQueryInput,
} from '@/modules/tasks/types';

import type {
  CreateProgressUpdateInput,
  ProgressUpdateDto,
} from '@/modules/tasks/types';
```

## Task Status Values

```typescript
type TaskStatus = 
  | 'PENDING'     // Not started
  | 'IN_PROGRESS' // Actively working on
  | 'COMPLETED'   // Finished
  | 'OVERDUE';    // Past due date
```

## Task Priority Values

```typescript
type TaskPriority = 
  | 'LOW'    // Nice to have
  | 'MEDIUM' // Important (default)
  | 'HIGH';  // Urgent
```

## Common Patterns

### Using TaskCreateDialog

```typescript
<TaskCreateDialog 
  onCreated={(task) => {
    console.log('Task created:', task.id);
    // Optionally refetch or navigate
  }} 
/>
```

### Using TaskProgressDialog

```typescript
const [open, setOpen] = useState(false);
const [selectedTask, setSelectedTask] = useState<TaskDto | null>(null);
const [selectedInstance, setSelectedInstance] = useState<TaskInstanceDto | null>(null);

<TaskProgressDialog
  open={open}
  onOpenChange={setOpen}
  task={selectedTask}
  instance={selectedInstance}
/>
```

### Filtering Tasks

```typescript
const [filters, setFilters] = useState({
  search: '',
  status: ['PENDING', 'IN_PROGRESS'],
  priority: [],
  includeArchived: false,
  page: 1,
  pageSize: 20,
});

<TaskListFiltersBar 
  filters={filters}
  onChange={setFilters}
  isDisabled={isLoading}
/>
```

## Styling Classes

Tasks use the standard Tailwind + Radix UI design system:

```typescript
// Priority colors
HIGH:   'text-red-600 bg-red-100'
MEDIUM: 'text-yellow-600 bg-yellow-100'
LOW:    'text-gray-600 bg-gray-100'

// Status colors
PENDING:     'text-gray-600 bg-gray-100'
IN_PROGRESS: 'text-blue-600 bg-blue-100'
COMPLETED:   'text-green-600 bg-green-100'
OVERDUE:     'text-red-600 bg-red-100'
```

## Testing Utilities

```typescript
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

test('renders task list', () => {
  render(<TaskListView />, { wrapper });
  expect(screen.getByText('Action Items & Homework')).toBeInTheDocument();
});
```

## API Routes

```
Coach endpoints:
  GET    /api/tasks
  POST   /api/tasks
  GET    /api/tasks/:id
  PATCH  /api/tasks/:id
  DELETE /api/tasks/:id

Client endpoints:
  GET  /api/tasks/client
  POST /api/tasks/:taskId/instances/:instanceId/progress
  GET  /api/tasks/:taskId/instances/:instanceId/progress
```

## Environment Variables

No special environment variables needed. Uses existing Supabase configuration.

## Database Tables

```
tasks                  - Main task records
task_instances         - Individual occurrences of tasks
task_progress_updates  - Progress logs from clients
task_categories        - Optional categorization
```

## Common Issues

### Task not appearing in client view
- Check that `clientId` matches the logged-in user
- Verify task status is not `COMPLETED` if filtering
- Check `visibilityToCoach` setting

### Progress update failing
- Ensure `instanceId` is valid
- Check that instance status is not already `COMPLETED`
- Verify user has permission (client must own the task)

### Form validation errors
- Title: required, max 200 chars
- Description: optional, max 2000 chars
- Due date: must be future date (if provided)
- Client: required, must be valid UUID

## Performance Tips

1. Use pagination for large lists (default: 20 items/page)
2. Enable `staleTime` on queries (default: 30 seconds)
3. Debounce search inputs (implemented: 300ms)
4. Use optimistic updates for better UX
5. Implement virtual scrolling for 500+ items

## Accessibility Checklist

- [x] ARIA labels on all interactive elements
- [x] Semantic HTML (button, form, label)
- [x] Keyboard navigation support
- [x] Focus management in modals
- [x] Screen reader announcements
- [x] Color contrast ratios meet WCAG AA
- [x] Touch targets min 44x44px

## Browser Support

- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+
- iOS Safari: 14+
- Android Chrome: 90+

## License & Credits

Part of the Loom coaching platform.
Built with Next.js 15, React 19, TypeScript, Tailwind CSS, and Radix UI.

---

**Last Updated**: 2025-10-25
**Version**: 1.0.0
