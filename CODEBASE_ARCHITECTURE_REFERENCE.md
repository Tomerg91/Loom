# 🏗️ Loom App - Codebase Architecture Reference

## 📁 **Directory Structure & File Organization**

### 🎯 **Phase 0 Architectural Targets**

To support the upcoming refactor, the codebase will migrate toward feature-first modules with clear runtime boundaries:

- `src/modules/auth/` – MFA-aware auth flows, Supabase session orchestration, and middleware adapters.
- `src/modules/dashboard/` – Coach and client dashboard experiences, including data loaders and widgets.
- `src/modules/sessions/` – Session lifecycle services, caching policies, and shared façades for API routes.
- `src/modules/i18n/` – Bilingual routing helpers, locale negotiation, and RTL-aware UI primitives.
- `src/modules/platform/` – Cross-cutting infrastructure such as environment validation, Supabase client factories, and logging.

Supporting layers will be separated by runtime context:

- `src/env/server` and `src/env/client` will expose explicit environment contracts for server-only and browser-safe variables.
- `src/lib/supabase/` will split client creation, retry policies, and navigation effects into testable units.
- `src/middleware/` will evolve into composable middleware steps for static bypass, locale validation, session hydration, and MFA gating.
- `src/services/` will consolidate service façades so that route handlers depend on cohesive domain APIs instead of low-level helpers.

These targets ensure contributors have a shared blueprint before structural changes land.

### **Root Level Structure**

```
loom-app/
├── 📁 .github/workflows/     # CI/CD pipeline configurations
├── 📁 public/               # Static assets (images, icons, etc.)
├── 📁 src/                  # Main application source code
├── 📁 supabase/             # Database schema and migrations
├── 📁 tests/                # E2E and integration tests
├── 📄 next.config.js        # Next.js configuration
├── 📄 tailwind.config.ts    # Tailwind CSS configuration
├── 📄 tsconfig.json         # TypeScript configuration
├── 📄 package.json          # Dependencies and scripts
└── 📄 vitest.config.ts      # Unit testing configuration
```

### **Source Code Structure (`src/`)**

```
src/
├── 📁 app/                  # Next.js App Router (main application)
│   ├── 📁 [locale]/         # Internationalized routes
│   ├── 📁 api/              # Backend API endpoints
│   ├── 📄 globals.css       # Global styles
│   ├── 📄 layout.tsx        # Root layout component
│   └── 📄 not-found.tsx     # Global 404 handler
├── 📁 components/           # Reusable React components
│   ├── 📁 ui/               # Basic UI components (buttons, forms, etc.)
│   ├── 📁 layout/           # Layout-specific components
│   └── 📁 features/         # Feature-specific components
├── 📁 lib/                  # Shared business logic and utilities
│   ├── 📁 auth/             # Authentication utilities
│   ├── 📁 db/               # Database abstraction layer
│   ├── 📁 utils/            # General utility functions
│   └── 📁 validations/      # Form validation schemas
├── 📁 i18n/                 # Internationalization configuration
│   ├── 📄 config.ts         # i18n configuration
│   ├── 📄 routing.ts        # Locale routing setup
│   └── 📁 locales/          # Translation files (en/he)
├── 📁 hooks/                # Custom React hooks
├── 📁 services/             # External service integrations
├── 📁 types/                # TypeScript type definitions
└── 📄 middleware.ts         # Route middleware (auth, i18n)
```

---

## 🏛️ **Core Architectural Patterns**

### **1. Data Flow Architecture**

```
User Interface (React Components)
       ↓
React Query (State Management)
       ↓
Service Layer (API calls)
       ↓
Supabase Client (Database/Auth)
       ↓
PostgreSQL Database
```

### **2. State Management Strategy**

- **Server State**: React Query (TanStack Query)
- **Local State**: React useState/useReducer
- **Form State**: React Hook Form
- **Authentication State**: Supabase Auth + React Context

### **3. Authentication Flow**

```
User Login → Supabase Auth → JWT Token → Middleware → Protected Routes
                    ↓
            Session Management → Role-based Access → Feature Authorization
```

---

## 📂 **Key Directories Deep Dive**

### **`src/app/` - Next.js App Router**

#### **Locale-based Routing (`src/app/[locale]/`)**

```
[locale]/
├── 📁 (auth)/              # Authentication route group
│   ├── 📁 login/           # Login page
│   ├── 📁 register/        # Registration page
│   └── 📁 auth/            # Auth callbacks
├── 📁 (dashboard)/         # Main application routes
│   ├── 📁 dashboard/       # User dashboard
│   ├── 📁 sessions/        # Session management
│   ├── 📁 notes/           # Note management
│   └── 📁 settings/        # User settings
├── 📁 admin/               # Admin-only routes
├── 📁 coach/               # Coach role routes
├── 📁 client/              # Client role routes
├── 📄 layout.tsx           # Locale-specific layout
├── 📄 page.tsx             # Home page
├── 📄 loading.tsx          # Loading UI
├── 📄 error.tsx            # Error boundary
└── 📄 not-found.tsx        # 404 page
```

#### **API Routes (`src/app/api/`)**

```
api/
├── 📁 auth/                # Authentication endpoints
│   ├── 📄 login/route.ts
│   ├── 📄 logout/route.ts
│   └── 📄 callback/route.ts
├── 📁 users/               # User management
│   ├── 📄 route.ts         # GET/POST users
│   └── 📄 [id]/route.ts    # GET/PUT/DELETE user
├── 📁 sessions/            # Session management
│   ├── 📄 route.ts         # GET/POST sessions
│   └── 📄 [id]/route.ts    # Session CRUD operations
├── 📁 coaches/             # Coach-specific endpoints
├── 📁 notes/               # Note management
├── 📁 notifications/       # Notification system
└── 📄 health/route.ts      # Health check endpoint
```

### **`src/components/` - Component Architecture**

#### **UI Components (`src/components/ui/`)**

- **Basic Components**: Button, Input, Modal, Card, etc.
- **Form Components**: FormField, FormError, FormSubmit
- **Layout Components**: Header, Sidebar, Footer
- **Data Display**: Table, List, Badge, Status

#### **Feature Components (`src/components/features/`)**

```
features/
├── 📁 auth/                # Authentication components
│   ├── 📄 LoginForm.tsx
│   ├── 📄 RegisterForm.tsx
│   └── 📄 AuthProvider.tsx
├── 📁 sessions/            # Session management
│   ├── 📄 SessionCard.tsx
│   ├── 📄 SessionList.tsx
│   └── 📄 BookingForm.tsx
├── 📁 dashboard/           # Dashboard components
│   ├── 📄 StatsCard.tsx
│   ├── 📄 RecentSessions.tsx
│   └── 📄 QuickActions.tsx
└── 📁 profile/             # User profile components
    ├── 📄 ProfileForm.tsx
    └── 📄 AvatarUpload.tsx
```

### **`src/lib/` - Business Logic Layer**

#### **Database Abstraction (`src/lib/db/`)**

```typescript
// Database service interface
interface DatabaseService {
  users: UserRepository;
  sessions: SessionRepository;
  notes: NoteRepository;
  notifications: NotificationRepository;
}

// Query builder pattern
const query = db
  .users()
  .select(['id', 'email', 'role'])
  .where('active', true)
  .orderBy('created_at', 'desc');
```

#### **Authentication (`src/lib/auth/`)**

```typescript
// Auth service methods
interface AuthService {
  signIn(email: string, password: string): Promise<AuthResponse>;
  signUp(data: SignUpData): Promise<AuthResponse>;
  signOut(): Promise<void>;
  getUser(): Promise<User | null>;
  refreshSession(): Promise<Session>;
}
```

#### **Utilities (`src/lib/utils/`)**

- **`cn()`**: Class name utility (clsx + tailwind-merge)
- **`formatDate()`**: Date formatting utilities
- **`generateId()`**: ID generation utilities
- **`validateEmail()`**: Validation helpers

---

## 🗄️ **Database Schema & Models**

### **Core Tables**

```sql
-- Users table (authentication & profiles)
users {
  id: uuid (primary key)
  email: string (unique)
  role: enum ['admin', 'coach', 'client']
  profile: jsonb
  created_at: timestamp
  updated_at: timestamp
}

-- Sessions table (coaching sessions)
sessions {
  id: uuid (primary key)
  coach_id: uuid (foreign key → users.id)
  client_id: uuid (foreign key → users.id)
  title: string
  description: text
  scheduled_at: timestamp
  duration_minutes: integer
  status: enum ['scheduled', 'completed', 'cancelled']
  created_at: timestamp
}

-- Notes table (session notes)
notes {
  id: uuid (primary key)
  session_id: uuid (foreign key → sessions.id)
  author_id: uuid (foreign key → users.id)
  content: text
  is_private: boolean
  created_at: timestamp
}

-- Notifications table
notifications {
  id: uuid (primary key)
  user_id: uuid (foreign key → users.id)
  type: string
  title: string
  message: text
  read: boolean
  created_at: timestamp
}
```

### **Supabase Configuration**

```
supabase/
├── 📄 config.toml          # Project configuration
├── 📁 migrations/          # Database schema evolution
│   ├── 📄 001_initial_schema.sql
│   ├── 📄 002_add_sessions.sql
│   └── 📄 003_add_notes.sql
├── 📄 seed.sql             # Sample data for development
└── 📁 functions/           # Edge functions (if any)
```

---

## 🔐 **Authentication & Authorization Flow**

### **Authentication Layers**

1. **Supabase Auth**: Handle login/logout, JWT tokens
2. **Middleware**: Route protection, role checking
3. **API Guards**: Endpoint-level authorization
4. **Component Guards**: UI-level access control

### **Role-based Access Control**

```typescript
// Role hierarchy
type UserRole = 'admin' | 'coach' | 'client';

// Permission matrix
const permissions = {
  admin: ['*'], // All permissions
  coach: ['sessions:read', 'sessions:write', 'clients:read', 'notes:write'],
  client: ['sessions:read', 'notes:read', 'profile:write'],
};

// Route protection
const protectedRoutes = {
  '/admin/*': ['admin'],
  '/coach/*': ['admin', 'coach'],
  '/client/*': ['admin', 'coach', 'client'],
};
```

### **Middleware Flow**

```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  // 1. Check authentication status
  // 2. Validate user role
  // 3. Apply locale routing
  // 4. Redirect if unauthorized
}
```

---

## 🎨 **UI/Component Architecture**

### **Design System Foundation**

- **Styling**: Tailwind CSS v4 with custom design tokens
- **Components**: Radix UI primitives + custom implementations
- **Icons**: Lucide React icon library
- **Typography**: System fonts with fallbacks

### **Component Patterns**

```typescript
// Compound component pattern
<SessionCard>
  <SessionCard.Header>
    <SessionCard.Title />
    <SessionCard.Status />
  </SessionCard.Header>
  <SessionCard.Content>
    <SessionCard.Description />
    <SessionCard.Schedule />
  </SessionCard.Content>
  <SessionCard.Actions>
    <SessionCard.EditButton />
    <SessionCard.CancelButton />
  </SessionCard.Actions>
</SessionCard>

// Hook-based state management
function useSession(sessionId: string) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionService.getById(sessionId)
  });
}
```

### **Responsive Design Strategy**

```css
/* Mobile-first approach */
.container {
  @apply w-full px-4 mx-auto;
  @apply sm:max-w-sm sm:px-6;
  @apply md:max-w-md;
  @apply lg:max-w-lg;
  @apply xl:max-w-xl;
}
```

---

## 📝 **Configuration Files & Their Roles**

### **Next.js Configuration (`next.config.js`)**

```javascript
// Key features enabled
- Internationalization (i18n)
- Image optimization
- Bundle analyzer
- Strict mode
- Environment variables validation
- Custom redirects and rewrites
```

### **TypeScript Configuration (`tsconfig.json`)**

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", ".next"]
}
```

### **Tailwind Configuration (`tailwind.config.ts`)**

```typescript
// Custom theme extensions
colors: {
  primary: { /* custom color palette */ },
  secondary: { /* custom color palette */ }
},
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif']
},
spacing: { /* custom spacing scale */ }
```

---

## 🔗 **Feature-to-File Mapping**

### **Authentication Feature**

```
Files:
├── src/app/[locale]/(auth)/         # Auth routes
├── src/components/features/auth/    # Auth components
├── src/lib/auth/                    # Auth utilities
├── src/services/auth.ts             # Auth service
└── src/types/auth.ts                # Auth types
```

### **Session Management Feature**

```
Files:
├── src/app/[locale]/sessions/       # Session routes
├── src/app/api/sessions/            # Session API
├── src/components/features/sessions/ # Session components
├── src/lib/db/sessions.ts           # Session repository
├── src/services/sessions.ts         # Session service
└── src/types/sessions.ts            # Session types
```

### **Dashboard Feature**

```
Files:
├── src/app/[locale]/dashboard/      # Dashboard routes
├── src/components/features/dashboard/ # Dashboard components
├── src/hooks/useDashboard.ts        # Dashboard hooks
├── src/services/analytics.ts       # Analytics service
└── src/lib/utils/stats.ts           # Statistics utilities
```

---

## 🧩 **Integration Patterns**

### **API Integration Pattern**

```typescript
// Service layer
export class SessionService {
  async getAll(): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('scheduled_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }
}

// React Query integration
export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionService.getAll()
  });
}

// Component usage
function SessionList() {
  const { data: sessions, isLoading, error } = useSessions();

  if (isLoading) return <Loading />;
  if (error) return <Error />;

  return (
    <div>
      {sessions?.map(session => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}
```

### **Form Handling Pattern**

```typescript
// Validation schema
const sessionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  scheduled_at: z.date(),
  duration_minutes: z.number().min(15).max(480)
});

// Form component
function SessionForm() {
  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema)
  });

  const mutation = useMutation({
    mutationFn: sessionService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['sessions']);
      toast.success('Session created successfully');
    }
  });

  return (
    <Form {...form}>
      <FormField name="title" control={form.control} />
      <FormField name="description" control={form.control} />
      <FormField name="scheduled_at" control={form.control} />
      <Button type="submit">Create Session</Button>
    </Form>
  );
}
```

---

## 🚀 **Development Workflow**

### **Local Development Setup**

```bash
# Environment setup
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

### **Build & Deployment**

```bash
# Production build
npm run build

# Preview production build
npm start

# Deploy to Vercel
vercel --prod
```

---

## 📚 **Key Dependencies**

### **Core Framework**

- **Next.js 15.3.5**: React framework with App Router
- **React 19**: UI library with latest features
- **TypeScript**: Type-safe development

### **Backend & Database**

- **Supabase**: Backend-as-a-Service (PostgreSQL, Auth, Real-time)
- **@supabase/supabase-js**: JavaScript client library

### **State Management**

- **@tanstack/react-query**: Server state management
- **zustand**: Client state management (if needed)

### **UI & Styling**

- **Tailwind CSS v4**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library

### **Forms & Validation**

- **React Hook Form**: Form state management
- **Zod**: Schema validation library

### **Testing**

- **Vitest**: Unit testing framework
- **Playwright**: End-to-end testing
- **@testing-library/react**: Component testing utilities

### **Development Tools**

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Static type checking

---

_Last Updated: 2025-07-15_
_Version: 1.0_
_Maintainer: Development Team_
