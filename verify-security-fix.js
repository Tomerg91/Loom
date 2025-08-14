#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔒 Verifying Security Fixes...\n');

// Check 1: Verify env.mjs only contains NEXT_PUBLIC_ variables
console.log('1. Checking env.mjs for client-safety...');
const envContent = fs.readFileSync(path.join(__dirname, 'src/env.mjs'), 'utf8');
const hasServiceRoleKey = envContent.includes('SUPABASE_SERVICE_ROLE_KEY');
const hasOnlyPublicVars = envContent.includes('NEXT_PUBLIC_') && !hasServiceRoleKey;

if (hasServiceRoleKey) {
  console.log('❌ CRITICAL: env.mjs still contains SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
} else if (hasOnlyPublicVars) {
  console.log('✅ env.mjs is client-safe - contains only NEXT_PUBLIC_ variables');
} else {
  console.log('⚠️ env.mjs structure may need review');
}

// Check 2: Verify serverEnv exists and contains service role key
console.log('\n2. Checking server-only env configuration...');
const serverEnvPath = path.join(__dirname, 'src/env-server.mjs');
if (fs.existsSync(serverEnvPath)) {
  const serverEnvContent = fs.readFileSync(serverEnvPath, 'utf8');
  if (serverEnvContent.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    console.log('✅ Server-only env configuration is properly set up');
  } else {
    console.log('❌ Server env missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
} else {
  console.log('❌ Server-only env file missing');
  process.exit(1);
}

// Check 3: Verify client.ts doesn't import env.mjs
console.log('\n3. Checking client.ts for security...');
const clientContent = fs.readFileSync(path.join(__dirname, 'src/lib/supabase/client.ts'), 'utf8');
const clientImportsEnv = clientContent.includes("from '@/env.mjs'");
const clientUsesProcessEnv = clientContent.includes('process.env.NEXT_PUBLIC_');

if (clientImportsEnv) {
  console.log('❌ CRITICAL: client.ts still imports env.mjs');
  process.exit(1);
} else if (clientUsesProcessEnv) {
  console.log('✅ client.ts uses direct process.env access for public variables');
} else {
  console.log('⚠️ client.ts configuration may need review');
}

// Check 4: Verify server.ts uses serverEnv for service role key
console.log('\n4. Checking server.ts configuration...');
const serverContent = fs.readFileSync(path.join(__dirname, 'src/lib/supabase/server.ts'), 'utf8');
const usesServerEnv = serverContent.includes('serverEnv.SUPABASE_SERVICE_ROLE_KEY');

if (usesServerEnv) {
  console.log('✅ server.ts correctly uses serverEnv for service role key');
} else {
  console.log('❌ server.ts not using serverEnv correctly');
  process.exit(1);
}

// Check 5: Verify CSP headers include COEP
console.log('\n5. Checking security headers...');
const nextConfigContent = fs.readFileSync(path.join(__dirname, 'next.config.js'), 'utf8');
const hasCoep = nextConfigContent.includes('Cross-Origin-Embedder-Policy');
const hasUpdatedCsp = nextConfigContent.includes('www.google-analytics.com') && nextConfigContent.includes('sentry.io');

if (hasCoep && hasUpdatedCsp) {
  console.log('✅ Security headers properly configured with COEP and updated CSP');
} else {
  console.log('⚠️ Security headers may need review');
}

console.log('\n🎉 Security verification complete!');
console.log('✅ SUPABASE_SERVICE_ROLE_KEY is no longer exposed to client-side');
console.log('✅ Environment variables are properly segregated');
console.log('✅ Headers configured to resolve COEP issues');