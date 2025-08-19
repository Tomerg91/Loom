// Client-safe environment variables only
// CRITICAL: Only NEXT_PUBLIC_ prefixed variables can be safely exposed to the client
function getRequiredClientEnvVar(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required client environment variable: ${name}`);
    // In production, provide more helpful error but don't crash the build
    if (process.env.NODE_ENV === 'production') {
      console.error(`Production deployment missing ${name}. Check Vercel environment variables.`);
      // Return a placeholder that will show a user-friendly error in the UI
      return `MISSING_${name.replace('NEXT_PUBLIC_', '')}`;
    }
  }
  return value;
}

function getOptionalClientEnvVar(name, defaultValue = undefined) {
  return process.env[name] || defaultValue;
}

// Only client-safe environment variables (NEXT_PUBLIC_ prefixed)
export const env = {
  NODE_ENV: getOptionalClientEnvVar('NODE_ENV', 'development'),
  
  // Core Supabase configuration (required)
  NEXT_PUBLIC_SUPABASE_URL: getRequiredClientEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getRequiredClientEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  
  // App configuration
  NEXT_PUBLIC_APP_URL: getOptionalClientEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  
  // Feature flags
  NEXT_PUBLIC_ENABLE_ANALYTICS: getOptionalClientEnvVar('NEXT_PUBLIC_ENABLE_ANALYTICS', 'false'),
  NEXT_PUBLIC_ENABLE_DEBUG: getOptionalClientEnvVar('NEXT_PUBLIC_ENABLE_DEBUG', 'false'),
  
  // File upload configuration
  NEXT_PUBLIC_MAX_FILE_SIZE: getOptionalClientEnvVar('NEXT_PUBLIC_MAX_FILE_SIZE', '10485760'),
  NEXT_PUBLIC_ALLOWED_FILE_TYPES: getOptionalClientEnvVar('NEXT_PUBLIC_ALLOWED_FILE_TYPES', 'image/jpeg,image/png,image/gif,application/pdf'),
  
  // Analytics and monitoring
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: getOptionalClientEnvVar('NEXT_PUBLIC_GOOGLE_ANALYTICS_ID'),
  NEXT_PUBLIC_POSTHOG_KEY: getOptionalClientEnvVar('NEXT_PUBLIC_POSTHOG_KEY'),
  NEXT_PUBLIC_POSTHOG_HOST: getOptionalClientEnvVar('NEXT_PUBLIC_POSTHOG_HOST'),
  NEXT_PUBLIC_SENTRY_DSN: getOptionalClientEnvVar('NEXT_PUBLIC_SENTRY_DSN'),
  
  // Push notifications
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: getOptionalClientEnvVar('NEXT_PUBLIC_VAPID_PUBLIC_KEY'),
};