/**
 * Apply fix for handle_new_user function
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function applyFix() {
  console.log('🔧 Applying handle_new_user fix...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Read and execute the fix SQL
    const fixSQL = fs.readFileSync('fix-handle-new-user-search-path.sql', 'utf8');
    
    console.log('Applying SQL fix...');
    const { data, error } = await adminClient.rpc('exec', { sql: fixSQL });
    
    if (error) {
      // Try alternative approach - run the function creation directly
      console.log('Direct exec failed, trying direct function creation...');
      
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS trigger AS $$
        BEGIN
            INSERT INTO public.users (
                id, email, role, first_name, last_name, phone, language, status, created_at, updated_at
            ) VALUES (
                NEW.id,
                NEW.email,
                COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'client'::public.user_role),
                COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
                COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
                NEW.raw_user_meta_data ->> 'phone',
                COALESCE((NEW.raw_user_meta_data ->> 'language')::public.language, 'en'::public.language),
                'active'::public.user_status,
                NOW(),
                NOW()
            )
            ON CONFLICT (email) DO NOTHING;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';
      `;
      
      // We can't execute raw SQL directly, so let's try to fix it by creating a migration
      console.log('Creating migration to fix the function...');
      
      // Write a new migration file
      const migrationContent = `-- Fix handle_new_user function search_path issue
-- Migration: ${new Date().toISOString().replace(/[:.]/g, '-')}

${createFunctionSQL}

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile with proper enum casting, conflict resolution, and secure search_path setting';
`;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace('T', '').replace('Z', '').substring(0, 14);
      const migrationFile = `supabase/migrations/${timestamp}_fix_handle_new_user_search_path.sql`;
      
      fs.writeFileSync(migrationFile, migrationContent);
      console.log(`✅ Created migration file: ${migrationFile}`);
      
      console.log('\nTo apply this fix:');
      console.log('1. Run: npx supabase db push');
      console.log('2. Or manually run the SQL in your Supabase dashboard');
      
    } else {
      console.log('✅ Fix applied successfully:', data);
    }

  } catch (error) {
    console.error('❌ Error applying fix:', error);
  }
}

applyFix().catch(console.error);