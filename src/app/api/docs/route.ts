import { NextResponse } from 'next/server';
import { openApiSpec } from '@/lib/api/openapi';
import { getCorsHeadersForPublicEndpoint, createPublicCorsResponse } from '@/lib/security/cors';

// GET /api/docs - Return OpenAPI specification
export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeadersForPublicEndpoint(),
    },
  });
}

// OPTIONS /api/docs - Handle CORS preflight
export async function OPTIONS() {
  return createPublicCorsResponse();
}