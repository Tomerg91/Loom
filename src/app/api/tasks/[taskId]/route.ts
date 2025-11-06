import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createAuthenticatedSupabaseClient, propagateCookies } from '@/lib/api/auth-client';
import {
  HTTP_STATUS,
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
} from '@/lib/api/utils';
import {
  TaskService,
  TaskServiceError,
} from '@/modules/sessions/server/task-service';
import type { SessionUpdateTaskInput } from '@/modules/sessions/types';
import { sessionUpdateTaskSchema } from '@/modules/sessions/validators/task';
import { logger } from '@/lib/logger';

const taskService = new TaskService();

const paramsSchema = z.object({
  taskId: z.string().uuid('Invalid taskId parameter'),
});

type TaskActorRole = 'coach' | 'admin' | 'client';

function mapRole(role: string): TaskActorRole {
  if (role === 'coach' || role === 'admin' || role === 'client') {
    return role;
  }
  return 'client';
}

type RouteContext = {
  params: Promise<{ taskId: string }>;
};

type AuthActor = { id: string; role: string };

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
      logger.warn(
        'Failed to fetch user profile for task route:',
        profileError.message
      );
    }

    return {
      actor: {
        id: session.user.id,
        role: profile?.role ?? 'client',
      },
      authResponse,
    };
  } catch (error) {
    logger.error('Task item API authentication error:', error);
    return { response: createUnauthorizedResponse() };
  }
}

export const GET = async (request: NextRequest, context: RouteContext) => {
  const authResult = await getAuthenticatedActor(request);
  if ('response' in authResult) {
    return authResult.response;
  }

  const { actor, authResponse } = authResult;
  const { taskId } = paramsSchema.parse(await context.params);

  try {
    const task = await taskService.getTaskById(taskId, {
      id: actor.id,
      role: mapRole(actor.role),
    });
    const successResponse = createSuccessResponse(task);
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    if (error instanceof TaskServiceError) {
      const errorResponse = createErrorResponse(error.message, error.status);
      return propagateCookies(authResponse, errorResponse);
    }
    logger.error('Task retrieval error:', error);
    const errorResponse = createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
    return propagateCookies(authResponse, errorResponse);
  }
};

export const PATCH = async (request: NextRequest, context: RouteContext) => {
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

  const { taskId } = paramsSchema.parse(await context.params);
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    logger.warn('Failed to parse task update payload:', error);
    const errorResponse = createErrorResponse('Invalid JSON body', HTTP_STATUS.BAD_REQUEST);
    return propagateCookies(authResponse, errorResponse);
  }
  const parsed = validateRequestBody(sessionUpdateTaskSchema, body);

  if (!parsed.success) {
    const errorResponse = createErrorResponse(parsed.error, HTTP_STATUS.BAD_REQUEST);
    return propagateCookies(authResponse, errorResponse);
  }

  try {
    const updatePayload = parsed.data as SessionUpdateTaskInput;

    const task = await taskService.updateTask(
      taskId,
      { id: actor.id, role: mapRole(actor.role) },
      updatePayload
    );
    const successResponse = createSuccessResponse(task, 'Task updated successfully');
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    if (error instanceof TaskServiceError) {
      const errorResponse = createErrorResponse(error.message, error.status);
      return propagateCookies(authResponse, errorResponse);
    }
    logger.error('Task update error:', error);
    const errorResponse = createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
    return propagateCookies(authResponse, errorResponse);
  }
};

export const DELETE = async (_request: NextRequest, context: RouteContext) => {
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

  const { taskId } = paramsSchema.parse(await context.params);

  try {
    await taskService.deleteTask(taskId, {
      id: actor.id,
      role: mapRole(actor.role),
    });
    return createSuccessResponse(null, 'Task deleted successfully');
  } catch (error) {
    if (error instanceof TaskServiceError) {
      return createErrorResponse(error.message, error.status);
    }
    logger.error('Task deletion error:', error);
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};
