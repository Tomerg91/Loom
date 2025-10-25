import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  HTTP_STATUS,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api/utils';
import { createServerClient } from '@/lib/supabase/server';
import * as taskDb from '@/lib/database/tasks';
import { createLogger } from '@/modules/platform/logging/logger';

const log = createLogger({ context: 'api:tasks:complete' });

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
      log.warn('Failed to fetch user profile for task complete API', {
        error: profileError,
        feature: 'task-complete-api',
      });
    }

    return {
      actor: {
        id: session.user.id,
        role: profile?.role ?? 'client',
      },
    };
  } catch (error) {
    log.error('Task complete API authentication error', {
      error,
      feature: 'task-complete-api',
    });
    return { response: createUnauthorizedResponse() };
  }
}

export const PATCH = async (_request: NextRequest, context: RouteContext) => {
  const authResult = await getAuthenticatedActor();
  if ('response' in authResult) {
    return authResult.response;
  }

  const { actor } = authResult;
  const { instanceId } = paramsSchema.parse(await context.params);

  try {
    const supabase = createServerClient();

    // Verify instance exists and user has access
    const instance = await supabase
      .from('task_instances')
      .select('id, client_id, status')
      .eq('id', instanceId)
      .single();

    if (instance.error) {
      log.warn('Task instance not found for completion', {
        instanceId,
        error: instance.error,
        feature: 'task-complete-api',
      });
      return createErrorResponse(
        'Task instance not found',
        HTTP_STATUS.NOT_FOUND
      );
    }

    // Only the assigned client can complete their task
    if (instance.data.client_id !== actor.id) {
      return createErrorResponse(
        'Access denied. You can only complete your own tasks',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // Check if already completed
    if (instance.data.status === 'completed') {
      return createErrorResponse(
        'Task is already completed',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const completed = await taskDb.completeTaskInstance(supabase, instanceId);

    return createSuccessResponse(completed, 'Task marked as completed successfully');
  } catch (error) {
    log.error('Failed to complete task', {
      error,
      instanceId,
      feature: 'task-complete-api',
    });
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};
