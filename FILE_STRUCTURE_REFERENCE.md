# Loom App - File Structure Reference & Architecture Guide

## 📁 Root Directory Structure

```
loom-app/
├── 📋 Documentation & Configuration
│   ├── BUGS_AND_ISSUES_DOCUMENTATION.md    # Comprehensive bug tracker
│   ├── CLAUDE.md                           # AI development guidance
│   ├── REFACTORING_PLAN.md                 # Refactoring roadmap
│   ├── README.md                           # Project overview
│   ├── CONTRIBUTING.md                     # Development guidelines
│   └── package.json                        # Dependencies (107 packages)
│
├── ⚙️ Configuration Files
│   ├── next.config.js                      # Next.js 15 configuration
│   ├── tailwind.config.ts                  # Tailwind CSS v4 design system
│   ├── tsconfig.json                       # TypeScript strict configuration
│   ├── eslint.config.js                    # ESLint rules
│   ├── playwright.config.ts                # E2E test configuration
│   ├── vitest.config.ts                    # Unit test configuration
│   └── .env.example                        # Environment variables template
│
├── 🎯 Core Application
│   └── src/                                # Main source code
│
├── 🗄️ Database & Backend
│   └── supabase/                           # Database schema & migrations
│
├── 🧪 Testing Infrastructure
│   ├── tests/                              # E2E tests (Playwright)
│   └── src/test/                           # Unit/integration tests
│
├── 🌐 Static Assets
│   └── public/                             # Images, icons, static files
│
└── 🚀 Deployment
    ├── Dockerfile                          # Container configuration
    ├── docker-compose.yml                  # Local development setup
    └── .github/workflows/                  # CI/CD pipelines
```

## 🎯 Source Code Architecture (`src/`)

### 📱 Application Routes (`src/app/`)
```
src/app/
├── 🌐 Internationalization
│   └── [locale]/                          # English (en) / Hebrew (he)
│       ├── layout.tsx                     # Main app layout with providers
│       ├── page.tsx                       # Landing page
│       ├── loading.tsx                    # Global loading component
│       ├── error.tsx                      # Global error boundary
│       ├── not-found.tsx                  # 404 page
│       │
│       ├── 🔐 Authentication Routes
│       │   └── auth/
│       │       ├── signin/page.tsx        # Sign in flow
│       │       ├── signup/page.tsx        # Registration flow
│       │       ├── forgot/page.tsx        # Password reset
│       │       ├── mfa/page.tsx           # Multi-factor authentication
│       │       └── callback/page.tsx      # OAuth callback handler
│       │
│       ├── 👨‍💼 Admin Routes (Protected)
│       │   └── admin/
│       │       ├── layout.tsx             # Admin layout wrapper
│       │       ├── page.tsx               # Admin dashboard
│       │       ├── users/                 # User management
│       │       ├── analytics/             # System analytics
│       │       ├── notifications/         # Notification management
│       │       └── settings/              # System configuration
│       │
│       ├── 🎓 Coach Routes (Protected)
│       │   └── coach/
│       │       ├── layout.tsx             # Coach layout wrapper
│       │       ├── page.tsx               # Coach dashboard
│       │       ├── clients/               # Client management
│       │       ├── sessions/              # Session management
│       │       ├── analytics/             # Coach insights
│       │       ├── availability/          # Schedule management
│       │       └── profile/               # Coach profile settings
│       │
│       ├── 👤 Client Routes (Protected)
│       │   └── client/
│       │       ├── layout.tsx             # Client layout wrapper
│       │       ├── page.tsx               # Client dashboard
│       │       ├── sessions/              # Booking & session history
│       │       ├── progress/              # Progress tracking
│       │       ├── reflections/           # Personal reflections
│       │       ├── coaches/               # Browse coaches
│       │       └── profile/               # Client profile settings
│       │
│       ├── 📊 Shared Dashboard Routes
│       │   └── dashboard/
│       │       ├── layout.tsx             # Universal dashboard layout
│       │       ├── notifications/         # Notification center
│       │       ├── files/                 # File management
│       │       └── settings/              # User preferences
│       │
│       └── 🔗 Public Sharing
│           └── share/
│               └── [token]/page.tsx       # Public file sharing
│
└── 🛠️ API Routes (`src/app/api/`)
    ├── auth/                              # Authentication endpoints
    ├── admin/                             # Admin-only endpoints
    ├── coach/                             # Coach-specific endpoints
    ├── client/                            # Client-specific endpoints
    ├── files/                             # File management API
    ├── notifications/                     # Notification system API
    └── webhooks/                          # External service webhooks
```

### 🧩 Component Library (`src/components/`)
```
src/components/
├── 🎨 UI Primitives (Radix-based)
│   └── ui/
│       ├── button.tsx                     # Base button component
│       ├── input.tsx                      # Form input fields
│       ├── dialog.tsx                     # Modal dialogs
│       ├── dropdown-menu.tsx              # Dropdown menus
│       ├── toast.tsx                      # Notification toasts
│       ├── avatar.tsx                     # User avatars
│       ├── badge.tsx                      # Status badges
│       ├── card.tsx                       # Content cards
│       ├── tabs.tsx                       # Tab navigation
│       └── [15+ more primitives]
│
├── 🔐 Authentication Components
│   └── auth/
│       ├── signin-form.tsx                # Sign in form
│       ├── signup-form.tsx                # Registration form
│       ├── mfa-verification.tsx           # MFA challenge
│       ├── password-reset.tsx             # Password reset flow
│       └── auth-provider.tsx              # Authentication context
│
├── 📊 Dashboard Components
│   └── dashboard/
│       ├── sidebar.tsx                    # Navigation sidebar
│       ├── header.tsx                     # Top navigation
│       ├── stats-card.tsx                 # Statistics display
│       ├── quick-actions.tsx              # Action buttons
│       ├── recent-activity.tsx            # Activity timeline
│       └── role-specific/                 # Role-based dashboards
│           ├── admin-dashboard.tsx
│           ├── coach-dashboard.tsx
│           └── client-dashboard.tsx
│
├── 📅 Session Management
│   └── sessions/
│       ├── session-booking.tsx            # Session booking interface
│       ├── session-calendar.tsx           # Calendar view
│       ├── session-details.tsx            # Session information
│       ├── session-notes.tsx              # Session notes editor
│       ├── session-rating.tsx             # Session feedback
│       └── unified-session-booking.tsx    # Comprehensive booking flow
│
├── 📁 File Management
│   └── files/
│       ├── file-upload-zone.tsx           # Drag & drop upload
│       ├── file-preview.tsx               # File preview modal
│       ├── file-list.tsx                  # File browser
│       ├── file-sharing-dialog.tsx        # Share permissions
│       └── file-download.tsx              # Download handler
│
├── 🔔 Notification System
│   └── notifications/
│       ├── notification-center.tsx        # Notification hub
│       ├── notification-item.tsx          # Individual notification
│       ├── notification-settings.tsx      # Preferences
│       └── push-notification-setup.tsx    # Push setup
│
└── 🌐 Context Providers
    └── providers/
        ├── query-provider.tsx             # React Query client
        ├── theme-provider.tsx             # Dark/light theme
        ├── auth-provider.tsx              # Authentication state
        ├── notification-provider.tsx      # Notification state
        └── locale-provider.tsx            # Internationalization
```

### 📚 Business Logic & Services (`src/lib/`)
```
src/lib/
├── 🔐 Authentication System
│   └── auth/
│       ├── auth-context.tsx               # Authentication React context
│       ├── auth-helpers.ts                # Utility functions
│       ├── session-management.ts          # Session handling
│       └── role-based-access.ts           # RBAC implementation
│
├── 🗄️ Database Layer
│   └── database/
│       ├── index.ts                       # Database client singleton
│       ├── users.ts                       # User data operations
│       ├── sessions.ts                    # Session data operations
│       ├── notifications.ts               # Notification data
│       ├── files.ts                       # File metadata operations
│       ├── analytics.ts                   # Analytics data
│       └── admin-analytics.ts             # Admin-specific analytics
│
├── 🛠️ Business Services
│   └── services/
│       ├── user-service.ts                # User management logic
│       ├── session-service.ts             # Session business logic
│       ├── notification-service.ts        # Notification dispatch
│       ├── file-service.ts                # File processing
│       ├── email-service.ts               # Email notifications
│       ├── mfa-service.ts                 # Multi-factor auth
│       ├── analytics-service.ts           # Analytics collection
│       └── export-service.ts              # Data export functionality
│
├── 🔒 Security Layer
│   └── security/
│       ├── encryption.ts                  # Data encryption utilities
│       ├── rate-limiting.ts               # API rate limiting
│       ├── csrf-protection.ts             # CSRF token handling
│       ├── input-validation.ts            # Input sanitization
│       └── audit-logging.ts               # Security audit logs
│
├── 🎛️ Configuration
│   └── config/
│       ├── database.ts                    # Database configuration
│       ├── supabase.ts                    # Supabase client setup
│       ├── auth-config.ts                 # Authentication settings
│       ├── email-templates.ts             # Email templates
│       ├── notification-templates.ts      # Notification templates
│       ├── analytics-constants.ts         # Analytics configuration
│       └── refactoring-examples.md        # Code examples
│
├── 📊 Performance & Monitoring
│   └── performance/
│       ├── web-vitals-monitor.ts          # Performance metrics
│       ├── error-tracking.ts              # Error monitoring
│       └── analytics-tracker.ts           # User analytics
│
└── 🔧 Utilities
    ├── utils.ts                           # General utilities
    ├── date-utils.ts                      # Date/time helpers
    ├── file-utils.ts                      # File processing utilities
    ├── validation-schemas.ts              # Zod validation schemas
    └── constants.ts                       # Application constants
```

### 🪝 Custom React Hooks (`src/hooks/`)
```
src/hooks/
├── Authentication Hooks
│   ├── use-auth.ts                        # Authentication state & actions
│   ├── use-mfa.ts                         # Multi-factor authentication
│   └── use-session.ts                     # Session management
│
├── Data Fetching Hooks (React Query)
│   ├── use-users.ts                       # User data queries
│   ├── use-sessions.ts                    # Session data queries
│   ├── use-notifications.ts               # Notification queries
│   ├── use-files.ts                       # File management queries
│   └── use-analytics.ts                   # Analytics data queries
│
├── UI State Hooks
│   ├── use-theme.ts                       # Theme switching
│   ├── use-sidebar.ts                     # Sidebar state
│   ├── use-modal.ts                       # Modal management
│   └── use-toast.ts                       # Toast notifications
│
└── Utility Hooks
    ├── use-debounce.ts                    # Input debouncing
    ├── use-local-storage.ts               # Local storage persistence
    ├── use-media-query.ts                 # Responsive design
    └── use-clipboard.ts                   # Clipboard operations
```

### 🌐 Internationalization (`src/i18n/`)
```
src/i18n/
├── routing.ts                             # Locale routing configuration
├── locales/
│   ├── en/                               # English translations
│   │   ├── common.json                   # Common UI text
│   │   ├── auth.json                     # Authentication text
│   │   ├── dashboard.json                # Dashboard content
│   │   ├── sessions.json                 # Session-related text
│   │   └── errors.json                   # Error messages
│   └── he/                               # Hebrew translations (RTL)
│       ├── common.json
│       ├── auth.json
│       ├── dashboard.json
│       ├── sessions.json
│       └── errors.json
└── middleware.ts                          # i18n middleware integration
```

### 📝 TypeScript Definitions (`src/types/`)
```
src/types/
├── auth.ts                                # Authentication types
├── user.ts                                # User data types
├── session.ts                             # Session types
├── notification.ts                        # Notification types
├── file.ts                                # File management types
├── analytics.ts                           # Analytics types
├── database.ts                            # Database schema types
└── api.ts                                 # API response types
```

## 🗄️ Database Structure (`supabase/`)
```
supabase/
├── config.toml                           # Supabase configuration
├── migrations/                           # Database migrations (20+ files)
│   ├── 20240701000000_initial_schema.sql # Initial database setup
│   ├── 20240701000001_auth_setup.sql     # Authentication tables
│   ├── 20240701000002_rls_policies.sql   # Row Level Security
│   ├── 20240701000003_mfa_system.sql     # Multi-factor authentication
│   ├── 20240701000004_sessions_table.sql # Session management
│   ├── 20240701000005_notifications.sql  # Notification system
│   ├── 20240701000006_files_system.sql   # File management
│   ├── 20240701000007_analytics.sql      # Analytics tables
│   └── [more migrations...]
│
├── functions/                            # Edge functions
│   ├── send-notification/                # Push notifications
│   ├── file-processing/                  # File processing
│   └── analytics-aggregation/            # Analytics processing
│
└── seed.sql                              # Development data
```

## 🧪 Testing Structure
```
├── tests/ (E2E with Playwright)
│   ├── examples/
│   │   ├── auth-example.spec.ts          # Authentication flows
│   │   ├── dashboard-example.spec.ts     # Dashboard functionality
│   │   └── session-booking.spec.ts       # Session booking flow
│   ├── fixtures/                         # Test data
│   └── utils/                            # Test utilities
│
└── src/test/ (Unit/Integration with Vitest)
    ├── components/                       # Component tests
    │   ├── auth/                         # Authentication component tests
    │   ├── dashboard/                    # Dashboard component tests
    │   ├── sessions/                     # Session component tests
    │   └── notifications/                # Notification component tests
    ├── hooks/                            # Hook tests
    ├── lib/                              # Business logic tests
    └── utils/                            # Utility function tests
```

## 📦 Key Dependencies & Their Purposes

### 🎯 Core Framework
- **Next.js 15.3.5**: React framework with App Router
- **React 19.0.0**: UI library with latest features
- **TypeScript**: Type safety and development experience

### 🗄️ Backend & Database
- **@supabase/supabase-js**: Backend-as-a-Service client
- **@supabase/auth-helpers-nextjs**: Next.js auth integration

### 🎨 UI & Styling
- **Tailwind CSS v4**: Utility-first CSS framework
- **@radix-ui/**: 15+ accessible UI components
- **lucide-react**: Icon library
- **class-variance-authority**: Component variants

### 📊 State Management
- **@tanstack/react-query**: Server state management
- **zustand**: Client state management
- **react-hook-form**: Form handling

### 🔐 Security & Validation
- **zod**: Schema validation
- **@next/csrf**: CSRF protection
- **bcryptjs**: Password hashing

### 🧪 Testing
- **vitest**: Unit testing framework
- **@playwright/test**: E2E testing
- **@testing-library/react**: Component testing utilities

### 🌐 Internationalization
- **next-intl**: i18n for Next.js with RTL support

### 📊 Monitoring & Analytics
- **@sentry/nextjs**: Error monitoring
- **web-vitals**: Performance monitoring

## 🔗 File Relationships & Dependencies

### Authentication Flow Dependencies
```
middleware.ts → auth-context.tsx → use-auth.ts → supabase/client.ts
     ↓
auth/signin/page.tsx → signin-form.tsx → auth-service.ts
     ↓
dashboard routing based on user role
```

### Dashboard Component Hierarchy
```
layout.tsx (providers)
     ↓
dashboard/layout.tsx (sidebar + header)
     ↓
role-specific dashboards (admin/coach/client)
     ↓
specific feature components (sessions, files, notifications)
```

### Data Flow Architecture
```
UI Components → Custom Hooks → React Query → Services → Database
     ↑                                                      ↓
State Management ← Business Logic ← API Routes ← Supabase Client
```

## 🚀 Deployment Architecture

### Development Environment
- **Local Database**: Supabase local development
- **File Storage**: Local file system
- **Authentication**: Supabase Auth (local)

### Production Environment
- **Hosting**: Vercel
- **Database**: Supabase (hosted)
- **File Storage**: Supabase Storage
- **CDN**: Vercel Edge Network
- **Monitoring**: Sentry + Vercel Analytics

### CI/CD Pipeline
```
GitHub → GitHub Actions → Build & Test → Deploy to Vercel
                    ↓
               Type Check & Lint → Unit Tests → E2E Tests
```

---

**Architecture Principles**:
- 🔒 Security by design with RLS and middleware protection
- 📱 Mobile-first responsive design
- 🌐 Full internationalization (English/Hebrew RTL)
- ♿ Accessibility with Radix UI components
- 🎯 TypeScript strict mode for type safety
- 🧪 Comprehensive testing strategy (unit + E2E)
- 📊 Performance monitoring and optimization
- 🔄 Real-time features with Supabase subscriptions

**Last Updated**: August 13, 2025  
**Maintained By**: Development Team