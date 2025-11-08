// Database utility functions for common operations
import type { Database } from '@/types/supabase';

import { getSupabaseClient, DatabaseError } from './index';

/**
 * Executes a database operation with proper error handling
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Database operation failed'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Database error: ${errorMessage}`, error);

    // Treat objects that look like DatabaseError as such
    if (isDatabaseErrorObject(error)) {
      throw error;
    }
    
    // Wrap unknown errors in DatabaseError
    const dbError = new Error(errorMessage) as DatabaseError;
    dbError.code = 'UNKNOWN_ERROR';
    dbError.details = error instanceof Error ? error.message : String(error);
    throw dbError;
  }
}

/**
 * Creates a typed Supabase client for the specified table
 */
export async function getTableClient<T extends keyof Database['public']['Tables']>(
  tableName: T
) {
  const supabase = await getSupabaseClient();
  return supabase.from(tableName);
}

/**
 * Handles pagination for database queries
 */
export function getPaginationParams(page?: number, limit?: number) {
  const defaultPage = 1;
  const defaultLimit = 20;
  const maxLimit = 100;
  
  const currentPage = Math.max(page || defaultPage, 1);
  const currentLimit = Math.min(limit || defaultLimit, maxLimit);
  const offset = (currentPage - 1) * currentLimit;
  
  return {
    page: currentPage,
    limit: currentLimit,
    offset,
    range: {
      from: offset,
      to: offset + currentLimit - 1
    }
  };
}

/**
 * Safely transforms database row field names from snake_case to camelCase
 */
export function transformDatabaseRow<T extends Record<string, unknown>>(
  row: T,
  fieldMap: Record<keyof T, string>
): Record<string, unknown> {
  const transformed: Record<string, unknown> = {};
  
  Object.entries(fieldMap).forEach(([dbField, camelField]) => {
    if (row[dbField] !== undefined) {
      transformed[camelField] = row[dbField];
    }
  });
  
  return transformed;
}

/**
 * Creates a search condition for Supabase using ilike for multiple fields
 */
export function createSearchCondition(searchTerm: string, fields: string[]) {
  if (!searchTerm.trim()) {
    return '';
  }
  
  const escapedTerm = searchTerm.replace(/[%_]/g, '\\$&');
  const searchPattern = `%${escapedTerm}%`;
  
  return fields.map(field => `${field}.ilike.${searchPattern}`).join(',');
}

/**
 * Standard error codes for consistent error handling
 */
export const DB_ERROR_CODES = {
  NOT_FOUND: 'PGRST116',
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
  NOT_NULL_VIOLATION: '23502',
} as const;

/**
 * Checks if an error is a specific database error
 */
export function isDatabaseError(error: unknown, code: string): error is DatabaseError {
  return error && error.code === code;
}

function isDatabaseErrorObject(error: unknown): error is DatabaseError {
  return typeof error === 'object' && error !== null && 'code' in (error as unknown);
}

/**
 * Common field mappings for transforming database results
 */
export const FIELD_MAPPINGS = {
  USER: {
    id: 'id',
    email: 'email',
    first_name: 'firstName',
    last_name: 'lastName',
    role: 'role',
    status: 'status',
    avatar_url: 'avatarUrl',
    phone: 'phone',
    timezone: 'timezone',
    language: 'language',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    last_seen_at: 'lastSeenAt',
  },
  SESSION: {
    id: 'id',
    coach_id: 'coachId',
    client_id: 'clientId',
    title: 'title',
    description: 'description',
    scheduled_at: 'scheduledAt',
    duration_minutes: 'durationMinutes',
    status: 'status',
    meeting_url: 'meetingUrl',
    notes: 'notes',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  },
} as const;
