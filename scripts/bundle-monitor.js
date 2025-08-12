#!/usr/bin/env node

/**
 * Bundle Size Monitoring Script
 * Tracks bundle size changes and provides alerts for regressions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUNDLE_HISTORY_FILE = path.join(process.cwd(), '.bundle-history.json');
const SIZE_THRESHOLD_KB = 50; // Alert if bundle grows by more than 50KB
const SIZE_THRESHOLD_PERCENT = 10; // Alert if bundle grows by more than 10%

// Colors for output
const colors = {
  green: '\033[0;32m',
  yellow: '\033[1;33m',
  red: '\033[0;31m',
  blue: '\033[0;34m',
  cyan: '\033[0;36m',
  reset: '\033[0m',
  bold: '\033[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getBundleHistory() {
  if (!fs.existsSync(BUNDLE_HISTORY_FILE)) {
    return { entries: [] };
  }
  
  try {
    return JSON.parse(fs.readFileSync(BUNDLE_HISTORY_FILE, 'utf8'));
  } catch (error) {
    log(`Warning: Could not read bundle history: ${error.message}`, 'yellow');
    return { entries: [] };
  }
}

function saveBundleHistory(history) {
  try {
    fs.writeFileSync(BUNDLE_HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (error) {
    log(`Warning: Could not save bundle history: ${error.message}`, 'yellow');
  }
}

function analyzeBundleSize() {
  log('📦 Analyzing bundle size...', 'blue');
  
  try {
    // Build the application
    execSync('npm run build', { stdio: 'pipe' });
    
    const buildDir = path.join(process.cwd(), '.next');
    const staticDir = path.join(buildDir, 'static');
    
    if (!fs.existsSync(staticDir)) {
      throw new Error('Build output not found');
    }
    
    let totalSize = 0;
    let jsSize = 0;
    let cssSize = 0;
    const chunks = [];
    
    // Analyze JS chunks
    const chunksDir = path.join(staticDir, 'chunks');
    if (fs.existsSync(chunksDir)) {
      const chunkFiles = fs.readdirSync(chunksDir)
        .filter(file => file.endsWith('.js'));
      
      chunkFiles.forEach(file => {
        const filePath = path.join(chunksDir, file);
        const stats = fs.statSync(filePath);
        const sizeKB = Math.round(stats.size / 1024);
        
        jsSize += stats.size;
        chunks.push({
          name: file,
          size: sizeKB,
          type: 'js',
        });
      });
    }
    
    // Analyze CSS files
    const cssDir = path.join(staticDir, 'css');
    if (fs.existsSync(cssDir)) {
      const cssFiles = fs.readdirSync(cssDir)
        .filter(file => file.endsWith('.css'));
      
      cssFiles.forEach(file => {
        const filePath = path.join(cssDir, file);
        const stats = fs.statSync(filePath);
        const sizeKB = Math.round(stats.size / 1024);
        
        cssSize += stats.size;
        chunks.push({
          name: file,
          size: sizeKB,
          type: 'css',
        });
      });
    }
    
    totalSize = jsSize + cssSize;
    
    return {
      totalSize: Math.round(totalSize / 1024),
      jsSize: Math.round(jsSize / 1024),
      cssSize: Math.round(cssSize / 1024),
      chunks: chunks.sort((a, b) => b.size - a.size),
      timestamp: new Date().toISOString(),
    };
    
  } catch (error) {
    throw new Error(`Bundle analysis failed: ${error.message}`);
  }
}

function compareWithHistory(currentSize, history) {
  if (history.entries.length === 0) {
    log('🎉 First bundle analysis recorded!', 'green');
    return { isRegression: false, message: 'Baseline established' };
  }
  
  const lastEntry = history.entries[history.entries.length - 1];
  const sizeDiff = currentSize.totalSize - lastEntry.totalSize;
  const percentDiff = Math.round((sizeDiff / lastEntry.totalSize) * 100);
  
  if (sizeDiff > SIZE_THRESHOLD_KB || percentDiff > SIZE_THRESHOLD_PERCENT) {
    return {
      isRegression: true,
      message: `Bundle size increased by ${sizeDiff}KB (${percentDiff}%)`,
      previous: lastEntry.totalSize,
      current: currentSize.totalSize,
    };
  }
  
  if (sizeDiff < -10) {
    return {
      isRegression: false,
      message: `Bundle size decreased by ${Math.abs(sizeDiff)}KB (${Math.abs(percentDiff)}%)`,
      previous: lastEntry.totalSize,
      current: currentSize.totalSize,
    };
  }
  
  return {
    isRegression: false,
    message: `Bundle size stable (${sizeDiff >= 0 ? '+' : ''}${sizeDiff}KB)`,
    previous: lastEntry.totalSize,
    current: currentSize.totalSize,
  };
}

function displayResults(currentSize, comparison) {
  console.log('\n' + '='.repeat(60));
  log('📊 BUNDLE SIZE ANALYSIS RESULTS', 'bold');
  console.log('='.repeat(60));
  
  log(`Total Bundle Size: ${currentSize.totalSize} KB`, 'cyan');
  log(`JavaScript: ${currentSize.jsSize} KB`, 'blue');
  log(`CSS: ${currentSize.cssSize} KB`, 'blue');
  
  if (comparison.previous !== undefined) {
    const color = comparison.isRegression ? 'red' : 'green';
    log(`\n${comparison.message}`, color);
    log(`Previous: ${comparison.previous} KB → Current: ${comparison.current} KB`, color);
  }
  
  // Show largest chunks
  log('\n🏆 TOP 5 LARGEST CHUNKS:', 'bold');
  currentSize.chunks.slice(0, 5).forEach((chunk, index) => {
    const icon = chunk.type === 'js' ? '🟡' : '🎨';
    log(`  ${index + 1}. ${icon} ${chunk.name}: ${chunk.size} KB`);
  });
  
  // Warnings and recommendations
  if (currentSize.totalSize > 500) {
    log('\n⚠️  PERFORMANCE WARNING:', 'yellow');
    log('   Bundle size exceeds 500KB. Consider code splitting.', 'yellow');
  }
  
  if (currentSize.jsSize > 300) {
    log('\n💡 OPTIMIZATION SUGGESTIONS:', 'cyan');
    log('   • Use dynamic imports for large components', 'cyan');
    log('   • Enable tree shaking for unused code', 'cyan');
    log('   • Consider lazy loading for non-critical features', 'cyan');
  }
  
  console.log('='.repeat(60) + '\n');
}

function main() {
  const isQuickMode = process.argv.includes('--quick');
  const isCheckMode = process.argv.includes('--check');
  
  try {
    const currentSize = isQuickMode ? getQuickBundleEstimate() : analyzeBundleSize();
    const history = getBundleHistory();
    const comparison = compareWithHistory(currentSize, history);
    
    if (!isQuickMode) {
      // Only save to history for full analysis
      history.entries.push(currentSize);
      
      // Keep only last 20 entries
      if (history.entries.length > 20) {
        history.entries = history.entries.slice(-20);
      }
      
      saveBundleHistory(history);
    }
    
    if (!isCheckMode) {
      displayResults(currentSize, comparison);
    }
    
    // Exit with error code if regression detected (for CI/CD)
    if (comparison.isRegression && (process.argv.includes('--strict') || process.env.CI)) {
      log('❌ Bundle size regression detected!', 'red');
      process.exit(1);
    }
    
  } catch (error) {
    log(`❌ Bundle analysis failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

function getQuickBundleEstimate() {
  // Quick estimate based on file sizes without building
  const srcDir = path.join(process.cwd(), 'src');
  let estimatedSize = 0;
  
  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory() && file !== 'node_modules') {
        scanDir(filePath);
      } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
        estimatedSize += stats.size;
      }
    });
  }
  
  scanDir(srcDir);
  
  // Rough estimate: source code is typically compressed ~30% in production
  const estimatedBundleSize = Math.round((estimatedSize * 0.7) / 1024);
  
  return {
    totalSize: estimatedBundleSize,
    jsSize: estimatedBundleSize,
    cssSize: 0,
    chunks: [],
    timestamp: new Date().toISOString(),
    estimated: true,
  };
}

// Handle different script modes
if (require.main === module) {
  main();
}

module.exports = {
  analyzeBundleSize,
  getBundleHistory,
  compareWithHistory,
};