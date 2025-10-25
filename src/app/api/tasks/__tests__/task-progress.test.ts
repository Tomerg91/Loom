import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const coachId = '11111111-1111-1111-1111-111111111111';
const clientId = '22222222-2222-2222-2222-222222222222';
const taskId = '33333333-3333-3333-3333-333333333333';
const instanceId = '44444444-4444-4444-4444-444444444444';

type TestUser = {
  id: string;
  role: 'coach' | 'admin' | 'client';
};

let currentUser: TestUser = {
  id: clientId,
  role: 'client',
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

  const mockProgressService = {
    createProgressUpdate: vi.fn(),
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

  return {
    HTTP_STATUS,
    mockProgressService,
    mockCreateSuccessResponse,
    mockCreateErrorResponse,
    mockValidateRequestBody,
    mockSupabaseClient,
    mockGetUser,
    mockSingle,
  };
});

vi.mock('@/modules/tasks/services/progress-service', () => ({
  ProgressService: vi.fn(() => hoisted.mockProgressService),
  ProgressServiceError: class MockProgressServiceError extends Error {
    status: number;
    constructor(
      message: string,
      status = hoisted.HTTP_STATUS.INTERNAL_SERVER_ERROR
    ) {
      super(message);
      this.status = status;
      this.name = 'ProgressServiceError';
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

const {
  HTTP_STATUS,
  mockProgressService,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockValidateRequestBody,
  mockGetUser,
  mockSingle,
} = hoisted;

import { POST } from '../[taskId]/instances/[instanceId]/progress/route';
import { ProgressServiceError } from '@/modules/tasks/services/progress-service';

const createNextRequest = (url: string, init?: RequestInit) =>
  new NextRequest(new Request(url, init));

type RouteContext = {
  params: Promise<{ taskId: string; instanceId: string }>;
};

describe('POST /api/tasks/[taskId]/instances/[instanceId]/progress - Task Progress Updates', () => {
  const sampleProgress = {
    id: '55555555-5555-5555-5555-555555555555',
    taskId,
    taskInstanceId: instanceId,
    percentage: 50,
    notes: 'Made good progress today',
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    Object.values(mockProgressService).forEach(fn => fn.mockReset());
    mockCreateSuccessResponse.mockClear();
    mockCreateErrorResponse.mockClear();
    mockValidateRequestBody.mockReset();
    mockGetUser.mockReset();
    mockSingle.mockReset();

    currentUser = {
      id: clientId,
      role: 'client',
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

  it('creates progress update with valid percentage (0-100)', async () => {
    mockValidateRequestBody.mockReturnValue({
      success: true,
      data: {
        percentage: 50,
        notes: 'Made good progress today',
      },
    });
    mockProgressService.createProgressUpdate.mockResolvedValue(sampleProgress);

    const request = createNextRequest(
      `http://localhost/api/tasks/${taskId}/instances/${instanceId}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percentage: 50,
          notes: 'Made good progress today',
        }),
      }
    );

    const context: RouteContext = {
      params: Promise.resolve({ taskId, instanceId }),
    };

    const response = await POST(request, context);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(mockProgressService.createProgressUpdate).toHaveBeenCalledWith(
      { id: clientId, role: 'client' },
      {
        taskId,
        taskInstanceId: instanceId,
        input: expect.objectContaining({
          percentage: 50,
          notes: 'Made good progress today',
        }),
      }
    );
    expect(payload.data).toEqual(sampleProgress);
    expect(payload.message).toBe('Progress update recorded successfully');
  });

  it('creates progress update at 0%', async () => {
    mockValidateRequestBody.mockReturnValue({
      success: true,
      data: {
        percentage: 0,
        notes: 'Just starting',
      },
    });
    mockProgressService.createProgressUpdate.mockResolvedValue({
      ...sampleProgress,
      percentage: 0,
    });

    const request = createNextRequest(
      `http://localhost/api/tasks/${taskId}/instances/${instanceId}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percentage: 0,
          notes: 'Just starting',
        }),
      }
    );

    const context: RouteContext = {
      params: Promise.resolve({ taskId, instanceId }),
    };

    const response = await POST(request, context);

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(mockProgressService.createProgressUpdate).toHaveBeenCalled();
  });

  it('auto-completes task at 100% progress', async () => {
    const completedProgress = {
      ...sampleProgress,
      percentage: 100,
      notes: 'Task completed!',
    };

    mockValidateRequestBody.mockReturnValue({
      success: true,
      data: {
        percentage: 100,
        notes: 'Task completed!',
      },
    });
    mockProgressService.createProgressUpdate.mockResolvedValue(
      completedProgress
    );

    const request = createNextRequest(
      `http://localhost/api/tasks/${taskId}/instances/${instanceId}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percentage: 100,
          notes: 'Task completed!',
        }),
      }
    );

    const context: RouteContext = {
      params: Promise.resolve({ taskId, instanceId }),
    };

    const response = await POST(request, context);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(payload.data.percentage).toBe(100);
    // Service layer should handle auto-completion logic
    expect(mockProgressService.createProgressUpdate).toHaveBeenCalledWith(
      { id: clientId, role: 'client' },
      expect.objectContaining({
        input: expect.objectContaining({
          percentage: 100,
        }),
      })
    );
  });

  it('rejects progress update with percentage > 100', async () => {
    mockValidateRequestBody.mockReturnValue({
      success: false,
      error: { message: 'Percentage must be between 0 and 100' },
    });

    const request = createNextRequest(
      `http://localhost/api/tasks/${taskId}/instances/${instanceId}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percentage: 150,
          notes: 'Invalid percentage',
        }),
      }
    );

    const context: RouteContext = {
      params: Promise.resolve({ taskId, instanceId }),
    };

    const response = await POST(request, context);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(payload.success).toBe(false);
    expect(mockProgressService.createProgressUpdate).not.toHaveBeenCalled();
  });

  it('rejects progress update with negative percentage', async () => {
    mockValidateRequestBody.mockReturnValue({
      success: false,
      error: { message: 'Percentage must be between 0 and 100' },
    });

    const request = createNextRequest(
      `http://localhost/api/tasks/${taskId}/instances/${instanceId}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percentage: -10,
          notes: 'Invalid percentage',
        }),
      }
    );

    const context: RouteContext = {
      params: Promise.resolve({ taskId, instanceId }),
    };

    const response = await POST(request, context);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(payload.success).toBe(false);
    expect(mockProgressService.createProgressUpdate).not.toHaveBeenCalled();
  });

  it('creates progress update without notes (optional field)', async () => {
    mockValidateRequestBody.mockReturnValue({
      success: true,
      data: {
        percentage: 75,
      },
    });
    mockProgressService.createProgressUpdate.mockResolvedValue({
      ...sampleProgress,
      percentage: 75,
      notes: null,
    });

    const request = createNextRequest(
      `http://localhost/api/tasks/${taskId}/instances/${instanceId}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percentage: 75,
        }),
      }
    );

    const context: RouteContext = {
      params: Promise.resolve({ taskId, instanceId }),
    };

    const response = await POST(request, context);

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(mockProgressService.createProgressUpdate).toHaveBeenCalled();
  });

  it('creates progress update with file attachments', async () => {
    mockValidateRequestBody.mockReturnValue({
      success: true,
      data: {
        percentage: 80,
        notes: 'Added screenshots',
        attachments: ['file1.png', 'file2.pdf'],
      },
    });
    mockProgressService.createProgressUpdate.mockResolvedValue({
      ...sampleProgress,
      percentage: 80,
      attachments: ['file1.png', 'file2.pdf'],
    });

    const request = createNextRequest(
      `http://localhost/api/tasks/${taskId}/instances/${instanceId}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percentage: 80,
          notes: 'Added screenshots',
          attachments: ['file1.png', 'file2.pdf'],
        }),
      }
    );

    const context: RouteContext = {
      params: Promise.resolve({ taskId, instanceId }),
    };

    const response = await POST(request, context);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(payload.data.attachments).toHaveLength(2);
  });

  it('returns unauthorized when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const request = createNextRequest(
      `http://localhost/api/tasks/${taskId}/instances/${instanceId}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percentage: 50,
        }),
      }
    );

    const context: RouteContext = {
      params: Promise.resolve({ taskId, instanceId }),
    };

    const response = await POST(request, context);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain('Authentication required');
    expect(mockProgressService.createProgressUpdate).not.toHaveBeenCalled();
  });

  it('returns forbidden when client tries to update another client\'s task', async () => {
    mockValidateRequestBody.mockReturnValue({
      success: true,
      data: {
        percentage: 50,
      },
    });
    mockProgressService.createProgressUpdate.mockRejectedValue(
      new ProgressServiceError(
        'You do not have permission to update this task',
        HTTP_STATUS.FORBIDDEN
      )
    );

    const request = createNextRequest(
      `http://localhost/api/tasks/${taskId}/instances/${instanceId}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percentage: 50,
        }),
      }
    );

    const context: RouteContext = {
      params: Promise.resolve({ taskId, instanceId }),
    };

    const response = await POST(request, context);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    expect(payload.success).toBe(false);
  });

  it('returns not found when task instance does not exist', async () => {
    mockValidateRequestBody.mockReturnValue({
      success: true,
      data: {
        percentage: 50,
      },
    });
    mockProgressService.createProgressUpdate.mockRejectedValue(
      new ProgressServiceError('Task instance not found', HTTP_STATUS.NOT_FOUND)
    );

    const request = createNextRequest(
      `http://localhost/api/tasks/${taskId}/instances/${instanceId}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percentage: 50,
        }),
      }
    );

    const context: RouteContext = {
      params: Promise.resolve({ taskId, instanceId }),
    };

    const response = await POST(request, context);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(payload.error).toBe('Task instance not found');
  });

  it('handles invalid JSON body', async () => {
    const request = createNextRequest(
      `http://localhost/api/tasks/${taskId}/instances/${instanceId}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      }
    );

    const context: RouteContext = {
      params: Promise.resolve({ taskId, instanceId }),
    };

    const response = await POST(request, context);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(payload.error).toContain('Invalid JSON body');
    expect(mockProgressService.createProgressUpdate).not.toHaveBeenCalled();
  });

  it('handles invalid taskId UUID', async () => {
    const invalidTaskId = 'not-a-uuid';

    const request = createNextRequest(
      `http://localhost/api/tasks/${invalidTaskId}/instances/${instanceId}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percentage: 50,
        }),
      }
    );

    const context: RouteContext = {
      params: Promise.resolve({ taskId: invalidTaskId, instanceId }),
    };

    // The route handler uses zod validation which will throw
    await expect(POST(request, context)).rejects.toThrow();
  });

  it('handles unexpected errors gracefully', async () => {
    mockValidateRequestBody.mockReturnValue({
      success: true,
      data: {
        percentage: 50,
      },
    });
    mockProgressService.createProgressUpdate.mockRejectedValue(
      new Error('Unexpected database error')
    );

    const request = createNextRequest(
      `http://localhost/api/tasks/${taskId}/instances/${instanceId}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percentage: 50,
        }),
      }
    );

    const context: RouteContext = {
      params: Promise.resolve({ taskId, instanceId }),
    };

    const response = await POST(request, context);
    const payload = await response.json();

    expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('Internal server error');
  });

  it('allows coach to create progress update on behalf of client', async () => {
    currentUser = { id: coachId, role: 'coach' };
    mockGetUser.mockResolvedValue({
      data: { user: { id: coachId } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { role: 'coach' },
      error: null,
    });

    mockValidateRequestBody.mockReturnValue({
      success: true,
      data: {
        percentage: 50,
        notes: 'Coach update on behalf of client',
      },
    });
    mockProgressService.createProgressUpdate.mockResolvedValue(sampleProgress);

    const request = createNextRequest(
      `http://localhost/api/tasks/${taskId}/instances/${instanceId}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percentage: 50,
          notes: 'Coach update on behalf of client',
        }),
      }
    );

    const context: RouteContext = {
      params: Promise.resolve({ taskId, instanceId }),
    };

    const response = await POST(request, context);

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(mockProgressService.createProgressUpdate).toHaveBeenCalledWith(
      { id: coachId, role: 'coach' },
      expect.any(Object)
    );
  });
});
