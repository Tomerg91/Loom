import { NextRequest } from 'next/server';

import {
  HTTP_STATUS,
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
} from '@/lib/api/utils';
import { createServerClient } from '@/lib/supabase/server';
import { createLogger } from '@/modules/platform/logging/logger';
import {
  ForbiddenSupabaseHttpError,
  ensureNoSupabaseHttpUsage,
} from '@/modules/platform/security';
import {
  TaskService,
  TaskServiceError,
} from '@/modules/sessions/server/task-service';
import type {
  SessionCreateTaskInput,
  SessionTaskListQueryInput,
} from '@/modules/sessions/types';
import { sessionCreateTaskSchema } from '@/modules/sessions/validators/task';
import { parseTaskListQueryParams } from '@/modules/tasks/api/query-helpers';

const taskService = new TaskService();
const log = createLogger({ context: 'api:tasks' });

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
      log.warn('Failed to fetch user profile for tasks API', {
        error: profileError,
        feature: 'tasks-api',
      });
    }

    return {
      actor: {
        id: session.user.id,
        role: profile?.role ?? 'client',
      },
    };
  } catch (error) {
    log.error('Task API authentication error', {
      error,
      feature: 'tasks-api',
    });
    return { response: createUnauthorizedResponse() };
  }
}

export const GET = async (request: NextRequest) => {
  ensureNoSupabaseHttpUsage(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
    { context: 'tasks.list.query' }
  );

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

  const normalizedFilters: SessionTaskListQueryInput = {
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
    log.error('Task list error', {
      error,
      feature: 'tasks-api',
    });
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
    log.warn('Failed to parse task creation payload', {
      error,
      feature: 'tasks-api',
    });
    return createErrorResponse('Invalid JSON body', HTTP_STATUS.BAD_REQUEST);
  }
  try {
    ensureNoSupabaseHttpUsage(body, { context: 'tasks.create.body' });
  } catch (error) {
    if (error instanceof ForbiddenSupabaseHttpError) {
      return createErrorResponse(
        'Invalid payload received.',
        HTTP_STATUS.BAD_REQUEST
      );
    }
    throw error;
  }
  const parsed = validateRequestBody(sessionCreateTaskSchema, body);

  if (!parsed.success) {
    return createErrorResponse(parsed.error, HTTP_STATUS.BAD_REQUEST);
  }

  const createPayload = parsed.data as SessionCreateTaskInput;

  if (actor.role === 'coach') {
    createPayload.coachId = actor.id;
  }

  try {
    const task = await taskService.createTask(
      { id: actor.id, role: actor.role as 'coach' | 'admin' | 'client' },
      createPayload
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
    log.error('Task creation error', {
      error,
      feature: 'tasks-api',
    });
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};
