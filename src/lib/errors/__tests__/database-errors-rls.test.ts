/**
 * Unit tests for RLS error detection and handling
 */

import * as Sentry from '@sentry/nextjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DatabaseError, DB_ERROR_CODES } from '../database-errors';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

describe('DatabaseError RLS handling', () => {
  beforeEach(() => {
    // Clear mocks
    vi.clearAllMocks();
    // Mock console.error to avoid noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('RLS violation detection', () => {
    it('detects RLS violation from error code 42501', () => {
      const error = {
        code: '42501',
        message: 'permission denied for table file_uploads',
      };
      const result = DatabaseError.fromSupabaseError(error, 'uploadResource');

      expect(result.code).toBe(DB_ERROR_CODES.RLS_VIOLATION);
      expect(result.userMessage).toBe(
        "You don't have permission to upload resources"
      );
    });

    it('detects RLS violation from message pattern', () => {
      const error = {
        code: '23000',
        message: 'new row violates row-level security policy',
      };
      const result = DatabaseError.fromSupabaseError(error, 'addToCollection');

      expect(result.code).toBe(DB_ERROR_CODES.RLS_VIOLATION);
      expect(result.userMessage).toBe(
        "You don't have permission to add resources to this collection"
      );
    });

    it('uses operation-specific message when available', () => {
      const error = { code: '42501', message: 'permission denied' };
      const result = DatabaseError.fromSupabaseError(error, 'deleteResource');

      expect(result.userMessage).toBe(
        "You don't have permission to delete this resource"
      );
    });

    it('uses default message when operation not in map', () => {
      const error = { code: '42501', message: 'permission denied' };
      const result = DatabaseError.fromSupabaseError(error, 'unknownOperation');

      expect(result.userMessage).toBe(
        'You do not have permission to perform this action.'
      );
    });

    it('does not detect RLS violation for other error codes', () => {
      const error = { code: '23505', message: 'unique constraint violation' };
      const result = DatabaseError.fromSupabaseError(error, 'createResource');

      expect(result.code).toBe(DB_ERROR_CODES.UNIQUE_VIOLATION);
      expect(result.code).not.toBe(DB_ERROR_CODES.RLS_VIOLATION);
    });
  });

  describe('Sentry logging', () => {
    it('logs to Sentry when RLS violation detected', () => {
      const error = { code: '42501', message: 'permission denied' };
      DatabaseError.fromSupabaseError(error, 'uploadResource', 'file_uploads');

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          level: 'warning',
          tags: expect.objectContaining({
            errorType: 'rls_violation',
            operation: 'uploadResource',
            resourceType: 'file_uploads',
          }),
        })
      );
    });

    it('logs to console when RLS violation detected', () => {
      const error = { code: '42501', message: 'permission denied' };
      DatabaseError.fromSupabaseError(error, 'addToCollection');

      expect(console.error).toHaveBeenCalledWith(
        '[RLS_VIOLATION]',
        expect.objectContaining({
          code: 'DB_9008',
          operation: 'addToCollection',
        })
      );
    });

    it('does not log to Sentry for non-RLS errors', () => {
      const error = { code: '23505', message: 'unique constraint' };
      DatabaseError.fromSupabaseError(error, 'createResource');

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });

  describe('Error details', () => {
    it('includes Supabase error details in DatabaseError', () => {
      const error = {
        code: '42501',
        message: 'permission denied',
        details: 'Policy violation on table file_uploads',
        hint: 'Check RLS policies',
      };
      const result = DatabaseError.fromSupabaseError(error, 'uploadResource');

      expect(result.details).toMatchObject({
        supabaseCode: '42501',
        supabaseDetails: 'Policy violation on table file_uploads',
        supabaseHint: 'Check RLS policies',
      });
    });

    it('includes operation and resourceType in error', () => {
      const error = { code: '42501', message: 'permission denied' };
      const result = DatabaseError.fromSupabaseError(
        error,
        'deleteCollection',
        'resource_collections'
      );

      expect(result.operation).toBe('deleteCollection');
      expect(result.resourceType).toBe('resource_collections');
    });
  });
});
