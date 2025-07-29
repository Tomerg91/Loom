import { FullConfig } from '@playwright/test';
import { TestDatabaseManager } from './helpers/database-manager';
import { TestUserManager } from './helpers/user-manager';

/**
 * Global teardown function that runs once after all tests complete
 * Cleans up test database, removes test users, and resets test environment
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global E2E test teardown...');

  // Only proceed if setup was completed
  if (!process.env.E2E_SETUP_COMPLETED) {
    console.log('ℹ️ No E2E setup detected, skipping teardown');
    return;
  }

  try {
    // Get test environment configuration
    const testEnv = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
    };

    // Initialize managers
    const dbManager = new TestDatabaseManager({
      supabaseUrl: testEnv.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey: testEnv.SUPABASE_SERVICE_ROLE_KEY,
      databaseUrl: testEnv.DATABASE_URL
    });

    const userManager = new TestUserManager({
      supabaseUrl: testEnv.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey: testEnv.SUPABASE_SERVICE_ROLE_KEY
    });

    console.log('🔌 Connecting to test database...');
    await dbManager.connect();

    console.log('🗑️ Removing test users...');
    await userManager.cleanupTestUsers();

    console.log('🧹 Cleaning test database...');
    await dbManager.cleanup();

    console.log('🔌 Disconnecting from test database...');
    await dbManager.disconnect();

    // Clean up environment variables
    delete process.env.E2E_SETUP_COMPLETED;

    console.log('✅ Global E2E test teardown completed successfully!');

  } catch (error) {
    console.error('❌ Global E2E test teardown failed:', error);
    
    // Log error but don't throw - teardown failures shouldn't fail the test run
    console.error('Warning: Some cleanup operations may not have completed properly');
    console.error('You may need to manually clean up test data');
  }
}

export default globalTeardown;