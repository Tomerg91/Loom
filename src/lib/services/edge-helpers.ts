import { NextRequest } from 'next/server';

/**
 * Edge Runtime-compatible helper to extract client IP address from request headers.
 * This is a copy of the getClientIP function from mfa-service.ts,
 * extracted to avoid loading Node.js modules in Edge Runtime.
 */
export const getClientIP = (request: NextRequest): string | null => {
  // Check various headers for the real IP address
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('remote-addr');

  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (remoteAddr) {
    return remoteAddr;
  }

  // Try to get from connection info (Next.js specific)
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  return null;
};

/**
 * Edge Runtime-compatible helper to extract user agent from request headers.
 */
export const getUserAgent = (request: NextRequest): string | null => {
  return request.headers.get('user-agent');
};
