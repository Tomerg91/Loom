# Loom App - Complete User Journey Map

## Executive Summary

The Loom app is a Next.js 15 + React 19 coaching platform with role-based user journeys for **Coaches**, **Clients**, and **Admins**. The architecture uses:
- **Frontend**: Next.js 15 with App Router, TypeScript, Radix UI, Tailwind CSS
- **State Management**: Zustand (auth/session/notification stores) + TanStack Query (server state)
- **Backend**: Supabase PostgreSQL with Row-Level Security (RLS)
- **Authentication**: Supabase Auth with MFA support
- **Data Flow**: API Routes → TanStack Query → Components

---

## 1. NAVIGATION & ROLE-BASED ROUTING STRUCTURE

### Navigation Component Files

| File | Purpose | Notes |
|------|---------|-------|
| `/src/components/layout/Sidebar.tsx` | Main navigation sidebar (role-aware) | Filters nav items by user role |
| `/src/components/layout/navigation-types.ts` | Navigation type definitions | Defines NavigationRole, NavigationItem, DashboardNavigationConfig |
| `/src/components/layout/DashboardShell.tsx` | Dashboard layout wrapper | Wraps all authenticated pages |
| `/src/components/layout/Topbar.tsx` | Top navigation bar | Notification/user menu |
| `/src/components/layout/app-layout.tsx` | Main app layout structure | Page wrapper |

### Role-Based Access Control Files

| File | Purpose |
|------|---------|
| `/src/lib/auth/permissions.ts` | Permission matrix and role checks |
| `/src/lib/auth/guards.ts` | Route guards for protected pages |
| `/src/components/auth/route-guard.tsx` | Route guard component (requireAuth, requireRole, etc.) |
| `/src/lib/permissions/hooks.ts` | Hooks for checking permissions client-side |

### Key Permission Hierarchy

```typescript
// From permissions.ts
ROLES: 'admin' | 'coach' | 'client'

ROLE_PERMISSIONS:
- admin: All permissions (sessions, users, admin, billing, reports, tasks)
- coach: sessions (read/create/update), users:read, coach (read/write), client:read, reports:read, tasks (read/create/update)
- client: sessions:read, sessions:create, client (read/write), tasks:read
```

---

## 2. MAJOR ROUTES & PAGE COMPONENTS

### Landing & Authentication Routes

| Route | File | Access | Purpose |
|-------|------|--------|---------|
| `/` | `/src/app/[locale]/page.tsx` | Public | Landing page |
| `/design-system` | `/src/app/design-system/page.tsx` | Public | Component showcase |
| `/[locale]/auth/signin` | `/src/app/[locale]/(authenticated)/auth/signin/page.tsx` | Public | Sign-in form |
| `/[locale]/auth/signup` | `/src/app/[locale]/(authenticated)/auth/signup/page.tsx` | Public | Registration form |
| `/[locale]/auth/mfa-setup` | `/src/app/[locale]/(authenticated)/auth/mfa-setup/page.tsx` | Authenticated | MFA setup |
| `/[locale]/auth/mfa-verify` | `/src/app/[locale]/(authenticated)/auth/mfa-verify/page.tsx` | Authenticated | MFA verification |
| `/[locale]/auth/reset-password` | `/src/app/[locale]/(authenticated)/auth/reset-password/page.tsx` | Public | Password reset |

### Shared Authenticated Routes (All Roles)

| Route | File | Purpose |
|-------|------|---------|
| `/[locale]/dashboard` | `/src/app/[locale]/(authenticated)/(dashboard)/page.tsx` | Main dashboard (role-specific content) |
| `/[locale]/sessions` | `/src/app/[locale]/(authenticated)/sessions/page.tsx` | Sessions list (coach/client) |
| `/[locale]/sessions/[id]` | `/src/app/[locale]/(authenticated)/sessions/[id]/page.tsx` | Session detail view |
| `/[locale]/sessions/new` | `/src/app/[locale]/(authenticated)/sessions/new/page.tsx` | Create new session (coach) |
| `/[locale]/sessions/[id]/edit` | `/src/app/[locale]/(authenticated)/sessions/[id]/edit/page.tsx` | Edit session (coach) |
| `/[locale]/messages` | `/src/app/[locale]/(authenticated)/messages/page.tsx` | Messaging (notifications) |
| `/[locale]/files` | `/src/app/[locale]/(authenticated)/files/page.tsx` | File management |
| `/[locale]/settings` | `/src/app/[locale]/(authenticated)/settings/page.tsx` | User settings |
| `/[locale]/settings/language` | `/src/app/[locale]/(authenticated)/settings/language/page.tsx` | Language preferences |
| `/[locale]/settings/notifications` | `/src/app/[locale]/(authenticated)/settings/notifications/page.tsx` | Notification settings |

### Coach-Only Routes

| Route | File | Purpose |
|-------|------|---------|
| `/[locale]/coach/clients` | `/src/app/[locale]/(authenticated)/coach/clients/page.tsx` | Client management list |
| `/[locale]/coach/clients/[id]` | `/src/app/[locale]/(authenticated)/coach/clients/[id]/page.tsx` | Individual client detail page |
| `/[locale]/coach/availability` | `/src/app/[locale]/(authenticated)/coach/availability/page.tsx` | Manage availability calendar |
| `/[locale]/coach/notes` | `/src/app/[locale]/(authenticated)/coach/notes/page.tsx` | Session notes |
| `/[locale]/coach/tasks` | `/src/app/[locale]/(authenticated)/coach/tasks/page.tsx` | Task management |
| `/[locale]/coach/insights` | `/src/app/[locale]/(authenticated)/coach/insights/page.tsx` | Analytics & insights |
| `/[locale]/coach/resources` | `/src/app/[locale]/(authenticated)/coach/resources/page.tsx` | Resource library management |
| `/[locale]/coach/resources/collections` | `/src/app/[locale]/(authenticated)/coach/resources/collections/page.tsx` | Resource collections |
| `/[locale]/coach/resources/collections/[id]` | `/src/app/[locale]/(authenticated)/coach/resources/collections/[id]/page.tsx` | Edit collection |
| `/[locale]/coach/resources/analytics` | `/src/app/[locale]/(authenticated)/coach/resources/analytics/page.tsx` | Resource engagement analytics |

### Client-Only Routes

| Route | File | Purpose |
|-------|------|---------|
| `/[locale]/client/sessions` | `/src/app/[locale]/(authenticated)/client/sessions/page.tsx` | My sessions list |
| `/[locale]/client/sessions/[id]` | `/src/app/[locale]/(authenticated)/client/sessions/[id]/page.tsx` | Session detail & notes |
| `/[locale]/client/book` | `/src/app/[locale]/(authenticated)/client/book/page.tsx` | Book new session |
| `/[locale]/client/coaches` | `/src/app/[locale]/(authenticated)/client/coaches/page.tsx` | Browse available coaches |
| `/[locale]/client/tasks` | `/src/app/[locale]/(authenticated)/client/tasks/page.tsx` | My assigned tasks |
| `/[locale]/client/progress` | `/src/app/[locale]/(authenticated)/client/progress/page.tsx` | Progress tracking |
| `/[locale]/client/reflections` | `/src/app/[locale]/(authenticated)/client/reflections/page.tsx` | Reflection space |
| `/[locale]/client/resources` | `/src/app/[locale]/(authenticated)/client/resources/page.tsx` | Shared resources library |

### Admin Routes

| Route | File | Purpose |
|-------|------|---------|
| `/[locale]/admin` | `/src/app/[locale]/(authenticated)/admin/page.tsx` | Admin dashboard overview |
| `/[locale]/admin/users` | `/src/app/[locale]/(authenticated)/admin/users/page.tsx` | User management |
| `/[locale]/admin/analytics` | `/src/app/[locale]/(authenticated)/admin/analytics/page.tsx` | System analytics |
| `/[locale]/admin/sessions` | `/src/app/[locale]/(authenticated)/admin/sessions/page.tsx` | Session monitoring |
| `/[locale]/admin/messages` | `/src/app/[locale]/(authenticated)/admin/messages/page.tsx` | Message management |
| `/[locale]/admin/mfa-health` | `/src/app/[locale]/(authenticated)/admin/mfa-health/page.tsx` | MFA health check |
| `/[locale]/admin/audit` | `/src/app/[locale]/(authenticated)/admin/audit/page.tsx` | Audit logs |
| `/[locale]/admin/performance` | `/src/app/[locale]/(authenticated)/admin/performance/page.tsx` | Performance metrics |
| `/[locale]/admin/system` | `/src/app/[locale]/(authenticated)/admin/system/page.tsx` | System status |
| `/[locale]/admin/resource-validation` | `/src/app/[locale]/(authenticated)/admin/resource-validation/page.tsx` | Resource validation |

### Onboarding Routes

| Route | File | Purpose |
|-------|------|---------|
| `/[locale]/onboarding` | `/src/app/[locale]/(authenticated)/onboarding/page.tsx` | Role selection |
| `/[locale]/onboarding/coach` | `/src/app/[locale]/(authenticated)/onboarding/coach/page.tsx` | Coach-specific setup |

---

## 3. KEY INTERACTIVE COMPONENTS

### Authentication Components

| Component | File | Purpose |
|-----------|------|---------|
| SigninForm | `/src/components/auth/signin-form.tsx` | Sign-in with email/password |
| SignupForm | `/src/components/auth/signup-form.tsx` | Registration form (role selection) |
| MfaSetupForm | `/src/components/auth/mfa-setup-form.tsx` | MFA setup flow |
| MfaVerificationForm | `/src/components/auth/mfa-verification-form.tsx` | MFA verification |
| ResetPasswordForm | `/src/components/auth/reset-password-form.tsx` | Password reset |
| AuthProvider | `/src/components/auth/auth-provider.tsx` | Auth context/state management |

### Coach Components

| Component | File | Purpose |
|-----------|------|---------|
| CoachClientsPage | `/src/components/coach/clients-page.tsx` | Displays list of coach's clients with search/filter |
| ClientDetailPage | `/src/components/coach/client-detail-page.tsx` | Client profile, sessions, progress |
| CoachDashboard | `/src/components/coach/coach-dashboard.tsx` | Main coach overview dashboard |
| AddSessionModal | `/src/components/coach/add-session-modal.tsx` | Create new session modal |
| AvailabilityManager | `/src/components/coach/availability-manager.tsx` | Manage coach's availability calendar |
| NotesManagement | `/src/components/coach/notes-management.tsx` | Session notes editor |
| InsightsPage | `/src/components/coach/insights-page.tsx` | Analytics dashboard |

### Client Components

| Component | File | Purpose |
|-----------|------|---------|
| ClientDashboard | `/src/components/client/client-dashboard.tsx` | Main client overview dashboard |
| BookPage | `/src/components/client/book-page.tsx` | Search and book sessions with coaches |
| CoachesPage | `/src/components/client/coaches-page.tsx` | Browse available coaches |
| SessionsListPage | `/src/components/client/sessions-list-page.tsx` | My sessions list |
| SessionDetailView | `/src/components/client/session-detail-view.tsx` | Session details, notes, feedback |
| RateSessionDialog | `/src/components/client/rate-session-dialog.tsx` | Session rating/feedback |
| RescheduleSessionDialog | `/src/components/client/reschedule-session-dialog.tsx` | Reschedule booking |
| ProgressPage | `/src/components/client/progress-page.tsx` | Progress tracking dashboard |
| ReflectionsManagement | `/src/components/client/reflections-management.tsx` | Reflection journal |

### Session Management Components

| Component | File | Purpose |
|-----------|------|---------|
| SessionFormInformation | `/src/components/sessions/forms/session-information-form.tsx` | Basic session info form |
| SessionNotesEditor | `/src/components/sessions/forms/session-notes-editor.tsx` | Rich text note editing |
| SessionGoalsManager | `/src/components/sessions/forms/session-goals-manager.tsx` | Session goals/agenda |
| SessionTypeSelector | `/src/components/sessions/forms/session-type-selector.tsx` | Session type selection |
| SessionBookingOrchestrator | `/src/components/sessions/booking/session-booking-orchestrator.tsx` | Multi-step booking flow |
| SessionTimeline | `/src/modules/sessions/components/SessionTimeline.tsx` | Session history/timeline |
| TaskList | `/src/modules/sessions/components/TaskList.tsx` | Session-linked tasks |

### Resource Library Components

| Component | File | Purpose |
|-----------|------|---------|
| ResourceLibraryPage | `/src/components/resources/resource-library-page.tsx` | Coach's resource management interface |
| ResourceCard | `/src/components/resources/resource-card.tsx` | Individual resource display |
| ResourceGrid | `/src/components/resources/resource-grid.tsx` | Grid display of resources |
| ResourceFilters | `/src/components/resources/resource-filters.tsx` | Filter/search resources |
| ResourceAnalyticsDashboard | `/src/components/resources/resource-analytics-dashboard.tsx` | Resource engagement analytics |
| ClientResourceLibraryPage | `/src/components/resources/client-resource-library-page.tsx` | Client's view of shared resources |
| ClientResourceGrid | `/src/components/resources/client-resource-grid.tsx` | Client resource browsing |
| CollectionCard | `/src/components/resources/collection-card.tsx` | Resource collection display |
| CollectionDialog | `/src/components/resources/collection-dialog.tsx` | Create/edit collections |
| AutoShareSettings | `/src/components/resources/auto-share-settings.tsx` | Auto-share new resources with clients |

### Task Management Components

| Component | File | Purpose |
|-----------|------|---------|
| TaskListView | `/src/modules/tasks/components/task-list-view.tsx` | Task list display |
| TaskListTable | `/src/modules/tasks/components/task-list-table.tsx` | Task table view |
| TaskCreateDialog | `/src/modules/tasks/components/task-create-dialog.tsx` | Create new task |
| TaskFiltersBar | `/src/modules/tasks/components/task-filters-bar.tsx` | Task filtering |
| TaskProgressDialog | `/src/modules/tasks/components/task-progress-dialog.tsx` | Update task progress |
| TaskStatusBadge | `/src/modules/tasks/components/task-status-badge.tsx` | Task status indicator |
| ClientTaskBoard | `/src/modules/tasks/components/client-task-board.tsx` | Client kanban board |

### Dashboard Widgets

| Component | File | Purpose |
|-----------|------|---------|
| CoachOverview | `/src/modules/dashboard/components/CoachOverview.tsx` | Coach dashboard main component |
| ClientOverview | `/src/modules/dashboard/components/ClientOverview.tsx` | Client dashboard main component |
| UpcomingSessions | `/src/modules/dashboard/components/widgets/UpcomingSessions.tsx` | Upcoming sessions widget |
| SessionsList | `/src/modules/dashboard/components/widgets/SessionsList.tsx` | Recent sessions widget |
| MyTasks | `/src/modules/dashboard/components/widgets/MyTasks.tsx` | Tasks widget |
| TasksSummary | `/src/modules/dashboard/components/widgets/TasksSummary.tsx` | Task summary stats |
| ClientProgress | `/src/modules/dashboard/components/widgets/ClientProgress.tsx` | Progress overview |
| GoalsProgress | `/src/modules/dashboard/components/widgets/GoalsProgress.tsx` | Goals tracking widget |
| ResourceHighlights | `/src/modules/dashboard/components/widgets/ResourceHighlights.tsx` | Featured resources |

---

## 4. DATA FETCHING & STATE MANAGEMENT PATTERNS

### Core Hooks for Data Fetching

#### Authentication Hooks
| Hook | File | Purpose |
|------|------|---------|
| `useUnifiedAuth()` | `/src/lib/auth/use-auth.ts` | Unified auth state (Supabase + Zustand) |
| `useUser()` | `/src/lib/auth/use-user.ts` | Re-export of useUser from auth-provider |
| `useAuth()` | `/src/components/auth/auth-provider.tsx` | Auth context hook (signIn, signUp, signOut, updateProfile) |

#### Dashboard Hooks
| Hook | File | Purpose |
|------|------|---------|
| `useClientOverview()` | `/src/modules/dashboard/api/useClientOverview.ts` | TanStack Query hook for client dashboard data |
| `useCoachOverview()` | `/src/modules/dashboard/api/useCoachOverview.ts` | TanStack Query hook for coach dashboard data |

#### Task Hooks
| Hook | File | Purpose |
|------|------|---------|
| `useTaskList()` | `/src/modules/tasks/hooks/queries.ts` | Get filtered task list |
| `useClientTaskList()` | `/src/modules/tasks/hooks/queries.ts` | Get client's task list |
| `useTask()` | `/src/modules/tasks/hooks/queries.ts` | Get single task details |
| `useCreateTask()` | `/src/modules/tasks/hooks/queries.ts` | Mutation for creating task |
| `useUpdateTask()` | `/src/modules/tasks/hooks/queries.ts` | Mutation for updating task |
| `useCreateProgressUpdate()` | `/src/modules/tasks/hooks/queries.ts` | Mutation for task progress |

#### MFA Hooks
| Hook | File | Purpose |
|------|------|---------|
| `useMfaSetup()` | `/src/modules/auth/hooks/useMfa.ts` | MFA setup flow |
| `useMfaVerification()` | `/src/modules/auth/hooks/useMfa.ts` | MFA verification |
| `useMfaStatus()` | `/src/modules/auth/hooks/useMfa.ts` | Check MFA status |

#### Resource Hooks
| Hook | File | Purpose |
|------|------|---------|
| `useResources()` | `/src/hooks/resources/use-resources.ts` | Fetch coach's resources with filtering |
| `useResourceMutations()` | `/src/hooks/resources/use-resource-mutations.ts` | Upload/delete resources |
| `useCollections()` | `/src/hooks/resources/use-collections.ts` | Manage resource collections |

### State Management Layers

#### Zustand Stores
| Store | File | Purpose |
|-------|------|---------|
| authStore | `/src/lib/store/auth-store.ts` | User auth state |
| sessionStore | `/src/lib/store/session-store.ts` | Session state |
| notificationStore | `/src/lib/store/notification-store.ts` | Notification state |

#### TanStack Query (React Query)
- Used for server state management
- Query keys organized by feature (e.g., `['dashboard', 'client-overview']`)
- Automatic caching and refetching
- Integration with mutations for optimistic updates

### Data Fetching Pattern Example

```typescript
// From /src/modules/dashboard/api/useClientOverview.ts
export const useClientOverview = () =>
  useQuery({
    queryKey: ['dashboard', 'client-overview'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/client-overview', {
        method: 'GET',
        credentials: 'include',
      });
      const payload = await response.json();
      
      if (!response.ok || !payload) {
        throw new Error('Unable to load client overview data');
      }
      
      return (payload.data ?? payload) as ClientOverviewData;
    },
  });
```

---

## 5. API ROUTES & BACKEND ENDPOINTS

### Authentication Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/auth/signin` | Sign in with email/password |
| POST | `/api/auth/signin-mfa` | Sign in with MFA verification |
| POST | `/api/auth/signup` | User registration |
| POST | `/api/auth/signout` | Sign out |
| GET | `/api/auth/me` | Get current user info |
| GET | `/api/auth/session` | Get current session |
| POST | `/api/auth/mfa/setup` | Initialize MFA setup |
| POST | `/api/auth/mfa/verify` | Verify MFA code |
| POST | `/api/auth/mfa/enable` | Enable MFA |
| POST | `/api/auth/mfa/disable` | Disable MFA |
| GET | `/api/auth/mfa-status` | Check MFA status |

### Session Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/sessions` | List sessions (paginated) |
| POST | `/api/sessions` | Create new session |
| GET | `/api/sessions/[id]` | Get session details |
| PUT | `/api/sessions/[id]` | Update session |
| DELETE | `/api/sessions/[id]` | Delete session |
| POST | `/api/sessions/book` | Book a new session (client) |
| POST | `/api/sessions/[id]/complete` | Mark session complete |
| POST | `/api/sessions/[id]/cancel` | Cancel session |
| POST | `/api/sessions/[id]/reschedule` | Reschedule session |
| POST | `/api/sessions/[id]/rate` | Rate session (client feedback) |

### Coach Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/coach/clients` | Get coach's client list |
| GET | `/api/coach/clients/[id]` | Get client details (coach view) |
| POST | `/api/coach/clients` | Add/invite client |
| GET | `/api/coaches/[id]/availability` | Get coach's availability |
| POST | `/api/coaches/[id]/availability` | Set availability |
| GET | `/api/coach/insights` | Get coach analytics |
| GET | `/api/coach/activity` | Get coach activity feed |

### Client Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/client/sessions` | Get client's sessions |
| GET | `/api/client/tasks` | Get assigned tasks |
| POST | `/api/client/tasks` | Create task |
| GET | `/api/client/stats` | Get client statistics |
| POST | `/api/client/reflections` | Create reflection |
| GET | `/api/client/resources` | Get shared resources |

### Resource Library Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/resources` | List coach's resources |
| POST | `/api/resources` | Upload new resource |
| GET | `/api/resources/[id]` | Get resource details |
| PUT | `/api/resources/[id]` | Update resource |
| DELETE | `/api/resources/[id]` | Delete resource |
| POST | `/api/resources/[id]/share-all-clients` | Share with all clients |
| GET | `/api/resources/[id]/progress` | Get resource engagement |
| GET | `/api/resources/collections` | Get resource collections |
| POST | `/api/resources/collections` | Create collection |
| GET | `/api/resources/analytics` | Get resource analytics |
| GET | `/api/client/resources` | Get client's resources |

### Task Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/[taskId]` | Get task details |
| PUT | `/api/tasks/[taskId]` | Update task |
| DELETE | `/api/tasks/[taskId]` | Delete task |
| POST | `/api/tasks/[taskId]/assign` | Assign to client |
| GET | `/api/tasks/assigned` | Get assigned tasks (client) |
| POST | `/api/tasks/assigned/[instanceId]/complete` | Complete assigned task |
| POST | `/api/tasks/assigned/[instanceId]/progress` | Update task progress |

### Notification Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/notifications` | Get notifications |
| POST | `/api/notifications/[id]/read` | Mark as read |
| POST | `/api/notifications/mark-all-read` | Mark all as read |
| GET | `/api/notifications/preferences` | Get notification prefs |
| PUT | `/api/notifications/preferences` | Update preferences |

### Admin Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/analytics` | System analytics |
| GET | `/api/admin/sessions` | Session monitoring |
| GET | `/api/admin/mfa/users` | MFA user statistics |
| GET | `/api/admin/system` | System health |
| GET | `/api/admin/performance-metrics` | Performance data |

---

## 6. ROLE-BASED RENDERING LOGIC EXAMPLES

### Navigation Filtering (Sidebar.tsx)

```typescript
// Role-aware navigation item visibility
function isItemVisible(item: NavigationItem, role: NavigationRole) {
  if (!item.roles || item.roles.length === 0) {
    return true; // Show for all roles
  }
  
  if (item.roles.includes('all')) {
    return true;
  }
  
  return item.roles.includes(role); // Check if current role is in allowed list
}

// Usage in navigation sections:
{
  id: 'coach',
  label: 'Coach',
  items: [
    {
      id: 'coach-clients',
      label: 'Clients',
      href: '/coach/clients',
      roles: ['coach'], // Only visible to coaches
    },
    // ... more coach items
  ]
}
```

### Route Guards (route-guard.tsx)

```typescript
// Protect routes by role
<CoachOrAdminRoute>
  <CoachClientsPage />
</CoachOrAdminRoute>

<ClientOrAdminRoute>
  <SessionsListPage />
</ClientOrAdminRoute>

// Custom guard with permission check
<RouteGuard
  requireAuth
  requirePermission="sessions:create"
  redirectTo="/auth/signin"
>
  <CreateSessionForm />
</RouteGuard>
```

### Dashboard Content Switching

```typescript
// From dashboard page
export default async function DashboardPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/signin');
  }
  
  // Different component for each role
  if (user.role === 'coach') {
    return <CoachOverview locale={locale} />;
  }
  
  if (user.role === 'client') {
    return <ClientOverview locale={locale} />;
  }
  
  if (user.role === 'admin') {
    return <AdminDashboard />;
  }
}
```

### Permission Checks (permissions.ts)

```typescript
// Check if user can perform action
export function canAccessSession(
  userRole: Role,
  userId: string,
  sessionOwnerId: string,
  sessionCoachId?: string
): boolean {
  // Admin can access all sessions
  if (userRole === 'admin') return true;
  
  // Coach can access sessions they're coaching
  if (userRole === 'coach' && sessionCoachId === userId) return true;
  
  // Client can access their own sessions
  if (userRole === 'client' && sessionOwnerId === userId) return true;
  
  return false;
}
```

---

## 7. COMPLETE USER FLOW EXAMPLES

### COACH JOURNEY

#### 1. Sign Up & Onboarding
```
1. Landing Page (/en)
   ↓
2. Sign Up (/auth/signup)
   - Enter email, password, name
   - Select "Coach" role
   - Form: SignupForm component
   - API: POST /api/auth/signup
   ↓
3. Email Verification
   - Check inbox for verification link
   ↓
4. MFA Setup (Optional)
   - /auth/mfa-setup
   - Set up TOTP or SMS
   ↓
5. Coach Onboarding (/onboarding/coach)
   - Complete coach profile
   - Set bio, specialties, hourly rate
   - API: POST /api/onboarding/coach
   ↓
6. Availability Setup
   - Set working hours/calendar
   - API: POST /api/coaches/[id]/availability
```

#### 2. Managing Clients
```
1. Access Coach Dashboard (/dashboard)
   - Components: CoachOverview, various widgets
   - API: GET /api/dashboard/coach-overview
   - Data: Sessions, clients, tasks summary
   ↓
2. View Clients List (/coach/clients)
   - Component: CoachClientsPage
   - API: GET /api/coach/clients?limit=50&offset=0
   - List shows: name, email, status, last session, progress
   ↓
3. Click on Client → Client Detail (/coach/clients/[id])
   - Component: ClientDetailPage
   - Shows: Profile, session history, progress, notes
   - API: GET /api/coach/clients/[id]
   ↓
4. Create Session for Client
   - Modal: AddSessionModal
   - Form: SessionInformationForm
   - Inputs: Title, description, date/time, duration
   - API: POST /api/sessions
```

#### 3. Managing Resources
```
1. Visit Resources (/coach/resources)
   - Component: ResourceLibraryPage
   - API: GET /api/resources?category=pdf&limit=20
   ↓
2. Upload New Resource
   - Upload file (PDF, video, audio, doc)
   - API: POST /api/resources (multipart/form-data)
   - Returns: Resource ID, metadata
   ↓
3. Organize into Collections
   - Create collection: CollectionDialog
   - API: POST /api/resources/collections
   - Edit collection: drag-drop resources
   - API: PUT /api/resources/collections/[id]
   ↓
4. Share with Clients
   - Auto-share option for new clients
   - Manual share: select clients and resources
   - API: POST /api/resources/[id]/share-all-clients
   ↓
5. Monitor Engagement
   - Visit: /coach/resources/analytics
   - Component: ResourceAnalyticsDashboard
   - API: GET /api/resources/analytics
   - Shows: view counts, downloads, time spent per resource
```

#### 4. Managing Tasks
```
1. Visit Tasks (/coach/tasks)
   - Component: TaskListView
   - API: GET /api/tasks?status=active
   ↓
2. Create Task
   - Dialog: TaskCreateDialog
   - Inputs: Title, description, deadline, priority, recurrence
   - API: POST /api/tasks
   ↓
3. Assign to Client
   - Click "Assign"
   - Select client(s) from dialog
   - API: POST /api/tasks/[taskId]/assign
   ↓
4. Track Progress
   - View assigned task list
   - API: GET /api/tasks/assigned
   - Shows: completion status, client progress, due dates
```

#### 5. Session Management & Notes
```
1. Create Session
   - API: POST /api/sessions
   - Scheduler picks date/time
   ↓
2. Session Starts
   - When time arrives, session status changes
   - Coach can take notes: SessionNotesEditor
   ↓
3. Complete Session
   - Mark as complete: POST /api/sessions/[id]/complete
   - Client can rate: POST /api/sessions/[id]/rate
   ↓
4. View Session Notes
   - /coach/notes
   - Component: NotesManagement
   - API: GET /api/notes?sessionId=[id]
```

---

### CLIENT JOURNEY

#### 1. Sign Up & Onboarding
```
1. Landing Page (/en)
   ↓
2. Sign Up (/auth/signup)
   - Enter email, password, name
   - Select "Client" role
   - API: POST /api/auth/signup
   ↓
3. Email Verification
   ↓
4. Client Dashboard (/dashboard)
   - Component: ClientOverview
   - API: GET /api/dashboard/client-overview
   - Shows: upcoming sessions, tasks, progress
```

#### 2. Finding & Booking Sessions
```
1. Visit Coaches Directory (/client/coaches)
   - Component: CoachesPage
   - API: GET /api/coaches
   - Shows: coach profiles, specialties, availability, hourly rate
   ↓
2. Click Coach Profile
   - View: Bio, credentials, past client reviews, availability
   - API: GET /api/coaches/[id]/availability
   ↓
3. Click "Book Session"
   - Redirects to: /client/book
   - Component: BookPage
   - SessionBookingOrchestrator multi-step flow:
     - Step 1: Confirm coach selection
     - Step 2: Select date/time from available slots
     - Step 3: Enter session topic/goals
     - Step 4: Confirm booking
   ↓
4. Submit Booking
   - API: POST /api/sessions/book
   - Payload: coachId, scheduledAt, durationMinutes, title
   - Returns: Session details, confirmation
   ↓
5. Get Notification
   - Coach gets notification of new booking
   - Coach can accept or suggest different time
```

#### 3. Attending Sessions
```
1. View My Sessions (/client/sessions)
   - Component: SessionsListPage
   - API: GET /api/client/sessions
   - Shows: scheduled, completed, cancelled
   ↓
2. Session Approaching
   - Notification sent 15 mins before
   - Click session to view details
   ↓
3. During Session
   - Can use collaborative notes if enabled
   - Coach takes notes visible to client
   ↓
4. After Session
   - Rate session: RateSessionDialog
   - API: POST /api/sessions/[id]/rate
   - Write feedback, give star rating
   ↓
5. View Session Details
   - /client/sessions/[id]
   - Component: SessionDetailView
   - Shows: date, coach notes, feedback, next steps
```

#### 4. Managing Tasks
```
1. View Assigned Tasks (/client/tasks)
   - Component: TaskListView with ClientTaskBoard (Kanban)
   - API: GET /api/client/tasks
   - Columns: To Do, In Progress, Completed
   ↓
2. Start Task
   - Drag to "In Progress"
   - API: POST /api/tasks/assigned/[instanceId]/progress
   ↓
3. Update Progress
   - Attach notes/evidence
   - API: POST /api/tasks/assigned/[instanceId]/progress/[updateId]
   ↓
4. Complete Task
   - API: POST /api/tasks/assigned/[instanceId]/complete
   - Coach gets notification
```

#### 5. Accessing Resources
```
1. Visit Resources Library (/client/resources)
   - Component: ClientResourceLibraryPage
   - API: GET /api/client/resources
   - Shows: all resources shared by coaches
   ↓
2. Browse Resources
   - Component: ClientResourceGrid
   - Filter by: category, coach, tags
   - Search by filename/description
   ↓
3. View Resource Details
   - Download or stream resource
   - API: GET /api/resources/[id]/download
   - Mark as "viewed" or "completed"
   - API: POST /api/client/resources/[resourceId]/progress
   ↓
4. Track Progress
   - View: /client/progress
   - Component: ProgressPage
   - Shows: resources completed, sessions attended, tasks done, goals met
   - API: GET /api/client/stats
```

#### 6. Reflections & Journal
```
1. Visit Reflections Space (/client/reflections)
   - Component: ReflectionsManagement
   - API: GET /api/reflections
   ↓
2. Add Reflection
   - Rich text editor
   - Optional: Link to session or resource
   - API: POST /api/reflections
   ↓
3. View History
   - Timeline of all reflections
   - API: GET /api/reflections (paginated)
```

---

### ADMIN JOURNEY

#### 1. Admin Dashboard
```
/admin
  ↓
  - System health metrics
  - User statistics (coaches, clients, admins)
  - Session volume
  - API: GET /api/admin/dashboard
```

#### 2. User Management
```
/admin/users
  ↓
  - List all users with role, email, created date
  - API: GET /api/admin/users
  - Search/filter by role, email, status
  ↓
  - View user details: /admin/users/[id]
  - Edit user role/permissions
  - API: PUT /api/admin/users/[id]
  ↓
  - Deactivate or delete user
  - API: DELETE /api/admin/users/[id]
```

#### 3. Analytics & Monitoring
```
/admin/analytics
  - Session trends, user growth
  - API: GET /api/admin/analytics
  ↓
/admin/performance
  - API response times
  - Database query performance
  - API: GET /api/admin/performance-metrics
  ↓
/admin/mfa-health
  - MFA adoption rate
  - Recovery code usage
  - API: GET /api/admin/mfa/users
```

---

## 8. COMPONENT HIERARCHY DIAGRAMS

### Coach Dashboard Structure

```
DashboardLayout (authenticated wrapper)
  ├── Sidebar
  │   ├── Navigation sections (filtered by role)
  │   └── User summary card
  ├── Topbar
  │   ├── Notifications bell
  │   └── User menu
  └── CoachOverview (main content)
      ├── Summary cards (clients, sessions, tasks)
      ├── QuickActions
      │   └── AddSessionModal
      │       └── SessionInformationForm
      ├── SessionsList widget
      ├── TasksSummary widget
      ├── ClientProgressOverview widget
      └── ResourceHighlights widget
```

### Client Booking Flow

```
BookPage
  └── SessionBookingOrchestrator (multi-step)
      ├── Step 1: CoachSelector
      ├── Step 2: DateTimeSelector
      ├── Step 3: SessionDetailsForm
      │   ├── TitleInput
      │   ├── DescriptionInput
      │   └── GoalsManager
      └── Step 4: ConfirmationPanel
          └── BookingConfirmation
```

### Resource Library Structure

```
ResourceLibraryPage (Coach)
  ├── Header + Upload button
  ├── ResourceFilters
  │   ├── CategoryFilter
  │   ├── TagsFilter
  │   └── SearchInput
  ├── ResourceGrid
  │   ├── ResourceCard (multiple)
  │   │   ├── FilePreview/Icon
  │   │   ├── Title, description
  │   │   └── Actions (edit, share, delete)
  │   └── CollectionCard
  │       ├── Preview
  │       └── Actions
  └── SidePanel/Modal
      └── CollectionDialog (create/edit)
```

---

## 9. KEY AUTHENTICATION & SECURITY FEATURES

### Authentication Flow

```
1. User submits credentials (SigninForm)
   ↓
2. API: POST /api/auth/signin
   - Supabase auth.signInWithPassword()
   - Returns: JWT token, user profile
   ↓
3. Token stored in:
   - HttpOnly cookie (secure)
   - Zustand auth store
   ↓
4. MFA Check
   - If MFA enabled: redirect to /auth/mfa-verify
   - Else: redirect to dashboard
   ↓
5. Session hydration on page load
   - useUnifiedAuth hook
   - Validates session with Supabase
   - Populates auth store
```

### Permission Checks

```
// API Route Example: /api/coach/clients
1. Get authenticated user
   - Supabase.auth.getUser()
2. Check user profile role
   - Query users table for role
3. Verify role is "coach"
   - If not: return 403 Forbidden
4. Fetch user's clients only
   - WHERE coach_id = user.id (RLS policy)
5. Return filtered results
```

### Row-Level Security (RLS)

```sql
-- Example: Clients can only see sessions they're in
CREATE POLICY "clients_see_own_sessions" ON sessions
  FOR SELECT
  USING (
    auth.uid() = client_id 
    OR auth.uid() = coach_id
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
```

---

## 10. FORM & MUTATION PATTERNS

### Session Booking Form Example

```typescript
// Component: BookPage
const bookSessionMutation = useMutation({
  mutationFn: async (data: BookSessionInput) => {
    const response = await fetch('/api/sessions/book', {
      method: 'POST',
      body: JSON.stringify({
        coachId: data.coachId,
        title: data.title,
        description: data.description,
        scheduledAt: data.scheduledAt.toISOString(),
        durationMinutes: data.duration,
      }),
    });
    return response.json();
  },
  onSuccess: (data) => {
    // Invalidate sessions query to refetch
    queryClient.invalidateQueries(['sessions']);
    // Show success toast
    toast.success('Session booked successfully');
    // Redirect to session detail
    router.push(`/sessions/${data.id}`);
  },
  onError: (error) => {
    toast.error(error.message);
  },
});
```

### Task Assignment Mutation

```typescript
const assignTaskMutation = useMutation({
  mutationFn: async (variables: {
    taskId: string;
    clientId: string;
  }) => {
    const response = await fetch(
      `/api/tasks/${variables.taskId}/assign`,
      {
        method: 'POST',
        body: JSON.stringify({
          clientId: variables.clientId,
        }),
      }
    );
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['tasks']);
    toast.success('Task assigned');
  },
});
```

---

## 11. KEY FILES REFERENCE GUIDE

### Must-Read Files for Understanding Architecture

| File | Purpose |
|------|---------|
| `/src/middleware.ts` | Auth & locale routing middleware |
| `/src/lib/auth/permissions.ts` | Permission matrix (critical for understanding access control) |
| `/src/components/auth/route-guard.tsx` | Component-level route protection |
| `/src/components/layout/Sidebar.tsx` | Navigation structure and role filtering |
| `/src/modules/dashboard/components/CoachOverview.tsx` | Coach dashboard logic |
| `/src/modules/dashboard/components/ClientOverview.tsx` | Client dashboard logic |
| `/src/lib/auth/use-auth.ts` | Auth state management with Zustand |
| `/src/app/[locale]/(authenticated)/(dashboard)/layout.tsx` | Dashboard layout with navigation config |
| `/src/app/api/sessions/book/route.ts` | Session booking API (input validation, error handling) |
| `/src/app/api/coach/clients/route.ts` | Coach clients API (role checking pattern) |
| `/src/components/sessions/booking/session-booking-orchestrator.tsx` | Multi-step booking flow |
| `/src/components/resources/resource-library-page.tsx` | Resource library UI with CRUD operations |

---

## 12. DATA FLOW SUMMARY

### Request → Response Flow

```
User Action (e.g., click "Book Session")
  ↓
Component triggered (onClick handler)
  ↓
Form validation (React Hook Form + Zod)
  ↓
Mutation function called (TanStack Query useMutation)
  ↓
API route called (e.g., POST /api/sessions/book)
  ↓
Server-side validation (Zod schema)
  ↓
Authentication check (Supabase.auth.getUser())
  ↓
Authorization check (Role & permissions verification)
  ↓
Database query with RLS policies
  ↓
Response (success or error)
  ↓
Mutation callbacks (onSuccess/onError)
  ↓
UI update (toast, redirect, query invalidation)
  ↓
Zustand/React Query state update
  ↓
Component re-render with new data
```

### State Management Layers

```
┌─────────────────────────────────────┐
│   React Components (UI)             │
├─────────────────────────────────────┤
│   Local State (useState)             │  Component-level
├─────────────────────────────────────┤
│   React Hook Form (Form state)       │  Form-specific
├─────────────────────────────────────┤
│   TanStack Query (Server state)      │  Cache, refetch, mutations
├─────────────────────────────────────┤
│   Zustand Stores                     │  Global state (auth, sessions, notifications)
│   - authStore                        │
│   - sessionStore                     │
│   - notificationStore                │
├─────────────────────────────────────┤
│   Supabase Client                    │
│   - Auth                             │  JWT tokens, session management
│   - Database (PostgreSQL)            │  RLS policies
├─────────────────────────────────────┤
│   Backend (Supabase)                 │
└─────────────────────────────────────┘
```

---

## Summary Statistics

- **Total Source Files**: ~964 files
- **Page Routes**: 80+ user-facing pages
- **API Routes**: 150+ endpoints
- **Custom Hooks**: 50+
- **React Components**: 200+
- **Supported Languages**: 2 (English, Hebrew)
- **User Roles**: 3 (Coach, Client, Admin)
- **Permissions**: 25+
- **Core Features**: Sessions, Resources, Tasks, Analytics, Messaging, Notes, MFA

