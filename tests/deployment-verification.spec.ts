import { test, expect, Page } from '@playwright/test';

const DEPLOYED_URL = 'https://loom-7b0e1dx5a-tomer-s-projects-bcd27563.vercel.app';

// Test configuration for the deployed app
test.describe('Loom App Deployment Verification', () => {
  let consoleLogs: Array<{ type: string; text: string }> = [];
  let networkErrors: Array<{ url: string; status?: number; error?: string }> = [];

  test.beforeEach(async ({ page }) => {
    // Clear logs for each test
    consoleLogs = [];
    networkErrors = [];

    // Monitor console messages
    page.on('console', (msg) => {
      consoleLogs.push({ 
        type: msg.type(), 
        text: msg.text() 
      });
    });

    // Monitor network failures
    page.on('requestfailed', (request) => {
      networkErrors.push({
        url: request.url(),
        error: request.failure()?.errorText
      });
    });

    // Monitor responses for HTTP errors
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
  });

  test('Homepage Access - Root URL', async ({ page }) => {
    console.log('🔍 Testing homepage access...');
    
    // Navigate to root URL
    await page.goto(DEPLOYED_URL);
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/homepage-root.png',
      fullPage: true
    });

    // Check page title and basic structure
    const title = await page.title();
    console.log('📄 Page title:', title);
    expect(title).toBeTruthy();

    // Check for hydration errors
    const hydrationErrors = consoleLogs.filter(log => 
      log.text.includes('hydration') || 
      log.text.includes('Hydration') ||
      log.text.includes('server-only')
    );
    
    console.log('🧪 Console logs:', consoleLogs.length);
    console.log('🚨 Network errors:', networkErrors.length);
    console.log('💧 Hydration errors:', hydrationErrors.length);
    
    if (hydrationErrors.length > 0) {
      console.log('⚠️  Hydration errors found:', hydrationErrors);
    }

    expect(hydrationErrors.length).toBe(0);
    
    // Verify page loads without critical console errors
    const criticalErrors = consoleLogs.filter(log => log.type === 'error');
    if (criticalErrors.length > 0) {
      console.log('🔥 Critical errors:', criticalErrors);
    }
    
    // Page should be accessible
    await expect(page.locator('body')).toBeVisible();
  });

  test('Homepage Access - /en Route', async ({ page }) => {
    console.log('🔍 Testing /en route...');
    
    await page.goto(`${DEPLOYED_URL}/en`);
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'test-results/homepage-en.png',
      fullPage: true
    });

    const title = await page.title();
    console.log('📄 /en page title:', title);
    expect(title).toBeTruthy();

    // Check for server-only import errors (previously fixed issue)
    const serverOnlyErrors = consoleLogs.filter(log => 
      log.text.includes('server-only') ||
      log.text.includes('Server-only')
    );

    console.log('🖥️  Server-only errors:', serverOnlyErrors.length);
    if (serverOnlyErrors.length > 0) {
      console.log('⚠️  Server-only errors found:', serverOnlyErrors);
    }
    
    expect(serverOnlyErrors.length).toBe(0);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Authentication Pages - Sign In', async ({ page }) => {
    console.log('🔍 Testing sign-in page...');
    
    await page.goto(`${DEPLOYED_URL}/en/auth/signin`);
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'test-results/signin-page.png',
      fullPage: true
    });

    // Check if page loads without errors
    const title = await page.title();
    console.log('📄 Sign-in page title:', title);
    
    // Look for sign-in form elements
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")');

    console.log('📧 Email input present:', await emailInput.isVisible().catch(() => false));
    console.log('🔑 Password input present:', await passwordInput.isVisible().catch(() => false));
    console.log('🔘 Submit button present:', await submitButton.isVisible().catch(() => false));

    // Check for authentication-related errors
    const authErrors = consoleLogs.filter(log => 
      log.type === 'error' && (
        log.text.includes('auth') || 
        log.text.includes('supabase') ||
        log.text.includes('Authentication')
      )
    );

    console.log('🔐 Auth errors:', authErrors.length);
    if (authErrors.length > 0) {
      console.log('⚠️  Auth errors found:', authErrors);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('Authentication Pages - Sign Up', async ({ page }) => {
    console.log('🔍 Testing sign-up page...');
    
    await page.goto(`${DEPLOYED_URL}/en/auth/signup`);
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: 'test-results/signup-page.png',
      fullPage: true
    });

    const title = await page.title();
    console.log('📄 Sign-up page title:', title);

    // Look for sign-up form elements
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Register"), button:has-text("Create")');

    console.log('📧 Email input present:', await emailInput.isVisible().catch(() => false));
    console.log('🔑 Password input present:', await passwordInput.isVisible().catch(() => false));
    console.log('🔘 Submit button present:', await submitButton.isVisible().catch(() => false));

    await expect(page.locator('body')).toBeVisible();
  });

  test('API Health Check', async ({ page }) => {
    console.log('🔍 Testing API health check...');
    
    const healthResponse = await page.request.get(`${DEPLOYED_URL}/api/health`);
    console.log('🏥 Health check status:', healthResponse.status());
    
    if (healthResponse.ok()) {
      const healthData = await healthResponse.json();
      console.log('✅ Health check data:', healthData);
    } else {
      console.log('❌ Health check failed');
    }
  });

  test('Share Validation API Endpoint', async ({ page }) => {
    console.log('🔍 Testing share validation endpoint...');
    
    // Test the newly created share validation endpoint
    const shareResponse = await page.request.get(`${DEPLOYED_URL}/api/share/validate`);
    console.log('🔗 Share validation status:', shareResponse.status());
    
    if (shareResponse.ok()) {
      const shareData = await shareResponse.json();
      console.log('✅ Share validation data:', shareData);
    } else {
      console.log('❌ Share validation failed');
    }
  });

  test('Environment Variables Check', async ({ page }) => {
    console.log('🔍 Testing environment variables loading...');
    
    await page.goto(`${DEPLOYED_URL}/en`);
    await page.waitForLoadState('networkidle');

    // Check if environment variables are accessible on client side
    const envCheck = await page.evaluate(() => {
      const publicVars = {
        supabaseUrl: (window as any).NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
        appEnv: (window as any).NEXT_PUBLIC_APP_ENV || process.env.NEXT_PUBLIC_APP_ENV,
        // Add other public env vars that should be available
      };
      
      return {
        hasSupabaseUrl: !!publicVars.supabaseUrl,
        hasAppEnv: !!publicVars.appEnv,
        publicVars
      };
    });

    console.log('🌍 Environment check:', envCheck);

    // Check for environment-related errors
    const envErrors = consoleLogs.filter(log => 
      log.text.includes('environment') || 
      log.text.includes('NEXT_PUBLIC') ||
      log.text.includes('undefined')
    );

    console.log('🔧 Environment errors:', envErrors.length);
    if (envErrors.length > 0) {
      console.log('⚠️  Environment errors found:', envErrors);
    }
  });

  test('Navigation and Hydration Check', async ({ page }) => {
    console.log('🔍 Testing navigation without hydration errors...');
    
    await page.goto(`${DEPLOYED_URL}/en`);
    await page.waitForLoadState('networkidle');
    
    // Try to navigate to different routes if they exist
    const routes = ['/en/auth/signin', '/en/auth/signup'];
    
    for (const route of routes) {
      try {
        console.log(`🧭 Navigating to: ${route}`);
        await page.goto(`${DEPLOYED_URL}${route}`);
        await page.waitForLoadState('networkidle');
        
        // Check for hydration errors after navigation
        const routeHydrationErrors = consoleLogs.filter(log => 
          log.text.includes('hydration') || 
          log.text.includes('Hydration')
        );
        
        if (routeHydrationErrors.length > 0) {
          console.log(`⚠️  Hydration errors on ${route}:`, routeHydrationErrors);
        }
        
        await page.screenshot({ 
          path: `test-results/navigation-${route.replace(/\//g, '-')}.png`,
          fullPage: true
        });
        
      } catch (error) {
        console.log(`❌ Error navigating to ${route}:`, error);
      }
    }
  });

  test('Responsive Design Check', async ({ page }) => {
    console.log('🔍 Testing responsive design...');
    
    await page.goto(`${DEPLOYED_URL}/en`);
    await page.waitForLoadState('networkidle');
    
    // Test different viewport sizes
    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];
    
    for (const viewport of viewports) {
      console.log(`📱 Testing ${viewport.name} viewport (${viewport.width}x${viewport.height})`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000); // Wait for responsive changes
      
      await page.screenshot({ 
        path: `test-results/responsive-${viewport.name.toLowerCase()}.png`,
        fullPage: true
      });
      
      // Check if page is still visible and functional
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Performance and Loading Check', async ({ page }) => {
    console.log('🔍 Testing performance and loading...');
    
    // Start performance monitoring
    const startTime = Date.now();
    
    await page.goto(`${DEPLOYED_URL}/en`);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log('⚡ Page load time:', loadTime + 'ms');
    
    // Check for performance-related console warnings
    const performanceWarnings = consoleLogs.filter(log => 
      log.text.includes('performance') ||
      log.text.includes('slow') ||
      log.text.includes('bundle') ||
      log.text.includes('optimization')
    );
    
    console.log('🚀 Performance warnings:', performanceWarnings.length);
    if (performanceWarnings.length > 0) {
      console.log('⚠️  Performance warnings found:', performanceWarnings);
    }
    
    // Check for large bundles or loading issues
    expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Log final test results
    console.log(`\n📊 Test Results for: ${testInfo.title}`);
    console.log(`Status: ${testInfo.status}`);
    console.log(`Duration: ${testInfo.duration}ms`);
    console.log(`Console logs: ${consoleLogs.length}`);
    console.log(`Network errors: ${networkErrors.length}`);
    
    if (consoleLogs.length > 0) {
      console.log('\n📋 Console Logs:');
      consoleLogs.forEach(log => {
        console.log(`  ${log.type}: ${log.text}`);
      });
    }
    
    if (networkErrors.length > 0) {
      console.log('\n🌐 Network Errors:');
      networkErrors.forEach(error => {
        console.log(`  ${error.url} - Status: ${error.status || 'N/A'} - Error: ${error.error || 'N/A'}`);
      });
    }
  });
});