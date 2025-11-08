import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  HTTP_STATUS,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api/utils';
import * as taskDb from '@/lib/database/tasks';
import { createServerClient } from '@/lib/supabase/server';
import { createLogger } from '@/modules/platform/logging/logger';

const log = createLogger({ context: 'api:tasks:assigned:instance' });

const paramsSchema = z.object({
  instanceId: z.string().uuid('Invalid instanceId parameter'),
});

type AuthActor = { id: string; role: string };
type RouteContext = { params: Promise<{ instanceId: string }> };

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
      log.warn('Failed to fetch user profile for task instance API', {
        error: profileError,
        feature: 'task-instance-api',
      });
    }

    return {
      actor: {
        id: session.user.id,
        role: profile?.role ?? 'client',
      },
    };
  } catch (error) {
    log.error('Task instance API authentication error', {
      error,
      feature: 'task-instance-api',
    });
    return { response: createUnauthorizedResponse() };
  }
}

export const GET = async (_request: NextRequest, context: RouteContext) => {
  const authResult = await getAuthenticatedActor();
  if ('response' in authResult) {
    return authResult.response;
  }

  const { actor } = authResult;
  const { instanceId } = paramsSchema.parse(await context.params);

  try {
    const supabase = createServerClient();
    const instance = await taskDb.getTaskInstanceById(supabase, instanceId);

    // Verify access - clients can only see their own instances
    if (actor.role === 'client' && instance.client_id !== actor.id) {
      return createErrorResponse(
        'Access denied. You can only view your own tasks',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // Coaches can only see instances for their tasks
    if (actor.role === 'coach') {
      const task = await supabase
        .from('tasks')
        .select('coach_id')
        .eq('id', instance.task_id)
        .single();

      if (task.error || task.data.coach_id !== actor.id) {
        return createErrorResponse(
          'Access denied. You can only view tasks you created',
          HTTP_STATUS.FORBIDDEN
        );
      }
    }

    return createSuccessResponse(instance);
  } catch (error) {
    log.error('Failed to fetch task instance', {
      error,
      instanceId,
      feature: 'task-instance-api',
    });

    if (
      error instanceof Error &&
      error.message.includes('No rows')
    ) {
      return createErrorResponse('Task instance not found', HTTP_STATUS.NOT_FOUND);
    }

    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};
