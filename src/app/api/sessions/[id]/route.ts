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
import {
  SessionSchedulerError,
  SessionSchedulerService,
} from '@/modules/sessions/server/queries';
import {
  sessionUpdateSchema,
  type SessionUpdateInput,
} from '@/modules/sessions/validators/session';

type AuthRole = 'coach' | 'client' | 'admin';

type AuthActor = {
  id: string;
  role: AuthRole;
};

const scheduler = new SessionSchedulerService();

async function getAuthenticatedActor(
  request: NextRequest
): Promise<
  | { actor: AuthActor; authResponse: NextResponse }
  | { error: string; authResponse: NextResponse }
> {
  const { client: supabase, response: authResponse } =
    createAuthenticatedSupabaseClient(request, new NextResponse());

  try {
    const { data: session, error } = await supabase.auth.getUser();

    if (error || !session?.user) {
      return {
        error: 'Unauthorized',
        authResponse,
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.warn(
        'Failed to fetch user profile for session update API:',
        profileError.message
      );
    }

    return {
      actor: {
        id: session.user.id,
        role: (profile?.role ?? 'client') as AuthRole,
      },
      authResponse,
    };
  } catch (error) {
    console.error('Session update API authentication error:', error);
    return {
      error: 'Internal server error',
      authResponse,
    };
  }
}

export const PATCH = async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const params = await context.params;
  const authResult = await getAuthenticatedActor(request);

  if ('error' in authResult) {
    const errorResponse = createErrorResponse(
      authResult.error,
      authResult.error === 'Unauthorized'
        ? HTTP_STATUS.UNAUTHORIZED
        : HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
    return propagateCookies(authResult.authResponse, errorResponse);
  }

  const { actor, authResponse } = authResult;
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    console.warn('Failed to parse session update payload:', error);
    return propagateCookies(
      authResponse,
      createErrorResponse('Invalid JSON body', HTTP_STATUS.BAD_REQUEST)
    );
  }

  const parsed = validateRequestBody(sessionUpdateSchema, body);
  if (!parsed.success) {
    return propagateCookies(
      authResponse,
      createErrorResponse(parsed.error, HTTP_STATUS.BAD_REQUEST)
    );
  }

  const payload = parsed.data as SessionUpdateInput;

  try {
    const result = await scheduler.updateSession(actor, params.id, payload);
    return propagateCookies(
      authResponse,
      createSuccessResponse(result, 'Session updated successfully')
    );
  } catch (error) {
    if (error instanceof SessionSchedulerError) {
      return propagateCookies(
        authResponse,
        createErrorResponse(error.message, error.status)
      );
    }
    console.error('Sessions API PATCH error:', error);
    return propagateCookies(
      authResponse,
      createErrorResponse(
        'Internal server error',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      )
    );
  }
};
