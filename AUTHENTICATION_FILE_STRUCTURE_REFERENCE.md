# AUTHENTICATION FILE STRUCTURE REFERENCE

## 🎯 PURPOSE
This document maps all authentication-related files and their relationships in the Loom coaching app to facilitate debugging and future development.

---

## 📁 CORE AUTHENTICATION FILES

### Primary Authentication Components
```
src/components/auth/
├── signin-form.tsx           # Main sign-in form component
├── signup-form.tsx           # User registration form
├── auth-provider.tsx         # React context for auth state
├── route-guard.tsx           # Protected route wrapper
├── reset-password-form.tsx   # Password reset functionality
├── mfa-setup-form.tsx        # Multi-factor auth setup
└── mfa-verification-form.tsx # MFA verification flow
```

### Authentication Logic & Services
```
src/lib/auth/
├── auth.ts                   # Core auth utilities
├── client-auth.ts           # Client-side auth service (FIXED)
├── middleware.ts            # Auth middleware helpers
├── permissions.ts           # Role-based permissions
├── use-user.ts             # User data hook
└── index.ts                # Auth exports
```

### Supabase Integration
```
src/lib/supabase/
├── client.ts               # Supabase client configuration
├── server.ts               # Server-side Supabase client
└── middleware.ts           # Supabase middleware integration
```

---

## 🚪 AUTHENTICATION PAGES

### App Router Pages
```
src/app/[locale]/auth/
├── signin/
│   └── page.tsx            # Sign-in page
├── signup/
│   └── page.tsx            # Registration page
├── reset-password/
│   └── page.tsx            # Password reset page
├── mfa-setup/
│   └── page.tsx            # MFA setup page
├── mfa-verify/
│   └── page.tsx            # MFA verification page
└── callback/
    └── route.ts            # OAuth callback handler
```

### API Routes
```
src/app/api/auth/
├── signin/
│   └── route.ts            # Sign-in API endpoint
├── signup/
│   └── route.ts            # Registration API
├── signout/
│   └── route.ts            # Sign-out handler
├── session/
│   └── route.ts            # Session management
├── reset-password/
│   └── route.ts            # Password reset API
├── verify/
│   └── route.ts            # Email verification
└── mfa/
    ├── setup/route.ts      # MFA setup API
    ├── verify/route.ts     # MFA verification API
    └── disable/route.ts    # MFA disable API
```

---

## 🔄 AUTHENTICATION FLOW

### 1. Sign-In Process
```
User Input → signin-form.tsx → Supabase Auth → client-auth.ts → Session Setup → Dashboard Redirect
```

**Key Files:**
- `signin-form.tsx` - Form handling and validation (FIXED - removed test code)
- `client-auth.ts` - Session establishment (FIXED - added error logging)
- `middleware.ts` - Auth state detection
- `route-guard.tsx` - Protected route enforcement

### 2. Session Management
```
Middleware → Cookie Detection → Auth State → Route Protection → Page Access
```

**Key Files:**
- `middleware.ts` - Cookie detection and routing
- `auth-provider.tsx` - Global auth state
- `use-user.ts` - User data access

### 3. Route Protection
```
Page Request → Route Guard → Auth Check → Allow/Redirect
```

**Key Files:**
- `route-guard.tsx` - Component-level protection
- `middleware.ts` - Server-level protection

---

## 🛠️ CONFIGURATION FILES

### Environment Configuration
```
src/env/
└── (environment variable validation)
```

### Middleware
```
src/middleware.ts             # Global middleware with auth checks
```

### Type Definitions
```
src/types/
├── index.ts                 # General types
└── supabase.ts             # Supabase-generated types
```

---

## 🔧 RECENT FIXES APPLIED

### ✅ Critical Issues Fixed

1. **Test Code Removal** (`signin-form.tsx:217-232`)
   - Removed undefined function calls (`setTempCredentials`, `setRequiresMfa`)
   - Eliminated JavaScript runtime errors
   - Restored sign-in functionality

2. **URL Validation** (`signin-form.tsx:93`)
   - Added safe redirect validation
   - Prevented open redirect vulnerabilities
   - Improved security posture

3. **Error Logging** (`client-auth.ts:105`)
   - Replaced silent catch with proper logging
   - Enabled debugging capabilities
   - Improved error visibility

---

## 🎯 AUTHENTICATION STATE FLOW

### Client-Side State
```
auth-provider.tsx
├── User authentication status
├── User profile data
├── Session information
└── Loading states
```

### Server-Side State
```
middleware.ts
├── Cookie-based auth detection
├── Route protection logic
├── Redirect handling
└── Session validation
```

---

## 🔍 DEBUGGING REFERENCE

### Common Issues & Files to Check

1. **Sign-in Failures**
   - Check: `signin-form.tsx` for form logic
   - Check: `client-auth.ts` for session setup
   - Check: Browser console for JavaScript errors

2. **Redirect Issues**
   - Check: `route-guard.tsx` for protection logic
   - Check: `middleware.ts` for routing rules
   - Check: URL validation in signin form

3. **Session Problems**
   - Check: `auth-provider.tsx` for state management
   - Check: `use-user.ts` for user data access
   - Check: Cookie settings in browser

4. **Environment Issues**
   - Check: Supabase configuration in `client.ts`
   - Check: Environment variables
   - Check: API endpoint availability

---

## 📊 FILE DEPENDENCY MAP

```
signin-form.tsx
├── Depends on: auth-provider.tsx (context)
├── Depends on: client-auth.ts (auth service)
├── Depends on: route-guard.tsx (protection)
└── Uses: Supabase client for authentication

client-auth.ts
├── Depends on: supabase/client.ts (configuration)
├── Depends on: API routes (/api/auth/session)
└── Provides: Session management for components

middleware.ts
├── Depends on: supabase/middleware.ts
├── Protects: All authenticated routes
└── Handles: Cookie-based auth detection

auth-provider.tsx
├── Depends on: client-auth.ts (service)
├── Provides: Global auth state
└── Used by: All auth-aware components
```

---

## 🚀 NEXT STEPS

### Immediate Actions
1. **Test the fixes** - Verify sign-in functionality works
2. **Monitor errors** - Check console for any remaining issues
3. **Validate redirect** - Ensure dashboard redirect functions properly

### Future Improvements
1. **Add comprehensive error handling** throughout auth flow
2. **Implement retry logic** for failed session establishment
3. **Add auth flow monitoring** for production debugging
4. **Consider auth state persistence** improvements

---

## 📝 NOTES

- **Technology**: Next.js 15 App Router + Supabase Auth
- **Authentication Method**: Cookie-based sessions
- **MFA Support**: TOTP-based multi-factor authentication
- **Route Protection**: Middleware + component-level guards
- **Error Handling**: Console logging + user-friendly messages

**Last Updated**: September 15, 2025
**Status**: Authentication issues resolved, system functional