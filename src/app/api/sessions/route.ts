import { NextRequest } from 'next/server';

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
import {
  SessionSchedulerError,
  SessionSchedulerService,
} from '@/modules/sessions/server/queries';
import {
  sessionRequestSchema,
  type SessionRequestInput,
} from '@/modules/sessions/validators/session';

type AuthRole = 'coach' | 'client' | 'admin';

type AuthActor = {
  id: string;
  role: AuthRole;
};

const scheduler = new SessionSchedulerService();
const log = createLogger({ context: 'api:sessions' });

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
      log.warn('Failed to fetch user profile for sessions API', {
        error: profileError,
        feature: 'sessions-api',
      });
    }

    return {
      actor: {
        id: session.user.id,
        role: (profile?.role ?? 'client') as AuthRole,
      },
    };
  } catch (error) {
    log.error('Sessions API authentication error', {
      error,
      feature: 'sessions-api',
    });
    return { response: createUnauthorizedResponse() };
  }
}

const parseCalendarSearchParams = (request: NextRequest) => {
  const start = request.nextUrl.searchParams.get('start') ?? undefined;
  const end = request.nextUrl.searchParams.get('end') ?? undefined;
  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  return { start, end, limit: Number.isNaN(limit) ? undefined : limit };
};

export const GET = async (request: NextRequest) => {
  ensureNoSupabaseHttpUsage(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
    { context: 'sessions.list.query' }
  );

  const authResult = await getAuthenticatedActor();
  if ('response' in authResult) {
    return authResult.response;
  }

  const { actor } = authResult;
  const view = request.nextUrl.searchParams.get('view') ?? 'calendar';

  try {
    if (view === 'requests') {
      const requests = await scheduler.listRequests(actor);
      return createSuccessResponse({ requests });
    }

    const calendar = await scheduler.listCalendar(
      actor,
      parseCalendarSearchParams(request)
    );
    return createSuccessResponse({ sessions: calendar });
  } catch (error) {
    if (error instanceof SessionSchedulerError) {
      return createErrorResponse(error.message, error.status);
    }
    log.error('Sessions API GET error', {
      error,
      feature: 'sessions-api',
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
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    log.warn('Failed to parse session request payload', {
      error,
      feature: 'sessions-api',
    });
    return createErrorResponse('Invalid JSON body', HTTP_STATUS.BAD_REQUEST);
  }

  try {
    ensureNoSupabaseHttpUsage(body, { context: 'sessions.create.body' });
  } catch (error) {
    if (error instanceof ForbiddenSupabaseHttpError) {
      return createErrorResponse(
        'Invalid payload received.',
        HTTP_STATUS.BAD_REQUEST
      );
    }
    throw error;
  }

  const parsed = validateRequestBody(sessionRequestSchema, body);
  if (!parsed.success) {
    return createErrorResponse(parsed.error, HTTP_STATUS.BAD_REQUEST);
  }

  const payload = parsed.data as SessionRequestInput;

  if (actor.role === 'client' && payload.clientId !== actor.id) {
    return createErrorResponse(
      'Clients can only schedule sessions for themselves.',
      HTTP_STATUS.FORBIDDEN
    );
  }

  try {
    const result = await scheduler.createRequest(actor, payload);
    return createSuccessResponse(
      result,
      actor.role === 'client'
        ? 'Session request submitted successfully'
        : 'Session scheduled successfully',
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    if (error instanceof SessionSchedulerError) {
      return createErrorResponse(error.message, error.status);
    }
    log.error('Sessions API POST error', {
      error,
      feature: 'sessions-api',
    });
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};
