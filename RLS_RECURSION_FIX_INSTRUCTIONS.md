# 🚨 CRITICAL: RLS Infinite Recursion Fix Instructions

## Problem Summary
The Supabase database has critical RLS (Row Level Security) infinite recursion issues. Multiple policies query the `users` table from within policies **ON** the `users` table, causing infinite loops and making the database inaccessible.

### Problematic Pattern
```sql
-- ❌ CAUSES INFINITE RECURSION
CREATE POLICY "Admins can view all users" ON users
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
    );
```

## 🔧 Fix Instructions

### Step 1: Execute the Fix Script
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open the file: `fix_rls_recursion_manual.sql`
3. Copy and paste the entire content into the SQL Editor
4. Execute the script
5. **⚠️ IMPORTANT**: The script will drop and recreate policies - ensure you understand the changes

### Step 2: Verify the Fix
1. Open the file: `verify_rls_fix.sql`
2. Execute the verification queries one by one in the SQL Editor
3. Check that:
   - Policies are marked as "✅ FIXED"
   - Basic queries complete without hanging
   - No recursive policies remain

### Step 3: JWT Role Setup (Critical)
The fix assumes that user roles are stored in JWT claims. If they're not:

#### Option A: Custom Access Token Hook
```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
  DECLARE
    claims jsonb;
    user_role text;
  BEGIN
    -- Fetch the user role from the users table
    SELECT role INTO user_role FROM public.users WHERE id = (event->>'user_id')::uuid;
    
    claims := event->'claims';
    
    IF user_role IS NOT NULL THEN
      claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
    ELSE
      claims := jsonb_set(claims, '{role}', 'null');
    END IF;
    
    event := jsonb_set(event, '{claims}', claims);
    
    RETURN event;
  END;
$$;
```

Then set this hook in: **Dashboard** → **Authentication** → **Hooks** → **Custom Access Token**

#### Option B: Alternative Policy Design
If you can't use JWT claims, modify policies to use different approaches:
- Store role in a separate admin table
- Use auth.uid() with direct role checks only where necessary
- Implement role checking through application logic

## 📋 Files Affected

### Fixed Policies
- **users**: `"Admins can view all users"`
- **sessions**: Multiple admin-related policies
- **coach_notes**: `"Coaches can view their own notes"`
- **reflections**: `"Clients can view their own reflections"`
- **notifications**: `"System can create notifications"`
- **coach_availability**: Admin policies
- **security_audit_log**: `"Admins can view audit logs"`
- **mfa_admin_dashboard**: `"Admins can view MFA dashboard"` (if exists)

### Helper Functions Created
- `public.is_admin()` - Check if current user is admin
- `public.is_coach()` - Check if current user is coach  
- `public.is_client()` - Check if current user is client
- `public.get_user_role()` - Get current user's role

## 🧪 Testing

### Quick Test
```sql
-- This should complete quickly, not hang:
SELECT COUNT(*) FROM users LIMIT 1;
```

### Comprehensive Testing
Run all queries in `verify_rls_fix.sql` to ensure:
1. No infinite recursion
2. Proper access control
3. JWT role availability
4. Helper functions work

## ⚠️ Important Notes

1. **Backup First**: This changes critical security policies
2. **Test Thoroughly**: Verify all user roles can access appropriate data
3. **JWT Setup**: Ensure roles are in JWT claims or implement alternative
4. **Application Updates**: May need to update app code if role checking logic changes

## 🔍 Troubleshooting

### If Queries Still Hang
1. Check that all policies were properly updated
2. Verify JWT contains role claim
3. Look for any missed recursive policies
4. Consider temporary policy disabling for debugging

### If Access Control Broken
1. Verify JWT role setup
2. Check policy definitions in `pg_policies`
3. Test with different user roles
4. Review application authentication flow

## 📞 Support
If issues persist after following these instructions:
1. Check Supabase logs for specific errors
2. Test with a simple non-admin user first
3. Gradually re-enable policies to isolate issues
4. Consider consulting Supabase documentation on RLS best practices

## Migration Files
- **Fix Script**: `fix_rls_recursion_manual.sql`
- **Verification**: `verify_rls_fix.sql`  
- **Migration**: `supabase/migrations/20250817160000_fix_rls_recursion.sql`

Execute the manual SQL fix first, then apply the migration file through your normal deployment process.