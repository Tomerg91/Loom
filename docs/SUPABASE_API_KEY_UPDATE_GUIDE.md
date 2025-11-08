# Supabase API Key Update Guide

**Issue:** Legacy API keys have been disabled on the Supabase project
**Error:** `"Legacy API keys are disabled"` when attempting signup/signin
**Solution:** Update to new publishable keys format
**Estimated Time:** 15-30 minutes

---

## Step 1: Identify Your Supabase Project

Find your Supabase project information:

**Current Environment File:**
- Location: `/Users/tomergalansky/Desktop/loom-app/.env.local`
- Current format uses: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy format)

**Find Your Project:**
1. Go to https://supabase.com/dashboard
2. Log in with your account
3. Locate your project (likely named something like "loom" or similar)
4. Click on the project to open it

---

## Step 2: Update API Keys in Supabase Dashboard

### Option A: Using New Publishable Keys (Recommended)

1. In Supabase Dashboard, go to **Settings → API**
2. Look for "API Keys" section
3. You should see:
   - **Public (Publishable) Key** - new format starts with `sb_pb_...`
   - **Service Role Key** - secret key starting with `sbpk_...`
   - **Anon (Legacy) Key** - old format (may show as "disabled" warning)

4. Copy the **Public (Publishable) Key** (starts with `sb_pb_...`)

### Option B: Check If Legacy Keys Can Be Re-enabled

If you don't see publishable keys, legacy keys may be temporarily disabled:

1. Go to **Settings → API**
2. Look for a toggle or warning about "Legacy API keys are disabled"
3. If you see an option to re-enable, click it
4. Wait a few minutes for the change to take effect

---

## Step 3: Update Your Application Configuration

### Update `.env.local`

Replace the legacy anon key with the publishable key:

**Before (Legacy Format):**
```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...
```

**After (New Format):**
```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_pb_...
```

Or, if your project uses the new naming convention:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_pb_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Verify Other Required Variables

Ensure you also have:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_pb_... (new publishable key)
SUPABASE_SERVICE_ROLE_KEY=sbpk_... (should remain unchanged)
```

---

## Step 4: Test the Update

### A. Restart the Development Server

```bash
# Kill existing dev server
pkill -f "next dev" || true

# Wait a moment
sleep 2

# Restart
npm run dev
```

### B. Test Authentication Flow

1. Navigate to: `http://localhost:3000/en/auth/signin`
2. Try to sign up with a test account:
   - Email: `test@example.com`
   - Password: `TestPassword123!`
3. Check for errors in:
   - Browser console (F12 → Console tab)
   - Network tab (F12 → Network tab) - look for `/api/auth/signup` response

### C. Verify Success Criteria

If successful, you should see:
- ✅ Signup form submits without error
- ✅ Verification email prompt appears (or redirect to dashboard)
- ✅ No "Legacy API keys are disabled" error
- ✅ Console shows successful auth request

---

## Step 5: Troubleshooting

### Error: Still Getting "Legacy API keys are disabled"

**Possible causes:**
1. Browser cache showing old page
2. Dev server not restarted with new keys
3. Wrong key format copied

**Solutions:**
1. Clear browser cache: `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
2. Restart dev server: `npm run dev`
3. Double-check the key format - it should start with `sb_pb_`

### Error: Invalid API Key Format

**Possible causes:**
1. Partially copied key (too short)
2. Extra spaces or characters
3. Wrong key (Service Role instead of Publishable)

**Solutions:**
1. Re-copy the entire key from Supabase Dashboard
2. Remove any leading/trailing spaces
3. Verify it's the Publishable Key, not Service Role Key

### Error: "Authentication Error" After Update

**Possible causes:**
1. Key mismatch between `.env.local` and Supabase
2. Supabase project configuration issue
3. Rate limiting or temporary outage

**Solutions:**
1. Verify key matches exactly in Supabase Dashboard
2. Wait 5 minutes (sometimes Supabase needs time to propagate changes)
3. Check Supabase Status: https://status.supabase.com
4. Try local Supabase instead: `npm run supabase:start`

---

## Step 6: Verify Application Works

Once authentication is working, you can test the full flow:

```bash
# Restart the application
npm run dev

# Test endpoints
npm run test:run -- src/modules/tasks/

# Run the task feature verification
# Navigate to http://localhost:3000/en/coach/tasks
# Sign up → Create task → Update task → Delete task
```

---

## Reference: Key Format Comparison

| Aspect | Legacy Format | New Format |
|--------|--------------|-----------|
| Prefix | `eyJhbGciOiJIUzI1NiI...` | `sb_pb_...` |
| Length | ~500+ characters | ~100+ characters |
| Type | JWT token | Publishable key |
| Security | Less restrictive | More restrictive (RLS enforced) |
| Status | Deprecated/Disabled | Current/Recommended |

---

## What Changed?

Supabase moved from JWT-based anonymous keys (legacy) to publishable keys for better security:

**Legacy Keys:**
- Allowed all operations (required RLS for security)
- Less transparent about permissions
- Harder to audit usage

**Publishable Keys:**
- Explicitly show what's public
- Better integration with Supabase security model
- Easier to audit and control access

Your application code was already updated to work with both formats in the previous fixes.

---

## Support

If you continue to experience issues after following these steps:

1. **Check Supabase Docs:** https://supabase.com/docs/guides/api/keys-and-tokens
2. **Contact Supabase Support:** https://supabase.com/support
3. **Review Application Logs:**
   - Check network tab for `/api/auth/signup` response
   - Check server logs: `npm run dev` output

---

**After completing these steps, report back and we'll verify the fix worked, then continue with Task 2.3 verification!**
