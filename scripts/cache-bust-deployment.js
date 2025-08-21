#!/usr/bin/env node

/**
 * Cache Busting Script for Deployment
 * This script ensures proper cache invalidation for CSS and JS assets
 * during deployment to prevent MIME type confusion issues.
 */

const fs = require('fs');
const path = require('path');

const STATIC_DIR = path.join(process.cwd(), '.next/static');
const BUILD_ID_FILE = path.join(process.cwd(), '.next/BUILD_ID');

function getBuildId() {
  try {
    return fs.readFileSync(BUILD_ID_FILE, 'utf8').trim();
  } catch (error) {
    console.warn('Could not read BUILD_ID, using timestamp');
    return Date.now().toString();
  }
}

function validateAssetTypes() {
  console.log('🔍 Validating CSS and JS asset separation...');
  
  const cssDir = path.join(STATIC_DIR, 'css');
  const chunksDir = path.join(STATIC_DIR, 'chunks');
  
  if (!fs.existsSync(cssDir)) {
    console.error('❌ CSS directory not found at:', cssDir);
    return false;
  }
  
  if (!fs.existsSync(chunksDir)) {
    console.error('❌ Chunks directory not found at:', chunksDir);
    return false;
  }
  
  // Check CSS files
  const cssFiles = fs.readdirSync(cssDir).filter(file => file.endsWith('.css'));
  const jsFiles = fs.readdirSync(chunksDir).filter(file => file.endsWith('.js'));
  
  console.log(`✅ Found ${cssFiles.length} CSS files in css directory`);
  console.log(`✅ Found ${jsFiles.length} JS files in chunks directory`);
  
  // Ensure no CSS files are in JS chunks directory
  const cssInJsDir = fs.readdirSync(chunksDir).filter(file => file.endsWith('.css'));
  if (cssInJsDir.length > 0) {
    console.error('❌ Found CSS files in JS chunks directory:', cssInJsDir);
    return false;
  }
  
  // Ensure no JS files are in CSS directory
  const jsInCssDir = fs.readdirSync(cssDir).filter(file => file.endsWith('.js'));
  if (jsInCssDir.length > 0) {
    console.error('❌ Found JS files in CSS directory:', jsInCssDir);
    return false;
  }
  
  console.log('✅ Asset separation validation passed');
  return true;
}

function generateDeploymentManifest() {
  const buildId = getBuildId();
  const timestamp = new Date().toISOString();
  
  const manifest = {
    buildId,
    timestamp,
    version: require('../package.json').version,
    staticAssets: {
      css: [],
      js: [],
    }
  };
  
  try {
    const cssDir = path.join(STATIC_DIR, 'css');
    const chunksDir = path.join(STATIC_DIR, 'chunks');
    
    if (fs.existsSync(cssDir)) {
      manifest.staticAssets.css = fs.readdirSync(cssDir)
        .filter(file => file.endsWith('.css'))
        .map(file => `/next/static/css/${file}`);
    }
    
    if (fs.existsSync(chunksDir)) {
      manifest.staticAssets.js = fs.readdirSync(chunksDir)
        .filter(file => file.endsWith('.js'))
        .map(file => `/next/static/chunks/${file}`);
    }
    
    const manifestPath = path.join(STATIC_DIR, 'deployment-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log('✅ Deployment manifest generated at:', manifestPath);
    console.log('📊 Manifest summary:');
    console.log(`   - Build ID: ${manifest.buildId}`);
    console.log(`   - CSS files: ${manifest.staticAssets.css.length}`);
    console.log(`   - JS files: ${manifest.staticAssets.js.length}`);
    
  } catch (error) {
    console.error('❌ Failed to generate deployment manifest:', error);
    return false;
  }
  
  return true;
}

function main() {
  console.log('🚀 Running cache-bust deployment script...');
  
  if (!fs.existsSync(STATIC_DIR)) {
    console.error('❌ Static directory not found. Please run build first.');
    process.exit(1);
  }
  
  const validationPassed = validateAssetTypes();
  const manifestGenerated = generateDeploymentManifest();
  
  if (validationPassed && manifestGenerated) {
    console.log('✅ Cache-bust deployment script completed successfully');
    process.exit(0);
  } else {
    console.error('❌ Cache-bust deployment script failed');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validateAssetTypes,
  generateDeploymentManifest,
  getBuildId
};