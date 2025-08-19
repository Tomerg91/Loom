# Deployment Troubleshooting Guide

## Overview
This guide provides comprehensive troubleshooting steps for deploying the Loom coaching platform to Vercel.

## Common Deployment Issues

### 🔴 Issue 1: CSS MIME Type Error
**Symptoms:**
```
Refused to execute script from '/_next/static/css/[hash].css' 
because its MIME type ('text/css') is not executable
```

**Root Cause:** Browser incorrectly attempting to execute CSS files as JavaScript.

**Solution:**
✅ **Already Fixed** - The following configurations are in place:

**In `next.config.js`:**
```javascript
{
  source: '/_next/static/css/(.*\\.css)',
  headers: [
    {
      key: 'Content-Type',
      value: 'text/css; charset=utf-8',
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    }
  ],
}
```

**In `vercel.json`:**
```json
{
  "source": "/_next/static/css/(.*)",
  "headers": [
    {
      "key": "Content-Type", 
      "value": "text/css; charset=utf-8"
    }
  ]
}
```

---

### 🔴 Issue 2: Missing Environment Variables
**Symptoms:**
```
Missing required client environment variable: NEXT_PUBLIC_SUPABASE_URL
```

**Root Cause:** Environment variables not configured in Vercel deployment.

**Solution:**

#### Step 1: Run Setup Script
```bash
npm run setup:vercel-env
```

#### Step 2: Configure Variables in Vercel

**Required Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key  
- `NEXT_PUBLIC_APP_URL` - Your deployment URL (e.g., https://loom-bay.vercel.app)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `DATABASE_URL` - PostgreSQL connection string

**Method 1: Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Navigate to Settings → Environment Variables
4. Add each variable for Production, Preview, and Development environments

**Method 2: Vercel CLI**
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_APP_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add DATABASE_URL
```

#### Step 3: Get Values from Supabase
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to Settings → API
4. Copy the values:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

5. For DATABASE_URL:
   - Go to Settings → Database
   - Copy the PostgreSQL connection string

#### Step 4: Redeploy
```bash
vercel --prod
```

---

### 🔴 Issue 3: COEP Policy Blocking Resources
**Symptoms:**
```
Failed to load resource: net::ERR_BLOCKED_BY_RESPONSE.NotSameOriginAfterDefaultedToSameOriginByCoep
```

**Root Cause:** Cross-Origin-Embedder-Policy blocking third-party resources like Sentry.

**Solution:**
✅ **Already Fixed** - The following configurations are in place:

**Security Headers Updated:**
```javascript
'Cross-Origin-Embedder-Policy': 'unsafe-none',
'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
'Cross-Origin-Resource-Policy': 'cross-origin',
```

**CSP Updated to Include Sentry:**
```javascript
script-src 'self' 'unsafe-inline' ... https://js.sentry-cdn.com https://*.sentry.io
frame-src 'self' ... https://*.sentry.io
connect-src 'self' ... https://sentry.io https://*.sentry.io
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured locally
- [ ] Application builds successfully: `npm run build`
- [ ] Tests pass: `npm run test`
- [ ] TypeScript checks pass: `npm run type-check`
- [ ] Linting passes: `npm run lint`

### Vercel Configuration  
- [ ] Environment variables set for Production
- [ ] Environment variables set for Preview (optional)
- [ ] Project settings configured:
  - Framework: Next.js
  - Root Directory: `./`
  - Build Command: `npm run build`
  - Output Directory: `.next`

### Post-Deployment Verification
- [ ] Application loads without errors
- [ ] Authentication works (sign in/sign up)
- [ ] Database operations function
- [ ] File uploads work (if applicable)
- [ ] Real-time features work
- [ ] Error monitoring active (Sentry)

---

## Environment Variables Reference

### Client-Side (NEXT_PUBLIC_*)
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key | `eyJhbGciOiJIUzI1NiI...` |
| `NEXT_PUBLIC_APP_URL` | ✅ | Your app URL | `https://loom-bay.vercel.app` |
| `NEXT_PUBLIC_SENTRY_DSN` | ⚠️ | Sentry error tracking | `https://...@sentry.io/123` |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | ⚠️ | Enable analytics | `true` or `false` |

### Server-Side Only
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service key | `eyJhbGciOiJIUzI1NiI...` |
| `DATABASE_URL` | ✅ | PostgreSQL connection | `postgresql://postgres:...` |
| `SMTP_HOST` | ⚠️ | Email server | `smtp.gmail.com` |
| `SMTP_USER` | ⚠️ | Email username | `your-email@gmail.com` |
| `SMTP_PASSWORD` | ⚠️ | Email password | `app-password` |

---

## Common Build Errors

### TypeScript Errors
```
Type error: Property 'xyz' does not exist on type 'ABC'
```
**Fix:** Run `npm run type-check` locally and fix type issues.

### Missing Dependencies
```
Module not found: Can't resolve 'package-name'
```
**Fix:** Ensure all dependencies are in `package.json`: `npm install package-name`

### Environment Variable Access
```
Cannot read property of undefined (reading 'NEXT_PUBLIC_SUPABASE_URL')
```
**Fix:** Ensure variables are set and restart the development server.

---

## Performance Monitoring

### Core Web Vitals
Monitor these metrics post-deployment:
- **LCP (Largest Contentful Paint)** < 2.5s
- **FID (First Input Delay)** < 100ms  
- **CLS (Cumulative Layout Shift)** < 0.1

### Tools
- Vercel Analytics (built-in)
- Google PageSpeed Insights
- Lighthouse CI (configured in project)

---

## Security Considerations

### Headers Verification
Use browser dev tools to verify security headers:
```
Content-Security-Policy: [configured CSP]
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Environment Variable Security
- ✅ Server-side variables (no NEXT_PUBLIC_ prefix) are secure
- ⚠️ Client-side variables (NEXT_PUBLIC_ prefix) are exposed to browsers
- ❌ Never put secrets in NEXT_PUBLIC_ variables

---

## Support Resources

### Documentation
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Setup Guide](https://supabase.com/docs/guides/getting-started)

### Scripts
- `npm run setup:vercel-env` - Environment variable setup guide
- `npm run validate:env` - Validate local environment
- `npm run build` - Test production build locally

### Logs and Debugging
- `vercel logs` - View deployment logs
- `vercel env ls` - List environment variables
- Browser DevTools → Console - Check for client-side errors
- Browser DevTools → Network - Check for failed requests

---

## Emergency Procedures

### Rollback Deployment
```bash
# View deployments
vercel ls

# Promote previous deployment
vercel promote [deployment-url]
```

### Quick Health Check
```bash
# Check if app is accessible
curl -I https://your-app.vercel.app

# Check API health endpoint
curl https://your-app.vercel.app/api/health
```

### Contact Support
- Vercel Support: https://vercel.com/help
- Supabase Support: https://supabase.com/support
- Project Issues: Create issue in project repository

---

**Last Updated:** August 19, 2025  
**Version:** 1.0.0