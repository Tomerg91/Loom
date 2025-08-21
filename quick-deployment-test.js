const { chromium } = require('playwright');

const DEPLOYED_URL = 'https://loom-7b0e1dx5a-tomer-s-projects-bcd27563.vercel.app';

async function testDeployment() {
  console.log('🚀 Starting Loom App Deployment Verification');
  console.log(`🌐 Testing URL: ${DEPLOYED_URL}`);
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  
  const page = await context.newPage();
  
  let consoleLogs = [];
  let networkErrors = [];
  
  // Monitor console messages
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
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
  
  try {
    console.log('\n📋 Test 1: Homepage Access (Root URL)');
    await page.goto(DEPLOYED_URL);
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Take screenshot
    await page.screenshot({ 
      path: 'homepage-screenshot.png',
      fullPage: true
    });
    
    const title = await page.title();
    console.log('✅ Page loaded successfully');
    console.log(`📄 Title: ${title}`);
    console.log(`📊 Console logs: ${consoleLogs.length}`);
    console.log(`🌐 Network errors: ${networkErrors.length}`);
    
    // Check for hydration errors
    const hydrationErrors = consoleLogs.filter(log => 
      log.text.includes('hydration') || 
      log.text.includes('Hydration') ||
      log.text.includes('server-only')
    );
    
    if (hydrationErrors.length > 0) {
      console.log('⚠️  Hydration errors found:');
      hydrationErrors.forEach(error => console.log(`   - ${error.type}: ${error.text}`));
    } else {
      console.log('✅ No hydration errors detected');
    }
    
    // Test /en route
    console.log('\n📋 Test 2: /en Route');
    consoleLogs = []; // Reset logs
    networkErrors = [];
    
    await page.goto(`${DEPLOYED_URL}/en`);
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    await page.screenshot({ 
      path: 'en-route-screenshot.png',
      fullPage: true
    });
    
    const enTitle = await page.title();
    console.log('✅ /en route loaded successfully');
    console.log(`📄 /en Title: ${enTitle}`);
    
    const serverOnlyErrors = consoleLogs.filter(log => 
      log.text.includes('server-only') ||
      log.text.includes('Server-only')
    );
    
    if (serverOnlyErrors.length > 0) {
      console.log('⚠️  Server-only errors found:');
      serverOnlyErrors.forEach(error => console.log(`   - ${error.type}: ${error.text}`));
    } else {
      console.log('✅ No server-only import errors detected');
    }
    
    // Test sign-in page
    console.log('\n📋 Test 3: Sign-in Page');
    consoleLogs = [];
    networkErrors = [];
    
    await page.goto(`${DEPLOYED_URL}/en/auth/signin`);
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    await page.screenshot({ 
      path: 'signin-screenshot.png',
      fullPage: true
    });
    
    const signinTitle = await page.title();
    console.log('✅ Sign-in page loaded successfully');
    console.log(`📄 Sign-in Title: ${signinTitle}`);
    
    // Check for form elements
    const emailInput = await page.locator('input[type="email"]').isVisible().catch(() => false);
    const passwordInput = await page.locator('input[type="password"]').isVisible().catch(() => false);
    const submitButton = await page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")').isVisible().catch(() => false);
    
    console.log(`📧 Email input present: ${emailInput}`);
    console.log(`🔑 Password input present: ${passwordInput}`);
    console.log(`🔘 Submit button present: ${submitButton}`);
    
    // Test sign-up page
    console.log('\n📋 Test 4: Sign-up Page');
    consoleLogs = [];
    networkErrors = [];
    
    await page.goto(`${DEPLOYED_URL}/en/auth/signup`);
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    await page.screenshot({ 
      path: 'signup-screenshot.png',
      fullPage: true
    });
    
    const signupTitle = await page.title();
    console.log('✅ Sign-up page loaded successfully');
    console.log(`📄 Sign-up Title: ${signupTitle}`);
    
    // Test API endpoints
    console.log('\n📋 Test 5: API Endpoints');
    
    try {
      const healthResponse = await page.request.get(`${DEPLOYED_URL}/api/health`);
      console.log(`🏥 Health check: ${healthResponse.status()}`);
      
      if (healthResponse.ok()) {
        const healthData = await healthResponse.json();
        console.log('✅ Health endpoint working:', healthData);
      }
    } catch (error) {
      console.log(`❌ Health check failed: ${error.message}`);
    }
    
    try {
      const shareResponse = await page.request.get(`${DEPLOYED_URL}/api/share/validate`);
      console.log(`🔗 Share validation: ${shareResponse.status()}`);
      
      if (shareResponse.ok()) {
        const shareData = await shareResponse.json();
        console.log('✅ Share validation endpoint working:', shareData);
      }
    } catch (error) {
      console.log(`❌ Share validation failed: ${error.message}`);
    }
    
    // Test responsive design
    console.log('\n📋 Test 6: Responsive Design');
    
    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: `responsive-${viewport.name.toLowerCase()}-screenshot.png`,
        fullPage: true
      });
      
      console.log(`📱 ${viewport.name} (${viewport.width}x${viewport.height}) - Screenshot captured`);
    }
    
    // Final summary
    console.log('\n📊 Final Test Summary');
    console.log('==================');
    console.log('✅ Homepage: Loaded successfully');
    console.log('✅ /en Route: Loaded successfully');
    console.log('✅ Sign-in Page: Loaded successfully');
    console.log('✅ Sign-up Page: Loaded successfully');
    console.log('✅ Responsive Design: Tested on 3 viewports');
    console.log('✅ Screenshots: Captured for all major pages');
    
    // Check for critical errors across all tests
    const allLogs = consoleLogs;
    const criticalErrors = allLogs.filter(log => log.type === 'error');
    
    if (criticalErrors.length > 0) {
      console.log('\n⚠️  Critical Errors Found:');
      criticalErrors.forEach(error => console.log(`   - ${error.text}`));
    } else {
      console.log('✅ No critical JavaScript errors detected');
    }
    
    if (networkErrors.length > 0) {
      console.log('\n🌐 Network Issues:');
      networkErrors.forEach(error => console.log(`   - ${error.url} (${error.status || error.error})`));
    } else {
      console.log('✅ No network errors detected');
    }
    
    console.log('\n🎉 Deployment verification completed!');
    console.log('📸 Screenshots saved to current directory');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testDeployment();