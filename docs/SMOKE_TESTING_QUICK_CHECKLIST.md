# Smoke Testing Quick Checklist - Issue #147

**Print this page or keep it open while testing**

---

## Pre-Test Setup

- [ ] DevTools open (F12)
- [ ] Console tab visible, "Preserve log" enabled
- [ ] Network tab visible, "Disable cache" checked
- [ ] Test accounts ready
- [ ] Staging URL accessible
- [ ] Time tracking started

---

## Journey 1: Registration ⏱️ 5-8 min

- [ ] Navigate to `/auth/signup`
- [ ] Fill form with unique email
- [ ] Submit (no errors?)
- [ ] Check email for verification link
- [ ] Click link
- [ ] Verify dashboard redirect
- [ ] ✅ **PASS** / ❌ **FAIL**

**Time taken:** ___ min

---

## Journey 2: MFA Sign-In ⏱️ 5-7 min

- [ ] Navigate to `/auth/signin`
- [ ] Enter email: `coach-test@loom-staging.com`
- [ ] Enter password
- [ ] MFA challenge appears?
- [ ] Enter TOTP code
- [ ] Dashboard loads?
- [ ] Refresh page - still logged in?
- [ ] ✅ **PASS** / ❌ **FAIL**

**Time taken:** ___ min

---

## Journey 3: Sign-Out ⏱️ 2-3 min

- [ ] Click user menu (top right)
- [ ] Click "Sign Out"
- [ ] Redirect to landing page?
- [ ] DevTools → Application → Check no auth cookies
- [ ] Try accessing dashboard directly
- [ ] Redirect to sign-in?
- [ ] ✅ **PASS** / ❌ **FAIL**

**Time taken:** ___ min

---

## Journey 4: Password Reset ⏱️ 8-10 min

- [ ] Navigate to `/auth/signin`
- [ ] Click "Forgot password?"
- [ ] Enter email
- [ ] Check email for reset link
- [ ] Click reset link
- [ ] Enter new password (2x)
- [ ] Submit
- [ ] Redirect to sign-in?
- [ ] Sign in with new password - works?
- [ ] Old password fails?
- [ ] ✅ **PASS** / ❌ **FAIL**

**Time taken:** ___ min

---

## Journey 5: Coach Onboarding ⏱️ 8-10 min

- [ ] Sign in as new coach
- [ ] Onboarding wizard appears?
- [ ] Complete professional info
- [ ] Add 3+ availability slots
- [ ] Configure services
- [ ] Save
- [ ] Dashboard shows welcome?
- [ ] Profile completion: 100%?
- [ ] ✅ **PASS** / ❌ **FAIL**

**Time taken:** ___ min

---

## Journey 6: Client Booking ⏱️ 8-12 min

- [ ] Sign in as client
- [ ] Navigate to "Book Session"
- [ ] Select coach
- [ ] Calendar shows availability?
- [ ] Select time slot
- [ ] Choose session type
- [ ] Add notes
- [ ] Click "Confirm"
- [ ] Confirmation message?
- [ ] Check "My Sessions" - session there?
- [ ] Status: "scheduled"?
- [ ] ✅ **PASS** / ❌ **FAIL**

**Time taken:** ___ min

---

## Journey 7: Resource Library ⏱️ 10-15 min

**Coach:**
- [ ] Navigate to Resources
- [ ] Upload file
- [ ] Create collection
- [ ] Add to collection
- [ ] Share with client
- [ ] Confirmation?

**Client:**
- [ ] Sign in as client
- [ ] Navigate to Resources
- [ ] Shared resource visible?
- [ ] Can download/view?
- [ ] Mark as completed
- [ ] Progress tracked?

**Result:**
- [ ] ✅ **PASS** / ❌ **FAIL**

**Time taken:** ___ min

---

## Journey 8: Practice Journal ⏱️ 8-10 min

**Client:**
- [ ] Navigate to Practice Journal
- [ ] Create entry (title, content, mood)
- [ ] Toggle "Share with coach"
- [ ] Save
- [ ] Entry in list?

**Coach:**
- [ ] Navigate to client profile
- [ ] View Practice Journal tab
- [ ] Shared entries visible?
- [ ] Private entries hidden?

**Result:**
- [ ] ✅ **PASS** / ❌ **FAIL**

**Time taken:** ___ min

---

## Journey 9: Admin Dashboard ⏱️ 5-8 min

- [ ] Sign in as admin
- [ ] Navigate to Admin Dashboard
- [ ] System health displays?
- [ ] User list accessible?
- [ ] Can filter by role?
- [ ] Performance metrics show?
- [ ] ✅ **PASS** / ❌ **FAIL**

**Time taken:** ___ min

---

## Journey 10: RBAC ⏱️ 10-12 min

**As Client:**
- [ ] Try `/coach/resources` - blocked?
- [ ] Try `/admin` - blocked?

**As Coach:**
- [ ] Access `/coach/dashboard` - works?
- [ ] Try `/admin` - blocked?

**As Admin:**
- [ ] Access all routes - works?

**Result:**
- [ ] ✅ **PASS** / ❌ **FAIL**

**Time taken:** ___ min

---

## Performance Checks

**Dashboard Load Time:**
- DevTools → Network tab
- Reload dashboard
- Total time: ___ ms (Target: < 1000ms)

**API Response Times:**
- Average: ___ ms (Target: < 500ms)

**Database Query Time:**
- Expected: 5-10ms (with new indexes)

---

## Issues Found

| # | Issue | Severity | Notes |
|----|-------|----------|-------|
| 1 | | C/H/M/L | |
| 2 | | C/H/M/L | |
| 3 | | C/H/M/L | |

---

## Console Errors Checklist

- [ ] No authentication errors
- [ ] No RLS policy errors
- [ ] No network errors
- [ ] No React component errors
- [ ] No unhandled promise rejections

**Total errors found:** ___

---

## Final Results

| Metric | Value |
|--------|-------|
| **Total Journeys** | 10 |
| **Passed** | __ |
| **Failed** | __ |
| **Total Time** | __ hours |
| **Date** | __ |
| **Tester** | __ |

---

## Sign-Off

- [ ] All critical journeys pass
- [ ] No blocking console errors
- [ ] Performance targets met
- [ ] Ready to proceed to E2E tests

**Tested by:** ________________

**Date:** ________________

**Time:** ________________

---

## Quick Links

- Full guide: `SMOKE_TESTING_EXECUTION_GUIDE.md`
- Detailed specs: `SMOKE_TESTING_GUIDE_SPRINT7.md`
- Issue #147: https://github.com/Tomerg91/Loom/issues/147

---

## Notes

Use this space for additional observations:

_________________________________________________________________________

_________________________________________________________________________

_________________________________________________________________________
