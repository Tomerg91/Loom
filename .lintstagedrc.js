const path = require('path');

module.exports = {
  // TypeScript and JavaScript files
  '**/*.{ts,tsx,js,jsx}': [
    // Type check only changed files (fastest approach)
    'npm run type-check',
    // Lint and fix only staged files
    'eslint --fix --max-warnings=0',
    // Format staged files
    'prettier --write',
    // Run focused unit tests for changed files
    () => 'npm run test:unit -- --run --changed --passWithNoTests',
  ],
  
  // Styles and configuration files
  '**/*.{css,scss,json,md,yaml,yml}': [
    'prettier --write',
  ],
  
  // Package.json changes - verify dependencies
  'package.json': [
    'npm audit --audit-level=high',
    'prettier --write',
  ],
  
  // Database migrations - validate syntax
  'supabase/migrations/**/*.sql': [
    () => 'npm run supabase:types',
  ],
  
  // Environment files - security check
  '.env*': [
    () => 'node scripts/validate-env.js',
  ],
};