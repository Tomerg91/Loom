/**
 * Test handle_new_user function specifically
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testHandleNewUser() {
  console.log('🔍 Testing handle_new_user function...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const testEmail = `test-handle-user-${Date.now()}@example.com`;
  
  try {
    console.log('1. Creating user through Supabase Auth...');
    
    // Create user with more detailed error handling
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        first_name: 'Test',
        last_name: 'User',
        role: 'client',
        language: 'en'
      }
    });

    if (authError) {
      console.error('❌ Auth creation error:', JSON.stringify(authError, null, 2));
      return;
    }

    console.log('✅ User created in auth.users table:', authData.user.id);
    console.log('   Email:', authData.user.email);
    console.log('   Metadata:', JSON.stringify(authData.user.user_metadata, null, 2));

    // Wait for trigger to execute
    console.log('\n2. Waiting for trigger to execute...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if profile was created
    console.log('3. Checking if profile was created in users table...');
    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile fetch error:', JSON.stringify(profileError, null, 2));
      
      // Let's check if the user exists at all in the users table
      console.log('\n4. Checking all users with similar email...');
      const { data: similarUsers, error: similarError } = await adminClient
        .from('users')
        .select('*')
        .like('email', `%${testEmail.split('@')[0]}%`);
      
      if (similarError) {
        console.error('❌ Similar users fetch error:', similarError);
      } else {
        console.log('Similar users found:', similarUsers);
      }

      // Try to manually insert the user to see if there are table-level issues
      console.log('\n5. Attempting manual insert...');
      const { data: manualInsert, error: manualError } = await adminClient
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          role: 'client',
          first_name: 'Test',
          last_name: 'User',
          language: 'en',
          status: 'active'
        })
        .select();

      if (manualError) {
        console.error('❌ Manual insert error:', JSON.stringify(manualError, null, 2));
      } else {
        console.log('✅ Manual insert succeeded:', manualInsert);
      }

    } else {
      console.log('✅ Profile created successfully!');
      console.log('   Profile data:', JSON.stringify(profile, null, 2));
    }

    // Check the current handle_new_user function definition
    console.log('\n6. Checking function definition...');
    const { data: funcDef, error: funcError } = await adminClient
      .rpc('db_health_check');

    if (funcError) {
      console.error('❌ Health check error:', funcError);
    } else {
      console.log('✅ Health check passed:', funcDef);
    }

    // Cleanup
    console.log('\n7. Cleaning up...');
    await adminClient.auth.admin.deleteUser(authData.user.id);
    console.log('✅ Cleanup completed');

  } catch (error) {
    console.error('❌ Overall error:', error);
  }
}

testHandleNewUser().catch(console.error);