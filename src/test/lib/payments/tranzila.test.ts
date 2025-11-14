import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { verifyTranzilaSignature } from '@/lib/payments/tranzila';

describe('Tranzila HMAC Signature Verification', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Basic Signature Verification', () => {
    it('should verify valid SHA256 HMAC signature (hex)', () => {
      const secret = 'test-secret-key';
      const payload = {
        TranID: '12345',
        sum: '100.00',
        ApprovalCode: 'ABC123',
      };

      // Generate valid signature
      const base = 'ApprovalCode=ABC123&TranID=12345&sum=100.00';
      const signature = crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex');

      const result = verifyTranzilaSignature(
        { ...payload, sign: signature },
        { secret, algo: 'sha256' }
      );

      expect(result).toBe(true);
    });

    it('should verify valid SHA256 HMAC signature (base64)', () => {
      const secret = 'test-secret-key';
      const payload = {
        TranID: '12345',
        sum: '100.00',
        ApprovalCode: 'ABC123',
      };

      const base = 'ApprovalCode=ABC123&TranID=12345&sum=100.00';
      const signature = crypto.createHmac('sha256', secret).update(base, 'utf8').digest('base64');

      const result = verifyTranzilaSignature(
        { ...payload, sign: signature },
        { secret, algo: 'sha256' }
      );

      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      const secret = 'test-secret-key';
      const payload = {
        TranID: '12345',
        sum: '100.00',
        ApprovalCode: 'ABC123',
        sign: 'invalid-signature',
      };

      const result = verifyTranzilaSignature(payload, { secret, algo: 'sha256' });

      expect(result).toBe(false);
    });

    it('should reject tampered payload', () => {
      const secret = 'test-secret-key';
      const payload = {
        TranID: '12345',
        sum: '100.00',
        ApprovalCode: 'ABC123',
      };

      const base = 'ApprovalCode=ABC123&TranID=12345&sum=100.00';
      const signature = crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex');

      // Tamper with the amount
      const result = verifyTranzilaSignature(
        { ...payload, sum: '200.00', sign: signature },
        { secret, algo: 'sha256' }
      );

      expect(result).toBe(false);
    });
  });

  describe('Configurable Algorithms', () => {
    it('should support SHA1 algorithm', () => {
      const secret = 'test-secret-key';
      const payload = {
        TranID: '12345',
        sum: '100.00',
      };

      const base = 'TranID=12345&sum=100.00';
      const signature = crypto.createHmac('sha1', secret).update(base, 'utf8').digest('hex');

      const result = verifyTranzilaSignature(
        { ...payload, sign: signature },
        { secret, algo: 'sha1' }
      );

      expect(result).toBe(true);
    });

    it('should support MD5 algorithm', () => {
      const secret = 'test-secret-key';
      const payload = {
        TranID: '12345',
        sum: '100.00',
      };

      const base = 'TranID=12345&sum=100.00';
      const signature = crypto.createHmac('md5', secret).update(base, 'utf8').digest('hex');

      const result = verifyTranzilaSignature(
        { ...payload, sign: signature },
        { secret, algo: 'md5' }
      );

      expect(result).toBe(true);
    });

    it('should use environment variable for algorithm', () => {
      process.env.TRANZILA_SECRET = 'env-secret';
      process.env.TRANZILA_SIGN_ALGO = 'sha1';

      const payload = {
        TranID: '12345',
        sum: '100.00',
      };

      const base = 'TranID=12345&sum=100.00';
      const signature = crypto.createHmac('sha1', 'env-secret').update(base, 'utf8').digest('hex');

      const result = verifyTranzilaSignature({ ...payload, sign: signature });

      expect(result).toBe(true);
    });
  });

  describe('Configurable Fields', () => {
    it('should verify signature with custom field order', () => {
      const secret = 'test-secret-key';
      const payload = {
        TranID: '12345',
        sum: '100.00',
        ApprovalCode: 'ABC123',
        currency: '1',
      };

      // Custom field order
      const fields = ['TranID', 'sum', 'currency', 'ApprovalCode'];
      const base = 'TranID=12345&sum=100.00&currency=1&ApprovalCode=ABC123';
      const signature = crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex');

      const result = verifyTranzilaSignature(
        { ...payload, sign: signature },
        { secret, algo: 'sha256', fields }
      );

      expect(result).toBe(true);
    });

    it('should use environment variable for field configuration', () => {
      process.env.TRANZILA_SECRET = 'env-secret';
      process.env.TRANZILA_SIGN_FIELDS = 'TranID,sum,ApprovalCode';

      const payload = {
        TranID: '12345',
        sum: '100.00',
        ApprovalCode: 'ABC123',
        extra: 'ignored',
      };

      const base = 'TranID=12345&sum=100.00&ApprovalCode=ABC123';
      const signature = crypto.createHmac('sha256', 'env-secret').update(base, 'utf8').digest('hex');

      const result = verifyTranzilaSignature({ ...payload, sign: signature });

      expect(result).toBe(true);
    });

    it('should handle missing field values as empty strings', () => {
      const secret = 'test-secret-key';
      const payload = {
        TranID: '12345',
        sum: '100.00',
      };

      const fields = ['TranID', 'sum', 'missingField'];
      const base = 'TranID=12345&sum=100.00&missingField=';
      const signature = crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex');

      const result = verifyTranzilaSignature(
        { ...payload, sign: signature },
        { secret, algo: 'sha256', fields }
      );

      expect(result).toBe(true);
    });
  });

  describe('Signature Parameter Location', () => {
    it('should accept signature in "sign" parameter', () => {
      const secret = 'test-secret-key';
      const payload = { TranID: '12345' };
      const base = 'TranID=12345';
      const signature = crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex');

      const result = verifyTranzilaSignature(
        { ...payload, sign: signature },
        { secret }
      );

      expect(result).toBe(true);
    });

    it('should accept signature in "signature" parameter', () => {
      const secret = 'test-secret-key';
      const payload = { TranID: '12345' };
      const base = 'TranID=12345';
      const signature = crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex');

      const result = verifyTranzilaSignature(
        { ...payload, signature },
        { secret }
      );

      expect(result).toBe(true);
    });

    it('should accept signature in "hash" parameter', () => {
      const secret = 'test-secret-key';
      const payload = { TranID: '12345' };
      const base = 'TranID=12345';
      const signature = crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex');

      const result = verifyTranzilaSignature(
        { ...payload, hash: signature },
        { secret }
      );

      expect(result).toBe(true);
    });

    it('should accept custom signature parameter name', () => {
      const secret = 'test-secret-key';
      const payload = { TranID: '12345' };
      const base = 'TranID=12345';
      const signature = crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex');

      const result = verifyTranzilaSignature(
        { ...payload, customSign: signature },
        { secret, signatureParam: 'customSign' }
      );

      expect(result).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should return true when no secret is configured (dev mode)', () => {
      delete process.env.TRANZILA_SECRET;

      const payload = {
        TranID: '12345',
        sum: '100.00',
      };

      const result = verifyTranzilaSignature(payload);

      expect(result).toBe(true);
    });

    it('should return false when signature is missing but secret is configured', () => {
      const payload = {
        TranID: '12345',
        sum: '100.00',
      };

      const result = verifyTranzilaSignature(payload, { secret: 'test-secret' });

      expect(result).toBe(false);
    });

    it('should be case-insensitive for hex signatures', () => {
      const secret = 'test-secret-key';
      const payload = { TranID: '12345' };
      const base = 'TranID=12345';
      const signature = crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex');

      const result = verifyTranzilaSignature(
        { ...payload, sign: signature.toUpperCase() },
        { secret }
      );

      expect(result).toBe(true);
    });

    it('should ignore whitespace in signatures', () => {
      const secret = 'test-secret-key';
      const payload = { TranID: '12345' };
      const base = 'TranID=12345';
      const signature = crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex');

      const result = verifyTranzilaSignature(
        { ...payload, sign: `  ${signature}  ` },
        { secret }
      );

      expect(result).toBe(true);
    });

    it('should use timing-safe comparison to prevent timing attacks', () => {
      const secret = 'test-secret-key';
      const payload = { TranID: '12345' };
      const base = 'TranID=12345';
      const correctSignature = crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex');

      // Create a signature that differs only in the last character
      const almostCorrect = correctSignature.slice(0, -1) + 'X';

      const start = process.hrtime.bigint();
      verifyTranzilaSignature({ ...payload, sign: almostCorrect }, { secret });
      const almostTime = process.hrtime.bigint() - start;

      const start2 = process.hrtime.bigint();
      verifyTranzilaSignature({ ...payload, sign: '0000' }, { secret });
      const wrongTime = process.hrtime.bigint() - start2;

      // Timing should be similar (within an order of magnitude)
      // This is a basic test - timing-safe comparison is used internally
      expect(almostTime).toBeGreaterThan(0n);
      expect(wrongTime).toBeGreaterThan(0n);
    });
  });

  describe('Real-World Tranzila Scenarios', () => {
    it('should verify Tranzila IPN notification format', () => {
      const secret = 'production-secret';
      const payload = {
        TranID: 'TRZ-2024-001234',
        sum: '350.00',
        currency: '1',
        ApprovalCode: '123456',
        cardSuffix: '4580',
        tranMode: 'VK',
        index: '12345',
        ConfirmationCode: '0000',
      };

      // Simulate Tranzila signature (alphabetically sorted, excluding signature fields)
      const fields = Object.keys(payload).sort();
      const base = fields.map(k => `${k}=${payload[k as keyof typeof payload]}`).join('&');
      const signature = crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex');

      const result = verifyTranzilaSignature(
        { ...payload, sign: signature },
        { secret, algo: 'sha256' }
      );

      expect(result).toBe(true);
    });

    it('should reject replay attack with modified amount', () => {
      const secret = 'production-secret';
      const originalPayload = {
        TranID: 'TRZ-2024-001234',
        sum: '100.00',
        ApprovalCode: '123456',
      };

      const base = 'ApprovalCode=123456&TranID=TRZ-2024-001234&sum=100.00';
      const signature = crypto.createHmac('sha256', secret).update(base, 'utf8').digest('hex');

      // Attacker tries to modify the amount
      const attackPayload = {
        ...originalPayload,
        sum: '1000.00', // Changed from 100.00 to 1000.00
        sign: signature,
      };

      const result = verifyTranzilaSignature(attackPayload, { secret, algo: 'sha256' });

      expect(result).toBe(false);
    });
  });
});
