// Validate and provide environment variables
function getRequiredEnvVar(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    // Don't throw in development to allow for easier setup
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${name}`);
    }
  }
  return value;
}

function getOptionalEnvVar(name, defaultValue = undefined) {
  return process.env[name] || defaultValue;
}

export const env = {
  NODE_ENV: getOptionalEnvVar('NODE_ENV', 'development'),
  SUPABASE_SERVICE_ROLE_KEY: getOptionalEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  SENTRY_DSN: getOptionalEnvVar('SENTRY_DSN'),
  SMTP_HOST: getOptionalEnvVar('SMTP_HOST'),
  SMTP_PORT: getOptionalEnvVar('SMTP_PORT'),
  SMTP_USER: getOptionalEnvVar('SMTP_USER'),
  SMTP_PASSWORD: getOptionalEnvVar('SMTP_PASSWORD'),
  REDIS_URL: getOptionalEnvVar('REDIS_URL'),
  NEXT_PUBLIC_SUPABASE_URL: getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  NEXT_PUBLIC_APP_URL: getOptionalEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: getOptionalEnvVar('NEXT_PUBLIC_GOOGLE_ANALYTICS_ID'),
  NEXT_PUBLIC_POSTHOG_KEY: getOptionalEnvVar('NEXT_PUBLIC_POSTHOG_KEY'),
  NEXT_PUBLIC_POSTHOG_HOST: getOptionalEnvVar('NEXT_PUBLIC_POSTHOG_HOST'),
  NEXT_PUBLIC_SENTRY_DSN: getOptionalEnvVar('NEXT_PUBLIC_SENTRY_DSN'),
};