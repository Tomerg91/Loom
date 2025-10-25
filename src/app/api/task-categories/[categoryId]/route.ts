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

const log = createLogger({ context: 'api:task-category' });

const paramsSchema = z.object({
  categoryId: z.string().uuid('Invalid categoryId parameter'),
});

const updateCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long')
    .optional(),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format')
    .optional(),
});

type AuthActor = { id: string; role: string };
type RouteContext = { params: Promise<{ categoryId: string }> };

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
      log.warn('Failed to fetch user profile for task category API', {
        error: profileError,
        feature: 'task-category-api',
      });
    }

    return {
      actor: {
        id: session.user.id,
        role: profile?.role ?? 'client',
      },
    };
  } catch (error) {
    log.error('Task category API authentication error', {
      error,
      feature: 'task-category-api',
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

  if (actor.role !== 'coach' && actor.role !== 'admin') {
    return createErrorResponse(
      'Access denied. Required role: coach',
      HTTP_STATUS.FORBIDDEN
    );
  }

  const { categoryId } = paramsSchema.parse(await context.params);

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    log.warn('Failed to parse category update payload', {
      error,
      feature: 'task-category-api',
    });
    return createErrorResponse('Invalid JSON body', HTTP_STATUS.BAD_REQUEST);
  }

  try {
    ensureNoSupabaseHttpUsage(body, { context: 'task-category.update.body' });
  } catch (error) {
    if (error instanceof ForbiddenSupabaseHttpError) {
      return createErrorResponse(
        'Invalid payload received.',
        HTTP_STATUS.BAD_REQUEST
      );
    }
    throw error;
  }

  const parsed = validateRequestBody(updateCategorySchema, body);

  if (!parsed.success) {
    return createErrorResponse(parsed.error, HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const supabase = createServerClient();

    // Verify category exists and user has access
    const existingCategory = await supabase
      .from('task_categories')
      .select('id, coach_id')
      .eq('id', categoryId)
      .single();

    if (existingCategory.error) {
      log.warn('Category not found', {
        categoryId,
        error: existingCategory.error,
        feature: 'task-category-api',
      });
      return createErrorResponse('Category not found', HTTP_STATUS.NOT_FOUND);
    }

    if (
      actor.role === 'coach' &&
      existingCategory.data.coach_id !== actor.id
    ) {
      return createErrorResponse(
        'Access denied. You can only update your own categories',
        HTTP_STATUS.FORBIDDEN
      );
    }

    const category = await taskDb.updateTaskCategory(supabase, categoryId, {
      name: parsed.data.name,
      color: parsed.data.color,
    });

    return createSuccessResponse(category, 'Category updated successfully');
  } catch (error) {
    log.error('Failed to update task category', {
      error,
      categoryId,
      feature: 'task-category-api',
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

  if (actor.role !== 'coach' && actor.role !== 'admin') {
    return createErrorResponse(
      'Access denied. Required role: coach',
      HTTP_STATUS.FORBIDDEN
    );
  }

  const { categoryId } = paramsSchema.parse(await context.params);

  try {
    const supabase = createServerClient();

    // Verify category exists and user has access
    const existingCategory = await supabase
      .from('task_categories')
      .select('id, coach_id')
      .eq('id', categoryId)
      .single();

    if (existingCategory.error) {
      log.warn('Category not found for deletion', {
        categoryId,
        error: existingCategory.error,
        feature: 'task-category-api',
      });
      return createErrorResponse('Category not found', HTTP_STATUS.NOT_FOUND);
    }

    if (
      actor.role === 'coach' &&
      existingCategory.data.coach_id !== actor.id
    ) {
      return createErrorResponse(
        'Access denied. You can only delete your own categories',
        HTTP_STATUS.FORBIDDEN
      );
    }

    await taskDb.deleteTaskCategory(supabase, categoryId);

    return createSuccessResponse(null, 'Category deleted successfully');
  } catch (error) {
    log.error('Failed to delete task category', {
      error,
      categoryId,
      feature: 'task-category-api',
    });
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};
