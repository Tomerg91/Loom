import { z } from 'zod';
import { config } from '@/lib/config';

/**
 * Common validation schemas and utilities
 * Consolidates repeated validation patterns from across the application
 */

// Base field validators
export const commonValidators = {
  // Identity validators
  email: (message = 'Please enter a valid email address') => 
    z.string().email(message).toLowerCase().trim(),

  uuid: (message = 'Invalid ID format') => 
    z.string().uuid(message),

  // String validators with configurable limits
  name: (min = 1, max = 100, fieldName = 'Name') => 
    z.string()
      .min(min, `${fieldName} must be at least ${min} characters`)
      .max(max, `${fieldName} must not exceed ${max} characters`)
      .trim(),

  firstName: () => commonValidators.name(1, 50, 'First name'),
  lastName: () => commonValidators.name(1, 50, 'Last name'),

  // Password validation with strength requirements
  password: (requireStrong = true) => {
    let schema = z.string().min(config.validation.MIN_PASSWORD_LENGTH, 
      `Password must be at least ${config.validation.MIN_PASSWORD_LENGTH} characters`);
    
    if (requireStrong) {
      schema = schema
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
    }
    
    return schema;
  },

  // Phone number validation
  phone: (required = false) => {
    const schema = z.string()
      .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
      .transform(val => val.replace(/\s/g, ''));
    
    return required ? schema : schema.optional();
  },

  // URL validation
  url: (required = false) => {
    const schema = z.string().url('Please enter a valid URL');
    return required ? schema : schema.optional();
  },

  // Date and time validators
  isoDateTime: () => z.string().datetime('Invalid date/time format'),
  
  isoDate: () => z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/, 
    'Date must be in YYYY-MM-DD format'
  ),

  timeString: () => z.string().regex(
    /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 
    'Time must be in HH:MM format'
  ),

  // Numeric validators
  positiveInt: (min = 1, max?: number) => {
    let schema = z.number().int('Must be a whole number').min(min, `Must be at least ${min}`);
    if (max) {
      schema = schema.max(max, `Must not exceed ${max}`);
    }
    return schema;
  },

  currency: (min = 0, max = 1000000) => 
    z.number()
      .min(min, `Amount must be at least ${min}`)
      .max(max, `Amount must not exceed ${max}`)
      .multipleOf(0.01, 'Amount must be valid currency (2 decimal places)'),

  // Content validators
  title: (max = config.validation.MAX_TITLE_LENGTH) => 
    z.string()
      .min(1, 'Title is required')
      .max(max, `Title must not exceed ${max} characters`)
      .trim(),

  description: (max = config.validation.MAX_DESCRIPTION_LENGTH, required = false) => {
    const schema = z.string()
      .max(max, `Description must not exceed ${max} characters`)
      .trim();
    
    return required ? schema.min(1, 'Description is required') : schema.optional();
  },

  // File validators
  fileSize: (maxSize = config.file.DOCUMENT_MAX_SIZE) => 
    z.number().max(maxSize, `File size must not exceed ${Math.round(maxSize / 1024 / 1024)}MB`),

  // Enum-style validators
  status: <T extends readonly [string, ...string[]]>(values: T) => 
    z.enum(values, { errorMap: () => ({ message: `Status must be one of: ${values.join(', ')}` }) }),

  priority: () => z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'Priority must be low, medium, or high' })
  }),

  // Array validators
  stringArray: (min = 0, max = 100, itemName = 'item') => 
    z.array(z.string().trim())
      .min(min, `Must have at least ${min} ${itemName}(s)`)
      .max(max, `Cannot have more than ${max} ${itemName}(s)`),

  uuidArray: (min = 0, max = 100) => 
    z.array(commonValidators.uuid())
      .min(min, `Must have at least ${min} ID(s)`)
      .max(max, `Cannot have more than ${max} ID(s)`),
};

/**
 * Common object schemas
 */
export const commonSchemas = {
  // Pagination parameters
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),

  // Search parameters
  search: z.object({
    query: z.string().trim().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),

  // Date range filter
  dateRange: z.object({
    startDate: commonValidators.isoDate().optional(),
    endDate: commonValidators.isoDate().optional(),
  }).refine(
    data => !data.startDate || !data.endDate || data.startDate <= data.endDate,
    { message: 'End date must be after start date', path: ['endDate'] }
  ),

  // Address schema
  address: z.object({
    street: commonValidators.name(1, 100, 'Street'),
    city: commonValidators.name(1, 50, 'City'),
    state: commonValidators.name(1, 50, 'State'),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
    country: z.string().length(2, 'Country must be 2-letter code'),
  }),

  // Contact information
  contact: z.object({
    email: commonValidators.email(),
    phone: commonValidators.phone(false),
    website: commonValidators.url(false),
  }),

  // Metadata schema for extensible objects
  metadata: z.record(z.string(), z.unknown()).optional(),
};

/**
 * Validation utilities
 */
export const validationUtils = {
  // Create a schema for partial updates (make all fields optional)
  makePartial: <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => 
    schema.partial(),

  // Create a schema that requires at least one field to be present
  requireAtLeastOne: <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => 
    schema.refine(
      data => Object.values(data).some(value => value !== undefined && value !== ''),
      { message: 'At least one field must be provided' }
    ),

  // Create a conditional schema based on another field
  conditional: <T>(
    condition: (data: unknown) => boolean,
    trueSchema: z.ZodSchema<T>,
    falseSchema: z.ZodSchema<T>
  ) => z.unknown().superRefine((data, ctx) => {
    const schema = condition(data) ? trueSchema : falseSchema;
    const result = schema.safeParse(data);
    if (!result.success) {
      result.error.issues.forEach((issue: any) => ctx.addIssue(issue));
    }
  }),

  // Sanitize string input
  sanitizeString: (input: string) => input.trim().replace(/\s+/g, ' '),

  // Validate file upload
  validateFile: (file: File, maxSize = config.file.DOCUMENT_MAX_SIZE, allowedTypes: string[] = []) => {
    const errors: string[] = [];
    
    if (file.size > maxSize) {
      errors.push(`File size must not exceed ${Math.round(maxSize / 1024 / 1024)}MB`);
    }
    
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

/**
 * Pre-built schemas for common use cases
 */
const userCreateSchema = z.object({
  email: commonValidators.email(),
  firstName: commonValidators.firstName(),
  lastName: commonValidators.lastName(),
  phone: commonValidators.phone(false),
  role: z.enum(['client', 'coach', 'admin']),
});

const sessionCreateSchema = z.object({
  title: commonValidators.title(),
  description: commonValidators.description(2000, false),
  scheduledAt: commonValidators.isoDateTime(),
  duration: commonValidators.positiveInt(15, 480), // 15 minutes to 8 hours
  sessionType: z.enum(['video', 'phone', 'in-person']),
  meetingUrl: commonValidators.url(false),
  clientId: commonValidators.uuid(),
  coachId: commonValidators.uuid(),
});

export const prebuiltSchemas = {
  // User creation/update
  userCreate: userCreateSchema,
  userUpdate: validationUtils.makePartial(userCreateSchema),

  // Authentication
  signIn: z.object({
    email: commonValidators.email(),
    password: z.string().min(1, 'Password is required'),
  }),

  signUp: z.object({
    email: commonValidators.email(),
    password: commonValidators.password(true),
    firstName: commonValidators.firstName(),
    lastName: commonValidators.lastName(),
    phone: commonValidators.phone(false),
    role: z.enum(['client', 'coach']),
  }),

  // Session management
  sessionCreate: sessionCreateSchema,
  sessionUpdate: validationUtils.makePartial(sessionCreateSchema),

  // Notification preferences
  notificationPreferences: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    sms: z.boolean().default(false),
    inApp: z.boolean().default(true),
  }),
};