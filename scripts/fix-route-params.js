#!/usr/bin/env node
/**
 * Fix Next.js 15 async params in route handlers
 * In Next.js 15, params are now Promises and must be awaited
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all route handlers with dynamic params
const routeFiles = execSync('find src/app/api -name "route.ts" -path "*\\[*\\]*"', { encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(Boolean);

console.log(`Found ${routeFiles.length} route handlers to fix\n`);

let fixedCount = 0;
let errorCount = 0;

routeFiles.forEach((filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    // Pattern 1: Fix RouteContext interface to use Promise<{ param: type }>
    const routeContextMatch = content.match(/interface RouteContext \{[\s\S]*?params: \{[\s\S]*?\};[\s\S]*?\}/);
    if (routeContextMatch) {
      const oldInterface = routeContextMatch[0];
      // Extract the params content
      const paramsMatch = oldInterface.match(/params: \{([\s\S]*?)\};/);
      if (paramsMatch) {
        const newInterface = oldInterface.replace(/params: \{([\s\S]*?)\};/, 'params: Promise<{$1}>;');
        content = content.replace(oldInterface, newInterface);
        modified = true;
      }
    }

    // Pattern 2: Update function signatures to use async params destructuring
    // Match: export async function METHOD(request: NextRequest, { params }: RouteContext)
    const functionPattern = /export async function (GET|POST|PUT|PATCH|DELETE)\(([^)]+)\) \{/g;
    const functions = [...content.matchAll(functionPattern)];

    for (const match of functions) {
      const method = match[1];
      const params = match[2];

      // Check if it uses { params } destructuring
      if (params.includes('{ params }')) {
        // Replace the opening line and add await params
        const oldSignature = match[0];
        const newSignature = oldSignature.replace('{ params }', 'context');
        content = content.replace(oldSignature, newSignature);

        // Add params await after the opening brace
        const afterBrace = content.indexOf('{', content.indexOf(newSignature)) + 1;
        const indent = '  ';
        const awaitLine = `\n${indent}const params = await context.params;`;
        content = content.slice(0, afterBrace) + awaitLine + content.slice(afterBrace);

        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ Fixed: ${filePath}`);
      fixedCount++;
    } else {
      console.log(`- Skipped (no changes): ${filePath}`);
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
