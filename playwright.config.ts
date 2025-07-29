import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/test/e2e',
  fullyParallel: false, // Set to false for better test isolation with database
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2, // Limited workers for database test safety
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  
  // Global setup and teardown
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  
  // Test timeout configurations
  timeout: 60000, // 60 seconds per test
  expect: { timeout: 10000 }, // 10 seconds for assertions
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Context options for better test reliability
    acceptDownloads: false,
    ignoreHTTPSErrors: true,
    colorScheme: 'light',
    
    // Custom test data
    extraHTTPHeaders: {
      'X-Test-Mode': 'true',
    },
  },
  
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Custom storage state for test isolation
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: { cookies: [], origins: [] },
      },
    },
    
    // Mobile browsers (optional - can be disabled for faster CI)
    ...(process.env.CI ? [] : [
      {
        name: 'Mobile Chrome',
        use: { 
          ...devices['Pixel 5'],
          storageState: { cookies: [], origins: [] },
        },
      },
      {
        name: 'Mobile Safari',
        use: { 
          ...devices['iPhone 12'],
          storageState: { cookies: [], origins: [] },
        },
      },
    ]),
  ],
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start
    env: {
      // Test-specific environment variables
      NODE_ENV: 'test',
      NEXT_PUBLIC_APP_ENV: 'test',
      // Override with test database if available
      ...(process.env.TEST_DATABASE_URL ? {
        DATABASE_URL: process.env.TEST_DATABASE_URL,
        NEXT_PUBLIC_SUPABASE_URL: process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.TEST_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      } : {}),
    },
  },
  
  // Output directories
  outputDir: 'test-results/',
  
  // Metadata
  metadata: {
    'test-type': 'e2e',
    'app-version': process.env.npm_package_version || 'unknown',
  },
});