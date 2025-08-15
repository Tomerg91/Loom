#!/usr/bin/env node

/**
 * Environment Loading Test Script
 * Tests environment variable loading in different contexts
 */

// Load environment variables from .env.local for testing
require('dotenv').config({ path: '.env.local' });

console.log('🧪 Testing Environment Variable Loading...\n');

// Test 1: Client-side environment variables
console.log('📱 Testing Client Environment (env.mjs)...');
try {
  // This should work in Node.js context
  const { env } = require('../src/env.mjs');
  
  console.log('✅ Client env loaded successfully');
  console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '❌ Missing'}`);
  console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '❌ Missing'}`);
  console.log(`   NEXT_PUBLIC_APP_URL: ${env.NEXT_PUBLIC_APP_URL || 'Default: http://localhost:3000'}`);
  console.log(`   NEXT_PUBLIC_ENABLE_DEBUG: ${env.NEXT_PUBLIC_ENABLE_DEBUG || 'Default: false'}`);
  console.log(`   NEXT_PUBLIC_MAX_FILE_SIZE: ${env.NEXT_PUBLIC_MAX_FILE_SIZE || 'Default: 10485760'}`);
} catch (error) {
  console.log('❌ Client env loading failed:', error.message);
}

console.log('\n🔧 Testing Server Environment (env-server.mjs)...');
try {
  const { serverEnv } = require('../src/env-server.mjs');
  
  console.log('✅ Server env loaded successfully');
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${serverEnv.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '❌ Missing'}`);
  console.log(`   MFA_ENCRYPTION_KEY: ${serverEnv.MFA_ENCRYPTION_KEY ? '✓ Set' : '❌ Missing'}`);
  console.log(`   MFA_SIGNING_KEY: ${serverEnv.MFA_SIGNING_KEY ? '✓ Set' : '❌ Missing'}`);
  console.log(`   MFA_ISSUER_NAME: ${serverEnv.MFA_ISSUER_NAME || 'Default: Loom'}`);
  console.log(`   RATE_LIMIT_ENABLED: ${serverEnv.RATE_LIMIT_ENABLED || 'Default: true'}`);
  console.log(`   EMAIL_PROVIDER: ${serverEnv.EMAIL_PROVIDER || 'Default: resend'}`);
} catch (error) {
  console.log('❌ Server env loading failed:', error.message);
}

// Test 3: Critical environment variables
console.log('\n🎯 Testing Critical Variables...');
const criticalVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MFA_ENCRYPTION_KEY',
  'MFA_SIGNING_KEY'
];

let criticalMissing = 0;
criticalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ CRITICAL: ${varName} is missing`);
    criticalMissing++;
  } else {
    console.log(`✅ ${varName}: Set (${value.length} chars)`);
  }
});

// Test 4: Production readiness
console.log('\n🚀 Production Readiness Check...');
if (process.env.NODE_ENV === 'production') {
  console.log('🔍 Production mode detected');
  
  // Check for secure configurations
  if (process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true') {
    console.log('⚠️  WARNING: Debug mode is enabled in production');
  } else {
    console.log('✅ Debug mode properly disabled');
  }
  
  if (process.env.RATE_LIMIT_ENABLED !== 'true') {
    console.log('⚠️  WARNING: Rate limiting should be enabled in production');
  } else {
    console.log('✅ Rate limiting enabled');
  }
} else {
  console.log('🧪 Development mode detected');
  console.log(`   Debug enabled: ${process.env.NEXT_PUBLIC_ENABLE_DEBUG || 'false'}`);
}

// Test 5: File upload configuration
console.log('\n📁 File Upload Configuration...');
const maxFileSize = process.env.NEXT_PUBLIC_MAX_FILE_SIZE;
const allowedTypes = process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES;

console.log(`   Max file size: ${maxFileSize ? `${parseInt(maxFileSize) / (1024*1024)}MB` : 'Not set'}`);
console.log(`   Allowed types: ${allowedTypes ? allowedTypes.split(',').length + ' types' : 'Not set'}`);

// Summary
console.log('\n📊 Summary...');
if (criticalMissing === 0) {
  console.log('🎉 All critical environment variables are configured!');
} else {
  console.log(`⚠️  ${criticalMissing} critical environment variables are missing`);
  console.log('   Please configure them before deployment');
}

// Verify environment separation
console.log('\n🔒 Environment Separation Check...');
const clientEnvKeys = Object.keys(require('../src/env.mjs').env);
const hasServerVarsInClient = clientEnvKeys.some(key => 
  key.includes('SERVICE_ROLE') || 
  key.includes('ENCRYPTION') || 
  key.includes('SIGNING') ||
  !key.startsWith('NEXT_PUBLIC_') && key !== 'NODE_ENV'
);

if (hasServerVarsInClient) {
  console.log('❌ SECURITY ISSUE: Server variables found in client environment');
} else {
  console.log('✅ Environment separation is properly maintained');
}

console.log('\n✨ Environment test completed!');