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
import { parseTaskListQueryParams } from '@/modules/tasks/api/query-helpers';
import {
  createTaskSchema,
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

  const parsedQuery = parseTaskListQueryParams(request.nextUrl.searchParams);

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

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    console.warn('Failed to parse task creation payload:', error);
    return createErrorResponse('Invalid JSON body', HTTP_STATUS.BAD_REQUEST);
  }
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
