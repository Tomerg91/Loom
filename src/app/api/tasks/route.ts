import { NextRequest, NextResponse } from 'next/server';

import { createAuthenticatedSupabaseClient, propagateCookies } from '@/lib/api/auth-client';
import {
  HTTP_STATUS,
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
} from '@/lib/api/utils';
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

async function getAuthenticatedActor(
  request: NextRequest
): Promise<
  { actor: AuthActor; authResponse: NextResponse } | { response: Response }
> {
  try {
    const { client: supabase, response: authResponse } = createAuthenticatedSupabaseClient(
      request,
      new NextResponse()
    );

    const { data: session, error } = await supabase.auth.getUser();

    if (error || !session?.user) {
      const errorResponse = createUnauthorizedResponse();
      return { response: propagateCookies(authResponse, errorResponse) };
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
      authResponse,
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

  const authResult = await getAuthenticatedActor(request);
  if ('response' in authResult) {
    return authResult.response;
  }

  const { actor, authResponse } = authResult;

  if (actor.role !== 'coach' && actor.role !== 'admin') {
    const errorResponse = createErrorResponse(
      'Access denied. Required role: coach',
      HTTP_STATUS.FORBIDDEN
    );
    return propagateCookies(authResponse, errorResponse);
  }

  const parsedQuery = parseTaskListQueryParams(request.nextUrl.searchParams);

  if (!parsedQuery.success) {
    const errorResponse = createErrorResponse('Validation failed', HTTP_STATUS.BAD_REQUEST);
    return propagateCookies(authResponse, errorResponse);
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

    const successResponse = createSuccessResponse(result);
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    if (error instanceof TaskServiceError) {
      const errorResponse = createErrorResponse(error.message, error.status);
      return propagateCookies(authResponse, errorResponse);
    }
    log.error('Task list error', {
      error,
      feature: 'tasks-api',
    });
    const errorResponse = createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
    return propagateCookies(authResponse, errorResponse);
  }
};

export const POST = async (request: NextRequest) => {
  const authResult = await getAuthenticatedActor(request);
  if ('response' in authResult) {
    return authResult.response;
  }

  const { actor, authResponse } = authResult;

  if (actor.role !== 'coach' && actor.role !== 'admin') {
    const errorResponse = createErrorResponse(
      'Access denied. Required role: coach',
      HTTP_STATUS.FORBIDDEN
    );
    return propagateCookies(authResponse, errorResponse);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    log.warn('Failed to parse task creation payload', {
      error,
      feature: 'tasks-api',
    });
    const errorResponse = createErrorResponse('Invalid JSON body', HTTP_STATUS.BAD_REQUEST);
    return propagateCookies(authResponse, errorResponse);
  }
  try {
    ensureNoSupabaseHttpUsage(body, { context: 'tasks.create.body' });
  } catch (error) {
    if (error instanceof ForbiddenSupabaseHttpError) {
      const errorResponse = createErrorResponse(
        'Invalid payload received.',
        HTTP_STATUS.BAD_REQUEST
      );
      return propagateCookies(authResponse, errorResponse);
    }
    throw error;
  }
  const parsed = validateRequestBody(sessionCreateTaskSchema, body);

  if (!parsed.success) {
    const errorResponse = createErrorResponse(parsed.error, HTTP_STATUS.BAD_REQUEST);
    return propagateCookies(authResponse, errorResponse);
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

    const successResponse = createSuccessResponse(
      task,
      'Task created successfully',
      HTTP_STATUS.CREATED
    );
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    if (error instanceof TaskServiceError) {
      const errorResponse = createErrorResponse(error.message, error.status);
      return propagateCookies(authResponse, errorResponse);
    }
    log.error('Task creation error', {
      error,
      feature: 'tasks-api',
    });
    const errorResponse = createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
    return propagateCookies(authResponse, errorResponse);
  }
};
