#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing bundle size...\n');

// Set environment variable for bundle analysis
process.env.ANALYZE = 'true';

try {
  // Run the build with bundle analyzer
  console.log('Building application with bundle analyzer...');
  execSync('npm run build', { stdio: 'inherit' });

  // Check if analysis files were generated
  const clientReportPath = path.join(process.cwd(), 'analyze', 'client.html');
  const serverReportPath = path.join(process.cwd(), 'analyze', 'server.html');

  console.log('\n✅ Bundle analysis complete!\n');

  if (fs.existsSync(clientReportPath)) {
    console.log(`📊 Client bundle report: file://${clientReportPath}`);
  }

  if (fs.existsSync(serverReportPath)) {
    console.log(`📊 Server bundle report: file://${serverReportPath}`);
  }

  // Read and display basic bundle info
  const buildDir = path.join(process.cwd(), '.next');
  const staticDir = path.join(buildDir, 'static');

  if (fs.existsSync(staticDir)) {
    console.log('\n📦 Bundle Information:');
    displayBundleInfo(staticDir);
  }

  console.log('\n💡 Tips to optimize bundle size:');
  console.log('- Use dynamic imports for large components');
  console.log('- Remove unused dependencies');
  console.log('- Optimize images and use Next.js Image component');
  console.log('- Enable compression in production');
  console.log('- Use tree shaking for libraries');
} catch (error) {
  console.error('❌ Bundle analysis failed:', error.message);
  process.exit(1);
}

function displayBundleInfo(staticDir) {
  try {
    const chunks = path.join(staticDir, 'chunks');
    const css = path.join(staticDir, 'css');

    let totalSize = 0;
    let jsSize = 0;
    let cssSize = 0;

    // Analyze JS chunks
    if (fs.existsSync(chunks)) {
      const chunkFiles = fs
        .readdirSync(chunks)
        .filter(file => file.endsWith('.js'));

      console.log('\n🔧 JavaScript Chunks:');
      chunkFiles.forEach(file => {
        const filePath = path.join(chunks, file);
        const stats = fs.statSync(filePath);
        const sizeKB = Math.round(stats.size / 1024);
        jsSize += stats.size;
        totalSize += stats.size;

        let category = '📦';
        if (file.includes('framework')) category = '⚛️';
        else if (file.includes('main')) category = '🏠';
        else if (file.includes('webpack')) category = '🔧';
        else if (file.includes('polyfills')) category = '🔌';

        console.log(`  ${category} ${file}: ${sizeKB} KB`);
      });
    }

    // Analyze CSS files
    if (fs.existsSync(css)) {
      const cssFiles = fs
        .readdirSync(css)
        .filter(file => file.endsWith('.css'));

      if (cssFiles.length > 0) {
        console.log('\n🎨 CSS Files:');
        cssFiles.forEach(file => {
          const filePath = path.join(css, file);
          const stats = fs.statSync(filePath);
          const sizeKB = Math.round(stats.size / 1024);
          cssSize += stats.size;
          totalSize += stats.size;

          console.log(`  🎨 ${file}: ${sizeKB} KB`);
        });
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`  Total Size: ${Math.round(totalSize / 1024)} KB`);
    console.log(`  JavaScript: ${Math.round(jsSize / 1024)} KB`);
    console.log(`  CSS: ${Math.round(cssSize / 1024)} KB`);

    // Warnings
    if (jsSize > 250000) {
      // 250KB
      console.log('\n⚠️  JavaScript bundle is large (>250KB)');
    }
    if (cssSize > 50000) {
      // 50KB
      console.log('⚠️  CSS bundle is large (>50KB)');
    }
    if (totalSize > 500000) {
      // 500KB
      console.log('⚠️  Total bundle size is large (>500KB)');
    }
  } catch (error) {
    console.log('Could not analyze bundle details:', error.message);
  }
}
