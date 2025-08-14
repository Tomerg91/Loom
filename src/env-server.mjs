// Server-only environment variables
// This file should only be imported by server-side code
function getRequiredServerEnvVar(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required server environment variable: ${name}`);
    // Only throw in production runtime, not during build
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined' && !process.env.NEXT_PHASE) {
      throw new Error(`Missing required server environment variable: ${name}`);
    }
  }
  return value;
}

function getOptionalServerEnvVar(name, defaultValue = undefined) {
  return process.env[name] || defaultValue;
}

// Lazy loading to prevent build-time errors
let _serverEnvCache = null;

function createServerEnv() {
  if (_serverEnvCache) {
    return _serverEnvCache;
  }
  
  _serverEnvCache = {
    NODE_ENV: getOptionalServerEnvVar('NODE_ENV', 'development'),
    // CRITICAL: Service role key should NEVER be exposed to client
    get SUPABASE_SERVICE_ROLE_KEY() {
      return getRequiredServerEnvVar('SUPABASE_SERVICE_ROLE_KEY');
    },
    SENTRY_DSN: getOptionalServerEnvVar('SENTRY_DSN'),
    SMTP_HOST: getOptionalServerEnvVar('SMTP_HOST'),
    SMTP_PORT: getOptionalServerEnvVar('SMTP_PORT'),
    SMTP_USER: getOptionalServerEnvVar('SMTP_USER'),
    SMTP_PASSWORD: getOptionalServerEnvVar('SMTP_PASSWORD'),
    REDIS_URL: getOptionalServerEnvVar('REDIS_URL'),
  };
  
  return _serverEnvCache;
}

export const serverEnv = createServerEnv();