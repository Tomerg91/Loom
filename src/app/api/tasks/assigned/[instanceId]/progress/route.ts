import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  HTTP_STATUS,
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
} from '@/lib/api/utils';
import { TaskService } from '@/lib/services/task-service';
import { createServerClient } from '@/lib/supabase/server';
import { createLogger } from '@/modules/platform/logging/logger';
import {
  ForbiddenSupabaseHttpError,
  ensureNoSupabaseHttpUsage,
} from '@/modules/platform/security';

const log = createLogger({ context: 'api:tasks:progress' });

const paramsSchema = z.object({
  instanceId: z.string().uuid('Invalid instanceId parameter'),
});

const progressUpdateSchema = z.object({
  progressPercentage: z
    .number()
    .int()
    .min(0, 'Progress must be at least 0')
    .max(100, 'Progress cannot exceed 100'),
  notes: z.string().max(1000, 'Notes are too long').optional(),
  attachments: z
    .array(
      z.object({
        id: z.string().uuid(),
        url: z.string().url(),
        filename: z.string().min(1),
        size: z.number().int().positive(),
      })
    )
    .optional(),
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
      log.warn('Failed to fetch user profile for progress API', {
        error: profileError,
        feature: 'progress-api',
      });
    }

    return {
      actor: {
        id: session.user.id,
        role: profile?.role ?? 'client',
      },
    };
  } catch (error) {
    log.error('Progress API authentication error', {
      error,
      feature: 'progress-api',
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
  const { instanceId } = paramsSchema.parse(await context.params);

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    log.warn('Failed to parse progress update payload', {
      error,
      feature: 'progress-api',
    });
    return createErrorResponse('Invalid JSON body', HTTP_STATUS.BAD_REQUEST);
  }

  try {
    ensureNoSupabaseHttpUsage(body, { context: 'tasks.progress.create.body' });
  } catch (error) {
    if (error instanceof ForbiddenSupabaseHttpError) {
      return createErrorResponse(
        'Invalid payload received.',
        HTTP_STATUS.BAD_REQUEST
      );
    }
    throw error;
  }

  const parsed = validateRequestBody(progressUpdateSchema, body);

  if (!parsed.success) {
    return createErrorResponse(parsed.error, HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const supabase = createServerClient();
    const service = new TaskService(supabase);

    // Verify instance exists and user has access
    const instance = await supabase
      .from('task_instances')
      .select('id, client_id, status')
      .eq('id', instanceId)
      .single();

    if (instance.error) {
      log.warn('Task instance not found for progress update', {
        instanceId,
        error: instance.error,
        feature: 'progress-api',
      });
      return createErrorResponse(
        'Task instance not found',
        HTTP_STATUS.NOT_FOUND
      );
    }

    // Only the assigned client can log progress
    if (instance.data.client_id !== actor.id) {
      return createErrorResponse(
        'Access denied. You can only update your own tasks',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // Don't allow progress updates on completed tasks
    if (instance.data.status === 'completed') {
      return createErrorResponse(
        'Cannot update progress on completed task',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const progressUpdate = await service.logProgress(instanceId, parsed.data);

    return createSuccessResponse(
      progressUpdate,
      'Progress update recorded successfully',
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    if (error instanceof Error) {
      log.error('Progress update error', {
        error: error.message,
        instanceId,
        feature: 'progress-api',
      });
      return createErrorResponse(error.message, HTTP_STATUS.BAD_REQUEST);
    }
    log.error('Unexpected progress update error', {
      error,
      instanceId,
      feature: 'progress-api',
    });
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};
