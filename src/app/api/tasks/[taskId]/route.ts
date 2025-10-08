import { NextRequest } from 'next/server';
import { z } from 'zod';

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
import { updateTaskSchema } from '@/modules/tasks/types/task';

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
        'Failed to fetch user profile for task route:',
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
    console.error('Task item API authentication error:', error);
    return { response: createUnauthorizedResponse() };
  }
}

export const GET = async (_request: NextRequest, context: RouteContext) => {
  const authResult = await getAuthenticatedActor();
  if ('response' in authResult) {
    return authResult.response;
  }

  const { actor } = authResult;
  const { taskId } = paramsSchema.parse(await context.params);

  try {
    const task = await taskService.getTaskById(taskId, {
      id: actor.id,
      role: mapRole(actor.role),
    });
    return createSuccessResponse(task);
  } catch (error) {
    if (error instanceof TaskServiceError) {
      return createErrorResponse(error.message, error.status);
    }
    console.error('Task retrieval error:', error);
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};

export const PATCH = async (request: NextRequest, context: RouteContext) => {
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
  const body = await request.json();
  const parsed = validateRequestBody(updateTaskSchema, body);

  if (!parsed.success) {
    return createErrorResponse(parsed.error, HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const task = await taskService.updateTask(
      taskId,
      { id: actor.id, role: mapRole(actor.role) },
      parsed.data
    );
    return createSuccessResponse(task, 'Task updated successfully');
  } catch (error) {
    if (error instanceof TaskServiceError) {
      return createErrorResponse(error.message, error.status);
    }
    console.error('Task update error:', error);
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};
