# Loom App - Code Quality Fix Plan

## 📋 **Executive Summary**
This document outlines a systematic approach to fixing all 37 identified code quality issues. The plan prioritizes critical security and stability issues first, followed by configuration and performance improvements.

**Total Estimated Time**: 8-10 working days  
**Phases**: 4 distinct phases with clear deliverables  
**Risk Mitigation**: Each phase includes testing and validation steps

---

## 🎯 **PHASE 1: CRITICAL SECURITY & STABILITY (Days 1-2)**

### Priority: IMMEDIATE - System Breaking Issues

#### Task 1.1: Fix Security Vulnerabilities (4 hours)
**Files**: `src/lib/api/utils.ts`

**Actions**:
```typescript
// Replace TODO comments with actual implementations
export async function verifyUser(userId: string, supabase: SupabaseClient) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, role, active')
    .eq('id', userId)
    .single();
    
  if (error || !user || !user.active) {
    throw new Error('User verification failed');
  }
  return user;
}

export function checkPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = { admin: 3, coach: 2, client: 1 };
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
```

**Validation**: 
- [ ] All API endpoints use proper user verification
- [ ] Role-based access control working correctly
- [ ] Security tests passing

#### Task 1.2: Fix Memory Leaks (6 hours)
**File**: `src/components/monitoring/performance-monitor.tsx`

**Actions**:
```typescript
// 1. Limit array growth
const MAX_ENTRIES = 100;
const [longTasks, setLongTasks] = useState<any[]>([]);
const [layoutShifts, setLayoutShifts] = useState<any[]>([]);

// 2. Add proper cleanup
useEffect(() => {
  const cleanupFunctions: (() => void)[] = [];
  
  // Store cleanup functions from observers
  cleanupFunctions.push(collectWebVitals(() => {}));
  cleanupFunctions.push(observeLongTasks((task) => {
    setLongTasks(prev => [...prev.slice(-MAX_ENTRIES), task]);
  }));
  cleanupFunctions.push(observeLayoutShifts((shift) => {
    setLayoutShifts(prev => [...prev.slice(-MAX_ENTRIES), shift]);
  }));
  
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup?.());
    clearInterval(memoryInterval);
    clearInterval(budgetInterval);
  };
}, []);
```

**File**: `src/components/providers/analytics-provider.tsx`

**Actions**:
```typescript
useEffect(() => {
  const scripts: HTMLScriptElement[] = [];
  
  // Track created scripts
  const script1 = document.createElement('script');
  // ... script setup
  scripts.push(script1);
  
  return () => {
    // Remove scripts on unmount
    scripts.forEach(script => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    });
  };
}, []);
```

**Validation**:
- [ ] Memory usage stable over time
- [ ] No script elements accumulating
- [ ] Performance monitor working correctly

#### Task 1.3: Fix Tailwind CSS v4 Incompatibility (3 hours)
**File**: `tailwind.config.ts`

**Actions**:
```typescript
// Migrate to v4 format
import type { Config } from 'tailwindcss';

const config: Config = {
  theme: {
    // Move theme.extend content directly here
    colors: {
      border: "hsl(var(--border))",
      input: "hsl(var(--input))",
      // ... all custom colors
    },
    animation: {
      "accordion-down": "accordion-down 0.2s ease-out",
      "accordion-up": "accordion-up 0.2s ease-out",
    },
    keyframes: {
      "accordion-down": {
        from: { height: "0" },
        to: { height: "var(--radix-accordion-content-height)" },
      },
      "accordion-up": {
        from: { height: "var(--radix-accordion-content-height)" },
        to: { height: "0" },
      },
    },
  },
  // Remove content, plugins - handled automatically in v4
};

export default config;
```

**Validation**:
- [ ] All styles rendering correctly
- [ ] Build process working
- [ ] No Tailwind CSS errors

#### Task 1.4: Fix Critical Configuration Issues (2 hours)
**File**: `next.config.js`

**Actions**:
```javascript
// Replace deprecated images.domains
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https', 
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  // ... rest of config
};
```

**File**: `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    // ... rest unchanged
  }
}
```

**Phase 1 Deliverable**: Secure, stable application with working styles

---

## ⚡ **PHASE 2: ERROR HANDLING & PERFORMANCE (Days 3-4)**

### Priority: HIGH - User Experience Issues

#### Task 2.1: Refactor Service Layer Error Handling (8 hours)
**Files**: `src/lib/database/*.ts`

**Actions**:
```typescript
// Create error result pattern
type DatabaseResult<T> = {
  data: T | null;
  error: string | null;
  success: boolean;
};

// Refactor NotificationService methods
export class NotificationService {
  async getNotifications(userId: string, limit = 20): Promise<DatabaseResult<Notification[]>> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data || [], error: null, success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { data: null, error: message, success: false };
    }
  }
}
```

**Update API Routes**:
```typescript
// Update route handlers to use new pattern
export const GET = withErrorHandling(async (request: NextRequest) => {
  const result = await notificationService.getNotifications(userId);
  
  if (!result.success) {
    return createErrorResponse(result.error, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  
  return createSuccessResponse(result.data);
});
```

**Validation**:
- [ ] All service methods return error results
- [ ] API routes handle errors properly
- [ ] Error messages reach the UI

#### Task 2.2: Optimize Middleware Performance (4 hours)
**File**: `src/middleware.ts`

**Actions**:
```typescript
// Add caching for user roles
const roleCache = new Map<string, { role: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getUserRole(userId: string, supabase: SupabaseClient): Promise<string | null> {
  const cached = roleCache.get(userId);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.role;
  }
  
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
    
  if (userProfile?.role) {
    roleCache.set(userId, { role: userProfile.role, timestamp: now });
    return userProfile.role;
  }
  
  return null;
}
```

**Validation**:
- [ ] Middleware response time improved
- [ ] Role caching working correctly
- [ ] No authentication issues

#### Task 2.3: Fix Rendering Performance (2 hours)
**File**: `src/components/coach/availability-manager.tsx`

**Actions**:
```typescript
import { useMemo } from 'react';

const AvailabilityManager = () => {
  // Memoize expensive calculations
  const timeOptions = useMemo(() => {
    return generateTimeOptions();
  }, []); // Empty dependency array since this doesn't change
  
  // Rest of component...
};
```

**Validation**:
- [ ] No unnecessary re-calculations
- [ ] Component performance improved

**Phase 2 Deliverable**: Robust error handling and optimized performance

---

## 🔧 **PHASE 3: CONFIGURATION & CONSTANTS (Days 5-6)**

### Priority: MEDIUM - Maintainability & Best Practices

#### Task 3.1: Create Centralized Constants (4 hours)
**File**: `src/lib/constants.ts`

**Actions**:
```typescript
// API Routes
export const API_ROUTES = {
  SESSIONS: '/api/sessions',
  SESSION_BY_ID: (id: string) => `/api/sessions/${id}`,
  BOOK_SESSION: '/api/sessions/book',
  USERS: '/api/users',
  USER_BY_ID: (id: string) => `/api/users/${id}`,
  COACH_AVAILABILITY: (coachId: string) => `/api/coaches/${coachId}/availability`,
  NOTIFICATIONS: '/api/notifications',
  REFLECTIONS: '/api/reflections',
} as const;

// Timeouts
export const TIMEOUTS = {
  SESSION_CANCELLATION: 1500,
  NOTIFICATION_TOAST: 1000,
  PROFILE_SAVE: 1000,
  DEFAULT_REQUEST: 30000,
} as const;

// Pagination
export const PAGINATION = {
  CLIENT_DASHBOARD_SESSIONS: 5,
  REFLECTIONS_PER_PAGE: 20,
  COACH_DASHBOARD_SESSIONS: 5,
  NOTES_PER_PAGE: 50,
  NOTES_SEARCH_LIMIT: 20,
  NOTIFICATIONS_PER_PAGE: 20,
  SESSIONS_PER_PAGE: 100,
  COACHES_PER_PAGE: 50,
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  COACH: 'coach', 
  CLIENT: 'client',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Session Status
export const SESSION_STATUS = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
```

**File**: `src/lib/api/routes.ts`
```typescript
import { API_ROUTES } from '../constants';
export { API_ROUTES };
```

**Validation**:
- [ ] All constants defined and exported
- [ ] Type safety maintained

#### Task 3.2: Update Components to Use Constants (6 hours)
**Actions**:
- Replace all hardcoded API endpoints with `API_ROUTES`
- Replace all magic numbers with `TIMEOUTS` and `PAGINATION`
- Replace role strings with `USER_ROLES`
- Update 15+ component files

**Example Updates**:
```typescript
// Before
const response = await fetch('/api/sessions');
setTimeout(() => setShow(false), 1500);

// After  
import { API_ROUTES, TIMEOUTS } from '@/lib/constants';
const response = await fetch(API_ROUTES.SESSIONS);
setTimeout(() => setShow(false), TIMEOUTS.SESSION_CANCELLATION);
```

**Validation**:
- [ ] No hardcoded values in components
- [ ] All imports working correctly
- [ ] Functionality unchanged

#### Task 3.3: Environment Variables Consolidation (3 hours)
**File**: `src/env.mjs`

**Actions**:
```javascript
export const env = createEnv({
  server: {
    // Add new server variables
    RESEND_API_URL: z.string().url().default('https://api.resend.com/emails'),
    DATABASE_URL: z.string().url().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
    // Ensure consistent usage
  },
});
```

**Update Files to Use Environment Variables**:
- `src/lib/notifications/email-service.ts`
- `src/lib/security/cors.ts`
- All test files

**Validation**:
- [ ] All environment variables centralized
- [ ] No hardcoded URLs remaining

**Phase 3 Deliverable**: Maintainable, configurable codebase

---

## 🏗️ **PHASE 4: FEATURES & CODE QUALITY (Days 7-8)**

### Priority: MEDIUM - Feature Completeness & Refactoring

#### Task 4.1: Implement Missing Authentication Features (6 hours)

**Create Missing API Endpoints**:
```typescript
// src/app/api/auth/signup/route.ts
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { email, password, role } = await request.json();
  
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role }
    }
  });
  
  if (error) {
    return createErrorResponse(error.message, HTTP_STATUS.BAD_REQUEST);
  }
  
  return createSuccessResponse(data, 'User created successfully');
});
```

**Create Password Reset Page**:
```typescript
// src/app/[locale]/auth/reset-password/page.tsx
export default function ResetPasswordPage() {
  // Implementation with form and Supabase integration
}
```

**Validation**:
- [ ] API auth endpoints working
- [ ] Password reset flow complete
- [ ] Authentication fully server-side

#### Task 4.2: Implement Missing Role-Based Pages (8 hours)

**Create Admin Dashboard**:
```typescript
// src/components/admin/admin-dashboard.tsx
export function AdminDashboard() {
  // User management interface
  // System analytics
  // Role management
}
```

**Create Coach Pages**:
- Availability management
- Client management  
- Session insights
- Notes management

**Create Client Pages**:
- Session booking
- Progress tracking
- Reflections management

**Fix Admin Access**:
```typescript
// Update middleware to allow admin access to all pages
if (userRole === USER_ROLES.ADMIN) {
  // Admin can access any protected route
  return applySecurityHeaders(request, NextResponse.next());
}
```

**Validation**:
- [ ] All role-based pages implemented
- [ ] Admin access working correctly
- [ ] Role restrictions enforced

#### Task 4.3: Refactor Code Duplication (4 hours)
**File**: `src/lib/utils.ts`

**Actions**:
```typescript
// Replace hundreds of type checking functions with generic utility
export function isInstanceOf<T>(
  value: unknown, 
  constructor: new (...args: any[]) => T
): value is T {
  return value instanceof constructor;
}

// Usage examples:
export const isHTMLElement = (value: unknown): value is HTMLElement => 
  isInstanceOf(value, HTMLElement);

export const isHTMLDivElement = (value: unknown): value is HTMLDivElement => 
  isInstanceOf(value, HTMLDivElement);

// Or use a factory function
export function createTypeChecker<T>(constructor: new (...args: any[]) => T) {
  return (value: unknown): value is T => value instanceof constructor;
}

// Generate all type checkers programmatically
export const isHTMLElement = createTypeChecker(HTMLElement);
export const isHTMLDivElement = createTypeChecker(HTMLDivElement);
// ... etc
```

**Create Custom Hooks for API Operations**:
```typescript
// src/hooks/use-api.ts
export function useApiRequest<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const execute = useCallback(async (options?: RequestInit) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(endpoint, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint]);
  
  return { data, loading, error, execute };
}
```

**Validation**:
- [ ] Utils file size significantly reduced
- [ ] Custom hooks replacing repetitive API code
- [ ] No functionality lost

**Phase 4 Deliverable**: Complete feature set and clean codebase

---

## 🧪 **TESTING & VALIDATION STRATEGY**

### Continuous Testing Throughout Phases

#### Phase 1 Testing:
- [ ] Security endpoint tests
- [ ] Memory leak detection
- [ ] Build verification
- [ ] Basic functionality tests

#### Phase 2 Testing:
- [ ] Error handling tests
- [ ] Performance benchmarks
- [ ] API response validation
- [ ] User experience testing

#### Phase 3 Testing:
- [ ] Configuration validation
- [ ] Environment variable tests
- [ ] Constants usage verification
- [ ] Integration tests

#### Phase 4 Testing:
- [ ] Feature completeness tests
- [ ] Role-based access tests
- [ ] Code quality metrics
- [ ] Full regression testing

### Final Validation Checklist:
- [ ] All 37 issues resolved
- [ ] Security vulnerabilities fixed
- [ ] Performance optimized
- [ ] Code duplication eliminated
- [ ] Configuration centralized
- [ ] Features complete
- [ ] Tests passing
- [ ] Documentation updated

---

## 📊 **RESOURCE ALLOCATION**

### Team Requirements:
- **Senior Developer**: Phases 1-2 (security & performance)
- **Mid-level Developer**: Phase 3 (configuration)
- **Junior Developer**: Phase 4 assistance (features)

### Tools Needed:
- Code editor with TypeScript support
- Database access for testing
- Performance monitoring tools
- Security testing tools

### Risk Mitigation:
- Daily backups before major changes
- Feature flags for new implementations
- Staged rollout plan
- Rollback procedures documented

---

## 🎯 **SUCCESS METRICS**

### Technical Metrics:
- **Security**: 0 critical vulnerabilities
- **Performance**: <50ms middleware response time
- **Memory**: Stable memory usage over 24h
- **Code Quality**: <10% duplication ratio
- **Configuration**: 100% constants usage

### Business Metrics:
- **User Experience**: Faster page loads
- **Developer Experience**: Easier maintenance
- **Security**: Improved audit scores
- **Scalability**: Better performance under load

---

## 📅 **TIMELINE SUMMARY**

| Phase | Duration | Focus | Key Deliverables |
|-------|----------|-------|------------------|
| 1 | Days 1-2 | Critical Issues | Security, Stability, Styles |
| 2 | Days 3-4 | Performance | Error Handling, Optimization |
| 3 | Days 5-6 | Configuration | Constants, Environment |
| 4 | Days 7-8 | Features | Complete Functionality |

**Total Timeline**: 8 working days  
**Buffer Time**: +2 days for testing and documentation  
**Go-Live**: Day 10

*This plan provides a systematic approach to resolving all identified code quality issues while maintaining system stability and user experience.*