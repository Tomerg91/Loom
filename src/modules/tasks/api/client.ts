import type {
  CreateProgressUpdateInput,
  ProgressUpdateDto,
} from '../types/progress';
import type {
  CreateTaskInput,
  TaskDto,
  TaskListResponse,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from '../types/task';

export type TaskListFilters = Partial<{
  coachId: string;
  clientId: string;
  categoryId: string;
  status: TaskStatus[];
  priority: TaskPriority[];
  includeArchived: boolean;
  search: string;
  dueDateFrom: string | Date;
  dueDateTo: string | Date;
  sort: 'dueDate' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}>;

interface TaskApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

interface TaskApiFailure {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

const isTaskApiSuccess = <T>(payload: unknown): payload is TaskApiSuccess<T> =>
  typeof payload === 'object' &&
  payload !== null &&
  'success' in payload &&
  (payload as { success: unknown }).success === true;

const isTaskApiFailure = (payload: unknown): payload is TaskApiFailure =>
  typeof payload === 'object' &&
  payload !== null &&
  'success' in payload &&
  (payload as { success: unknown }).success === false;

export class TaskApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'TaskApiError';
  }
}

const ensureIsoString = (
  value: string | Date | undefined
): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  return value.toISOString();
};

export const buildTaskListQuery = (filters: TaskListFilters = {}): string => {
  const params = new URLSearchParams();

  const append = (
    key: string,
    value: string | number | boolean | undefined
  ) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    params.append(key, String(value));
  };

  append('coachId', filters.coachId);
  append('clientId', filters.clientId);
  append('categoryId', filters.categoryId);

  const sortedStatus = filters.status ? [...filters.status].sort() : undefined;
  sortedStatus?.forEach(status => append('status', status));

  const sortedPriority = filters.priority
    ? [...filters.priority].sort()
    : undefined;
  sortedPriority?.forEach(priority => append('priority', priority));

  if (typeof filters.includeArchived === 'boolean') {
    append('includeArchived', filters.includeArchived);
  }

  append('search', filters.search);
  append('dueDateFrom', ensureIsoString(filters.dueDateFrom));
  append('dueDateTo', ensureIsoString(filters.dueDateTo));
  append('sort', filters.sort);
  append('sortOrder', filters.sortOrder);
  append('page', filters.page);
  append('pageSize', filters.pageSize);

  return params.toString();
};

async function parseTaskResponse<T>(response: Response): Promise<T> {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch (_error) {
    if (response.status === 204) {
      return undefined as T;
    }
    throw new TaskApiError(
      'Unable to parse server response',
      response.status,
      'INVALID_RESPONSE_FORMAT'
    );
  }

  if (isTaskApiFailure(payload)) {
    throw new TaskApiError(
      payload.error,
      response.status,
      payload.code,
      payload.details
    );
  }

  if (!response.ok) {
    throw new TaskApiError(
      response.statusText || 'Request failed',
      response.status
    );
  }

  if (isTaskApiSuccess<T>(payload)) {
    return payload.data;
  }

  throw new TaskApiError(
    'Unexpected response format from tasks API',
    response.status,
    'UNEXPECTED_RESPONSE'
  );
}

async function taskRequest<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  return parseTaskResponse<T>(response);
}

export const fetchTaskList = async (
  filters: TaskListFilters = {}
): Promise<TaskListResponse> => {
  const query = buildTaskListQuery(filters);
  const url = query ? `/api/tasks?${query}` : '/api/tasks';
  return taskRequest<TaskListResponse>(url);
};

export const fetchClientTaskList = async (
  filters: TaskListFilters = {}
): Promise<TaskListResponse> => {
  const query = buildTaskListQuery(filters);
  const url = query ? `/api/client/tasks?${query}` : '/api/client/tasks';
  return taskRequest<TaskListResponse>(url);
};

export const fetchTask = async (taskId: string): Promise<TaskDto> => {
  if (!taskId) {
    throw new TaskApiError('Task ID is required', 400, 'TASK_ID_REQUIRED');
  }
  return taskRequest<TaskDto>(`/api/tasks/${taskId}`);
};

export const createTask = async (input: CreateTaskInput): Promise<TaskDto> => {
  return taskRequest<TaskDto>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  });
};

export const updateTask = async (
  taskId: string,
  input: UpdateTaskInput
): Promise<TaskDto> => {
  if (!taskId) {
    throw new TaskApiError('Task ID is required', 400, 'TASK_ID_REQUIRED');
  }

  return taskRequest<TaskDto>(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
};

export const createProgressUpdate = async ({
  taskId,
  instanceId,
  input,
}: {
  taskId: string;
  instanceId: string;
  input: CreateProgressUpdateInput;
}): Promise<ProgressUpdateDto> => {
  if (!taskId || !instanceId) {
    throw new TaskApiError(
      'Task ID and instance ID are required',
      400,
      'INSTANCE_ID_REQUIRED'
    );
  }

  return taskRequest<ProgressUpdateDto>(
    `/api/tasks/${taskId}/instances/${instanceId}/progress`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  );
};
