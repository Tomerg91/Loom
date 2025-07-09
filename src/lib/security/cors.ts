import { NextRequest, NextResponse } from 'next/server';

// Define allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://loom-bay.vercel.app',
  'http://localhost:3001',
  'http://localhost:3000',
  process.env.NEXT_PUBLIC_SITE_URL,
].filter(Boolean);

export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin');
  const corsOrigin = ALLOWED_ORIGINS.includes(origin || '') ? origin : null;
  
  return {
    'Access-Control-Allow-Origin': corsOrigin || 'https://loom-bay.vercel.app',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
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