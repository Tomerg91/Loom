// API Endpoints Configuration
// Centralized API route definitions to replace hardcoded URLs throughout the application

/**
 * Authentication API Endpoints
 */
export const AUTH_ENDPOINTS = {
  // Core authentication
  SIGN_UP: '/api/auth/signup',
  SIGN_IN: '/api/auth/signin', 
  SIGN_OUT: '/api/auth/signout',
  
  // Profile management
  ME: '/api/auth/me',
  PROFILE: '/api/auth/profile',
  SESSION: '/api/auth/session',
  
  // Password management
  RESET_PASSWORD: '/api/auth/reset-password',
  UPDATE_PASSWORD: '/api/auth/update-password',
  
  // Email verification
  VERIFY: '/api/auth/verify',
  
  // Multi-Factor Authentication endpoints
  MFA_STATUS: '/api/auth/mfa-status',
  MFA_SETUP: '/api/auth/mfa/setup',
  MFA_VERIFY: '/api/auth/mfa/verify',
  MFA_ENABLE: '/api/auth/mfa/enable',
  MFA_DISABLE: '/api/auth/mfa/disable',
  MFA_BACKUP_CODES: '/api/auth/mfa/backup-codes',
  SIGNIN_MFA: '/api/auth/signin-mfa',
  
  // Additional auth endpoints
  AVATAR: '/api/auth/avatar',
  DOCS: '/api/auth/docs',
} as const;

/**
 * Sessions API Endpoints
 */
export const SESSION_ENDPOINTS = {
  // Core session operations
  BASE: '/api/sessions',
  BOOK: '/api/sessions/book',
  
  // Session by ID
  getById: (id: string) => `/api/sessions/${id}`,
  
  // Session actions
  cancel: (id: string) => `/api/sessions/${id}/cancel`,
  complete: (id: string) => `/api/sessions/${id}/complete`,
  reschedule: (id: string) => `/api/sessions/${id}/reschedule`,
} as const;

/**
 * User Management API Endpoints
 */
export const USER_ENDPOINTS = {
  // Core user operations
  BASE: '/api/users',
  
  // User by ID
  getById: (id: string) => `/api/users/${id}`,
  updateById: (id: string) => `/api/users/${id}`,
  deleteById: (id: string) => `/api/users/${id}`,
} as const;

/**
 * Coach API Endpoints
 */
export const COACH_ENDPOINTS = {
  // Base endpoint
  BASE: '/api/coaches',
  
  // Coach by ID operations
  getById: (id: string) => `/api/coaches/${id}`,
  
  // Coach availability
  getAvailability: (id: string) => `/api/coaches/${id}/availability`,
  updateAvailability: (id: string) => `/api/coaches/${id}/availability`,
  
  // Coach schedule
  getSchedule: (id: string) => `/api/coaches/${id}/schedule`,
  updateSchedule: (id: string) => `/api/coaches/${id}/schedule`,
} as const;

/**
 * Notifications API Endpoints
 */
export const NOTIFICATION_ENDPOINTS = {
  // Core operations
  BASE: '/api/notifications',
  MARK_ALL_READ: '/api/notifications/mark-all-read',
  
  // Notification by ID
  getById: (id: string) => `/api/notifications/${id}`,
  markAsRead: (id: string) => `/api/notifications/${id}/read`,
  deleteById: (id: string) => `/api/notifications/${id}`,
} as const;

/**
 * Notes API Endpoints (Coach Notes)
 */
export const NOTES_ENDPOINTS = {
  // Core operations
  BASE: '/api/notes',
  
  // Note by ID
  getById: (id: string) => `/api/notes/${id}`,
  updateById: (id: string) => `/api/notes/${id}`,
  deleteById: (id: string) => `/api/notes/${id}`,
} as const;

/**
 * Reflections API Endpoints (Client Reflections)
 */
export const REFLECTION_ENDPOINTS = {
  // Core operations
  BASE: '/api/reflections',
  
  // Reflection by ID
  getById: (id: string) => `/api/reflections/${id}`,
  updateById: (id: string) => `/api/reflections/${id}`,
  deleteById: (id: string) => `/api/reflections/${id}`,
} as const;

/**
 * Admin API Endpoints
 */
export const ADMIN_ENDPOINTS = {
  // Analytics
  ANALYTICS: '/api/admin/analytics',
  
  // User management
  USERS: '/api/admin/users',
  getUserById: (id: string) => `/api/admin/users/${id}`,
  updateUserById: (id: string) => `/api/admin/users/${id}`,
  deleteUserById: (id: string) => `/api/admin/users/${id}`,
} as const;

/**
 * System API Endpoints
 */
export const SYSTEM_ENDPOINTS = {
  // Health check
  HEALTH: '/api/health',
  
  // Documentation
  DOCS: '/api/docs',
} as const;

/**
 * External Service URLs
 * URLs that point to external services
 */
export const EXTERNAL_URLS = {
  // Production URLs
  PRODUCTION_SITE: 'https://loom-bay.vercel.app',
  
  // Development URLs
  LOCALHOST: 'http://localhost:3000',
  LOCALHOST_ALT: 'http://localhost:3001', // Alternative port for development
  
  // Third-party services
  TRANZILA: {
    SECURE: 'https://secure5.tranzila.com',
    DIRECT: 'https://direct.tranzila.com',
  },
  
  GOOGLE: {
    FONTS: 'https://fonts.googleapis.com',
    FONTS_STATIC: 'https://fonts.gstatic.com',
  },
  
  SUPABASE: {
    PATTERN_CO: 'https://*.supabase.co',
    PATTERN_COM: 'https://*.supabase.com',
  },
  
  VERCEL: 'https://vercel.live',
} as const;

/**
 * API Response Status Codes
 * Commonly used HTTP status codes
 */
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  
  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Common Query Parameters
 */
export const QUERY_PARAMS = {
  // Pagination
  PAGE: 'page',
  LIMIT: 'limit',
  OFFSET: 'offset',
  
  // Filtering
  FILTER: 'filter',
  SEARCH: 'search',
  SORT: 'sort',
  ORDER: 'order',
  
  // Date ranges
  START_DATE: 'startDate',
  END_DATE: 'endDate',
  
  // Status filtering
  STATUS: 'status',
  TYPE: 'type',
  ROLE: 'role',
} as const;

/**
 * Content Types
 */
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  URL_ENCODED: 'application/x-www-form-urlencoded',
  TEXT_PLAIN: 'text/plain',
  TEXT_HTML: 'text/html',
} as const;

/**
 * HTTP Methods
 */
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  OPTIONS: 'OPTIONS',
  HEAD: 'HEAD',
} as const;

// Type exports for TypeScript support
export type AuthEndpoints = typeof AUTH_ENDPOINTS;
export type SessionEndpoints = typeof SESSION_ENDPOINTS;
export type UserEndpoints = typeof USER_ENDPOINTS;
export type CoachEndpoints = typeof COACH_ENDPOINTS;
export type NotificationEndpoints = typeof NOTIFICATION_ENDPOINTS;
export type NotesEndpoints = typeof NOTES_ENDPOINTS;
export type ReflectionEndpoints = typeof REFLECTION_ENDPOINTS;
export type AdminEndpoints = typeof ADMIN_ENDPOINTS;
export type SystemEndpoints = typeof SYSTEM_ENDPOINTS;
export type ExternalUrls = typeof EXTERNAL_URLS;
export type HttpStatus = typeof HTTP_STATUS;
export type QueryParams = typeof QUERY_PARAMS;
export type ContentTypes = typeof CONTENT_TYPES;
export type HttpMethods = typeof HTTP_METHODS;