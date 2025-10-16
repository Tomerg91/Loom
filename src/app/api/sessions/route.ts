import { NextRequest } from 'next/server';

import {
  HTTP_STATUS,
  createErrorResponse,
  createSuccessResponse,
  validateRequestBody,
} from '@/lib/api/utils';
import { createServerClient } from '@/lib/supabase/server';
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
      console.warn(
        'Failed to fetch user profile for sessions API:',
        profileError.message
      );
    }

    return {
      actor: {
        id: session.user.id,
        role: (profile?.role ?? 'client') as AuthRole,
      },
    };
  } catch (error) {
    console.error('Sessions API authentication error:', error);
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
    console.error('Sessions API GET error:', error);
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
    console.warn('Failed to parse session request payload:', error);
    return createErrorResponse('Invalid JSON body', HTTP_STATUS.BAD_REQUEST);
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
    console.error('Sessions API POST error:', error);
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};
