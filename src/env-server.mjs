// Server-only environment variables
// This file should only be imported by server-side code
function getRequiredServerEnvVar(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required server environment variable: ${name}`);
    // Only throw in production runtime, not during build or compile time
    if (process.env.NODE_ENV === 'production' && 
        typeof window === 'undefined' && 
        !process.env.NEXT_PHASE &&
        !process.env.BUILDING &&
        !process.env.CI) {
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
    // Database and authentication
    DATABASE_URL: getOptionalServerEnvVar('DATABASE_URL'),
    NEXTAUTH_SECRET: getOptionalServerEnvVar('NEXTAUTH_SECRET'),
    
    // Email configuration
    SMTP_HOST: getOptionalServerEnvVar('SMTP_HOST'),
    SMTP_PORT: getOptionalServerEnvVar('SMTP_PORT'),
    SMTP_USER: getOptionalServerEnvVar('SMTP_USER'),
    SMTP_PASSWORD: getOptionalServerEnvVar('SMTP_PASSWORD'),
    SMTP_FROM: getOptionalServerEnvVar('SMTP_FROM'),
    
    // MFA Configuration
    MFA_ENCRYPTION_KEY: getOptionalServerEnvVar('MFA_ENCRYPTION_KEY'),
    MFA_SIGNING_KEY: getOptionalServerEnvVar('MFA_SIGNING_KEY'),
    MFA_ISSUER_NAME: getOptionalServerEnvVar('MFA_ISSUER_NAME', 'Loom'),
    MFA_TOKEN_EXPIRY_SECONDS: getOptionalServerEnvVar('MFA_TOKEN_EXPIRY_SECONDS', '1800'),
    MFA_MAX_VERIFICATION_ATTEMPTS: getOptionalServerEnvVar('MFA_MAX_VERIFICATION_ATTEMPTS', '3'),
    MFA_RATE_LIMIT_WINDOW_MS: getOptionalServerEnvVar('MFA_RATE_LIMIT_WINDOW_MS', '300000'),
    MFA_RATE_LIMIT_MAX_ATTEMPTS: getOptionalServerEnvVar('MFA_RATE_LIMIT_MAX_ATTEMPTS', '5'),
    
    // Monitoring and analytics
    SENTRY_DSN: getOptionalServerEnvVar('SENTRY_DSN'),
    
    // Infrastructure
    REDIS_URL: getOptionalServerEnvVar('REDIS_URL'),
    
    // Rate limiting
    RATE_LIMIT_ENABLED: getOptionalServerEnvVar('RATE_LIMIT_ENABLED', 'true'),
    RATE_LIMIT_WINDOW_MS: getOptionalServerEnvVar('RATE_LIMIT_WINDOW_MS', '60000'),
    RATE_LIMIT_MAX_REQUESTS: getOptionalServerEnvVar('RATE_LIMIT_MAX_REQUESTS', '100'),
    
    // External services
    EMAIL_PROVIDER: getOptionalServerEnvVar('EMAIL_PROVIDER', 'resend'),
    EMAIL_FROM: getOptionalServerEnvVar('EMAIL_FROM'),
    EMAIL_FROM_NAME: getOptionalServerEnvVar('EMAIL_FROM_NAME'),
    RESEND_API_KEY: getOptionalServerEnvVar('RESEND_API_KEY'),
    VAPID_PRIVATE_KEY: getOptionalServerEnvVar('VAPID_PRIVATE_KEY'),
    VAPID_SUBJECT: getOptionalServerEnvVar('VAPID_SUBJECT'),
    VIRUSTOTAL_API_KEY: getOptionalServerEnvVar('VIRUSTOTAL_API_KEY'),
    CLAMAV_HOST: getOptionalServerEnvVar('CLAMAV_HOST'),
    CLAMAV_PORT: getOptionalServerEnvVar('CLAMAV_PORT'),
  };
  
  return _serverEnvCache;
}

export const serverEnv = createServerEnv();