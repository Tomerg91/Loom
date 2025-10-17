import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const coachId = '8d8b9b1d-9a9e-4d7a-84fd-1234567890ab';
const clientId = '4c0c5d6e-7f8a-4b1c-9d2e-abcdefabcdef';
const taskId = 'b1e4d6c7-2f3a-4a5b-8c9d-0123456789ab';

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
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  } as const;

  const mockTaskService = {
    createTask: vi.fn(),
    listTasks: vi.fn(),
    getTaskById: vi.fn(),
    updateTask: vi.fn(),
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

  const mockRequireRole = vi.fn((role: string) => {
    return (
        handler: (
          user: typeof currentUser,
          request: NextRequest,
          ...rest: unknown[]
        ) => Promise<unknown>
      ) =>
      async (
        user: typeof currentUser,
        request: NextRequest,
        ...rest: unknown[]
      ) => {
        if (role === 'coach' && !['coach', 'admin'].includes(user.role)) {
          return mockCreateErrorResponse(
            `Access denied. Required role: ${role}`,
            HTTP_STATUS.FORBIDDEN
          );
        }
        return handler(user, request, ...rest);
      };
  });

  const mockRequireAuth = vi.fn(
    (
      handler: (
        user: typeof currentUser,
        request: NextRequest,
        ...rest: unknown[]
      ) => Promise<unknown>
    ) =>
      (request: NextRequest, ...rest: unknown[]) =>
        handler(currentUser, request, ...rest)
  );

  const mockWithErrorHandling = vi.fn(
    (handler: (request: NextRequest, ...rest: unknown[]) => Promise<unknown>) =>
      handler
  );

  const mockGetUser = vi.fn();
  const mockSingle = vi.fn();
  const mockEq = vi.fn(() => ({ single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));

  const mockSupabaseClient = {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  } as const;

  return {
    HTTP_STATUS,
    mockTaskService,
    mockCreateSuccessResponse,
    mockCreateErrorResponse,
    mockValidateRequestBody,
    mockRequireRole,
    mockRequireAuth,
    mockWithErrorHandling,
    mockSupabaseClient,
    mockGetUser,
    mockSingle,
    mockSelect,
    mockEq,
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
  requireRole: hoisted.mockRequireRole,
  requireAuth: hoisted.mockRequireAuth,
  withErrorHandling: hoisted.mockWithErrorHandling,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => hoisted.mockSupabaseClient),
}));

const {
  HTTP_STATUS,
  mockTaskService,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockValidateRequestBody,
  mockRequireRole,
  mockRequireAuth,
  mockWithErrorHandling,
  mockGetUser,
  mockSingle,
  mockSelect,
  mockEq,
} = hoisted;

import { GET as GET_TASK, PATCH } from '@/app/api/tasks/[taskId]/route';
import { POST, GET } from '@/app/api/tasks/route';
import { TaskServiceError } from '@/modules/sessions/server/task-service';

const createNextRequest = (url: string, init?: RequestInit) =>
  new NextRequest(new Request(url, init));

describe('Task API routes', () => {
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
    dueDate: new Date().toISOString(),
    recurrenceRule: null,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    instances: [],
  };

  const listResponse = {
    data: [sampleTask],
    pagination: {
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    },
  };

  beforeEach(() => {
    Object.values(mockTaskService).forEach(fn => fn.mockReset());
    mockCreateSuccessResponse.mockClear();
    mockCreateErrorResponse.mockClear();
    mockValidateRequestBody.mockReset();
    mockRequireRole.mockClear();
    mockRequireAuth.mockClear();
    mockWithErrorHandling.mockClear();

    mockGetUser.mockReset();
    mockSingle.mockReset();
    mockSelect.mockReset();
    mockEq.mockReset();

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
    mockEq.mockImplementation(() => ({ single: mockSingle }));
    mockSelect.mockImplementation(() => ({ eq: mockEq }));
  });

  describe('POST /api/tasks', () => {
    it('creates a task for the authenticated coach', async () => {
      const dueDate = new Date();
      mockValidateRequestBody.mockReturnValue({
        success: true,
        data: {
          title: 'Task title',
          clientId,
          dueDate,
        },
      });
      mockTaskService.createTask.mockResolvedValue(sampleTask);

      const request = createNextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const payload = await response.json();

      expect(response.status).toBe(HTTP_STATUS.CREATED);
      expect(mockTaskService.createTask).toHaveBeenCalledWith(
        { id: currentUser.id, role: 'coach' },
        expect.objectContaining({ coachId: currentUser.id, clientId })
      );
      expect(payload.data).toEqual(sampleTask);
    });

    it('returns validation errors from the request body', async () => {
      mockValidateRequestBody.mockReturnValue({
        success: false,
        error: { message: 'Validation failed' },
      });

      const request = createNextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const payload = await response.json();

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(payload.success).toBe(false);
      expect(mockTaskService.createTask).not.toHaveBeenCalled();
    });

    it('maps service errors to API responses', async () => {
      const dueDate = new Date();
      mockValidateRequestBody.mockReturnValue({
        success: true,
        data: {
          title: 'Task title',
          clientId,
          dueDate,
        },
      });
      mockTaskService.createTask.mockRejectedValue(
        new TaskServiceError('Access denied', HTTP_STATUS.FORBIDDEN)
      );

      const request = createNextRequest('http://localhost/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const payload = await response.json();

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(payload.success).toBe(false);
      expect(payload.error).toBe('Access denied');
    });
  });

  describe('GET /api/tasks', () => {
    it('returns paginated tasks for the coach', async () => {
      mockTaskService.listTasks.mockResolvedValue(listResponse);

      const request = createNextRequest(
        'http://localhost/api/tasks?page=1&pageSize=20',
        {
          method: 'GET',
        }
      );

      const response = await GET(request);
      const payload = await response.json();

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(mockTaskService.listTasks).toHaveBeenCalledWith(
        { id: currentUser.id, role: 'coach' },
        expect.objectContaining({ coachId: currentUser.id })
      );
      expect(payload.data).toEqual(listResponse);
    });

    it('prevents clients from accessing the coach list endpoint', async () => {
      currentUser = { ...currentUser, id: clientId, role: 'client' };
      const request = createNextRequest('http://localhost/api/tasks', {
        method: 'GET',
      });

      const response = await GET(request);
      const payload = await response.json();

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(payload.success).toBe(false);
      expect(mockTaskService.listTasks).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/tasks/[taskId]', () => {
    it('returns the task for an authorized client', async () => {
      currentUser = { ...currentUser, id: clientId, role: 'client' };
      mockTaskService.getTaskById.mockResolvedValue(sampleTask);

      const request = createNextRequest(
        `http://localhost/api/tasks/${taskId}`,
        { method: 'GET' }
      );
      const response = await GET_TASK(request, {
        params: Promise.resolve({ taskId }),
      });
      const payload = await response.json();

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(mockTaskService.getTaskById).toHaveBeenCalledWith(taskId, {
        id: clientId,
        role: 'client',
      });
      expect(payload.data).toEqual(sampleTask);
    });

    it('propagates not found errors from the service', async () => {
      mockTaskService.getTaskById.mockRejectedValue(
        new TaskServiceError('Task not found', HTTP_STATUS.NOT_FOUND)
      );

      const missingTaskId = '6a6b6c6d-7e8f-4a1b-9c2d-abcdef123456';
      const request = createNextRequest(
        `http://localhost/api/tasks/${missingTaskId}`,
        { method: 'GET' }
      );
      const response = await GET_TASK(request, {
        params: Promise.resolve({ taskId: missingTaskId }),
      });
      const payload = await response.json();

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(payload.error).toBe('Task not found');
    });
  });

  describe('PATCH /api/tasks/[taskId]', () => {
    it('updates a task for the coach', async () => {
      mockValidateRequestBody.mockReturnValue({
        success: true,
        data: { title: 'Updated title' },
      });
      mockTaskService.updateTask.mockResolvedValue({
        ...sampleTask,
        title: 'Updated title',
      });

      const request = createNextRequest(
        `http://localhost/api/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ taskId }),
      });
      const payload = await response.json();

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(mockTaskService.updateTask).toHaveBeenCalledWith(
        taskId,
        { id: currentUser.id, role: 'coach' },
        { title: 'Updated title' }
      );
      expect(payload.data.title).toBe('Updated title');
    });

    it('returns validation errors when the payload is empty', async () => {
      mockValidateRequestBody.mockReturnValue({
        success: false,
        error: { message: 'At least one property must be provided' },
      });

      const request = createNextRequest(
        `http://localhost/api/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ taskId }),
      });
      const payload = await response.json();

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(payload.success).toBe(false);
      expect(mockTaskService.updateTask).not.toHaveBeenCalled();
    });

    it('propagates service failures', async () => {
      mockValidateRequestBody.mockReturnValue({
        success: true,
        data: { title: 'Updated title' },
      });
      mockTaskService.updateTask.mockRejectedValue(
        new TaskServiceError('Access denied', HTTP_STATUS.FORBIDDEN)
      );

      const request = createNextRequest(
        `http://localhost/api/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ taskId }),
      });
      const payload = await response.json();

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(payload.error).toBe('Access denied');
    });
  });
});
