#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🖼️  Optimizing images...\n');

// Configuration
const IMAGE_DIRS = [
  'public',
  'src/assets',  
  'assets'
];

const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

const OPTIMIZATION_TOOLS = {
  jpg: 'jpegoptim --max=85 --strip-all',
  jpeg: 'jpegoptim --max=85 --strip-all', 
  png: 'optipng -o7',
  webp: 'cwebp -q 85',
  gif: 'gifsicle -O3',
  svg: 'svgo'
};

// Check if optimization tools are available
function checkTools() {
  const tools = ['jpegoptim', 'optipng', 'cwebp', 'gifsicle', 'svgo'];
  const missing = [];

  for (const tool of tools) {
    try {
      execSync(`which ${tool}`, { stdio: 'ignore' });
    } catch {
      missing.push(tool);
    }
  }

  if (missing.length > 0) {
    console.log('⚠️  Missing optimization tools:');
    missing.forEach(tool => console.log(`   - ${tool}`));
    console.log('\nInstall missing tools:');
    console.log('macOS: brew install jpegoptim optipng webp gifsicle svgo');
    console.log('Ubuntu: apt-get install jpegoptim optipng webp gifsicle');
    console.log('npm: npm install -g svgo');
    console.log('\nContinuing with available tools...\n');
  }

  return tools.filter(tool => !missing.includes(tool));
}

// Find all images in directories
function findImages(dirs) {
  const images = [];

  for (const dir of dirs) {
    const fullPath = path.join(process.cwd(), dir);
    
    if (!fs.existsSync(fullPath)) {
      continue;
    }

    function scanDirectory(directory) {
      const items = fs.readdirSync(directory);

      for (const item of items) {
        const itemPath = path.join(directory, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory() && !item.startsWith('.')) {
          scanDirectory(itemPath);
        } else if (stat.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (SUPPORTED_FORMATS.includes(ext)) {
            images.push({
              path: itemPath,
              size: stat.size,
              ext: ext.substring(1),
              relative: path.relative(process.cwd(), itemPath)
            });
          }
        }
      }
    }

    scanDirectory(fullPath);
  }

  return images;
}

// Optimize a single image
function optimizeImage(image, availableTools) {
  const tool = OPTIMIZATION_TOOLS[image.ext];
  if (!tool) return { success: false, reason: 'No tool available' };

  const toolName = tool.split(' ')[0];
  if (!availableTools.includes(toolName)) {
    return { success: false, reason: `Tool ${toolName} not available` };
  }

  try {
    const originalSize = image.size;
    const command = `${tool} "${image.path}"`;
    
    execSync(command, { stdio: 'ignore' });
    
    const newSize = fs.statSync(image.path).size;
    const savings = originalSize - newSize;
    const percentage = Math.round((savings / originalSize) * 100);

    return {
      success: true,
      originalSize,
      newSize,
      savings,
      percentage
    };
  } catch (error) {
    return { 
      success: false, 
      reason: error.message 
    };
  }
}

// Generate WebP versions
function generateWebP(images, availableTools) {
  if (!availableTools.includes('cwebp')) {
    return [];
  }

  const webpGenerated = [];

  for (const image of images) {
    if (image.ext === 'jpg' || image.ext === 'jpeg' || image.ext === 'png') {
      const webpPath = image.path.replace(/\.(jpe?g|png)$/i, '.webp');
      
      try {
        execSync(`cwebp -q 85 "${image.path}" -o "${webpPath}"`, { stdio: 'ignore' });
        
        const webpSize = fs.statSync(webpPath).size;
        const savings = image.size - webpSize;
        const percentage = Math.round((savings / image.size) * 100);

        if (percentage > 0) {
          webpGenerated.push({
            original: image.relative,
            webp: path.relative(process.cwd(), webpPath),
            savings,
            percentage
          });
        } else {
          // Remove WebP if it's not smaller
          fs.unlinkSync(webpPath);
        }
      } catch (error) {
        console.log(`Failed to generate WebP for ${image.relative}: ${error.message}`);
      }
    }
  }

  return webpGenerated;
}

// Main optimization process
function main() {
  const availableTools = checkTools();
  
  if (availableTools.length === 0) {
    console.log('❌ No optimization tools available. Please install them first.');
    process.exit(1);
  }

  const images = findImages(IMAGE_DIRS);
  
  if (images.length === 0) {
    console.log('📁 No images found to optimize.');
    return;
  }

  console.log(`🔍 Found ${images.length} images to optimize:`);
  
  let totalOriginalSize = 0;
  let totalNewSize = 0;
  let optimizedCount = 0;
  let failedCount = 0;

  // Optimize existing images
  for (const image of images) {
    const result = optimizeImage(image, availableTools);
    
    if (result.success) {
      totalOriginalSize += result.originalSize;
      totalNewSize += result.newSize;
      optimizedCount++;

      if (result.percentage > 0) {
        console.log(`✅ ${image.relative}: ${formatBytes(result.savings)} saved (${result.percentage}%)`);
      } else {
        console.log(`⚪ ${image.relative}: already optimized`);
      }
    } else {
      failedCount++;
      console.log(`❌ ${image.relative}: ${result.reason}`);
    }
  }

  // Generate WebP versions
  console.log('\n🔄 Generating WebP versions...');
  const webpGenerated = generateWebP(images, availableTools);

  // Summary
  console.log('\n📊 Optimization Summary:');
  console.log(`✅ Optimized: ${optimizedCount} images`);
  console.log(`❌ Failed: ${failedCount} images`);
  console.log(`🆕 WebP generated: ${webpGenerated.length} files`);

  if (totalOriginalSize > totalNewSize) {
    const totalSavings = totalOriginalSize - totalNewSize;
    const totalPercentage = Math.round((totalSavings / totalOriginalSize) * 100);
    console.log(`💾 Total savings: ${formatBytes(totalSavings)} (${totalPercentage}%)`);
  }

  // WebP summary
  if (webpGenerated.length > 0) {
    console.log('\n🖼️  WebP Files Generated:');
    let webpSavings = 0;
    webpGenerated.forEach(file => {
      console.log(`   ${file.original} → ${file.webp} (${file.percentage}% smaller)`);
      webpSavings += file.savings;
    });
    console.log(`💾 Additional WebP savings: ${formatBytes(webpSavings)}`);
  }

  // Recommendations
  console.log('\n💡 Optimization Tips:');
  console.log('- Use Next.js Image component for automatic optimization');
  console.log('- Implement lazy loading for images below the fold');
  console.log('- Consider using AVIF format for even better compression');
  console.log('- Use appropriate image sizes for different breakpoints');
  console.log('- Compress images before committing to reduce repository size');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run optimization
main();