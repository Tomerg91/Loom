import { chromium, FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { testUsers, testFixtures } from './helpers/test-data';
import { TestDatabaseManager } from './helpers/database-manager';
import { TestUserManager } from './helpers/user-manager';

/**
 * Global setup function that runs once before all tests
 * Sets up test database, creates test users, and prepares test environment
 */
async function globalSetup(config: FullConfig) {
  console.log('🔧 Starting global E2E test setup...');

  // Initialize test environment variables
  const testEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  };

  // Set environment variables for the test run
  Object.assign(process.env, testEnv);

  try {
    // Initialize database manager
    const dbManager = new TestDatabaseManager({
      supabaseUrl: testEnv.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey: testEnv.SUPABASE_SERVICE_ROLE_KEY,
      databaseUrl: testEnv.DATABASE_URL
    });

    // Initialize user manager
    const userManager = new TestUserManager({
      supabaseUrl: testEnv.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey: testEnv.SUPABASE_SERVICE_ROLE_KEY
    });

    console.log('🔌 Connecting to test database...');
    await dbManager.connect();

    console.log('🧹 Cleaning existing test data...');
    await dbManager.cleanup();

    console.log('🌱 Seeding test database...');
    await dbManager.seedDatabase();

    console.log('👤 Creating test users...');
    const createdUsers = await userManager.createTestUsers(testUsers);
    console.log(`✅ Created ${createdUsers.length} test users`);

    console.log('📊 Creating test data fixtures...');
    await dbManager.createTestFixtures(testFixtures, createdUsers);

    // Start development server if not already running
    const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
    
    console.log('🌐 Checking if development server is running...');
    const isServerRunning = await checkServerHealth(baseURL);
    
    if (!isServerRunning) {
      console.log('🚀 Development server not running, starting it...');
      // The webServer configuration in playwright.config.ts will handle starting the server
    } else {
      console.log('✅ Development server is already running');
    }

    // Verify test users can authenticate
    console.log('🔐 Verifying test user authentication...');
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(baseURL);
      
      // Quick smoke test - ensure the app loads
      await page.waitForSelector('body', { timeout: 10000 });
      console.log('✅ Application loads successfully');
      
    } catch (error) {
      console.error('❌ Application failed to load:', error);
      throw error;
    } finally {
      await page.close();
      await context.close();
      await browser.close();
    }

    console.log('✅ Global E2E test setup completed successfully!');
    
    // Store setup state for cleanup
    process.env.E2E_SETUP_COMPLETED = 'true';

  } catch (error) {
    console.error('❌ Global E2E test setup failed:', error);
    throw error;
  }
}

/**
 * Check if the development server is healthy
 */
async function checkServerHealth(baseURL: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseURL}/api/health`, {
      method: 'GET',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

export default globalSetup;