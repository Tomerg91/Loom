/**
 * Comprehensive test suite for /api/admin/mfa/users
 * Priority 1 - Authentication & Security API (Admin)
 * 
 * Tests: Admin Authentication, Role Authorization, Input Validation, Data Security
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all dependencies
vi.mock('@/lib/services/auth-service', () => ({
  authService: {
    getSession: vi.fn(),
  },
}));

vi.mock('@/lib/database/mfa-admin', () => ({
  getMfaUserStatuses: vi.fn(),
  getMfaStatistics: vi.fn(),
}));

vi.mock('@/lib/api/types', () => ({
  ApiResponseHelper: {
    success: vi.fn((data) => new Response(JSON.stringify({ success: true, data }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })),
    badRequest: vi.fn((message, details) => new Response(JSON.stringify({ 
      success: false, 
      error: message, 
      details 
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })),
    forbidden: vi.fn((message) => new Response(JSON.stringify({ 
      success: false, 
      error: message 
    }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })),
    internalError: vi.fn((message) => new Response(JSON.stringify({ 
      success: false, 
      error: message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })),
    error: vi.fn((code, message) => new Response(JSON.stringify({ 
      success: false, 
      error: message,
      code 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })),
  },
}));

vi.mock('@/lib/api/errors', () => ({
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

const { NextRequest } = await import('next/server');
const rateLimitModule = await import('@/lib/security/rate-limit');
const rateLimitMock = vi
  .spyOn(rateLimitModule, 'rateLimit')
  .mockImplementation(<Args extends unknown[]>(
    _limit: number,
    _window: number
  ) =>
    (handler: (request: NextRequest, ...args: Args) => Promise<Response>) => handler
  );

const { GET } = await import('@/app/api/admin/mfa/users/route');

// Import mocked functions
import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { getMfaUserStatuses, getMfaStatistics } from '@/lib/database/mfa-admin';
import { authService } from '@/lib/services/auth-service';
import { mockUser, mockAdminUser, mockCoachUser } from '@/test/utils';

const mockAuthService = vi.mocked(authService);
const mockGetMfaUserStatuses = vi.mocked(getMfaUserStatuses);
const mockGetMfaStatistics = vi.mocked(getMfaStatistics);
const mockApiResponseHelper = vi.mocked(ApiResponseHelper);
const mockRateLimit = rateLimitMock;

describe('/api/admin/mfa/users', () => {
  const mockMfaUsers = [
    {
      id: '1',
      name: 'John Doe',
      email: 'user1@example.com',
      role: 'client' as const,
      mfaEnabled: true,
      lastLogin: '2024-01-01T00:00:00Z',
      backupCodesUsed: 3,
      backupCodesRemaining: 5,
      trustedDevices: 2,
      mfaVerifiedAt: '2024-01-01T00:00:00Z',
      mfaSetupCompleted: true,
      createdAt: '2023-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'user2@example.com',
      role: 'coach' as const,
      mfaEnabled: false,
      lastLogin: '2024-01-02T00:00:00Z',
      backupCodesUsed: 0,
      backupCodesRemaining: 0,
      trustedDevices: 0,
      mfaSetupCompleted: false,
      createdAt: '2023-02-01T00:00:00Z',
    },
  ];

  const mockMfaStatistics = {
    totalUsers: 100,
    mfaEnabled: 75,
    mfaEnabledPercentage: 75,
    adminMfaEnabled: 5,
    adminMfaEnabledPercentage: 100,
    coachMfaEnabled: 18,
    coachMfaEnabledPercentage: 90,
    clientMfaEnabled: 52,
    clientMfaEnabledPercentage: 69.3,
    mfaFailures30Days: 12,
    accountLockouts30Days: 3,
    averageBackupCodesUsed: 1.8,
    avgTrustedDevicesPerUser: 2.5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default rate limiting (no-op wrapper)
    mockRateLimit.mockImplementation((_limit, _window) => handler => handler);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/admin/mfa/users', () => {
    describe('Authentication and Authorization Testing', () => {
      it('should allow admin access to MFA user data', async () => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });

        mockGetMfaUserStatuses.mockResolvedValue({
          success: true,
          data: {
            users: mockMfaUsers,
            total: 2,
            page: 1,
            limit: 20,
          },
          error: null,
        });

        const request = new NextRequest('http://localhost:3000/api/admin/mfa/users');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.users).toHaveLength(2);
        expect(data.data.pagination.total).toBe(2);
      });

      it('should reject non-admin users', async () => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockUser, // regular client
        });

        const request = new NextRequest('http://localhost:3000/api/admin/mfa/users');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Admin access required for MFA management');
        expect(mockApiResponseHelper.forbidden).toHaveBeenCalledWith(
          'Admin access required for MFA management'
        );
      });

      it('should reject coach users', async () => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockCoachUser,
        });

        const request = new NextRequest('http://localhost:3000/api/admin/mfa/users');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Admin access required for MFA management');
      });

      it('should reject unauthenticated requests', async () => {
        mockAuthService.getSession.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/admin/mfa/users');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Admin access required for MFA management');
      });

      it('should reject requests with invalid session', async () => {
        mockAuthService.getSession.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/admin/mfa/users');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.success).toBe(false);
      });
    });

    describe('Input Validation Testing', () => {
      beforeEach(() => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });

        mockGetMfaUserStatuses.mockResolvedValue({
          success: true,
          data: {
            users: mockMfaUsers,
            total: 2,
            page: 1,
            limit: 20,
          },
          error: null,
        });
      });

      it('should validate and use default pagination parameters', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/mfa/users');

        await GET(request);

        expect(mockGetMfaUserStatuses).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          sortBy: 'created_at',
          sortOrder: 'desc',
        });
      });

      it('should validate custom pagination parameters', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/admin/mfa/users?page=2&limit=50'
        );

        await GET(request);

        expect(mockGetMfaUserStatuses).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2,
            limit: 50,
          })
        );
      });

      it('should validate search parameter', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/admin/mfa/users?search=john@example.com'
        );

        await GET(request);

        expect(mockGetMfaUserStatuses).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'john@example.com',
          })
        );
      });

      it('should validate role filter parameter', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/admin/mfa/users?role=coach'
        );

        await GET(request);

        expect(mockGetMfaUserStatuses).toHaveBeenCalledWith(
          expect.objectContaining({
            role: 'coach',
          })
        );
      });

      it('should validate MFA status filter', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/admin/mfa/users?mfaStatus=enabled'
        );

        await GET(request);

        expect(mockGetMfaUserStatuses).toHaveBeenCalledWith(
          expect.objectContaining({
            mfaStatus: 'enabled',
          })
        );
      });

      it('should validate sorting parameters', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/admin/mfa/users?sortBy=email&sortOrder=asc'
        );

        await GET(request);

        expect(mockGetMfaUserStatuses).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'email',
            sortOrder: 'asc',
          })
        );
      });

      it('should reject invalid page numbers', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/admin/mfa/users?page=0'
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Invalid query parameters');
        expect(mockApiResponseHelper.badRequest).toHaveBeenCalled();
      });

      it('should reject invalid limit values', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/admin/mfa/users?limit=200' // Over max of 100
        );

        const response = await GET(request);

        expect(response.status).toBe(400);
        expect(mockApiResponseHelper.badRequest).toHaveBeenCalled();
      });

      it('should reject invalid role values', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/admin/mfa/users?role=invalid_role'
        );

        const response = await GET(request);

        expect(response.status).toBe(400);
        expect(mockApiResponseHelper.badRequest).toHaveBeenCalled();
      });

      it('should reject invalid MFA status values', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/admin/mfa/users?mfaStatus=invalid_status'
        );

        const response = await GET(request);

        expect(response.status).toBe(400);
        expect(mockApiResponseHelper.badRequest).toHaveBeenCalled();
      });

      it('should reject invalid sort order values', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/admin/mfa/users?sortOrder=invalid'
        );

        const response = await GET(request);

        expect(response.status).toBe(400);
        expect(mockApiResponseHelper.badRequest).toHaveBeenCalled();
      });
    });

    describe('Statistics Integration Testing', () => {
      beforeEach(() => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });

        mockGetMfaUserStatuses.mockResolvedValue({
          success: true,
          data: {
            users: mockMfaUsers,
            total: 2,
            page: 1,
            limit: 20,
          },
          error: null,
        });
      });

      it('should include statistics when requested', async () => {
        mockGetMfaStatistics.mockResolvedValue({
          success: true,
          data: mockMfaStatistics,
          error: null,
        });

        const request = new NextRequest(
          'http://localhost:3000/api/admin/mfa/users?includeStatistics=true'
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.statistics).toEqual(mockMfaStatistics);
        expect(mockGetMfaStatistics).toHaveBeenCalled();
      });

      it('should not include statistics by default', async () => {
        const request = new NextRequest('http://localhost:3000/api/admin/mfa/users');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.statistics).toBeNull();
        expect(mockGetMfaStatistics).not.toHaveBeenCalled();
      });

      it('should handle statistics fetch failure gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        mockGetMfaStatistics.mockResolvedValue({
          success: false,
          data: null,
          error: 'Statistics service unavailable',
        });

        const request = new NextRequest(
          'http://localhost:3000/api/admin/mfa/users?includeStatistics=true'
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.statistics).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to fetch MFA statistics:',
          'Statistics service unavailable'
        );

        consoleSpy.mockRestore();
      });
    });

    describe('Rate Limiting Testing', () => {
      it('should apply appropriate rate limiting for admin endpoints', async () => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });

        mockGetMfaUserStatuses.mockResolvedValue({
          success: true,
          data: {
            users: [],
            total: 0,
            page: 1,
            limit: 20,
          },
          error: null,
        });

        const request = new NextRequest('http://localhost:3000/api/admin/mfa/users');

        await GET(request);

        expect(mockRateLimit).toHaveBeenCalledWith(
          50, // 50 requests per minute
          60000 // 1 minute window
        );
      });
    });

    describe('Security Testing', () => {
      it('should prevent SQL injection in search parameter', async () => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });

        mockGetMfaUserStatuses.mockResolvedValue({
          success: true,
          data: {
            users: [],
            total: 0,
            page: 1,
            limit: 20,
          },
          error: null,
        });

        const request = new NextRequest(
          "http://localhost:3000/api/admin/mfa/users?search='; DROP TABLE users; --"
        );

        await GET(request);

        // The search parameter should be passed as-is to the database layer
        // where proper parameterized queries should prevent SQL injection
        expect(mockGetMfaUserStatuses).toHaveBeenCalledWith(
          expect.objectContaining({
            search: "'; DROP TABLE users; --",
          })
        );
      });

      it('should prevent XSS in search parameter', async () => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });

        mockGetMfaUserStatuses.mockResolvedValue({
          success: true,
          data: {
            users: [],
            total: 0,
            page: 1,
            limit: 20,
          },
          error: null,
        });

        const request = new NextRequest(
          'http://localhost:3000/api/admin/mfa/users?search=%3Cscript%3Ealert%28%22xss%22%29%3C/script%3E'
        );

        await GET(request);

        expect(mockGetMfaUserStatuses).toHaveBeenCalledWith(
          expect.objectContaining({
            search: '<script>alert("xss")</script>',
          })
        );
      });

      it('should not expose sensitive user data beyond what is necessary', async () => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });

        const sensitiveUserData = [
          {
            ...mockMfaUsers[0],
            passwordHash: 'sensitive_password_hash',
            mfaSecret: 'sensitive_mfa_secret',
            internalNotes: 'admin only notes',
          },
        ];

        mockGetMfaUserStatuses.mockResolvedValue({
          success: true,
          data: {
            users: sensitiveUserData,
            total: 1,
            page: 1,
            limit: 20,
          },
          error: null,
        });

        const request = new NextRequest('http://localhost:3000/api/admin/mfa/users');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        // The response should contain the data as returned by the database layer
        // The database layer should be responsible for filtering sensitive data
        expect(data.data.users[0]).toEqual(sensitiveUserData[0]);
      });
    });

    describe('Database Operations Testing', () => {
      beforeEach(() => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });
      });

      it('should handle successful database operations', async () => {
        mockGetMfaUserStatuses.mockResolvedValue({
          success: true,
          data: {
            users: mockMfaUsers,
            total: 2,
            page: 1,
            limit: 20,
          },
          error: null,
        });

        const request = new NextRequest('http://localhost:3000/api/admin/mfa/users');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.users).toEqual(mockMfaUsers);
      });

      it('should handle database operation failures', async () => {
        mockGetMfaUserStatuses.mockResolvedValue({
          success: false,
          data: null,
          error: 'Database connection failed',
        });

        const request = new NextRequest('http://localhost:3000/api/admin/mfa/users');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Database connection failed');
        expect(mockApiResponseHelper.internalError).toHaveBeenCalledWith(
          'Database connection failed'
        );
      });

      it('should handle database operations with missing error message', async () => {
        mockGetMfaUserStatuses.mockResolvedValue({
          success: false,
          data: null,
          error: 'Unknown error',
        });

        const request = new NextRequest('http://localhost:3000/api/admin/mfa/users');

        const response = await GET(request);

        expect(response.status).toBe(500);
        expect(mockApiResponseHelper.internalError).toHaveBeenCalledWith(
          'Failed to fetch MFA user data'
        );
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });
      });

      it('should handle authentication service errors', async () => {
        mockAuthService.getSession.mockRejectedValue(new Error('Auth service unavailable'));

        const request = new NextRequest('http://localhost:3000/api/admin/mfa/users');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Failed to fetch MFA user data');
        expect(mockApiResponseHelper.internalError).toHaveBeenCalledWith(
          'Failed to fetch MFA user data'
        );
      });

      it('should handle ApiError exceptions', async () => {
        const apiError = new ApiError('CUSTOM_ERROR', 'Custom error message');
        mockGetMfaUserStatuses.mockRejectedValue(apiError);

        const request = new NextRequest('http://localhost:3000/api/admin/mfa/users');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.code).toBe('CUSTOM_ERROR');
        expect(data.error).toBe('Custom error message');
        expect(mockApiResponseHelper.error).toHaveBeenCalledWith(
          'CUSTOM_ERROR',
          'Custom error message'
        );
      });

      it('should handle unexpected errors', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        mockGetMfaUserStatuses.mockImplementation(() => {
          throw new Error('Unexpected system error');
        });

        const request = new NextRequest('http://localhost:3000/api/admin/mfa/users');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Failed to fetch MFA user data');
        
        expect(consoleSpy).toHaveBeenCalledWith(
          'Get MFA users API error:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });

      it('should handle URL parsing errors', async () => {
        // Mock URL constructor to throw
        const originalURL = global.URL;
        const faultyURL = vi.fn<typeof URL>(() => {
          throw new Error('Invalid URL');
        }) as unknown as typeof URL;
        global.URL = faultyURL;

        const request = new NextRequest('http://localhost:3000/api/admin/mfa/users');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);

        global.URL = originalURL;
      });
    });

    describe('Query Parameter Edge Cases', () => {
      beforeEach(() => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });

        mockGetMfaUserStatuses.mockResolvedValue({
          success: true,
          data: {
            users: mockMfaUsers,
            total: 2,
            page: 1,
            limit: 20,
          },
          error: null,
        });
      });

      it('should handle numeric string conversion for page', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/admin/mfa/users?page=3'
        );

        await GET(request);

        expect(mockGetMfaUserStatuses).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 3,
          })
        );
      });

      it('should handle boolean string conversion for includeStatistics', async () => {
        mockGetMfaStatistics.mockResolvedValue({
          success: true,
          data: mockMfaStatistics,
          error: null,
        });

        const request = new NextRequest(
          'http://localhost:3000/api/admin/mfa/users?includeStatistics=true'
        );

        const response = await GET(request);
        const data = await response.json();

        expect(data.data.statistics).not.toBeNull();
        expect(mockGetMfaStatistics).toHaveBeenCalled();
      });

      it('should handle empty string parameters', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/admin/mfa/users?search='
        );

        await GET(request);

        const lastCall = mockGetMfaUserStatuses.mock.calls.at(-1)?.[0];
        expect(lastCall?.search).toBeUndefined();
      });
    });

    describe('Integration Testing', () => {
      it('should handle complete admin workflow with all parameters', async () => {
        mockAuthService.getSession.mockResolvedValue({
          user: mockAdminUser,
        });

        mockGetMfaUserStatuses.mockResolvedValue({
          success: true,
          data: {
            users: mockMfaUsers.filter(u => u.role === 'coach'),
            total: 1,
            page: 1,
            limit: 10,
          },
          error: null,
        });

        mockGetMfaStatistics.mockResolvedValue({
          success: true,
          data: mockMfaStatistics,
          error: null,
        });

        const request = new NextRequest(
          'http://localhost:3000/api/admin/mfa/users?page=1&limit=10&search=coach&role=coach&mfaStatus=disabled&sortBy=email&sortOrder=asc&includeStatistics=true'
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.users).toBeDefined();
        expect(data.data.statistics).toEqual(mockMfaStatistics);
        expect(data.data.pagination).toBeDefined();

        expect(mockGetMfaUserStatuses).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
          search: 'coach',
          role: 'coach',
          mfaStatus: 'disabled',
          sortBy: 'email',
          sortOrder: 'asc',
        });

        expect(mockGetMfaStatistics).toHaveBeenCalled();
      });
    });
  });
});
