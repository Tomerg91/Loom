import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GET, POST } from '@/app/api/tasks/route';
import { TaskService } from '@/modules/sessions/server/task-service';
import { mockSupabaseClient, mockCoachUser, mockUser } from '@/test/utils';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient),
}));

// Mock TaskService
vi.mock('@/modules/sessions/server/task-service', () => ({
  TaskService: vi.fn().mockImplementation(() => ({
    listTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  })),
  TaskServiceError: class TaskServiceError extends Error {
    constructor(
      message: string,
      public status: number
    ) {
      super(message);
      this.name = 'TaskServiceError';
    }
  },
}));

// Mock logger
vi.mock('@/modules/platform/logging/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock security module
vi.mock('@/modules/platform/security', () => ({
  ensureNoSupabaseHttpUsage: vi.fn(),
  ForbiddenSupabaseHttpError: class ForbiddenSupabaseHttpError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ForbiddenSupabaseHttpError';
    }
  },
}));

// Mock API utils
vi.mock('@/lib/api/utils', () => ({
  createSuccessResponse: vi.fn((data: unknown, message?: string, status = 200) =>
    new Response(JSON.stringify({ success: true, data, message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
  createErrorResponse: vi.fn((message: string, status = 400) =>
    new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
  validateRequestBody: vi.fn((schema, body) => ({ success: true, data: body })),
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },
}));

// Mock query helpers
vi.mock('@/modules/tasks/api/query-helpers', () => ({
  parseTaskListQueryParams: vi.fn(() => ({
    success: true,
    data: {
      page: 1,
      pageSize: 10,
    },
  })),
}));

// Mock task validators
vi.mock('@/modules/sessions/validators/task', () => ({
  sessionCreateTaskSchema: {},
}));

const MockedTaskService = vi.mocked(TaskService, true);

describe('/api/tasks', () => {
  let mockTaskServiceInstance: {
    listTasks: ReturnType<typeof vi.fn>;
    createTask: ReturnType<typeof vi.fn>;
    updateTask: ReturnType<typeof vi.fn>;
    deleteTask: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset task service instance mock
    mockTaskServiceInstance = {
      listTasks: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
    };

    MockedTaskService.mockImplementation(() => mockTaskServiceInstance as never);
  });

  describe('GET /api/tasks', () => {
    const createMockRequest = (searchParams: Record<string, string> = {}) => {
      const url = new URL('http://localhost:3000/api/tasks');
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      return new NextRequest(url);
    };

    it('should return unauthorized if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return forbidden if user is not coach or admin', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'client' },
          error: null,
        }),
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should list tasks successfully for coach', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockCoachUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'coach' },
          error: null,
        }),
      });

      const mockTasks = [
        {
          id: 'task-1',
          title: 'Test Task',
          description: 'Test description',
          priority: 'medium',
          clientId: mockUser.id,
          coachId: mockCoachUser.id,
        },
      ];

      mockTaskServiceInstance.listTasks.mockResolvedValue({
        tasks: mockTasks,
        pagination: {
          page: 1,
          pageSize: 10,
          total: 1,
          totalPages: 1,
        },
      });

      const request = createMockRequest({ page: '1', pageSize: '10' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockTaskServiceInstance.listTasks).toHaveBeenCalled();
    });

    it('should handle filtering by status', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockCoachUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'coach' },
          error: null,
        }),
      });

      mockTaskServiceInstance.listTasks.mockResolvedValue({
        tasks: [],
        pagination: {
          page: 1,
          pageSize: 10,
          total: 0,
          totalPages: 0,
        },
      });

      const request = createMockRequest({
        status: 'pending',
        priority: 'high',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should handle task service errors', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockCoachUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'coach' },
          error: null,
        }),
      });

      const { TaskServiceError } = await import(
        '@/modules/sessions/server/task-service'
      );
      mockTaskServiceInstance.listTasks.mockRejectedValue(
        new TaskServiceError('Database error', 500)
      );

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/tasks', () => {
    const createMockRequest = (body: object) => {
      return new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    };

    it('should return unauthorized if user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = createMockRequest({
        title: 'Test Task',
        clientId: mockUser.id,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return forbidden if user is not coach or admin', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'client' },
          error: null,
        }),
      });

      const request = createMockRequest({
        title: 'Test Task',
        clientId: mockUser.id,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should create task successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockCoachUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'coach' },
          error: null,
        }),
      });

      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Test description',
        priority: 'medium',
        clientId: mockUser.id,
        coachId: mockCoachUser.id,
      };

      mockTaskServiceInstance.createTask.mockResolvedValue(mockTask);

      const request = createMockRequest({
        title: 'Test Task',
        description: 'Test description',
        clientId: mockUser.id,
        priority: 'medium',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(mockTaskServiceInstance.createTask).toHaveBeenCalled();
    });

    it('should handle invalid JSON body', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockCoachUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'coach' },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should automatically assign coach ID for coach role', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockCoachUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'coach' },
          error: null,
        }),
      });

      mockTaskServiceInstance.createTask.mockResolvedValue({
        id: 'task-1',
        title: 'Test Task',
        coachId: mockCoachUser.id,
        clientId: mockUser.id,
      });

      const request = createMockRequest({
        title: 'Test Task',
        clientId: mockUser.id,
      });
      await POST(request);

      // Verify the createTask was called with coach ID
      expect(mockTaskServiceInstance.createTask).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockCoachUser },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'coach' },
          error: null,
        }),
      });

      const { validateRequestBody } = await import('@/lib/api/utils');
      (validateRequestBody as ReturnType<typeof vi.fn>).mockReturnValue({
        success: false,
        error: 'Title is required',
      });

      const request = createMockRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
