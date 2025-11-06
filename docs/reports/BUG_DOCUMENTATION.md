# Loom App - Bug Documentation & Fix Checklist

## Project Overview
- **Technology Stack**: Next.js 15.3.5 with React 19, TypeScript, Supabase, Tailwind CSS 4
- **Deployment**: Vercel (https://loom-hxe5bultq-tomer-s-projects-bcd27563.vercel.app)
- **Current Status**: Final bug fixing phase

---

## Bug Reports Analysis & Atomic Fix Checklist

### 🔴 Bug #0: Sign-In Redirect Loop (NEW - CRITICAL)
**Problem Statement**:
Users are unable to sign in and be redirected to the dashboard. After submitting credentials, they experience a redirect loop or are sent back to the sign-in page.

**Error Symptoms**:
- User submits sign-in form
- Server authenticates successfully
- User redirected to dashboard
- Dashboard immediately redirects back to sign-in page
- Infinite loop

**Analysis**:
- **Severity**: CRITICAL (blocks all user access)
- **Root Cause**: Form POST sets server-side cookies but doesn't update client-side Zustand auth store
- **Affected Flow**: Sign-in → Dashboard redirect
- **Related Files**:
  - `/src/components/auth/signin-form.tsx:27` (uses native HTML form POST)
  - `/src/components/auth/route-guard.tsx:59-96` (checks auth before hydration completes)
  - `/src/lib/auth/use-auth.ts:42-87` (session hydration has race condition)
  - `/src/lib/store/auth-store.ts:37` (loading state timing)
  - `/src/app/api/auth/signin/browser/route.ts` (sets cookies & redirects)
  - `/src/middleware.ts` (allows access but client guard blocks)

**Technical Root Cause**:
The sign-in form uses `<form method="POST" action="/api/auth/signin/browser">` which:
1. ✅ Sets server-side session cookies correctly
2. ✅ Redirects to dashboard (303 See Other)
3. ❌ Does NOT update client-side Zustand auth store
4. ❌ Causes RouteGuard to see `user: null` and redirect back

**Race Condition Flow**:
```
User submits form (native POST)
  ↓
POST /api/auth/signin/browser
  ↓
Server: signInWithPassword() → Sets cookies → 303 Redirect /dashboard
  ↓
Middleware: Sees cookies → Allows access ✓
  ↓
Dashboard page: Loads with SSR
  ↓
RouteGuard: Checks Zustand store → user: null ✗ → Redirect to /signin
  ↓
🔁 LOOP
```

**Atomic Fix Checklist**:
- [x] 0.1 Read current signin-form.tsx implementation
- [x] 0.2 Convert form from native POST to JavaScript submission
- [x] 0.3 Import useAuth hook from auth-provider
- [x] 0.4 Add handleSubmit handler with e.preventDefault()
- [x] 0.5 Call signIn(email, password) from useAuth
- [x] 0.6 Add loading state during submission
- [x] 0.7 Add error handling and display
- [x] 0.8 Handle MFA redirect logic if needed
- [x] 0.9 Navigate to dashboard on success using router.push()
- [x] 0.10 Add missing translations (signin.loading, signin.error)
- [ ] 0.11 Update form tests to mock useAuth
- [ ] 0.12 Test sign-in flow with cleared cookies/storage
- [ ] 0.13 Verify no redirect loop occurs
- [ ] 0.14 Test with network throttling (Slow 3G)
- [ ] 0.15 Test MFA flow still works
- [ ] 0.16 Verify all auth state properly synchronized

**Solution Summary**:
Convert sign-in form from native HTML POST to JavaScript submission using existing `useAuth().signIn()` method. This ensures client-side auth store is updated before navigation, preventing the race condition.

---

### 🚨 Bug #1: CSS MIME Type Error
**Error Message**: 
```
Refused to execute script from 'https://loom-hxe5bultq-tomer-s-projects-bcd27563.vercel.app/_next/static/css/287418f4efc283d6.css' because its MIME type ('text/css') is not executable, and strict MIME type checking is enabled.
```

**Analysis**:
- **Severity**: Medium
- **Root Cause**: Browser trying to execute CSS file as JavaScript
- **Affected Files**: Build output CSS files
- **Related Files**: `/next.config.js` (lines 110-130)

**Atomic Fix Checklist**:
- [ ] 1.1 Verify Next.js config has correct MIME type headers for CSS
- [ ] 1.2 Check if any JavaScript is trying to dynamically load CSS as script
- [ ] 1.3 Inspect build output for CSS/JS file mixing
- [ ] 1.4 Test fix in production build
- [ ] 1.5 Validate no regression in CSS loading

---

### 🚨 Bug #2: Font File 404 Error
**Error Message**:
```
inter-var.woff2:1 Failed to load resource: the server responded with a status of 404 ()
```

**Analysis**:
- **Severity**: Low (visual impact)
- **Root Cause**: Layout preloads font file that doesn't exist
- **Affected Files**: `/src/app/[locale]/layout.tsx:65`
- **Missing Resource**: `/public/fonts/inter-var.woff2`

**Atomic Fix Checklist**:
- [ ] 2.1 Locate font preload directive in layout.tsx
- [ ] 2.2 Check if /public/fonts/ directory exists
- [ ] 2.3 Verify if font files are actually needed (using Google Fonts)
- [ ] 2.4 Remove unnecessary font preload or add font files
- [ ] 2.5 Test font rendering after fix

---

### 🚨 Bug #3: Invalid URL Constructor TypeError (Critical)
**Error Message**:
```
TypeError: Failed to construct 'URL': Invalid URL
    at new ew (auth~eb2fbf4c-970b99e836d140fe.js:6:22560)
    at e_ (auth~eb2fbf4c-970b99e836d140fe.js:6:24624)
    at b (auth~eb2fbf4c-970b99e836d140fe.js:10:4498)
```

**Analysis**:
- **Severity**: Critical (blocks authentication)
- **Root Cause**: Invalid URL being passed to URL constructor in auth flow
- **Affected Files**: Authentication bundle (`auth~eb2fbf4c-970b99e836d140fe.js`)
- **Related Files**: 
  - `/src/lib/supabase/client.ts`
  - `/src/lib/supabase/server.ts`
  - `/src/env.mjs`
  - `/src/env-server.mjs`

**Atomic Fix Checklist**:
- [ ] 3.1 Identify exact location of URL construction error
- [ ] 3.2 Check all environment variables are properly set
- [ ] 3.3 Validate Supabase URL format in environment config
- [ ] 3.4 Review auth service URL construction logic
- [ ] 3.5 Add URL validation before constructor calls
- [ ] 3.6 Test authentication flow end-to-end
- [ ] 3.7 Verify fix doesn't break SSR/SSG

---

### 🚨 Bug #4: Content Security Policy Violation
**Error Message**:
```
Refused to frame 'https://vercel.live/' because it violates the following Content Security Policy directive: "frame-src 'self' https://secure5.tranzila.com https://direct.tranzila.com https://*.sentry.io".
```

**Analysis**:
- **Severity**: Medium (security/functionality)
- **Root Cause**: CSP frame-src doesn't include vercel.live domain
- **Affected Files**: `/next.config.js` (CSP configuration)
- **Impact**: Blocks Vercel Live preview/debugging features

**Atomic Fix Checklist**:
- [ ] 4.1 Locate CSP frame-src configuration in next.config.js
- [ ] 4.2 Add https://vercel.live to allowed frame sources
- [ ] 4.3 Consider security implications of allowing vercel.live
- [ ] 4.4 Test CSP doesn't block legitimate functionality
- [ ] 4.5 Verify fix resolves the violation

---

## File Structure & Associations

### Core Configuration Files
```
/next.config.js                 → Main Next.js config with CSP & MIME types
/package.json                   → Dependencies and scripts
/src/env.mjs                    → Client-side environment validation
/src/env-server.mjs             → Server-side environment validation
```

### Authentication Related
```
/src/lib/supabase/client.ts     → Client-side Supabase config
/src/lib/supabase/server.ts     → Server-side Supabase config
/src/middleware.ts              → Auth & i18n middleware
/src/lib/security/headers.ts    → Security headers config
```

### Layout & Assets
```
/src/app/[locale]/layout.tsx    → Main layout with font preloads
/src/app/globals.css            → Global styles with theming
/public/                        → Static assets directory
```

### Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL        → Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   → Public Supabase key
SUPABASE_SERVICE_ROLE_KEY       → Service role key
```

---

## Fix Priority Order
1. **Bug #0** (CRITICAL): Sign-In Redirect Loop - blocks all user access to app
2. **Bug #3** (Critical): Invalid URL Constructor - blocks authentication
3. **Bug #1** (Medium): CSS MIME Type - affects resource loading
4. **Bug #4** (Medium): CSP Violation - security/functionality issue
5. **Bug #2** (Low): Font 404 - cosmetic issue

---

## Testing Strategy
- **Local Testing**: `npm run dev` → test each fix locally
- **Build Testing**: `npm run build` → ensure no build-time errors
- **Production Testing**: Deploy to Vercel and verify fixes
- **Auth Flow Testing**: Complete login/logout cycles
- **Performance Testing**: Check Lighthouse scores after fixes

---

## Success Criteria
- [ ] All console errors eliminated
- [ ] Authentication flow works without URL errors
- [ ] CSS loads correctly without MIME type warnings
- [ ] Font loading optimized (either fixed or cleaned up)
- [ ] CSP allows necessary functionality while maintaining security
- [ ] No regressions in existing features
- [ ] Build completes successfully
- [ ] Vercel deployment succeeds

---

## Notes
- Project follows DRY, KISS principles per CLAUDE.md
- Uses specialized AI agents for different domains
- Comprehensive security and performance configuration already in place
- Focus on surgical fixes to avoid introducing new issues

---

## Appendix A: Complete Authentication Architecture

### Authentication File Structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── auth/
│   │   │   ├── signin/
│   │   │   │   └── page.tsx                    [Sign-in page component]
│   │   │   ├── callback/
│   │   │   │   └── route.ts                    [OAuth/email callback handler]
│   │   │   └── mfa-verify/
│   │   │       └── page.tsx                    [MFA verification page]
│   │   ├── dashboard/
│   │   │   └── page.tsx                        [Dashboard page - protected]
│   │   └── layout.tsx                          [Main layout with SSR auth]
│   └── api/
│       └── auth/
│           ├── signin/
│           │   └── browser/
│           │       └── route.ts                [Form POST handler ⚠️]
│           ├── session/
│           │   └── route.ts                    [Session cookie sync endpoint]
│           └── signout/
│               └── route.ts                    [Sign-out handler]
├── components/
│   ├── auth/
│   │   ├── signin-form.tsx                     [Sign-in form - NEEDS FIX ⚠️]
│   │   ├── auth-provider.tsx                   [Auth context provider]
│   │   └── route-guard.tsx                     [Client-side route protection ⚠️]
│   └── dashboard/
│       └── dashboard-content.tsx               [Dashboard UI component]
├── lib/
│   ├── auth/
│   │   ├── auth.ts                             [AuthService - unified auth]
│   │   ├── client-auth.ts                      [Client-only auth service]
│   │   ├── use-auth.ts                         [useUnifiedAuth hook ⚠️]
│   │   └── middleware.ts                       [Auth middleware helpers]
│   ├── store/
│   │   └── auth-store.ts                       [Zustand auth state ⚠️]
│   ├── supabase/
│   │   ├── client.ts                           [Browser Supabase client]
│   │   └── server.ts                           [Server Supabase clients]
│   └── utils/
│       └── redirect.ts                         [Redirect helpers]
└── middleware.ts                               [Root middleware - auth gating]

⚠️ = Files involved in Bug #0
```

### Authentication Flow Visualization

```
┌──────────────────────────────────────────────────────────────────┐
│                   CURRENT BROKEN FLOW                             │
└──────────────────────────────────────────────────────────────────┘

User visits /signin
       ↓
signin-form.tsx: <form method="POST" action="/api/auth/signin/browser">
       ↓
User enters credentials & clicks submit
       ↓
Browser: POST /api/auth/signin/browser (native form submission)
       ↓
signin/browser/route.ts:
  • signInWithPassword(email, password)
  • Set HTTP-only session cookies
  • Return: 303 Redirect → /dashboard
       ↓
Browser: Follow redirect → GET /dashboard
       ↓
middleware.ts:
  • Read session cookies ✓
  • Valid session found ✓
  • Allow access ✓
       ↓
dashboard/page.tsx:
  • SSR: getServerUser() (may be null due to timing)
  • Render with <RouteGuard requireAuth={true}>
       ↓
route-guard.tsx:
  • Read useUser() from Zustand → user: null ✗
  • Read useAuthLoading() → isLoading: false ✗
  • requireAuth && !user → REDIRECT TO /signin
       ↓
🔁 INFINITE LOOP

┌──────────────────────────────────────────────────────────────────┐
│                     FIXED FLOW (SOLUTION)                         │
└──────────────────────────────────────────────────────────────────┘

User visits /signin
       ↓
signin-form.tsx: <form onSubmit={handleSubmit}>
       ↓
User enters credentials & clicks submit
       ↓
handleSubmit(e):
  • e.preventDefault() (no native form POST)
  • const { signIn } = useAuth()
  • const result = await signIn(email, password)
       ↓
useAuth.signIn() → ClientAuthService.signIn():
  • supabase.auth.signInWithPassword()
  • POST /api/auth/session (sync cookies)
  • Update Zustand store: setUser(user) ✓
  • Return user object
       ↓
handleSubmit: Check result
  • if (error): Display error, stay on page
  • if (user.mfaEnabled): router.push(/mfa-verify)
  • else: router.push(/dashboard) ← Client-side navigation
       ↓
Browser: Client-side navigate → /dashboard
       ↓
middleware.ts:
  • Read session cookies ✓
  • Valid session ✓
  • Allow access ✓
       ↓
dashboard/page.tsx:
  • SSR: getServerUser() → user object ✓
  • Render with <RouteGuard>
       ↓
route-guard.tsx:
  • Read useUser() → user object ✓
  • requireAuth && user → ALLOW ACCESS ✓
       ↓
dashboard-content.tsx: Render dashboard
       ↓
✅ USER SEES DASHBOARD
```

### Key Integration Points

#### Point 1: Form Submission (BROKEN)
```tsx
// Current (signin-form.tsx line 27)
<form method="POST" action="/api/auth/signin/browser">
  {/* This doesn't update client state! */}
</form>
```

#### Point 2: Form Submission (FIXED)
```tsx
// Fixed (signin-form.tsx)
const { signIn } = useAuth();
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  const result = await signIn(email, password);
  if (!result.error) router.push(`/${locale}/dashboard`);
};

<form onSubmit={handleSubmit}>
  {/* Client state properly synchronized! */}
</form>
```

#### Point 3: Auth State Update Flow
```typescript
// useAuth().signIn() calls:
ClientAuthService.signIn()
  ↓
supabase.auth.signInWithPassword()
  ↓
POST /api/auth/session (sync server cookies)
  ↓
setUser(user) in Zustand store ← CRITICAL
  ↓
Return user to component
  ↓
Component navigates (store already updated!)
```

#### Point 4: RouteGuard Check
```tsx
// route-guard.tsx checks:
const user = useUser(); // From Zustand
const isLoading = useAuthLoading(); // From Zustand

// With fixed flow:
// - user is populated before navigation
// - No race condition
// - No redirect loop
```

### Detailed File Responsibilities

#### `/src/components/auth/signin-form.tsx` (NEEDS FIX)
**Current Issue**: Uses native HTML form POST
**Fix Required**: Convert to JavaScript submission with useAuth
**Lines to Change**: ~27-120
**Dependencies**: useAuth, useRouter, useState

#### `/src/lib/auth/use-auth.ts` (INVOLVED)
**Purpose**: Unified auth hook that syncs Supabase ↔ Zustand
**Issue**: Session hydration has race condition after form POST
**Why It Matters**: Provides the `signIn()` method we'll use in fix
**Key Methods**:
- `signIn(email, password)` - Updates store before returning
- `signUp()` - Registration
- `signOut()` - Clears all auth state

#### `/src/lib/store/auth-store.ts` (INVOLVED)
**Purpose**: Global client-side auth state (Zustand)
**Issue**: Not updated during form POST flow
**Why It Matters**: RouteGuard reads from this store
**State Fields**:
- `user`: AuthUser | null
- `isLoading`: boolean
- `error`: string | null

#### `/src/components/auth/route-guard.tsx` (INVOLVED)
**Purpose**: Client-side component that protects routes
**Issue**: Checks store before hydration completes
**Why It Matters**: Triggers the redirect loop
**Key Logic**:
```tsx
if (requireAuth && !user) {
  router.push('/signin'); // This causes loop
}
```

#### `/src/app/api/auth/signin/browser/route.ts` (CONTEXT)
**Purpose**: Handles native form POST for sign-in
**Current Behavior**: Works correctly, sets cookies, redirects
**Future**: Can remain as fallback but won't be primary path
**Key Operations**:
- Validates credentials
- Calls `signInWithPassword()`
- Checks MFA status
- Sets session cookies
- Returns 303 redirect

#### `/src/middleware.ts` (WORKING CORRECTLY)
**Purpose**: Server-side request interceptor for auth gating
**Current Behavior**: Works correctly, sees cookies, allows access
**Why No Bug Here**: Middleware layer is functioning as expected
**Key Operations**:
- Checks session cookies
- Redirects unauthenticated users from protected routes
- Refreshes tokens on every request

### Environment Variables for Auth

```env
# Required for authentication
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx... (server-only)

# Site configuration
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Optional debugging
LOG_REQUESTS=true  # Enable request logging in middleware
MIDDLEWARE_AUTH_ENABLED=true  # Enable auth gating (default: true)
```

### Testing Checklist for Fix

#### Pre-Fix Testing
- [ ] Reproduce bug: Clear cookies → Sign in → Observe redirect loop
- [ ] Verify middleware allows access (check network tab)
- [ ] Verify RouteGuard triggers redirect (add console.log)
- [ ] Confirm Zustand store has user: null during redirect

#### Post-Fix Testing
- [ ] Clear cookies and localStorage
- [ ] Sign in with valid credentials
- [ ] Verify no redirect loop
- [ ] Verify dashboard loads with user data
- [ ] Check Zustand store has user populated
- [ ] Test with slow network (Chrome DevTools throttling)
- [ ] Test MFA flow (if applicable)
- [ ] Test sign-in from different locales (/en/auth/signin, /he/auth/signin)
- [ ] Test sign-in with redirectTo parameter
- [ ] Test sign-out and re-sign-in
- [ ] Verify no console errors

### Why This Fix Works

1. **Synchronous State Update**: `signIn()` updates Zustand store immediately
2. **No Race Condition**: Store is populated before `router.push()`
3. **RouteGuard Sees User**: When dashboard loads, user is already in store
4. **No Redirect Loop**: Guard allows access because `user !== null`
5. **Better UX**: Can show loading states and inline errors
6. **Progressive Enhancement**: Still works if JS is available

### Alternative Solutions Considered (And Why Rejected)

#### Option A: Fix Race Condition with Delays
```tsx
// Add delay to session hydration
await new Promise(resolve => setTimeout(resolve, 500));
```
**Rejected**: Unreliable, poor UX, doesn't address root cause

#### Option B: Remove RouteGuard
**Rejected**: Loses permission checking, loading states, better UX

#### Option C: Make RouteGuard Wait Longer
```tsx
const [sessionChecked, setSessionChecked] = useState(false);
// Wait for session...
```
**Rejected**: Still has race condition, adds complexity

#### Option D: Use Only Middleware for Protection
**Rejected**: Loses client-side benefits, can't show loading states

### Estimated Implementation Time

- **Code Changes**: 30 minutes
- **Testing**: 1 hour
- **Documentation**: 30 minutes
- **Total**: ~2 hours

### Risk Assessment

**Risk Level**: LOW
- Only affects one component (signin-form.tsx)
- Uses existing, tested `signIn()` method
- No changes to API routes or middleware
- No changes to database or Supabase config
- Easy to rollback if needed

**Impact**: HIGH
- Fixes critical bug blocking all user access
- Improves UX with loading states
- Better error handling
- More maintainable code pattern

---

*Document Last Updated: 2025-09-30*
*Status: Ready for Implementation*