// Client-safe environment variables only
// CRITICAL: Only NEXT_PUBLIC_ prefixed variables can be safely exposed to the client
function getRequiredClientEnvVar(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    const errorMessage = `Missing required client environment variable: ${name}`;
    console.error(errorMessage);
    
    // In production, throw an error during build time to prevent deployment with missing variables
    // Only allow placeholders during development
    if (process.env.NODE_ENV === 'production') {
      console.error(`Production deployment missing ${name}. Check environment variables.`);
      throw new Error(`${errorMessage}. This is required for production deployment.`);
    } else {
      // In development, allow missing variables but warn
      console.warn(`Development environment missing ${name}. Using placeholder.`);
      return `MISSING_${name.replace('NEXT_PUBLIC_', '')}`;
    }
  }
  
  // Check for common placeholder values that shouldn't be used in production
  const placeholderPatterns = [
    'your-project-id',
    'your-supabase',
    'localhost',
    'MISSING_',
    'INVALID_',
    'your_'
  ];
  
  if (placeholderPatterns.some(pattern => value.includes(pattern))) {
    const errorMessage = `Invalid placeholder value for ${name}: ${value}`;
    console.error(errorMessage);
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`${errorMessage}. Please set a real value for production.`);
    } else {
      console.warn(`Development environment using placeholder for ${name}`);
    }
  }
  
  // Validate URL format for URL-type environment variables
  if (name.includes('URL') && value && !value.startsWith('MISSING_')) {
    try {
      new URL(value);
    } catch (error) {
      const errorMessage = `Invalid URL format for ${name}: ${value}`;
      console.error(errorMessage);
      
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`${errorMessage}. Please provide a valid URL.`);
      } else {
        console.warn(`Development environment has invalid URL format for ${name}`);
        return `INVALID_${name.replace('NEXT_PUBLIC_', '')}_FORMAT`;
      }
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