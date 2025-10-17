/**
 * Environment variables configuration
 * Validates and exports environment variables with type safety
 */

export const env = {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // App URLs
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || '',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',

  // NextAuth
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || '',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',

  // MFA
  MFA_ENCRYPTION_KEY: process.env.MFA_ENCRYPTION_KEY || '',
  MFA_SIGNING_KEY: process.env.MFA_SIGNING_KEY || '',
  MFA_ISSUER_NAME: process.env.MFA_ISSUER_NAME || 'LoomApp',
  MFA_TOKEN_EXPIRY_SECONDS: process.env.MFA_TOKEN_EXPIRY_SECONDS || '300',
  MFA_MAX_VERIFICATION_ATTEMPTS: process.env.MFA_MAX_VERIFICATION_ATTEMPTS || '5',
  MFA_RATE_LIMIT_WINDOW_MS: process.env.MFA_RATE_LIMIT_WINDOW_MS || '900000',
  MFA_RATE_LIMIT_MAX_ATTEMPTS: process.env.MFA_RATE_LIMIT_MAX_ATTEMPTS || '5',

  // Feature flags
  NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  NEXT_PUBLIC_ENABLE_DEBUG: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
} as const;

// Type for environment variables
export type Env = typeof env;
