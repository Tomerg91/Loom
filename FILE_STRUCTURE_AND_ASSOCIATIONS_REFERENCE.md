# File Structure and Associations Reference

## Overview
This document provides a comprehensive reference of the Loom app file structure, showing how files are interconnected and their relationships for debugging and maintenance purposes.

## Technology Stack Summary

### Core Framework
- **Next.js 15.3.5** with App Router
- **React 19** with TypeScript
- **Supabase** for backend and database
- **Tailwind CSS 4** for styling

### Key Libraries
- **State Management**: Zustand + TanStack Query
- **UI Components**: Radix UI primitives
- **Forms**: react-hook-form + zod validation
- **Testing**: Vitest + Playwright
- **Deployment**: Vercel with Docker support

## Directory Structure

```
loom-app/
├── 📁 src/                          # Main application source
│   ├── 📁 app/                      # Next.js App Router pages & API routes
│   │   ├── 📁 [locale]/             # Internationalized pages
│   │   │   ├── 📁 admin/            # Admin dashboard pages
│   │   │   ├── 📁 auth/             # Authentication pages
│   │   │   ├── 📁 client/           # Client dashboard pages
│   │   │   ├── 📁 coach/            # Coach dashboard pages
│   │   │   ├── 📁 files/            # File management pages
│   │   │   ├── 📁 sessions/         # Session management pages
│   │   │   └── 📁 settings/         # User settings pages
│   │   └── 📁 api/                  # API routes (server endpoints)
│   │       ├── 📁 admin/            # Admin API endpoints
│   │       ├── 📁 auth/             # Authentication API
│   │       ├── 📁 client/           # Client API endpoints
│   │       ├── 📁 coach/            # Coach API endpoints
│   │       ├── 📁 files/            # File management API
│   │       ├── 📁 notifications/    # Notifications API
│   │       └── 📁 sessions/         # Session booking API
│   ├── 📁 components/               # Reusable UI components
│   │   ├── 📁 admin/                # Admin-specific components
│   │   ├── 📁 auth/                 # Authentication components
│   │   ├── 📁 client/               # Client dashboard components
│   │   ├── 📁 coach/                # Coach dashboard components
│   │   ├── 📁 files/                # File management components
│   │   ├── 📁 notifications/        # Notification components
│   │   ├── 📁 sessions/             # Session components
│   │   └── 📁 ui/                   # Base UI components (Radix UI based)
│   ├── 📁 lib/                      # Shared utilities and services
│   │   ├── 📁 auth/                 # Authentication logic
│   │   ├── 📁 database/             # Database query functions
│   │   ├── 📁 services/             # Business logic services
│   │   ├── 📁 supabase/             # Supabase client configuration
│   │   ├── 📁 security/             # Security utilities
│   │   ├── 📁 performance/          # Performance optimization
│   │   └── 📁 utils/                # General utilities
│   ├── 📁 i18n/                     # Internationalization
│   │   ├── 📁 messages/             # Translation files
│   │   └── config.ts                # i18n configuration
│   └── 📁 types/                    # TypeScript type definitions
├── 📁 supabase/                     # Supabase configuration
│   ├── 📁 migrations/               # Database migrations
│   └── config.toml                  # Supabase settings
├── 📁 tests/                        # Test files
│   ├── 📁 e2e/                      # Playwright E2E tests
│   └── 📁 unit/                     # Unit tests
└── 📁 public/                       # Static assets
```

## Critical Configuration Files

### Environment & Configuration
| File | Purpose | Dependencies |
|------|---------|-------------|
| `next.config.js` | Next.js configuration | Build process, deployment |
| `tailwind.config.ts` | Tailwind CSS configuration | Styling system |
| `tsconfig.json` | TypeScript configuration | Type checking |
| `package.json` | Dependencies and scripts | All npm packages |
| `vercel.json` | Deployment configuration | Production deployment |
| `.env.local` | Local environment variables | Development |
| `.env.example` | Environment variable template | Setup documentation |

### Environment Variable Management
| File | Purpose | Security Level |
|------|---------|--------------|
| `src/env.mjs` | Client-safe environment variables | Public (NEXT_PUBLIC_*) |
| `src/env-server.mjs` | Server-only environment variables | Private (API keys) |

**Critical Environment Variables:**
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side database operations
- `NEXT_PUBLIC_SUPABASE_URL` - Client connection to Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Client authentication

## API Architecture

### Route Structure
```
/api/
├── auth/           # Authentication endpoints
│   ├── signin      # User login
│   ├── signup      # User registration  
│   ├── mfa/        # Multi-factor authentication
│   └── session     # Session management
├── admin/          # Admin operations
│   ├── users       # User management
│   ├── analytics   # Admin analytics
│   └── system      # System health
├── client/         # Client-specific endpoints
│   ├── stats       # Client statistics
│   └── reflections # Client reflections
├── coach/          # Coach-specific endpoints
│   ├── clients     # Coach's clients
│   ├── insights    # Coach insights
│   └── stats       # Coach statistics
├── files/          # File management
│   ├── upload      # File upload
│   ├── [id]/       # File operations
│   └── share/      # File sharing
└── sessions/       # Session management
    ├── book        # Session booking
    ├── [id]/       # Session operations
    └── [id]/files  # Session files
```

## Database Architecture

### Supabase Integration
| Service | Files | Purpose |
|---------|-------|---------|
| **Client Creation** | `src/lib/supabase/client.ts` | Client-side Supabase client |
| **Server Creation** | `src/lib/supabase/server.ts` | Server-side Supabase clients |
| **Database Queries** | `src/lib/database/*.ts` | Type-safe database operations |
| **Migrations** | `supabase/migrations/*.sql` | Database schema changes |

### Database Services
```
src/lib/database/
├── users.ts              # User management
├── sessions.ts           # Session operations
├── files.ts              # File management
├── notifications.ts      # Notification system
├── messaging.ts          # Chat/messaging
├── admin-analytics.ts    # Admin reporting
├── availability.ts       # Coach availability
└── temporary-shares.ts   # File sharing
```

## Component Architecture

### UI Component Hierarchy
```
src/components/
├── ui/                   # Base components (Radix UI)
│   ├── button.tsx        # Button primitive
│   ├── dialog.tsx        # Modal dialogs
│   ├── form.tsx          # Form components
│   └── input.tsx         # Input controls
├── auth/                 # Authentication UI
│   ├── signin-form.tsx   # Login form
│   ├── signup-form.tsx   # Registration form
│   └── mfa-setup.tsx     # MFA configuration
├── dashboard/            # Dashboard layouts
│   ├── sidebar.tsx       # Navigation sidebar
│   ├── header.tsx        # Top navigation
│   └── stats-card.tsx    # Statistics display
├── files/                # File management UI
│   ├── file-upload.tsx   # Upload interface
│   ├── file-browser.tsx  # File explorer
│   └── share-dialog.tsx  # Sharing controls
└── sessions/             # Session UI
    ├── booking-form.tsx  # Session booking
    ├── session-card.tsx  # Session display
    └── availability.tsx  # Calendar availability
```

## Service Layer

### Business Logic Services
```
src/lib/services/
├── file-service.ts               # File operations
├── notification-service.ts       # Notifications
├── email-notification-service.ts # Email notifications
├── push-notification-service.ts  # Push notifications
├── mfa-service.ts                # Multi-factor auth
├── file-management-service.ts    # Advanced file ops
└── virus-scanning-service.ts     # Security scanning
```

### Authentication Flow
```
Authentication Chain:
1. src/lib/auth/auth.ts           # Core auth logic
2. src/lib/auth/middleware.ts     # Route protection
3. src/middleware.ts              # Global middleware
4. src/app/api/auth/*.ts          # Auth API endpoints
5. src/components/auth/*.tsx      # Auth UI components
```

## Critical Relationships

### Environment Variable Flow
```
Development:
.env.local → src/env-server.mjs → src/lib/supabase/server.ts

Production:
Vercel Environment Variables → src/env-server.mjs → src/lib/supabase/server.ts
```

### Build Process Dependencies
```
1. Environment validation (src/env*.mjs)
2. TypeScript compilation (tsconfig.json)
3. Tailwind processing (tailwind.config.ts)
4. Next.js optimization (next.config.js)
5. Static generation (pages & API routes)
```

### Database Connection Chain
```
API Route → Database Service → Supabase Client → Database
     ↓              ↓              ↓              ↓
/api/files → src/lib/database/files.ts → createClient() → Supabase PostgreSQL
```

## Security Architecture

### Authentication Layers
| Layer | Component | Purpose |
|-------|-----------|---------|
| **Route Protection** | `src/middleware.ts` | Global route authentication |
| **API Authentication** | `src/lib/auth/auth.ts` | API request validation |
| **MFA Integration** | `src/lib/services/mfa-service.ts` | Multi-factor authentication |
| **Session Management** | `src/lib/auth/middleware.ts` | Session validation |

### File Security
```
File Upload Flow:
1. src/components/files/file-upload.tsx    # UI upload component
2. src/app/api/files/upload/route.ts       # Upload API endpoint  
3. src/lib/services/file-service.ts        # File processing
4. src/lib/security/file-security-middleware.ts # Security validation
5. src/lib/services/virus-scanning-service.ts # Virus scanning
6. Supabase Storage                         # Secure file storage
```

## Testing Architecture

### Test Structure
```
tests/
├── e2e/                  # Playwright end-to-end tests
│   ├── auth.spec.ts      # Authentication testing
│   ├── files.spec.ts     # File management testing
│   └── sessions.spec.ts  # Session booking testing
└── unit/                 # Unit tests (Vitest)
    ├── api/              # API endpoint tests
    ├── components/       # Component tests
    └── services/         # Service layer tests
```

### Test Configuration Files
| File | Purpose |
|------|---------|
| `playwright.config.ts` | E2E test configuration |
| `vitest.config.ts` | Unit test configuration |
| `tests/setup.ts` | Test environment setup |

## Deployment Architecture

### Vercel Deployment
```
Build Process:
1. Environment variable injection
2. TypeScript compilation  
3. Next.js optimization
4. Static page generation
5. API route bundling
6. Asset optimization
```

### Docker Configuration
| File | Purpose |
|------|---------|
| `Dockerfile` | Container configuration |
| `docker-compose.yml` | Multi-service orchestration |
| `nginx.conf` | Reverse proxy configuration |

## Performance Optimization

### Optimization Components
```
src/lib/performance/
├── database-optimization.ts  # Query optimization
├── database-optimizer.ts     # Connection pooling
└── [Various cache strategies]
```

### Asset Optimization
- **Static Assets**: Cached via Vercel CDN
- **Images**: Next.js Image optimization
- **Fonts**: Self-hosted for performance
- **CSS**: Tailwind purging and minification

## Common File Relationships

### Feature Implementation Pattern
```
1. Database Schema (supabase/migrations/*.sql)
2. Database Service (src/lib/database/*.ts)
3. API Endpoint (src/app/api/*/route.ts)
4. UI Component (src/components/*/component.tsx)
5. Page Integration (src/app/[locale]/*/page.tsx)
```

### Configuration Dependency Chain
```
package.json → tsconfig.json → next.config.js → tailwind.config.ts → vercel.json
```

## Debugging Reference

### Common Error Sources
| Error Type | Likely Files | Investigation Steps |
|------------|--------------|-------------------|
| **Environment Variables** | `src/env-server.mjs`, `.env.local` | Check variable loading and validation |
| **Database Errors** | `src/lib/database/*.ts`, `src/lib/supabase/server.ts` | Verify client creation and queries |
| **Authentication Issues** | `src/middleware.ts`, `src/lib/auth/*.ts` | Check session validation chain |
| **Build Failures** | `next.config.js`, `tsconfig.json` | Review configuration files |
| **Styling Issues** | `tailwind.config.ts`, `src/components/ui/*.tsx` | Check Tailwind configuration |

---
*Last Updated: [Current Date]*  
*Status: Reference Document*  
*Maintained by: Development Team*