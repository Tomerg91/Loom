# 🚀 Vercel Deployment Guide - Loom App

## Quick Fix for Production Issues

### 🔥 **Issue 1: MIME Type Error (CSS files treated as scripts)**
**Error**: `Refused to execute script from CSS file because its MIME type ('text/css') is not executable`

**✅ Solution**: Fixed with `vercel.json` configuration
- Added explicit MIME type headers for CSS files
- Configured proper caching for static assets
- Files updated: `vercel.json`, `src/middleware.ts`

### 🔥 **Issue 2: Supabase Configuration Missing**
**Error**: `Invalid Supabase URL configuration: MISSING_SUPABASE_URL`

**✅ Solution**: Set up environment variables in Vercel

---

## 🛠️ Step-by-Step Fix Instructions

### **Method 1: Automated Setup (Recommended)**

1. **Run the environment setup script**:
   ```bash
   node scripts/setup-vercel-env-production.js
   ```

2. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### **Method 2: Manual Setup**

#### **Step 1: Set Environment Variables in Vercel Dashboard**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your Loom project
3. Navigate to **Settings** → **Environment Variables**
4. Add these variables for **Production** environment:

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Your Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Your Supabase service role key |
| `NEXT_PUBLIC_SITE_URL` | `https://loom-app.vercel.app` | Your deployed site URL |

#### **Step 2: Redeploy**

```bash
vercel --prod
```

---

## 🔍 Finding Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

---

## ✅ Verification Steps

After deployment, verify the fixes:

### **1. Check CSS Loading**
Open browser dev tools and verify:
- CSS files return `200 OK` status
- `Content-Type: text/css; charset=utf-8` header is present
- No MIME type errors in console

### **2. Check Supabase Connection**
- App loads without "MISSING_SUPABASE_URL" errors
- Authentication features work
- Database queries execute successfully

### **3. Test Health Endpoint**
Visit: `https://your-app.vercel.app/api/health`
Should return: `{"status":"ok","timestamp":"..."}`

---

## 🛡️ Security & Performance Optimizations Applied

### **Static Asset Handling**
- ✅ Proper MIME type headers for CSS/JS files
- ✅ Optimized caching with `max-age=31536000`
- ✅ Cross-origin resource policy for CDN compatibility

### **Middleware Optimization**
- ✅ Static files bypass all middleware processing
- ✅ Edge Runtime configuration for better performance
- ✅ Comprehensive file extension exclusions

### **API Configuration**
- ✅ Increased memory limit to 512MB for API routes
- ✅ 10-second timeout for complex operations
- ✅ Proper error handling and logging

---

## 🐛 Troubleshooting

### **Still seeing MIME type errors?**
1. Clear browser cache completely
2. Check browser dev tools → Network tab
3. Verify CSS files have `Content-Type: text/css`
4. Check for any caching plugins or CDN settings

### **Still seeing Supabase URL errors?**
1. Verify environment variables are set in Vercel dashboard
2. Check variable names match exactly (case-sensitive)
3. Ensure variables are enabled for "Production" environment
4. Try redeploying: `vercel --prod --force`

### **Deployment still failing?**
```bash
# Check Vercel CLI connection
vercel whoami

# List your projects
vercel ls

# Check environment variables
vercel env ls

# Force redeploy
vercel --prod --force
```

---

## 📱 Commands Reference

```bash
# Install Vercel CLI (if needed)
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link

# Set environment variable
vercel env add VARIABLE_NAME production

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View deployment logs
vercel logs
```

---

## ✨ What Was Fixed

### **Files Created/Updated**:
- ✅ `vercel.json` - MIME type and caching configuration
- ✅ `scripts/setup-vercel-env-production.js` - Automated environment setup
- ✅ `VERCEL_DEPLOYMENT_GUIDE.md` - This guide

### **Root Causes Resolved**:
1. **MIME Type Issue**: CSS files were being processed by middleware instead of served as static assets
2. **Environment Variables**: Missing Supabase credentials in production environment
3. **Configuration Conflicts**: Improper header configurations between Next.js and Vercel

### **Performance Improvements**:
- Static assets now bypass all middleware processing
- Proper caching headers for optimal CDN performance  
- Edge Runtime configuration for faster response times

---

🎉 **Your Loom app should now deploy successfully to Vercel without errors!**