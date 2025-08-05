import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/notifications/route';
import { POST as MarkAsRead } from '@/app/api/notifications/[id]/read/route';
import { createMockNotification, mockSupabaseClient } from '@/test/utils';
import { NotificationService } from '@/lib/database';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient),
}));

// Mock database services
vi.mock('@/lib/database', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    getUserNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    createNotification: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  })),
}));

// Get the mocked constructor
const MockedNotificationService = vi.mocked(NotificationService, true);

describe('/api/notifications', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'client',
  };

  const mockNotifications = [
    createMockNotification({ id: '1', readAt: null }),
    createMockNotification({ id: '2', readAt: new Date().toISOString() }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  describe('GET /api/notifications', () => {
    it('returns user notifications successfully', async () => {
      const mockFindMany = vi.fn().mockResolvedValue({
        data: mockNotifications,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          unreadCount: 1,
        },
      });
      MockedNotificationService.mockImplementation(() => ({
        findMany: mockFindMany,
      }));

      const request = new NextRequest('http://localhost:3000/api/notifications?page=1&limit=20');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.unreadCount).toBe(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          page: 1,
          limit: 20,
        })
      );
    });

    it('filters notifications by read status', async () => {
      const mockFindMany = vi.fn().mockResolvedValue({
        data: [mockNotifications[0]],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          unreadCount: 1,
        },
      });
      MockedNotificationService.mockImplementation(() => ({
        findMany: mockFindMany,
      }));

      const request = new NextRequest('http://localhost:3000/api/notifications?unreadOnly=true');

      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          unreadOnly: true,
        })
      );
    });

    it('sorts notifications by creation date', async () => {
      const mockFindMany = vi.fn().mockResolvedValue({
        data: mockNotifications,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          unreadCount: 1,
        },
      });
      MockedNotificationService.mockImplementation(() => ({
        findMany: mockFindMany,
      }));

      const request = new NextRequest('http://localhost:3000/api/notifications?sortOrder=desc');

      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          sortOrder: 'desc',
        })
      );
    });

    it('returns 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/notifications');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/notifications', () => {
    it('creates a new notification successfully', async () => {
      const mockNotification = createMockNotification();
      
      const mockCreate = vi.fn().mockResolvedValue(mockNotification);
      MockedNotificationService.mockImplementation(() => ({
        create: mockCreate,
      }));

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'target-user-id',
          type: 'session_reminder',
          title: 'Test Notification',
          message: 'Test message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockNotification);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'target-user-id',
          type: 'session_reminder',
          title: 'Test Notification',
          message: 'Test message',
        })
      );
    });

    it('validates required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('required');
    });

    it('only allows admin to create notifications for other users', async () => {
      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'other-user-id',
          type: 'system_update',
          title: 'System Update',
          message: 'System will be down for maintenance',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Insufficient permissions');
    });
  });

  describe('POST /api/notifications/[id]/read', () => {
    it('marks notification as read successfully', async () => {
      const mockMarkAsRead = vi.fn().mockResolvedValue(true);
      MockedNotificationService.mockImplementation(() => ({
        markAsRead: mockMarkAsRead,
      }));

      const response = await MarkAsRead(
        new NextRequest('http://localhost:3000/api/notifications/test-id/read', {
          method: 'POST',
        }),
        { params: { id: 'test-id' } }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockMarkAsRead).toHaveBeenCalledWith('test-id', mockUser.id);
    });

    it('returns 404 for non-existent notification', async () => {
      const mockMarkAsRead = vi.fn().mockResolvedValue(false);
      MockedNotificationService.mockImplementation(() => ({
        markAsRead: mockMarkAsRead,
      }));

      const response = await MarkAsRead(
        new NextRequest('http://localhost:3000/api/notifications/invalid-id/read', {
          method: 'POST',
        }),
        { params: { id: 'invalid-id' } }
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Notification not found');
    });

    it('returns 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const response = await MarkAsRead(
        new NextRequest('http://localhost:3000/api/notifications/test-id/read', {
          method: 'POST',
        }),
        { params: { id: 'test-id' } }
      );
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });
  });
});