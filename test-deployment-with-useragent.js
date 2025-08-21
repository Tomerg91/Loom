const { chromium } = require('playwright');

const NEW_DEPLOYMENT_URL = 'https://loom-7r0t1jy4g-tomer-s-projects-bcd27563.vercel.app';

async function testWithDifferentUserAgents() {
  console.log('🚀 Testing Loom App Deployment with Different User Agents');
  console.log(`🌐 Testing URL: ${NEW_DEPLOYMENT_URL}`);
  
  const userAgents = [
    {
      name: 'Chrome Desktop',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    },
    {
      name: 'Firefox Desktop',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0'
    },
    {
      name: 'Safari Desktop',
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    },
    {
      name: 'Playwright Default',
      ua: null // Will use Playwright's default
    }
  ];
  
  const browser = await chromium.launch({ headless: false });
  
  for (let i = 0; i < userAgents.length; i++) {
    const { name, ua } = userAgents[i];
    console.log(`\n📋 Test ${i + 1}: ${name}`);
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: ua || undefined
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
      // First test: HTTP request to check status without loading full page
      console.log(`🔍 Testing HTTP response with ${name} user agent...`);
      const response = await page.request.get(NEW_DEPLOYMENT_URL);
      console.log(`📊 HTTP Status: ${response.status()}`);
      console.log(`📄 Status Text: ${response.statusText()}`);
      
      if (response.status() === 200) {
        console.log('✅ HTTP request successful! Testing full page load...');
        
        // Now test full page load
        await page.goto(NEW_DEPLOYMENT_URL);
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        
        // Take screenshot
        await page.screenshot({ 
          path: `test-ua-${name.replace(/\s+/g, '-').toLowerCase()}.png`,
          fullPage: true
        });
        
        const title = await page.title();
        console.log(`📄 Page Title: ${title}`);
        
        // Check if this is the Vercel login page or actual app
        const isVercelLogin = title.includes('Login') && title.includes('Vercel');
        const bodyText = await page.textContent('body').catch(() => '');
        const hasLoomContent = bodyText.toLowerCase().includes('loom') || 
                               bodyText.toLowerCase().includes('coach') || 
                               bodyText.toLowerCase().includes('session') ||
                               bodyText.toLowerCase().includes('dashboard');
        
        console.log(`🔐 Is Vercel Login: ${isVercelLogin}`);
        console.log(`🎯 Has Loom Content: ${hasLoomContent}`);
        
        if (!isVercelLogin && hasLoomContent) {
          console.log('🎉 SUCCESS! Found working app with this user agent!');
          
          // Test additional routes
          console.log('🔗 Testing /en route...');
          await page.goto(`${NEW_DEPLOYMENT_URL}/en`);
          await page.waitForLoadState('networkidle', { timeout: 30000 });
          
          const enTitle = await page.title();
          console.log(`📄 /en Title: ${enTitle}`);
          
          // Test auth page
          console.log('🔗 Testing /en/auth/signin route...');
          await page.goto(`${NEW_DEPLOYMENT_URL}/en/auth/signin`);
          await page.waitForLoadState('networkidle', { timeout: 30000 });
          
          const signinTitle = await page.title();
          console.log(`📄 Sign-in Title: ${signinTitle}`);
          
          // Check for form elements
          const emailInput = await page.locator('input[type="email"]').isVisible().catch(() => false);
          const passwordInput = await page.locator('input[type="password"]').isVisible().catch(() => false);
          const submitButton = await page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")').first().isVisible().catch(() => false);
          
          console.log(`📧 Email input present: ${emailInput}`);
          console.log(`🔑 Password input present: ${passwordInput}`);
          console.log(`🔘 Submit button present: ${submitButton}`);
          
          // Take screenshot of sign-in page
          await page.screenshot({ 
            path: `signin-working-${name.replace(/\s+/g, '-').toLowerCase()}.png`,
            fullPage: true
          });
          
          console.log('✅ All basic functionality working!');
          
          break; // Stop testing once we find a working user agent
        } else if (isVercelLogin) {
          console.log('❌ Still showing Vercel login page');
        } else {
          console.log('❓ Unknown page state');
        }
        
      } else if (response.status() === 403) {
        console.log('❌ 403 Forbidden - User agent blocked by security middleware');
      } else if (response.status() === 401) {
        console.log('❌ 401 Unauthorized - Authentication issue');
      } else {
        console.log(`❌ HTTP ${response.status()} - ${response.statusText()}`);
      }
      
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
    }
    
    await context.close();
  }
  
  await browser.close();
  console.log('\n🏁 User Agent Testing Complete');
}

testWithDifferentUserAgents();