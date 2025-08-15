/**
 * Test environment configuration and setup
 * Manages environment variables and configuration for E2E tests
 */

export interface TestEnvironmentConfig {
  // Supabase Configuration
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  
  // Database Configuration
  databaseUrl: string;
  
  // Application Configuration
  appUrl: string;
  appEnv: string;
  
  // Test Configuration
  testTimeout: number;
  testRetries: number;
  testParallel: boolean;
  
  // CI/CD Configuration
  isCI: boolean;
  ciProvider?: string;
  
  // Feature Flags for Testing
  enableDebug: boolean;
  enableAnalytics: boolean;
  
  // Email Configuration (for testing notifications)
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFrom?: string;
}

/**
 * Default test environment configuration
 */
const defaultTestConfig: TestEnvironmentConfig = {
  // Default to local Supabase instance
  supabaseUrl: 'http://127.0.0.1:54321',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  supabaseServiceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  
  // Default to local database
  databaseUrl: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  
  // Application settings
  appUrl: 'http://localhost:3000',
  appEnv: 'test',
  
  // Test settings
  testTimeout: 60000, // 60 seconds
  testRetries: 1,
  testParallel: false,
  
  // CI detection
  isCI: !!process.env.CI,
  ciProvider: process.env.CI_PROVIDER || process.env.GITHUB_ACTIONS ? 'github' : undefined,
  
  // Feature flags
  enableDebug: false,
  enableAnalytics: false,
};

/**
 * Get test environment configuration
 */
export function getTestConfig(): TestEnvironmentConfig {
  return {
    // Supabase Configuration
    supabaseUrl: process.env.TEST_SUPABASE_URL || 
                 process.env.NEXT_PUBLIC_SUPABASE_URL || 
                 defaultTestConfig.supabaseUrl,
    
    supabaseAnonKey: process.env.TEST_SUPABASE_ANON_KEY || 
                     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                     defaultTestConfig.supabaseAnonKey,
    
    supabaseServiceRoleKey: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || 
                           process.env.SUPABASE_SERVICE_ROLE_KEY || 
                           defaultTestConfig.supabaseServiceRoleKey,
    
    // Database Configuration
    databaseUrl: process.env.TEST_DATABASE_URL || 
                process.env.DATABASE_URL || 
                defaultTestConfig.databaseUrl,
    
    // Application Configuration
    appUrl: process.env.TEST_APP_URL || 
           process.env.NEXT_PUBLIC_APP_URL || 
           defaultTestConfig.appUrl,
    
    appEnv: process.env.NODE_ENV === 'test' ? 'test' : defaultTestConfig.appEnv,
    
    // Test Configuration
    testTimeout: parseInt(process.env.TEST_TIMEOUT || '') || defaultTestConfig.testTimeout,
    testRetries: parseInt(process.env.TEST_RETRIES || '') || defaultTestConfig.testRetries,
    testParallel: process.env.TEST_PARALLEL === 'true',
    
    // CI Configuration
    isCI: defaultTestConfig.isCI,
    ciProvider: defaultTestConfig.ciProvider,
    
    // Feature Flags
    enableDebug: process.env.TEST_DEBUG === 'true' || process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
    enableAnalytics: process.env.TEST_ANALYTICS === 'true' || process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    
    // Email Configuration
    smtpHost: process.env.TEST_SMTP_HOST || process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.TEST_SMTP_PORT || process.env.SMTP_PORT || '587'),
    smtpUser: process.env.TEST_SMTP_USER || process.env.SMTP_USER,
    smtpPassword: process.env.TEST_SMTP_PASSWORD || process.env.SMTP_PASSWORD,
    smtpFrom: process.env.TEST_SMTP_FROM || process.env.SMTP_FROM,
  };
}

/**
 * Setup test environment variables
 */
export function setupTestEnvironment(): void {
  const config = getTestConfig();
  
  // Set environment variables for the test run
  // NODE_ENV is set by test runner, don't override
  // process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_APP_ENV = config.appEnv;
  process.env.NEXT_PUBLIC_SUPABASE_URL = config.supabaseUrl;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = config.supabaseAnonKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY = config.supabaseServiceRoleKey;
  process.env.DATABASE_URL = config.databaseUrl;
  process.env.NEXT_PUBLIC_APP_URL = config.appUrl;
  
  // Feature flags
  process.env.NEXT_PUBLIC_ENABLE_DEBUG = config.enableDebug.toString();
  process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = config.enableAnalytics.toString();
  
  // Test-specific headers
  process.env.TEST_MODE = 'true';
  process.env.PLAYWRIGHT_TEST = 'true';
  
  console.log('🔧 Test environment configured:');
  console.log(`  - App URL: ${config.appUrl}`);
  console.log(`  - Supabase URL: ${config.supabaseUrl}`);
  console.log(`  - Database URL: ${config.databaseUrl.split('@')[1] || 'local'}`);
  console.log(`  - CI Mode: ${config.isCI}`);
  console.log(`  - Debug Mode: ${config.enableDebug}`);
}

/**
 * Validate test environment configuration
 */
export function validateTestEnvironment(): { valid: boolean; errors: string[] } {
  const config = getTestConfig();
  const errors: string[] = [];
  
  // Required configurations
  if (!config.supabaseUrl) {
    errors.push('Supabase URL is required');
  }
  
  if (!config.supabaseAnonKey) {
    errors.push('Supabase anonymous key is required');
  }
  
  if (!config.supabaseServiceRoleKey) {
    errors.push('Supabase service role key is required');
  }
  
  if (!config.databaseUrl) {
    errors.push('Database URL is required');
  }
  
  if (!config.appUrl) {
    errors.push('Application URL is required');
  }
  
  // Validate URL formats
  try {
    new URL(config.supabaseUrl);
  } catch {
    errors.push('Invalid Supabase URL format');
  }
  
  try {
    new URL(config.appUrl);
  } catch {
    errors.push('Invalid application URL format');
  }
  
  // Validate numeric values
  if (config.testTimeout <= 0) {
    errors.push('Test timeout must be positive');
  }
  
  if (config.testRetries < 0) {
    errors.push('Test retries cannot be negative');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentSpecificConfig(): Partial<TestEnvironmentConfig> {
  const config = getTestConfig();
  
  if (config.isCI) {
    return {
      testRetries: 2,
      testParallel: false,
      testTimeout: 90000, // Extended timeout for CI
      enableDebug: false,
    };
  }
  
  return {
    testRetries: 1,
    testParallel: false,
    testTimeout: 60000,
    enableDebug: true,
  };
}

/**
 * Check if we're running in local development mode
 */
export function isLocalDevelopment(): boolean {
  return !getTestConfig().isCI && getTestConfig().appUrl.includes('localhost');
}

/**
 * Check if we're using local Supabase instance
 */
export function isLocalSupabase(): boolean {
  return getTestConfig().supabaseUrl.includes('127.0.0.1') || 
         getTestConfig().supabaseUrl.includes('localhost');
}

/**
 * Get test database connection info
 */
export function getTestDatabaseInfo(): { host: string; port: number; database: string } {
  const config = getTestConfig();
  const url = new URL(config.databaseUrl);
  
  return {
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1), // Remove leading slash
  };
}

/**
 * Create test-specific environment file
 */
export function createTestEnvFile(): string {
  const config = getTestConfig();
  
  return `# Generated test environment file
# Do not commit this file to version control

NODE_ENV=test
NEXT_PUBLIC_APP_ENV=test
NEXT_PUBLIC_SUPABASE_URL=${config.supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${config.supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${config.supabaseServiceRoleKey}
DATABASE_URL=${config.databaseUrl}
NEXT_PUBLIC_APP_URL=${config.appUrl}

# Feature flags
NEXT_PUBLIC_ENABLE_DEBUG=${config.enableDebug}
NEXT_PUBLIC_ENABLE_ANALYTICS=${config.enableAnalytics}

# Test mode indicators
TEST_MODE=true
PLAYWRIGHT_TEST=true

# Test configuration
TEST_TIMEOUT=${config.testTimeout}
TEST_RETRIES=${config.testRetries}
TEST_PARALLEL=${config.testParallel}

# Generated at: ${new Date().toISOString()}
`;
}