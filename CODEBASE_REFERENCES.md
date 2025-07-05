# Loom App Codebase References

## Architecture Overview
The Loom coaching platform follows a modern Next.js architecture with clear separation of concerns, using TypeScript for type safety and Supabase for backend services.

## Core Directory Structure & Associations

### 📁 Root Configuration Files
```
├── next.config.js          # Main Next.js configuration
├── next.config.ts          # Duplicate config (needs cleanup)
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
├── package.json           # Dependencies and scripts
├── eslint.config.mjs      # ESLint configuration
├── prettier.config.js     # Code formatting rules
├── vitest.config.ts       # Test configuration
├── playwright.config.ts   # E2E test configuration
└── docker-compose.yml     # Local development setup
```

### 📁 Application Structure (`src/`)

#### 🔄 App Router (`src/app/`)
```
src/app/
├── [locale]/                    # Internationalization wrapper
│   ├── auth/                   # Authentication pages
│   │   ├── signin/            # Login page
│   │   ├── signup/            # Registration page
│   │   └── reset-password/    # Password reset
│   ├── dashboard/             # Main dashboard (role-based)
│   ├── sessions/              # Session management
│   │   ├── page.tsx          # Session list
│   │   ├── new/              # Create session
│   │   └── [id]/             # Individual session
│   ├── coach/                 # Coach-specific routes
│   ├── client/                # Client-specific routes
│   ├── admin/                 # Admin panel
│   ├── profile/               # User profile
│   └── settings/              # User settings
├── api/                       # Backend API routes
│   ├── auth/                  # Authentication endpoints
│   ├── users/                 # User management
│   ├── sessions/              # Session CRUD
│   ├── notifications/         # Notification system
│   └── health/                # Health check
└── globals.css                # Global styles
```

**Key Associations:**
- Each `[locale]` route has corresponding API endpoints in `src/app/api/`
- Page components import from `src/components/` for UI
- API routes use utilities from `src/lib/api/`

#### 🧩 Components (`src/components/`)
```
src/components/
├── auth/                      # Authentication UI
│   ├── signin-form.tsx       # Login form component
│   ├── signup-form.tsx       # Registration form
│   └── auth-guard.tsx        # Route protection
├── client/                    # Client dashboard components
│   ├── dashboard.tsx         # Client main dashboard
│   ├── session-booking.tsx   # Book sessions
│   └── reflections/          # Client reflections
├── coach/                     # Coach dashboard components
│   ├── dashboard.tsx         # Coach main dashboard
│   ├── client-management.tsx # Manage clients
│   ├── availability.tsx      # Set availability
│   └── notes/                # Client notes
├── sessions/                  # Session-related UI
│   ├── session-card.tsx      # Session display
│   ├── session-form.tsx      # Create/edit sessions
│   └── session-calendar.tsx  # Calendar view
├── notifications/             # Notification UI
│   ├── notification-center.tsx
│   ├── notification-item.tsx
│   └── notification-bell.tsx
├── ui/                        # Reusable UI components
│   ├── button.tsx            # Base button component
│   ├── input.tsx             # Form inputs
│   ├── textarea.tsx          # Text areas
│   ├── dialog.tsx            # Modal dialogs
│   ├── card.tsx              # Content cards
│   └── avatar.tsx            # User avatars
└── providers/                 # Context providers
    ├── auth-provider.tsx     # Authentication context
    ├── query-provider.tsx    # TanStack Query setup
    └── theme-provider.tsx    # Theme management
```

**Component Dependencies:**
- `auth/` components → `src/lib/auth/`
- `client/` components → `src/lib/database/clients.ts`
- `coach/` components → `src/lib/database/coaches.ts`
- `sessions/` components → `src/lib/database/sessions.ts`
- `ui/` components → `src/lib/utils.ts` (cn function)

#### 📚 Libraries & Utilities (`src/lib/`)
```
src/lib/
├── auth/                      # Authentication logic
│   ├── auth.ts               # Core auth functions
│   ├── auth-context.tsx      # React context
│   ├── permissions.ts        # RBAC system
│   └── middleware.ts         # Auth middleware
├── database/                  # Database operations
│   ├── users.ts              # User CRUD operations
│   ├── sessions.ts           # Session management
│   ├── coaches.ts            # Coach-specific data
│   ├── clients.ts            # Client-specific data
│   └── notifications.ts      # Notification data
├── supabase/                  # Supabase configuration
│   ├── client.ts             # Client-side config
│   ├── server.ts             # Server-side config
│   ├── middleware.ts         # Middleware config
│   └── types.ts              # Database types
├── store/                     # State management
│   ├── auth-store.ts         # Authentication state
│   ├── session-store.ts      # Session state
│   ├── notification-store.ts # Notification state
│   └── index.ts              # Store exports
├── api/                       # API utilities
│   ├── utils.ts              # Common API helpers
│   ├── validation.ts         # Zod schemas
│   └── middleware.ts         # API middleware
├── notifications/             # Notification system
│   ├── email.ts              # Email notifications
│   ├── push.ts               # Push notifications
│   ├── real-time.ts          # Real-time updates
│   └── templates.ts          # Message templates
├── monitoring/                # Analytics & monitoring
│   ├── analytics.ts          # Google Analytics
│   ├── sentry.ts             # Error tracking
│   └── performance.ts        # Performance monitoring
├── security/                  # Security utilities
│   ├── rate-limit.ts         # Rate limiting
│   ├── validation.ts         # Input validation
│   ├── headers.ts            # Security headers
│   └── audit.ts              # Security auditing
└── utils.ts                   # General utilities
```

**Library Interconnections:**
- `auth/` → `database/users.ts`, `store/auth-store.ts`
- `database/` → `supabase/client.ts`, `api/validation.ts`
- `store/` → Components for state management
- `notifications/` → `database/notifications.ts`, `supabase/real-time.ts`

#### 🌐 Internationalization (`src/i18n/`, `src/messages/`)
```
src/i18n/
├── config.ts                  # i18n configuration
├── request.ts                 # Request configuration
└── routing.ts                 # Route configuration

src/messages/
├── en.json                    # English translations
└── he.json                    # Hebrew translations
```

#### 🧪 Testing (`src/test/`)
```
src/test/
├── setup.ts                   # Test setup
├── utils.tsx                  # Test utilities
├── api/                       # API endpoint tests
├── components/                # Component tests
├── e2e/                       # End-to-end tests
├── integration/               # Integration tests
├── lib/                       # Library function tests
├── accessibility.test.ts     # A11y tests
├── performance.test.ts       # Performance tests
├── security.test.ts          # Security tests
└── production-readiness.test.ts
```

#### 📝 Type Definitions (`src/types/`)
```
src/types/
├── auth.ts                    # Authentication types
├── database.ts                # Database schema types
├── api.ts                     # API response types
├── supabase.ts                # Supabase-generated types
└── index.ts                   # Type exports
```

### 📁 Database Schema (`supabase/`)
```
supabase/
├── migrations/                # Database migrations
├── seed.sql                   # Seed data
├── config.toml               # Supabase configuration
└── functions/                # Edge functions
```

### 📁 Public Assets (`public/`)
```
public/
├── images/                    # Static images
├── icons/                     # Icon files
├── favicon.ico               # Site favicon
└── robots.txt                # SEO configuration
```

## Key Technology Integrations

### 🔐 Authentication Flow
```
1. UI Components (signin-form.tsx)
   ↓
2. Auth Context (auth-context.tsx)
   ↓
3. Supabase Auth (supabase/client.ts)
   ↓
4. Auth Store (auth-store.ts)
   ↓
5. Middleware Protection (middleware.ts)
```

### 📊 Data Flow Pattern
```
1. Component initiates action
   ↓
2. TanStack Query hook
   ↓
3. API route (/api/*)
   ↓
4. Database function (/lib/database/*)
   ↓
5. Supabase client
   ↓
6. PostgreSQL database
```

### 🔄 State Management Architecture
```
Global State (Zustand):
├── auth-store.ts              # User authentication
├── session-store.ts           # Session data
└── notification-store.ts      # Notifications

Server State (TanStack Query):
├── User data queries
├── Session data queries
└── Notification queries

Local State (useState):
└── Component-specific state
```

### 🌍 Route Protection Pattern
```
1. middleware.ts               # Route-level protection
   ↓
2. auth-guard.tsx             # Component-level protection
   ↓
3. permissions.ts             # Role-based checks
   ↓
4. UI rendering based on roles
```

## Feature-to-File Mapping

### Authentication System
- **UI**: `src/components/auth/`
- **Logic**: `src/lib/auth/`
- **API**: `src/app/api/auth/`
- **Types**: `src/types/auth.ts`
- **Store**: `src/lib/store/auth-store.ts`

### Session Management
- **UI**: `src/components/sessions/`
- **Logic**: `src/lib/database/sessions.ts`
- **API**: `src/app/api/sessions/`
- **Pages**: `src/app/[locale]/sessions/`
- **Store**: `src/lib/store/session-store.ts`

### Notification System
- **UI**: `src/components/notifications/`
- **Logic**: `src/lib/notifications/`
- **API**: `src/app/api/notifications/`
- **Real-time**: `src/lib/supabase/real-time.ts`
- **Store**: `src/lib/store/notification-store.ts`

### Role-Based Features
- **Permissions**: `src/lib/auth/permissions.ts`
- **Middleware**: `src/middleware.ts`
- **Coach UI**: `src/components/coach/`
- **Client UI**: `src/components/client/`
- **Admin UI**: `src/components/admin/`

## Common Integration Patterns

### 1. Component → API → Database
```typescript
// Component
const { data, isLoading } = useQuery({
  queryKey: ['sessions'],
  queryFn: () => api.sessions.getAll()
});

// API Route (/api/sessions/route.ts)
export async function GET() {
  const sessions = await getSessions();
  return Response.json(sessions);
}

// Database Function (/lib/database/sessions.ts)
export async function getSessions() {
  const { data } = await supabase
    .from('sessions')
    .select('*');
  return data;
}
```

### 2. Authentication Check Pattern
```typescript
// In component
const { user } = useUser();
if (!user) return <SignInPrompt />;

// In API route
const user = await getUser(request);
if (!user) {
  return new Response('Unauthorized', { status: 401 });
}

// In middleware
const { data: { session } } = await supabase.auth.getSession();
if (!session && isProtectedRoute) {
  return NextResponse.redirect('/auth/signin');
}
```

This reference document provides a comprehensive map of how the Loom app codebase is organized and how different parts connect to each other.