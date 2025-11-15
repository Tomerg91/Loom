#!/usr/bin/env node

/**
 * Console Statement Finder
 *
 * Scans the codebase for console.* statements and reports their locations.
 * Helps prioritize migration to centralized logger.
 *
 * Usage:
 *   node scripts/find-console-statements.js [path]
 *   node scripts/find-console-statements.js --summary
 *   node scripts/find-console-statements.js src/lib/auth
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const CONSOLE_METHODS = ['log', 'error', 'warn', 'info', 'debug', 'trace'];

// Patterns to exclude (already migrated or acceptable)
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  // Logger implementation itself
  /src\/modules\/platform\/logging\/logger\.ts/,
  // This script
  /scripts\/find-console-statements\.js/,
];

class ConsoleFinder {
  constructor() {
    this.results = {
      files: {},
      totals: { log: 0, error: 0, warn: 0, info: 0, debug: 0, trace: 0 },
      totalFiles: 0,
      totalStatements: 0,
    };
  }

  shouldExclude(filePath) {
    return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
  }

  isValidSourceFile(filePath) {
    const ext = path.extname(filePath);
    return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
  }

  scanFile(filePath) {
    if (this.shouldExclude(filePath) || !this.isValidSourceFile(filePath)) {
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const matches = [];

      lines.forEach((line, index) => {
        // Skip comments
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          return;
        }

        CONSOLE_METHODS.forEach(method => {
          const regex = new RegExp(`\\bconsole\\.${method}\\b`, 'g');
          if (regex.test(line)) {
            matches.push({
              line: index + 1,
              method,
              content: line.trim(),
            });
            this.results.totals[method]++;
            this.results.totalStatements++;
          }
        });
      });

      if (matches.length > 0) {
        this.results.files[filePath] = matches;
        this.results.totalFiles++;
      }
    } catch (error) {
      // Silently skip files that can't be read
    }
  }

  scanDirectory(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      entries.forEach(entry => {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          this.scanDirectory(fullPath);
        } else if (entry.isFile()) {
          this.scanFile(fullPath);
        }
      });
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error.message);
    }
  }

  getPriority(count) {
    if (count >= 50) return { label: 'CRITICAL', color: COLORS.red };
    if (count >= 20) return { label: 'HIGH', color: COLORS.yellow };
    if (count >= 5) return { label: 'MEDIUM', color: COLORS.blue };
    return { label: 'LOW', color: COLORS.gray };
  }

  printSummary() {
    console.log('\n' + COLORS.cyan + '═'.repeat(80) + COLORS.reset);
    console.log(COLORS.cyan + '  CONSOLE STATEMENT MIGRATION REPORT' + COLORS.reset);
    console.log(COLORS.cyan + '═'.repeat(80) + COLORS.reset + '\n');

    // Overall stats
    console.log(COLORS.yellow + '📊 Overall Statistics:' + COLORS.reset);
    console.log(`  Total files with console statements: ${COLORS.red}${this.results.totalFiles}${COLORS.reset}`);
    console.log(`  Total console statements found: ${COLORS.red}${this.results.totalStatements}${COLORS.reset}\n`);

    // Breakdown by method
    console.log(COLORS.yellow + '📈 Breakdown by Method:' + COLORS.reset);
    CONSOLE_METHODS.forEach(method => {
      const count = this.results.totals[method];
      if (count > 0) {
        const percentage = ((count / this.results.totalStatements) * 100).toFixed(1);
        console.log(`  console.${method.padEnd(6)}: ${String(count).padStart(4)} (${percentage}%)`);
      }
    });

    console.log('\n' + COLORS.yellow + '🎯 Top 10 Files by Console Statement Count:' + COLORS.reset);

    const sortedFiles = Object.entries(this.results.files)
      .map(([file, matches]) => ({ file, count: matches.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    sortedFiles.forEach(({ file, count }, index) => {
      const priority = this.getPriority(count);
      const relPath = path.relative(process.cwd(), file);
      console.log(
        `  ${(index + 1).toString().padStart(2)}. ${priority.color}[${priority.label}]${COLORS.reset} ` +
        `${relPath} ${COLORS.gray}(${count} statements)${COLORS.reset}`
      );
    });

    console.log('\n' + COLORS.green + '📝 Recommended Migration Order:' + COLORS.reset);
    console.log(`  1. ${COLORS.red}CRITICAL${COLORS.reset} files (50+ statements)`);
    console.log(`  2. ${COLORS.yellow}HIGH${COLORS.reset} files (20-49 statements)`);
    console.log(`  3. ${COLORS.blue}MEDIUM${COLORS.reset} files (5-19 statements)`);
    console.log(`  4. ${COLORS.gray}LOW${COLORS.reset} files (1-4 statements)`);

    console.log('\n' + COLORS.cyan + '📖 Next Steps:' + COLORS.reset);
    console.log(`  • Read: ${COLORS.blue}docs/LOGGER_MIGRATION_GUIDE.md${COLORS.reset}`);
    console.log(`  • Run: ${COLORS.blue}node scripts/find-console-statements.js [specific-path]${COLORS.reset}`);
    console.log(`  • Start migrating from CRITICAL files first\n`);

    console.log(COLORS.cyan + '═'.repeat(80) + COLORS.reset + '\n');
  }

  printDetailed() {
    console.log('\n' + COLORS.cyan + '═'.repeat(80) + COLORS.reset);
    console.log(COLORS.cyan + '  DETAILED CONSOLE STATEMENT REPORT' + COLORS.reset);
    console.log(COLORS.cyan + '═'.repeat(80) + COLORS.reset + '\n');

    const sortedFiles = Object.entries(this.results.files)
      .map(([file, matches]) => ({ file, matches }))
      .sort((a, b) => b.matches.length - a.matches.length);

    sortedFiles.forEach(({ file, matches }) => {
      const relPath = path.relative(process.cwd(), file);
      const priority = this.getPriority(matches.length);

      console.log(
        `\n${priority.color}[${priority.label}]${COLORS.reset} ` +
        `${COLORS.yellow}${relPath}${COLORS.reset} ` +
        `${COLORS.gray}(${matches.length} statements)${COLORS.reset}`
      );

      matches.slice(0, 5).forEach(match => {
        const lineNum = String(match.line).padStart(4);
        const methodColor = match.method === 'error' ? COLORS.red :
                           match.method === 'warn' ? COLORS.yellow :
                           COLORS.gray;

        console.log(
          `  ${COLORS.gray}${lineNum}:${COLORS.reset} ` +
          `${methodColor}console.${match.method}${COLORS.reset} ` +
          `${COLORS.gray}${match.content.substring(0, 80)}${COLORS.reset}`
        );
      });

      if (matches.length > 5) {
        console.log(`  ${COLORS.gray}... and ${matches.length - 5} more${COLORS.reset}`);
      }
    });

    console.log('\n' + COLORS.cyan + '═'.repeat(80) + COLORS.reset + '\n');
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const showSummary = args.includes('--summary');
  const showHelp = args.includes('--help') || args.includes('-h');

  if (showHelp) {
    console.log(`
${COLORS.cyan}Console Statement Finder${COLORS.reset}

${COLORS.yellow}Usage:${COLORS.reset}
  node scripts/find-console-statements.js [options] [path]

${COLORS.yellow}Options:${COLORS.reset}
  --summary    Show only summary statistics
  --help, -h   Show this help message

${COLORS.yellow}Examples:${COLORS.reset}
  node scripts/find-console-statements.js
  node scripts/find-console-statements.js --summary
  node scripts/find-console-statements.js src/lib/auth
  node scripts/find-console-statements.js src/components/booking

${COLORS.yellow}Output:${COLORS.reset}
  - Lists all files containing console.* statements
  - Shows line numbers and code snippets
  - Prioritizes files by statement count
  - Provides migration recommendations
`);
    process.exit(0);
  }

  const targetPath = args.find(arg => !arg.startsWith('--')) || 'src';
  const fullPath = path.resolve(process.cwd(), targetPath);

  console.log(`\n${COLORS.cyan}Scanning: ${fullPath}${COLORS.reset}\n`);

  const finder = new ConsoleFinder();

  if (fs.statSync(fullPath).isDirectory()) {
    finder.scanDirectory(fullPath);
  } else {
    finder.scanFile(fullPath);
  }

  if (finder.results.totalStatements === 0) {
    console.log(COLORS.green + '✅ No console statements found! All clean.' + COLORS.reset + '\n');
    process.exit(0);
  }

  if (showSummary) {
    finder.printSummary();
  } else {
    finder.printDetailed();
    console.log(COLORS.gray + `\nRun with ${COLORS.cyan}--summary${COLORS.gray} for a condensed view.${COLORS.reset}\n`);
  }
}

main();
