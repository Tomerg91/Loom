# MFA Source Migration Guide

**Phase 3: MFA Alignment - Application Code Update**

## Overview

This guide provides step-by-step instructions for updating application code to use the new unified MFA source of truth while maintaining backward compatibility.

## Migration Strategy

The database migration (`20251021000003_mfa_unified_source_non_destructive.sql`) has already created:

1. ✅ `get_user_mfa_status(user_id)` function - Returns comprehensive MFA status
2. ✅ `user_mfa_status_unified` materialized view - Cached MFA status for all users
3. ✅ Auto-sync trigger - Keeps `users.mfa_enabled` in sync with `user_mfa_methods`
4. ✅ Helper views - `users_with_active_mfa` and `mfa_status_discrepancies`

**Important**: The legacy `users.mfa_enabled` column still works and is automatically synced. You can deploy the database migration without breaking existing code.

## Trusted Device Tokens

- Successful MFA challenges can now persist a trusted-device token when the user enables "Remember this device". The API issues a random 32-byte token, stores its SHA-256 hash in `trusted_devices`, and returns the raw token inside an HTTP-only `mfa_trusted_device` cookie with `SameSite=strict`.
- Tokens expire after 30 days by default (`MFA_TRUSTED_DEVICE_TTL_DAYS` overrides the window). Each verification request mints a new token so the cookie rotates automatically; opting out of "Remember this device" clears the cookie immediately.
- Middleware validates the cookie on every request. Invalid or expired tokens are deleted server-side and the request falls back to the standard MFA enforcement path, so stale devices never bypass MFA.

## Application Code Patterns

### Pattern 1: Simple Boolean Check

#### Old Code (src/lib/database/mfa-admin.ts)

```typescript
// ❌ Old approach - reading users.mfa_enabled directly
const { data: user } = await supabase
  .from('users')
  .select('mfa_enabled')
  .eq('id', userId)
  .single();

if (user?.mfa_enabled) {
  // MFA is enabled
}
```

#### New Code (Recommended)

```typescript
// ✅ New approach - using unified materialized view
const { data: mfaStatus } = await supabase
  .from('user_mfa_status_unified')
  .select('mfa_enabled, active_method_types, last_mfa_used_at')
  .eq('user_id', userId)
  .single();

if (mfaStatus?.mfa_enabled) {
  // MFA is enabled
  console.log('Active methods:', mfaStatus.active_method_types);
}
```

#### Alternative: Using Function

```typescript
// ✅ Alternative - using get_user_mfa_status function
const { data } = await supabase.rpc('get_user_mfa_status', {
  p_user_id: userId,
});

const mfaStatus = data as {
  mfa_enabled: boolean;
  active_methods: Array<{ method_type: string; status: string }>;
  active_method_count: number;
  last_mfa_used_at: string | null;
  has_backup_codes: boolean;
};

if (mfaStatus.mfa_enabled) {
  // MFA is enabled
}
```

### Pattern 2: Dashboard Queries

#### Old Code

```typescript
// ❌ Old approach - querying users table
const { data: users } = await supabase
  .from('users')
  .select('id, email, mfa_enabled, role')
  .eq('mfa_enabled', true);
```

#### New Code

```typescript
// ✅ New approach - using pre-built view
const { data: users } = await supabase
  .from('users_with_active_mfa')
  .select(
    'id, email, role, active_method_types, last_mfa_used_at, has_backup_codes'
  );

// This view already filters for mfa_enabled = true
```

### Pattern 3: Admin Analytics

#### Old Code

```typescript
// ❌ Old approach
const { count } = await supabase
  .from('users')
  .select('*', { count: 'exact', head: true })
  .eq('mfa_enabled', true);
```

#### New Code

```typescript
// ✅ New approach - more detailed stats
const { data: stats } = await supabase
  .from('user_mfa_status_unified')
  .select('*')
  .eq('mfa_enabled', true);

const analytics = {
  totalMfaUsers: stats?.length || 0,
  methodDistribution: stats?.reduce(
    (acc, user) => {
      user.active_method_types?.forEach(method => {
        acc[method] = (acc[method] || 0) + 1;
      });
      return acc;
    },
    {} as Record<string, number>
  ),
  usersWithBackupCodes: stats?.filter(u => u.has_backup_codes).length || 0,
};
```

### Pattern 4: Monitoring Discrepancies

```typescript
// ✅ Check for MFA status inconsistencies
const { data: discrepancies } = await supabase
  .from('mfa_status_discrepancies')
  .select('*');

if (discrepancies && discrepancies.length > 0) {
  console.warn(
    `Found ${discrepancies.length} MFA status discrepancies:`,
    discrepancies
  );
  // Alert admin or log for investigation
}
```

## File-by-File Migration Checklist

### 1. src/lib/database/mfa-admin.ts

**Current References** (from analysis):

- Lines 117-193: Multiple queries to `users.mfa_enabled`

**Action Items**:

- [ ] Replace `users.mfa_enabled` queries with `user_mfa_status_unified` view
- [ ] Update admin dashboard to show detailed MFA stats
- [ ] Add monitoring for MFA discrepancies

### 2. API Routes Using MFA

Search for files with MFA logic:

```bash
grep -r "mfa_enabled" src/app/api/
grep -r "user_mfa" src/app/api/
```

**Action Items** (per file found):

- [ ] Review query pattern
- [ ] Update to use `user_mfa_status_unified` or `get_user_mfa_status()`
- [ ] Add tests to verify behavior unchanged

### 3. Dashboard Components

Search for frontend components using MFA:

```bash
grep -r "mfa_enabled" src/app/(dashboard)/
grep -r "mfa" src/components/
```

**Action Items**:

- [ ] Update TypeScript types to match new schema
- [ ] Replace Supabase queries with new sources
- [ ] Update UI to show additional MFA details (method types, last used, etc.)

### 4. Authentication Flows

**Files to check**:

- `src/app/(auth)/login/`
- `src/lib/auth/`
- Any middleware checking MFA status

**Action Items**:

- [ ] Ensure login flow still correctly detects MFA requirement
- [ ] Update session handling if needed
- [ ] Test with users who have/don't have MFA

## TypeScript Type Updates

### Old Types

```typescript
interface User {
  id: string;
  email: string;
  mfa_enabled: boolean;
  // ...
}
```

### New Types

```typescript
interface UserMfaStatus {
  user_id: string;
  mfa_enabled: boolean;
  total_methods: number;
  active_method_count: number;
  active_method_types: string[] | null;
  last_mfa_used_at: string | null;
  has_backup_codes: boolean;
  legacy_mfa_enabled: boolean; // For comparison
  has_discrepancy: boolean;
}

interface User {
  id: string;
  email: string;
  mfa_enabled: boolean; // Still exists, now synced automatically
  // ...
}
```

### Update Database Types

Regenerate TypeScript types from Supabase:

```bash
npx supabase gen types typescript --project-id <your-project-id> > src/types/supabase.ts
```

Or if using local development:

```bash
npx supabase gen types typescript --local > src/types/supabase.ts
```

## Testing Checklist

### Unit Tests

- [ ] Test `get_user_mfa_status()` function with different scenarios:
  - User with no MFA methods
  - User with one active method
  - User with multiple active methods
  - User with pending method
  - User with disabled method

### Integration Tests

- [ ] MFA enrollment flow still works
- [ ] MFA verification flow still works
- [ ] Admin dashboard shows correct MFA counts
- [ ] Users can disable MFA
- [ ] Backup codes functionality unchanged

### End-to-End Tests

- [ ] Login with MFA-enabled user
- [ ] Login with non-MFA user
- [ ] Admin views MFA statistics
- [ ] Client enrolls in MFA
- [ ] Coach views client MFA status

## Deployment Steps

### Step 1: Deploy Database Migration

```bash
# Apply the migration
npx supabase db push

# Verify migration applied
npx supabase db diff --schema public
```

### Step 2: Verify Sync is Working

```bash
# Run the discrepancy check
npx supabase db execute -f supabase/scripts/mfa_usage_telemetry.sql

# Should show zero discrepancies after sync
```

### Step 3: Deploy Application Code (Gradual)

**Option A: Gradual Migration (Recommended)**

1. Deploy database migration (backward compatible)
2. Update analytics/admin code first (low risk)
3. Update authentication flows next
4. Update user-facing features last
5. Monitor for issues at each step

**Option B: Big Bang Migration**

1. Update all code at once
2. Deploy database + application together
3. Higher risk but faster completion

### Step 4: Monitor Post-Deployment

```typescript
// Add monitoring to check for discrepancies
setInterval(async () => {
  const { data } = await supabase
    .from('mfa_status_discrepancies')
    .select('count');

  if (data && data.length > 0) {
    alert('MFA discrepancies detected!');
  }
}, 60000); // Check every minute
```

## Rollback Plan

### If Issues Arise

The migration is non-destructive, so rollback is simple:

1. **Application Level**: Revert application code to use `users.mfa_enabled`
   - No database changes needed
   - Legacy column still works and is synced

2. **Database Level** (if needed):

   ```sql
   -- Drop the trigger
   DROP TRIGGER IF EXISTS trg_sync_mfa_enabled_on_method_change ON user_mfa_methods;

   -- Drop the views
   DROP VIEW IF EXISTS users_with_active_mfa CASCADE;
   DROP VIEW IF EXISTS mfa_status_discrepancies CASCADE;
   DROP MATERIALIZED VIEW IF EXISTS user_mfa_status_unified CASCADE;

   -- Drop the functions
   DROP FUNCTION IF EXISTS get_user_mfa_status(UUID);
   DROP FUNCTION IF EXISTS sync_mfa_enabled_column();
   DROP FUNCTION IF EXISTS refresh_user_mfa_status_unified();
   ```

3. **Re-sync users.mfa_enabled** (if trigger was dropped):
   ```sql
   UPDATE users u
   SET mfa_enabled = EXISTS (
     SELECT 1 FROM user_mfa_methods umm
     WHERE umm.user_id = u.id AND umm.status = 'active'
   );
   ```

## Future: Deprecating Legacy Column

**Only after** 100% of application code migrated:

1. Create migration to drop `users.mfa_enabled`
2. Drop trigger (no longer needed)
3. Update documentation
4. Announce breaking change to any API consumers

**Estimated Timeline**: 3-6 months after initial deployment

## Questions & Support

**Q: Can I mix old and new code?**
A: Yes! The trigger keeps both sources in sync automatically.

**Q: What if I find a discrepancy?**
A: Check `mfa_status_discrepancies` view, investigate, and file a bug report.

**Q: Will this affect performance?**
A: The materialized view is faster for dashboard queries. Refresh it nightly via cron.

**Q: How do I refresh the materialized view?**
A: Either manually (`SELECT refresh_user_mfa_status_unified()`) or via pg_cron:

```sql
SELECT cron.schedule(
  'refresh-mfa-status',
  '0 2 * * *', -- 2 AM daily
  'SELECT refresh_user_mfa_status_unified()'
);
```

## Related Files

- Database Migration: `supabase/migrations/20251021000003_mfa_unified_source_non_destructive.sql`
- Telemetry Script: `supabase/scripts/mfa_usage_telemetry.sql`
- Refactoring Plan: `DATABASE_REFACTORING_PLAN.md`
