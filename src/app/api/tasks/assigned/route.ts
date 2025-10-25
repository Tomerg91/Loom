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
import { ensureNoSupabaseHttpUsage } from '@/modules/platform/security';

const log = createLogger({ context: 'api:tasks:assigned' });

const querySchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
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
      log.warn('Failed to fetch user profile for assigned tasks API', {
        error: profileError,
        feature: 'assigned-tasks-api',
      });
    }

    return {
      actor: {
        id: session.user.id,
        role: profile?.role ?? 'client',
      },
    };
  } catch (error) {
    log.error('Assigned tasks API authentication error', {
      error,
      feature: 'assigned-tasks-api',
    });
    return { response: createUnauthorizedResponse() };
  }
}

export const GET = async (request: NextRequest) => {
  const queryParams = Object.fromEntries(
    request.nextUrl.searchParams.entries()
  );

  ensureNoSupabaseHttpUsage(queryParams, {
    context: 'tasks.assigned.list.query',
  });

  const authResult = await getAuthenticatedActor();
  if ('response' in authResult) {
    return authResult.response;
  }

  const { actor } = authResult;

  // Parse and validate query parameters
  const parsedQuery = querySchema.safeParse(queryParams);

  if (!parsedQuery.success) {
    return createErrorResponse(
      'Invalid query parameters',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  try {
    const supabase = createServerClient();
    const instances = await taskDb.getTaskInstancesByClientId(
      supabase,
      actor.id,
      parsedQuery.data.status ? { status: parsedQuery.data.status } : undefined
    );

    // Group by status for better client experience
    const byStatus = {
      pending: instances.filter((i) => i.status === 'pending'),
      in_progress: instances.filter((i) => i.status === 'in_progress'),
      completed: instances.filter((i) => i.status === 'completed'),
    };

    return createSuccessResponse({
      instances,
      byStatus,
      stats: {
        total: instances.length,
        pending: byStatus.pending.length,
        inProgress: byStatus.in_progress.length,
        completed: byStatus.completed.length,
        completionRate:
          instances.length > 0
            ? Math.round((byStatus.completed.length / instances.length) * 100)
            : 0,
      },
    });
  } catch (error) {
    log.error('Failed to fetch assigned tasks', {
      error,
      clientId: actor.id,
      feature: 'assigned-tasks-api',
    });
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};
