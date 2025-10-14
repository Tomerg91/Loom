/**
 * RBAC enforcement tests for client-facing APIs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

import {
  GET as getClientReflections,
  POST as postClientReflections,
} from '@/app/api/client/reflections/route';
import { GET as getClientStats } from '@/app/api/client/stats/route';
import { GET as getClientSessionNotes } from '@/app/api/client/sessions/[id]/notes/route';
import {
  mockUser,
  mockCoachUser,
  mockAdminUser,
  mockSupabaseClient,
} from '@/test/utils';

vi.mock('@/lib/services/auth-service', () => ({
  authService: {
    getSession: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock('@/lib/api/types', () => ({
  ApiResponseHelper: {
    success: vi.fn((data) => new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })),
    forbidden: vi.fn((message, details) => new Response(JSON.stringify({
      success: false,
      error: message,
      details: details ?? null,
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })),
    unauthorized: vi.fn((message) => new Response(JSON.stringify({
      success: false,
      error: message,
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })),
    badRequest: vi.fn((message, details) => new Response(JSON.stringify({
      success: false,
      error: message,
      details: details ?? null,
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })),
    internalError: vi.fn((message) => new Response(JSON.stringify({
      success: false,
      error: message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })),
  },
}));

vi.mock('@/lib/api/errors', () => ({
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public statusCode = 500) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

import { authService } from '@/lib/services/auth-service';
import { createServerClient } from '@/lib/supabase/server';
import { ApiResponseHelper } from '@/lib/api/types';

const mockAuthService = vi.mocked(authService);
const mockCreateServerClient = vi.mocked(createServerClient);
const mockApiResponseHelper = vi.mocked(ApiResponseHelper);

function createSelectQuery(result: { data: unknown; error: unknown }) {
  const query: any = {
    select: vi.fn(),
    eq: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockResolvedValue(result);

  return query;
}

function createReflectionQuery(result: { data: unknown; error: unknown }) {
  const query: any = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockResolvedValue(result);

  return query;
}

function createInsertQuery(result: { data: unknown; error: unknown }) {
  const query: any = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  };

  query.insert.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.single.mockResolvedValue(result);

  return query;
}

function createSingleQuery(result: { data: unknown; error: unknown }) {
  const query: any = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.single.mockResolvedValue(result);

  return query;
}

describe('Client API RBAC enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateServerClient.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.from.mockReset();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/client/reflections', () => {
    it('allows clients to fetch their reflections', async () => {
      mockAuthService.getSession.mockResolvedValue({ user: mockUser });

      mockSupabaseClient.from.mockReturnValue(createReflectionQuery({ data: [], error: null }));

      const request = new NextRequest('http://localhost:3000/api/client/reflections');
      const response = await getClientReflections(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockApiResponseHelper.success).toHaveBeenCalled();
    });

    it('rejects access from non-client roles', async () => {
      mockAuthService.getSession.mockResolvedValue({ user: mockCoachUser });

      const request = new NextRequest('http://localhost:3000/api/client/reflections');
      const response = await getClientReflections(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Client access required');
      expect(mockApiResponseHelper.forbidden).toHaveBeenCalled();
    });
  });

  describe('POST /api/client/reflections', () => {
    it('allows clients to create reflections', async () => {
      mockAuthService.getSession.mockResolvedValue({ user: mockUser });

      mockSupabaseClient.from.mockReturnValue(createInsertQuery({
        data: { id: 'reflection-1' },
        error: null,
      }));

      const request = new NextRequest('http://localhost:3000/api/client/reflections', {
        method: 'POST',
        body: JSON.stringify({ content: 'Great session' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await postClientReflections(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockApiResponseHelper.success).toHaveBeenCalled();
    });

    it('blocks reflection creation for non-clients', async () => {
      mockAuthService.getSession.mockResolvedValue({ user: mockCoachUser });

      const request = new NextRequest('http://localhost:3000/api/client/reflections', {
        method: 'POST',
        body: JSON.stringify({ content: 'Attempted entry' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await postClientReflections(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(mockApiResponseHelper.forbidden).toHaveBeenCalled();
    });
  });

  describe('GET /api/client/stats', () => {
    it('allows clients to view their stats', async () => {
      mockAuthService.getSession.mockResolvedValue({ user: mockUser });

      mockSupabaseClient.from
        .mockReturnValueOnce(createSelectQuery({ data: [], error: null }))
        .mockReturnValueOnce(createSelectQuery({ data: [], error: null }));

      const request = new NextRequest('http://localhost:3000/api/client/stats');
      const response = await getClientStats(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockApiResponseHelper.success).toHaveBeenCalled();
    });

    it('prevents coaches from accessing client stats', async () => {
      mockAuthService.getSession.mockResolvedValue({ user: mockCoachUser });

      const request = new NextRequest('http://localhost:3000/api/client/stats');
      const response = await getClientStats(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(mockApiResponseHelper.forbidden).toHaveBeenCalled();
    });
  });

  describe('GET /api/client/sessions/[id]/notes', () => {
    it('allows clients to read their own session notes', async () => {
      mockAuthService.getSession.mockResolvedValue({ user: mockUser });

      mockSupabaseClient.from
        .mockReturnValueOnce(createSingleQuery({
          data: {
            id: 'session-1',
            client_id: mockUser.id,
            status: 'completed',
          },
          error: null,
        }))
        .mockReturnValueOnce(createSingleQuery({
          data: {
            notes: 'Reflection',
            key_insights: [],
            action_items: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }));

      const request = new NextRequest('http://localhost:3000/api/client/sessions/session-1/notes');
      const response = await getClientSessionNotes(request, { params: Promise.resolve({ id: 'session-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockApiResponseHelper.success).toHaveBeenCalled();
    });

    it('allows administrators to review session notes', async () => {
      mockAuthService.getSession.mockResolvedValue({ user: mockAdminUser });

      mockSupabaseClient.from
        .mockReturnValueOnce(createSingleQuery({
          data: {
            id: 'session-1',
            client_id: mockUser.id,
            status: 'completed',
          },
          error: null,
        }))
        .mockReturnValueOnce(createSingleQuery({
          data: {
            notes: 'Admin review',
            key_insights: [],
            action_items: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }));

      const request = new NextRequest('http://localhost:3000/api/client/sessions/session-1/notes');
      const response = await getClientSessionNotes(request, { params: Promise.resolve({ id: 'session-1' }) });

      expect(response.status).toBe(200);
      expect(mockApiResponseHelper.success).toHaveBeenCalled();
    });

    it('prevents coaches from accessing client session notes', async () => {
      mockAuthService.getSession.mockResolvedValue({ user: mockCoachUser });

      const request = new NextRequest('http://localhost:3000/api/client/sessions/session-1/notes');
      const response = await getClientSessionNotes(request, { params: Promise.resolve({ id: 'session-1' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(mockApiResponseHelper.forbidden).toHaveBeenCalled();
    });
  });
});
