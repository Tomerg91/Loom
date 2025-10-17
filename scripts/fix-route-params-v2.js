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

    // Fix inline params destructuring: { params }: { params: { ... } }
    // Change to: context: { params: Promise<{ ... }> }
    // Then add `const params = await context.params;` at start of function body

    // Pattern: export async function METHOD(request: NextRequest, { params }: { params: TYPE })
    const inlinePattern = /export async function (GET|POST|PUT|PATCH|DELETE)\(\s*request: NextRequest,\s*\{ params \}: \{ params: ([^}]+\}) \}\s*\)/g;

    let match;
    const replacements = [];

    while ((match = inlinePattern.exec(content)) !== null) {
      const method = match[1];
      const paramsType = match[2]; // e.g., "{ id: string }"
      const fullMatch = match[0];

      // New signature with context
      const newSignature = fullMatch.replace(
        /\{ params \}: \{ params: ([^}]+\}) \}/,
        'context: { params: Promise<$1> }'
      );

      replacements.push({ old: fullMatch, new: newSignature, method });
    }

    // Apply replacements and add await statements
    for (const { old, new: newSig, method } of replacements) {
      content = content.replace(old, newSig);

      // Find the opening brace of the function and add await statement
      const funcStart = content.indexOf(newSig);
      const openBrace = content.indexOf('{', funcStart + newSig.length);

      // Insert await statement after opening brace
      const beforeBrace = content.slice(0, openBrace + 1);
      const afterBrace = content.slice(openBrace + 1);

      // Add proper indentation
      const awaitLine = '\n  const params = await context.params;\n';
      content = beforeBrace + awaitLine + afterBrace;

      modified = true;
    }

    // Also fix RouteContext interface if it exists
    const interfacePattern = /interface RouteContext \{[\s\S]*?params: \{([\s\S]*?)\};[\s\S]*?\}/;
    const interfaceMatch = content.match(interfacePattern);

    if (interfaceMatch) {
      const oldInterface = interfaceMatch[0];
      const newInterface = oldInterface.replace(
        /params: \{([\s\S]*?)\};/,
        'params: Promise<{$1}>;'
      );
      content = content.replace(oldInterface, newInterface);
      modified = true;
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
