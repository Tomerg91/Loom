#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Running performance audit...\n');

// Configuration
const PAGES_TO_AUDIT = ['/', '/dashboard', '/sessions', '/auth/signin'];

const LIGHTHOUSE_CONFIG = {
  performance: 90,
  accessibility: 95,
  'best-practices': 90,
  seo: 90,
};

// Check if required tools are available
function checkTools() {
  const tools = ['lighthouse', 'next'];
  const missing = [];

  for (const tool of tools) {
    try {
      execSync(`which ${tool}`, { stdio: 'ignore' });
    } catch {
      missing.push(tool);
    }
  }

  if (missing.length > 0) {
    console.log('❌ Missing required tools:');
    missing.forEach(tool => console.log(`   - ${tool}`));
    console.log('\nInstall missing tools:');
    console.log('npm: npm install -g lighthouse');
    process.exit(1);
  }
}

// Start Next.js development server
function startDevServer() {
  console.log('🔧 Starting development server...');

  const serverProcess = execSync('npm run dev &', {
    stdio: 'ignore',
    detached: true,
  });

  // Wait for server to start
  console.log('⏳ Waiting for server to start...');

  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    try {
      execSync('curl -f http://localhost:3000 > /dev/null 2>&1');
      console.log('✅ Development server is ready');
      return true;
    } catch {
      attempts++;
      execSync('sleep 2');
    }
  }

  console.log('❌ Failed to start development server');
  return false;
}

// Run Lighthouse audit
function runLighthouseAudit(url, outputPath) {
  const command = `lighthouse ${url} \
    --output=json \
    --output-path="${outputPath}" \
    --chrome-flags="--headless --no-sandbox" \
    --quiet`;

  try {
    execSync(command, { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.log(`❌ Lighthouse audit failed for ${url}: ${error.message}`);
    return false;
  }
}

// Parse Lighthouse results
function parseLighthouseResults(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    return {
      url: data.finalUrl,
      performance: Math.round(data.categories.performance.score * 100),
      accessibility: Math.round(data.categories.accessibility.score * 100),
      bestPractices: Math.round(data.categories['best-practices'].score * 100),
      seo: Math.round(data.categories.seo.score * 100),
      metrics: {
        fcp: Math.round(data.audits['first-contentful-paint'].numericValue),
        lcp: Math.round(data.audits['largest-contentful-paint'].numericValue),
        cls: parseFloat(
          data.audits['cumulative-layout-shift'].numericValue.toFixed(3)
        ),
        fid: data.audits['max-potential-fid']
          ? Math.round(data.audits['max-potential-fid'].numericValue)
          : 0,
        ttfb: Math.round(data.audits['server-response-time'].numericValue),
      },
      opportunities: data.audits['unused-javascript']
        ? {
            unusedJavaScript: Math.round(
              data.audits['unused-javascript'].numericValue / 1024
            ),
            unusedCSS: data.audits['unused-css-rules']
              ? Math.round(data.audits['unused-css-rules'].numericValue / 1024)
              : 0,
            imageOptimization: data.audits['uses-optimized-images']
              ? Math.round(
                  data.audits['uses-optimized-images'].numericValue / 1024
                )
              : 0,
          }
        : {},
    };
  } catch (error) {
    console.log(`❌ Failed to parse Lighthouse results: ${error.message}`);
    return null;
  }
}

// Generate performance report
function generateReport(results) {
  console.log('\n📊 Performance Audit Results:\n');

  const allResults = [];
  let totalScore = 0;

  for (const result of results) {
    if (!result) continue;

    allResults.push(result);
    const avgScore =
      (result.performance +
        result.accessibility +
        result.bestPractices +
        result.seo) /
      4;
    totalScore += avgScore;

    console.log(`🔍 ${result.url}`);
    console.log(
      `   Performance: ${getScoreEmoji(result.performance)} ${result.performance}/100`
    );
    console.log(
      `   Accessibility: ${getScoreEmoji(result.accessibility)} ${result.accessibility}/100`
    );
    console.log(
      `   Best Practices: ${getScoreEmoji(result.bestPractices)} ${result.bestPractices}/100`
    );
    console.log(`   SEO: ${getScoreEmoji(result.seo)} ${result.seo}/100`);

    console.log('   Core Web Vitals:');
    console.log(
      `     FCP: ${result.metrics.fcp}ms ${result.metrics.fcp <= 1800 ? '✅' : '⚠️'}`
    );
    console.log(
      `     LCP: ${result.metrics.lcp}ms ${result.metrics.lcp <= 2500 ? '✅' : '⚠️'}`
    );
    console.log(
      `     CLS: ${result.metrics.cls} ${result.metrics.cls <= 0.1 ? '✅' : '⚠️'}`
    );
    console.log(
      `     TTFB: ${result.metrics.ttfb}ms ${result.metrics.ttfb <= 800 ? '✅' : '⚠️'}`
    );

    if (result.opportunities.unusedJavaScript > 0) {
      console.log(
        `   💡 Unused JavaScript: ${result.opportunities.unusedJavaScript}KB`
      );
    }
    if (result.opportunities.unusedCSS > 0) {
      console.log(`   💡 Unused CSS: ${result.opportunities.unusedCSS}KB`);
    }
    if (result.opportunities.imageOptimization > 0) {
      console.log(
        `   💡 Image optimization potential: ${result.opportunities.imageOptimization}KB`
      );
    }

    console.log('');
  }

  // Overall summary
  if (allResults.length > 0) {
    const overallScore = Math.round(totalScore / allResults.length);
    console.log(
      `🎯 Overall Performance Score: ${getScoreEmoji(overallScore)} ${overallScore}/100\n`
    );

    // Recommendations
    console.log('💡 Performance Recommendations:');

    const avgPerformance = Math.round(
      allResults.reduce((sum, r) => sum + r.performance, 0) / allResults.length
    );
    if (avgPerformance < LIGHTHOUSE_CONFIG.performance) {
      console.log('   🚀 Improve performance:');
      console.log('     - Enable code splitting and lazy loading');
      console.log('     - Optimize images and use next/image');
      console.log('     - Minimize and compress JavaScript/CSS');
      console.log('     - Use CDN for static assets');
    }

    const avgAccessibility = Math.round(
      allResults.reduce((sum, r) => sum + r.accessibility, 0) /
        allResults.length
    );
    if (avgAccessibility < LIGHTHOUSE_CONFIG.accessibility) {
      console.log('   ♿ Improve accessibility:');
      console.log('     - Add alt text to images');
      console.log('     - Ensure proper heading hierarchy');
      console.log('     - Improve color contrast');
      console.log('     - Add ARIA labels where needed');
    }

    // Check for failing Core Web Vitals
    const badLCP = allResults.some(r => r.metrics.lcp > 2500);
    const badCLS = allResults.some(r => r.metrics.cls > 0.1);
    const badFCP = allResults.some(r => r.metrics.fcp > 1800);

    if (badLCP || badCLS || badFCP) {
      console.log('   ⚡ Core Web Vitals issues detected:');
      if (badLCP) console.log('     - Optimize Largest Contentful Paint (LCP)');
      if (badCLS) console.log('     - Reduce Cumulative Layout Shift (CLS)');
      if (badFCP) console.log('     - Improve First Contentful Paint (FCP)');
    }
  }
}

function getScoreEmoji(score) {
  if (score >= 90) return '🟢';
  if (score >= 70) return '🟡';
  return '🔴';
}

// Cleanup function
function cleanup() {
  try {
    // Kill development server
    execSync('pkill -f "next dev" || true', { stdio: 'ignore' });

    // Clean up lighthouse files
    const files = fs
      .readdirSync('.')
      .filter(file => file.startsWith('lighthouse-') && file.endsWith('.json'));
    files.forEach(file => fs.unlinkSync(file));
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Main audit process
async function main() {
  checkTools();

  // Setup cleanup on exit
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  if (!startDevServer()) {
    process.exit(1);
  }

  const results = [];
  console.log(`\n🔍 Auditing ${PAGES_TO_AUDIT.length} pages...\n`);

  for (const page of PAGES_TO_AUDIT) {
    const url = `http://localhost:3000${page}`;
    const outputFile = `lighthouse-${page.replace(/\//g, '-') || 'home'}.json`;

    console.log(`📄 Auditing: ${page}`);

    if (runLighthouseAudit(url, outputFile)) {
      const result = parseLighthouseResults(outputFile);
      results.push(result);
      console.log('   ✅ Complete\n');
    } else {
      results.push(null);
      console.log('   ❌ Failed\n');
    }
  }

  generateReport(results);
  cleanup();
}

// Run the audit
main().catch(error => {
  console.error('❌ Performance audit failed:', error);
  cleanup();
  process.exit(1);
});
