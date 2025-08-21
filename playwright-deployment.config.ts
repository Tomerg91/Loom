import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/deployment-verification.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 2, // Retry failed tests for reliability
  workers: 3, // Run tests in parallel
  reporter: [
    ['html', { outputFolder: 'deployment-test-report' }],
    ['junit', { outputFile: 'test-results/deployment-junit.xml' }],
    ['list'],
  ],
  
  // Extended timeout for deployment testing
  timeout: 120000, // 2 minutes per test
  expect: { timeout: 30000 }, // 30 seconds for assertions
  
  use: {
    // Test against the deployed URL instead of localhost
    baseURL: 'https://loom-7b0e1dx5a-tomer-s-projects-bcd27563.vercel.app',
    
    // Enhanced debugging and monitoring
    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Context options for deployment testing
    acceptDownloads: false,
    ignoreHTTPSErrors: false, // Don't ignore HTTPS errors in production
    colorScheme: 'light',
    
    // Custom headers for testing
    extraHTTPHeaders: {
      'X-Test-Mode': 'deployment-verification',
    },
    
    // Longer timeouts for network requests
    navigationTimeout: 60000,
    actionTimeout: 30000,
  },
  
  projects: [
    // Primary testing with Chrome
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    // Mobile testing
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
      },
    },
    
    // Additional browsers for cross-browser verification
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
  
  // Output directories
  outputDir: 'deployment-test-results/',
  
  // Metadata for reporting
  metadata: {
    'test-type': 'deployment-verification',
    'target-url': 'https://loom-7b0e1dx5a-tomer-s-projects-bcd27563.vercel.app',
    'test-date': new Date().toISOString(),
  },
});