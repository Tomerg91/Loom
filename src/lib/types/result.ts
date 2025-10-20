import { DatabaseError } from '@/lib/errors/database-errors';

/**
 * Generic result type for operations that can fail
 * Provides explicit error handling without throwing exceptions
 */
export type Result<T, E = string> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: E };

/**
 * Helper functions for creating Result instances
 */
export const Result = {
  /**
   * Create a successful result
   */
  success: <T>(data: T): Result<T> => ({
    success: true,
    data,
    error: null,
  }),

  /**
   * Create a failed result from string message
   */
  error: <T>(error: string): Result<T> => ({
    success: false,
    data: null,
    error,
  }),

  /**
   * Create a failed result from DatabaseError
   */
  fromDatabaseError: <T>(error: DatabaseError): Result<T, string> => ({
    success: false,
    data: null,
    error: error.toString(),
  }),

  /**
   * Create a result from a Supabase response with enhanced error handling
   */
  fromSupabase: <T>(
    data: T | null,
    error: unknown,
    operation?: string,
    resourceType?: string
  ): Result<T> => {
    if (error) {
      const dbError = DatabaseError.fromSupabaseError(error, operation, resourceType);
      return Result.fromDatabaseError(dbError);
    }
    if (data === null) {
      const dbError = DatabaseError.notFound(resourceType || 'Resource');
      return Result.fromDatabaseError(dbError);
    }
    return Result.success(data);
  },

  /**
   * Map a result to another type
   */
  map: <T, U>(result: Result<T>, mapper: (data: T) => U): Result<U> => {
    if (result.success) {
      return Result.success(mapper(result.data));
    }
    return Result.error(result.error);
  },

  /**
   * Chain operations on results
   */
  flatMap: <T, U>(result: Result<T>, mapper: (data: T) => Result<U>): Result<U> => {
    if (result.success) {
      return mapper(result.data);
    }
    return Result.error(result.error);
  },
};

/**
 * Type guard to check if result is successful
 */
export function isSuccess<T>(result: Result<T>): result is { success: true; data: T; error: null } {
  return result.success;
}

/**
 * Type guard to check if result is an error
 */
export function isError<T>(result: Result<T>): result is { success: false; data: null; error: string } {
  return !result.success;
}
