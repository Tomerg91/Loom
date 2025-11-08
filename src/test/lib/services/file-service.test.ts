import { describe, it, expect, vi, beforeEach } from 'vitest';

import { fileService } from '@/lib/services/file-service';

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        remove: vi.fn(),
        list: vi.fn(),
        getPublicUrl: vi.fn(),
        createSignedUrl: vi.fn()
      }))
    }
  }))
}));

describe('FileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should validate file size correctly', () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const options = {
        maxSize: 1024 * 1024, // 1MB
        allowedTypes: ['text/plain']
      };

      const result = fileService.validateFile(file, options);
      expect(result.isValid).toBe(true);
    });

    it('should reject files that are too large', () => {
      const file = new File(['x'.repeat(2 * 1024 * 1024)], 'large.txt', { type: 'text/plain' });
      const options = {
        maxSize: 1024 * 1024, // 1MB
        allowedTypes: ['text/plain']
      };

      const result = fileService.validateFile(file, options);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File size exceeds');
    });

    it('should reject files with invalid types', () => {
      const file = new File(['test'], 'test.exe', { type: 'application/x-executable' });
      const options = {
        maxSize: 1024 * 1024,
        allowedTypes: ['text/plain', 'image/jpeg']
      };

      const result = fileService.validateFile(file, options);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File type');
    });

    it('should accept wildcard types', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const options = {
        maxSize: 1024 * 1024,
        allowedTypes: ['image/*']
      };

      const result = fileService.validateFile(file, options);
      expect(result.isValid).toBe(true);
    });
  });

  describe('getBucketName', () => {
    it('should map directories to correct buckets', async () => {
      const fileServiceAny = fileService as unknown;
      
      expect(fileServiceAny.getBucketName('avatars')).toBe('avatars');
      expect(fileServiceAny.getBucketName('documents')).toBe('documents');
      expect(fileServiceAny.getBucketName('sessions')).toBe('session-files');
      expect(fileServiceAny.getBucketName('uploads')).toBe('uploads');
      expect(fileServiceAny.getBucketName('unknown')).toBe('uploads');
    });
  });

  describe('generateSecureFileName', () => {
    it('should generate secure filename with proper format', async () => {
      const file = new File(['test'], 'test-file.jpg', { type: 'image/jpeg' });
      const options = {
        directory: 'uploads',
        userId: 'user-123'
      };

      const fileServiceAny = fileService as unknown;
      const fileName = await fileServiceAny.generateSecureFileName(file, options);
      
      expect(fileName).toMatch(/^uploads\/user-123\/\d+-[a-f0-9]{32}\.jpg$/);
    });

    it('should sanitize file extensions', async () => {
      const file = new File(['test'], 'test.J*P&G', { type: 'image/jpeg' });
      const options = {
        directory: 'uploads',
        userId: 'user-123'
      };

      const fileServiceAny = fileService as unknown;
      const fileName = await fileServiceAny.generateSecureFileName(file, options);
      
      expect(fileName).toMatch(/\.jpg$/); // Should be sanitized to .jpg
    });
  });

  describe('classifyStorageError', () => {
    it('should classify network errors as retryable', () => {
      const fileServiceAny = fileService as unknown;
      const error = { message: 'Network timeout occurred' };
      
      const result = fileServiceAny.classifyStorageError(error);
      expect(result.type).toBe('NETWORK_ERROR');
      expect(result.retryable).toBe(true);
    });

    it('should classify quota errors as non-retryable', () => {
      const fileServiceAny = fileService as unknown;
      const error = { message: 'Storage quota exceeded' };
      
      const result = fileServiceAny.classifyStorageError(error);
      expect(result.type).toBe('QUOTA_EXCEEDED');
      expect(result.retryable).toBe(false);
    });

    it('should classify permission errors as non-retryable', () => {
      const fileServiceAny = fileService as unknown;
      const error = { message: 'Permission denied' };
      
      const result = fileServiceAny.classifyStorageError(error);
      expect(result.type).toBe('PERMISSION_DENIED');
      expect(result.retryable).toBe(false);
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    it('should return user-friendly error messages', () => {
      const fileServiceAny = fileService as unknown;
      
      expect(fileServiceAny.getUserFriendlyErrorMessage('NETWORK_ERROR'))
        .toContain('Network connection error');
      
      expect(fileServiceAny.getUserFriendlyErrorMessage('QUOTA_EXCEEDED'))
        .toContain('Storage quota exceeded');
      
      expect(fileServiceAny.getUserFriendlyErrorMessage('PERMISSION_DENIED'))
        .toContain('Permission denied');
    });
  });

  describe('validateImageSignature', () => {
    it('should validate JPEG signature correctly', () => {
      const fileServiceAny = fileService as unknown;
      const jpegHeader = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
      
      const result = fileServiceAny.validateImageSignature(jpegHeader, 'image/jpeg');
      expect(result).toBe(true);
    });

    it('should validate PNG signature correctly', () => {
      const fileServiceAny = fileService as unknown;
      const pngHeader = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      
      const result = fileServiceAny.validateImageSignature(pngHeader, 'image/png');
      expect(result).toBe(true);
    });

    it('should reject invalid image signatures', () => {
      const fileServiceAny = fileService as unknown;
      const invalidHeader = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      
      const result = fileServiceAny.validateImageSignature(invalidHeader, 'image/jpeg');
      expect(result).toBe(false);
    });

    it('should allow unknown image types', () => {
      const fileServiceAny = fileService as unknown;
      const someHeader = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      
      const result = fileServiceAny.validateImageSignature(someHeader, 'image/unknown');
      expect(result).toBe(true); // Unknown types are allowed
    });
  });
});