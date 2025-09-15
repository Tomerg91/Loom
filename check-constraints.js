/**
 * Check constraints on users table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkConstraints() {
  console.log('🔍 Checking constraints on users table...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Check foreign key constraints
    const { data: constraints, error: constraintsError } = await adminClient
      .rpc('exec', { sql: `
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
        FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='users';
      ` });

    if (constraintsError) {
      console.log('Cannot check constraints via RPC, checking table structure instead...');
      
      // Try to get table info
      const { data: tableInfo, error: tableError } = await adminClient
        .from('users')
        .select('*')
        .limit(1);
      
      if (tableError) {
        console.error('Table error:', tableError);
      } else {
        console.log('Table accessible, issue might be with manual ID insertion');
        console.log('Sample data:', tableInfo);
      }
    } else {
      console.log('Foreign key constraints:', constraints);
    }

    // Try with auth.users ID instead
    console.log('\nTrying alternative approach - creating auth user first...');
    
    const testEmail = `constraint-test-${Date.now()}@example.com`;
    
    // Create auth user first
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

    if (authError) {
      console.error('Auth creation error:', authError);
    } else {
      console.log('✅ Auth user created:', authData.user.id);
      
      // Now try to manually insert into users table with auth ID
      const { data: userData, error: userError } = await adminClient
        .from('users')
        .insert({
          id: authData.user.id,  // Use auth user ID
          email: testEmail,
          first_name: 'Test',
          last_name: 'User',
          role: 'client',
          language: 'en',
          status: 'active'
        })
        .select()
        .single();

      if (userError) {
        console.error('❌ User insert error:', userError);
      } else {
        console.log('✅ User inserted successfully:', userData);
        
        // Cleanup
        await adminClient.from('users').delete().eq('id', authData.user.id);
        await adminClient.auth.admin.deleteUser(authData.user.id);
        console.log('✅ Cleanup completed');
      }
    }

  } catch (error) {
    console.error('❌ Overall error:', error);
  }
}

checkConstraints().catch(console.error);