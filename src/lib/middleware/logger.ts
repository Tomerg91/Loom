import { NextRequest, NextResponse } from 'next/server';

export interface ResponseLogMeta {
  status?: number;
  durationMs?: number;
  reason?: string;
  redirect?: string;
  static?: boolean;
  intl?: boolean;
  errorHandled?: boolean;
}

export interface MiddlewareLogger {
  readonly enabled: boolean;
  readonly requestId: string;
  finalize(response: NextResponse, meta?: ResponseLogMeta): NextResponse;
}

export function createRequestLogger(request: NextRequest): MiddlewareLogger {
  const enabled = process.env.LOG_REQUESTS === 'true';
  const requestId = crypto.randomUUID();
  const start = Date.now();

  if (enabled) {
    console.info('[REQ]', {
      id: requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      ua: request.headers.get('user-agent') || '',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    });
  }

  return {
    enabled,
    requestId,
    finalize(response: NextResponse, meta?: ResponseLogMeta) {
      if (!enabled) {
        return response;
      }

      const durationMs = Date.now() - start;
      response.headers.set('X-Request-ID', requestId);
      const status = meta?.status ?? response.status;

      console.info('[RES]', {
        id: requestId,
        path: request.nextUrl.pathname,
        status,
        durMs: durationMs,
        ...meta,
      });

      return response;
    },
  } satisfies MiddlewareLogger;
}
