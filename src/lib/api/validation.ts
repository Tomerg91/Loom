import { z } from 'zod';

// Common validation schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// User validation schemas
export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: z.enum(['client', 'coach']),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  language: z.enum(['en', 'he']).optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  language: z.enum(['en', 'he']).optional(),
  avatar: z.string().url().optional(),
  bio: z.string().max(500).optional(),
});

// Session validation schemas
export const createSessionSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  scheduledAt: z.string().datetime(),
  duration: z.number().int().min(15).max(480), // 15 minutes to 8 hours
  coachId: z.string().uuid(),
  clientId: z.string().uuid(),
  meetingUrl: z.string().url().optional(),
});

export const updateSessionSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  scheduledAt: z.string().datetime().optional(),
  duration: z.number().int().min(15).max(480).optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  meetingUrl: z.string().url().optional(),
  notes: z.string().max(2000).optional(),
});

export const sessionQuerySchema = z.object({
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  coachId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).merge(paginationSchema).merge(sortSchema);

// Notification validation schemas
export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['session_reminder', 'new_message', 'session_confirmation', 'system_update']),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(500),
  scheduledFor: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export const notificationQuerySchema = z.object({
  isRead: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  type: z.enum(['session_reminder', 'new_message', 'session_confirmation', 'system_update']).optional(),
}).merge(paginationSchema).merge(sortSchema);

// Coach notes validation schemas
export const createNoteSchema = z.object({
  clientId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  isPrivate: z.boolean(),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(2000).optional(),
  isPrivate: z.boolean().optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

export const noteQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  isPrivate: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
}).merge(paginationSchema).merge(sortSchema);

// Client reflections validation schemas
export const createReflectionSchema = z.object({
  sessionId: z.string().uuid().optional(),
  content: z.string().min(1).max(2000),
  moodRating: z.number().int().min(1).max(10).optional(),
  insights: z.string().max(1000).optional(),
  nextSessionGoals: z.string().max(1000).optional(),
});

export const updateReflectionSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  moodRating: z.number().int().min(1).max(10).optional(),
  insights: z.string().max(1000).optional(),
  nextSessionGoals: z.string().max(1000).optional(),
});

export const reflectionQuerySchema = z.object({
  sessionId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).merge(paginationSchema).merge(sortSchema);

// Coach availability validation schemas
export const availabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
});

export const createAvailabilitySchema = z.object({
  slots: z.array(availabilitySlotSchema).min(1),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
});

export const updateAvailabilitySchema = z.object({
  slots: z.array(availabilitySlotSchema).optional(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

// ID parameter validation
export const uuidSchema = z.string().uuid();

// Query parameter validation helpers
export function validateQuery<T>(schema: z.ZodSchema<T>, query: Record<string, string | string[]>): T {
  // Convert array values to single values for non-array fields
  const processedQuery: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      // Keep arrays for fields that expect them (like tags)
      processedQuery[key] = value;
    } else {
      processedQuery[key] = value;
    }
  }
  
  const result = schema.safeParse(processedQuery);
  if (result.success) {
    return result.data;
  } else {
    // Return defaults for pagination when validation fails
    return schema.parse({}) as T;
  }
}