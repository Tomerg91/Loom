import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const clientId = '4c0c5d6e-7f8a-4b1c-9d2e-abcdefabcdef';
const taskId = 'b1e4d6c7-2f3a-4a5b-8c9d-0123456789ab';
const instanceId = 'c2d3e4f5-6789-4abc-def0-1234567890ab';

type TestUser = {
  id: string;
  email: string;
  role: 'coach' | 'client' | 'admin';
  status: string;
};

let currentUser: TestUser = {
  id: clientId,
  email: 'client@example.com',
  role: 'client',
  status: 'active',
};

const hoisted = vi.hoisted(() => {
  const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
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

  const mockCreateSignedUploadUrl = vi.fn();
  const mockGetPublicUrl = vi.fn();
  const mockStorageFrom = vi.fn(() => ({
    createSignedUploadUrl: mockCreateSignedUploadUrl,
    getPublicUrl: mockGetPublicUrl,
  }));

  const mockSupabaseClient = {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  } as const;

  const mockAdminClient = {
    storage: {
      from: mockStorageFrom,
    },
  } as const;

  return {
    HTTP_STATUS,
    mockProgressService,
    mockCreateSuccessResponse,
    mockCreateErrorResponse,
    mockValidateRequestBody,
    mockGetUser,
    mockSingle,
    mockEq,
    mockSelect,
    mockFrom,
    mockCreateSignedUploadUrl,
    mockGetPublicUrl,
    mockStorageFrom,
    mockSupabaseClient,
    mockAdminClient,
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
  createErrorResponse: hoisted.mockCreateErrorResponse,
  createSuccessResponse: hoisted.mockCreateSuccessResponse,
  validateRequestBody: hoisted.mockValidateRequestBody,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => hoisted.mockSupabaseClient),
  createAdminClient: vi.fn(() => hoisted.mockAdminClient),
}));

const {
  HTTP_STATUS,
  mockProgressService,
  mockCreateSuccessResponse,
  mockCreateErrorResponse,
  mockValidateRequestBody,
  mockGetUser,
  mockSingle,
  mockSelect,
  mockEq,
  mockFrom,
  mockCreateSignedUploadUrl,
  mockGetPublicUrl,
  mockStorageFrom,
} = hoisted;

import { POST as signAttachment } from '@/app/api/attachments/sign/route';
import { POST as createProgressUpdate } from '@/app/api/tasks/[taskId]/instances/[instanceId]/progress/route';
import { ProgressServiceError } from '@/modules/tasks/services/progress-service';

const createNextRequest = (url: string, init?: RequestInit) =>
  new NextRequest(new Request(url, init));

describe('Task progress API routes', () => {
  beforeEach(() => {
    Object.values(mockProgressService).forEach(fn => fn.mockReset());
    mockCreateSuccessResponse.mockClear();
    mockCreateErrorResponse.mockClear();
    mockValidateRequestBody.mockReset();

    mockGetUser.mockReset();
    mockSingle.mockReset();
    mockSelect.mockReset();
    mockEq.mockReset();
    mockFrom.mockReset();

    mockCreateSignedUploadUrl.mockReset();
    mockGetPublicUrl.mockReset();
    mockStorageFrom.mockReset();
    mockStorageFrom.mockImplementation(() => ({
      createSignedUploadUrl: mockCreateSignedUploadUrl,
      getPublicUrl: mockGetPublicUrl,
    }));

    currentUser = {
      id: clientId,
      email: 'client@example.com',
      role: 'client',
      status: 'active',
    };

    mockGetUser.mockImplementation(async () => ({
      data: { user: { id: currentUser.id, role: currentUser.role } },
      error: null,
    }));
    mockSingle.mockImplementation(async () => ({
      data: { role: currentUser.role },
      error: null,
    }));
    mockEq.mockImplementation(() => ({ single: mockSingle }));
    mockSelect.mockImplementation(() => ({ eq: mockEq }));
    mockFrom.mockImplementation(() => ({ select: mockSelect }));
  });

  describe('POST /api/tasks/[taskId]/instances/[instanceId]/progress', () => {
    it('creates a progress update for the authenticated client', async () => {
      const progressDto = {
        id: 'progress-123',
        taskId,
        taskInstanceId: instanceId,
        authorId: clientId,
        percentage: 80,
        note: 'Made good progress today',
        isVisibleToCoach: true,
        createdAt: new Date().toISOString(),
        instanceStatus: 'IN_PROGRESS',
        completionPercentage: 80,
        completedAt: null,
        attachments: [],
      };

      mockValidateRequestBody.mockReturnValue({
        success: true,
        data: {
          percentage: 80,
          note: 'Made good progress today',
          isVisibleToCoach: true,
        },
      });

      mockProgressService.createProgressUpdate.mockResolvedValue(progressDto);

      const request = createNextRequest(
        `http://localhost/api/tasks/${taskId}/instances/${instanceId}/progress`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      const response = await createProgressUpdate(request, {
        params: Promise.resolve({ taskId, instanceId }),
      });
      const payload = await response.json();

      expect(response.status).toBe(HTTP_STATUS.CREATED);
      expect(mockProgressService.createProgressUpdate).toHaveBeenCalledWith(
        { id: currentUser.id, role: 'client' },
        {
          taskId,
          taskInstanceId: instanceId,
          input: expect.objectContaining({ percentage: 80 }),
        }
      );
      expect(payload.data).toEqual(progressDto);
    });

    it('returns validation errors when the payload is invalid', async () => {
      mockValidateRequestBody.mockReturnValue({
        success: false,
        error: { message: 'Validation failed' },
      });

      const request = createNextRequest(
        `http://localhost/api/tasks/${taskId}/instances/${instanceId}/progress`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      const response = await createProgressUpdate(request, {
        params: Promise.resolve({ taskId, instanceId }),
      });
      const payload = await response.json();

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(payload.success).toBe(false);
      expect(mockProgressService.createProgressUpdate).not.toHaveBeenCalled();
    });

    it('maps service errors to API responses', async () => {
      mockValidateRequestBody.mockReturnValue({
        success: true,
        data: { percentage: 50 },
      });

      mockProgressService.createProgressUpdate.mockRejectedValue(
        new ProgressServiceError('Access denied', HTTP_STATUS.FORBIDDEN)
      );

      const request = createNextRequest(
        `http://localhost/api/tasks/${taskId}/instances/${instanceId}/progress`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      const response = await createProgressUpdate(request, {
        params: Promise.resolve({ taskId, instanceId }),
      });
      const payload = await response.json();

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(payload.error).toBe('Access denied');
    });

    it('returns unauthorized when no Supabase session exists', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not signed in' },
      });

      const request = createNextRequest(
        `http://localhost/api/tasks/${taskId}/instances/${instanceId}/progress`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      const response = await createProgressUpdate(request, {
        params: Promise.resolve({ taskId, instanceId }),
      });
      const payload = await response.json();

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(payload.success).toBe(false);
      expect(mockProgressService.createProgressUpdate).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/attachments/sign', () => {
    it('returns signed upload details for an authenticated user', async () => {
      mockValidateRequestBody.mockReturnValue({
        success: true,
        data: {
          fileName: ' Progress Report .pdf ',
          fileSize: 1024,
          contentType: 'application/pdf',
        },
      });

      mockCreateSignedUploadUrl.mockResolvedValue({
        data: {
          signedUrl: 'https://upload.example.com',
          token: 'token-123',
          path: 'path/from/supabase',
        },
        error: null,
      });

      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://public.example.com/file.pdf' },
      });

      const request = createNextRequest(
        'http://localhost/api/attachments/sign',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      const response = await signAttachment(request);
      const payload = await response.json();

      expect(response.status).toBe(HTTP_STATUS.CREATED);
      expect(payload.data.uploadUrl).toBe('https://upload.example.com');
      expect(payload.data.fileName).toBe('progress-report.pdf');
      expect(mockCreateSignedUploadUrl).toHaveBeenCalledWith(
        expect.stringMatching(`${currentUser.id}/`),
        expect.objectContaining({ upsert: false })
      );
    });

    it('returns validation errors when signing payload fails validation', async () => {
      mockValidateRequestBody.mockReturnValue({
        success: false,
        error: { message: 'Validation failed' },
      });

      const request = createNextRequest(
        'http://localhost/api/attachments/sign',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      const response = await signAttachment(request);
      const payload = await response.json();

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(payload.success).toBe(false);
      expect(mockCreateSignedUploadUrl).not.toHaveBeenCalled();
    });

    it('returns unauthorized when no session is present', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not signed in' },
      });

      const request = createNextRequest(
        'http://localhost/api/attachments/sign',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      const response = await signAttachment(request);
      const payload = await response.json();

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(payload.success).toBe(false);
      expect(mockCreateSignedUploadUrl).not.toHaveBeenCalled();
    });

    it('handles storage errors gracefully', async () => {
      mockValidateRequestBody.mockReturnValue({
        success: true,
        data: {
          fileName: 'progress.pdf',
          fileSize: 1024,
          contentType: 'application/pdf',
        },
      });

      mockCreateSignedUploadUrl.mockResolvedValue({
        data: null,
        error: { message: 'storage failure' },
      });

      const request = createNextRequest(
        'http://localhost/api/attachments/sign',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      const response = await signAttachment(request);
      const payload = await response.json();

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(payload.success).toBe(false);
    });
  });
});
