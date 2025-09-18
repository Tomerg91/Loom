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
   * Create a failed result
   */
  error: <T>(error: string): Result<T> => ({
    success: false,
    data: null,
    error,
  }),

  /**
   * Create a result from a Supabase response
   */
  fromSupabase: <T>(data: T | null, error: unknown): Result<T> => {
    if (error) {
      const message = (typeof error === 'object' && error !== null && 'message' in error)
        ? (error as { message: string }).message
        : 'Database operation failed';
      return Result.error(message);
    }
    if (data === null) {
      return Result.error('No data found');
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
