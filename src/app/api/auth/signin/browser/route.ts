import { NextRequest, NextResponse } from 'next/server';

import { createServerClientWithRequest } from '@/lib/supabase/server';
import { resolveRedirect } from '@/lib/utils/redirect';
import { logger } from '@/lib/logger';

// POST /api/auth/signin/browser
// Accepts form POST from the browser, sets HTTP-only cookies, and 303-redirects.
export async function POST(request: NextRequest) {
  const log = process.env.LOG_REQUESTS === 'true';
  const reqId = crypto.randomUUID();
  const start = Date.now();

  try {
    const contentType = request.headers.get('content-type') || '';
    const isForm = contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data');

    const form = isForm ? await request.formData() : null;
    const email = (form?.get('email') || '') as string;
    const password = (form?.get('password') || '') as string;
    const locale = ((form?.get('locale') as string) || 'he').toLowerCase();
    const redirectToRaw = (form?.get('redirectTo') as string) || '/dashboard';

    if (!email || !password) {
      const signinUrl = new URL(resolveRedirect(locale, '/auth/signin', { allowAuthPaths: true }), request.url);
      signinUrl.searchParams.set('error', 'missing_credentials');
      if (log) logger.info('[RES]', { id: reqId, path: request.nextUrl.pathname, status: 303, durMs: Date.now() - start, reason: 'missing creds' });
      return NextResponse.redirect(signinUrl, { status: 303 });
    }

    // First, sign in to obtain tokens.
    const tempRes = NextResponse.next();
    const tempClient = createServerClientWithRequest(request, tempRes);
    const { data, error } = await tempClient.auth.signInWithPassword({ email, password });

    if (error || !data?.session) {
      const signinUrl = new URL(resolveRedirect(locale, '/auth/signin', { allowAuthPaths: true }), request.url);
      signinUrl.searchParams.set('error', 'invalid_credentials');
      if (log) logger.info('[RES]', { id: reqId, path: request.nextUrl.pathname, status: 303, durMs: Date.now() - start, reason: 'invalid creds' });
      return NextResponse.redirect(signinUrl, { status: 303 });
    }

    // Determine if MFA is required.
    let requiresMFA = false;
    try {
      const { createMFAService } = await import('@/lib/services/mfa-service');
      const mfaService = createMFAService(true);
      requiresMFA = await mfaService.requiresMFA(data.user.id);
    } catch (_e) {
      // If MFA service fails, proceed without MFA requirement.
      requiresMFA = false;
    }

    // Compute destination
    const redirectResolved = requiresMFA
      ? resolveRedirect(locale, `/auth/mfa-verify?userId=${encodeURIComponent(data.user.id)}&redirectTo=${encodeURIComponent(redirectToRaw)}`)
      : resolveRedirect(locale, redirectToRaw);

    // Build the final redirect response and attach cookies to it.
    const res = NextResponse.redirect(new URL(redirectResolved, request.url), { status: 303 });

    // Ensure Supabase session cookies are set on the final response
    const finalClient = createServerClientWithRequest(request, res);
    const { access_token, refresh_token } = data.session;
    await finalClient.auth.setSession({ access_token, refresh_token } as any);

    // For MFA flow A (session-before-MFA), set a non-HTTP-only mfa_pending cookie
    if (requiresMFA) {
      res.cookies.set('mfa_pending', 'true', { path: '/', httpOnly: false, sameSite: 'strict', secure: true, maxAge: 10 * 60 });
    }

    if (log) {
      res.headers.set('X-Request-ID', reqId);
      logger.info('[RES]', { id: reqId, path: request.nextUrl.pathname, status: 303, redirect: redirectResolved, durMs: Date.now() - start, mfa: requiresMFA });
    }
    return res;
  } catch (_err) {
    const signinUrl = new URL('/auth/signin', request.url);
    signinUrl.searchParams.set('error', 'server_error');
    return NextResponse.redirect(signinUrl, { status: 303 });
  }
}

