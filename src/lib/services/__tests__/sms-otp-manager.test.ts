// src/lib/services/__tests__/sms-otp-manager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSMSOTPManager } from '../sms-otp-manager';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TwilioSMSService } from '../twilio-sms-service';

describe('SMS OTP Manager', () => {
  let manager: ReturnType<typeof createSMSOTPManager>;
  let mockSupabase: Partial<SupabaseClient>;
  let mockTwilio: Partial<TwilioSMSService>;

  beforeEach(() => {
    mockTwilio = {
      sendOTP: vi
        .fn()
        .mockResolvedValue({ success: true, messageSid: 'msg_123' }),
    };

    // Create chainable mocks for Supabase queries
    const createChainableMock = (finalData: unknown) => {
      const chain = {
        eq: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
      };
      // Make all methods return the chain and the final limit returns the data
      chain.eq.mockReturnValue(chain);
      chain.order.mockReturnValue(chain);
      chain.limit.mockResolvedValue(finalData);
      return chain;
    };

    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'sms_otp_codes') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            select: vi.fn(() => {
              // Default: return valid OTP record
              return createChainableMock({
                data: [
                  {
                    id: 'otp-1',
                    user_id: 'user-123',
                    phone_number: '+1987654321',
                    otp_code: '123456',
                    attempts: 0,
                    max_attempts: 5,
                    created_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                    verified_at: null,
                  },
                ],
                error: null,
              });
            }),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          };
        }
        if (table === 'sms_delivery_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          select: vi.fn(() => createChainableMock({ data: [], error: null })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        };
      }),
    };

    manager = createSMSOTPManager(
      mockSupabase as SupabaseClient,
      mockTwilio as TwilioSMSService
    );
  });

  it('should generate and send OTP successfully', async () => {
    const result = await manager.generateAndSendOTP('user-123', '+1987654321');

    expect(result.success).toBe(true);
    expect(result.otpCode).toHaveLength(6);
    expect(mockTwilio.sendOTP).toHaveBeenCalled();
  });

  it('should verify correct OTP code', async () => {
    const result = await manager.verifyOTP('user-123', '123456');

    expect(result.success).toBe(true);
  });

  it('should reject expired OTP codes', async () => {
    // Override the mock to return an expired OTP
    const createChainableMock = (finalData: unknown) => {
      const chain = {
        eq: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
      };
      chain.eq.mockReturnValue(chain);
      chain.order.mockReturnValue(chain);
      chain.limit.mockResolvedValue(finalData);
      return chain;
    };

    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'sms_otp_codes') {
        return {
          select: vi.fn(() => {
            return createChainableMock({
              data: [
                {
                  id: 'otp-1',
                  user_id: 'user-123',
                  phone_number: '+1987654321',
                  otp_code: '123456',
                  attempts: 0,
                  max_attempts: 5,
                  created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
                  expires_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // Expired
                  verified_at: null,
                },
              ],
              error: null,
            });
          }),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        };
      }
      return {};
    });

    // Re-create manager with updated mock
    manager = createSMSOTPManager(
      mockSupabase as SupabaseClient,
      mockTwilio as TwilioSMSService
    );

    const result = await manager.verifyOTP('user-123', '123456', {
      expiredOK: false,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('expired');
  });

  it('should enforce max attempts limit', async () => {
    // Override the mock to return OTP record with max attempts reached
    const createChainableMock = (finalData: unknown) => {
      const chain = {
        eq: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
      };
      chain.eq.mockReturnValue(chain);
      chain.order.mockReturnValue(chain);
      chain.limit.mockResolvedValue(finalData);
      return chain;
    };

    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'sms_otp_codes') {
        return {
          select: vi.fn(() => {
            return createChainableMock({
              data: [
                {
                  id: 'otp-1',
                  user_id: 'user-123',
                  phone_number: '+1987654321',
                  otp_code: '123456',
                  attempts: 5, // Max attempts reached
                  max_attempts: 5,
                  created_at: new Date().toISOString(),
                  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                  verified_at: null,
                },
              ],
              error: null,
            });
          }),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        };
      }
      return {};
    });

    // Re-create manager with updated mock
    manager = createSMSOTPManager(
      mockSupabase as SupabaseClient,
      mockTwilio as TwilioSMSService
    );

    const result = await manager.verifyOTP('user-123', 'wrong-code');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Maximum OTP attempts exceeded');
  });
});
