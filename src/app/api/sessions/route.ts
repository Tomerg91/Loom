import { NextRequest, NextResponse } from 'next/server';

import {
  createAuthenticatedSupabaseClient,
  propagateCookies,
} from '@/lib/api/auth-client';
import {
  HTTP_STATUS,
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
} from '@/lib/api/utils';
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

async function getAuthenticatedActor(
  request: NextRequest
): Promise<
  | { actor: AuthActor; authResponse: NextResponse }
  | { response: Response; authResponse: NextResponse }
> {
  const { client: supabase, response: authResponse } =
    createAuthenticatedSupabaseClient(request, new NextResponse());

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      const errorResponse = createUnauthorizedResponse();
      return {
        response: propagateCookies(authResponse, errorResponse),
        authResponse,
      };
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
      authResponse,
    };
  } catch (error) {
    log.error('Sessions API authentication error', {
      error,
      feature: 'sessions-api',
    });
    const errorResponse = createUnauthorizedResponse();
    return {
      response: propagateCookies(authResponse, errorResponse),
      authResponse,
    };
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

  const authResult = await getAuthenticatedActor(request);
  if ('response' in authResult) {
    return authResult.response;
  }

  const { actor, authResponse } = authResult;
  const view = request.nextUrl.searchParams.get('view') ?? 'calendar';

  try {
    if (view === 'requests') {
      const requests = await scheduler.listRequests(actor);
      const successResponse = createSuccessResponse({ requests });
      return propagateCookies(authResponse, successResponse);
    }

    const calendar = await scheduler.listCalendar(
      actor,
      parseCalendarSearchParams(request)
    );
    const successResponse = createSuccessResponse({ sessions: calendar });
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    if (error instanceof SessionSchedulerError) {
      const errorResponse = createErrorResponse(error.message, error.status);
      return propagateCookies(authResponse, errorResponse);
    }
    log.error('Sessions API GET error', {
      error,
      feature: 'sessions-api',
    });
    const errorResponse = createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
    return propagateCookies(authResponse, errorResponse);
  }
};

export const POST = async (request: NextRequest) => {
  const authResult = await getAuthenticatedActor(request);
  if ('response' in authResult) {
    return authResult.response;
  }

  const { actor, authResponse } = authResult;
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    log.warn('Failed to parse session request payload', {
      error,
      feature: 'sessions-api',
    });
    const errorResponse = createErrorResponse(
      'Invalid JSON body',
      HTTP_STATUS.BAD_REQUEST
    );
    return propagateCookies(authResponse, errorResponse);
  }

  try {
    ensureNoSupabaseHttpUsage(body, { context: 'sessions.create.body' });
  } catch (error) {
    if (error instanceof ForbiddenSupabaseHttpError) {
      const errorResponse = createErrorResponse(
        'Invalid payload received.',
        HTTP_STATUS.BAD_REQUEST
      );
      return propagateCookies(authResponse, errorResponse);
    }
    throw error;
  }

  const parsed = validateRequestBody(sessionRequestSchema, body);
  if (!parsed.success) {
    const errorResponse = createErrorResponse(
      parsed.error,
      HTTP_STATUS.BAD_REQUEST
    );
    return propagateCookies(authResponse, errorResponse);
  }

  const payload = parsed.data as SessionRequestInput;

  if (actor.role === 'client' && payload.clientId !== actor.id) {
    const errorResponse = createErrorResponse(
      'Clients can only schedule sessions for themselves.',
      HTTP_STATUS.FORBIDDEN
    );
    return propagateCookies(authResponse, errorResponse);
  }

  try {
    const result = await scheduler.createRequest(actor, payload);
    const successResponse = createSuccessResponse(
      result,
      actor.role === 'client'
        ? 'Session request submitted successfully'
        : 'Session scheduled successfully',
      HTTP_STATUS.CREATED
    );
    return propagateCookies(authResponse, successResponse);
  } catch (error) {
    if (error instanceof SessionSchedulerError) {
      const errorResponse = createErrorResponse(error.message, error.status);
      return propagateCookies(authResponse, errorResponse);
    }
    log.error('Sessions API POST error', {
      error,
      feature: 'sessions-api',
    });
    const errorResponse = createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
    return propagateCookies(authResponse, errorResponse);
  }
};
