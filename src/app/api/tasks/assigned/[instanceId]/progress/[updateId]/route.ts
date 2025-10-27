import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  HTTP_STATUS,
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
} from '@/lib/api/utils';
import { createServerClient } from '@/lib/supabase/server';
import * as taskDb from '@/lib/database/tasks';
import { createLogger } from '@/modules/platform/logging/logger';
import {
  ForbiddenSupabaseHttpError,
  ensureNoSupabaseHttpUsage,
} from '@/modules/platform/security';

const log = createLogger({ context: 'api:tasks:progress-update' });

const paramsSchema = z.object({
  instanceId: z.string().uuid('Invalid instanceId parameter'),
  updateId: z.string().uuid('Invalid updateId parameter'),
});

const updateProgressSchema = z.object({
  progressPercentage: z
    .number()
    .int()
    .min(0, 'Progress must be at least 0')
    .max(100, 'Progress cannot exceed 100')
    .optional(),
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
type RouteContext = {
  params: Promise<{ instanceId: string; updateId: string }>;
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
      log.warn('Failed to fetch user profile for progress update API', {
        error: profileError,
        feature: 'progress-update-api',
      });
    }

    return {
      actor: {
        id: session.user.id,
        role: profile?.role ?? 'client',
      },
    };
  } catch (error) {
    log.error('Progress update API authentication error', {
      error,
      feature: 'progress-update-api',
    });
    return { response: createUnauthorizedResponse() };
  }
}

export const PUT = async (request: NextRequest, context: RouteContext) => {
  const authResult = await getAuthenticatedActor();
  if ('response' in authResult) {
    return authResult.response;
  }

  const { actor } = authResult;
  const { instanceId, updateId } = paramsSchema.parse(await context.params);

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    log.warn('Failed to parse progress update modification payload', {
      error,
      feature: 'progress-update-api',
    });
    return createErrorResponse('Invalid JSON body', HTTP_STATUS.BAD_REQUEST);
  }

  try {
    ensureNoSupabaseHttpUsage(body, { context: 'tasks.progress.update.body' });
  } catch (error) {
    if (error instanceof ForbiddenSupabaseHttpError) {
      return createErrorResponse(
        'Invalid payload received.',
        HTTP_STATUS.BAD_REQUEST
      );
    }
    throw error;
  }

  const parsed = validateRequestBody(updateProgressSchema, body);

  if (!parsed.success) {
    return createErrorResponse(parsed.error, HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const supabase = createServerClient();

    // Verify instance exists and user has access
    const instance = await supabase
      .from('task_instances')
      .select('id, client_id')
      .eq('id', instanceId)
      .single();

    if (instance.error) {
      log.warn('Task instance not found for progress update', {
        instanceId,
        error: instance.error,
        feature: 'progress-update-api',
      });
      return createErrorResponse(
        'Task instance not found',
        HTTP_STATUS.NOT_FOUND
      );
    }

    // Only the assigned client can modify progress
    if (instance.data.client_id !== actor.id) {
      return createErrorResponse(
        'Access denied. You can only update your own progress',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // Verify update belongs to this instance
    const existingUpdate = await supabase
      .from('task_progress_updates')
      .select('id, instance_id')
      .eq('id', updateId)
      .single();

    if (existingUpdate.error) {
      log.warn('Progress update not found', {
        updateId,
        error: existingUpdate.error,
        feature: 'progress-update-api',
      });
      return createErrorResponse(
        'Progress update not found',
        HTTP_STATUS.NOT_FOUND
      );
    }

    if (existingUpdate.data.instance_id !== instanceId) {
      return createErrorResponse(
        'Progress update does not belong to this instance',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const updated = await taskDb.updateProgressUpdate(supabase, updateId, {
      progressPercentage: parsed.data.progressPercentage,
      notes: parsed.data.notes,
      attachments: parsed.data.attachments,
    });

    return createSuccessResponse(updated, 'Progress update modified successfully');
  } catch (error) {
    log.error('Failed to update progress', {
      error,
      updateId,
      feature: 'progress-update-api',
    });
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};

export const DELETE = async (_request: NextRequest, context: RouteContext) => {
  const authResult = await getAuthenticatedActor();
  if ('response' in authResult) {
    return authResult.response;
  }

  const { actor } = authResult;
  const { instanceId, updateId } = paramsSchema.parse(await context.params);

  try {
    const supabase = createServerClient();

    // Verify instance exists and user has access
    const instance = await supabase
      .from('task_instances')
      .select('id, client_id')
      .eq('id', instanceId)
      .single();

    if (instance.error) {
      log.warn('Task instance not found for progress deletion', {
        instanceId,
        error: instance.error,
        feature: 'progress-update-api',
      });
      return createErrorResponse(
        'Task instance not found',
        HTTP_STATUS.NOT_FOUND
      );
    }

    // Only the assigned client can delete progress
    if (instance.data.client_id !== actor.id) {
      return createErrorResponse(
        'Access denied. You can only delete your own progress',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // Verify update belongs to this instance
    const existingUpdate = await supabase
      .from('task_progress_updates')
      .select('id, instance_id')
      .eq('id', updateId)
      .single();

    if (existingUpdate.error) {
      log.warn('Progress update not found for deletion', {
        updateId,
        error: existingUpdate.error,
        feature: 'progress-update-api',
      });
      return createErrorResponse(
        'Progress update not found',
        HTTP_STATUS.NOT_FOUND
      );
    }

    if (existingUpdate.data.instance_id !== instanceId) {
      return createErrorResponse(
        'Progress update does not belong to this instance',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    await taskDb.deleteProgressUpdate(supabase, updateId);

    return createSuccessResponse(null, 'Progress update deleted successfully');
  } catch (error) {
    log.error('Failed to delete progress update', {
      error,
      updateId,
      feature: 'progress-update-api',
    });
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};
