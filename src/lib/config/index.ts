// Main configuration module - provides easy access to all app configuration
import {
  AUTH_ENDPOINTS,
  SESSION_ENDPOINTS,
  USER_ENDPOINTS,
  COACH_ENDPOINTS,
  NOTIFICATION_ENDPOINTS,
  NOTES_ENDPOINTS,
  REFLECTION_ENDPOINTS,
  ADMIN_ENDPOINTS,
  SYSTEM_ENDPOINTS,
  EXTERNAL_URLS,
  HTTP_STATUS,
  QUERY_PARAMS,
  CONTENT_TYPES,
  HTTP_METHODS,
} from './api-endpoints';
import {
  CACHE_CONFIG,
  RATE_LIMIT_CONFIG,
  TIER_LIMITS,
  SESSION_CONFIG,
  API_CONFIG,
  FILE_CONFIG,
  VALIDATION_CONFIG,
  REALTIME_CONFIG,
  SECURITY_URLS,
  DEFAULTS,
  ENV_CONFIG,
  UI_CONFIG,
  FEATURE_FLAGS,
} from './constants';


/**
 * Application Configuration
 * Centralized access to all configuration values
 */
export class AppConfig {
  private static instance: AppConfig;
  private environment: keyof typeof ENV_CONFIG;

  private constructor() {
    this.environment = this.getEnvironment();
  }

  public static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }

  private getEnvironment(): keyof typeof ENV_CONFIG {
    const env = process.env.NODE_ENV;
    const customEnv = process.env.APP_ENV; // Custom environment variable for staging
    
    if (customEnv === 'staging') {
      return 'STAGING';
    }
    
    switch (env) {
      case 'development':
        return 'DEVELOPMENT';
      case 'test':
        return 'STAGING';
      case 'production':
        return 'PRODUCTION';
      default:
        return 'DEVELOPMENT';
    }
  }

  // Cache Configuration
  get cache() {
    return CACHE_CONFIG;
  }

  // Rate Limiting Configuration
  get rateLimit() {
    return RATE_LIMIT_CONFIG;
  }

  // Tier Limits
  get tierLimits() {
    return TIER_LIMITS;
  }

  // Session Configuration
  get session() {
    return SESSION_CONFIG;
  }

  // API Configuration
  get api() {
    return API_CONFIG;
  }

  // File Configuration
  get file() {
    return FILE_CONFIG;
  }

  // Validation Configuration
  get validation() {
    return VALIDATION_CONFIG;
  }

  // Real-time Configuration
  get realtime() {
    return REALTIME_CONFIG;
  }

  // Security URLs
  get security() {
    return SECURITY_URLS;
  }

  // Default Values
  get defaults() {
    return DEFAULTS;
  }

  // UI Configuration
  get ui() {
    return UI_CONFIG;
  }

  // Environment Configuration
  get env() {
    return ENV_CONFIG[this.environment];
  }

  // Feature Flags
  get features() {
    return FEATURE_FLAGS;
  }

  // API Endpoints
  get endpoints() {
    return {
      auth: AUTH_ENDPOINTS,
      sessions: SESSION_ENDPOINTS,
      users: USER_ENDPOINTS,
      coaches: COACH_ENDPOINTS,
      notifications: NOTIFICATION_ENDPOINTS,
      notes: NOTES_ENDPOINTS,
      reflections: REFLECTION_ENDPOINTS,
      admin: ADMIN_ENDPOINTS,
      system: SYSTEM_ENDPOINTS,
      external: EXTERNAL_URLS,
    };
  }

  // HTTP Configuration
  get http() {
    return {
      status: HTTP_STATUS,
      methods: HTTP_METHODS,
      contentTypes: CONTENT_TYPES,
      queryParams: QUERY_PARAMS,
    };
  }

  // Environment-specific getters
  get isDevelopment() {
    return this.environment === 'DEVELOPMENT';
  }

  get isStaging() {
    return this.environment === 'STAGING';
  }

  get isProduction() {
    return this.environment === 'PRODUCTION';
  }

  // Get password reset URL for current environment
  getPasswordResetUrl(): string {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`;
    }
    
    return this.isDevelopment 
      ? this.security.RESET_PASSWORD_URLS[1] // localhost
      : this.security.RESET_PASSWORD_URLS[0]; // production
  }

  // Get rate limit config for specific operation
  getRateLimitConfig(operation: 'auth' | 'api' | 'booking') {
    switch (operation) {
      case 'auth':
        return {
          windowMs: this.rateLimit.AUTH_WINDOW_MS,
          max: this.rateLimit.AUTH_MAX_ATTEMPTS,
        };
      case 'api':
        return {
          windowMs: this.rateLimit.API_WINDOW_MS,
          max: this.rateLimit.API_MAX_REQUESTS,
        };
      case 'booking':
        return {
          windowMs: this.rateLimit.BOOKING_WINDOW_MS,
          max: this.rateLimit.BOOKING_MAX_ATTEMPTS,
        };
      default:
        return {
          windowMs: this.rateLimit.DEFAULT_WINDOW_MS,
          max: this.rateLimit.DEFAULT_MAX_REQUESTS,
        };
    }
  }

  // Get tier limits for user
  getTierLimits(tier: 'free' | 'premium' | 'enterprise') {
    const tierKey = tier.toUpperCase() as keyof typeof TIER_LIMITS;
    return this.tierLimits[tierKey] || this.tierLimits.FREE;
  }

  // Get cache configuration by type
  getCacheConfig(type: 'static' | 'api' | 'page' | 'user') {
    switch (type) {
      case 'static':
        return {
          maxAge: this.cache.STATIC_ASSETS_MAX_AGE,
          staleWhileRevalidate: this.cache.STATIC_ASSETS_SWR,
        };
      case 'api':
        return {
          maxAge: this.cache.API_CACHE_MAX_AGE,
          staleWhileRevalidate: this.cache.API_CACHE_SWR,
        };
      case 'page':
        return {
          maxAge: this.cache.PAGE_CACHE_MAX_AGE,
          staleWhileRevalidate: this.cache.PAGE_CACHE_SWR,
        };
      case 'user':
        return {
          maxAge: this.cache.USER_CACHE_MAX_AGE,
          staleWhileRevalidate: this.cache.USER_CACHE_SWR,
        };
      default:
        return {
          maxAge: this.cache.API_CACHE_MAX_AGE,
          staleWhileRevalidate: this.cache.API_CACHE_SWR,
        };
    }
  }

  // Validate configuration on startup
  validate(): boolean {
    try {
      // Validate required environment variables
      const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      ];

      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          logger.error(`Missing required environment variable: ${envVar}`);
          return false;
        }
      }

      // Validate configuration values
      if (this.cache.ROLE_CACHE_TTL <= 0) {
        logger.error('Invalid cache TTL configuration');
        return false;
      }

      if (this.session.MIN_DURATION_MINUTES >= this.session.MAX_DURATION_MINUTES) {
        logger.error('Invalid session duration configuration');
        return false;
      }

      logger.debug(`✅ Configuration validated for ${this.environment} environment`);
      return true;
    } catch (error) {
      logger.error('Configuration validation failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const config = AppConfig.getInstance();

// Export individual configurations for direct import if needed
export {
  CACHE_CONFIG,
  RATE_LIMIT_CONFIG,
  TIER_LIMITS,
  SESSION_CONFIG,
  API_CONFIG,
  FILE_CONFIG,
  VALIDATION_CONFIG,
  REALTIME_CONFIG,
  SECURITY_URLS,
  DEFAULTS,
  ENV_CONFIG,
  UI_CONFIG,
  FEATURE_FLAGS,
};

// Export API endpoint configurations
export {
  AUTH_ENDPOINTS,
  SESSION_ENDPOINTS,
  USER_ENDPOINTS,
  COACH_ENDPOINTS,
  NOTIFICATION_ENDPOINTS,
  NOTES_ENDPOINTS,
  REFLECTION_ENDPOINTS,
  ADMIN_ENDPOINTS,
  SYSTEM_ENDPOINTS,
  EXTERNAL_URLS,
  HTTP_STATUS,
  QUERY_PARAMS,
  CONTENT_TYPES,
  HTTP_METHODS,
};

// Re-export types
export type {
  CacheConfig,
  RateLimitConfig,
  SessionConfig,
  ApiConfig,
  FileConfig,
  ValidationConfig,
  RealtimeConfig,
  SecurityUrls,
  Defaults,
  UiConfig,
  FeatureFlags,
} from './constants';

// Re-export API endpoint types
export type {
  AuthEndpoints,
  SessionEndpoints,
  UserEndpoints,
  CoachEndpoints,
  NotificationEndpoints,
  NotesEndpoints,
  ReflectionEndpoints,
  AdminEndpoints,
  SystemEndpoints,
  ExternalUrls,
  HttpStatus,
  QueryParams,
  ContentTypes,
  HttpMethods,
} from './api-endpoints';