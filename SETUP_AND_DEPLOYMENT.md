# Loom App Setup and Deployment Guide

This guide will walk you through setting up the Loom coaching platform locally, testing the application, and deploying it to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development Setup](#local-development-setup)
4. [Testing the Application](#testing-the-application)
5. [Deployment Options](#deployment-options)
6. [Production Configuration](#production-configuration)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.17 or later) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Git** for version control
- **Supabase account** - [Sign up here](https://supabase.com/)

## Environment Setup

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization and set project details:
   - **Name**: `loom-coaching-platform`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
4. Wait for project creation (2-3 minutes)

### 2. Configure Supabase Database

1. In your Supabase project dashboard, go to **SQL Editor**
2. Run the following SQL to set up the database schema:

```sql
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create custom user profiles table
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT CHECK (role IN ('client', 'coach', 'admin')) DEFAULT 'client',
    phone TEXT,
    bio TEXT,
    location TEXT,
    website TEXT,
    avatar_url TEXT,
    language TEXT CHECK (language IN ('en', 'he')) DEFAULT 'en',
    specialties TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_seen TIMESTAMP WITH TIME ZONE
);

-- Create sessions table
CREATE TABLE public.sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES public.user_profiles(id) NOT NULL,
    client_id UUID REFERENCES public.user_profiles(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')) DEFAULT 'scheduled',
    notes TEXT,
    goals TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('session', 'message', 'system', 'reminder')) DEFAULT 'system',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Function to handle user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, first_name, last_name, role, language)
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name',
        COALESCE(new.raw_user_meta_data->>'role', 'client'),
        COALESCE(new.raw_user_meta_data->>'language', 'en')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Configure Authentication

1. In Supabase Dashboard, go to **Authentication** → **Settings**
2. Configure **Site URL**:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: `http://localhost:3000/auth/callback`
3. **Email Templates** (optional): Customize signup/reset emails
4. **Providers** (optional): Enable social auth if needed

### 4. Environment Variables

Create a `.env.local` file in your project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000

# Email Configuration (Optional - for custom email service)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Monitoring (Optional)
SENTRY_DSN=https://your-sentry-dsn
NEXT_PUBLIC_SENTRY_DSN=https://your-public-sentry-dsn

# Development
NODE_ENV=development
```

**To get your Supabase keys:**
1. Go to **Project Settings** → **API**
2. Copy the **Project URL** and **anon/public key**
3. Copy the **service_role key** (keep this secret!)

## Local Development Setup

### 1. Install Dependencies

```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd loom-app

# Install dependencies
npm install
# or
yarn install
```

### 2. Start Development Server

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`

### 3. Create Admin User (Optional)

1. Sign up through the app at `http://localhost:3000/auth/signup`
2. Go to your Supabase dashboard → **Table Editor** → **user_profiles**
3. Find your user and change the `role` to `'admin'`

## Testing the Application

### 1. Manual Testing

**Test User Registration:**
```bash
# Navigate to signup page
http://localhost:3000/auth/signup

# Create test users with different roles:
# - Admin: admin@test.com
# - Coach: coach@test.com  
# - Client: client@test.com
```

**Test Authentication Flow:**
1. Sign up new users
2. Check email verification (in Supabase Auth logs)
3. Sign in with created users
4. Test password reset functionality
5. Test profile updates

**Test Role-Based Access:**
1. **Admin Access**: Visit `/admin/users`, `/admin/analytics`
2. **Coach Access**: Visit `/coach/clients`, `/coach/insights`
3. **Client Access**: Visit `/client/coaches`, `/client/progress`

**Test Core Features:**
1. **Sessions**: Create, edit, cancel sessions
2. **Notifications**: Check notification center
3. **Language Switching**: Test EN/HE language switch
4. **Settings**: Update profile, notification preferences

### 2. API Testing

Test API endpoints using curl or Postman:

```bash
# Test authentication
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test user profile
curl http://localhost:3000/api/auth/me \
  -H "Cookie: sb-access-token=your-token"

# Test API documentation
curl http://localhost:3000/api/auth/docs
```

### 3. Automated Testing (Optional)

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Connect Repository:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

2. **Configure Environment Variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add all environment variables from `.env.local`
   - Update `NEXT_PUBLIC_SITE_URL` to your production domain

3. **Update Supabase Settings:**
   - Site URL: `https://your-domain.vercel.app`
   - Redirect URLs: `https://your-domain.vercel.app/auth/callback`

### Option 2: Netlify

1. **Deploy:**
   ```bash
   # Build the project
   npm run build
   
   # Deploy to Netlify
   # Drag and drop the 'out' folder to Netlify
   ```

2. **Configure:**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Add environment variables in Netlify dashboard

### Option 3: Docker

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine AS deps
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production

   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY . .
   COPY --from=deps /app/node_modules ./node_modules
   RUN npm run build

   FROM node:18-alpine AS runner
   WORKDIR /app
   ENV NODE_ENV production
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/.next ./.next
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/package.json ./package.json

   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Build and Run:**
   ```bash
   docker build -t loom-app .
   docker run -p 3000:3000 --env-file .env.local loom-app
   ```

### Option 4: Railway

1. **Deploy:**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway init
   railway up
   ```

2. **Configure:**
   - Add environment variables in Railway dashboard
   - Railway automatically detects Next.js projects

## Production Configuration

### 1. Environment Variables for Production

Update your production `.env` file:

```bash
# Production Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Production URLs
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com

# Production Email
SMTP_HOST=your-production-smtp-host
SMTP_USER=your-production-email
SMTP_PASS=your-production-password

# Security
NODE_ENV=production
```

### 2. Security Checklist

- [ ] **Environment Variables**: All sensitive keys are in environment variables
- [ ] **HTTPS**: SSL certificate configured
- [ ] **CORS**: Proper CORS configuration in Supabase
- [ ] **RLS**: Row Level Security enabled on all tables
- [ ] **Rate Limiting**: API rate limiting configured
- [ ] **Email Verification**: Required for new users
- [ ] **Strong Passwords**: Password complexity requirements
- [ ] **Security Headers**: Configure security headers in `next.config.js`

### 3. Performance Optimization

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'origin-when-cross-origin',
        },
      ],
    },
  ],
}

module.exports = nextConfig
```

### 4. Monitoring Setup

1. **Error Tracking**: Configure Sentry for error monitoring
2. **Analytics**: Set up Google Analytics or PostHog
3. **Performance**: Monitor Core Web Vitals
4. **Database**: Monitor Supabase database performance
5. **Uptime**: Set up uptime monitoring (UptimeRobot, Pingdom)

## Troubleshooting

### Common Issues

**1. Supabase Connection Errors:**
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Verify Supabase project is active
```

**2. Authentication Issues:**
- Check Site URL in Supabase settings
- Verify redirect URLs are correct
- Ensure RLS policies are properly configured

**3. Build Errors:**
```bash
# Clear Next.js cache
rm -rf .next
npm run build

# Check for TypeScript errors
npm run type-check
```

**4. Database Issues:**
- Check Supabase logs in dashboard
- Verify table schemas are correct
- Test database queries in SQL editor

**5. Environment Variable Issues:**
```bash
# Restart development server after changing .env
npm run dev

# Check if variables are loaded
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```

### Getting Help

- **Documentation**: Check [Next.js docs](https://nextjs.org/docs)
- **Supabase Support**: [Supabase documentation](https://supabase.com/docs)
- **Community**: Join the [Discord server](link-to-discord)
- **Issues**: Create issues in the GitHub repository

### Logs and Debugging

```bash
# View application logs
npm run dev -- --debug

# Check Supabase logs
# Go to Supabase Dashboard → Logs

# Production logs (Vercel)
vercel logs your-deployment-url
```

## Next Steps

After successful deployment:

1. **Setup Custom Domain** (if using Vercel/Netlify)
2. **Configure Email Provider** for transactional emails
3. **Setup Backup Strategy** for Supabase database
4. **Implement Analytics** and monitoring
5. **Setup CI/CD Pipeline** for automated deployments
6. **Configure CDN** for static assets
7. **Setup Staging Environment** for testing

---

**Congratulations!** 🎉 Your Loom coaching platform is now ready for production use.

For additional support or questions, please refer to the documentation or contact the development team.