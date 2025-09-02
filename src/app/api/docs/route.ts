import { NextResponse } from 'next/server';
import { compose, withRateLimit } from '@/lib/api';
import { openApiSpec } from '@/lib/api/openapi';
import { getCorsHeadersForPublicEndpoint, createPublicCorsResponse } from '@/lib/security/cors';

// GET /api/docs - Return OpenAPI specification
export const GET = compose(async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeadersForPublicEndpoint(),
    },
  });
}, withRateLimit());

// OPTIONS /api/docs - Handle CORS preflight
export async function OPTIONS() {
  return createPublicCorsResponse();
}
