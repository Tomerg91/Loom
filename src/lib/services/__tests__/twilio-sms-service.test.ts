// src/lib/services/__tests__/twilio-sms-service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createTwilioSMSService } from '../twilio-sms-service';

// Mock the Twilio module
vi.mock('twilio', () => {
  return {
    default: vi.fn((accountSid: string, _authToken: string) => {
      const isValid = accountSid.startsWith('AC') || accountSid === 'test-sid';
      return {
        messages: {
          create: vi.fn(async () => {
            if (!isValid) {
              throw new Error('Invalid credentials');
            }
            return {
              sid: 'msg_test_123456',
              status: 'queued',
            };
          }),
        },
      };
    }),
  };
});

describe('Twilio SMS Service', () => {
  it('should send SMS successfully with valid phone and message', async () => {
    const mockEnv = {
      TWILIO_ACCOUNT_SID: 'test-sid',
      TWILIO_AUTH_TOKEN: 'test-token',
      TWILIO_PHONE_NUMBER: '+1234567890',
    };

    const service = createTwilioSMSService(mockEnv);
    const result = await service.sendSMS('+1987654321', 'Your OTP is 123456');

    expect(result.success).toBe(true);
    expect(result.messageSid).toBeDefined();
  });

  it('should handle SMS sending failure gracefully', async () => {
    const mockEnv = {
      TWILIO_ACCOUNT_SID: 'invalid',
      TWILIO_AUTH_TOKEN: 'invalid',
      TWILIO_PHONE_NUMBER: '+1234567890',
    };

    const service = createTwilioSMSService(mockEnv);
    const result = await service.sendSMS('+1987654321', 'Test');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should validate phone number format before sending', async () => {
    const mockEnv = {
      TWILIO_ACCOUNT_SID: 'test-sid',
      TWILIO_AUTH_TOKEN: 'test-token',
      TWILIO_PHONE_NUMBER: '+1234567890',
    };

    const service = createTwilioSMSService(mockEnv);
    const result = await service.sendSMS('invalid-phone', 'Test');

    expect(result.success).toBe(false);
    expect(result.error).toContain('invalid phone');
  });

  it('should reject empty message', async () => {
    const mockEnv = {
      TWILIO_ACCOUNT_SID: 'test-sid',
      TWILIO_AUTH_TOKEN: 'test-token',
      TWILIO_PHONE_NUMBER: '+1234567890',
    };

    const service = createTwilioSMSService(mockEnv);
    const result = await service.sendSMS('+1987654321', '');

    expect(result.success).toBe(false);
    expect(result.error).toContain('cannot be empty');
  });

  it('should send OTP with proper message format', async () => {
    const mockEnv = {
      TWILIO_ACCOUNT_SID: 'test-sid',
      TWILIO_AUTH_TOKEN: 'test-token',
      TWILIO_PHONE_NUMBER: '+1234567890',
    };

    const service = createTwilioSMSService(mockEnv);
    const result = await service.sendOTP('+1987654321', '123456');

    expect(result.success).toBe(true);
    expect(result.messageSid).toBeDefined();
  });

  it('should validate sender phone number format on initialization', async () => {
    const mockEnv = {
      TWILIO_ACCOUNT_SID: 'test-sid',
      TWILIO_AUTH_TOKEN: 'test-token',
      TWILIO_PHONE_NUMBER: 'invalid-phone',
    };

    expect(() => {
      createTwilioSMSService(mockEnv);
    }).toThrow('TWILIO_PHONE_NUMBER must be in E.164 format');
  });
});
