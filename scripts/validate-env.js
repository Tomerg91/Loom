#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * Validates environment files for security issues and missing variables
 */

const fs = require('fs');
const path = require('path');

const SECURITY_PATTERNS = [
  /password.*=.*[^x]/i,
  /secret.*=.*[^x]/i,
  /key.*=.*[^x]/i,
  /token.*=.*[^x]/i,
  /api_key.*=.*[^x]/i,
];

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
];

function validateEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Environment file not found: ${filePath}`);
    return true; // Not an error if file doesn't exist
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  let hasErrors = false;
  
  // Check for potential secrets exposure
  lines.forEach((line, index) => {
    SECURITY_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        console.log(`🔴 SECURITY WARNING in ${filePath}:${index + 1}`);
        console.log(`   Potential secret exposed: ${line.split('=')[0]}`);
        hasErrors = true;
      }
    });
  });
  
  // Check for required variables (only for .env.example)
  if (filePath.includes('.env.example')) {
    const vars = lines.map(line => line.split('=')[0]);
    REQUIRED_VARS.forEach(requiredVar => {
      if (!vars.includes(requiredVar)) {
        console.log(`🟡 Missing required variable in ${filePath}: ${requiredVar}`);
      }
    });
  }
  
  return !hasErrors;
}

function main() {
  console.log('🔍 Validating environment files...');
  
  const envFiles = [
    '.env.example',
    '.env.local',
    '.env.development',
    '.env.production',
  ];
  
  let allValid = true;
  
  envFiles.forEach(file => {
    const isValid = validateEnvFile(file);
    if (!isValid) {
      allValid = false;
    }
  });
  
  if (allValid) {
    console.log('✅ Environment validation passed');
  } else {
    console.log('❌ Environment validation failed');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}