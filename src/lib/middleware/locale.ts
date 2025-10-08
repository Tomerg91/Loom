import { NextRequest, NextResponse } from 'next/server';

import { routing } from '@/i18n/routing';
import { applySecurityHeaders } from '@/lib/security/headers';

export interface LocaleCheckResult {
  locale: string;
  pathWithoutLocale: string;
}

export interface LocaleRedirectResult {
  response: NextResponse;
  reason: string;
  redirect: string;
}

export function enforceLocale(request: NextRequest): LocaleCheckResult | LocaleRedirectResult {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && firstSegment.length === 2 && !routing.locales.includes(firstSegment as 'en' | 'he')) {
    const pathWithoutInvalidLocale = '/' + segments.slice(1).join('/');
    const redirectUrl = new URL(`/${routing.defaultLocale}${pathWithoutInvalidLocale}`, request.url);
    const response = applySecurityHeaders(request, NextResponse.redirect(redirectUrl));

    return {
      response,
      reason: 'invalid locale',
      redirect: redirectUrl.toString(),
    };
  }

  const locale = segments[0] && routing.locales.includes(segments[0] as 'en' | 'he')
    ? segments[0]
    : routing.defaultLocale;

  const pathWithoutLocale = locale === routing.defaultLocale
    ? pathname
    : pathname.slice(locale.length + 1) || '/';

  return {
    locale,
    pathWithoutLocale,
  };
}
