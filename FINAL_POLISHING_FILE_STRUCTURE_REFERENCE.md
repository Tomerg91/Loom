# Loom App - File Structure & Associations Reference

*Final Polishing Phase Documentation*
*Generated: 2025-08-12*

## 🏗️ Architecture Overview

**Technology Stack:**
- Frontend: Next.js 15.3.5 with React 19 (App Router)
- Backend: Next.js API routes with TypeScript
- Database: Supabase (PostgreSQL) with comprehensive schema
- Authentication: Supabase Auth + Custom MFA
- State: TanStack Query + Zustand
- UI: Radix UI + Tailwind CSS + shadcn/ui
- i18n: next-intl (Hebrew/English)

## 📁 Root Directory Structure

```
/Users/tomergalansky/Desktop/loom-app/
├── 📄 Configuration Files
├── 🗂️ src/ (Application Source)
├── 🗂️ supabase/ (Database & Migration)
├── 🗂️ scripts/ (Build & Development Tools)
├── 🗂️ tests/ (Testing Infrastructure)
└── 📚 Documentation Files
```

---

## 📄 Configuration Files

### Core Configuration
- `package.json` - Dependencies & scripts
- `next.config.js` - Next.js configuration with i18n
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `vitest.config.ts` - Unit testing configuration
- `playwright.config.ts` - E2E testing configuration

### Build & Deployment
- `Dockerfile` - Container configuration
- `docker-compose.yml` - Multi-service orchestration
- `nginx.conf` - Reverse proxy configuration
- `vercel.json` - Vercel deployment configuration
- `lighthouserc.js` - Performance audit configuration

### Code Quality
- `eslint.config.mjs` - Linting rules
- `postcss.config.mjs` - PostCSS configuration

---

## 🗂️ src/ - Application Source

### 📱 App Directory (`src/app/`)

#### Core Layout Files
```
src/app/
├── layout.tsx (Root layout)
├── globals.css (Global styles)
├── page.tsx (Landing page)
├── loading.tsx (Global loading UI)
├── error.tsx (Global error handling)
├── not-found.tsx (404 page)
└── global-error.tsx (Global error boundary)
```

#### Internationalized Routes (`src/app/[locale]/`)
```
[locale]/
├── layout.tsx (Localized layout)
├── page.tsx (Localized home)
├── loading.tsx (Localized loading)
├── error.tsx (Localized errors)
├── not-found.tsx (Localized 404)
└── unauthorized/ (Access denied pages)
```

#### Feature Routes
```
[locale]/
├── 🔐 auth/ (Authentication flows)
│   ├── signin/ - Sign in page
│   ├── signup/ - Registration page  
│   ├── callback/ - OAuth callback
│   ├── reset-password/ - Password reset
│   ├── mfa-setup/ - MFA configuration
│   └── mfa-verify/ - MFA verification
├── 👥 client/ (Client user features)
│   ├── page.tsx - Client dashboard
│   ├── book/ - Session booking
│   ├── coaches/ - Coach selection
│   ├── progress/ - Progress tracking
│   └── reflections/ - Reflection management
├── 🎯 coach/ (Coach user features)
│   ├── page.tsx - Coach dashboard
│   ├── availability/ - Availability management
│   ├── clients/ - Client management
│   ├── insights/ - Coach analytics
│   └── notes/ - Session notes
├── ⚙️ admin/ (Admin features)
│   ├── page.tsx - Admin dashboard
│   ├── analytics/ - System analytics
│   ├── users/ - User management
│   └── system/ - System health
├── 📊 dashboard/ - Unified dashboard
├── 📅 sessions/ - Session management
│   ├── [id]/ - Session details
│   └── new/ - Create session
├── ⚙️ settings/ - User settings
│   ├── language/ - Language preferences
│   └── notifications/ - Notification settings
└── 📁 files/ - File management
```

### 🌐 API Routes (`src/app/api/`)

#### Authentication APIs
```
api/auth/
├── signin/ - User authentication
├── signup/ - User registration
├── signout/ - Session termination
├── me/ - Current user info
├── session/ - Session management
├── mfa/ - Multi-factor authentication
├── mfa-status/ - MFA configuration status
├── profile/ - Profile management
└── reset-password/ - Password reset
```

#### Feature APIs
```
api/
├── 👥 client/ - Client-specific endpoints
├── 🎯 coach/ - Coach-specific endpoints  
├── ⚙️ admin/ - Admin management APIs
├── 📅 sessions/ - Session CRUD operations
├── 📝 notes/ - Note management
├── 📋 reflections/ - Reflection tracking
├── 📁 files/ - File upload/management
├── 💬 messages/ - Messaging system
├── 🔔 notifications/ - Notification system
├── 📊 analytics/ - Analytics data
└── 🏥 health/ - System health check
```

### 🧩 Components (`src/components/`)

#### Feature Components
```
components/
├── 🔐 auth/ (Authentication UI)
│   ├── auth-provider.tsx (Context provider)
│   ├── route-guard.tsx (Route protection)
│   ├── signin-form.tsx (Sign in form)
│   ├── signup-form.tsx (Registration form)
│   ├── reset-password-form.tsx (Password reset)
│   └── mfa/ (MFA components)
├── 👥 client/ (Client interfaces)
│   ├── client-dashboard.tsx
│   ├── book-page.tsx (Session booking)
│   ├── coaches-page.tsx (Coach selection)
│   ├── progress-page.tsx (Progress tracking)
│   └── reflections-management.tsx
├── 🎯 coach/ (Coach interfaces)
│   ├── coach-dashboard.tsx
│   ├── availability-manager.tsx
│   ├── clients-page.tsx (Client management)
│   ├── insights-page.tsx (Coach analytics)
│   └── notes-management.tsx
├── ⚙️ admin/ (Admin interfaces)
│   ├── analytics-page.tsx
│   ├── users-page.tsx (User management)
│   ├── system-page.tsx (System health)
│   └── system-health-display.tsx
└── 📱 shared/ (Reusable components)
```

#### UI Components (`src/components/ui/`)
```
ui/
├── Core UI Elements
│   ├── button.tsx (Button component)
│   ├── input.tsx (Input fields)
│   ├── card.tsx (Card container)
│   ├── dialog.tsx (Modal dialogs)
│   └── toast-provider.tsx (Notifications)
├── Form Components  
│   ├── checkbox.tsx
│   ├── select.tsx
│   ├── textarea.tsx
│   └── password-input.tsx (Secure input)
├── Navigation
│   ├── dropdown-menu.tsx
│   ├── tabs.tsx
│   └── pagination.tsx
├── Data Display
│   ├── table.tsx
│   ├── skeleton.tsx (Loading states)
│   ├── avatar.tsx
│   └── badge.tsx
├── Accessibility
│   ├── skip-link.tsx (Accessibility navigation)
│   ├── live-region.tsx (Screen reader updates)
│   └── visually-hidden.tsx
└── Specialized
    ├── language-switcher.tsx (i18n toggle)
    ├── optimized-image.tsx (Performance)
    └── rich-text-editor.tsx
```

### 📚 Library Code (`src/lib/`)

#### Core Libraries
```
lib/
├── 🔐 auth/ (Authentication logic)
│   ├── auth.ts (Auth utilities)
│   ├── middleware.ts (Auth middleware)
│   ├── permissions.ts (Authorization)
│   └── auth-context.tsx (React context)
├── 🗄️ database/ (Database operations)
│   ├── index.ts (Database client)
│   ├── users.ts (User operations)
│   ├── sessions.ts (Session management)
│   ├── notifications.ts (Notification data)
│   └── services/ (Structured services)
├── 🔒 security/ (Security utilities)
│   ├── rate-limit.ts (Rate limiting)
│   ├── cors.ts (CORS configuration)
│   ├── headers.ts (Security headers)
│   ├── validation.ts (Input validation)
│   └── password.ts (Password utilities)
├── 🎯 services/ (Business logic services)
│   ├── auth-service.ts
│   ├── file-service.ts
│   ├── notification-service.ts
│   ├── analytics-service.ts
│   └── mfa-service.ts
├── 🏪 store/ (State management)
│   ├── auth-store.ts (Auth state)
│   ├── notification-store.ts
│   └── session-store.ts
├── 🔍 queries/ (Data fetching)
│   ├── users.ts (User queries)
│   ├── sessions.ts (Session queries)
│   └── notifications.ts (Notification queries)
└── ⚡ performance/ (Optimizations)
    ├── cache.ts (Caching strategies)
    ├── optimization.ts
    └── web-vitals.ts (Performance monitoring)
```

---

## 🗄️ supabase/ - Database

### Migrations (`supabase/migrations/`)
```
migrations/
├── 20250704000001_initial_schema.sql (Base schema)
├── 20250704000002_rls_policies.sql (Security policies)
├── 20250704000003_functions_and_views.sql (Database functions)
├── 20250727000001_security_enhancements.sql (Security improvements)
├── 20250730000001_add_mfa_support.sql (MFA system)
├── 20250805000001_add_timezone_support.sql (Timezone handling)
├── 20250806000001_enhance_notifications_system.sql (Notifications)
├── 20250807000001_file_storage_setup.sql (File system)
├── 20250809000001_messaging_system.sql (Chat/messaging)
├── 20250811000001_coach_dashboard_extensions.sql (Coach features)
├── 20250812000001_push_notifications_system.sql (Push notifications)
└── Latest: System health, maintenance, security logging
```

### Configuration
- `config.toml` - Supabase project configuration
- `seed.sql` - Initial data seeding
- `seed_analytics_test_data.sql` - Analytics test data

---

## ⚙️ scripts/ - Build & Development Tools

### Development Scripts
```
scripts/
├── 📊 Performance
│   ├── performance-audit.js (Lighthouse audit)
│   ├── analyze-bundle.js (Bundle analysis)
│   └── bundle-monitor.js (Bundle monitoring)
├── 🧪 Testing  
│   ├── test.sh (Test runner)
│   ├── run-e2e-tests.sh (E2E testing)
│   ├── test-accessibility.sh (A11y testing)
│   └── production-readiness-test.sh
├── 🔧 Development
│   ├── dev-watch.js (Development watcher)
│   ├── validate-env.js (Environment validation)
│   └── verify-language-switching.js (i18n testing)
└── 🛠️ Utilities
    ├── optimize-images.js (Image optimization)
    └── install-mfa-dependencies.sh
```

---

## 🧪 tests/ - Testing Infrastructure

### Test Organization
```
tests/
├── 📁 helpers/ (Test utilities)
│   ├── auth-helpers.ts (Auth test utils)
│   ├── database-manager.ts (Test DB)
│   ├── user-manager.ts (User test utils)
│   └── test-data.ts (Mock data)
├── 📁 examples/ (Test examples)
│   └── auth-example.spec.ts
├── global-setup.ts (Global test setup)
└── global-teardown.ts (Global test cleanup)
```

### Test Files in `src/test/`
```
src/test/
├── 🧪 Unit Tests
│   ├── api/ (API endpoint tests)
│   ├── components/ (Component tests)
│   ├── lib/ (Library function tests)
│   └── basic.test.ts
├── 🔗 Integration Tests
│   ├── auth-flow.test.tsx
│   ├── session-booking.test.tsx
│   └── language-routing.test.tsx
├── 🌐 E2E Tests  
│   ├── accessibility.spec.ts
│   ├── admin-dashboard.spec.ts
│   ├── auth.spec.ts
│   ├── client-dashboard.spec.ts
│   ├── coach-dashboard.spec.ts
│   └── session-booking.spec.ts
└── 🏥 System Tests
    ├── performance.test.ts
    ├── security.test.ts
    └── production-readiness.test.ts
```

---

## 📚 Documentation Files

### Implementation Documentation
- `README.md` - Project overview & setup
- `CLAUDE.md` - AI development guidelines
- `DEVELOPMENT_WORKFLOW.md` - Development processes

### Architecture Documentation  
- `CODEBASE_ARCHITECTURE_REFERENCE.md` - Architecture overview
- `FILE_STRUCTURE_REFERENCE.md` - File organization
- `UNIFIED_SESSION_BOOKING_ARCHITECTURE.md` - Session system design

### Feature Documentation
- `FINAL_POLISHING_COMPREHENSIVE_DOCUMENTATION.md` - Polishing guide
- `PERFORMANCE_OPTIMIZATION_FINAL_COMPLETION_REPORT.md` - Performance work
- `NOTIFICATIONS_SYSTEM_FINAL_COMPLETION_REPORT.md` - Notification system

### Completion Reports
- `CLIENT_FEATURES_COMPLETION_REPORT.md` - Client feature status
- `NOTIFICATIONS_POLISHING_COMPLETION_REPORT.md` - Notification polishing
- `PERFORMANCE_OPTIMIZATION_EXECUTION_REPORT.md` - Performance optimization

### Checklists & Roadmaps
- `LOOM_APP_ROADMAP_TO_PRODUCTION.md` - Production readiness roadmap
- `ATOMIC_POLISHING_CHECKLIST.md` - Detailed task breakdown
- `FINAL_POLISHING_ATOMIC_CHECKLIST.md` - Final polishing tasks

---

## 🔗 Key File Associations & Dependencies

### Authentication Flow
```
Authentication Chain:
middleware.ts → auth/middleware.ts → auth-provider.tsx → route-guard.tsx
Database: users table → RLS policies → MFA tables
API: api/auth/* → lib/auth/auth.ts → supabase/auth
```

### Session Management
```
Session Flow:
sessions/page.tsx → session-list.tsx → api/sessions/route.ts
Database: sessions table → coach_notes → session_files
Components: unified-session-booking.tsx → session-form-actions.tsx
```

### File Management
```
File System:
files/page.tsx → file-manager.tsx → api/files/route.ts
Database: files → file_versions → temporary_shares → file_downloads
Services: file-service.ts → file-optimization.ts → virus-scanning-service.ts
```

### Notification System
```
Notification Flow:
notification-center.tsx → api/notifications/route.ts → notification-store.ts
Database: notifications → notification_preferences → push_subscriptions
Services: notification-scheduler.ts → email-notification-service.ts
```

### Internationalization
```
i18n Chain:
[locale] routes → i18n/config.ts → messages/en.json + messages/he.json
Components: language-switcher.tsx → language-settings-card.tsx
```

---

## 🎯 Critical Production Dependencies

### Security Chain
```
Rate Limiting: middleware.ts → security/rate-limit.ts → Redis
CORS: security/cors.ts → headers.ts
MFA: mfa-service.ts → speakeasy → backup codes
```

### Performance Chain  
```
Optimization: performance/optimization.ts → cache.ts → web-vitals.ts
Monitoring: sentry.client.config.js → analytics-service.ts
Bundle: scripts/analyze-bundle.js → next.config.js
```

### Database Chain
```
Connection: lib/db/index.ts → supabase/server.ts → supabase/client.ts
Migrations: All numbered migration files in sequence
RLS: Row Level Security policies across all tables
```

---

## ⚠️ Known Issues & Areas Needing Attention

### Critical Issues
1. **P0 Security Vulnerabilities** - Hardcoded test data in MFA service
2. **TypeScript Errors** - Build failures preventing security scanning  
3. **Data Integrity** - Mock data mixed with production code

### Performance Areas
1. **Bundle Size** - Large JavaScript bundles affecting Core Web Vitals
2. **Image Optimization** - Images not optimized for different screen sizes
3. **Lazy Loading** - Some components not lazy-loaded properly

### Accessibility Gaps
1. **WCAG 2.1 AA Compliance** - Some components missing proper ARIA labels
2. **Screen Reader Support** - Some dynamic content not announced properly
3. **Keyboard Navigation** - Some interactive elements not keyboard accessible

This reference provides the complete file structure and associations for the Loom app, organized by functional areas and showing the relationships between different parts of the system.