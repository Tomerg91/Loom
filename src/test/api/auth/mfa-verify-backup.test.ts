/**
 * Comprehensive test suite for /api/auth/mfa/verify-backup
 * Priority 1 - Authentication & Security API
 * 
 * Tests: Authentication, Input Validation, Rate Limiting, Security, Backup Code Consumption
 */

import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { POST, GET, PUT, DELETE } from '@/app/api/auth/mfa/verify-backup/route';
import { mockUser } from '@/test/utils';

// Mock all dependencies
vi.mock('@/lib/services/mfa-service', () => ({
  createMfaService: vi.fn(() => ({
    verifyMFA: vi.fn(),
    getMFAStatus: vi.fn(),
    requiresMFA: vi.fn(),
  })),
  getClientIP: vi.fn(),
  getUserAgent: vi.fn(),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  rateLimit: vi.fn((limit, window, options) => (handler: any) => handler),
}));

// Import mocked functions
import { createMfaService, getClientIP, getUserAgent } from '@/lib/services/mfa-service';
import { rateLimit } from '@/lib/security/rate-limit';

const mockMfaService = vi.mocked(createMfaService);
const mockGetClientIP = vi.mocked(getClientIP);
const mockGetUserAgent = vi.mocked(getUserAgent);
const mockRateLimit = vi.mocked(rateLimit);

describe('/api/auth/mfa/verify-backup', () => {
  const validBackupRequest = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    backupCode: 'ABCD1234',
  };

  let mockMfaServiceInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock service instance
    mockMfaServiceInstance = {
      verifyMFA: vi.fn(),
      getMFAStatus: vi.fn(),
      requiresMFA: vi.fn(),
    };

    mockMfaService.mockReturnValue(mockMfaServiceInstance);
    
    // Setup default client info
    mockGetClientIP.mockReturnValue('192.168.1.100');
    mockGetUserAgent.mockReturnValue('Mozilla/5.0 Test Browser');
    
    // Setup default rate limiting (no-op wrapper)
    mockRateLimit.mockImplementation((limit, window, options) => (handler) => handler);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/auth/mfa/verify-backup', () => {
    describe('Authentication Testing', () => {
      it('should successfully verify valid backup code', async () => {
        mockMfaServiceInstance.requiresMFA.mockResolvedValue(true);
        mockMfaServiceInstance.getMFAStatus
          .mockResolvedValueOnce({ isEnabled: true, backupCodesRemaining: 3 }) // Before verification
          .mockResolvedValueOnce({ isEnabled: true, backupCodesRemaining: 2 }); // After verification
        
        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: true,
          verified: true,
        });

        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBackupRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.verified).toBe(true);
        expect(data.data.method).toBe('backup_code');
        expect(data.data.backupCodesRemaining).toBe(2);
        expect(data.data.codeConsumed).toBe(true);
        
        expect(mockMfaServiceInstance.verifyMFA).toHaveBeenCalledWith(
          validBackupRequest.userId,
          'ABCD1234',
          'backup_code',
          '192.168.1.100',
          'Mozilla/5.0 Test Browser'
        );
      });

      it('should reject invalid backup code', async () => {
        mockMfaServiceInstance.requiresMFA.mockResolvedValue(true);
        mockMfaServiceInstance.getMFAStatus.mockResolvedValue({
          isEnabled: true,
          backupCodesRemaining: 3,
        });
        
        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: false,
          error: 'Invalid backup code',
        });

        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBackupRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBeFalsy();
        expect(data.error).toBe('Invalid backup code');
        expect(data.code).toBe('INVALID_CODE');
      });

      it('should reject when MFA is not enabled for user', async () => {
        mockMfaServiceInstance.requiresMFA.mockResolvedValue(false);

        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBackupRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBeFalsy();
        expect(data.error).toBe('MFA is not enabled for this user');
      });

      it('should handle when no backup codes are available', async () => {
        mockMfaServiceInstance.requiresMFA.mockResolvedValue(true);
        mockMfaServiceInstance.getMFAStatus.mockResolvedValue({
          isEnabled: true,
          backupCodesRemaining: 0,
        });
        
        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: false,
          error: 'No backup codes available',
        });

        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBackupRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBeFalsy();
        expect(data.error).toBe('No backup codes available. Please use your authenticator app or contact support.');
        expect(data.code).toBe('NO_BACKUP_CODES');
        
        // Should still call verifyMFA for audit logging
        expect(mockMfaServiceInstance.verifyMFA).toHaveBeenCalled();
      });
    });

    describe('Input Validation Testing', () => {
      it('should reject invalid UUID format', async () => {
        const invalidRequest = {
          userId: 'invalid-uuid',
          backupCode: 'ABCD1234',
        };

        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid request format');
        expect(data.details).toBeDefined();
      });

      it('should reject backup codes that are not exactly 8 characters', async () => {
        const testCases = [
          'ABC123', // Too short
          'ABCD12345', // Too long
        ];

        for (const backupCode of testCases) {
          const invalidRequest = {
            userId: validBackupRequest.userId,
            backupCode,
          };

          const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invalidRequest),
          });

          const response = await POST(request);
          const data = await response.json();

          expect(response.status).toBe(400);
          expect(data.error).toBe('Invalid request format');
        }
      });

      it('should reject backup codes with invalid characters', async () => {
        const invalidRequest = {
          userId: validBackupRequest.userId,
          backupCode: 'abc!@#$%', // lowercase and special chars
        };

        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid request format');
      });

      it('should transform backup codes to uppercase', async () => {
        const lowercaseRequest = {
          userId: validBackupRequest.userId,
          backupCode: 'abcd1234',
        };

        mockMfaServiceInstance.requiresMFA.mockResolvedValue(true);
        mockMfaServiceInstance.getMFAStatus
          .mockResolvedValueOnce({ isEnabled: true, backupCodesRemaining: 3 })
          .mockResolvedValueOnce({ isEnabled: true, backupCodesRemaining: 2 });
        
        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: true,
          verified: true,
        });

        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lowercaseRequest),
        });

        const response = await POST(request);

        expect(response.status).toBe(200);
        expect(mockMfaServiceInstance.verifyMFA).toHaveBeenCalledWith(
          expect.any(String),
          'ABCD1234', // Should be transformed to uppercase
          'backup_code',
          expect.any(String),
          expect.any(String)
        );
      });

      it('should reject malformed JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid-json{',
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to verify backup code');
        expect(data.code).toBe('SYSTEM_ERROR');
      });

      it('should reject missing required fields', async () => {
        const incompleteRequest = {
          userId: validBackupRequest.userId,
          // Missing backupCode
        };

        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incompleteRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid request format');
      });
    });

    describe('Rate Limiting Testing', () => {
      it('should apply strict rate limiting for backup code verification', async () => {
        // Verify that rate limiting is configured correctly
        expect(mockRateLimit).toHaveBeenCalledWith(
          5, // 5 attempts per minute
          60000, // 1 minute window
          expect.objectContaining({
            blockDuration: 30 * 60 * 1000, // 30 minutes block
            enableSuspiciousActivityDetection: true,
            skipSuccessfulRequests: false,
          })
        );
      });

      it('should handle rate limiting errors', async () => {
        mockMfaServiceInstance.requiresMFA.mockResolvedValue(true);
        mockMfaServiceInstance.getMFAStatus.mockResolvedValue({
          isEnabled: true,
          backupCodesRemaining: 3,
        });
        
        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: false,
          error: 'Too many attempts. Please try again later.',
        });

        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBackupRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data.error).toContain('Too many attempts');
        expect(data.code).toBe('RATE_LIMITED');
      });

      it('should use IP-based rate limiting key', async () => {
        // The rate limit keyExtractor should use IP address
        const rateLimitCall = mockRateLimit.mock.calls[0];
        const options = rateLimitCall?.[2];

        expect(options?.keyExtractor).toBeDefined();

        // Test the keyExtractor function
        const mockRequest = {
          headers: { get: vi.fn() },
        } as any;

        mockGetClientIP.mockReturnValue('192.168.1.100');

        const key = options?.keyExtractor?.(mockRequest);
        expect(key).toBe('backup-code-verify:192.168.1.100');
      });
    });

    describe('Security Testing', () => {
      it('should prevent SQL injection in userId', async () => {
        const sqlInjectionRequest = {
          userId: "'; DROP TABLE users; --",
          backupCode: 'ABCD1234',
        };

        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sqlInjectionRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid request format');
      });

      it('should prevent XSS in backupCode', async () => {
        const xssRequest = {
          userId: validBackupRequest.userId,
          backupCode: '<script>alert("xss")</script>',
        };

        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(xssRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid request format');
      });

      it('should log security events with client information', async () => {
        mockMfaServiceInstance.requiresMFA.mockResolvedValue(true);
        mockMfaServiceInstance.getMFAStatus
          .mockResolvedValueOnce({ isEnabled: true, backupCodesRemaining: 3 })
          .mockResolvedValueOnce({ isEnabled: true, backupCodesRemaining: 2 });
        
        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: true,
          verified: true,
        });

        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Forwarded-For': '203.0.113.1',
            'User-Agent': 'Mozilla/5.0 (Malicious Browser)',
          },
          body: JSON.stringify(validBackupRequest),
        });

        mockGetClientIP.mockReturnValue('203.0.113.1');
        mockGetUserAgent.mockReturnValue('Mozilla/5.0 (Malicious Browser)');

        await POST(request);

        expect(mockMfaServiceInstance.verifyMFA).toHaveBeenCalledWith(
          validBackupRequest.userId,
          validBackupRequest.backupCode,
          'backup_code',
          '203.0.113.1',
          'Mozilla/5.0 (Malicious Browser)'
        );
      });
    });

    describe('Backup Code Consumption and Warnings', () => {
      it('should warn when last backup code is used', async () => {
        mockMfaServiceInstance.requiresMFA.mockResolvedValue(true);
        mockMfaServiceInstance.getMFAStatus
          .mockResolvedValueOnce({ isEnabled: true, backupCodesRemaining: 1 }) // Before verification
          .mockResolvedValueOnce({ isEnabled: true, backupCodesRemaining: 0 }); // After verification
        
        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: true,
          verified: true,
        });

        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBackupRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.alert).toBe('This was your last backup code. Generate new backup codes immediately to avoid being locked out.');
        expect(data.data.backupCodesRemaining).toBe(0);
      });

      it('should warn when backup codes are running low', async () => {
        mockMfaServiceInstance.requiresMFA.mockResolvedValue(true);
        mockMfaServiceInstance.getMFAStatus
          .mockResolvedValueOnce({ isEnabled: true, backupCodesRemaining: 3 }) // Before verification
          .mockResolvedValueOnce({ isEnabled: true, backupCodesRemaining: 2 }); // After verification
        
        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: true,
          verified: true,
        });

        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBackupRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.warning).toBe('You have only 2 backup codes remaining. Consider generating new ones.');
        expect(data.recommendations).toEqual([
          'Generate new backup codes as soon as possible',
          'Store backup codes in a secure location',
          'Consider using your authenticator app when available',
        ]);
      });

      it('should not show warnings when sufficient backup codes remain', async () => {
        mockMfaServiceInstance.requiresMFA.mockResolvedValue(true);
        mockMfaServiceInstance.getMFAStatus
          .mockResolvedValueOnce({ isEnabled: true, backupCodesRemaining: 5 }) // Before verification
          .mockResolvedValueOnce({ isEnabled: true, backupCodesRemaining: 4 }); // After verification
        
        mockMfaServiceInstance.verifyMFA.mockResolvedValue({
          success: true,
          verified: true,
        });

        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBackupRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.warning).toBeUndefined();
        expect(data.alert).toBeUndefined();
        expect(data.recommendations).toBeUndefined();
      });
    });

    describe('Error Handling', () => {
      it('should handle service errors gracefully', async () => {
        mockMfaServiceInstance.requiresMFA.mockRejectedValue(new Error('Database connection failed'));

        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBackupRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Failed to verify backup code');
        expect(data.code).toBe('SYSTEM_ERROR');
      });

      it('should return different error codes for different scenarios', async () => {
        const testCases = [
          { error: 'Invalid backup code', expectedCode: 'INVALID_CODE' },
          { error: 'MFA not enabled', expectedCode: 'MFA_NOT_ENABLED' },
          { error: 'Too many attempts', expectedCode: 'RATE_LIMITED' },
        ];

        for (const testCase of testCases) {
          mockMfaServiceInstance.requiresMFA.mockResolvedValue(true);
          mockMfaServiceInstance.getMFAStatus.mockResolvedValue({
            isEnabled: true,
            backupCodesRemaining: 3,
          });
          
          mockMfaServiceInstance.verifyMFA.mockResolvedValue({
            success: false,
            error: testCase.error,
          });

          const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validBackupRequest),
          });

          const response = await POST(request);
          const data = await response.json();

          expect(data.code).toBe(testCase.expectedCode);
        }
      });

      it('should not expose sensitive error details in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: 'production',
          writable: true,
          configurable: true,
        });

        mockMfaServiceInstance.requiresMFA.mockRejectedValue(new Error('Sensitive database error'));

        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBackupRequest),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data.details).toBeUndefined();

        Object.defineProperty(process.env, 'NODE_ENV', {
          value: originalEnv,
          writable: true,
          configurable: true,
        });
      });
    });
  });

  describe('GET /api/auth/mfa/verify-backup', () => {
    describe('Backup Code Availability Check', () => {
      it('should return backup code availability for valid user', async () => {
        mockMfaServiceInstance.getMFAStatus.mockResolvedValue({
          isEnabled: true,
          backupCodesRemaining: 3,
        });

        const request = new NextRequest(`http://localhost:3000/api/auth/mfa/verify-backup?userId=${validBackupRequest.userId}`);

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.backupCodesAvailable).toBe(true);
        expect(data.data.backupCodesRemaining).toBe(3);
        expect(data.data.canUseBackupCodes).toBe(true);
      });

      it('should return availability when no backup codes remain', async () => {
        mockMfaServiceInstance.getMFAStatus.mockResolvedValue({
          isEnabled: true,
          backupCodesRemaining: 0,
        });

        const request = new NextRequest(`http://localhost:3000/api/auth/mfa/verify-backup?userId=${validBackupRequest.userId}`);

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.backupCodesAvailable).toBe(false);
        expect(data.data.backupCodesRemaining).toBe(0);
        expect(data.data.canUseBackupCodes).toBe(false);
      });

      it('should reject when MFA is not enabled', async () => {
        mockMfaServiceInstance.getMFAStatus.mockResolvedValue({
          isEnabled: false,
          backupCodesRemaining: 0,
        });

        const request = new NextRequest(`http://localhost:3000/api/auth/mfa/verify-backup?userId=${validBackupRequest.userId}`);

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('MFA is not enabled for this user');
      });

      it('should reject missing userId parameter', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Missing userId parameter');
      });

      it('should reject invalid UUID format', async () => {
        const request = new NextRequest('http://localhost:3000/api/auth/mfa/verify-backup?userId=invalid-uuid');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid userId format');
      });
    });
  });

  describe('HTTP Method Security', () => {
    it('should return 405 for PUT requests', async () => {
      const response = await PUT();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Method not allowed');
    });

    it('should return 405 for DELETE requests', async () => {
      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('Method not allowed');
    });
  });
});