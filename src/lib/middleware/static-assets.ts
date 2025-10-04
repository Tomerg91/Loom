import { NextRequest, NextResponse } from 'next/server';

const STATIC_EXTENSIONS = [
  '.css',
  '.js',
  '.js.map',
  '.css.map',
  '.ico',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.gif',
  '.webp',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
] as const;

export interface StaticBypassResult {
  response: NextResponse;
  reason: 'static' | 'api';
}

export function bypassStaticAssets(request: NextRequest): StaticBypassResult | null {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    return { response: NextResponse.next(), reason: 'api' };
  }

  if (pathname.startsWith('/_next/static/') || pathname.startsWith('/_next/image/')) {
    return { response: NextResponse.next(), reason: 'static' };
  }

  if (pathname.startsWith('/favicon.ico') || pathname.startsWith('/static/')) {
    return { response: NextResponse.next(), reason: 'static' };
  }

  if (STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
    return { response: NextResponse.next(), reason: 'static' };
  }

  if (pathname.match(/\.(css|js|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot)(\?.*)?$/)) {
    return { response: NextResponse.next(), reason: 'static' };
  }

  return null;
}
