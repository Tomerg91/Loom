# Loom App - Bug Documentation & Fix Checklist

## Project Overview
- **Technology Stack**: Next.js 15.3.5 with React 19, TypeScript, Supabase, Tailwind CSS 4
- **Deployment**: Vercel (https://loom-hxe5bultq-tomer-s-projects-bcd27563.vercel.app)
- **Current Status**: Final bug fixing phase

---

## Bug Reports Analysis & Atomic Fix Checklist

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
1. **Bug #3** (Critical): Invalid URL Constructor - blocks authentication
2. **Bug #1** (Medium): CSS MIME Type - affects resource loading
3. **Bug #4** (Medium): CSP Violation - security/functionality issue
4. **Bug #2** (Low): Font 404 - cosmetic issue

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