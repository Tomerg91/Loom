import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const coachId = '11111111-1111-1111-1111-111111111111';
const clientId = '22222222-2222-2222-2222-222222222222';
const taskId = '33333333-3333-3333-3333-333333333333';

type TestUser = {
  id: string;
  email: string;
  role: 'coach' | 'admin' | 'client';
  status: string;
};

let currentUser: TestUser = {
  id: coachId,
  email: 'coach@example.com',
  role: 'coach',
  status: 'active',
};

const hoisted = vi.hoisted(() => {
  const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  } as const;

  const mockTaskService = {
    createTask: vi.fn(),
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

  const mockValidateRequestBody = vi.fn();
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
    mockValidateRequestBody,
    mockSupabaseClient,
    mockGetUser,
    mockSingle,
    mockSelect,
    mockEq,
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
  validateRequestBody: hoisted.mockValidateRequestBody,
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
  parseTaskListQueryParams: vi.fn(),
}));

const {
  HTTP_STATUS,
  mockTaskService,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockValidateRequestBody,
  mockGetUser,
  mockSingle,
} = hoisted;

import { POST } from '../route';
import { TaskServiceError } from '@/modules/sessions/server/task-service';

const createNextRequest = (url: string, init?: RequestInit) =>
  new NextRequest(new Request(url, init));

describe('POST /api/tasks - Create Task', () => {
  const sampleTask = {
    id: taskId,
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
  };

  beforeEach(() => {
    Object.values(mockTaskService).forEach(fn => fn.mockReset());
    mockCreateSuccessResponse.mockClear();
    mockCreateErrorResponse.mockClear();
    mockValidateRequestBody.mockReset();
    mockGetUser.mockReset();
    mockSingle.mockReset();

    currentUser = {
      id: coachId,
      email: 'coach@example.com',
      role: 'coach',
      status: 'active',
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

  it('creates a task with all required fields', async () => {
    const dueDate = new Date('2025-12-31');
    mockValidateRequestBody.mockReturnValue({
      success: true,
      data: {
        title: 'Complete worksheet',
        clientId,
        description: 'Finish the weekly reflection worksheet.',
        priority: 'MEDIUM',
        dueDate,
      },
    });
    mockTaskService.createTask.mockResolvedValue(sampleTask);

    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Complete worksheet',
        clientId,
        description: 'Finish the weekly reflection worksheet.',
        priority: 'MEDIUM',
        dueDate: dueDate.toISOString(),
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(mockTaskService.createTask).toHaveBeenCalledWith(
      { id: currentUser.id, role: 'coach' },
      expect.objectContaining({
        coachId: currentUser.id,
        clientId,
        title: 'Complete worksheet',
        description: 'Finish the weekly reflection worksheet.',
        priority: 'MEDIUM',
      })
    );
    expect(payload.data).toEqual(sampleTask);
    expect(payload.message).toBe('Task created successfully');
  });

  it('creates a task with minimal required fields only', async () => {
    const minimalTask = {
      ...sampleTask,
      description: null,
      priority: 'MEDIUM',
      dueDate: null,
    };

    mockValidateRequestBody.mockReturnValue({
      success: true,
      data: {
        title: 'Simple task',
        clientId,
      },
    });
    mockTaskService.createTask.mockResolvedValue(minimalTask);

    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Simple task',
        clientId,
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(mockTaskService.createTask).toHaveBeenCalledWith(
      { id: currentUser.id, role: 'coach' },
      expect.objectContaining({
        coachId: currentUser.id,
        clientId,
        title: 'Simple task',
      })
    );
    expect(payload.success).toBe(true);
  });

  it('returns validation error for empty title', async () => {
    mockValidateRequestBody.mockReturnValue({
      success: false,
      error: { message: 'Title is required' },
    });

    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '',
        clientId,
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(payload.success).toBe(false);
    expect(mockTaskService.createTask).not.toHaveBeenCalled();
  });

  it('returns validation error for title exceeding max length', async () => {
    const longTitle = 'a'.repeat(501);
    mockValidateRequestBody.mockReturnValue({
      success: false,
      error: { message: 'Title must be 500 characters or less' },
    });

    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: longTitle,
        clientId,
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(payload.success).toBe(false);
    expect(mockTaskService.createTask).not.toHaveBeenCalled();
  });

  it('returns validation error for missing clientId', async () => {
    mockValidateRequestBody.mockReturnValue({
      success: false,
      error: { message: 'Client ID is required' },
    });

    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Task without client',
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(payload.success).toBe(false);
    expect(mockTaskService.createTask).not.toHaveBeenCalled();
  });

  it('returns validation error for invalid clientId UUID', async () => {
    mockValidateRequestBody.mockReturnValue({
      success: false,
      error: { message: 'Invalid client ID format' },
    });

    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Task with bad UUID',
        clientId: 'not-a-uuid',
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(payload.success).toBe(false);
    expect(mockTaskService.createTask).not.toHaveBeenCalled();
  });

  it('returns unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Task',
        clientId,
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain('Authentication required');
    expect(mockTaskService.createTask).not.toHaveBeenCalled();
  });

  it('returns forbidden when client tries to create task', async () => {
    currentUser = { ...currentUser, id: clientId, role: 'client' };
    mockGetUser.mockResolvedValue({
      data: { user: { id: clientId } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { role: 'client' },
      error: null,
    });

    mockValidateRequestBody.mockReturnValue({
      success: true,
      data: {
        title: 'Task',
        clientId: coachId,
      },
    });

    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Task',
        clientId: coachId,
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain('Access denied');
    expect(mockTaskService.createTask).not.toHaveBeenCalled();
  });

  it('handles invalid JSON body', async () => {
    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json{',
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(payload.error).toContain('Invalid JSON body');
    expect(mockTaskService.createTask).not.toHaveBeenCalled();
  });

  it('handles service errors with custom status codes', async () => {
    mockValidateRequestBody.mockReturnValue({
      success: true,
      data: {
        title: 'Task',
        clientId,
      },
    });
    mockTaskService.createTask.mockRejectedValue(
      new TaskServiceError('Client not found', HTTP_STATUS.NOT_FOUND)
    );

    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Task',
        clientId,
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('Client not found');
  });

  it('handles unexpected errors gracefully', async () => {
    mockValidateRequestBody.mockReturnValue({
      success: true,
      data: {
        title: 'Task',
        clientId,
      },
    });
    mockTaskService.createTask.mockRejectedValue(
      new Error('Unexpected database error')
    );

    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Task',
        clientId,
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('Internal server error');
  });

  it('automatically assigns coachId from authenticated user', async () => {
    mockValidateRequestBody.mockReturnValue({
      success: true,
      data: {
        title: 'Task',
        clientId,
      },
    });
    mockTaskService.createTask.mockResolvedValue(sampleTask);

    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Task',
        clientId,
      }),
    });

    await POST(request);

    expect(mockTaskService.createTask).toHaveBeenCalledWith(
      { id: coachId, role: 'coach' },
      expect.objectContaining({
        coachId: coachId,
      })
    );
  });

  it('allows admin to create task for any coach', async () => {
    const adminId = '99999999-9999-9999-9999-999999999999';
    currentUser = {
      id: adminId,
      email: 'admin@example.com',
      role: 'admin',
      status: 'active',
    };
    mockGetUser.mockResolvedValue({
      data: { user: { id: adminId } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { role: 'admin' },
      error: null,
    });

    mockValidateRequestBody.mockReturnValue({
      success: true,
      data: {
        title: 'Admin task',
        clientId,
        coachId: coachId,
      },
    });
    mockTaskService.createTask.mockResolvedValue(sampleTask);

    const request = createNextRequest('http://localhost/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Admin task',
        clientId,
        coachId: coachId,
      }),
    });

    const response = await POST(request);
    
    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(mockTaskService.createTask).toHaveBeenCalledWith(
      { id: adminId, role: 'admin' },
      expect.objectContaining({
        title: 'Admin task',
        clientId,
      })
    );
  });
});
