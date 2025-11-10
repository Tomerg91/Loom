# Supabase Legacy API Keys Fix - Action Checklist

**Problem:** Legacy API keys disabled on Supabase project
**Status:** Requires manual action (you need Supabase dashboard access)
**Timeline:** 15-30 minutes

---

## Your Action Items

### Step 1: Access Supabase Dashboard ⏳ YOU ARE HERE
- [ ] Go to https://supabase.com/dashboard
- [ ] Log in with your account
- [ ] Click on your project (loom or similar name)
- [ ] Navigate to **Settings → API**

### Step 2: Locate Your API Keys
- [ ] Find the **API Keys** section
- [ ] Look for:
  - [ ] **Project URL** - Copy this (looks like: `https://xxxxx.supabase.co`)
  - [ ] **Public Key** - Copy the **NEW publishable key** (starts with `sb_pb_...`)
  - [ ] **Service Role Key** - Copy this (starts with `sbpk_...`)

### Step 3: Update Your Environment File
- [ ] Open `/Users/tomergalansky/Desktop/loom-app/.env.local`
- [ ] Replace these values:

```env
# Update these:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_pb_xxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=sbpk_xxxxxxxxxxxxx
```

- [ ] Save the file

### Step 4: Verify Configuration
Run the verification script to test the updated configuration:

```bash
cd /Users/tomergalansky/Desktop/loom-app
./scripts/verify-supabase-config.sh
```

**Expected output:**
```
✅ .env.local file found
✅ NEXT_PUBLIC_SUPABASE_URL: https://...
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: sb_pb_...
✅ Format: New Publishable Key (sb_pb_...)
✅ Supabase client connected successfully
✅ All checks passed!
```

### Step 5: Restart Development Server
- [ ] Kill the current dev server: `pkill -f "next dev"`
- [ ] Restart with: `npm run dev`
- [ ] Verify it starts without errors

### Step 6: Test Authentication
- [ ] Navigate to: `http://localhost:3000/en/auth/signin`
- [ ] Try to sign up with test account:
  - Email: `testuser@example.com`
  - Password: `TestPassword123!`
- [ ] Verify you see verification email prompt or redirect (no error)

### Step 7: Complete Task 2.3 Verification
- [ ] Run the task feature verification test
- [ ] Navigate to `/en/coach/tasks` after signing in
- [ ] Test CRUD operations (Create, Read, Update, Delete)
- [ ] Document results

---

## Expected Results After Fix

| Check | Before | After |
|-------|--------|-------|
| API Key Format | `eyJhbGciOi...` (legacy) | `sb_pb_...` (new) |
| Signup Response | 400 - "Legacy API keys disabled" | 200 - Success or email verification |
| Tasks Page | Redirects to signin | Loads after authentication |
| Error Logs | Auth service errors | Clear console |

---

## Troubleshooting

### If verification script fails:

**Error: "Legacy API keys are disabled"**
- Double-check you copied the PUBLISHABLE key (not Service Role)
- Verify format starts with `sb_pb_`
- Wait 5 minutes for Supabase to propagate changes

**Error: "Invalid API key format"**
- Ensure you copied the ENTIRE key
- Check for extra spaces or line breaks
- Verify it's not truncated

**Error: "Connection refused"**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check if Supabase service is operational: https://status.supabase.com
- Ensure dev server is running: `npm run dev`

---

## Timeline

**After updating Supabase keys:**

| Time | Task |
|------|------|
| 5 min | Update .env.local |
| 2 min | Run verification script |
| 3 min | Restart dev server |
| 5 min | Test signup/signin |
| 10 min | Complete Task 2.3 verification |
| **25 min** | **Total estimated time** |

---

## Next Steps (After Fix Confirmed)

Once authentication is working:

1. ✅ Task 2.3 verification complete
2. ✅ Phase 2 complete - ready for Phase 3
3. 📋 Continue with:
   - Phase 3: Onboarding Enforcement (2.75h)
   - Phase 4: Error Boundaries (3h)
   - Phase 5: Availability API (5.5h)
   - Phase 6: Loading Skeletons & UX (5h)
   - And more...

---

## Resources

- **Supabase Docs:** https://supabase.com/docs/guides/api/keys-and-tokens
- **API Keys Guide:** `docs/SUPABASE_API_KEY_UPDATE_GUIDE.md`
- **Verification Script:** `scripts/verify-supabase-config.sh`

---

**Status:** 🔴 Waiting for you to update Supabase configuration
**Next Update:** After you complete Step 6 (test authentication)
