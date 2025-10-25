import { NextRequest } from 'next/server';
import { z } from 'zod';

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
import { TaskService } from '@/lib/services/task-service';

const log = createLogger({ context: 'api:tasks:assign' });

const paramsSchema = z.object({
  taskId: z.string().uuid('Invalid taskId parameter'),
});

const bulkAssignSchema = z.object({
  clientIds: z
    .array(z.string().uuid('Each clientId must be a valid UUID'))
    .min(1, 'At least one client must be selected'),
  dueDate: z
    .string()
    .datetime('dueDate must be a valid ISO 8601 datetime string'),
});

type AuthActor = { id: string; role: string };
type RouteContext = { params: Promise<{ taskId: string }> };

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
      log.warn('Failed to fetch user profile for task assign API', {
        error: profileError,
        feature: 'task-assign-api',
      });
    }

    return {
      actor: {
        id: session.user.id,
        role: profile?.role ?? 'client',
      },
    };
  } catch (error) {
    log.error('Task assign API authentication error', {
      error,
      feature: 'task-assign-api',
    });
    return { response: createUnauthorizedResponse() };
  }
}

export const POST = async (request: NextRequest, context: RouteContext) => {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    log.warn('Failed to parse bulk assign payload', {
      error,
      feature: 'task-assign-api',
    });
    return createErrorResponse('Invalid JSON body', HTTP_STATUS.BAD_REQUEST);
  }

  try {
    ensureNoSupabaseHttpUsage(body, { context: 'tasks.assign.body' });
  } catch (error) {
    if (error instanceof ForbiddenSupabaseHttpError) {
      return createErrorResponse(
        'Invalid payload received.',
        HTTP_STATUS.BAD_REQUEST
      );
    }
    throw error;
  }

  const parsed = validateRequestBody(bulkAssignSchema, body);

  if (!parsed.success) {
    return createErrorResponse(parsed.error, HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const supabase = createServerClient();
    const service = new TaskService(supabase);

    // Verify task exists and user has access
    const task = await supabase
      .from('tasks')
      .select('id, coach_id')
      .eq('id', taskId)
      .single();

    if (task.error) {
      log.warn('Task not found for assignment', {
        taskId,
        error: task.error,
        feature: 'task-assign-api',
      });
      return createErrorResponse('Task not found', HTTP_STATUS.NOT_FOUND);
    }

    if (actor.role === 'coach' && task.data.coach_id !== actor.id) {
      return createErrorResponse(
        'Access denied. You can only assign your own tasks',
        HTTP_STATUS.FORBIDDEN
      );
    }

    const result = await service.bulkAssignTask(
      taskId,
      parsed.data.clientIds,
      parsed.data.dueDate
    );

    return createSuccessResponse(
      result,
      'Task assigned successfully',
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    if (error instanceof Error) {
      log.error('Bulk assign error', {
        error: error.message,
        taskId,
        feature: 'task-assign-api',
      });
      return createErrorResponse(error.message, HTTP_STATUS.BAD_REQUEST);
    }
    log.error('Unexpected bulk assign error', {
      error,
      taskId,
      feature: 'task-assign-api',
    });
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};
