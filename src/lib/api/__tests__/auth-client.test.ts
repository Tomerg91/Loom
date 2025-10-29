// src/lib/api/__tests__/auth-client.test.ts
import { NextRequest, NextResponse } from 'next/server';
import { describe, it, expect } from 'vitest';

import { createAuthenticatedSupabaseClient } from '../auth-client';

describe('createAuthenticatedSupabaseClient', () => {
  it('returns a Supabase client when request and response provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
      headers: new Headers({
        cookie: 'sb-auth-token=test_token',
      }),
    });

    const response = new NextResponse();

    const { client } = createAuthenticatedSupabaseClient(request, response);

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it('returns response object with cookie handling attached', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
    });

    const { response } = createAuthenticatedSupabaseClient(
      request,
      new NextResponse()
    );

    expect(response).toBeDefined();
    expect(typeof response.cookies.set).toBe('function');
  });
});
