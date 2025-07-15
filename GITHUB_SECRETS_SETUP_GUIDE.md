# 🔐 GitHub Secrets Setup Guide for Loom App

## 🎯 **CRITICAL: Required Repository Secrets**

To fix the current build failure (`NEXT_PUBLIC_SUPABASE_URL` missing), you need to configure the following GitHub repository secrets.

### **How to Add Secrets**
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret below

---

## 📋 **Required Secrets List**

### **1. Supabase Configuration (CRITICAL)**
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://uwneoxkanryjuwdszrua.supabase.co
```

```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY  
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bmVveGthbnJ5anV3ZHN6cnVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjQ2NTIsImV4cCI6MjA2NzU0MDY1Mn0.pJX-z5kv0fjBg-404NfFJFFAfxiAklqpjzLR2HWaRl8
```

```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bmVveGthbnJ5anV3ZHN6cnVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk2NDY1MiwiZXhwIjoyMDY3NTQwNjUyfQ.Q4MyPE1V3LMK9Y7Vu5R9Hc7upK9HJuqvqI1BudwLXs8
```

### **2. Application URLs**
```
Name: NEXT_PUBLIC_APP_URL
Value: https://your-production-domain.com  # Update with your actual domain
```

```
Name: PRODUCTION_URL
Value: https://your-production-domain.com  # Same as above
```

### **3. Vercel Deployment (Required for CD)**
```
Name: VERCEL_TOKEN
Value: [Get from Vercel Dashboard → Settings → Tokens]
```

```
Name: VERCEL_ORG_ID
Value: [Get from Vercel Dashboard → Settings → General]
```

```
Name: VERCEL_PROJECT_ID
Value: [Get from your Vercel project settings]
```

### **4. Database Migration**
```
Name: DATABASE_URL
Value: postgresql://postgres:[password]@db.uwneoxkanryjuwdszrua.supabase.co:5432/postgres
```

```
Name: SUPABASE_ACCESS_TOKEN
Value: [Get from Supabase Dashboard → Settings → API]
```

### **5. Optional - Monitoring & Analytics**
```
Name: LHCI_GITHUB_APP_TOKEN
Value: [For Lighthouse CI - optional]
```

```
Name: NEXT_PUBLIC_SENTRY_DSN
Value: [For error monitoring - optional]
```

---

## 🚨 **IMMEDIATE ACTION REQUIRED**

### **Step 1: Add Critical Secrets**
Add these **3 secrets immediately** to fix the build failure:
1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
3. `SUPABASE_SERVICE_ROLE_KEY`

### **Step 2: Update Production URL**
Replace `https://your-production-domain.com` with your actual domain in:
- `NEXT_PUBLIC_APP_URL`
- `PRODUCTION_URL`

### **Step 3: Test the Fix**
After adding secrets:
1. Go to **Actions** tab in GitHub
2. Click **Re-run jobs** on the failed workflow
3. Verify build step passes

---

## 🔍 **Verification Commands**

After setting up secrets, you can verify locally:

```bash
# Test local build (should work)
cd /Users/tomergalansky/Desktop/loom-app
npm run build

# Check environment variables
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

---

## 📝 **Secret Security Notes**

### **Safe to Share (Public Keys)**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Public Supabase project URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anonymous key (intended for client-side)

### **Keep Private (Sensitive Keys)**
- 🔒 `SUPABASE_SERVICE_ROLE_KEY` - Server-side admin key
- 🔒 `VERCEL_TOKEN` - Deployment access token  
- 🔒 `DATABASE_URL` - Direct database access
- 🔒 `SUPABASE_ACCESS_TOKEN` - Supabase admin access

### **Important Notes**
- Supabase anon keys are designed to be public (RLS policies protect data)
- Service role keys bypass RLS and should be kept secret
- All secrets should be added to GitHub repository secrets, never committed to code

---

## 🆘 **If You Need Help**

### **Finding Supabase Credentials**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `uwneoxkanryjuwdszrua`
3. Go to **Settings** → **API**
4. Copy the values for URL and anon key

### **Finding Vercel Credentials**  
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Go to **Settings** → **Tokens** (for VERCEL_TOKEN)
3. Go to your project → **Settings** → **General** (for project/org IDs)

### **Testing the Fix**
Once secrets are added, the GitHub Actions workflow should pass. The error about missing `NEXT_PUBLIC_SUPABASE_URL` should be resolved.

---

*Last Updated: 2025-07-15*
*Priority: CRITICAL - Required for build fixes*