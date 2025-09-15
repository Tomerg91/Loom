/**
 * Debug User Creation Issue
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function debugUserCreation() {
  console.log('🔍 Debugging User Creation Issue...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const testEmail = `debug-${Date.now()}@example.com`;
  
  try {
    console.log('1. Testing handle_new_user function directly...');
    
    // First, let's see if we can manually call handle_new_user
    console.log('Testing if handle_new_user function exists...');
    
    console.log('2. Checking user creation with detailed error...');
    
    // Create user with more detailed error handling
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        first_name: 'Debug',
        last_name: 'User',
        role: 'client'
      }
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return;
    }

    console.log('✅ User created in auth:', authData.user.id);

    // Wait a moment for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if profile was created
    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      
      // Try to manually trigger the handle_new_user function
      console.log('3. Manually triggering handle_new_user...');
      const { data: manualResult, error: manualError } = await adminClient
        .rpc('handle_new_user');
      
      if (manualError) {
        console.error('Manual trigger error:', manualError);
      } else {
        console.log('Manual trigger result:', manualResult);
      }
    } else {
      console.log('✅ Profile created:', profile);
    }

    // Cleanup
    await adminClient.auth.admin.deleteUser(authData.user.id);

  } catch (error) {
    console.error('Overall error:', error);
  }
}

debugUserCreation().catch(console.error);