const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Missing Supabase configuration. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function testJWTSetup() {
  try {
    console.log('Testing JWT role setup...');
    
    // Test if we can call the test function
    const { data: testResults, error: testError } = await supabase.rpc('test_jwt_role_setup');
    
    if (testError) {
      console.error('Error running test (this is expected if migration not yet applied):', testError.message);
      console.log('\nThis indicates the migration needs to be applied manually through Supabase Dashboard.');
      return;
    }
    
    if (testResults) {
      console.log('\n=== JWT Role Setup Test Results ===');
      testResults.forEach(result => {
        const statusIcon = result.status === 'PASS' ? '✅' : '❌';
        console.log(`${statusIcon} ${result.test_name}: ${result.status}`);
        console.log(`   ${result.details}`);
      });
      
      const allPassed = testResults.every(result => result.status === 'PASS');
      
      if (allPassed) {
        console.log('\n🎉 All tests passed! JWT role setup is complete.');
      } else {
        console.log('\n⚠️  Some tests failed. Please check the migration.');
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testJWTSetup();