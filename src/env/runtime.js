/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Server-side environment variables loader
 * Cached to avoid repeated lookups during build and runtime
 * Includes credential sanitization and multi-source resolution
 */

const { createEnv } = require('@t3-oss/env-nextjs');
const { z } = require('zod');

// Placeholder constants for fallback values
const PLACEHOLDER_SUPABASE_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_SUPABASE_ANON_KEY = 'sb_placeholder_supabase_key';

// Cache for environment variable lookups
const envCache = {};

/**
 * Get environment variable with caching and optional default value
 * @param {string} key - Environment variable key
 * @param {string} [defaultValue] - Optional default value
 * @returns {string|undefined} - Environment variable value
 */
function getEnvVar(key, defaultValue) {
  if (envCache[key] !== undefined) {
    return envCache[key];
  }

  const value = process.env[key] ?? defaultValue;
  envCache[key] = value;
  return value;
}

/**
 * Sanitize credential string by removing embedded newlines and escape sequences
 * Prevents malformed URLs and keys from breaking the application
 * @param {string} value - Credential string to sanitize
 * @returns {string} - Sanitized credential string
 */
function sanitizeCredential(value) {
  return value.trim().replace(/\\n/g, '').replace(/\n/g, '');
}

/**
 * Resolve Supabase URL from multiple possible environment variable sources
 * Checks SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL
 * @returns {string} - Sanitized Supabase URL
 */
const resolveSupabaseUrl = () => {
  const url =
    getEnvVar('SUPABASE_URL') ||
    getEnvVar('NEXT_PUBLIC_SUPABASE_URL') ||
    PLACEHOLDER_SUPABASE_URL;

  return sanitizeCredential(url);
};

/**
 * Resolve Supabase anon key from multiple possible environment variable sources
 * Checks SUPABASE_PUBLISHABLE_KEY, SUPABASE_ANON_KEY, SUPABASE_PUBLIC_ANON_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY
 * @returns {string} - Sanitized Supabase anon key
 */
const resolveSupabaseAnonKey = () => {
  const key =
    getEnvVar('SUPABASE_PUBLISHABLE_KEY') ||
    getEnvVar('SUPABASE_ANON_KEY') ||
    getEnvVar('SUPABASE_PUBLIC_ANON_KEY') ||
    getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    PLACEHOLDER_SUPABASE_ANON_KEY;

  return sanitizeCredential(key);
};

// Client environment validation schema
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL')
    .default(PLACEHOLDER_SUPABASE_URL),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
    .default(PLACEHOLDER_SUPABASE_ANON_KEY),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL')
    .optional(),
  NEXT_PUBLIC_SENTRY_DSN: z
    .string()
    .url('NEXT_PUBLIC_SENTRY_DSN must be a valid DSN URL')
    .optional(),
});

// Build raw client environment using resolvers
const rawClientEnv = {
  NEXT_PUBLIC_SUPABASE_URL: resolveSupabaseUrl(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: resolveSupabaseAnonKey(),
  NEXT_PUBLIC_APP_URL: getEnvVar('NEXT_PUBLIC_APP_URL'),
  NEXT_PUBLIC_SENTRY_DSN:
    getEnvVar('NEXT_PUBLIC_SENTRY_DSN') || getEnvVar('SENTRY_DSN'),
};

// Parse and validate client environment
const parsedClientEnv = clientEnvSchema.safeParse(rawClientEnv);

if (!parsedClientEnv.success) {
  const flattened = parsedClientEnv.error.flatten();
  const formattedErrors = Object.entries(flattened.fieldErrors)
    .map(([key, messages]) => `${key}: ${(messages || []).join(', ')}`)
    .join('\n');

  throw new Error(
    `Failed to load client environment variables.\n${formattedErrors}`
  );
}

const clientEnv = parsedClientEnv.data;

/**
 * Create serverEnv with fallback for Edge Runtime
 * createEnv doesn't work in Edge Runtime (Vercel), so we try-catch it
 */
const createServerEnv = () => {
  const baseEnv = {
    SUPABASE_SERVICE_ROLE_KEY:
      getEnvVar('SUPABASE_SECRET_KEY') ||
      getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
    DATABASE_URL: getEnvVar('DATABASE_URL'),
    SENTRY_DSN: getEnvVar('SENTRY_DSN'),
    TASK_ATTACHMENTS_BUCKET: getEnvVar('TASK_ATTACHMENTS_BUCKET'),
    NEXT_PUBLIC_SUPABASE_URL: clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: clientEnv.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN: clientEnv.NEXT_PUBLIC_SENTRY_DSN,
  };

  try {
    // Try to use createEnv for validation (works in Node.js runtime)
    return createEnv({
      server: {
        SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
        DATABASE_URL: z.string().url().optional(),
        SENTRY_DSN: z.string().optional(),
        TASK_ATTACHMENTS_BUCKET: z.string().min(1).optional(),
      },
      client: clientEnvSchema.shape,
      runtimeEnv: baseEnv,
      emptyStringAsUndefined: true,
    });
  } catch (_error) {
    // Fallback for Edge Runtime (Vercel) where createEnv fails
    // Return raw environment values without validation
    return baseEnv;
  }
};

const serverEnv = createServerEnv();

// Export all required values for backward compatibility
module.exports = {
  clientEnv,
  serverEnv,
  env: serverEnv, // Alias for backward compatibility
  PLACEHOLDER_SUPABASE_ANON_KEY,
  PLACEHOLDER_SUPABASE_URL,
  resolveSupabaseAnonKey,
  resolveSupabaseUrl,
};
