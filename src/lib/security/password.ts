import { z } from 'zod';

// Strong password validation schema for therapy platform
export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be less than 128 characters')
  .refine((password) => /[A-Z]/.test(password), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((password) => /[a-z]/.test(password), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((password) => /\d/.test(password), {
    message: 'Password must contain at least one number',
  })
  .refine((password) => /[!@#$%^&*(),.?":{}|<>]/.test(password), {
    message: 'Password must contain at least one special character',
  })
  .refine((password) => {
    // Check for common weak patterns
    const weakPatterns = [
      /(.)\1{2,}/, // Repeated characters (aaa, 111, etc.)
      /123456/, // Sequential numbers
      /qwerty/i, // Common keyboard patterns
      /password/i, // Common words
      /admin/i,
      /user/i,
      /login/i,
      /secret/i,
    ];
    return !weakPatterns.some(pattern => pattern.test(password));
  }, {
    message: 'Password contains common weak patterns',
  });

// Basic password schema for sign-in (less strict for existing users)
export const basicPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters');

// Password validation for sensitive therapy data
export const therapyPasswordSchema = strongPasswordSchema;

// Export password validation functions
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const result = strongPasswordSchema.safeParse(password);
  
  if (result.success) {
    return { isValid: true, errors: [] };
  }
  
  return {
    isValid: false,
    errors: result.error.errors.map(err => err.message),
  };
}

export function isPasswordSecure(password: string): boolean {
  return strongPasswordSchema.safeParse(password).success;
}