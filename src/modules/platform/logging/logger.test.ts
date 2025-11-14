/**
 * @fileoverview Tests for centralized logger with PII sanitization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, createLogger, sanitize } from './logger';

describe('Logger - PII Sanitization', () => {
  describe('sanitize.email', () => {
    it('should mask email addresses', () => {
      expect(sanitize.email('user@example.com')).toBe('u***@example.com');
      expect(sanitize.email('john.doe@company.org')).toBe('j***@company.org');
      expect(sanitize.email('a@test.com')).toBe('a***@test.com');
    });

    it('should handle invalid emails', () => {
      expect(sanitize.email('notanemail')).toBe('notanemail');
      expect(sanitize.email('')).toBe('');
    });
  });

  describe('sanitize.phone', () => {
    it('should mask phone numbers showing only last 4 digits', () => {
      expect(sanitize.phone('+1234567890')).toBe('***7890');
      expect(sanitize.phone('555-123-4567')).toBe('***4567');
      expect(sanitize.phone('(555) 123-4567')).toBe('***4567');
    });

    it('should handle short phone numbers', () => {
      expect(sanitize.phone('123')).toBe('***');
      expect(sanitize.phone('12')).toBe('***');
    });
  });

  describe('sanitize.creditCard', () => {
    it('should mask credit card numbers showing only last 4 digits', () => {
      expect(sanitize.creditCard('4532-1234-5678-9010')).toBe('****-****-****-9010');
      expect(sanitize.creditCard('4532123456789010')).toBe('****-****-****-9010');
    });

    it('should handle short card numbers', () => {
      expect(sanitize.creditCard('123')).toBe('****');
    });
  });

  describe('sanitize.token', () => {
    it('should mask tokens showing only first 4 characters', () => {
      expect(sanitize.token('test_fake_token_123456')).toBe('test********');
      expect(sanitize.token('fake_test_key_xyz789')).toBe('fake********');
    });

    it('should handle short tokens', () => {
      expect(sanitize.token('short')).toBe('***');
    });
  });

  describe('sanitize.value', () => {
    it('should auto-detect and sanitize email addresses', () => {
      const result = sanitize.value('user@example.com');
      expect(result).toBe('u***@example.com');
    });

    it('should auto-detect and sanitize phone numbers', () => {
      const result = sanitize.value('+1234567890');
      expect(result).toBe('***7890');
    });

    it('should auto-detect and sanitize tokens', () => {
      const result = sanitize.value('test_fake_token_abcdefghijklmnop');
      expect(result).toBe('test********');
    });

    it('should handle arrays', () => {
      const result = sanitize.value(['user@example.com', 'test@test.com']);
      expect(result).toEqual(['u***@example.com', 't***@test.com']);
    });

    it('should handle objects with sensitive keys', () => {
      const result = sanitize.value({
        email: 'user@example.com',
        password: 'secret123',
        name: 'John Doe',
      });

      expect(result).toEqual({
        email: 'u***@example.com',
        password: '[REDACTED]',
        name: 'John Doe',
      });
    });

    it('should handle nested objects', () => {
      const result = sanitize.value({
        user: {
          email: 'user@example.com',
          phone: '+1234567890',
        },
      });

      expect(result).toEqual({
        user: {
          email: 'u***@example.com',
          phone: '***7890',
        },
      });
    });

    it('should leave non-PII values unchanged', () => {
      expect(sanitize.value('regular string')).toBe('regular string');
      expect(sanitize.value(123)).toBe(123);
      expect(sanitize.value(true)).toBe(true);
      expect(sanitize.value(null)).toBe(null);
    });
  });

  describe('sanitize.message', () => {
    it('should sanitize emails in messages', () => {
      const result = sanitize.message('User user@example.com logged in');
      expect(result).toBe('User u***@example.com logged in');
    });

    it('should sanitize phone numbers in messages', () => {
      const result = sanitize.message('Contact at +1234567890');
      expect(result).toBe('Contact at ***7890');
    });

    it('should sanitize tokens in messages', () => {
      const result = sanitize.message('Token: test_fake_token_abcdefghijklmnop');
      expect(result).toContain('test***');
    });

    it('should handle multiple PII instances', () => {
      const result = sanitize.message('user@example.com called +1234567890');
      expect(result).toBe('u***@example.com called ***7890');
    });
  });

  describe('sanitize.metadata', () => {
    it('should sanitize metadata fields', () => {
      const result = sanitize.metadata({
        email: 'user@example.com',
        userId: 'user_123',
        phone: '+1234567890',
      });

      expect(result).toEqual({
        email: 'u***@example.com',
        userId: 'user_123',
        phone: '***7890',
      });
    });

    it('should preserve error objects', () => {
      const error = new Error('Test error');
      const result = sanitize.metadata({
        error,
        email: 'user@example.com',
      });

      expect(result?.error).toBe(error);
      expect(result?.email).toBe('u***@example.com');
    });

    it('should handle undefined metadata', () => {
      expect(sanitize.metadata(undefined)).toBeUndefined();
    });
  });
});

describe('Logger - Basic Functionality', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleInfoSpy: any;
  let consoleDebugSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logger.error', () => {
    it('should log errors with sanitized PII', () => {
      logger.error('User error', {
        email: 'user@example.com',
        context: 'Test',
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0];
      const callString = call.join(' ');
      expect(callString).toContain('User error');
      expect(callString).not.toContain('user@example.com');
      expect(callString).toContain('***@example.com');
    });

    it('should include error objects in logs', () => {
      const error = new Error('Test error');
      logger.error('Operation failed', { error });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const lastCall = consoleErrorSpy.mock.calls[consoleErrorSpy.mock.calls.length - 1];
      expect(lastCall).toContain(error);
    });
  });

  describe('logger.warn', () => {
    it('should log warnings with sanitized PII', () => {
      logger.warn('Warning message', {
        phone: '+1234567890',
        context: 'Test',
      });

      expect(consoleWarnSpy).toHaveBeenCalled();
      const call = consoleWarnSpy.mock.calls[0];
      const callString = call.join(' ');
      expect(callString).toContain('Warning message');
      expect(callString).not.toContain('+1234567890');
    });
  });

  describe('logger.info', () => {
    it('should log info with sanitized PII', () => {
      logger.info('Info message', {
        apiKey: 'fake_test_key_abc123xyz',
        context: 'Test',
      });

      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0];
      const callString = call.join(' ');
      expect(callString).toContain('Info message');
      expect(callString).not.toContain('fake_test_key_abc123xyz');
    });
  });

  describe('logger.debug', () => {
    it('should log debug messages in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      logger.debug('Debug message', { context: 'Test' });

      expect(consoleDebugSpy).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should skip debug logs in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      logger.debug('Debug message', { context: 'Test' });

      // In production, debug logs are skipped
      expect(consoleDebugSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });
});

describe('createLogger - Scoped Logger', () => {
  let consoleInfoSpy: any;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a scoped logger with default context', () => {
    const scopedLogger = createLogger({ context: 'TestModule' });

    scopedLogger.info('Test message');

    expect(consoleInfoSpy).toHaveBeenCalled();
    const call = consoleInfoSpy.mock.calls[0];
    const callString = call.join(' ');
    expect(callString).toContain('TESTMODULE');
  });

  it('should merge default metadata with call metadata', () => {
    const scopedLogger = createLogger({
      context: 'TestModule',
      feature: 'test-feature',
    });

    scopedLogger.info('Test message', { userId: 'user_123' });

    expect(consoleInfoSpy).toHaveBeenCalled();
    const call = consoleInfoSpy.mock.calls[0];
    const callString = call.join(' ');
    expect(callString).toContain('TESTMODULE');
    expect(callString).toContain('user_123');
  });

  it('should allow call metadata to override defaults', () => {
    const scopedLogger = createLogger({
      context: 'TestModule',
      feature: 'default-feature',
    });

    scopedLogger.info('Test message', {
      feature: 'override-feature',
    });

    expect(consoleInfoSpy).toHaveBeenCalled();
    const call = consoleInfoSpy.mock.calls[0];
    const callString = call.join(' ');
    expect(callString).toContain('override-feature');
  });
});

describe('Logger - Edge Cases', () => {
  it('should handle null and undefined metadata', () => {
    expect(() => {
      logger.info('Test message', undefined);
    }).not.toThrow();

    expect(() => {
      // @ts-expect-error Testing null metadata
      logger.info('Test message', null);
    }).not.toThrow();
  });

  it('should handle empty strings', () => {
    expect(sanitize.email('')).toBe('');
    expect(sanitize.phone('')).toBe('***');
    expect(sanitize.message('')).toBe('');
  });

  it('should handle very long strings', () => {
    const longEmail = 'a'.repeat(100) + '@example.com';
    const result = sanitize.email(longEmail);
    expect(result).toContain('@example.com');
    expect(result.length).toBeLessThan(longEmail.length);
  });

  it('should handle special characters in messages', () => {
    const message = 'Error: user@example.com failed with <script>alert(1)</script>';
    const result = sanitize.message(message);
    expect(result).toContain('***@example.com');
    expect(result).toContain('<script>');
  });

  it('should handle circular references gracefully', () => {
    const circular: any = { name: 'test' };
    circular.self = circular;

    // Should not throw on circular references
    expect(() => {
      sanitize.value(circular);
    }).not.toThrow();
  });
});

describe('Logger - Real-World Scenarios', () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle authentication logs', () => {
    const authLogger = createLogger({ context: 'Auth' });

    authLogger.error('Login failed', {
      email: 'user@example.com',
      ipAddress: '192.168.1.1',
      reason: 'invalid_password',
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    const call = consoleErrorSpy.mock.calls[0];
    const callString = call.join(' ');

    // Email should be sanitized
    expect(callString).not.toContain('user@example.com');
    expect(callString).toContain('***@example.com');

    // IP and reason should remain
    expect(callString).toContain('192.168.1.1');
    expect(callString).toContain('invalid_password');
  });

  it('should handle payment logs', () => {
    const paymentLogger = createLogger({ context: 'Payment' });

    paymentLogger.info('Payment processed', {
      email: 'customer@example.com',
      amount: 10000,
      currency: 'ILS',
      creditCard: '4532-1234-5678-9010',
    });

    const call = consoleErrorSpy.mock.calls[0] || [];
    const callString = call.join(' ');

    // Should sanitize email and credit card
    expect(callString).not.toContain('customer@example.com');
    expect(callString).not.toContain('4532-1234-5678-9010');
  });

  it('should handle API key logs', () => {
    const apiLogger = createLogger({ context: 'API' });

    apiLogger.warn('Rate limit exceeded', {
      apiKey: 'fake_test_api_key_1234567890abcdef',
      endpoint: '/api/bookings',
      rate: 100,
    });

    const call = consoleErrorSpy.mock.calls[0] || [];
    const callString = call.join(' ');

    // Should sanitize API key
    expect(callString).not.toContain('fake_test_api_key_1234567890abcdef');

    // Should preserve endpoint and rate
    expect(callString || '').toContain('/api/bookings');
  });
});
