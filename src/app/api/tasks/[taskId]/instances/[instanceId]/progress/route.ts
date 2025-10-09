import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  HTTP_STATUS,
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
} from '@/lib/api/utils';
import { createClient } from '@/lib/supabase/server';
import {
  ProgressService,
  ProgressServiceError,
} from '@/modules/tasks/services/progress-service';
import { createProgressUpdateSchema } from '@/modules/tasks/types/progress';

const progressService = new ProgressService();

const paramsSchema = z.object({
  taskId: z.string().uuid('Invalid taskId parameter'),
  instanceId: z.string().uuid('Invalid instanceId parameter'),
});

type TaskActorRole = 'coach' | 'admin' | 'client';

type AuthActor = { id: string; role: string };

type RouteContext = { params: Promise<{ taskId: string; instanceId: string }> };

const mapRole = (role: string): TaskActorRole => {
  if (role === 'coach' || role === 'admin' || role === 'client') {
    return role;
  }
  return 'client';
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
    const supabase = createClient();
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
        'Failed to fetch user profile for progress API:',
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
    console.error('Progress API authentication error:', error);
    return { response: createUnauthorizedResponse() };
  }
}

export const POST = async (request: NextRequest, context: RouteContext) => {
  const authResult = await getAuthenticatedActor();
  if ('response' in authResult) {
    return authResult.response;
  }

  const { actor } = authResult;
  const { taskId, instanceId } = paramsSchema.parse(await context.params);

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    console.warn('Failed to parse progress update payload:', error);
    return createErrorResponse('Invalid JSON body', HTTP_STATUS.BAD_REQUEST);
  }

  const parsed = validateRequestBody(createProgressUpdateSchema, body);

  if (!parsed.success) {
    return createErrorResponse(parsed.error, HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const progress = await progressService.createProgressUpdate(
      { id: actor.id, role: mapRole(actor.role) },
      {
        taskId,
        taskInstanceId: instanceId,
        input: parsed.data,
      }
    );

    return createSuccessResponse(
      progress,
      'Progress update recorded successfully',
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    if (error instanceof ProgressServiceError) {
      return createErrorResponse(error.message, error.status);
    }

    console.error('Progress update error:', error);
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};
