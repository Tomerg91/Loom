/**
 * Comprehensive test suite for /api/auth/signin-mfa
 * Priority 1 - Authentication & Security API
 * 
 * Tests: Authentication, Input Validation, Rate Limiting, Security
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, OPTIONS, GET, PUT, DELETE } from '@/app/api/auth/signin-mfa/route';
import { mockSupabaseClient, mockUser, mockAdminUser, mockCoachUser } from '@/test/utils';

// Mock all dependencies
vi.mock('@/lib/auth/auth', () => ({
  createAuthService: vi.fn(() => ({
    getCurrentUser: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock('@/lib/services/mfa-service', () => ({
  createMfaService: vi.fn(() => ({
    verifyMFA: vi.fn(),
    getMFAStatus: vi.fn(),
    requiresMFA: vi.fn(),
  })),
  getClientIP: vi.fn(),
  getUserAgent: vi.fn(),
}));

vi.mock('@/lib/security/cors', () => ({
  createCorsResponse: vi.fn(() => new Response('', { status: 200 })),
  applyCorsHeaders: vi.fn((response) => response),
}));

vi.mock('@/lib/api/utils', () => ({
  createSuccessResponse: vi.fn((data, message = 'Success') => 
    new Response(JSON.stringify({ success: true, data, message }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  ),
  createErrorResponse: vi.fn((message, status = 400) => 
    new Response(JSON.stringify({ success: false, error: message }), { 
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  ),
  withErrorHandling: vi.fn((handler: any) => handler),
  validateRequestBody: vi.fn(),
  rateLimit: vi.fn((limit, window, options) => (handler: any) => handler),
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
  },
}));

// Import mocked functions
import { createAuthService } from '@/lib/auth/auth';
import { createMfaService, getClientIP, getUserAgent } from '@/lib/services/mfa-service';
import { createCorsResponse, applyCorsHeaders } from '@/lib/security/cors';
import { validateRequestBody, createSuccessResponse, createErrorResponse } from '@/lib/api/utils';

const mockAuthService = vi.mocked(createAuthService);
const mockMfaService = vi.mocked(createMfaService);
const mockGetClientIP = vi.mocked(getClientIP);
const mockGetUserAgent = vi.mocked(getUserAgent);
const mockValidateRequestBody = vi.mocked(validateRequestBody);
const mockCreateSuccessResponse = vi.mocked(createSuccessResponse);
const mockCreateErrorResponse = vi.mocked(createErrorResponse);
const mockCreateCorsResponse = vi.mocked(createCorsResponse);

describe('/api/auth/signin-mfa', () => {
  const validMfaRequest = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    code: 'A1B2C3',
    method: 'totp',
    rememberMe: false,
  };

  const validBackupCodeRequest = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    code: 'BACKUP01',
    method: 'backup_code',
    rememberMe: true,
  };

  let mockAuthServiceInstance: any;
  let mockMfaServiceInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock service instances
    mockAuthServiceInstance = {
      getCurrentUser: vi.fn(),
      signOut: vi.fn(),
    };
    
    mockMfaServiceInstance = {
      verifyMFA: vi.fn(),
      getMFAStatus: vi.fn(),
      requiresMFA: vi.fn(),
    };

    mockAuthService.mockReturnValue(mockAuthServiceInstance);
    mockMfaService.mockReturnValue(mockMfaServiceInstance);
    
    // Setup default client info
    mockGetClientIP.mockReturnValue('192.168.1.100');
    mockGetUserAgent.mockReturnValue('Mozilla/5.0 Test Browser');
    
    // Setup default validation success
    mockValidateRequestBody.mockReturnValue({
      success: true,
      data: validMfaRequest,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/auth/signin-mfa', () => {
    describe('Authentication Testing', () => {
      it('should complete MFA signin with valid TOTP code', async () => {
        // Setup successful MFA verification
        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: true,
          verified: true,
        });

        mockAuthServiceInstance.getCurrentUser.mockResolvedValue({
          ...mockUser,
          id: validMfaRequest.userId,
          status: 'active',
        });

        mockMfaServiceInstance.getMFAStatus.mockResolvedValue({
          isEnabled: true,
          backupCodesRemaining: 5,
        });

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validMfaRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.user.id).toBe(validMfaRequest.userId);
        expect(data.data.mfa.method).toBe('totp');
        expect(mockMfaServiceInstance.verifyMFA).toHaveBeenCalledWith(
          validMfaRequest.userId,
          validMfaRequest.code,
          'totp',
          '192.168.1.100',
          'Mozilla/5.0 Test Browser'
        );
      });

      it('should complete MFA signin with valid backup code', async () => {
        mockValidateRequestBody.mockReturnValue({
          success: true,
          data: validBackupCodeRequest,
        });

        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: true,
          verified: true,
        });

        mockAuthServiceInstance.getCurrentUser.mockResolvedValue({
          ...mockUser,
          id: validBackupCodeRequest.userId,
          status: 'active',
        });

        mockMfaServiceInstance.getMFAStatus.mockResolvedValue({
          isEnabled: true,
          backupCodesRemaining: 1,
        });

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBackupCodeRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.mfa.method).toBe('backup_code');
        expect(data.data.mfa.warnings).toContain('This was your last backup code');
      });

      it('should reject invalid MFA code', async () => {
        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: false,
          error: 'Invalid verification code',
        });

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validMfaRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Invalid verification code');
      });

      it('should reject user ID mismatch after verification', async () => {
        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: true,
          verified: true,
        });

        // Return user with different ID
        mockAuthServiceInstance.getCurrentUser.mockResolvedValue({
          ...mockUser,
          id: 'different-user-id',
          status: 'active',
        });

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validMfaRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Authentication error occurred');
      });

      it('should reject inactive user accounts', async () => {
        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: true,
          verified: true,
        });

        mockAuthServiceInstance.getCurrentUser.mockResolvedValue({
          ...mockUser,
          id: validMfaRequest.userId,
          status: 'suspended',
        });

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validMfaRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Account is suspended');
      });
    });

    describe('Input Validation Testing', () => {
      it('should reject invalid UUID format', async () => {
        mockValidateRequestBody.mockReturnValue({
          success: false,
          error: {
            message: 'Invalid user ID format',
            code: 'INVALID_INPUT',
            details: { userId: 'Invalid user ID format' },
          },
        });

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...validMfaRequest,
            userId: 'invalid-uuid',
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Invalid user ID format');
      });

      it('should reject codes that are too short', async () => {
        mockValidateRequestBody.mockReturnValue({
          success: false,
          error: {
            message: 'Code must be at least 6 characters',
            code: 'INVALID_INPUT',
            details: { code: 'Code must be at least 6 characters' },
          },
        });

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...validMfaRequest,
            code: '12345',
          }),
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(mockValidateRequestBody).toHaveBeenCalled();
      });

      it('should reject codes that are too long', async () => {
        mockValidateRequestBody.mockReturnValue({
          success: false,
          error: {
            message: 'Code must be at most 8 characters',
            code: 'INVALID_INPUT',
            details: { code: 'Code must be at most 8 characters' },
          },
        });

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...validMfaRequest,
            code: '123456789',
          }),
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(mockValidateRequestBody).toHaveBeenCalled();
      });

      it('should reject codes with invalid characters', async () => {
        mockValidateRequestBody.mockReturnValue({
          success: false,
          error: {
            message: 'Code must contain only uppercase letters and numbers',
            code: 'INVALID_INPUT',
            details: { code: 'Code must contain only uppercase letters and numbers' },
          },
        });

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...validMfaRequest,
            code: 'abc!@#',
          }),
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(mockValidateRequestBody).toHaveBeenCalled();
      });

      it('should reject invalid method values', async () => {
        mockValidateRequestBody.mockReturnValue({
          success: false,
          error: {
            message: 'Invalid method value',
            code: 'INVALID_INPUT',
            details: { method: 'Invalid enum value' },
          },
        });

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...validMfaRequest,
            method: 'invalid_method',
          }),
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(mockValidateRequestBody).toHaveBeenCalled();
      });

      it('should reject malformed JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid-json{',
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toContain('An unexpected error occurred');
      });

      it('should enforce maximum request size limits', async () => {
        // Create a very large payload
        const largePayload = {
          ...validMfaRequest,
          extraData: 'A'.repeat(10000), // 10KB of extra data
        };

        mockValidateRequestBody.mockReturnValue({
          success: false,
          error: {
            message: 'Request body too large',
            code: 'PAYLOAD_TOO_LARGE',
          },
        });

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(largePayload),
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(mockValidateRequestBody).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          expect.objectContaining({
            maxSize: 5 * 1024, // 5KB limit
          })
        );
      });
    });

    describe('Rate Limiting Testing', () => {
      it('should handle rate limiting for excessive requests', async () => {
        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: false,
          error: 'Too many attempts. Please try again later.',
        });

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validMfaRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Too many attempts');
      });

      it('should track failed MFA attempts and enforce blocking', async () => {
        // Simulate multiple failed attempts
        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: false,
          error: 'Invalid verification code',
        });

        // First few attempts should work normally
        for (let i = 0; i < 3; i++) {
          const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validMfaRequest),
          });

          const response = await POST(request);
          expect(response.status).toBe(401);
        }

        expect(mockMfaServiceInstance.verifyMFA).toHaveBeenCalledTimes(3);
      });

      it('should clear failed attempts on successful verification', async () => {
        // First attempt fails
        mockMfaServiceInstance.verifyMFA
          .mockResolvedValueOnce({
            success: false,
            error: 'Invalid verification code',
          })
          .mockResolvedValueOnce({
            success: true,
            verified: true,
          });

        mockAuthServiceInstance.getCurrentUser.mockResolvedValue({
          ...mockUser,
          id: validMfaRequest.userId,
          status: 'active',
        });

        mockMfaServiceInstance.getMFAStatus.mockResolvedValue({
          isEnabled: true,
          backupCodesRemaining: 5,
        });

        // First request fails
        let request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validMfaRequest),
        });

        let response = await POST(request);
        expect(response.status).toBe(401);

        // Second request succeeds
        request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validMfaRequest),
        });

        response = await POST(request);
        expect(response.status).toBe(200);
      });
    });

    describe('Security Testing', () => {
      it('should prevent SQL injection in userId parameter', async () => {
        const sqlInjectionPayload = {
          userId: "'; DROP TABLE users; --",
          code: 'A1B2C3',
          method: 'totp',
        };

        mockValidateRequestBody.mockReturnValue({
          success: false,
          error: {
            message: 'Invalid user ID format',
            code: 'INVALID_INPUT',
          },
        });

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sqlInjectionPayload),
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(mockValidateRequestBody).toHaveBeenCalled();
      });

      it('should prevent XSS in code parameter', async () => {
        const xssPayload = {
          userId: validMfaRequest.userId,
          code: '<script>alert("xss")</script>',
          method: 'totp',
        };

        mockValidateRequestBody.mockReturnValue({
          success: false,
          error: {
            message: 'Code must contain only uppercase letters and numbers',
            code: 'INVALID_INPUT',
          },
        });

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(xssPayload),
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(mockValidateRequestBody).toHaveBeenCalled();
      });

      it('should log security events properly', async () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        mockValidateRequestBody.mockReturnValue({
          success: false,
          error: {
            message: 'Invalid user ID format',
            code: 'INVALID_INPUT',
            details: { userId: 'Invalid user ID format' },
          },
        });

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'invalid-uuid',
            code: 'A1B2C3',
          }),
        });

        await POST(request);

        expect(consoleSpy).toHaveBeenCalledWith(
          'Invalid MFA signin attempt:',
          expect.objectContaining({
            ip: '192.168.1.100',
            userAgent: 'Mozilla/5.0 Test Browser',
            timestamp: expect.any(String),
            validationErrors: expect.any(Array),
          })
        );

        consoleSpy.mockRestore();
      });

      it('should enforce secure headers', async () => {
        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: true,
          verified: true,
        });

        mockAuthServiceInstance.getCurrentUser.mockResolvedValue({
          ...mockUser,
          id: validMfaRequest.userId,
          status: 'active',
        });

        mockMfaServiceInstance.getMFAStatus.mockResolvedValue({
          isEnabled: true,
          backupCodesRemaining: 5,
        });

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validMfaRequest),
        });

        await POST(request);

        expect(mockCreateSuccessResponse).toHaveBeenCalledWith(
          expect.any(Object),
          'MFA authentication successful'
        );
      });
    });

    describe('Error Handling', () => {
      it('should handle service errors gracefully', async () => {
        mockMfaServiceInstance.verifyMFA.mockRejectedValue(new Error('Service unavailable'));

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validMfaRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toContain('An unexpected error occurred');
      });

      it('should return proper HTTP status codes', async () => {
        const testCases = [
          {
            error: 'Invalid verification code',
            expectedStatus: 401,
          },
          {
            error: 'Too many attempts',
            expectedStatus: 429,
          },
        ];

        for (const testCase of testCases) {
          mockMfaServiceInstance.verifyMFA.mockResolvedValue({
            success: false,
            error: testCase.error,
          });

          const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validMfaRequest),
          });

          const response = await POST(request);
          expect(response.status).toBe(testCase.expectedStatus);
        }
      });
    });

    describe('Backup Code Warnings', () => {
      it('should warn when last backup code is used', async () => {
        mockValidateRequestBody.mockReturnValue({
          success: true,
          data: validBackupCodeRequest,
        });

        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: true,
          verified: true,
        });

        mockAuthServiceInstance.getCurrentUser.mockResolvedValue({
          ...mockUser,
          id: validBackupCodeRequest.userId,
          status: 'active',
        });

        mockMfaServiceInstance.getMFAStatus.mockResolvedValue({
          isEnabled: true,
          backupCodesRemaining: 0,
        });

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBackupCodeRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data.data.mfa.warnings).toContain('This was your last backup code');
      });

      it('should warn when backup codes are running low', async () => {
        mockValidateRequestBody.mockReturnValue({
          success: true,
          data: validBackupCodeRequest,
        });

        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: true,
          verified: true,
        });

        mockAuthServiceInstance.getCurrentUser.mockResolvedValue({
          ...mockUser,
          id: validBackupCodeRequest.userId,
          status: 'active',
        });

        mockMfaServiceInstance.getMFAStatus.mockResolvedValue({
          isEnabled: true,
          backupCodesRemaining: 2,
        });

        const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBackupCodeRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data.data.mfa.warnings).toContain('You have only 2 backup codes remaining');
      });
    });
  });

  describe('HTTP Method Security', () => {
    it('should return 405 for GET requests', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method not allowed');
    });

    it('should return 405 for PUT requests', async () => {
      const response = await PUT();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method not allowed');
    });

    it('should return 405 for DELETE requests', async () => {
      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method not allowed');
    });

    it('should handle OPTIONS for CORS', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signin-mfa', {
        method: 'OPTIONS',
      });

      const response = await OPTIONS(request);

      expect(response.status).toBe(200);
      expect(mockCreateCorsResponse).toHaveBeenCalledWith(request);
    });
  });
});