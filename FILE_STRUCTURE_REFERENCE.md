# Loom App - File Structure & Associations Reference

## Project Architecture: Next.js 15 Coaching Platform
**Updated**: August 4, 2025  
**Technology Stack**: Next.js 15 + React 19 + TypeScript + Supabase + Tailwind CSS

---

## 📁 ROOT DIRECTORY STRUCTURE

```
loom-app/
├── .github/                    # CI/CD workflows & security automation
├── .next/                      # Next.js build output (auto-generated)
├── .vercel/                    # Vercel deployment configuration
├── public/                     # Static assets & PWA files
├── src/                        # Main application source code
├── supabase/                   # Database migrations & configuration
├── tests/                      # Global test configuration
├── tailwind.config.ts          # Tailwind CSS design system
├── next.config.js              # Next.js configuration
├── package.json                # Dependencies & scripts
├── tsconfig.json               # TypeScript configuration
├── docker-compose.yml          # Local development environment
├── Dockerfile                  # Production container build
└── nginx.conf                  # Production reverse proxy
```

---

## 🔧 CONFIGURATION FILES ASSOCIATIONS

### Core Framework Configuration
| File | Purpose | Associated Files | Notes |
|------|---------|------------------|-------|
| `next.config.js` | Next.js framework setup | `src/i18n/`, `src/middleware.ts` | Security headers, i18n routing |
| `tsconfig.json` | TypeScript compiler | All `.ts/.tsx` files | Path aliases (`@/*`) |
| `tailwind.config.ts` | CSS framework | `src/components/`, `postcss.config.mjs` | Design tokens, themes |
| `package.json` | Dependencies & scripts | `package-lock.json`, `node_modules/` | 15+ Radix UI components |

### Development & Deployment
| File | Purpose | Associated Files | Notes |
|------|---------|------------------|-------|
| `eslint.config.mjs` | Code linting | All source files | Strict TypeScript rules |
| `vitest.config.ts` | Unit testing setup | `tests/`, `src/**/*.test.ts` | Vitest configuration |
| `playwright.config.ts` | E2E testing | `tests/e2e/` | Browser automation |
| `docker-compose.yml` | Local development | `Dockerfile`, `nginx.conf` | Full stack local env |
| `vercel.json` | Production deployment | `.vercel/`, `dist/` | Serverless deployment |

---

## 🎯 SOURCE CODE STRUCTURE (`src/`)

### Application Router (`src/app/`)
```
src/app/
├── [locale]/                   # Internationalized routing (en/he)
│   ├── (auth)/                # Authentication group routes
│   │   ├── signin/            # Sign in page
│   │   ├── signup/            # User registration  
│   │   └── reset-password/    # Password reset flow
│   ├── (dashboard)/           # Protected dashboard routes
│   │   ├── dashboard/         # Main dashboard
│   │   ├── sessions/          # Session management
│   │   └── settings/          # User preferences
│   ├── admin/                 # Admin-only routes (RBAC)
│   │   ├── users/            # User management
│   │   ├── analytics/        # System analytics
│   │   └── system/           # System configuration
│   ├── coach/                 # Coach role routes
│   │   ├── clients/          # Client management
│   │   ├── availability/     # Schedule management
│   │   ├── insights/         # Performance metrics
│   │   └── notes/            # Session notes
│   └── client/                # Client role routes
│       ├── coaches/          # Browse coaches
│       ├── book/             # Session booking
│       ├── progress/         # Progress tracking
│       └── reflections/      # Personal reflections
├── api/                       # Backend API routes
│   ├── auth/                 # Authentication endpoints
│   │   ├── signin/           # Login endpoint
│   │   ├── signup/           # Registration endpoint
│   │   ├── callback/         # OAuth callback
│   │   └── mfa/              # Multi-factor auth (7 endpoints)
│   ├── sessions/             # Session CRUD operations
│   ├── users/                # User management
│   ├── notifications/        # Notification system
│   ├── admin/                # Admin operations
│   ├── coach/                # Coach-specific APIs
│   ├── client/               # Client-specific APIs
│   └── widgets/              # Dashboard widget data
├── globals.css               # Global CSS & Tailwind imports
├── layout.tsx                # Root layout with providers
└── not-found.tsx             # 404 error page
```

### Component Architecture (`src/components/`)
```
src/components/
├── ui/                        # Reusable UI primitives (Radix-based)
│   ├── button.tsx            # Button variants & states
│   ├── input.tsx             # Form input components
│   ├── modal.tsx             # Modal dialog system
│   ├── toast.tsx             # Notification toasts
│   ├── dropdown-menu.tsx     # Accessible dropdown menus
│   ├── sheet.tsx             # Slide-out panels
│   ├── skeleton.tsx          # Loading skeletons
│   ├── progress.tsx          # Progress indicators
│   ├── calendar.tsx          # Date picker component
│   └── data-table.tsx        # Sortable data tables
├── auth/                      # Authentication components
│   ├── signin-form.tsx       # Sign in form with MFA
│   ├── signup-form.tsx       # Registration form
│   ├── reset-password-form.tsx # Password reset
│   └── mfa/                  # Multi-factor authentication
│       ├── mfa-setup-form.tsx     # MFA enrollment
│       ├── mfa-verification-form.tsx # MFA challenge
│       └── backup-codes.tsx       # Recovery codes
├── dashboard/                 # Role-specific dashboards
│   ├── admin/                # Admin dashboard components
│   ├── coach/                # Coach dashboard components
│   ├── client/               # Client dashboard components
│   └── shared/               # Shared dashboard widgets
├── sessions/                  # Session management
│   ├── session-card.tsx      # Session display component
│   ├── booking-form.tsx      # Session booking interface
│   ├── session-list.tsx      # Session list with filters
│   └── session-details.tsx   # Detailed session view
├── notifications/             # Notification system
│   ├── notification-bell.tsx # Notification icon with count
│   ├── notification-list.tsx # Notification feed
│   └── notification-item.tsx # Individual notification
├── navigation/                # Navigation components
│   ├── nav-menu.tsx          # Main navigation menu
│   ├── breadcrumbs.tsx       # Breadcrumb navigation
│   ├── sidebar.tsx           # Dashboard sidebar
│   └── user-menu.tsx         # User profile dropdown
└── providers/                 # React context providers
    ├── auth-provider.tsx     # Authentication context
    ├── theme-provider.tsx    # Theme/dark mode
    ├── query-provider.tsx    # TanStack Query setup
    └── toast-provider.tsx    # Toast notification system
```

### Library & Utilities (`src/lib/`)
```
src/lib/
├── auth/                      # Authentication system
│   ├── auth.ts               # Core auth service (Supabase)
│   ├── auth-context.tsx      # React auth context
│   ├── middleware.ts         # Route protection middleware
│   ├── permissions.ts        # RBAC permission definitions
│   └── session.ts            # Session management
├── database/                  # Database utilities
│   ├── client.ts             # Supabase client configuration
│   ├── types.ts              # Database type definitions
│   └── queries.ts            # Common database queries
├── security/                  # Security utilities
│   ├── rate-limit.ts         # Rate limiting implementation
│   ├── mfa-rate-limit.ts     # MFA-specific rate limiting
│   ├── csrf.ts               # CSRF protection
│   └── validation.ts         # Input validation & sanitization
├── services/                  # Business logic services
│   ├── mfa-service.ts        # MFA implementation (TOTP)
│   ├── notification-service.ts # Notification management
│   ├── session-service.ts    # Session business logic
│   └── user-service.ts       # User management service
├── store/                     # Zustand state management
│   ├── auth-store.ts         # Authentication state
│   ├── session-store.ts      # Session state
│   ├── notification-store.ts # Notification state
│   └── index.ts              # Store provider setup
├── hooks/                     # Custom React hooks
│   ├── use-auth.ts           # Authentication hook
│   ├── use-sessions.ts       # Session management hook
│   ├── use-notifications.ts  # Notification hook
│   └── use-permissions.ts    # Permission checking hook
├── api/                       # API utilities
│   ├── utils.ts              # API helper functions
│   ├── validation.ts         # Request/response validation
│   └── error-handling.ts     # Centralized error handling
├── config/                    # Configuration management
│   ├── api-endpoints.ts      # API endpoint definitions
│   ├── constants.ts          # Application constants
│   └── env.ts                # Environment variable validation
└── utils.ts                   # General utility functions
```

### Internationalization (`src/i18n/` & `src/messages/`)
```
src/i18n/
├── config.ts                  # next-intl configuration
├── request.ts                 # Server-side i18n setup
└── routing.ts                 # Internationalized routing

src/messages/
├── en.json                    # English translations
└── he.json                    # Hebrew translations (RTL support)
```

---

## 🗄️ DATABASE STRUCTURE (`supabase/`)

### Database Management
```
supabase/
├── config.toml               # Supabase local development
├── migrations/               # Database schema migrations
│   ├── 20250704000001_initial_schema.sql      # Core tables
│   ├── 20250704000002_rls_policies.sql        # Row Level Security
│   ├── 20250730000001_mfa_system.sql          # MFA tables & functions
│   └── 20250730000002_notification_system.sql # Notification tables
└── seed.sql                  # Initial data seeding
```

---

## 🧪 TESTING STRUCTURE (`tests/`)

### Test Configuration
```
tests/
├── setup.ts                  # Global test setup
├── helpers.ts                # Test utility functions
├── e2e/                     # End-to-end tests (Playwright)
│   ├── auth.spec.ts         # Authentication flow tests
│   ├── sessions.spec.ts     # Session management tests
│   └── admin.spec.ts        # Admin functionality tests
└── fixtures/                # Test data fixtures
```

---

## 📦 BUILD & DEPLOYMENT ASSOCIATIONS

### Development Dependencies
| Package Category | Key Dependencies | Associated Files |
|------------------|------------------|------------------|
| **Framework** | next@15.3.5, react@19 | `src/app/`, `src/components/` |
| **Authentication** | @supabase/supabase-js, @supabase/ssr | `src/lib/auth/`, `supabase/` |
| **UI Components** | @radix-ui/*, tailwindcss | `src/components/ui/`, `tailwind.config.ts` |
| **State Management** | zustand, @tanstack/react-query | `src/lib/store/`, `src/lib/hooks/` |
| **Security** | speakeasy, bcryptjs | `src/lib/security/`, `src/lib/services/mfa-service.ts` |
| **Testing** | vitest, @playwright/test | `tests/`, `*.test.ts` files |

### CI/CD Pipeline
```
.github/workflows/
├── ci.yml                    # Continuous integration
│   ├── Runs on: src/**, tests/**
│   ├── Triggers: PR, push to main
│   └── Actions: lint, test, build
├── deploy.yml                # Deployment automation  
│   ├── Runs on: main branch
│   ├── Triggers: successful CI
│   └── Actions: deploy to Vercel
└── security.yml              # CodeQL security analysis
    ├── Runs on: src/**
    ├── Triggers: schedule, PR
    └── Actions: security scan
```

---

## 🔗 CRITICAL ASSOCIATIONS TO REMEMBER

### Authentication Flow Chain
```
Request → middleware.ts → auth-context.tsx → auth.ts → Supabase → Database RLS
```

### MFA Implementation Chain  
```
MFA Setup → mfa-service.ts → API endpoints → Database → UI Components
```

### Route Protection Chain
```
URL → middleware.ts → permissions.ts → auth-store.ts → Component Render
```

### API Request Chain
```
Frontend → api/**.ts → validation.ts → rate-limit.ts → Supabase → Database
```

### State Management Flow
```
User Action → Component → Zustand Store → React Query → API → Database
```

---

## 🚨 FILES REQUIRING IMMEDIATE ATTENTION

### Security Critical Files
1. `/src/lib/services/mfa-service.ts` - Remove hardcoded test data
2. `/src/lib/auth/auth-context.tsx` - Fix client-side MFA exposure  
3. `/src/app/api/sessions/route.ts` - Add rate limiting
4. `/src/lib/config/api-endpoints.ts` - Add MFA endpoints

### Configuration Files
1. `.env.local` - Validate all environment variables
2. `nginx.conf` - Update CORS configuration
3. `next.config.js` - Review security headers

### TypeScript Error Sources
1. `/src/lib/auth/auth-context.tsx` (lines 61-65)
2. `/src/lib/security/rate-limit.ts` (lines 74-83)  
3. Multiple auth-related type mismatches

---

*This reference document maps the complete file structure and critical associations within the Loom app codebase. Use this as a guide for understanding component dependencies and architectural relationships.*