#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Performance targets from requirements
const PERFORMANCE_TARGETS = {
  totalBundleSize: 2 * 1024 * 1024, // 2MB
  firstLoadJS: 250 * 1024, // 250KB
  largestContentfulPaint: 2500, // 2.5s in ms
  performanceScore: 95,
};

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatPercentage(current, target) {
  const percentage = ((current / target) * 100).toFixed(1);
  const color = current <= target ? 'green' : 'red';
  return `${colors[color]}${percentage}%${colors.reset}`;
}

function analyzeBundleStats() {
  log('\n🔍 Analyzing bundle statistics...', 'blue');
  
  try {
    // Run Next.js build with bundle analyzer
    log('Building project with bundle analysis...', 'cyan');
    execSync('ANALYZE=true npm run build', { stdio: 'pipe' });
    
    // Read bundle statistics from .next/analyze directory
    const nextDir = path.join(process.cwd(), '.next');
    const analyzeDir = path.join(nextDir, 'analyze');
    
    if (!fs.existsSync(analyzeDir)) {
      log('❌ Bundle analysis files not found. Make sure ANALYZE=true is set during build.', 'red');
      return null;
    }
    
    // Parse client bundle report
    const clientReportPath = path.join(analyzeDir, 'client-bundle-report.json');
    if (!fs.existsSync(clientReportPath)) {
      log('❌ Client bundle report not found.', 'red');
      return null;
    }
    
    const clientReport = JSON.parse(fs.readFileSync(clientReportPath, 'utf8'));
    
    return {
      totalSize: clientReport.assets.reduce((total, asset) => total + asset.size, 0),
      chunks: clientReport.chunks,
      assets: clientReport.assets,
    };
    
  } catch (error) {
    log(`❌ Error analyzing bundle: ${error.message}`, 'red');
    return null;
  }
}

function analyzeNextBuildOutput() {
  log('\n📊 Analyzing Next.js build output...', 'blue');
  
  try {
    // Run build and capture output
    const buildOutput = execSync('npm run build', { encoding: 'utf8' });
    
    // Parse build output for bundle sizes
    const lines = buildOutput.split('\n');
    const routeStats = [];
    let parsingRoutes = false;
    
    for (const line of lines) {
      if (line.includes('Route (pages)') || line.includes('Route (app)')) {
        parsingRoutes = true;
        continue;
      }
      
      if (parsingRoutes && line.trim() === '') {
        break;
      }
      
      if (parsingRoutes && line.includes('kB')) {
        const match = line.match(/.*?(\d+(?:\.\d+)?)\s*kB.*?(\d+(?:\.\d+)?)\s*kB/);
        if (match) {
          const [, firstLoad, size] = match;
          const route = line.split(/\s+/)[0];
          routeStats.push({
            route,
            firstLoadJS: parseFloat(firstLoad) * 1024,
            size: parseFloat(size) * 1024,
          });
        }
      }
    }
    
    return { routeStats, buildOutput };
    
  } catch (error) {
    log(`❌ Error analyzing build output: ${error.message}`, 'red');
    return null;
  }
}

function checkPerformanceTargets(stats) {
  log('\n🎯 Performance Target Analysis', 'bold');
  log('=' .repeat(60), 'cyan');
  
  const results = {
    passed: 0,
    failed: 0,
    details: [],
  };
  
  if (stats.routeStats) {
    // Check total bundle size
    const totalSize = stats.routeStats.reduce((total, route) => total + route.size, 0);
    const bundleTargetMet = totalSize <= PERFORMANCE_TARGETS.totalBundleSize;
    
    log(`\n📦 Bundle Size Analysis:`);
    log(`   Total Size: ${formatBytes(totalSize)} / ${formatBytes(PERFORMANCE_TARGETS.totalBundleSize)}`);
    log(`   Target Met: ${bundleTargetMet ? '✅ YES' : '❌ NO'} (${formatPercentage(totalSize, PERFORMANCE_TARGETS.totalBundleSize)})`);
    
    if (bundleTargetMet) results.passed++; else results.failed++;
    results.details.push({
      metric: 'Total Bundle Size',
      current: formatBytes(totalSize),
      target: formatBytes(PERFORMANCE_TARGETS.totalBundleSize),
      passed: bundleTargetMet,
    });
    
    // Check First Load JS for each route
    log(`\n🚀 First Load JS Analysis:`);
    let firstLoadTargetsMet = 0;
    let firstLoadTargetsTotal = 0;
    
    for (const route of stats.routeStats) {
      const targetMet = route.firstLoadJS <= PERFORMANCE_TARGETS.firstLoadJS;
      const indicator = targetMet ? '✅' : '❌';
      
      log(`   ${indicator} ${route.route}: ${formatBytes(route.firstLoadJS)} / ${formatBytes(PERFORMANCE_TARGETS.firstLoadJS)}`);
      
      if (targetMet) firstLoadTargetsMet++;
      firstLoadTargetsTotal++;
    }
    
    const overallFirstLoadPassed = firstLoadTargetsMet === firstLoadTargetsTotal;
    log(`\n   Overall First Load JS: ${overallFirstLoadPassed ? '✅ PASSED' : '❌ FAILED'} (${firstLoadTargetsMet}/${firstLoadTargetsTotal} routes)`);
    
    if (overallFirstLoadPassed) results.passed++; else results.failed++;
    results.details.push({
      metric: 'First Load JS',
      current: `${firstLoadTargetsMet}/${firstLoadTargetsTotal} routes`,
      target: 'All routes < 250KB',
      passed: overallFirstLoadPassed,
    });
  }
  
  return results;
}

function generateOptimizationSuggestions(stats) {
  log('\n💡 Optimization Suggestions', 'bold');
  log('=' .repeat(60), 'cyan');
  
  const suggestions = [];
  
  if (stats.routeStats) {
    // Find heavy routes
    const heavyRoutes = stats.routeStats.filter(route => 
      route.firstLoadJS > PERFORMANCE_TARGETS.firstLoadJS
    );
    
    if (heavyRoutes.length > 0) {
      suggestions.push('🔴 Heavy Routes Found:');
      heavyRoutes.forEach(route => {
        const excess = route.firstLoadJS - PERFORMANCE_TARGETS.firstLoadJS;
        suggestions.push(`   • ${route.route}: ${formatBytes(excess)} over target`);
      });
      suggestions.push('   → Consider implementing dynamic imports for heavy components');
      suggestions.push('   → Split large components into smaller chunks');
      suggestions.push('   → Use React.lazy() for non-critical components');
    }
    
    // Check for potential optimization opportunities
    const totalSize = stats.routeStats.reduce((total, route) => total + route.size, 0);
    if (totalSize > PERFORMANCE_TARGETS.totalBundleSize) {
      const excess = totalSize - PERFORMANCE_TARGETS.totalBundleSize;
      suggestions.push(`\n🔴 Bundle size exceeds target by ${formatBytes(excess)}`);
      suggestions.push('   → Review and optimize third-party dependencies');
      suggestions.push('   → Implement tree shaking for unused code');
      suggestions.push('   → Consider lazy loading for admin/analytics components');
    }
    
    // General optimization suggestions
    suggestions.push('\n🟡 General Optimizations:');
    suggestions.push('   • Enable dynamic imports for chart libraries (recharts)');
    suggestions.push('   • Implement image lazy loading with next/image');
    suggestions.push('   • Use dynamic imports for admin dashboard components');
    suggestions.push('   • Consider splitting vendor libraries into separate chunks');
    suggestions.push('   • Implement route-level code splitting');
  }
  
  if (suggestions.length === 0) {
    log('🎉 No major optimization opportunities found!', 'green');
    log('   Your bundle is well-optimized and meets performance targets.', 'green');
  } else {
    suggestions.forEach(suggestion => log(suggestion));
  }
}

function saveResults(results) {
  const timestamp = new Date().toISOString();
  const reportPath = path.join(process.cwd(), 'performance-report.json');
  
  const report = {
    timestamp,
    targets: PERFORMANCE_TARGETS,
    results,
    summary: {
      targetsMet: results.passed,
      targetsTotal: results.passed + results.failed,
      overallPassed: results.failed === 0,
    },
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Performance report saved to: ${reportPath}`, 'blue');
  
  return report;
}

function main() {
  log('🚀 Bundle Performance Monitor', 'bold');
  log('Analyzing production bundle performance...', 'cyan');
  
  // Analyze Next.js build output
  const buildStats = analyzeNextBuildOutput();
  
  if (!buildStats) {
    log('❌ Failed to analyze build statistics', 'red');
    process.exit(1);
  }
  
  // Check performance targets
  const results = checkPerformanceTargets(buildStats);
  
  // Generate suggestions
  generateOptimizationSuggestions(buildStats);
  
  // Save results
  const report = saveResults(results);
  
  // Final summary
  log('\n' + '=' .repeat(60), 'cyan');
  log('📋 PERFORMANCE SUMMARY', 'bold');
  log('=' .repeat(60), 'cyan');
  
  const overallPassed = report.summary.overallPassed;
  const statusColor = overallPassed ? 'green' : 'red';
  const statusIcon = overallPassed ? '✅' : '❌';
  
  log(`\n${statusIcon} Overall Status: ${overallPassed ? 'PASSED' : 'FAILED'}`, statusColor);
  log(`   Targets Met: ${report.summary.targetsMet}/${report.summary.targetsTotal}`, statusColor);
  
  if (!overallPassed) {
    log('\n🔧 Action Required:', 'yellow');
    log('   Bundle optimization needed to meet production targets.', 'yellow');
    log('   Review the suggestions above and implement optimizations.', 'yellow');
  } else {
    log('\n🎉 Excellent! Your bundle meets all performance targets.', 'green');
  }
  
  // Exit with appropriate code
  process.exit(overallPassed ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeBundleStats,
  analyzeNextBuildOutput,
  checkPerformanceTargets,
  generateOptimizationSuggestions,
  PERFORMANCE_TARGETS,
};