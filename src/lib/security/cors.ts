import { NextRequest, NextResponse } from 'next/server';

// Environment-specific allowed origins for CORS
const getAllowedOrigins = (): string[] => {
  const env = process.env.NODE_ENV;
  
  // Base origins
  const origins = [];
  
  // Development origins
  if (env === 'development' || env === 'test') {
    origins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    );
  }
  
  // Production/Staging origins
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    origins.push(process.env.NEXT_PUBLIC_SITE_URL);
  }
  
  // Vercel deployment URL
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }
  
  // Default production domain
  origins.push('https://loom-bay.vercel.app');
  
  // Additional allowed domains from environment
  if (process.env.CORS_ALLOWED_ORIGINS) {
    const additionalOrigins = process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim());
    origins.push(...additionalOrigins);
  }
  
  return origins.filter(Boolean);
};

const ALLOWED_ORIGINS = getAllowedOrigins();

export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin');
  const corsOrigin = ALLOWED_ORIGINS.includes(origin || '') ? origin : null;
  
  // Security: Never return wildcard for credentials
  // If origin is not allowed, fallback to null (no CORS)
  const allowOrigin = corsOrigin;
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-API-Key',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Vary': 'Origin', // Important for caching
  };
  
  // Only set origin and credentials if origin is allowed
  if (allowOrigin) {
    headers['Access-Control-Allow-Origin'] = allowOrigin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  return headers;
}

export function getCorsHeadersForPublicEndpoint(): Record<string, string> {
  // For public endpoints that don't require credentials
  // Still restrict to allowed origins for security
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0] || 'https://loom-bay.vercel.app',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export function createCorsResponse(request: NextRequest): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export function applyCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const corsHeaders = getCorsHeaders(request);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function isOriginAllowed(origin: string | null): boolean {
  return ALLOWED_ORIGINS.includes(origin || '');
}

export function createPublicCorsResponse(): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeadersForPublicEndpoint(),
  });
}

// Export allowed origins for debugging and testing
export { ALLOWED_ORIGINS };