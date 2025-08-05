# File Structure and Associations Reference

This document provides a comprehensive overview of the Loom coaching platform codebase structure, file relationships, and architectural patterns.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Core Architecture](#core-architecture)
3. [Directory Structure](#directory-structure)
4. [Internationalization System](#internationalization-system)
5. [Component Architecture](#component-architecture)
6. [API Routes Structure](#api-routes-structure)
7. [Database Schema](#database-schema)
8. [Configuration System](#configuration-system)
9. [Security & Authentication](#security--authentication)
10. [File Associations & Dependencies](#file-associations--dependencies)

## Project Overview

**Technology Stack:**
- Framework: Next.js 15.3.5 with App Router
- Language: TypeScript
- Database: Supabase (PostgreSQL)
- Authentication: Supabase Auth with MFA
- Styling: Tailwind CSS 4
- UI Components: Radix UI primitives
- State Management: Zustand + React Query
- Internationalization: next-intl
- Testing: Vitest + Playwright
- Monitoring: Sentry
- Deployment: Vercel/Docker

**Architecture Style:** 
- Multi-tenant coaching platform
- Role-based access control (Admin, Coach, Client)
- Internationalized (English/Hebrew with RTL support)
- Progressive Web App with performance monitoring

## Core Architecture

### Application Layout Structure

```
src/app/
├── layout.tsx                     # Root layout (minimal passthrough)
├── [locale]/                      # Locale-based routing
│   ├── layout.tsx                 # Main locale layout with providers
│   ├── page.tsx                   # Home page
│   ├── (auth)/                    # Authentication routes
│   ├── (dashboard)/               # Dashboard routes
│   └── api/                       # API routes (not locale-specific)
```

### Provider Hierarchy

```
NextIntlClientProvider
└── QueryProvider (React Query)
    └── StoreProvider (Zustand)
        └── AuthProvider
            └── RealtimeProvider
                └── AnalyticsProvider
                    └── PerformanceMonitor
```

## Directory Structure

### Root Level Files

| File | Purpose | Key Dependencies |
|------|---------|------------------|
| `package.json` | Project dependencies and scripts | Next.js 15, React 19, Supabase |
| `next.config.js` | Next.js configuration with i18n setup | next-intl plugin |
| `middleware.ts` | Request routing, auth, and security | Supabase auth, next-intl |
| `tailwind.config.ts` | Tailwind CSS configuration | Custom design tokens |
| `tsconfig.json` | TypeScript configuration | Strict type checking |
| `docker-compose.yml` | Local development environment | Supabase stack |
| `Dockerfile` | Production container setup | Node.js, Nginx |

### Source Code Structure (`src/`)

#### Application Routes (`src/app/`)

```
app/
├── layout.tsx                     # Minimal root layout
├── globals.css                    # Global styles and CSS variables
├── [locale]/                      # Internationalized routes
│   ├── layout.tsx                 # Main layout with providers
│   ├── page.tsx                   # Landing page
│   ├── auth/                      # Authentication flows
│   │   ├── signin/page.tsx        # Sign in form
│   │   ├── signup/page.tsx        # Registration form
│   │   ├── callback/route.ts      # OAuth callback handler
│   │   ├── mfa-setup/page.tsx     # MFA setup wizard
│   │   └── mfa-verify/page.tsx    # MFA verification
│   ├── dashboard/page.tsx         # Unified dashboard
│   ├── sessions/                  # Session management
│   │   ├── page.tsx               # Session list
│   │   ├── new/page.tsx           # Create session
│   │   └── [id]/                  # Session details/edit
│   ├── client/                    # Client-specific pages
│   │   ├── page.tsx               # Client dashboard
│   │   ├── book/page.tsx          # Book session
│   │   ├── coaches/page.tsx       # Browse coaches
│   │   ├── progress/page.tsx      # Progress tracking
│   │   └── reflections/page.tsx   # Session reflections
│   ├── coach/                     # Coach-specific pages
│   │   ├── page.tsx               # Coach dashboard
│   │   ├── clients/               # Client management
│   │   ├── availability/page.tsx  # Schedule management
│   │   ├── insights/page.tsx      # Analytics insights
│   │   └── notes/page.tsx         # Client notes
│   ├── admin/                     # Admin panel
│   │   ├── page.tsx               # Admin dashboard
│   │   ├── users/page.tsx         # User management
│   │   ├── analytics/page.tsx     # System analytics
│   │   └── system/page.tsx        # System settings
│   └── settings/                  # User settings
│       ├── page.tsx               # Profile settings
│       ├── language/page.tsx      # Language preferences
│       └── notifications/page.tsx # Notification settings
└── api/                          # API routes (server-side)
    ├── auth/                     # Authentication endpoints
    ├── sessions/                 # Session CRUD operations
    ├── users/                    # User management
    ├── coaches/                  # Coach-specific operations
    ├── admin/                    # Admin operations
    └── widgets/                  # Dashboard widgets
```

#### Components (`src/components/`)

```
components/
├── ui/                           # Reusable UI primitives
│   ├── button.tsx                # Button component with variants
│   ├── card.tsx                  # Card container component
│   ├── dialog.tsx                # Modal dialog component
│   ├── input.tsx                 # Form input component
│   ├── language-switcher.tsx     # Language selection component
│   └── index.ts                  # Barrel exports
├── auth/                         # Authentication components
│   ├── auth-provider.tsx         # Auth context provider
│   ├── signin-form.tsx           # Sign in form
│   ├── signup-form.tsx           # Registration form
│   ├── mfa/                      # MFA components
│   │   ├── mfa-setup-wizard.tsx  # MFA setup flow
│   │   ├── mfa-qr-code.tsx       # QR code display
│   │   └── mfa-verification-input.tsx # TOTP input
│   └── route-guard.tsx           # Protected route wrapper
├── dashboard/                    # Dashboard components
│   ├── widgets/                  # Dashboard widgets
│   │   ├── session-list.tsx      # Session list widget
│   │   ├── progress-list.tsx     # Progress tracking
│   │   ├── achievement-grid.tsx  # Achievement display
│   │   └── user-management-table.tsx # Admin user table
│   ├── cards/                    # Dashboard cards
│   │   ├── stats-card.tsx        # Statistics display
│   │   └── progress-card.tsx     # Progress indicators
│   └── shared/                   # Shared dashboard utilities
│       ├── hooks.ts              # Dashboard-specific hooks
│       ├── types.ts              # Dashboard type definitions
│       └── utils.ts              # Dashboard utilities
├── sessions/                     # Session-related components
│   ├── forms/                    # Session forms
│   │   ├── session-information-form.tsx # Session details form
│   │   ├── session-goals-manager.tsx # Goals management
│   │   └── session-notes-editor.tsx # Notes editor
│   ├── display/                  # Session display components
│   │   ├── session-header.tsx    # Session title/status
│   │   ├── session-participants.tsx # Participant list
│   │   └── session-rating.tsx    # Session rating
│   ├── booking/                  # Booking components
│   │   └── unified-session-booking.tsx # Main booking flow
│   └── shared/                   # Session utilities
│       └── utils.ts              # Session helper functions
├── client/                       # Client-specific components
│   ├── client-dashboard.tsx      # Client dashboard layout
│   ├── book-page.tsx             # Session booking page
│   ├── coaches-page.tsx          # Coach browsing
│   └── progress-page.tsx         # Progress tracking
├── coach/                        # Coach-specific components
│   ├── coach-dashboard.tsx       # Coach dashboard layout
│   ├── clients-page.tsx          # Client management
│   ├── availability-manager.tsx  # Schedule management
│   └── insights-page.tsx         # Analytics display
├── admin/                        # Admin components
│   ├── analytics-page.tsx        # System analytics
│   ├── users-page.tsx            # User management
│   └── system-page.tsx           # System settings
├── settings/                     # Settings components
│   ├── settings-page.tsx         # Main settings layout
│   ├── language-settings-card.tsx # Language preferences
│   ├── notification-settings-card.tsx # Notification settings
│   └── profile-settings-card.tsx # Profile management
├── providers/                    # Context providers
│   ├── providers.tsx             # Main providers wrapper
│   ├── query-provider.tsx        # React Query setup
│   ├── store-provider.tsx        # Zustand store provider
│   ├── realtime-provider.tsx     # Real-time updates
│   └── analytics-provider.tsx    # Analytics tracking
├── navigation/                   # Navigation components
│   └── nav-menu.tsx              # Main navigation menu
├── notifications/                # Notification components
│   └── notification-center.tsx   # Notification panel
├── layout/                       # Layout components
│   ├── app-layout.tsx            # Main app layout
│   └── page-wrapper.tsx          # Page container
├── monitoring/                   # Monitoring components
│   └── performance-monitor.tsx   # Performance tracking
└── error-boundary.tsx            # Error boundary wrapper
```

#### Library Code (`src/lib/`)

```
lib/
├── auth/                         # Authentication utilities
│   ├── auth.ts                   # Auth helper functions
│   ├── auth-context.tsx          # Auth React context
│   ├── middleware.ts             # Auth middleware
│   └── permissions.ts            # Permission checking
├── supabase/                     # Supabase integration
│   ├── client.ts                 # Client-side Supabase
│   ├── server.ts                 # Server-side Supabase
│   └── middleware.ts             # Supabase middleware
├── database/                     # Database operations
│   ├── index.ts                  # Database connection
│   ├── sessions.ts               # Session queries
│   ├── users.ts                  # User queries
│   ├── notifications.ts          # Notification queries
│   └── services/                 # Database services
│       ├── session-crud.ts       # Session CRUD operations
│       ├── session-analytics.ts  # Session analytics
│       └── session-workflow.ts   # Session state management
├── api/                          # API utilities
│   ├── auth-client.ts            # Auth API client
│   ├── crud-routes.ts            # CRUD route helpers
│   ├── validation.ts             # API validation
│   └── errors.ts                 # Error handling
├── store/                        # State management
│   ├── index.ts                  # Store configuration
│   ├── auth-store.ts             # Authentication state
│   ├── session-store.ts          # Session state
│   └── notification-store.ts     # Notification state
├── queries/                      # React Query hooks
│   ├── index.ts                  # Query configuration
│   ├── sessions.ts               # Session queries
│   ├── users.ts                  # User queries
│   └── notifications.ts          # Notification queries
├── config/                       # Configuration
│   ├── index.ts                  # Main config class
│   ├── constants.ts              # App constants
│   ├── api-endpoints.ts          # API endpoint definitions
│   └── cancellation-policies.ts  # Business rules
├── security/                     # Security utilities
│   ├── headers.ts                # Security headers
│   ├── rate-limit.ts             # Rate limiting
│   ├── validation.ts             # Input validation
│   ├── password.ts               # Password utilities
│   └── mfa-rate-limit.ts         # MFA rate limiting
├── services/                     # Business logic services
│   ├── auth-service.ts           # Authentication service
│   ├── user-service.ts           # User management service
│   ├── analytics-service.ts      # Analytics service
│   ├── file-service.ts           # File handling service
│   └── mfa-service.ts            # MFA service
├── permissions/                  # Permission system
│   ├── index.ts                  # Permission definitions
│   ├── permissions.ts            # Permission logic
│   └── hooks.ts                  # Permission hooks
├── realtime/                     # Real-time features
│   ├── realtime-client.ts        # Real-time client
│   └── hooks.ts                  # Real-time hooks
├── performance/                  # Performance optimization
│   ├── index.ts                  # Performance utilities
│   ├── caching.ts                # Caching strategies
│   ├── lazy-loading.ts           # Component lazy loading
│   ├── optimization.ts           # Bundle optimization
│   └── web-vitals.ts             # Web vitals monitoring
├── monitoring/                   # Monitoring & analytics
│   ├── sentry.ts                 # Error tracking
│   └── analytics.ts              # User analytics
├── notifications/                # Notification system
│   ├── email-service.ts          # Email notifications
│   └── session-notifications.ts  # Session-specific notifications
├── accessibility/                # Accessibility utilities
│   ├── aria.ts                   # ARIA helpers
│   └── hooks.ts                  # Accessibility hooks
├── validation/                   # Validation schemas
│   └── common.ts                 # Common validation rules
├── db/                          # Database schema & ORM
│   ├── index.ts                  # Database connection
│   ├── schema.ts                 # Mock schema definitions
│   └── orm-functions.ts          # ORM helper functions
├── types/                        # Type definitions
│   └── result.ts                 # Result type utilities
└── utils.ts                      # General utilities
```

## Internationalization System

### Core i18n Files

| File | Purpose | Dependencies |
|------|---------|--------------|
| `src/i18n/config.ts` | i18n configuration and message loading | next-intl/server |
| `src/i18n/routing.ts` | Route localization setup | next-intl/routing |
| `src/i18n/request.ts` | Request-level i18n handling | next-intl |
| `src/messages/en.json` | English translations | - |
| `src/messages/he.json` | Hebrew translations | - |

### i18n Integration Points

**Next.js Configuration:**
- `next.config.js` includes `next-intl` plugin configuration
- Points to `src/i18n/request.ts` for request handling

**Middleware Integration:**
- `middleware.ts` uses `createMiddleware` from next-intl
- Handles locale detection and routing

**Layout Integration:**
- `[locale]/layout.tsx` sets HTML `lang` and `dir` attributes
- Provides locale context to all child components

**Component Usage:**
- Components use `useTranslations()` hook for translations
- Language switcher in `src/components/ui/language-switcher.tsx`

### Translation Structure

```json
{
  "common": {
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel"
  },
  "navigation": {
    "home": "Home",
    "dashboard": "Dashboard",
    "sessions": "Sessions"
  },
  "auth": {
    "signin": "Sign In",
    "signup": "Sign Up",
    "signout": "Sign Out"
  },
  "sessions": {
    "title": "Sessions",
    "book": "Book Session",
    "cancel": "Cancel Session"
  }
}
```

## Component Architecture

### UI Component System

**Base Components (`src/components/ui/`):**
- Built on Radix UI primitives
- Consistent styling with Tailwind CSS
- TypeScript interfaces for props
- Accessible by default
- Support for dark/light themes

**Composition Pattern:**
```typescript
// Example: Button component composition
<Button variant="primary" size="lg" disabled={loading}>
  {loading ? <Spinner /> : "Submit"}
</Button>
```

### Feature Components

**Authentication Components:**
- `AuthProvider` - Global auth state management
- `RouteGuard` - Protected route wrapper
- `SignInForm` - Login form with validation
- `MfaSetupWizard` - Multi-factor authentication setup

**Dashboard Components:**
- Role-specific dashboards (Client, Coach, Admin)
- Reusable widget system
- Real-time data updates
- Responsive grid layouts

**Session Components:**
- Unified booking flow
- Session state management
- Real-time status updates
- Form validation and error handling

### Component Relationships

```
App Layout
├── Navigation Menu
├── Main Content Area
│   ├── Page-specific Components
│   ├── Dashboard Widgets
│   └── Modal Dialogs
├── Notification Center
└── Performance Monitor
```

## API Routes Structure

### Authentication Routes (`/api/auth/`)

| Route | Method | Purpose | Security |
|-------|---------|---------|----------|
| `/auth/signin` | POST | User login | Rate limited |
| `/auth/signup` | POST | User registration | Rate limited |
| `/auth/signout` | POST | User logout | Authenticated |
| `/auth/me` | GET | Current user info | Authenticated |
| `/auth/mfa/setup` | POST | MFA setup | Authenticated |
| `/auth/mfa/verify` | POST | MFA verification | Rate limited |

### Session Routes (`/api/sessions/`)

| Route | Method | Purpose | Authorization |
|-------|---------|---------|---------------|
| `/sessions` | GET | List sessions | Role-based |
| `/sessions` | POST | Create session | Coach/Admin |
| `/sessions/[id]` | GET | Session details | Participant/Admin |
| `/sessions/[id]` | PUT | Update session | Coach/Admin |
| `/sessions/[id]/cancel` | POST | Cancel session | Participant/Admin |
| `/sessions/book` | POST | Book session | Client/Admin |

### Admin Routes (`/api/admin/`)

| Route | Method | Purpose | Authorization |
|-------|---------|---------|---------------|
| `/admin/users` | GET | List all users | Admin only |
| `/admin/analytics` | GET | System analytics | Admin only |
| `/admin/system` | GET | System status | Admin only |

### API Route Patterns

**Standard CRUD Pattern:**
```typescript
// GET /api/resource - List resources
// POST /api/resource - Create resource
// GET /api/resource/[id] - Get specific resource
// PUT/PATCH /api/resource/[id] - Update resource
// DELETE /api/resource/[id] - Delete resource
```

**Nested Resource Pattern:**
```typescript
// GET /api/users/[id]/sessions - User's sessions
// POST /api/sessions/[id]/cancel - Session actions
// GET /api/coaches/[id]/availability - Coach availability
```

## Database Schema

### Core Tables

**Users Table:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'client',
    first_name TEXT,
    last_name TEXT,
    timezone TEXT DEFAULT 'UTC',
    language language NOT NULL DEFAULT 'en',
    status user_status NOT NULL DEFAULT 'active',
    mfa_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Sessions Table:**
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    coach_id UUID REFERENCES users(id),
    client_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status session_status DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Database Service Layer:**
- `src/lib/database/sessions.ts` - Session queries
- `src/lib/database/users.ts` - User queries
- `src/lib/database/services/` - Business logic services

### Migration Files

| File | Purpose |
|------|---------|
| `20250704000001_initial_schema.sql` | Core tables and types |
| `20250704000002_rls_policies.sql` | Row Level Security |
| `20250704000003_functions_and_views.sql` | Database functions |
| `20250730000001_mfa_implementation.sql` | MFA support |
| `20250805000001_add_timezone_support.sql` | Timezone handling |

## Configuration System

### Configuration Architecture

**Main Configuration Class (`src/lib/config/index.ts`):**
- Singleton pattern for global access
- Environment-specific settings
- Validation on startup
- Type-safe configuration access

**Configuration Modules:**
- `constants.ts` - Application constants
- `api-endpoints.ts` - API endpoint definitions
- `cancellation-policies.ts` - Business rules

### Environment Configuration

```typescript
export const ENV_CONFIG = {
  DEVELOPMENT: {
    API_BASE_URL: 'http://localhost:3000',
    LOG_LEVEL: 'debug',
    CACHE_ENABLED: false
  },
  PRODUCTION: {
    API_BASE_URL: 'https://app.loom.com',
    LOG_LEVEL: 'error',
    CACHE_ENABLED: true
  }
};
```

### Feature Flags

```typescript
export const FEATURE_FLAGS = {
  MFA_ENABLED: true,
  REAL_TIME_UPDATES: true,
  ANALYTICS_TRACKING: true,
  FILE_UPLOADS: true
};
```

## Security & Authentication

### Security Layers

1. **Next.js Middleware (`middleware.ts`)**
   - Route protection
   - Authentication checks
   - Role-based access control
   - MFA verification

2. **API Route Security**
   - Request validation
   - Rate limiting
   - CORS protection
   - Input sanitization

3. **Database Security**
   - Row Level Security (RLS)
   - Role-based policies
   - Encrypted sensitive data

### Authentication Flow

```
User Request
├── Middleware Check
│   ├── Route Protected? → Require Auth
│   ├── Auth Valid? → Check Role
│   ├── MFA Required? → Verify MFA
│   └── Allow/Redirect
├── API Route Handler
│   ├── Validate Request
│   ├── Check Permissions
│   └── Process Request
└── Database Query
    ├── Apply RLS Policies
    └── Return Filtered Data
```

### MFA Implementation

**MFA Service (`src/lib/services/mfa-service.ts`):**
- TOTP generation and verification
- Backup codes management
- Trusted device handling
- Rate limiting for attempts

**MFA Components:**
- `mfa-setup-wizard.tsx` - Setup flow
- `mfa-qr-code.tsx` - QR code display
- `mfa-verification-input.tsx` - Code input

## File Associations & Dependencies

### Critical Path Dependencies

**Application Bootstrap:**
```
middleware.ts → i18n/routing.ts → auth/middleware.ts
├── Supabase client (lib/supabase/server.ts)
├── Security headers (lib/security/headers.ts)
└── Rate limiting (lib/security/rate-limit.ts)
```

**Page Rendering:**
```
[locale]/layout.tsx → components/providers/providers.tsx
├── Auth Provider (auth/auth-provider.tsx)
├── Query Provider (providers/query-provider.tsx)
├── Store Provider (providers/store-provider.tsx)
└── i18n Provider (next-intl)
```

**API Routes:**
```
api/*/route.ts → lib/api/crud-routes.ts
├── Authentication check (lib/auth/auth.ts)
├── Permission validation (lib/permissions/)
├── Database operations (lib/database/)
└── Response formatting (lib/api/utils.ts)
```

### Component Dependencies

**Dashboard Components:**
```
dashboard/page.tsx
├── dashboard/widgets/session-list.tsx
├── dashboard/cards/stats-card.tsx
├── charts/dashboard-charts.tsx
└── ui/card.tsx, ui/button.tsx
```

**Session Management:**
```
sessions/page.tsx
├── sessions/session-list.tsx
├── sessions/forms/session-information-form.tsx
├── sessions/display/session-header.tsx
└── ui/ components
```

### State Management Flow

**Global State (Zustand):**
```
store/index.ts
├── auth-store.ts (user session)
├── session-store.ts (current sessions)
└── notification-store.ts (notifications)
```

**Server State (React Query):**
```
queries/index.ts
├── sessions.ts (session queries)
├── users.ts (user queries)
└── notifications.ts (notification queries)
```

### Asset Dependencies

**Styling:**
```
globals.css
├── Tailwind base styles
├── Custom CSS variables
├── Component overrides
└── Accessibility styles (styles/accessibility.css)
```

**Static Assets:**
```
public/
├── *.svg (icons)
├── favicon.ico
└── manifest files
```

### Build Dependencies

**Build Process:**
```
next.config.js
├── next-intl plugin
├── Bundle optimization
├── Security headers
└── Performance optimizations
```

**Testing Setup:**
```
vitest.config.ts + playwright.config.ts
├── Test utilities (test/utils.tsx)
├── Test helpers (tests/helpers/)
└── Mock setup (test/setup.ts)
```

### Development Dependencies

**Code Quality:**
```
eslint.config.mjs
├── TypeScript rules
├── React rules
├── Next.js rules
└── Accessibility rules
```

**Scripts:**
```
scripts/
├── analyze-bundle.js (bundle analysis)
├── optimize-images.js (image optimization)
├── performance-audit.js (performance testing)
└── production-readiness-test.sh (deployment checks)
```

## Key Integration Points

### Database Integration
- Supabase client configuration in `lib/supabase/`
- Database operations in `lib/database/`
- Type safety with generated types in `types/supabase.ts`

### Real-time Features
- Supabase real-time subscriptions
- Real-time provider in `components/providers/realtime-provider.tsx`
- Real-time hooks in `lib/realtime/hooks.ts`

### Performance Monitoring
- Web vitals tracking in `lib/performance/web-vitals.ts`
- Performance monitor component
- Sentry integration for error tracking

### Accessibility
- ARIA utilities in `lib/accessibility/aria.ts`
- Accessible UI components
- Skip links and screen reader support
- RTL language support

This reference document provides a comprehensive overview of the codebase structure and relationships. Use it to understand how components interact, where to find specific functionality, and how the various systems integrate together.