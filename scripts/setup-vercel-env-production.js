#!/usr/bin/env node

/**
 * Vercel Environment Variables Setup Script
 * 
 * This script helps configure the required environment variables for production deployment.
 * Run this after deploying to Vercel to fix the "MISSING_SUPABASE_URL" error.
 * 
 * Usage:
 *   node scripts/setup-vercel-env-production.js
 * 
 * Or manually set these variables in Vercel Dashboard:
 * Project Settings → Environment Variables
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Vercel Environment Variables Setup for Loom App\n');

// Required environment variables for production
const requiredEnvVars = {
  'NEXT_PUBLIC_SUPABASE_URL': {
    description: 'Your Supabase project URL',
    example: 'https://your-project.supabase.co',
    required: true
  },
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
    description: 'Your Supabase anonymous/public key',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: true
  },
  'SUPABASE_SERVICE_ROLE_KEY': {
    description: 'Your Supabase service role key (server-side only)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: true
  },
  'NEXT_PUBLIC_SITE_URL': {
    description: 'Your deployed site URL',
    example: 'https://loom-app.vercel.app',
    required: true
  },
  'NEXTAUTH_SECRET': {
    description: 'Random secret for NextAuth (if using)',
    example: 'your-random-secret-string',
    required: false
  }
};

function getLocalEnvValue(key) {
  try {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].replace(/"/g, '') : null;
  } catch (error) {
    return null;
  }
}

function hasVercelCLI() {
  try {
    execSync('vercel --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function setupEnvironmentVariables() {
  console.log('📋 Checking current environment variables...\n');

  const missingVars = [];
  const commands = [];

  for (const [key, config] of Object.entries(requiredEnvVars)) {
    const localValue = getLocalEnvValue(key);
    
    if (!localValue && config.required) {
      missingVars.push(key);
      console.log(`❌ Missing: ${key}`);
      console.log(`   Description: ${config.description}`);
      console.log(`   Example: ${config.example}\n`);
    } else if (localValue) {
      console.log(`✅ Found: ${key} = ${localValue.substring(0, 20)}...`);
      
      if (hasVercelCLI()) {
        commands.push(`vercel env add ${key} production`);
      }
    } else {
      console.log(`⚠️  Optional: ${key} (${config.description})`);
    }
  }

  if (missingVars.length > 0) {
    console.log('\n🔥 CRITICAL: Missing required environment variables!');
    console.log('\nPlease set these variables in your .env.local file first, then run this script again.');
    console.log('\nExample .env.local content:');
    console.log('----------------------------------------');
    for (const key of missingVars) {
      console.log(`${key}=${requiredEnvVars[key].example}`);
    }
    console.log('----------------------------------------\n');
    return false;
  }

  if (!hasVercelCLI()) {
    console.log('\n📱 Vercel CLI not found. Please install it:');
    console.log('   npm i -g vercel');
    console.log('\nThen run: vercel login');
    console.log('\nOr manually set variables in Vercel Dashboard:');
    console.log('   https://vercel.com/dashboard → Your Project → Settings → Environment Variables\n');
    return false;
  }

  console.log('\n🚀 Setting up Vercel environment variables...\n');

  try {
    // First, ensure we're linked to the correct Vercel project
    console.log('🔗 Linking to Vercel project...');
    execSync('vercel link --confirm', { stdio: 'inherit' });

    // Set each environment variable
    for (const [key] of Object.entries(requiredEnvVars)) {
      const localValue = getLocalEnvValue(key);
      if (localValue) {
        console.log(`\n📝 Setting ${key}...`);
        try {
          // Use echo to pipe the value to vercel env add
          execSync(`echo "${localValue}" | vercel env add ${key} production`, { stdio: 'inherit' });
          console.log(`✅ ${key} set successfully`);
        } catch (error) {
          console.log(`⚠️  ${key} might already exist or failed to set`);
        }
      }
    }

    console.log('\n🎉 Environment variables setup complete!');
    console.log('\n🚀 Now deploy to production:');
    console.log('   vercel --prod');
    console.log('\n📊 Check your deployment:');
    console.log('   vercel ls');
    
    return true;
  } catch (error) {
    console.error('\n❌ Error setting up environment variables:', error.message);
    console.log('\n💡 Manual setup instructions:');
    console.log('1. Go to https://vercel.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to Settings → Environment Variables');
    console.log('4. Add each required variable for "Production" environment');
    return false;
  }
}

// Main execution
if (require.main === module) {
  setupEnvironmentVariables()
    .then(success => {
      if (success) {
        console.log('\n✨ Setup completed successfully! Deploy with: vercel --prod');
      } else {
        console.log('\n💻 Please complete the setup manually and try again.');
      }
    })
    .catch(error => {
      console.error('\n💥 Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { setupEnvironmentVariables, requiredEnvVars };