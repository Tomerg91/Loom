// src/lib/api/__tests__/auth-client.test.ts
import { NextRequest, NextResponse } from 'next/server';
import { describe, it, expect } from 'vitest';

import {
  createAuthenticatedSupabaseClient,
  propagateCookies,
} from '../auth-client';

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

    const response = new NextResponse();
    const { response: authResponse } = createAuthenticatedSupabaseClient(
      request,
      response
    );
    expect(authResponse).toBeDefined();
    expect(typeof authResponse.cookies.set).toBe('function');
  });
});

describe('propagateCookies', () => {
  it('propagates cookies from auth response to API response', () => {
    const authResponse = new NextResponse();
    authResponse.cookies.set('sb-access-token', 'test-token-123');
    authResponse.cookies.set('sb-refresh-token', 'refresh-token-456');

    const apiResponse = new NextResponse(JSON.stringify({ success: true }));
    const result = propagateCookies(authResponse, apiResponse);

    const cookies = result.cookies.getAll();
    expect(cookies).toHaveLength(2);
    expect(cookies.find(c => c.name === 'sb-access-token')?.value).toBe(
      'test-token-123'
    );
    expect(cookies.find(c => c.name === 'sb-refresh-token')?.value).toBe(
      'refresh-token-456'
    );
  });

  it('returns the API response with cookies propagated', () => {
    const authResponse = new NextResponse();
    authResponse.cookies.set('test-cookie', 'value');

    const apiResponse = new NextResponse(JSON.stringify({ data: 'test' }));
    const result = propagateCookies(authResponse, apiResponse);

    expect(result).toBe(apiResponse);
    expect(result.cookies.getAll()).toHaveLength(1);
  });

  it('handles empty cookie list gracefully', () => {
    const authResponse = new NextResponse();
    const apiResponse = new NextResponse();

    const result = propagateCookies(authResponse, apiResponse);

    expect(result).toBe(apiResponse);
    expect(result.cookies.getAll()).toHaveLength(0);
  });
});
