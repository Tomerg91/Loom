#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.sql']);
const IGNORE_DIRECTORIES = new Set([
  '.git',
  '.next',
  'node_modules',
  'playwright-report',
  'deployment-test-results',
  'test-results',
  'coverage',
  'dist',
  'build',
]);

// Ignore security documentation and remediation scripts
const IGNORE_FILES = new Set([
  'security_remediation_scripts.sql',
  'SECURITY_AUDIT_REPORT.md',
  'PHASE_1_RESULTS.md',
  'PHASE_2_RESULTS.md',
  'SECURITY_AUDIT_SUMMARY.md',
]);

function isIgnored(directory) {
  return IGNORE_DIRECTORIES.has(directory);
}

function findMatches() {
  const matches = [];

  /** @type {string[]} */
  const stack = [REPO_ROOT];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (!isIgnored(entry.name)) {
          stack.push(entryPath);
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name);
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        continue;
      }

      // Skip ignored files (security documentation)
      if (IGNORE_FILES.has(entry.name)) {
        continue;
      }

      const relativePath = path.relative(REPO_ROOT, entryPath);
      const fileContents = fs.readFileSync(entryPath, 'utf8');

      const lines = fileContents.split(/\r?\n/);
      lines.forEach((line, index) => {
        if (line.includes('net.http_')) {
          matches.push({
            file: relativePath,
            line: index + 1,
            content: line.trim(),
          });
        }
      });
    }
  }

  return matches;
}

function main() {
  console.log('🔍 Scanning for direct net.http_* function calls...');
  console.log(`📁 Repository root: ${REPO_ROOT}`);
  console.log(`📝 Extensions: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`);
  console.log('');

  const matches = findMatches();

  if (matches.length === 0) {
    console.log('✅ No direct net.http_* calls found.');
    console.log(
      '✅ All HTTP interactions must continue to flow through Next.js API routes or Edge Functions.'
    );
    console.log('');
    console.log('💡 Best practices:');
    console.log('   - Use Next.js API routes for server-side HTTP requests');
    console.log(
      '   - Use Supabase Edge Functions for authenticated external calls'
    );
    console.log('   - Never call net.http_* from client-side code');
    return;
  }

  console.error('❌ Found direct net.http_* usage!');
  console.error('');
  console.error(
    'These calls must be removed so that all HTTP traffic is proxied'
  );
  console.error('through Next.js API routes or Edge Functions.');
  console.error('');
  console.error('Matches found:');
  matches.forEach(match => {
    console.error(`  📄 ${match.file}:${match.line}`);
    console.error(`     ${match.content}`);
    console.error('');
  });

  console.error('🔧 How to fix:');
  console.error('  1. Move HTTP calls to Next.js API routes (/app/api/...)');
  console.error('  2. Or use Supabase Edge Functions (supabase/functions/...)');
  console.error('  3. Never use net.http_* directly from client code');
  console.error('');
  console.error('📚 See PHASE_1_RESULTS.md for detailed mitigation strategies');

  process.exitCode = 1;
}

main();
