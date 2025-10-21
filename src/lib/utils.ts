import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { config } from '@/lib/config';

/**
 * Utility function to merge Tailwind CSS classes with clsx and tailwind-merge
 * This prevents conflicts between Tailwind classes and provides conditional styling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generic factory for creating mapping functions (colors, styles, variants, etc.)
 * Eliminates switch-case duplication across the codebase
 */
export function createMappingFunction<T extends string, R>(
  mappings: Record<T, R>,
  defaultValue: R
): (key: string) => R {
  return (key: string): R => {
    return mappings[key as T] ?? defaultValue;
  };
}

/**
 * Generic factory for creating formatting functions with locale support
 * Consolidates date, time, and number formatting patterns
 */
export function createFormatterFactory<TInput, TOutput>(
  baseFormatter: (input: TInput, options?: any) => TOutput,
  defaultOptions: any = {}
) {
  return (customOptions: any = {}) => {
    const mergedOptions = { ...defaultOptions, ...customOptions };
    return (input: TInput) => baseFormatter(input, mergedOptions);
  };
}

/**
 * Comprehensive formatting utilities using factory pattern
 * Eliminates duplicate formatting logic across components
 */
export const formatters = {
  // Date formatting with enhanced locale support
  date: createFormatterFactory(
    (date: Date | string, options: Intl.DateTimeFormatOptions & { locale?: string } = {}) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const locale = options.locale === 'he' ? 'he-IL' : 'en-US';
      const { locale: _, ...dateOptions } = options;
      
      const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...dateOptions
      };
      
      return dateObj.toLocaleDateString(locale, defaultOptions);
    },
    { locale: 'en-US' }
  ),
  
  // Time formatting with locale support
  time: createFormatterFactory(
    (date: Date | string, options: Intl.DateTimeFormatOptions & { locale?: string } = {}) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const locale = options.locale === 'he' ? 'he-IL' : 'en-US';
      const { locale: _, ...timeOptions } = options;
      
      const defaultOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        ...timeOptions
      };
      
      return dateObj.toLocaleTimeString(locale, defaultOptions);
    },
    { locale: 'en-US' }
  ),
  
  // Currency formatting with multiple currency support
  currency: createFormatterFactory(
    (amount: number, options: Intl.NumberFormatOptions & { locale?: string } = {}) => {
      const requestedLocale = options.locale || 'en-US';
      const locale = requestedLocale === 'he' ? 'he-IL' : requestedLocale;
      const { locale: _, ...restOptions } = options;

      // Default currency by locale (ILS for Hebrew, USD otherwise)
      const defaultCurrency = locale === 'he-IL' ? 'ILS' : 'USD';

      const numberOptions: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: restOptions.currency || defaultCurrency,
        ...restOptions,
      };

      return new Intl.NumberFormat(locale, numberOptions).format(amount);
    },
    { locale: 'en-US' }
  ),
  
  // Number formatting
  number: createFormatterFactory(
    (value: number, options: Intl.NumberFormatOptions & { locale?: string } = {}) => {
      const locale = options.locale || 'en-US';
      const { locale: _, ...numberOptions } = options;
      
      return new Intl.NumberFormat(locale, numberOptions).format(value);
    },
    { locale: 'en-US' }
  ),
  
  // Percentage formatting
  percentage: createFormatterFactory(
    (value: number, options: Intl.NumberFormatOptions & { locale?: string } = {}) => {
      const locale = options.locale || 'en-US';
      const { locale: _, ...numberOptions } = options;
      
      const defaultOptions: Intl.NumberFormatOptions = {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        ...numberOptions
      };
      
      return new Intl.NumberFormat(locale, defaultOptions).format(value / 100);
    },
    { locale: 'en-US' }
  )
};

/**
 * Enhanced date-time formatter that returns structured data
 */
export function createDateTimeFormatter(locale: string = 'en-US') {
  const dateFormatter = formatters.date({ locale });
  const timeFormatter = formatters.time({ locale });
  
  return (date: Date | string): {
    date: string;
    time: string;
    full: string;
  } => {
    const dateStr = dateFormatter(date);
    const timeStr = timeFormatter(date);
    
    return {
      date: dateStr,
      time: timeStr,
      full: `${dateStr} at ${timeStr}`
    };
  };
}

/**
 * Legacy formatting functions for backward compatibility
 */
export function formatDate(date: Date | string, locale: string = 'en-US'): string {
  return formatters.date({ locale })(date);
}

export function formatTime(date: Date | string, locale: string = 'en-US'): string {
  return formatters.time({ locale })(date);
}

export function formatDateTime(date: Date | string, locale: string = 'en-US'): {
  date: string;
  time: string;
  full: string;
} {
  return createDateTimeFormatter(locale)(date);
}

/**
 * Format duration in minutes to human readable format
 */
export function formatDuration(minutes: number, locale: string = 'en-US'): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (locale === 'he') {
    if (hours > 0) {
      return `${hours} שעות${remainingMinutes > 0 ? ` ו-${remainingMinutes} דקות` : ''}`;
    }
    return `${remainingMinutes} דקות`;
  }

  if (hours > 0) {
    return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`;
  }
  return `${remainingMinutes}m`;
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Enhanced user data processor that handles multiple input formats
 * Replaces duplicate user processing logic across components
 */
export function createUserProcessor() {
  const getInitials = (user: { 
    firstName?: string; 
    lastName?: string; 
    email?: string;
    name?: string;
  }): string => {
    // Handle different user object formats
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    
    if (user.name) {
      const nameParts = user.name.trim().split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
      }
      return nameParts[0].charAt(0).toUpperCase();
    }
    
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return '?';
  };

  const getDisplayName = (user: { 
    firstName?: string; 
    lastName?: string; 
    email?: string;
    name?: string;
  }): string => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    
    if (user.name) {
      return user.name;
    }
    
    return user.email || 'Unknown User';
  };

  return { getInitials, getDisplayName };
}

/**
 * Legacy function maintained for backward compatibility
 * Use createUserProcessor().getInitials() for new code
 */
export function getInitials(firstName?: string, lastName?: string): string {
  const processor = createUserProcessor();
  return processor.getInitials({ firstName, lastName });
}

/**
 * Generic validation factory for creating type-specific validators
 * Eliminates repetitive validation patterns
 */
export function createValidator<T>(
  validator: (value: T) => boolean,
  errorMessage?: string
) {
  return {
    validate: validator,
    isValid: validator,
    errorMessage: errorMessage || 'Validation failed'
  };
}

/**
 * Collection of common validation patterns
 */
export const validators = {
  email: createValidator(
    (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    'Invalid email format'
  ),
  
  phone: createValidator(
    (phone: string): boolean => /^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/\s/g, '')),
    'Invalid phone number format'
  ),
  
  url: createValidator(
    (url: string): boolean => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    },
    'Invalid URL format'
  ),
  
  notEmpty: createValidator(
    (value: string): boolean => value.trim().length > 0,
    'Value cannot be empty'
  ),
  
  minLength: (min: number) => createValidator(
    (value: string): boolean => value.length >= min,
    `Value must be at least ${min} characters`
  ),
  
  maxLength: (max: number) => createValidator(
    (value: string): boolean => value.length <= max,
    `Value must be no more than ${max} characters`
  ),
  
  numeric: createValidator(
    (value: string): boolean => /^\d+$/.test(value),
    'Value must be numeric'
  ),
  
  alphanumeric: createValidator(
    (value: string): boolean => /^[a-zA-Z0-9]+$/.test(value),
    'Value must be alphanumeric'
  )
};

/**
 * Legacy validation functions for backward compatibility
 */
export function isValidEmail(email: string): boolean {
  return validators.email.isValid(email);
}

export function isValidPhone(phone: string): boolean {
  return validators.phone.isValid(phone);
}

/**
 * Generate random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number = config.defaults.DEBOUNCE_DELAY
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Check if two time ranges overlap
 */
export function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);

  return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
}

/**
 * Sleep function for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if file type is allowed
 */
export function isAllowedFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * Generate a random color based on string (for avatars)
 */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * Removes dangerous tags and attributes while preserving safe formatting
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove dangerous event handlers and javascript: links
  sanitized = sanitized.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
  sanitized = sanitized.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
  sanitized = sanitized.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"');
  sanitized = sanitized.replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#'");
  
  // Remove style attributes that could contain dangerous CSS
  sanitized = sanitized.replace(/\sstyle\s*=\s*"[^"]*"/gi, '');
  sanitized = sanitized.replace(/\sstyle\s*=\s*'[^']*'/gi, '');
  
  return sanitized;
}

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Strip all HTML tags from content
 */
export function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}
