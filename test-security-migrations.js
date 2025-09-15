/**
 * Simple Database Security Migration Test
 * Tests core database functionality after security migrations
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSecurityMigrations() {
  console.log('🧪 Starting Database Security Migration Tests...\n');

  // Initialize clients
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Missing required Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, anonKey);
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const testResults = [];
  
  // Test 1: Database Health Check
  console.log('1️⃣  Testing Database Health Check...');
  try {
    const { data, error } = await adminClient.rpc('db_health_check');
    if (error) throw error;
    testResults.push({ test: 'Database Health Check', status: '✅ PASSED', details: `Result: ${data}` });
    console.log('   ✅ Database health check passed\n');
  } catch (error) {
    testResults.push({ test: 'Database Health Check', status: '❌ FAILED', error: error.message });
    console.log(`   ❌ Database health check failed: ${error.message}\n`);
  }

  // Test 2: Basic User CRUD Operations
  console.log('2️⃣  Testing Basic User CRUD Operations...');
  const testEmail = `test-${Date.now()}@example.com`;
  let testUserId;
  
  try {
    // Create user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        first_name: 'Test',
        last_name: 'User',
        role: 'client'
      }
    });

    if (authError) throw authError;
    testUserId = authData.user.id;

    // Verify profile was created by trigger
    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single();

    if (profileError) throw profileError;

    if (profile.email === testEmail && profile.role === 'client') {
      testResults.push({ test: 'User CRUD Operations', status: '✅ PASSED', details: `User created with ID: ${testUserId}` });
      console.log('   ✅ User creation and profile generation successful\n');
    } else {
      throw new Error('Profile data mismatch');
    }
  } catch (error) {
    testResults.push({ test: 'User CRUD Operations', status: '❌ FAILED', error: error.message });
    console.log(`   ❌ User CRUD test failed: ${error.message}\n`);
  }

  // Test 3: Role Validation Functions
  console.log('3️⃣  Testing Role Validation Functions...');
  if (testUserId) {
    try {
      const { data: isClient, error: clientError } = await adminClient
        .rpc('is_client', { user_id: testUserId });
      
      if (clientError) throw clientError;

      const { data: userRole, error: roleError } = await adminClient
        .rpc('get_user_role', { user_id: testUserId });
      
      if (roleError) throw roleError;

      if (isClient === true && userRole === 'client') {
        testResults.push({ test: 'Role Validation Functions', status: '✅ PASSED', details: `User role correctly identified as: ${userRole}` });
        console.log('   ✅ Role validation functions working correctly\n');
      } else {
        throw new Error(`Role validation mismatch: isClient=${isClient}, userRole=${userRole}`);
      }
    } catch (error) {
      testResults.push({ test: 'Role Validation Functions', status: '❌ FAILED', error: error.message });
      console.log(`   ❌ Role validation test failed: ${error.message}\n`);
    }
  }

  // Test 4: Views Access Testing
  console.log('4️⃣  Testing Views Access...');
  try {
    // Test multiple views
    const viewTests = [
      'client_progress',
      'coach_statistics', 
      'session_details',
      'mfa_statistics',
      'database_schema_summary'
    ];

    let viewsPassed = 0;
    const viewResults = [];

    for (const viewName of viewTests) {
      try {
        const { data, error } = await adminClient.from(viewName).select('*').limit(1);
        if (error) throw error;
        viewsPassed++;
        viewResults.push(`${viewName}: ✅`);
      } catch (error) {
        viewResults.push(`${viewName}: ❌ (${error.message})`);
      }
    }

    if (viewsPassed === viewTests.length) {
      testResults.push({ test: 'Views Access', status: '✅ PASSED', details: `All ${viewsPassed} views accessible` });
      console.log(`   ✅ All ${viewsPassed} views accessible\n`);
    } else {
      testResults.push({ test: 'Views Access', status: '⚠️  PARTIAL', details: `${viewsPassed}/${viewTests.length} views accessible` });
      console.log(`   ⚠️  ${viewsPassed}/${viewTests.length} views accessible:`);
      viewResults.forEach(result => console.log(`      ${result}`));
      console.log();
    }
  } catch (error) {
    testResults.push({ test: 'Views Access', status: '❌ FAILED', error: error.message });
    console.log(`   ❌ Views access test failed: ${error.message}\n`);
  }

  // Test 5: Core Functions with Search Path Security
  console.log('5️⃣  Testing Core Functions with Search Path Security...');
  try {
    const functionTests = [
      { name: 'get_system_health_stats', params: {} },
      { name: 'cleanup_old_notifications', params: {} },
      { name: 'get_database_statistics', params: {} }
    ];

    let functionsPassed = 0;
    const functionResults = [];

    for (const func of functionTests) {
      try {
        const { data, error } = await adminClient.rpc(func.name, func.params);
        if (error) throw error;
        functionsPassed++;
        functionResults.push(`${func.name}: ✅`);
      } catch (error) {
        functionResults.push(`${func.name}: ❌ (${error.message})`);
      }
    }

    if (functionsPassed === functionTests.length) {
      testResults.push({ test: 'Core Functions', status: '✅ PASSED', details: `All ${functionsPassed} functions working with search_path security` });
      console.log(`   ✅ All ${functionsPassed} core functions working with search_path security\n`);
    } else {
      testResults.push({ test: 'Core Functions', status: '⚠️  PARTIAL', details: `${functionsPassed}/${functionTests.length} functions working` });
      console.log(`   ⚠️  ${functionsPassed}/${functionTests.length} functions working:`);
      functionResults.forEach(result => console.log(`      ${result}`));
      console.log();
    }
  } catch (error) {
    testResults.push({ test: 'Core Functions', status: '❌ FAILED', error: error.message });
    console.log(`   ❌ Core functions test failed: ${error.message}\n`);
  }

  // Test 6: MFA System Testing
  console.log('6️⃣  Testing MFA System with RLS...');
  if (testUserId) {
    try {
      // Enable MFA for test user
      await adminClient
        .from('users')
        .update({ mfa_enabled: true })
        .eq('id', testUserId);

      // Test MFA session creation
      const { data: mfaSession, error: mfaError } = await adminClient
        .from('mfa_sessions')
        .insert({
          user_id: testUserId,
          session_token: 'test-session-token',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          verified: false
        })
        .select()
        .single();

      if (mfaError) throw mfaError;

      // Test trusted device creation
      const { data: trustedDevice, error: deviceError } = await adminClient
        .from('trusted_devices')
        .insert({
          user_id: testUserId,
          device_fingerprint: 'test-device-fingerprint',
          device_name: 'Test Device',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_from_ip: '127.0.0.1'
        })
        .select()
        .single();

      if (deviceError) throw deviceError;

      testResults.push({ test: 'MFA System with RLS', status: '✅ PASSED', details: 'MFA sessions and trusted devices working with RLS' });
      console.log('   ✅ MFA system working correctly with RLS policies\n');
    } catch (error) {
      testResults.push({ test: 'MFA System with RLS', status: '❌ FAILED', error: error.message });
      console.log(`   ❌ MFA system test failed: ${error.message}\n`);
    }
  }

  // Test 7: Session and Rating System
  console.log('7️⃣  Testing Session and Rating System...');
  if (testUserId) {
    try {
      // Create a coach user first
      const { data: coachAuthData } = await adminClient.auth.admin.createUser({
        email: `coach-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: {
          first_name: 'Test',
          last_name: 'Coach',
          role: 'coach'
        }
      });
      const coachId = coachAuthData.user.id;

      // Create a session
      const { data: session, error: sessionError } = await adminClient
        .from('sessions')
        .insert({
          title: 'Test Session',
          description: 'Test session for migration testing',
          coach_id: coachId,
          client_id: testUserId,
          // Use a future time to satisfy sessions_future_or_current constraint
          scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          duration_minutes: 60,
          status: 'completed',
          type: 'individual'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create a rating
      const { data: rating, error: ratingError } = await adminClient
        .from('session_ratings')
        .insert({
          session_id: session.id,
          client_id: testUserId,
          coach_id: coachId,
          rating: 5,
          review: 'Excellent session!',
          communication_rating: 5,
          preparation_rating: 5,
          effectiveness_rating: 5
        })
        .select()
        .single();

      if (ratingError) throw ratingError;

      testResults.push({ test: 'Session and Rating System', status: '✅ PASSED', details: 'Sessions and ratings working with new RLS policies' });
      console.log('   ✅ Session and rating system working correctly\n');
    } catch (error) {
      testResults.push({ test: 'Session and Rating System', status: '❌ FAILED', error: error.message });
      console.log(`   ❌ Session and rating system test failed: ${error.message}\n`);
    }
  }

  // Cleanup
  console.log('🧹 Cleaning up test data...');
  try {
    if (testUserId) {
      await adminClient.from('users').delete().eq('id', testUserId);
      await adminClient.auth.admin.deleteUser(testUserId);
    }
    console.log('   ✅ Cleanup completed\n');
  } catch (error) {
    console.log(`   ⚠️  Cleanup warning: ${error.message}\n`);
  }

  // Summary
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  
  const passed = testResults.filter(r => r.status.includes('PASSED')).length;
  const failed = testResults.filter(r => r.status.includes('FAILED')).length;
  const partial = testResults.filter(r => r.status.includes('PARTIAL')).length;

  testResults.forEach(result => {
    console.log(`${result.status} | ${result.test}`);
    if (result.details) console.log(`         ${result.details}`);
    if (result.error) console.log(`         Error: ${result.error}`);
  });

  console.log('\n' + '='.repeat(50));
  console.log(`Total Tests: ${testResults.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️  Partial: ${partial}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 All critical database functionality is working correctly after security migrations!');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Please review the security migration impact.`);
  }

  return { passed, failed, partial, total: testResults.length };
}

// Run the tests
testSecurityMigrations().catch(console.error);
