import { z } from 'zod';
import { sanitizeInput, containsSQLInjection, containsXSS, SQL_INJECTION_PATTERNS, XSS_PATTERNS } from './headers';

// Re-export security functions for external use
export { sanitizeInput, containsSQLInjection, containsXSS, SQL_INJECTION_PATTERNS, XSS_PATTERNS };

// Enhanced validation schemas with security checks
export const secureStringSchema = z
  .string()
  .transform(sanitizeInput)
  .refine((val) => !containsSQLInjection(val), {
    message: 'Input contains potentially harmful content',
  });

export const secureEmailSchema = z
  .string()
  .email('Invalid email format')
  .transform(sanitizeInput)
  .refine((val) => !containsSQLInjection(val), {
    message: 'Email contains potentially harmful content',
  });

// Helper function to apply security transforms after all other validations
function applySecurity<T extends z.ZodString>(schema: T) {
  return schema
    .transform(sanitizeInput)
    .refine((val) => !containsSQLInjection(val), {
      message: 'Input contains potentially harmful content',
    });
}

export const securePasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .refine((password) => {
    // Check password strength
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return hasUpper && hasLower && hasNumber && hasSpecial;
  }, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  });

export const secureURLSchema = z
  .string()
  .url('Invalid URL format')
  .refine((url) => {
    const parsed = new URL(url);
    // Only allow https and specific trusted domains
    return parsed.protocol === 'https:' || 
           (parsed.protocol === 'http:' && parsed.hostname === 'localhost');
  }, {
    message: 'Only HTTPS URLs are allowed',
  });

// File validation schemas
export const fileUploadSchema = z.object({
  name: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename is too long')
    .refine((name) => {
      // Check for suspicious file extensions
      const suspiciousExts = /\.(exe|bat|cmd|scr|pif|com|dll|php|jsp|asp)$/i;
      return !suspiciousExts.test(name);
    }, {
      message: 'File type not allowed',
    }),
  size: z.number()
    .positive('File size must be positive')
    .max(10 * 1024 * 1024, 'File size too large (max 10MB)'),
  type: z.string()
    .refine((type) => {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
      ];
      return allowedTypes.includes(type);
    }, {
      message: 'File type not allowed',
    }),
});

// Session and user data validation
export const sessionValidationSchema = z.object({
  title: applySecurity(
    z.string()
      .min(1, 'Title is required')
      .max(100, 'Title is too long')
  ),
  description: applySecurity(
    z.string()
      .max(2000, 'Description is too long')
  ).optional(),
  coachId: z.string().uuid('Invalid coach ID'),
  clientId: z.string().uuid('Invalid client ID'),
  scheduledAt: z.string().datetime('Invalid date format'),
  duration: z.number()
    .int('Duration must be a whole number')
    .min(15, 'Minimum session duration is 15 minutes')
    .max(480, 'Maximum session duration is 8 hours'),
  type: z.enum(['individual', 'group'], {
    errorMap: () => ({ message: 'Invalid session type' }),
  }),
});

export const noteValidationSchema = z.object({
  title: applySecurity(
    z.string()
      .min(1, 'Title is required')
      .max(100, 'Title is too long')
  ),
  content: applySecurity(
    z.string()
      .min(1, 'Content is required')
      .max(5000, 'Content is too long')
  ),
  clientId: z.string().uuid('Invalid client ID'),
  sessionId: z.string().uuid('Invalid session ID').optional(),
  privacyLevel: z.enum(['private', 'shared_with_client'], {
    errorMap: () => ({ message: 'Invalid privacy level' }),
  }),
  tags: z.array(applySecurity(z.string().max(50, 'Tag is too long')))
    .max(10, 'Too many tags')
    .optional(),
});

export const reflectionValidationSchema = z.object({
  content: applySecurity(
    z.string()
      .min(10, 'Reflection should be at least 10 characters')
      .max(2000, 'Reflection is too long')
  ),
  sessionId: z.string().uuid('Invalid session ID').optional(),
  moodRating: z.number()
    .int('Mood rating must be a whole number')
    .min(1, 'Mood rating must be between 1 and 10')
    .max(10, 'Mood rating must be between 1 and 10')
    .optional(),
  insights: applySecurity(
    z.string()
      .max(1000, 'Insights are too long')
  ).optional(),
  goalsForNextSession: applySecurity(
    z.string()
      .max(1000, 'Goals are too long')
  ).optional(),
});

// Notification validation
export const notificationValidationSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  type: z.enum(['session_reminder', 'session_confirmation', 'new_message', 'system_update'], {
    errorMap: () => ({ message: 'Invalid notification type' }),
  }),
  title: applySecurity(
    z.string()
      .min(1, 'Title is required')
      .max(100, 'Title is too long')
  ),
  message: applySecurity(
    z.string()
      .min(1, 'Message is required')
      .max(500, 'Message is too long')
  ),
  data: z.record(z.unknown()).optional(),
});

// User profile validation
export const userProfileValidationSchema = z.object({
  firstName: applySecurity(
    z.string()
      .min(1, 'First name is required')
      .max(50, 'First name is too long')
  ),
  lastName: applySecurity(
    z.string()
      .min(1, 'Last name is required')
      .max(50, 'Last name is too long')
  ),
  email: secureEmailSchema,
  phoneNumber: applySecurity(
    z.string()
      .regex(/^\+?[\d\s-()]+$/, 'Invalid phone number format')
      .max(20, 'Phone number is too long')
  ).optional(),
  dateOfBirth: z.string()
    .datetime('Invalid date format')
    .optional()
    .refine((date) => {
      if (!date) return true;
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 13 && age <= 120;
    }, {
      message: 'Age must be between 13 and 120 years',
    }),
});

// API request validation helpers
export function validateAndSanitizeRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}

// Content sanitization for rich text
export function sanitizeRichText(html: string): string {
  // Simple sanitization - in production, use a library like DOMPurify
  
  // Simple sanitization - in production, use a library like DOMPurify
  let sanitized = html;
  
  // Remove all script tags and content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove all style tags and content
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove all event handlers
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: URLs (except images)
  sanitized = sanitized.replace(/data:(?!image\/)/gi, '');
  
  return sanitized;
}

// IP address validation
export function validateIPAddress(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// User agent validation
export function validateUserAgent(userAgent: string): boolean {
  // Block suspicious user agents
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scan/i,
    /python/i,
    /curl/i,
    /wget/i,
  ];
  
  // Allow legitimate browsers
  const legitimatePatterns = [
    /Mozilla/,
    /Chrome/,
    /Safari/,
    /Firefox/,
    /Edge/,
    /Opera/,
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    return false;
  }
  
  return legitimatePatterns.some(pattern => pattern.test(userAgent));
}