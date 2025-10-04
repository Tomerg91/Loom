import { NextRequest, NextResponse } from 'next/server';

import { createServerClientWithRequest } from '@/lib/supabase/server';

import { AUTH_GATING_ENABLED, AUTH_ROUTE_PREFIX, MFA_VERIFY_ROUTE, PROTECTED_ROUTES, PUBLIC_ROUTES } from './route-config';
import type { ResponseLogMeta } from './logger';

interface EnforceAuthParams {
  request: NextRequest;
  locale: string;
  pathWithoutLocale: string;
  authEnabled?: boolean;
}

interface EnforceAuthResult {
  response: NextResponse | null;
  meta?: ResponseLogMeta;
}

async function getHasSession(request: NextRequest): Promise<boolean> {
  try {
    const tempResponse = NextResponse.next();
    const supabase = createServerClientWithRequest(request, tempResponse);
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return false;
    }
    return !!data.session?.user;
  } catch (error) {
    console.warn('Error checking auth session in middleware:', error);
    return false;
  }
}

export async function enforceAuth({
  request,
  locale,
  pathWithoutLocale,
  authEnabled = AUTH_GATING_ENABLED,
}: EnforceAuthParams): Promise<EnforceAuthResult> {
  if (!authEnabled) {
    return { response: null };
  }

  const hasAuthSession = await getHasSession(request);
  const mfaPending = request.cookies.get('mfa_pending')?.value === 'true';

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathWithoutLocale.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    pathWithoutLocale === route || pathWithoutLocale.startsWith(route)
  );
  const isAuthRoute = pathWithoutLocale.startsWith(AUTH_ROUTE_PREFIX);
  const isMfaVerifyRoute = pathWithoutLocale.startsWith(MFA_VERIFY_ROUTE);

  if (hasAuthSession && mfaPending && !isMfaVerifyRoute) {
    const redirectUrl = new URL(`/${locale}${MFA_VERIFY_ROUTE}`, request.url);
    const origRedirect = request.nextUrl.searchParams.get('redirectTo') || '/dashboard';
    redirectUrl.searchParams.set('redirectTo', origRedirect);
    const response = NextResponse.redirect(redirectUrl);
    return {
      response,
      meta: {
        reason: 'mfa pending redirect',
        redirect: redirectUrl.toString(),
        status: 307,
      },
    };
  }

  if (hasAuthSession && isAuthRoute && !mfaPending) {
    const redirectUrl = new URL(`/${locale}/dashboard`, request.url);
    const response = NextResponse.redirect(redirectUrl);
    return {
      response,
      meta: {
        reason: 'auth route, already authed',
        redirect: redirectUrl.toString(),
        status: 307,
      },
    };
  }

  if (isPublicRoute) {
    return {
      response: NextResponse.next(),
      meta: {
        reason: 'public route',
        status: 200,
      },
    };
  }

  if (isProtectedRoute && !hasAuthSession) {
    const redirectUrl = new URL(`/${locale}/auth/signin`, request.url);
    redirectUrl.searchParams.set('redirectTo', pathWithoutLocale);
    const response = NextResponse.redirect(redirectUrl);
    return {
      response,
      meta: {
        reason: 'protected route not authed',
        redirect: redirectUrl.toString(),
        status: 307,
      },
    };
  }

  return { response: null };
}
