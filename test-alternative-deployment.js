const { chromium } = require('playwright');

async function testMultipleDeployments() {
  console.log('🔍 Testing Multiple Vercel Deployments');
  
  const deploymentUrls = [
    'https://loom-7b0e1dx5a-tomer-s-projects-bcd27563.vercel.app',
    'https://loom-nmnowoevi-tomer-s-projects-bcd27563.vercel.app',
    'https://loom-dz0as9hdo-tomer-s-projects-bcd27563.vercel.app',
    'https://loom-jg6n53zae-tomer-s-projects-bcd27563.vercel.app'
  ];
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  
  for (let i = 0; i < deploymentUrls.length; i++) {
    const url = deploymentUrls[i];
    console.log(`\n📋 Testing deployment ${i + 1}: ${url}`);
    
    const page = await context.newPage();
    
    let consoleLogs = [];
    page.on('console', (msg) => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
    });
    
    try {
      // Test with longer timeout
      await page.goto(url, { timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      const title = await page.title();
      console.log(`📄 Title: ${title}`);
      
      // Take screenshot
      await page.screenshot({ 
        path: `deployment-${i + 1}-screenshot.png`,
        fullPage: true
      });
      
      // Check if this is the Vercel login page
      const isVercelLogin = title.includes('Login') && title.includes('Vercel');
      const bodyText = await page.textContent('body').catch(() => '');
      const hasLoomContent = bodyText.includes('loom') || bodyText.includes('Loom') || bodyText.includes('coach') || bodyText.includes('session');
      
      console.log(`🔐 Is Vercel Login: ${isVercelLogin}`);
      console.log(`🎯 Has Loom Content: ${hasLoomContent}`);
      console.log(`📊 Console logs: ${consoleLogs.length}`);
      
      if (!isVercelLogin && hasLoomContent) {
        console.log('✅ This deployment appears to be working!');
        
        // Test a few routes
        const routes = ['/en', '/en/auth/signin'];
        for (const route of routes) {
          try {
            await page.goto(`${url}${route}`);
            await page.waitForLoadState('networkidle', { timeout: 15000 });
            const routeTitle = await page.title();
            console.log(`  📄 ${route} title: ${routeTitle}`);
          } catch (error) {
            console.log(`  ❌ ${route} failed: ${error.message}`);
          }
        }
        
        break; // Found working deployment
      } else {
        console.log('❌ This deployment is not working properly');
      }
      
    } catch (error) {
      console.log(`❌ Failed to test: ${error.message}`);
    }
    
    await page.close();
  }
  
  await browser.close();
}

testMultipleDeployments();