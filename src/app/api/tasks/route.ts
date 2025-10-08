import { NextRequest } from 'next/server';

import {
  HTTP_STATUS,
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
} from '@/lib/api/utils';
import { createServerClient } from '@/lib/supabase/server';
import {
  TaskService,
  TaskServiceError,
} from '@/modules/tasks/services/task-service';
import {
  createTaskSchema,
  taskListQuerySchema,
  type TaskListQueryInput,
} from '@/modules/tasks/types/task';

const taskService = new TaskService();

type AuthActor = {
  id: string;
  role: string;
};

const createUnauthorizedResponse = () =>
  createErrorResponse(
    'Authentication required. Please sign in again.',
    HTTP_STATUS.UNAUTHORIZED
  );

async function getAuthenticatedActor(): Promise<
  { actor: AuthActor } | { response: Response }
> {
  try {
    const supabase = createServerClient();
    const { data: session, error } = await supabase.auth.getUser();

    if (error || !session?.user) {
      return { response: createUnauthorizedResponse() };
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.warn(
        'Failed to fetch user profile for tasks API:',
        profileError.message
      );
    }

    return {
      actor: {
        id: session.user.id,
        role: profile?.role ?? 'client',
      },
    };
  } catch (error) {
    console.error('Task API authentication error:', error);
    return { response: createUnauthorizedResponse() };
  }
}

export const GET = async (request: NextRequest) => {
  const authResult = await getAuthenticatedActor();
  if ('response' in authResult) {
    return authResult.response;
  }

  const { actor } = authResult;

  if (actor.role !== 'coach' && actor.role !== 'admin') {
    return createErrorResponse(
      'Access denied. Required role: coach',
      HTTP_STATUS.FORBIDDEN
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const statusParams = searchParams.getAll('status').filter(Boolean);
  const priorityParams = searchParams.getAll('priority').filter(Boolean);

  const rawQuery = {
    coachId: searchParams.get('coachId') || undefined,
    clientId: searchParams.get('clientId') || undefined,
    categoryId: searchParams.get('categoryId') || undefined,
    status: statusParams.length ? statusParams : undefined,
    priority: priorityParams.length ? priorityParams : undefined,
    includeArchived: searchParams.get('includeArchived') || undefined,
    search: searchParams.get('search') || undefined,
    dueDateFrom: searchParams.get('dueDateFrom') || undefined,
    dueDateTo: searchParams.get('dueDateTo') || undefined,
    sort: searchParams.get('sort') || undefined,
    sortOrder: searchParams.get('sortOrder') || undefined,
    page: searchParams.get('page') || undefined,
    pageSize: searchParams.get('pageSize') || undefined,
  };

  const parsedQuery = taskListQuerySchema.safeParse(rawQuery);

  if (!parsedQuery.success) {
    return createErrorResponse('Validation failed', HTTP_STATUS.BAD_REQUEST);
  }

  const normalizedFilters: TaskListQueryInput = {
    ...parsedQuery.data,
    coachId: actor.role === 'coach' ? actor.id : parsedQuery.data.coachId,
  };

  try {
    const result = await taskService.listTasks(
      { id: actor.id, role: actor.role as 'coach' | 'admin' | 'client' },
      normalizedFilters
    );

    return createSuccessResponse(result);
  } catch (error) {
    if (error instanceof TaskServiceError) {
      return createErrorResponse(error.message, error.status);
    }
    console.error('Task list error:', error);
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};

export const POST = async (request: NextRequest) => {
  const authResult = await getAuthenticatedActor();
  if ('response' in authResult) {
    return authResult.response;
  }

  const { actor } = authResult;

  if (actor.role !== 'coach' && actor.role !== 'admin') {
    return createErrorResponse(
      'Access denied. Required role: coach',
      HTTP_STATUS.FORBIDDEN
    );
  }

  const body = await request.json();
  const parsed = validateRequestBody(createTaskSchema, body);

  if (!parsed.success) {
    return createErrorResponse(parsed.error, HTTP_STATUS.BAD_REQUEST);
  }

  const payload = {
    ...parsed.data,
    coachId: actor.role === 'coach' ? actor.id : parsed.data.coachId,
  };

  try {
    const task = await taskService.createTask(
      { id: actor.id, role: actor.role as 'coach' | 'admin' | 'client' },
      payload
    );

    return createSuccessResponse(
      task,
      'Task created successfully',
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    if (error instanceof TaskServiceError) {
      return createErrorResponse(error.message, error.status);
    }
    console.error('Task creation error:', error);
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};
