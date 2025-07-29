import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/sessions/route';
import { createMockSession, mockSupabaseClient } from '@/test/utils';
import { SessionService } from '@/lib/database';
import { validateRequestBody } from '@/lib/api/utils';
import { SessionNotificationService } from '@/lib/notifications/session-notifications';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient),
}));

// Mock database services
vi.mock('@/lib/database/sessions', () => ({
  SessionService: vi.fn().mockImplementation(() => ({
    getSession: vi.fn(),
    createSession: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
    getUserSessions: vi.fn(),
    getCoachSessions: vi.fn(),
    getSessionsByStatus: vi.fn(),
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })),
}));

// Get the mocked constructor
const MockedSessionService = vi.mocked(SessionService, true);

// Mock validation
vi.mock('@/lib/api/validation', () => ({
  validateRequestBody: vi.fn(),
  createSessionSchema: {},
  validateQuery: vi.fn(),
}));

// Get the mocked validation functions
const mockValidateRequestBody = vi.mocked(validateRequestBody, true);

// Mock notifications
vi.mock('@/lib/notifications/session-notifications', () => ({
  SessionNotificationService: vi.fn().mockImplementation(() => ({
    sendSessionConfirmation: vi.fn(),
  })),
}));

describe('/api/sessions', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'client',
  };

  const mockSession = createMockSession();

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  describe('POST /api/sessions', () => {
    it('creates a new session successfully', async () => {
      const mockCreate = vi.fn().mockResolvedValue(mockSession);
      MockedSessionService.mockImplementation(() => ({
        create: mockCreate,
      }));

      mockValidateRequestBody.mockResolvedValue({
        title: 'Test Session',
        description: 'Test description',
        coachId: 'coach-id',
        scheduledAt: new Date().toISOString(),
        duration: 60,
        type: 'individual',
      });

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Session',
          description: 'Test description',
          coachId: 'coach-id',
          scheduledAt: new Date().toISOString(),
          duration: 60,
          type: 'individual',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSession);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Session',
          clientId: mockUser.id,
        })
      );
    });

    it('returns 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 for invalid request body', async () => {
      mockValidateRequestBody.mockRejectedValue(new Error('Title is required'));

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Title is required');
    });

    it('sends confirmation notification after creating session', async () => {
      const mockCreate = vi.fn().mockResolvedValue(mockSession);
      MockedSessionService.mockImplementation(() => ({
        create: mockCreate,
      }));

      const mockSendConfirmation = vi.fn();
      SessionNotificationService.mockImplementation(() => ({
        sendSessionConfirmation: mockSendConfirmation,
      }));

      mockValidateRequestBody.mockResolvedValue({
        title: 'Test Session',
        coachId: 'coach-id',
        scheduledAt: new Date().toISOString(),
        duration: 60,
        type: 'individual',
      });

      const request = new NextRequest('http://localhost:3000/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Session',
          coachId: 'coach-id',
          scheduledAt: new Date().toISOString(),
          duration: 60,
          type: 'individual',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockSendConfirmation).toHaveBeenCalledWith(mockSession);
    });
  });

  describe('GET /api/sessions', () => {
    it('returns user sessions successfully', async () => {
      const mockSessions = [mockSession, createMockSession({ id: 'session-2' })];
      
      const mockFindMany = vi.fn().mockResolvedValue({
        data: mockSessions,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      });
      MockedSessionService.mockImplementation(() => ({
        findMany: mockFindMany,
      }));

      const request = new NextRequest('http://localhost:3000/api/sessions?page=1&limit=10');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.total).toBe(2);
    });

    it('filters sessions by status', async () => {
      const mockFindMany = vi.fn().mockResolvedValue({
        data: [mockSession],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
      MockedSessionService.mockImplementation(() => ({
        findMany: mockFindMany,
      }));

      const request = new NextRequest('http://localhost:3000/api/sessions?status=scheduled');

      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'scheduled',
        })
      );
    });

    it('returns 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/sessions');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('handles database errors gracefully', async () => {
      const mockFindMany = vi.fn().mockRejectedValue(new Error('Database error'));
      MockedSessionService.mockImplementation(() => ({
        findMany: mockFindMany,
      }));

      const request = new NextRequest('http://localhost:3000/api/sessions');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Database error');
    });
  });
});