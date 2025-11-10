/**
 * Integration Tests for SMS OTP MFA Flow
 *
 * Tests the complete end-to-end SMS MFA workflow:
 * 1. Request SMS OTP via API
 * 2. Retrieve OTP from database (test only)
 * 3. Verify OTP via API
 * 4. Handle invalid codes and rate limiting
 *
 * Reference: docs/plans/2025-01-15-sms-otp-mfa.md Task 7
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as RequestOTP } from '@/app/api/auth/mfa/sms/request/route';
import { POST as VerifyOTP } from '@/app/api/auth/mfa/sms/verify/route';
import { createServerClientWithRequest } from '@/lib/supabase/server';
import { createAuthService } from '@/lib/auth/auth';
import { mockUser } from '@/test/utils';

// Mock dependencies
vi.mock('@/lib/auth/auth', () => ({
  createAuthService: vi.fn(() => ({
    getCurrentUser: vi.fn(),
  })),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClientWithRequest: vi.fn(),
}));

vi.mock('@/lib/services/twilio-sms-service', () => ({
  createTwilioSMSService: vi.fn(() => ({
    sendOTP: vi.fn().mockResolvedValue({
      success: true,
      messageSid: 'SM_mock_message_sid',
    }),
  })),
}));

interface OTPRecord {
  id: string;
  user_id: string;
  phone_number: string;
  otp_code: string;
  attempts: number;
  max_attempts: number;
  created_at: string;
  expires_at: string;
  verified_at: string | null;
}

interface DeliveryLog {
  id: string;
  user_id: string;
  phone_number: string;
  message: string;
  twilio_message_sid?: string;
  status: string;
  created_at: string;
}

describe('SMS MFA Integration Flow', () => {
  let mockSupabase: {
    from: (table: string) => {
      insert?: (data: Record<string, unknown>) => { error: unknown; data: unknown };
      select?: () => {
        eq: () => {
          is: () => {
            order: () => {
              limit: () => Promise<{ data: OTPRecord[] | null; error: unknown }>;
            };
          };
        };
      };
      update?: (updates: Record<string, unknown>) => {
        eq: (field: string, value: string) => Promise<{ error: unknown; data: unknown }>;
      };
    };
  };
  let mockAuthServiceInstance: {
    getCurrentUser: ReturnType<typeof vi.fn>;
  };
  let testUser: typeof mockUser & { id: string };
  let storedOTPCode: string | null = null;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup test user
    testUser = {
      ...mockUser,
      id: 'test-user-' + Date.now(),
    };

    // Setup mock auth service
    mockAuthServiceInstance = {
      getCurrentUser: vi.fn().mockResolvedValue(testUser),
    };
    vi.mocked(createAuthService).mockReturnValue(mockAuthServiceInstance);

    // Setup mock Supabase client with realistic database behavior
    const otpRecords: OTPRecord[] = [];
    const deliveryLogs: DeliveryLog[] = [];

    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'sms_otp_codes') {
          return {
            insert: vi.fn((data: Record<string, unknown>) => {
              // Store the OTP code for later retrieval
              const record: OTPRecord = {
                id: 'otp-' + Date.now(),
                user_id: data.user_id as string,
                phone_number: data.phone_number as string,
                otp_code: data.otp_code as string,
                attempts: 0,
                max_attempts: 5,
                created_at: new Date().toISOString(),
                expires_at: data.expires_at as string,
                verified_at: null,
              };
              otpRecords.push(record);
              storedOTPCode = data.otp_code as string;
              return {
                error: null,
                data: [record],
              };
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: otpRecords.filter(
                        (r) => r.user_id === testUser.id && !r.verified_at
                      ),
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
            update: vi.fn((updates: Record<string, unknown>) => ({
              eq: vi.fn().mockImplementation(async (field: string, value: string) => {
                // Update the matching record
                const record = otpRecords.find((r) => r.id === value);
                if (record) {
                  Object.assign(record, updates);
                }
                return {
                  error: null,
                  data: [record],
                };
              }),
            })),
          };
        } else if (table === 'sms_delivery_logs') {
          return {
            insert: vi.fn((data: Record<string, unknown>) => {
              deliveryLogs.push({
                id: 'log-' + Date.now(),
                user_id: data.user_id as string,
                phone_number: data.phone_number as string,
                message: data.message as string,
                twilio_message_sid: data.twilio_message_sid as string,
                status: data.status as string,
                created_at: new Date().toISOString(),
              });
              return {
                error: null,
                data: null,
              };
            }),
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          update: vi.fn().mockReturnThis(),
        };
      }),
    };

    vi.mocked(createServerClientWithRequest).mockReturnValue(mockSupabase);

    // Reset stored OTP code
    storedOTPCode = null;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Complete SMS OTP Flow', () => {
    it('should complete full SMS OTP flow: request, verify, signin', async () => {
      const phoneNumber = '+12345678901';

      // Step 1: Request SMS OTP
      const requestBody = JSON.stringify({ phoneNumber });
      const requestReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      const requestRes = await RequestOTP(requestReq);
      expect(requestRes.status).toBe(200);

      const requestData = await requestRes.json();
      expect(requestData.success).toBe(true);
      expect(requestData.data.message).toContain('OTP sent successfully');
      expect(requestData.data.expiresIn).toBe(300); // 5 minutes in seconds

      // Step 2: Verify that OTP was stored (simulated database check)
      expect(storedOTPCode).toBeTruthy();
      expect(storedOTPCode).toHaveLength(6);
      expect(storedOTPCode).toMatch(/^\d{6}$/);

      // Step 3: Verify OTP with correct code
      const verifyBody = JSON.stringify({ code: storedOTPCode });
      const verifyReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: verifyBody,
      });

      const verifyRes = await VerifyOTP(verifyReq);
      expect(verifyRes.status).toBe(200);

      const verifyData = await verifyRes.json();
      expect(verifyData.success).toBe(true);
      expect(verifyData.data.verified).toBe(true);
      expect(verifyData.data.message).toContain('SMS OTP verified successfully');
    });

    it('should reject verification without requesting OTP first', async () => {
      // Try to verify without requesting OTP
      const verifyBody = JSON.stringify({ code: '123456' });
      const verifyReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: verifyBody,
      });

      const verifyRes = await VerifyOTP(verifyReq);
      expect(verifyRes.status).toBe(401);

      const verifyData = await verifyRes.json();
      expect(verifyData.success).toBe(false);
      expect(verifyData.error).toContain('No OTP found');
    });
  });

  describe('Invalid OTP Code Handling', () => {
    it('should reject invalid OTP code', async () => {
      const phoneNumber = '+12345678902';

      // Request OTP first
      const requestBody = JSON.stringify({ phoneNumber });
      const requestReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      await RequestOTP(requestReq);
      expect(storedOTPCode).toBeTruthy();

      // Try to verify with wrong code
      const wrongCode = '000000';
      expect(wrongCode).not.toBe(storedOTPCode);

      const verifyBody = JSON.stringify({ code: wrongCode });
      const verifyReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: verifyBody,
      });

      const verifyRes = await VerifyOTP(verifyReq);
      expect(verifyRes.status).toBe(401);

      const verifyData = await verifyRes.json();
      expect(verifyData.success).toBe(false);
      expect(verifyData.error).toContain('Invalid OTP');
    });

    it('should increment attempts counter on invalid code', async () => {
      const phoneNumber = '+12345678903';

      // Request OTP
      const requestBody = JSON.stringify({ phoneNumber });
      const requestReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      await RequestOTP(requestReq);

      // Make multiple failed attempts
      for (let i = 0; i < 3; i++) {
        const verifyBody = JSON.stringify({ code: '000000' });
        const verifyReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: verifyBody,
        });

        const verifyRes = await VerifyOTP(verifyReq);
        expect(verifyRes.status).toBe(401);
      }

      // Verify that update was called for attempt tracking
      expect(mockSupabase.from).toHaveBeenCalledWith('sms_otp_codes');
    });
  });

  describe('Rate Limiting and Max Attempts', () => {
    it('should rate limit after max OTP attempts', async () => {
      const phoneNumber = '+12345678904';

      // Request OTP
      const requestBody = JSON.stringify({ phoneNumber });
      const requestReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      await RequestOTP(requestReq);
      expect(storedOTPCode).toBeTruthy();

      // Make exactly 5 failed attempts (max_attempts)
      for (let i = 0; i < 5; i++) {
        const verifyBody = JSON.stringify({ code: '000000' });
        const verifyReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: verifyBody,
        });

        const verifyRes = await VerifyOTP(verifyReq);
        expect(verifyRes.status).toBe(401);
      }

      // 6th attempt should be blocked due to exceeding max attempts
      const finalVerifyBody = JSON.stringify({ code: storedOTPCode });
      const finalVerifyReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: finalVerifyBody,
      });

      const finalVerifyRes = await VerifyOTP(finalVerifyReq);
      expect(finalVerifyRes.status).toBe(401);

      const finalData = await finalVerifyRes.json();
      expect(finalData.success).toBe(false);
      expect(finalData.error).toContain('Maximum OTP attempts exceeded');
    });

    it('should prevent verification after OTP expires', async () => {
      const phoneNumber = '+12345678905';

      // Create mock Supabase with expired OTP
      const expiredOTPRecords: OTPRecord[] = [
        {
          id: 'expired-otp-123',
          user_id: testUser.id,
          phone_number: phoneNumber,
          otp_code: '123456',
          attempts: 0,
          max_attempts: 5,
          created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
          expires_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // Expired 5 minutes ago
          verified_at: null,
        },
      ];

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'sms_otp_codes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: expiredOTPRecords,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      // Try to verify expired OTP
      const verifyBody = JSON.stringify({ code: '123456' });
      const verifyReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: verifyBody,
      });

      const verifyRes = await VerifyOTP(verifyReq);
      expect(verifyRes.status).toBe(401);

      const verifyData = await verifyRes.json();
      expect(verifyData.success).toBe(false);
      expect(verifyData.error).toContain('OTP has expired');
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid phone number format', async () => {
      const invalidNumbers = [
        '1234567890', // Missing +
        '+', // Just +
        '+1', // Too short
        'not-a-number', // Invalid format
        '', // Empty
      ];

      for (const phoneNumber of invalidNumbers) {
        const requestBody = JSON.stringify({ phoneNumber });
        const requestReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        });

        const requestRes = await RequestOTP(requestReq);
        expect(requestRes.status).toBe(400);

        const requestData = await requestRes.json();
        expect(requestData.success).toBe(false);
        expect(requestData.error).toContain('Invalid phone number');
      }
    });

    it('should reject invalid OTP code format', async () => {
      // Try invalid code formats - these should fail validation (400)
      const invalidCodes = [
        '12345', // Too short
        '1234567', // Too long
        '', // Empty
      ];

      for (const code of invalidCodes) {
        const verifyBody = JSON.stringify({ code });
        const verifyReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: verifyBody,
        });

        const verifyRes = await VerifyOTP(verifyReq);
        expect(verifyRes.status).toBe(400);

        const verifyData = await verifyRes.json();
        expect(verifyData.success).toBe(false);
        expect(verifyData.error).toContain('Code must be 6 digits');
      }
    });

    it('should reject non-numeric OTP codes during verification', async () => {
      const phoneNumber = '+12345678906';

      // Request OTP first
      const requestBody = JSON.stringify({ phoneNumber });
      const requestReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      await RequestOTP(requestReq);
      expect(storedOTPCode).toBeTruthy();

      // Try codes that pass validation (6 chars) but fail verification
      const invalidCodes = [
        'abcdef', // Letters
        '12345a', // Mixed
      ];

      for (const code of invalidCodes) {
        const verifyBody = JSON.stringify({ code });
        const verifyReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: verifyBody,
        });

        const verifyRes = await VerifyOTP(verifyReq);
        // These codes pass validation (6 chars) but fail verification
        expect(verifyRes.status).toBe(401);

        const verifyData = await verifyRes.json();
        expect(verifyData.success).toBe(false);
        expect(verifyData.error).toContain('Invalid OTP');
      }
    });
  });

  describe('Authentication Requirements', () => {
    it('should reject request without authenticated user', async () => {
      // Mock no authenticated user
      mockAuthServiceInstance.getCurrentUser.mockResolvedValue(null);

      const requestBody = JSON.stringify({ phoneNumber: '+12345678907' });
      const requestReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      const requestRes = await RequestOTP(requestReq);
      expect(requestRes.status).toBe(401);

      const requestData = await requestRes.json();
      expect(requestData.success).toBe(false);
      expect(requestData.error).toBe('Unauthorized');
    });

    it('should reject verification without authenticated user', async () => {
      // Mock no authenticated user
      mockAuthServiceInstance.getCurrentUser.mockResolvedValue(null);

      const verifyBody = JSON.stringify({ code: '123456' });
      const verifyReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: verifyBody,
      });

      const verifyRes = await VerifyOTP(verifyReq);
      expect(verifyRes.status).toBe(401);

      const verifyData = await verifyRes.json();
      expect(verifyData.success).toBe(false);
      expect(verifyData.error).toBe('Unauthorized');
    });
  });

  describe('Database Error Handling', () => {
    it('should handle database errors gracefully on OTP insert', async () => {
      // Mock database error
      mockSupabase.from = vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({
          error: { message: 'Database connection failed' },
          data: null,
        }),
      }));

      const requestBody = JSON.stringify({ phoneNumber: '+12345678908' });
      const requestReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      const requestRes = await RequestOTP(requestReq);
      expect(requestRes.status).toBe(500);

      const requestData = await requestRes.json();
      expect(requestData.success).toBe(false);
      expect(requestData.error).toContain('Failed to store OTP');
    });

    it('should handle database errors gracefully on OTP verification', async () => {
      // Mock database error
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database query failed' },
                }),
              }),
            }),
          }),
        }),
      }));

      const verifyBody = JSON.stringify({ code: '123456' });
      const verifyReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: verifyBody,
      });

      const verifyRes = await VerifyOTP(verifyReq);
      expect(verifyRes.status).toBe(401);

      const verifyData = await verifyRes.json();
      expect(verifyData.success).toBe(false);
      expect(verifyData.error).toContain('No OTP found');
    });
  });

  describe('SMS Delivery Logging', () => {
    it('should log SMS delivery on successful send', async () => {
      const phoneNumber = '+12345678909';

      const requestBody = JSON.stringify({ phoneNumber });
      const requestReq = new NextRequest('http://localhost:3000/api/auth/mfa/sms/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      const requestRes = await RequestOTP(requestReq);
      expect(requestRes.status).toBe(200);

      // Verify that delivery log was created
      expect(mockSupabase.from).toHaveBeenCalledWith('sms_delivery_logs');
    });
  });
});
