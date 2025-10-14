#!/usr/bin/env node
/**
 * Fix Next.js 15 async params in all route handler patterns
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

    // Pattern 1: Direct export - export async function METHOD(request, { params }: { params: TYPE })
    const directPattern = /export async function (GET|POST|PUT|PATCH|DELETE)\(\s*request: NextRequest,\s*\{ params \}: \{ params: ([^}]+\}) \}\s*\)/g;
    let match;
    const replacements = [];

    while ((match = directPattern.exec(content)) !== null) {
      const method = match[1];
      const paramsType = match[2];
      const fullMatch = match[0];
      const newSignature = fullMatch.replace(
        /\{ params \}: \{ params: ([^}]+\}) \}/,
        'context: { params: Promise<$1> }'
      );
      replacements.push({ old: fullMatch, new: newSignature, type: 'direct' });
    }

    // Pattern 2: withErrorHandling - export const METHOD = withErrorHandling(async (request, { params }: { params: TYPE }) =>
    const wrappedPattern = /export const (GET|POST|PUT|PATCH|DELETE) = withErrorHandling\(async \(\s*request: NextRequest,\s*\{ params \}: \{ params: ([^}]+\}) \}\s*\)/g;

    while ((match = wrappedPattern.exec(content)) !== null) {
      const method = match[1];
      const paramsType = match[2];
      const fullMatch = match[0];
      const newSignature = fullMatch.replace(
        /\{ params \}: \{ params: ([^}]+\}) \}/,
        'context: { params: Promise<$1> }'
      );
      replacements.push({ old: fullMatch, new: newSignature, type: 'wrapped' });
    }

    // Pattern 3: authenticatedRoute wrapper - similar pattern
    const authPattern = /export const (GET|POST|PUT|PATCH|DELETE) = authenticatedRoute\(async \(\s*request: NextRequest,\s*user: [^,]+,\s*\{ params \}: \{ params: ([^}]+\}) \}\s*\)/g;

    while ((match = authPattern.exec(content)) !== null) {
      const method = match[1];
      const paramsType = match[2];
      const fullMatch = match[0];
      const newSignature = fullMatch.replace(
        /\{ params \}: \{ params: ([^}]+\}) \}/,
        'context: { params: Promise<$1> }'
      );
      replacements.push({ old: fullMatch, new: newSignature, type: 'auth' });
    }

    // Apply replacements and add await statements
    for (const { old, new: newSig, type } of replacements) {
      const oldIndex = content.indexOf(old);
      if (oldIndex === -1) continue;

      content = content.replace(old, newSig);

      // Find the opening brace or arrow of the function
      const funcStart = content.indexOf(newSig);
      let openChar;
      if (type === 'wrapped' || type === 'auth') {
        // For arrow functions: ... ) => {
        openChar = content.indexOf('{', funcStart + newSig.length);
      } else {
        // For regular functions: ... ) {
        openChar = content.indexOf('{', funcStart + newSig.length);
      }

      // Insert await statement after opening brace/arrow
      const beforeBrace = content.slice(0, openChar + 1);
      const afterBrace = content.slice(openChar + 1);
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
