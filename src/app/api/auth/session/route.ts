import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from '@/lib/api/utils';

// POST /api/auth/session
// Body: { access_token: string, refresh_token: string }
// Sets HTTP-only Supabase auth cookies on the response so SSR/middleware can see the session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { access_token, refresh_token } = body || {};

    if (!access_token || !refresh_token) {
      return createErrorResponse('Missing access_token or refresh_token', HTTP_STATUS.BAD_REQUEST);
    }

    // Create a server client with response cookie support
    const supabase = createServerClient();

    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    } as any);

    if (error) {
      return createErrorResponse(error.message, HTTP_STATUS.UNAUTHORIZED);
    }

    return createSuccessResponse({ ok: true }, 'Session established');
  } catch (error) {
    return createErrorResponse('Failed to establish session', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

