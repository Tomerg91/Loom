/**
 * Resource Library Validation Schemas
 *
 * Zod schemas for validating resource library API requests
 *
 * @module lib/validations/resources
 */

import { z } from 'zod';

import {
  LEGACY_RESOURCE_CATEGORY_VALUES,
  RESOURCE_CATEGORY_VALUES,
  normalizeResourceCategory,
} from '@/types/resources';

/**
 * Valid resource categories
 */
const canonicalCategorySchema = z.enum(RESOURCE_CATEGORY_VALUES);
const legacyCategorySchema = z.enum(LEGACY_RESOURCE_CATEGORY_VALUES);

export const resourceCategorySchema = z
  .union([canonicalCategorySchema, legacyCategorySchema])
  .transform(category => normalizeResourceCategory(category))
  .pipe(canonicalCategorySchema);

/**
 * Valid permission types
 */
export const permissionTypeSchema = z.enum(['view', 'download', 'edit']);

/**
 * Valid sort fields
 */
export const sortFieldSchema = z.enum([
  'created_at',
  'filename',
  'file_size',
  'view_count',
  'download_count',
  'completion_count',
]);

/**
 * Valid sort order
 */
export const sortOrderSchema = z.enum(['asc', 'desc']);

/**
 * Schema for resource list query parameters
 */
export const resourceListParamsSchema = z.object({
  category: resourceCategorySchema.optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  sortBy: sortFieldSchema.optional().default('created_at'),
  sortOrder: sortOrderSchema.optional().default('desc'),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});

/**
 * Schema for creating/updating a resource
 */
export const updateResourceSchema = z.object({
  filename: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  category: resourceCategorySchema.optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
});

/**
 * Schema for share-all-clients request
 */
export const shareAllClientsSchema = z.object({
  permission: z.enum(['view', 'download']),
  expiresAt: z.string().datetime().optional(),
  message: z.string().max(500).optional(),
});

/**
 * Schema for creating a collection
 */
export const createCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  resourceIds: z.array(z.string().uuid()).optional(),
});

/**
 * Schema for updating a collection
 */
export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  resourceOrder: z.array(z.string().uuid()).optional(),
});

/**
 * Schema for updating library settings
 */
export const updateLibrarySettingsSchema = z.object({
  defaultPermission: z.enum(['view', 'download']).optional(),
  autoShareNewClients: z.boolean().optional(),
  allowClientRequests: z.boolean().optional(),
});

/**
 * Schema for tracking progress
 */
export const trackProgressSchema = z.object({
  action: z.enum(['viewed', 'completed', 'accessed']),
});

/**
 * Helper function to validate and parse data with a schema
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}
