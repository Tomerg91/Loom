import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  HTTP_STATUS,
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
} from '@/lib/api/utils';
import * as taskDb from '@/lib/database/tasks';
import { createServerClient } from '@/lib/supabase/server';
import { createLogger } from '@/modules/platform/logging/logger';
import {
  ForbiddenSupabaseHttpError,
  ensureNoSupabaseHttpUsage,
} from '@/modules/platform/security';

const log = createLogger({ context: 'api:task-categories' });

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'),
});

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
      log.warn('Failed to fetch user profile for task categories API', {
        error: profileError,
        feature: 'task-categories-api',
      });
    }

    return {
      actor: {
        id: session.user.id,
        role: profile?.role ?? 'client',
      },
    };
  } catch (error) {
    log.error('Task categories API authentication error', {
      error,
      feature: 'task-categories-api',
    });
    return { response: createUnauthorizedResponse() };
  }
}

export const GET = async (request: NextRequest) => {
  ensureNoSupabaseHttpUsage(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
    { context: 'task-categories.list.query' }
  );

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

  try {
    const supabase = createServerClient();
    const categories = await taskDb.getCategoriesByCoachId(supabase, actor.id);

    return createSuccessResponse(categories);
  } catch (error) {
    log.error('Failed to fetch task categories', {
      error,
      feature: 'task-categories-api',
    });
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};

export const POST = async (request: NextRequest) => {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    log.warn('Failed to parse category creation payload', {
      error,
      feature: 'task-categories-api',
    });
    return createErrorResponse('Invalid JSON body', HTTP_STATUS.BAD_REQUEST);
  }

  try {
    ensureNoSupabaseHttpUsage(body, { context: 'task-categories.create.body' });
  } catch (error) {
    if (error instanceof ForbiddenSupabaseHttpError) {
      return createErrorResponse(
        'Invalid payload received.',
        HTTP_STATUS.BAD_REQUEST
      );
    }
    throw error;
  }

  const parsed = validateRequestBody(createCategorySchema, body);

  if (!parsed.success) {
    return createErrorResponse(parsed.error, HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const supabase = createServerClient();
    const category = await taskDb.createTaskCategory(supabase, {
      coachId: actor.id,
      name: parsed.data.name,
      color: parsed.data.color,
    });

    return createSuccessResponse(
      category,
      'Category created successfully',
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    log.error('Failed to create task category', {
      error,
      feature: 'task-categories-api',
    });
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};
