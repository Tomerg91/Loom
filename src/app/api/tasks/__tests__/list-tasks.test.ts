import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const coachId = '11111111-1111-1111-1111-111111111111';
const clientId = '22222222-2222-2222-2222-222222222222';

type TestUser = {
  id: string;
  role: 'coach' | 'admin' | 'client';
};

let currentUser: TestUser = {
  id: coachId,
  role: 'coach',
};

const hoisted = vi.hoisted(() => {
  const HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    INTERNAL_SERVER_ERROR: 500,
  } as const;

  const mockTaskService = {
    listTasks: vi.fn(),
  };

  const mockCreateSuccessResponse = vi.fn(
    (data, message = 'Success', status = HTTP_STATUS.OK) =>
      new Response(JSON.stringify({ success: true, data, message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  );

  const mockCreateErrorResponse = vi.fn(
    (error, status = HTTP_STATUS.BAD_REQUEST) => {
      const message =
        typeof error === 'string' ? error : (error?.message ?? 'Error');
      return new Response(JSON.stringify({ success: false, error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  );

  const mockParseTaskListQueryParams = vi.fn();
  const mockGetUser = vi.fn();
  const mockSingle = vi.fn();
  const mockEq = vi.fn(() => ({ single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));

  const mockSupabaseClient = {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  } as const;

  const mockLogger = {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };

  return {
    HTTP_STATUS,
    mockTaskService,
    mockCreateSuccessResponse,
    mockCreateErrorResponse,
    mockParseTaskListQueryParams,
    mockSupabaseClient,
    mockGetUser,
    mockSingle,
    mockLogger,
  };
});

vi.mock('@/modules/sessions/server/task-service', () => ({
  TaskService: vi.fn(() => hoisted.mockTaskService),
  TaskServiceError: class MockTaskServiceError extends Error {
    status: number;
    constructor(
      message: string,
      status = hoisted.HTTP_STATUS.INTERNAL_SERVER_ERROR
    ) {
      super(message);
      this.status = status;
      this.name = 'TaskServiceError';
    }
  },
}));

vi.mock('@/lib/api/utils', () => ({
  HTTP_STATUS: hoisted.HTTP_STATUS,
  createSuccessResponse: hoisted.mockCreateSuccessResponse,
  createErrorResponse: hoisted.mockCreateErrorResponse,
  validateRequestBody: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => hoisted.mockSupabaseClient),
}));

vi.mock('@/modules/platform/logging/logger', () => ({
  createLogger: vi.fn(() => hoisted.mockLogger),
}));

vi.mock('@/modules/platform/security', () => ({
  ForbiddenSupabaseHttpError: class ForbiddenSupabaseHttpError extends Error {},
  ensureNoSupabaseHttpUsage: vi.fn(),
}));

vi.mock('@/modules/tasks/api/query-helpers', () => ({
  parseTaskListQueryParams: hoisted.mockParseTaskListQueryParams,
}));

const {
  HTTP_STATUS,
  mockTaskService,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockParseTaskListQueryParams,
  mockGetUser,
  mockSingle,
} = hoisted;

import { GET } from '../route';
import { TaskServiceError } from '@/modules/sessions/server/task-service';

const createNextRequest = (url: string, init?: RequestInit) =>
  new NextRequest(new Request(url, init));

describe('GET /api/tasks - List Tasks', () => {
  const sampleTasks = [
    {
      id: '33333333-3333-3333-3333-333333333333',
      coachId: coachId,
      clientId: clientId,
      category: null,
      title: 'Complete worksheet',
      description: 'Finish the weekly reflection worksheet.',
      priority: 'MEDIUM',
      status: 'PENDING',
      visibilityToCoach: true,
      dueDate: new Date('2025-12-31').toISOString(),
      recurrenceRule: null,
      archivedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      instances: [],
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      coachId: coachId,
      clientId: clientId,
      category: null,
      title: 'Weekly reflection',
      description: null,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      visibilityToCoach: true,
      dueDate: new Date('2025-11-30').toISOString(),
      recurrenceRule: null,
      archivedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      instances: [],
    },
  ];

  const listResponse = {
    data: sampleTasks,
    pagination: {
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
    },
  };

  beforeEach(() => {
    Object.values(mockTaskService).forEach(fn => fn.mockReset());
    mockCreateSuccessResponse.mockClear();
    mockCreateErrorResponse.mockClear();
    mockParseTaskListQueryParams.mockReset();
    mockGetUser.mockReset();
    mockSingle.mockReset();

    currentUser = {
      id: coachId,
      role: 'coach',
    };

    mockGetUser.mockImplementation(async () => ({
      data: { user: { id: currentUser.id } },
      error: null,
    }));
    mockSingle.mockImplementation(async () => ({
      data: { role: currentUser.role },
      error: null,
    }));
  });

  it('returns paginated tasks for the authenticated coach', async () => {
    mockParseTaskListQueryParams.mockReturnValue({
      success: true,
      data: {
        page: 1,
        pageSize: 20,
      },
    });
    mockTaskService.listTasks.mockResolvedValue(listResponse);

    const request = createNextRequest(
      'http://localhost/api/tasks?page=1&pageSize=20',
      { method: 'GET' }
    );

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(mockTaskService.listTasks).toHaveBeenCalledWith(
      { id: coachId, role: 'coach' },
      expect.objectContaining({
        coachId: coachId,
        page: 1,
        pageSize: 20,
      })
    );
    expect(payload.data).toEqual(listResponse);
    expect(payload.data.data).toHaveLength(2);
  });

  it('returns empty list when coach has no tasks', async () => {
    const emptyResponse = {
      data: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      },
    };

    mockParseTaskListQueryParams.mockReturnValue({
      success: true,
      data: {
        page: 1,
        pageSize: 20,
      },
    });
    mockTaskService.listTasks.mockResolvedValue(emptyResponse);

    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'GET',
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(payload.data.data).toEqual([]);
    expect(payload.data.pagination.total).toBe(0);
  });

  it('filters tasks by status', async () => {
    const pendingTasks = {
      data: [sampleTasks[0]],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    };

    mockParseTaskListQueryParams.mockReturnValue({
      success: true,
      data: {
        page: 1,
        pageSize: 20,
        status: ['PENDING'],
      },
    });
    mockTaskService.listTasks.mockResolvedValue(pendingTasks);

    const request = createNextRequest(
      'http://localhost/api/tasks?status=PENDING',
      { method: 'GET' }
    );

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(mockTaskService.listTasks).toHaveBeenCalledWith(
      { id: coachId, role: 'coach' },
      expect.objectContaining({
        coachId: coachId,
        status: ['PENDING'],
      })
    );
    expect(payload.data.data).toHaveLength(1);
    expect(payload.data.data[0].status).toBe('PENDING');
  });

  it('filters tasks by priority', async () => {
    const highPriorityTasks = {
      data: [sampleTasks[1]],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    };

    mockParseTaskListQueryParams.mockReturnValue({
      success: true,
      data: {
        page: 1,
        pageSize: 20,
        priority: ['HIGH'],
      },
    });
    mockTaskService.listTasks.mockResolvedValue(highPriorityTasks);

    const request = createNextRequest(
      'http://localhost/api/tasks?priority=HIGH',
      { method: 'GET' }
    );

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(mockTaskService.listTasks).toHaveBeenCalledWith(
      { id: coachId, role: 'coach' },
      expect.objectContaining({
        priority: ['HIGH'],
      })
    );
    expect(payload.data.data[0].priority).toBe('HIGH');
  });

  it('filters tasks by clientId', async () => {
    mockParseTaskListQueryParams.mockReturnValue({
      success: true,
      data: {
        page: 1,
        pageSize: 20,
        clientId: clientId,
      },
    });
    mockTaskService.listTasks.mockResolvedValue(listResponse);

    const request = createNextRequest(
      `http://localhost/api/tasks?clientId=${clientId}`,
      { method: 'GET' }
    );

    const response = await GET(request);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(mockTaskService.listTasks).toHaveBeenCalledWith(
      { id: coachId, role: 'coach' },
      expect.objectContaining({
        clientId: clientId,
      })
    );
  });

  it('supports pagination with custom page size', async () => {
    mockParseTaskListQueryParams.mockReturnValue({
      success: true,
      data: {
        page: 2,
        pageSize: 10,
      },
    });
    mockTaskService.listTasks.mockResolvedValue({
      data: sampleTasks,
      pagination: {
        page: 2,
        pageSize: 10,
        total: 25,
        totalPages: 3,
      },
    });

    const request = createNextRequest(
      'http://localhost/api/tasks?page=2&pageSize=10',
      { method: 'GET' }
    );

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(mockTaskService.listTasks).toHaveBeenCalledWith(
      { id: coachId, role: 'coach' },
      expect.objectContaining({
        page: 2,
        pageSize: 10,
      })
    );
    expect(payload.data.pagination.page).toBe(2);
    expect(payload.data.pagination.totalPages).toBe(3);
  });

  it('includes archived tasks when requested', async () => {
    mockParseTaskListQueryParams.mockReturnValue({
      success: true,
      data: {
        page: 1,
        pageSize: 20,
        includeArchived: true,
      },
    });
    mockTaskService.listTasks.mockResolvedValue(listResponse);

    const request = createNextRequest(
      'http://localhost/api/tasks?includeArchived=true',
      { method: 'GET' }
    );

    const response = await GET(request);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(mockTaskService.listTasks).toHaveBeenCalledWith(
      { id: coachId, role: 'coach' },
      expect.objectContaining({
        includeArchived: true,
      })
    );
  });

  it('returns validation error for invalid query parameters', async () => {
    mockParseTaskListQueryParams.mockReturnValue({
      success: false,
      error: { message: 'Invalid page number' },
    });

    const request = createNextRequest(
      'http://localhost/api/tasks?page=-1',
      { method: 'GET' }
    );

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(payload.success).toBe(false);
    expect(mockTaskService.listTasks).not.toHaveBeenCalled();
  });

  it('returns unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'GET',
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain('Authentication required');
    expect(mockTaskService.listTasks).not.toHaveBeenCalled();
  });

  it('returns forbidden when client tries to list tasks', async () => {
    currentUser = { id: clientId, role: 'client' };
    mockGetUser.mockResolvedValue({
      data: { user: { id: clientId } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { role: 'client' },
      error: null,
    });

    mockParseTaskListQueryParams.mockReturnValue({
      success: true,
      data: {
        page: 1,
        pageSize: 20,
      },
    });

    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'GET',
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain('Access denied');
    expect(mockTaskService.listTasks).not.toHaveBeenCalled();
  });

  it('allows admin to list all tasks', async () => {
    const adminId = '99999999-9999-9999-9999-999999999999';
    currentUser = { id: adminId, role: 'admin' };
    mockGetUser.mockResolvedValue({
      data: { user: { id: adminId } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    });

    mockParseTaskListQueryParams.mockReturnValue({
      success: true,
      data: {
        page: 1,
        pageSize: 20,
        coachId: coachId,
      },
    });
    mockTaskService.listTasks.mockResolvedValue(listResponse);

    const request = createNextRequest(
      `http://localhost/api/tasks?coachId=${coachId}`,
      { method: 'GET' }
    );

    const response = await GET(request);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(mockTaskService.listTasks).toHaveBeenCalledWith(
      { id: adminId, role: 'admin' },
      expect.objectContaining({
        coachId: coachId,
      })
    );
  });

  it('handles service errors gracefully', async () => {
    mockParseTaskListQueryParams.mockReturnValue({
      success: true,
      data: {
        page: 1,
        pageSize: 20,
      },
    });
    mockTaskService.listTasks.mockRejectedValue(
      new TaskServiceError('Database error', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    );

    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'GET',
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('Database error');
  });

  it('handles unexpected errors', async () => {
    mockParseTaskListQueryParams.mockReturnValue({
      success: true,
      data: {
        page: 1,
        pageSize: 20,
      },
    });
    mockTaskService.listTasks.mockRejectedValue(
      new Error('Unexpected error')
    );

    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'GET',
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('Internal server error');
  });
});
