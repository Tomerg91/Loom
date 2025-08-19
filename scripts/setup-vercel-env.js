#!/usr/bin/env node

/**
 * Vercel Environment Variables Setup Script
 * 
 * This script provides instructions for setting up required environment variables
 * in Vercel for the Loom coaching platform deployment.
 */

import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';

const REQUIRED_VARIABLES = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Your Supabase project URL',
    example: 'https://your-project-id.supabase.co',
    required: true,
    scope: 'client'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Your Supabase anonymous public key',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: true,
    scope: 'client'
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    description: 'Your deployed application URL',
    example: 'https://loom-bay.vercel.app',
    required: true,
    scope: 'client'
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Your Supabase service role key (server-only)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: true,
    scope: 'server'
  },
  {
    name: 'DATABASE_URL',
    description: 'PostgreSQL connection string for direct database access',
    example: 'postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres',
    required: true,
    scope: 'server'
  }
];

const OPTIONAL_VARIABLES = [
  {
    name: 'NEXT_PUBLIC_SENTRY_DSN',
    description: 'Sentry DSN for error monitoring',
    example: 'https://your-dsn@sentry.io/project-id'
  },
  {
    name: 'NEXT_PUBLIC_GOOGLE_ANALYTICS_ID',
    description: 'Google Analytics tracking ID',
    example: 'G-XXXXXXXXXX'
  },
  {
    name: 'SMTP_HOST',
    description: 'Email server hostname',
    example: 'smtp.gmail.com'
  },
  {
    name: 'SMTP_USER',
    description: 'Email server username',
    example: 'your-email@gmail.com'
  },
  {
    name: 'SMTP_PASSWORD',
    description: 'Email server password',
    example: 'your-app-password'
  }
];

async function checkLocalEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    await fs.access(envPath);
    
    const envContent = await fs.readFile(envPath, 'utf-8');
    const localVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        localVars[key.trim()] = value.trim();
      }
    });
    
    return localVars;
  } catch {
    return {};
  }
}

function printHeader() {
  console.log(chalk.cyan.bold('🚀 Loom App - Vercel Environment Variables Setup'));
  console.log(chalk.cyan('═'.repeat(60)));
  console.log();
}

function printRequiredVariables(localVars) {
  console.log(chalk.yellow.bold('📋 Required Environment Variables'));
  console.log(chalk.yellow('─'.repeat(40)));
  console.log();
  
  REQUIRED_VARIABLES.forEach(variable => {
    const hasLocal = localVars[variable.name];
    const status = hasLocal 
      ? chalk.green('✓ Found in .env.local') 
      : chalk.red('✗ Missing');
    
    console.log(chalk.white.bold(`${variable.name}`));
    console.log(`  Description: ${variable.description}`);
    console.log(`  Scope: ${variable.scope}`);
    console.log(`  Status: ${status}`);
    console.log(`  Example: ${chalk.gray(variable.example)}`);
    console.log();
  });
}

function printOptionalVariables() {
  console.log(chalk.blue.bold('🔧 Optional Environment Variables'));
  console.log(chalk.blue('─'.repeat(40)));
  console.log();
  
  OPTIONAL_VARIABLES.forEach(variable => {
    console.log(chalk.white.bold(`${variable.name}`));
    console.log(`  Description: ${variable.description}`);
    console.log(`  Example: ${chalk.gray(variable.example)}`);
    console.log();
  });
}

function printVercelInstructions() {
  console.log(chalk.green.bold('🌐 Vercel Setup Instructions'));
  console.log(chalk.green('─'.repeat(40)));
  console.log();
  
  console.log(chalk.white.bold('Method 1: Vercel Dashboard'));
  console.log('1. Go to https://vercel.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Navigate to Settings → Environment Variables');
  console.log('4. Add each required variable with its value');
  console.log('5. Select appropriate environments (Production, Preview, Development)');
  console.log('6. Save and redeploy');
  console.log();
  
  console.log(chalk.white.bold('Method 2: Vercel CLI'));
  console.log('Install CLI: npm i -g vercel');
  console.log('Login: vercel login');
  console.log('Add variables:');
  REQUIRED_VARIABLES.forEach(variable => {
    console.log(`  vercel env add ${variable.name}`);
  });
  console.log('Deploy: vercel --prod');
  console.log();
}

function printSupabaseInstructions() {
  console.log(chalk.magenta.bold('🗄️ Getting Supabase Values'));
  console.log(chalk.magenta('─'.repeat(40)));
  console.log();
  
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Navigate to Settings → API');
  console.log('4. Copy the values:');
  console.log('   - Project URL → NEXT_PUBLIC_SUPABASE_URL');
  console.log('   - anon/public key → NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('   - service_role key → SUPABASE_SERVICE_ROLE_KEY');
  console.log();
  console.log('5. For DATABASE_URL:');
  console.log('   - Go to Settings → Database');
  console.log('   - Copy the PostgreSQL connection string');
  console.log();
}

function printTroubleshooting() {
  console.log(chalk.red.bold('🔍 Troubleshooting'));
  console.log(chalk.red('─'.repeat(40)));
  console.log();
  
  console.log('Common Issues:');
  console.log('• Variables not taking effect → Clear Vercel cache and redeploy');
  console.log('• "Missing required client environment variable" error → Check spelling and restart');
  console.log('• Supabase connection failed → Verify URL and keys are correct');
  console.log('• Build failing → Ensure all required variables are set for all environments');
  console.log();
  
  console.log('Verification Commands:');
  console.log('• Check deployment logs: vercel logs');
  console.log('• Test locally: npm run dev');
  console.log('• Verify environment: vercel env ls');
  console.log();
}

function printFooter() {
  console.log(chalk.cyan('═'.repeat(60)));
  console.log(chalk.cyan.bold('📚 Additional Resources:'));
  console.log('• Vercel Environment Variables: https://vercel.com/docs/concepts/projects/environment-variables');
  console.log('• Supabase Setup: https://supabase.com/docs/guides/getting-started');
  console.log('• Project Documentation: ./DEPLOYMENT_TROUBLESHOOTING.md');
  console.log();
  console.log(chalk.green('Ready to deploy? Run: npm run build && vercel --prod'));
}

async function main() {
  try {
    const localVars = await checkLocalEnv();
    
    printHeader();
    printRequiredVariables(localVars);
    printOptionalVariables();
    printVercelInstructions();
    printSupabaseInstructions();
    printTroubleshooting();
    printFooter();
    
  } catch (error) {
    console.error(chalk.red('Error running setup script:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { REQUIRED_VARIABLES, OPTIONAL_VARIABLES };