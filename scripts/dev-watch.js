#!/usr/bin/env node

/**
 * Enhanced development server with file watching and auto-restart
 * Monitors configuration changes and automatically restarts the dev server
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

console.log('🚀 Starting enhanced development server...\n');

// Configuration files to watch for auto-restart
const configFiles = [
  'next.config.js',
  'tailwind.config.ts',
  'tsconfig.json',
  'eslint.config.mjs',
  'middleware.ts',
  'package.json',
  '.env.local',
  '.env.development',
];

// Files to format on save
const formatFiles = [
  'src/**/*.{ts,tsx,js,jsx}',
  'app/**/*.{ts,tsx,js,jsx}',
  '!node_modules/**',
  '!.next/**',
];

let devServer = null;
let isRestarting = false;
let bundleSizeCache = null;

// Colors for output
const colors = {
  green: '\033[0;32m',
  yellow: '\033[1;33m',
  blue: '\033[0;34m',
  red: '\033[0;31m',
  reset: '\033[0m',
  cyan: '\033[0;36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function startDevServer() {
  if (devServer) {
    devServer.kill();
  }

  log('🚀 Starting Next.js development server...', 'blue');
  
  devServer = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
  });

  devServer.on('error', (error) => {
    log(`❌ Server error: ${error.message}`, 'red');
  });

  devServer.on('exit', (code) => {
    if (code !== 0 && !isRestarting) {
      log(`⚠️  Server exited with code ${code}`, 'yellow');
    }
  });

  return devServer;
}

function restartServer(reason) {
  if (isRestarting) return;
  
  isRestarting = true;
  log(`🔄 Restarting server: ${reason}`, 'yellow');
  
  setTimeout(() => {
    startDevServer();
    isRestarting = false;
    log('✅ Server restarted successfully', 'green');
  }, 2000);
}

function formatFile(filePath) {
  if (filePath.includes('node_modules') || filePath.includes('.next')) {
    return;
  }

  exec(`npx prettier --write "${filePath}"`, (error) => {
    if (error) {
      log(`❌ Format error for ${filePath}: ${error.message}`, 'red');
    } else {
      log(`✨ Formatted: ${path.relative(process.cwd(), filePath)}`, 'cyan');
    }
  });
}

function checkBundleSize() {
  exec('npm run analyze:quick', (error, stdout) => {
    if (error) return;
    
    try {
      const sizeMatch = stdout.match(/Total Size: (\d+) KB/);
      if (sizeMatch) {
        const currentSize = parseInt(sizeMatch[1]);
        
        if (bundleSizeCache && currentSize > bundleSizeCache * 1.1) {
          log(`📦 Bundle size increased: ${bundleSizeCache}KB → ${currentSize}KB`, 'yellow');
        }
        
        bundleSizeCache = currentSize;
      }
    } catch (e) {
      // Silent fail
    }
  });
}

// Start the development server
startDevServer();

// Watch configuration files for auto-restart
const configWatcher = chokidar.watch(configFiles, {
  ignored: /node_modules/,
  persistent: true,
});

configWatcher.on('change', (filePath) => {
  const fileName = path.basename(filePath);
  restartServer(`Configuration changed: ${fileName}`);
});

// Watch source files for auto-formatting
const sourceWatcher = chokidar.watch(formatFiles, {
  ignored: /node_modules/,
  persistent: true,
});

let formatTimeout = null;

sourceWatcher.on('change', (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || 
      filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
    
    // Debounce formatting
    clearTimeout(formatTimeout);
    formatTimeout = setTimeout(() => {
      formatFile(filePath);
    }, 500);
  }
});

// Monitor bundle size periodically
setInterval(checkBundleSize, 30000); // Every 30 seconds

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n🛑 Shutting down development server...', 'yellow');
  
  configWatcher.close();
  sourceWatcher.close();
  
  if (devServer) {
    devServer.kill();
  }
  
  log('👋 Development server stopped', 'green');
  process.exit(0);
});

// Initial bundle size check
setTimeout(checkBundleSize, 5000);

log('👀 Watching for changes...', 'blue');
log('  • Configuration files will trigger server restart', 'blue');
log('  • Source files will be auto-formatted on save', 'blue');
log('  • Bundle size is monitored every 30 seconds', 'blue');
log('  • Press Ctrl+C to stop\n', 'blue');