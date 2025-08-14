// Client-safe environment variables only
// CRITICAL: Only NEXT_PUBLIC_ prefixed variables can be safely exposed to the client
function getRequiredClientEnvVar(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required client environment variable: ${name}`);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required client environment variable: ${name}`);
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
  // Only public environment variables that are safe for client-side
  NEXT_PUBLIC_SUPABASE_URL: getRequiredClientEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getRequiredClientEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  NEXT_PUBLIC_APP_URL: getOptionalClientEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: getOptionalClientEnvVar('NEXT_PUBLIC_GOOGLE_ANALYTICS_ID'),
  NEXT_PUBLIC_POSTHOG_KEY: getOptionalClientEnvVar('NEXT_PUBLIC_POSTHOG_KEY'),
  NEXT_PUBLIC_POSTHOG_HOST: getOptionalClientEnvVar('NEXT_PUBLIC_POSTHOG_HOST'),
  NEXT_PUBLIC_SENTRY_DSN: getOptionalClientEnvVar('NEXT_PUBLIC_SENTRY_DSN'),
};