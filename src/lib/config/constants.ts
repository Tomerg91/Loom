// Centralized constants and configuration values
// This file consolidates all hardcoded values from across the application

/**
 * Cache Configuration
 */
export const CACHE_CONFIG = {
  // Role cache settings (middleware)
  ROLE_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  ROLE_CACHE_MAX_SIZE: 1000,
  ROLE_CACHE_CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour
  
  // Query cache settings
  QUERY_STALE_TIME: 60 * 1000, // 1 minute
  QUERY_GC_TIME: 5 * 60 * 1000, // 5 minutes
  
  // Static assets cache
  STATIC_ASSETS_MAX_AGE: 365 * 24 * 60 * 60, // 1 year
  STATIC_ASSETS_SWR: 24 * 60 * 60, // 1 day
  
  // API responses cache
  API_CACHE_MAX_AGE: 5 * 60, // 5 minutes
  API_CACHE_SWR: 60, // 1 minute
  
  // Page content cache
  PAGE_CACHE_MAX_AGE: 60 * 60, // 1 hour
  PAGE_CACHE_SWR: 5 * 60, // 5 minutes
  
  // User content cache
  USER_CACHE_MAX_AGE: 60, // 1 minute
  USER_CACHE_SWR: 30, // 30 seconds
} as const;

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMIT_CONFIG = {
  // Authentication rate limits
  AUTH_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  AUTH_MAX_ATTEMPTS: 5,
  
  // API rate limits
  API_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  API_MAX_REQUESTS: 100,
  
  // Booking rate limits
  BOOKING_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  BOOKING_MAX_ATTEMPTS: 10,
  
  // Default rate limit values
  DEFAULT_MAX_REQUESTS: 100,
  DEFAULT_WINDOW_MS: 60000, // 1 minute
  
  // Cleanup interval
  CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * Tier-based Rate Limits
 */
export const TIER_LIMITS = {
  FREE: {
    SESSIONS_PER_DAY: 5,
    API_REQUESTS_PER_HOUR: 100,
  },
  PREMIUM: {
    SESSIONS_PER_DAY: 50,
    API_REQUESTS_PER_HOUR: 1000,
  },
  ENTERPRISE: {
    SESSIONS_PER_DAY: 1000,
    API_REQUESTS_PER_HOUR: 10000,
  },
} as const;

/**
 * Session Configuration
 */
export const SESSION_CONFIG = {
  // Default durations
  DEFAULT_DURATION_MINUTES: 60,
  DEFAULT_SLOT_DURATION: 60,
  
  // Duration limits
  MIN_DURATION_MINUTES: 15,
  MAX_DURATION_MINUTES: 480, // 8 hours
  
  // Pagination
  DEFAULT_SESSIONS_LIMIT: 50,
  
  // Reminders
  REMINDER_TIME_MS: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * API Configuration
 */
export const API_CONFIG = {
  // Pagination
  MIN_PAGE_SIZE: 1,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 10,
  
  // Notifications
  DEFAULT_NOTIFICATIONS_LIMIT: 50,
  NOTIFICATIONS_BY_TYPE_LIMIT: 20,
  
  // Retry configuration
  MAX_QUERY_RETRIES: 3,
  MAX_MUTATION_RETRIES: 1,
} as const;

/**
 * File Upload Configuration
 */
export const FILE_CONFIG = {
  // Size limits (in bytes)
  AVATAR_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  DOCUMENT_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  
  // Image optimization
  DEFAULT_IMAGE_QUALITY: 80,
  
  // Content limits
  MAX_INPUT_LENGTH: 10000,
  COMPRESSION_THRESHOLD: 1000,
  STRING_TRUNCATION_LIMIT: 500,
} as const;

/**
 * Validation Configuration
 */
export const VALIDATION_CONFIG = {
  // Password requirements
  MIN_PASSWORD_LENGTH: 8,
  
  // Text field limits
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 2000,
  
  // File validation
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
} as const;

/**
 * Real-time Configuration
 */
export const REALTIME_CONFIG = {
  // Polling intervals (in milliseconds)
  PRESENCE_POLLING_INTERVAL: 1000,
  CONNECTION_CHECK_INTERVAL: 1000,
  
  // Intersection observer
  LAZY_LOAD_ROOT_MARGIN: '50px',
  
  // Request deduplication
  REQUEST_DEDUP_TTL: 5000,
} as const;

/**
 * Security URLs and Endpoints
 */
export const SECURITY_URLS = {
  // Password reset redirect URLs
  RESET_PASSWORD_URLS: [
    'https://loom-bay.vercel.app/reset-password',
    'http://localhost:3001/reset-password', // Development
  ],
  
  // CSP allowed URLs
  CSP_ALLOWED_URLS: {
    VERCEL: 'https://vercel.live',
    TRANZILA_SECURE: 'https://secure5.tranzila.com',
    TRANZILA_DIRECT: 'https://direct.tranzila.com',
    GOOGLE_FONTS: 'https://fonts.googleapis.com',
    GOOGLE_FONTS_STATIC: 'https://fonts.gstatic.com',
    SUPABASE_CO: 'https://*.supabase.co',
    SUPABASE_COM: 'https://*.supabase.com',
  },
} as const;

/**
 * Default Values
 */
export const DEFAULTS = {
  // Timezone
  TIMEZONE: 'UTC',
  
  // URLs
  LOCALHOST_URL: 'http://localhost:3000',
  
  // Debounce
  DEBOUNCE_DELAY: 300, // milliseconds
} as const;

/**
 * Environment-based Configuration
 */
export const ENV_CONFIG = {
  DEVELOPMENT: {
    LOG_LEVEL: 'debug',
    CACHE_ENABLED: false,
    RATE_LIMIT_ENABLED: false,
  },
  STAGING: {
    LOG_LEVEL: 'info',
    CACHE_ENABLED: true,
    RATE_LIMIT_ENABLED: true,
  },
  PRODUCTION: {
    LOG_LEVEL: 'error',
    CACHE_ENABLED: true,
    RATE_LIMIT_ENABLED: true,
  },
} as const;

/**
 * Feature Flags
 */
export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: true,
  ENABLE_REAL_TIME_FEATURES: true,
  ENABLE_FILE_UPLOADS: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_CACHING: true,
  ENABLE_RATE_LIMITING: true,
} as const;

// Type exports for TypeScript support
export type CacheConfig = typeof CACHE_CONFIG;
export type RateLimitConfig = typeof RATE_LIMIT_CONFIG;
export type SessionConfig = typeof SESSION_CONFIG;
export type ApiConfig = typeof API_CONFIG;
export type FileConfig = typeof FILE_CONFIG;
export type ValidationConfig = typeof VALIDATION_CONFIG;
export type RealtimeConfig = typeof REALTIME_CONFIG;
export type SecurityUrls = typeof SECURITY_URLS;
export type Defaults = typeof DEFAULTS;
export type FeatureFlags = typeof FEATURE_FLAGS;