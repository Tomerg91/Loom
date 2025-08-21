#!/usr/bin/env node

/**
 * Supabase Environment Variables Validation Script
 * 
 * This script validates Supabase configuration to help debug deployment issues.
 * Run with: node scripts/validate-supabase-env.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env files
function loadEnvFiles() {
  const envFiles = ['.env.local', '.env', '.env.production'];
  
  envFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const envContent = fs.readFileSync(fullPath, 'utf8');
      
      // Parse and set environment variables
      envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            // Remove quotes if present
            const cleanValue = value.replace(/^["'](.*)["']$/, '$1');
            process.env[key.trim()] = cleanValue;
          }
        }
      });
    }
  });
}

// Load environment variables before validation
loadEnvFiles();

function validateSupabaseEnv() {
  console.log('🔍 Validating Supabase Environment Configuration...\n');

  // Check for environment files
  const envFiles = ['.env.local', '.env', '.env.production'];
  const foundEnvFiles = [];
  
  envFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      foundEnvFiles.push(file);
      console.log(`✅ Found environment file: ${file}`);
    }
  });

  if (foundEnvFiles.length === 0) {
    console.log('⚠️  No environment files found (.env.local, .env, .env.production)');
  }

  console.log('\n📋 Environment Variables Status:');
  
  // Check required variables
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const issues = [];
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    
    if (!value) {
      console.log(`❌ ${varName}: MISSING`);
      issues.push(`Missing required environment variable: ${varName}`);
      return;
    }

    // Check for placeholder values
    const placeholderPatterns = [
      'your-project-id',
      'your-supabase',
      'MISSING_',
      'INVALID_',
      'your_'
    ];

    if (placeholderPatterns.some(pattern => value.includes(pattern))) {
      console.log(`❌ ${varName}: PLACEHOLDER VALUE (${value.substring(0, 30)}...)`);
      issues.push(`Environment variable ${varName} contains placeholder value`);
      return;
    }

    // Validate URLs
    if (varName.includes('URL')) {
      try {
        const url = new URL(value);
        if (!url.hostname.includes('supabase.co') && !url.hostname.includes('localhost')) {
          console.log(`⚠️  ${varName}: URL format warning (${value})`);
          console.log(`   Expected pattern: https://your-project.supabase.co`);
        } else {
          console.log(`✅ ${varName}: Valid URL (${value})`);
        }
      } catch (error) {
        console.log(`❌ ${varName}: INVALID URL FORMAT (${value})`);
        issues.push(`Invalid URL format for ${varName}: ${value}`);
      }
    }
    
    // Validate JWT tokens
    else if (varName.includes('KEY')) {
      if (!value.startsWith('eyJ')) {
        console.log(`❌ ${varName}: INVALID JWT FORMAT (should start with "eyJ")`);
        issues.push(`Invalid JWT format for ${varName}`);
      } else if (value.length < 100) {
        console.log(`⚠️  ${varName}: JWT appears unusually short`);
      } else {
        console.log(`✅ ${varName}: Valid JWT format`);
      }
    } else {
      console.log(`✅ ${varName}: Present (${value.substring(0, 20)}...)`);
    }
  });

  // Test Supabase connection
  console.log('\n🔗 Testing Supabase Connection...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey && !issues.length) {
    try {
      // Simple test: check if we can construct Supabase client
      const { createClient } = require('@supabase/supabase-js');
      const client = createClient(supabaseUrl, supabaseKey);
      console.log('✅ Supabase client created successfully');
      
      // Test basic connection
      client.from('profiles').select('count').limit(1).then(() => {
        console.log('✅ Supabase connection test successful');
      }).catch(error => {
        console.log(`⚠️  Supabase connection test failed: ${error.message}`);
        console.log('   This might be normal if RLS policies restrict access.');
      });
      
    } catch (error) {
      console.log(`❌ Failed to create Supabase client: ${error.message}`);
      issues.push(`Supabase client creation failed: ${error.message}`);
    }
  }

  // Summary
  console.log('\n📊 Validation Summary:');
  if (issues.length === 0) {
    console.log('🎉 All Supabase environment variables are properly configured!');
  } else {
    console.log(`❌ Found ${issues.length} issue(s):`);
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }

  console.log('\n💡 Tips for fixing issues:');
  console.log('   - Check your .env.local file in the project root');
  console.log('   - For production deployments, check your hosting platform environment variables');
  console.log('   - Get fresh keys from: https://supabase.com/dashboard → Project Settings → API');
  console.log('   - Ensure NEXT_PUBLIC_ prefix is used for client-side variables');
  
  return issues.length === 0;
}

if (require.main === module) {
  const isValid = validateSupabaseEnv();
  process.exit(isValid ? 0 : 1);
}

module.exports = { validateSupabaseEnv };