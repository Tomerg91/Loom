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
  const matches = findMatches();

  if (matches.length === 0) {
    console.log('✅ No direct net.http_* calls found.');
    console.log(
      'All HTTP interactions must continue to flow through Next.js API routes or Edge Functions.'
    );
    return;
  }

  console.error(
    '❌ Found direct net.http_* usage. These calls must be removed so that all HTTP traffic is proxied through Next.js API routes or Edge Functions.'
  );
  matches.forEach(match => {
    console.error(` - ${match.file}:${match.line} -> ${match.content}`);
  });
  process.exitCode = 1;
}

main();
