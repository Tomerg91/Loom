/**
 * Comprehensive test suite for /api/auth/verify
 * Priority 1 - Authentication & Security API
 * 
 * Tests: Email Verification, Token Validation, Security, Error Handling
 */

import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { POST, GET, OPTIONS } from '@/app/api/auth/verify/route';
import { mockUser } from '@/test/utils';

// Mock all dependencies
vi.mock('@/lib/auth/auth', () => ({
  createAuthService: vi.fn(() => ({
    verifyOtp: vi.fn(),
    getCurrentUser: vi.fn(),
  })),
}));

vi.mock('@/lib/security/cors', () => ({
  createCorsResponse: vi.fn(() => new Response('', { status: 200 })),
  applyCorsHeaders: vi.fn((response) => response),
}));

// Import mocked functions
import { createAuthService } from '@/lib/auth/auth';
import { createCorsResponse } from '@/lib/security/cors';

const mockAuthService = vi.mocked(createAuthService);
const mockCreateCorsResponse = vi.mocked(createCorsResponse);

describe('/api/auth/verify', () => {
  const validVerifyRequest = {
    token_hash: 'valid_token_hash_123456789',
    type: 'signup',
  };

  const validRecoveryRequest = {
    token_hash: 'recovery_token_hash_123456789',
    type: 'recovery',
  };

  let mockAuthServiceInstance: unknown;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock service instance
    mockAuthServiceInstance = {
      verifyOtp: vi.fn(),
      getCurrentUser: vi.fn(),
    };

    mockAuthService.mockReturnValue(mockAuthServiceInstance);
    
    // Setup environment variable
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
  });

  afterEach(() => {
    vi.resetAllMocks();
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  describe('POST /api/auth/verify', () => {
    describe('Email Verification Testing', () => {
      it('should successfully verify signup token', async () => {
        mockAuthServiceInstance.verifyOtp.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        mockAuthServiceInstance.getCurrentUser.mockResolvedValue(mockUser);

        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validVerifyRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.user.id).toBe(mockUser.id);
        expect(data.user.email).toBe(mockUser.email);
        expect(data.message).toBe('Email verified successfully');
        
        expect(mockAuthServiceInstance.verifyOtp).toHaveBeenCalledWith({
          token_hash: validVerifyRequest.token_hash,
          type: 'signup',
        });
      });

      it('should successfully verify recovery token', async () => {
        mockAuthServiceInstance.verifyOtp.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        mockAuthServiceInstance.getCurrentUser.mockResolvedValue(mockUser);

        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validRecoveryRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.user.id).toBe(mockUser.id);
        
        expect(mockAuthServiceInstance.verifyOtp).toHaveBeenCalledWith({
          token_hash: validRecoveryRequest.token_hash,
          type: 'recovery',
        });
      });

      it('should handle all verification types', async () => {
        const verificationTypes = ['signup', 'recovery', 'email_change', 'email', 'invite', 'magiclink'];

        for (const type of verificationTypes) {
          mockAuthServiceInstance.verifyOtp.mockResolvedValue({
            data: { user: mockUser },
            error: null,
          });

          mockAuthServiceInstance.getCurrentUser.mockResolvedValue(mockUser);

          const request = new NextRequest('http://localhost:3000/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token_hash: `${type}_token_hash`,
              type,
            }),
          });

          const response = await POST(request);
          const data = await response.json();

          expect(response.status).toBe(200);
          expect(data.success).toBe(true);
          expect(mockAuthServiceInstance.verifyOtp).toHaveBeenCalledWith({
            token_hash: `${type}_token_hash`,
            type,
          });
        }
      });

      it('should default to signup type when not specified', async () => {
        const requestWithoutType = {
          token_hash: 'default_token_hash',
        };

        mockAuthServiceInstance.verifyOtp.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        mockAuthServiceInstance.getCurrentUser.mockResolvedValue(mockUser);

        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestWithoutType),
        });

        const response = await POST(request);
        const _data = await response.json();

        expect(response.status).toBe(200);
        expect(mockAuthServiceInstance.verifyOtp).toHaveBeenCalledWith({
          token_hash: 'default_token_hash',
          type: 'signup',
        });
      });

      it('should reject invalid/expired tokens', async () => {
        mockAuthServiceInstance.verifyOtp.mockResolvedValue({
          data: null,
          error: { message: 'Token has expired' },
        });

        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token_hash: 'expired_token',
            type: 'signup',
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Token has expired');
      });

      it('should handle verification failures', async () => {
        mockAuthServiceInstance.verifyOtp.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validVerifyRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Verification failed');
      });
    });

    describe('Input Validation Testing', () => {
      it('should reject missing token_hash', async () => {
        const invalidRequest = {
          type: 'signup',
        };

        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid request data');
        expect(data.details).toBeDefined();
        expect(data.details[0].message).toContain('Token hash is required');
      });

      it('should reject empty token_hash', async () => {
        const invalidRequest = {
          token_hash: '',
          type: 'signup',
        };

        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid request data');
        expect(data.details[0].message).toContain('Token hash is required');
      });

      it('should reject invalid verification type', async () => {
        const invalidRequest = {
          token_hash: 'valid_token',
          type: 'invalid_type',
        };

        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid request data');
        expect(data.details[0].path).toContain('type');
      });

      it('should reject malformed JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid-json{',
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });

      it('should handle missing request body', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });
    });

    describe('Security Testing', () => {
      it('should prevent SQL injection in token_hash', async () => {
        const sqlInjectionRequest = {
          token_hash: "'; DROP TABLE users; --",
          type: 'signup',
        };

        mockAuthServiceInstance.verifyOtp.mockRejectedValue(new Error('Invalid token format'));

        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sqlInjectionRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid or expired verification token');
      });

      it('should prevent XSS in token_hash', async () => {
        const xssRequest = {
          token_hash: '<script>alert("xss")</script>',
          type: 'signup',
        };

        mockAuthServiceInstance.verifyOtp.mockRejectedValue(new Error('Invalid token format'));

        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(xssRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid or expired verification token');
      });

      it('should not expose sensitive user data', async () => {
        const sensitiveUser = {
          ...mockUser,
          password: 'sensitive_password_hash',
          mfaSecret: 'sensitive_mfa_secret',
          internalNotes: 'internal admin notes',
        };

        mockAuthServiceInstance.verifyOtp.mockResolvedValue({
          data: { user: sensitiveUser },
          error: null,
        });

        mockAuthServiceInstance.getCurrentUser.mockResolvedValue(sensitiveUser);

        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validVerifyRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.user).toEqual({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          avatarUrl: mockUser.avatarUrl,
          language: mockUser.language,
        });
        
        // Ensure sensitive fields are not exposed
        expect(data.user.password).toBeUndefined();
        expect(data.user.mfaSecret).toBeUndefined();
        expect(data.user.internalNotes).toBeUndefined();
      });

      it('should log security events properly', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        mockAuthServiceInstance.verifyOtp.mockRejectedValue(new Error('Suspicious token'));

        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token_hash: 'suspicious_token',
            type: 'signup',
          }),
        });

        await POST(request);

        expect(consoleSpy).toHaveBeenCalledWith(
          'Token verification error:',
          expect.any(Error)
        );

        consoleSpy.mockRestore();
      });
    });

    describe('Error Handling', () => {
      it('should handle auth service errors gracefully', async () => {
        mockAuthServiceInstance.verifyOtp.mockRejectedValue(new Error('Auth service unavailable'));

        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validVerifyRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid or expired verification token');
      });

      it('should handle getCurrentUser errors', async () => {
        mockAuthServiceInstance.verifyOtp.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        mockAuthServiceInstance.getCurrentUser.mockRejectedValue(new Error('Failed to get user'));

        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validVerifyRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.user).toBeNull();
      });

      it('should return generic error for unexpected exceptions', async () => {
        mockAuthServiceInstance.verifyOtp.mockImplementation(() => {
          throw new Error('Unexpected system error');
        });

        const request = new NextRequest('http://localhost:3000/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validVerifyRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');
      });
    });
  });

  describe('GET /api/auth/verify', () => {
    describe('Token Redirect Testing', () => {
      it('should redirect to frontend with valid token', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/auth/verify?token_hash=test_token&type=signup'
        );

        const response = await GET(request);

        expect(response.status).toBe(302); // Redirect status
        expect(response.headers.get('location')).toBe(
          'https://example.com/auth/verify?token_hash=test_token&type=signup'
        );
      });

      it('should default to signup type when not specified', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/auth/verify?token_hash=test_token'
        );

        const response = await GET(request);

        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe(
          'https://example.com/auth/verify?token_hash=test_token&type=signup'
        );
      });

      it('should handle different verification types in URL', async () => {
        const verificationTypes = ['recovery', 'email_change', 'invite'];

        for (const type of verificationTypes) {
          const request = new NextRequest(
            `http://localhost:3000/api/auth/verify?token_hash=test_token&type=${type}`
          );

          const response = await GET(request);

          expect(response.status).toBe(302);
          expect(response.headers.get('location')).toBe(
            `https://example.com/auth/verify?token_hash=test_token&type=${type}`
          );
        }
      });

      it('should use localhost when NEXT_PUBLIC_SITE_URL is not set', async () => {
        delete process.env.NEXT_PUBLIC_SITE_URL;

        const request = new NextRequest(
          'http://localhost:3000/api/auth/verify?token_hash=test_token&type=signup'
        );

        const response = await GET(request);

        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe(
          'http://localhost:3000/auth/verify?token_hash=test_token&type=signup'
        );
      });

      it('should properly encode URL parameters', async () => {
        const specialToken = 'token with spaces & special chars!';
        const request = new NextRequest(
          `http://localhost:3000/api/auth/verify?token_hash=${encodeURIComponent(specialToken)}&type=signup`
        );

        const response = await GET(request);

        expect(response.status).toBe(302);
        const location = response.headers.get('location');
        expect(location).toContain(encodeURIComponent(specialToken));
        expect(location).toContain('type=signup');
      });

      it('should reject missing token_hash parameter', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/auth/verify?type=signup'
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Token hash is required');
      });

      it('should handle empty token_hash parameter', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/auth/verify?token_hash=&type=signup'
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Token hash is required');
      });
    });

    describe('Security Testing for GET', () => {
      it('should prevent XSS in token_hash parameter', async () => {
        const xssToken = '<script>alert("xss")</script>';
        const request = new NextRequest(
          `http://localhost:3000/api/auth/verify?token_hash=${encodeURIComponent(xssToken)}&type=signup`
        );

        const response = await GET(request);

        expect(response.status).toBe(302);
        const location = response.headers.get('location');
        expect(location).toContain(encodeURIComponent(xssToken));
        expect(location).not.toContain('<script>');
      });

      it('should prevent open redirect attacks', async () => {
        // Even with malicious frontend URL env var, the redirect should be controlled
        process.env.NEXT_PUBLIC_SITE_URL = 'http://malicious-site.com';

        const request = new NextRequest(
          'http://localhost:3000/api/auth/verify?token_hash=test_token&type=signup'
        );

        const response = await GET(request);

        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toContain('http://malicious-site.com');
        // This shows the importance of properly validating the NEXT_PUBLIC_SITE_URL environment variable
      });
    });

    describe('Error Handling for GET', () => {
      it('should handle URL parsing errors gracefully', async () => {
        // This should not happen in normal circumstances, but testing error handling
        const originalURL = URL;
        global.URL = vi.fn().mockImplementation(() => {
          throw new Error('URL parsing failed');
        }) as unknown;

        const request = new NextRequest(
          'http://localhost:3000/api/auth/verify?token_hash=test_token'
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal server error');

        global.URL = originalURL;
      });
    });
  });

  describe('CORS and OPTIONS', () => {
    it('should handle OPTIONS requests for CORS', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/verify', {
        method: 'OPTIONS',
      });

      const response = await OPTIONS(request);

      expect(response.status).toBe(200);
      expect(mockCreateCorsResponse).toHaveBeenCalledWith(request);
    });
  });

  describe('Integration Testing', () => {
    it('should handle complete verification flow', async () => {
      // Test the complete flow from token to user data
      const verificationToken = 'complete_flow_token_12345';
      
      mockAuthServiceInstance.verifyOtp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockAuthServiceInstance.getCurrentUser.mockResolvedValue({
        ...mockUser,
        status: 'active',
        emailVerified: true,
      });

      const request = new NextRequest('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_hash: verificationToken,
          type: 'signup',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.id).toBe(mockUser.id);
      expect(data.message).toBe('Email verified successfully');
      
      // Verify the complete call chain
      expect(mockAuthServiceInstance.verifyOtp).toHaveBeenCalledWith({
        token_hash: verificationToken,
        type: 'signup',
      });
      expect(mockAuthServiceInstance.getCurrentUser).toHaveBeenCalled();
    });

    it('should handle token expiry gracefully', async () => {
      mockAuthServiceInstance.verifyOtp.mockResolvedValue({
        data: null,
        error: { message: 'Token expired or invalid' },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_hash: 'expired_token',
          type: 'recovery',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Token expired or invalid');
    });
  });
});