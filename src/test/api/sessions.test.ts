import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '@/app/api/sessions/route';
import { createMockSession, mockSupabaseClient } from '@/test/utils';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient),
}));

// Mock database services
vi.mock('@/lib/database/sessions', () => ({
  SessionService: vi.fn().mockImplementation(() => ({
    create: vi.fn(),
    findMany: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })),
}));

// Mock validation
vi.mock('@/lib/api/validation', () => ({
  validateRequestBody: vi.fn(),
}));

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
      const sessionService = require('@/lib/database/sessions').SessionService;
      const mockCreate = vi.fn().mockResolvedValue(mockSession);
      sessionService.mockImplementation(() => ({
        create: mockCreate,
      }));

      const validateRequestBody = require('@/lib/api/validation').validateRequestBody;
      validateRequestBody.mockResolvedValue({
        title: 'Test Session',
        description: 'Test description',
        coachId: 'coach-id',
        scheduledAt: new Date().toISOString(),
        duration: 60,
        type: 'individual',
      });

      const request = new Request('http://localhost:3000/api/sessions', {
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

      const request = new Request('http://localhost:3000/api/sessions', {
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
      const validateRequestBody = require('@/lib/api/validation').validateRequestBody;
      validateRequestBody.mockRejectedValue(new Error('Title is required'));

      const request = new Request('http://localhost:3000/api/sessions', {
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
      const sessionService = require('@/lib/database/sessions').SessionService;
      const mockCreate = vi.fn().mockResolvedValue(mockSession);
      sessionService.mockImplementation(() => ({
        create: mockCreate,
      }));

      const notificationService = require('@/lib/notifications/session-notifications').SessionNotificationService;
      const mockSendConfirmation = vi.fn();
      notificationService.mockImplementation(() => ({
        sendSessionConfirmation: mockSendConfirmation,
      }));

      const validateRequestBody = require('@/lib/api/validation').validateRequestBody;
      validateRequestBody.mockResolvedValue({
        title: 'Test Session',
        coachId: 'coach-id',
        scheduledAt: new Date().toISOString(),
        duration: 60,
        type: 'individual',
      });

      const request = new Request('http://localhost:3000/api/sessions', {
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
      
      const sessionService = require('@/lib/database/sessions').SessionService;
      const mockFindMany = vi.fn().mockResolvedValue({
        data: mockSessions,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      });
      sessionService.mockImplementation(() => ({
        findMany: mockFindMany,
      }));

      const request = new Request('http://localhost:3000/api/sessions?page=1&limit=10');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.total).toBe(2);
    });

    it('filters sessions by status', async () => {
      const sessionService = require('@/lib/database/sessions').SessionService;
      const mockFindMany = vi.fn().mockResolvedValue({
        data: [mockSession],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
      sessionService.mockImplementation(() => ({
        findMany: mockFindMany,
      }));

      const request = new Request('http://localhost:3000/api/sessions?status=scheduled');

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

      const request = new Request('http://localhost:3000/api/sessions');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('handles database errors gracefully', async () => {
      const sessionService = require('@/lib/database/sessions').SessionService;
      const mockFindMany = vi.fn().mockRejectedValue(new Error('Database error'));
      sessionService.mockImplementation(() => ({
        findMany: mockFindMany,
      }));

      const request = new Request('http://localhost:3000/api/sessions');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Database error');
    });
  });
});