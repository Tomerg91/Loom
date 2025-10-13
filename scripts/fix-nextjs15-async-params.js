#!/usr/bin/env node
/**
 * Comprehensive Next.js 15 async params fix
 * Handles: route handlers, page components, and all wrapper patterns
 */

const fs = require('fs');
const { execSync } = require('child_process');

// Find all files with dynamic params
const routeFiles = execSync('find src/app -type f \\( -name "route.ts" -o -name "page.tsx" \\) | grep "\\[.*\\]"', { encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(Boolean);

console.log(`Found ${routeFiles.length} files to process\n`);

let fixedCount = 0;
let errorCount = 0;

function needsProcessing(content) {
  // Check if file already has correct patterns
  if (/params: Promise</.test(content) && /const params = await/.test(content)) {
    return false;
  }
  // Check if file has params that need fixing
  return /params: \{/.test(content) || /\{ params \}/.test(content);
}

routeFiles.forEach((filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');

    if (!needsProcessing(content)) {
      console.log(`- Skipped (already fixed or no params): ${filePath}`);
      return;
    }

    let modified = false;
    const isPage = filePath.endsWith('page.tsx');

    // Step 1: Fix interface/type definitions for params
    // Match: params: { ... }
    // Replace with: params: Promise<{ ... }>
    content = content.replace(
      /(interface\s+\w+\s*\{[^}]*?)params:\s*\{([^}]+)\}([^}]*?\})/g,
      (match, before, paramsContent, after) => {
        modified = true;
        return `${before}params: Promise<{${paramsContent}}>${after}`;
      }
    );

    // Step 2: Fix inline type annotations
    // Match: { params }: { params: { ... } }
    // Replace: context: { params: Promise<{ ... }> }
    const inlineTypeRegex = /\{\s*params\s*\}:\s*\{\s*params:\s*\{([^}]+)\}\s*\}/g;
    let hasInlineTypes = false;

    content = content.replace(inlineTypeRegex, (match, paramsType) => {
      hasInlineTypes = true;
      modified = true;
      return `context: { params: Promise<{${paramsType}}> }`;
    });

    // Step 3: Add await statements for each function that needs it
    // Patterns to match:
    // - export async function METHOD(..., context: ...)
    // - export const METHOD = ...(..., context: ...)
    // - export default async function Page(..., context: ...)

    const functionPatterns = [
      // Direct export functions: export async function GET/POST/etc
      /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\([^)]*context:\s*[^)]+\)\s*(\{|:)/g,
      // Page components: export default async function
      /export\s+default\s+async\s+function\s+\w+\s*\([^)]*context:\s*[^)]+\)\s*(\{|:)/g,
      // Wrapped exports: export const METHOD = wrapper(async (..., context: ...) =>
      /export\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*=\s*\w+\s*\(\s*async\s*\([^)]*context:\s*[^)]+\)\s*=>/g,
    ];

    for (const pattern of functionPatterns) {
      const matches = [...content.matchAll(pattern)];

      for (const match of matches) {
        const fullMatch = match[0];
        const funcStart = content.indexOf(fullMatch);

        // Find opening brace or colon (for return type)
        let openChar = -1;
        let searchStart = funcStart + fullMatch.length;

        if (fullMatch.includes('=>')) {
          // Arrow function
          openChar = content.indexOf('{', searchStart);
        } else if (fullMatch.endsWith(':')) {
          // Has return type, find => or {
          openChar = content.indexOf('{', searchStart);
        } else {
          // Direct brace
          openChar = content.indexOf('{', searchStart);
        }

        if (openChar === -1) continue;

        // Check if await statement already exists right after the brace
        const afterBrace = content.slice(openChar + 1, openChar + 50);
        if (/^\s*const params = await context\.params;/.test(afterBrace)) {
          continue; // Already has await
        }

        // Insert await statement
        const beforeBrace = content.slice(0, openChar + 1);
        const afterBraceContent = content.slice(openChar + 1);
        const awaitLine = '\n  const params = await context.params;\n';
        content = beforeBrace + awaitLine + afterBraceContent;
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ Fixed: ${filePath}`);
      fixedCount++;
    } else {
      console.log(`- Skipped (no changes needed): ${filePath}`);
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    errorCount++;
  }
});

console.log(`\n${'='.repeat(50)}`);
console.log(`Fixed: ${fixedCount} files`);
console.log(`Errors: ${errorCount} files`);
console.log(`Skipped: ${routeFiles.length - fixedCount - errorCount} files`);
console.log(`${'='.repeat(50)}\n`);
