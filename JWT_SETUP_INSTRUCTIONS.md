# JWT Role Claims Setup Instructions

## Overview
This document provides step-by-step instructions to configure JWT tokens to include user roles, which is required for the RLS (Row Level Security) policies to work correctly.

## Current Status
- ✅ Migration file created: `/supabase/migrations/20250817170000_setup_jwt_role_claims.sql`
- ✅ Test functions created
- ❌ Migration needs to be applied to database
- ❌ Custom Access Token Hook needs to be configured in Supabase Auth

## Step 1: Apply the Database Migration

### Option A: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/mrhszadupxbtyycvcoux
   - Navigate to: `SQL Editor`

2. **Execute the Migration**
   - Copy the entire contents of `/supabase/migrations/20250817170000_setup_jwt_role_claims.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute all the functions

3. **Verify Setup**
   - After executing, run this test query in the SQL Editor:
   ```sql
   SELECT * FROM public.test_jwt_role_setup();
   ```
   - All tests should return `PASS` status

### Option B: Via Supabase CLI (If Connection Issues Resolved)

1. **Fix Database Connection**
   - Ensure you have the correct database password
   - Or set up proper service role key authentication

2. **Apply Migration**
   ```bash
   npm run supabase:push
   ```

## Step 2: Configure Custom Access Token Hook

### In Supabase Dashboard:

1. **Navigate to Auth Settings**
   - Go to: `Authentication > Settings`
   - Scroll down to: `Custom Access Token Hook`

2. **Configure the Hook**
   - **Enable**: Toggle the Custom Access Token Hook to `ON`
   - **Function Name**: Enter `public.custom_access_token_hook`
   - **Save** the configuration

### What This Does:
- Supabase Auth will call `public.custom_access_token_hook(event)` for every token generation
- The function will look up the user's role from the `users` table
- The role will be added to the JWT claims as `role`
- RLS policies using `auth.jwt() ->> 'role'` will now work correctly

## Step 3: Test the Setup

### Automated Test

Run the test script to verify everything is working:

```bash
node test_jwt_setup.js
```

### Manual Verification

1. **Check Functions Exist**
   ```sql
   SELECT routine_name, routine_schema 
   FROM information_schema.routines 
   WHERE routine_name IN (
     'custom_access_token_hook',
     'update_user_auth_metadata',
     'test_jwt_role_setup'
   );
   ```

2. **Test Role Assignment**
   ```sql
   -- Check if a user has a role
   SELECT id, email, role FROM public.users LIMIT 5;
   
   -- Test the custom access token hook manually
   SELECT public.custom_access_token_hook(
     '{"user_id": "YOUR_USER_ID", "claims": {}}'::jsonb
   );
   ```

3. **Verify Trigger Works**
   ```sql
   -- Update a user's role and check if metadata syncs
   UPDATE public.users 
   SET role = 'admin' 
   WHERE email = 'test@example.com';
   
   -- Check if auth metadata was updated
   SELECT raw_user_meta_data 
   FROM auth.users 
   WHERE email = 'test@example.com';
   ```

## Step 4: Sync Existing Users

The migration automatically syncs all existing user roles to auth metadata. If needed, you can manually sync a specific user:

```sql
SELECT public.sync_user_role_to_jwt('USER_ID_HERE');
```

## Expected Results

After completing this setup:

1. **JWT Tokens Include Roles**
   - All new JWT tokens will include the user's role in claims
   - Existing tokens will include roles after refresh

2. **RLS Policies Work**
   - Policies using `auth.jwt() ->> 'role' = 'admin'` will function correctly
   - No more RLS infinite recursion errors

3. **Automatic Sync**
   - When user roles change, JWT metadata automatically updates
   - No manual intervention required for role changes

## Troubleshooting

### If Tests Fail:

1. **"Function does not exist" Error**
   - The migration hasn't been applied
   - Follow Step 1 to apply the migration

2. **"Custom Access Token Hook not working" Error**
   - Check that the hook is enabled in Supabase Auth settings
   - Verify the function name is exactly: `public.custom_access_token_hook`

3. **"Role not appearing in JWT" Error**
   - Check that users have roles assigned in the `users` table
   - Run the sync function manually
   - Try logging out and back in to get a fresh token

### Manual Sync All Users:

If needed, you can sync all existing users manually:

```sql
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id, role FROM public.users WHERE role IS NOT NULL LOOP
    PERFORM public.update_user_auth_metadata(user_record.id, user_record.role);
  END LOOP;
END $$;
```

## Security Notes

- The `custom_access_token_hook` function runs with `SECURITY DEFINER` privileges
- It only reads from the `users` table and doesn't modify data
- The function is granted execute permissions to necessary roles only
- All functions include proper error handling and validation

## Next Steps

Once this setup is complete:

1. Test the application to ensure RLS policies work correctly
2. Verify that role-based access control functions as expected
3. Monitor for any JWT-related errors in the application logs
4. Consider implementing role change notifications for better user experience

## Files Created

- `/supabase/migrations/20250817170000_setup_jwt_role_claims.sql` - Main migration file
- `/test_jwt_setup.js` - Test script to verify setup
- `/apply_jwt_migration.js` - Alternative migration script
- This instruction file

## Support

If you encounter issues:
1. Check the test results with `node test_jwt_setup.js`
2. Review Supabase logs in the dashboard
3. Verify all configuration steps were completed
4. Ensure the Custom Access Token Hook is properly configured