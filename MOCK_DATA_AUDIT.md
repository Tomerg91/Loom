# Mock Data Audit Report

**Generated:** 2025-11-07
**Branch:** claude/audit-mock-data-011CUtmHtHS3a2GztaYyUCXj

## Executive Summary

This audit identifies all mock, dummy, and placeholder data currently used in the Loom coaching platform that needs to be replaced with real-time data from users and the database. The audit focuses on production code only (excluding test files).

### Summary Statistics

- **Total Mock Data Instances:** 7
- **Files Affected:** 6
- **High Priority Items:** 3
- **Medium Priority Items:** 2
- **Low Priority Items:** 2

---

## 1. Session Creation Page

**File:** `src/components/sessions/session-create-page.tsx`
**Priority:** 🔴 HIGH
**Lines:** 41-118

### Mock Data Found

#### 1.1 Mock Available Users (Lines 41-106)
```typescript
const { data: availableUsers } = useQuery<User[]>({
  queryKey: ['available-users'],
  queryFn: async () => {
    // Mock API call - filter based on current user role
    const allUsers: User[] = [
      {
        id: '1',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah@loom.com',
        role: 'coach' as const,
      },
      {
        id: '2',
        firstName: 'Michael',
        lastName: 'Chen',
        email: 'michael@loom.com',
        role: 'coach' as const,
      },
      {
        id: '3',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'client' as const,
      },
      {
        id: '4',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        role: 'client' as const,
      }
    ];
    // ... filtering logic
  },
});
```

**Impact:** Users cannot select real coaches/clients when creating sessions.

**Replacement Strategy:**
- Create API endpoint: `GET /api/users?role={coach|client}`
- Query Supabase `profiles` table with role filter
- Return real user data with proper authorization checks

#### 1.2 Mock Session Creation (Lines 108-118)
```typescript
const createSessionMutation = useMutation({
  mutationFn: async (data: typeof formData) => {
    // Mock API call
    console.log('Creating session:', data);
    return { id: 'new-session-id', success: true };
  },
});
```

**Impact:** Sessions are not actually created in the database.

**Replacement Strategy:**
- Create API endpoint: `POST /api/sessions`
- Insert session record into Supabase `sessions` table
- Return created session with real ID

---

## 2. Coach Sessions Page

**File:** `src/app/coach/sessions/page.tsx`
**Priority:** 🔴 HIGH
**Lines:** 102-201, 268

### Mock Data Found

#### 2.1 Mock Sessions Array (Lines 102-168)
```typescript
const mockSessions: Session[] = [
  {
    id: '1',
    coachId: 'coach-1',
    clientId: 'client-1',
    title: 'Goal Setting & Career Planning',
    description: 'Initial consultation to discuss career goals...',
    scheduledAt: new Date().toISOString(),
    duration: 60,
    status: 'scheduled',
    sessionType: 'video',
    meetingUrl: 'https://zoom.us/j/123456789',
    // ... includes nested coach and client objects
  },
  // ... more mock sessions
];
```

**Impact:** Coaches cannot see their actual scheduled sessions.

**Replacement Strategy:**
- Create API endpoint: `GET /api/sessions?coachId={coachId}`
- Query Supabase `sessions` table with JOIN to `profiles` for user details
- Apply filters for status, date range, etc.

#### 2.2 Mock Clients Array (Lines 170-197)
```typescript
const mockClients: CoachClient[] = [
  {
    id: 'client-1',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john@example.com',
    avatar: '/avatars/john.jpg',
    status: 'active',
    totalSessions: 8,
    completedSessions: 6,
    averageRating: 4.8,
    nextSession: new Date().toISOString(),
    goals: ['Career transition to tech', 'Improve leadership skills']
  },
  // ... more mock clients
];
```

**Impact:** Coaches cannot see their actual client list and statistics.

**Replacement Strategy:**
- Create API endpoint: `GET /api/coach/clients`
- Query Supabase to get clients with session statistics
- Calculate real metrics: total/completed sessions, ratings, next session date

#### 2.3 Mock Revenue Calculation (Line 268)
```typescript
totalRevenue: sessions.filter(s => s.status === 'completed').length * 150, // Mock rate
```

**Impact:** Revenue statistics are not accurate.

**Replacement Strategy:**
- Use real session pricing from `sessions.price` or `coaches.hourlyRate`
- Calculate from actual completed sessions in database
- Consider different rates per session type

---

## 3. Client Coaches Page

**File:** `src/components/client/coaches-page.tsx`
**Priority:** 🔴 HIGH
**Lines:** 68-153

### Mock Data Found

#### 3.1 Mock Coaches List (Lines 68-153)
```typescript
const { data: coaches, isLoading, error } = useQuery<Coach[]>({
  queryKey: ['available-coaches', searchTerm, specialtyFilter, ratingFilter, priceFilter],
  queryFn: async () => {
    return [
      {
        id: '1',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@loom.com',
        title: 'Executive Leadership Coach',
        bio: 'Experienced executive coach specializing in leadership development...',
        specialties: ['Leadership Development', 'Career Coaching', 'Executive Presence'],
        experience: 8,
        rating: 4.9,
        reviewCount: 127,
        hourlyRate: 150,
        location: 'New York, NY',
        languages: ['English', 'Spanish'],
        availability: { /* ... mock availability */ },
        credentials: ['ICF PCC', 'MBA', 'Leadership Certified'],
        approach: 'Solution-focused coaching...',
        successStories: 89,
      },
      // ... 2 more mock coaches
    ];
  },
});
```

**Impact:** Clients cannot discover and book real coaches.

**Replacement Strategy:**
- Create API endpoint: `GET /api/coaches?search={term}&specialty={filter}&minRating={rating}&maxPrice={price}`
- Query Supabase `profiles` table where `role = 'coach'`
- Include coach profile details, ratings, availability
- Apply search and filter parameters

---

## 4. File Management Page

**File:** `src/components/files/file-management-page.tsx`
**Priority:** 🟡 MEDIUM
**Lines:** 155-209

### Mock Data Found

#### 4.1 Mock Virtual Folders (Lines 155-209)
```typescript
const loadVirtualFolders = async () => {
  try {
    // Mock data - in real app this would come from API
    const mockFolders: VirtualFolder[] = [
      {
        id: '1',
        name: 'Recent Uploads',
        description: 'Files uploaded in the last 7 days',
        color: 'blue',
        icon: 'clock',
        rules: {
          dateRange: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fileCount: files.filter(f => /* ... */).length,
      },
      {
        id: '2',
        name: 'Shared Files',
        description: 'Files shared with you by coaches or clients',
        color: 'purple',
        icon: 'users',
        rules: { sharedWith: true },
        fileCount: 0,
      },
      {
        id: '3',
        name: 'Large Files',
        description: 'Files larger than 10MB',
        color: 'orange',
        icon: 'database',
        rules: { minSize: 10 * 1024 * 1024 },
        fileCount: 0,
      }
    ];
    setVirtualFolders(mockFolders);
  } catch (error) {
    console.error('Failed to load virtual folders:', error);
  }
};
```

**Impact:** Users see predefined folders instead of their custom smart folders.

**Replacement Strategy:**
- Create API endpoint: `GET /api/folders/virtual`
- Store virtual folder definitions in Supabase `virtual_folders` table
- Query files table dynamically based on folder rules
- Allow users to create/edit custom virtual folders

---

## 5. System Health Display (Admin)

**File:** `src/components/admin/system-health-display.tsx`
**Priority:** 🟡 MEDIUM
**Lines:** 59-91

### Mock Data Found

#### 5.1 Mock Health Data Fallback (Lines 59-91)
```typescript
// Use mock data as fallback for development
setHealth(generateMockHealthData());

const generateMockHealthData = (): SystemHealth => ({
  database: {
    status: 'healthy',
    connections: 12,
    maxConnections: 100,
    responseTime: 45,
  },
  server: {
    status: 'healthy',
    uptime: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days ago
    memoryUsage: 68,
    cpuUsage: 23,
  },
  cache: {
    status: 'healthy',
    hitRate: 94.2,
    memoryUsed: 256,
  },
  services: {
    analytics: 'healthy',
    notifications: 'healthy',
    fileStorage: 'healthy',
  },
  lastChecked: new Date().toISOString(),
});
```

**Impact:** Admin dashboard shows fake system health metrics.

**Note:** The API route at `src/app/api/admin/system-health/route.ts` does fetch some real data, but the component uses mock data as fallback.

**Replacement Strategy:**
- Remove mock data fallback
- Only use fallback during actual API error states
- Show loading state while fetching real data
- Display error message if API call fails

---

## 6. System Health API Route

**File:** `src/app/api/admin/system-health/route.ts`
**Priority:** 🟡 MEDIUM
**Lines:** 100, 190-196

### Mock Data Found

#### 6.1 Placeholder Database Connections (Line 100)
```typescript
// Get connection info (simplified - would need actual pool stats in production)
const connections = Math.floor(Math.random() * 20) + 5; // Placeholder for real connection count
```

**Impact:** Admin sees random connection counts instead of real metrics.

**Replacement Strategy:**
- Access Supabase connection pool statistics
- Use database query: `SELECT count(*) FROM pg_stat_activity`
- Or expose connection metrics from Supabase client

#### 6.2 Simulated Cache Check (Lines 190-196)
```typescript
async function simulateCacheCheck() {
  // This would integrate with your actual cache implementation
  // For now, return reasonable values based on application state
  return {
    hitRate: Math.random() * 15 + 85, // 85-100% hit rate
    memoryUsed: Math.floor(Math.random() * 100) + 50, // 50-150MB
  };
}
```

**Impact:** Admin sees fake cache statistics.

**Replacement Strategy:**
- If Redis/cache exists: integrate with real cache metrics API
- If no cache layer: remove cache health section entirely
- Or implement cache monitoring with real metrics

---

## 7. Chart Placeholder Component

**File:** `src/components/dashboard/charts/chart-placeholder.tsx`
**Priority:** ⚪ LOW
**Lines:** 1-39

### Mock Data Found

#### 7.1 Entire Placeholder Component (Lines 1-39)
```typescript
export function ChartPlaceholder({
  title,
  description,
  icon: Icon,
  height = "h-64",
  message = "Chart visualization would go here",
  submessage = "Integration with charting library needed"
}: ChartPlaceholderProps) {
  return (
    <div className={/* ... */}>
      {/* Displays placeholder UI for charts */}
    </div>
  );
}
```

**Impact:** Charts show placeholder messages instead of visualizations.

**Replacement Strategy:**
- Implement real chart components using Recharts or Chart.js
- Fetch real data for each chart type (session trends, revenue, etc.)
- Replace ChartPlaceholder usage with actual chart components

---

## Components Already Using Real Data ✅

These components are correctly implemented and fetch real data from APIs:

### ✅ Working Production Features

1. **Coach Dashboard** (`src/components/coach/coach-dashboard.tsx`)
   - ✅ Fetches from `/api/coach/stats`
   - ✅ Fetches from `/api/sessions`
   - ✅ Fetches from `/api/coach/clients`
   - ✅ Fetches from `/api/coach/activity`

2. **Client Dashboard** (`src/components/client/client-dashboard.tsx`)
   - ✅ Fetches from `/api/client/stats`
   - ✅ Fetches from `/api/sessions`
   - ✅ Fetches from `/api/client/reflections`

3. **Sessions List Page** (`src/components/client/sessions-list-page.tsx`)
   - ✅ Fetches from `/api/sessions` with proper filtering

4. **Notification Center** (`src/components/notifications/notification-center.tsx`)
   - ✅ Fetches from `/api/notifications`
   - ✅ Has offline queue support

---

## Implementation Roadmap

### Phase 1: Critical User Features (HIGH Priority) 🔴

**Target:** Enable core booking and session management functionality

1. **Session Creation API**
   - [ ] Create `GET /api/users` endpoint with role filtering
   - [ ] Create `POST /api/sessions` endpoint
   - [ ] Update `session-create-page.tsx` to use real APIs
   - [ ] Test session creation flow end-to-end

2. **Coach Session Management**
   - [ ] Create `GET /api/sessions?coachId={id}` endpoint with filters
   - [ ] Create `GET /api/coach/clients` endpoint with statistics
   - [ ] Update `coach/sessions/page.tsx` to fetch real data
   - [ ] Fix revenue calculation to use real pricing

3. **Client Coach Discovery**
   - [ ] Create `GET /api/coaches` endpoint with search/filters
   - [ ] Include coach profiles, ratings, availability
   - [ ] Update `coaches-page.tsx` to use real API
   - [ ] Test search and filtering functionality

**Estimated Effort:** 3-5 days

---

### Phase 2: Advanced Features (MEDIUM Priority) 🟡

**Target:** Enable file management and admin monitoring

4. **Virtual Folders System**
   - [ ] Create Supabase `virtual_folders` table
   - [ ] Create `GET /api/folders/virtual` endpoint
   - [ ] Create `POST /api/folders/virtual` endpoint (for user-created folders)
   - [ ] Update `file-management-page.tsx` to use real folders
   - [ ] Implement dynamic file filtering based on folder rules

5. **System Health Monitoring**
   - [ ] Remove mock data fallback from `system-health-display.tsx`
   - [ ] Fix database connection count in API route
   - [ ] Implement real cache metrics or remove cache section
   - [ ] Add proper loading/error states

**Estimated Effort:** 2-3 days

---

### Phase 3: UI Enhancements (LOW Priority) ⚪

**Target:** Replace placeholder UI with real visualizations

6. **Chart Implementations**
   - [ ] Install chart library (Recharts recommended for React)
   - [ ] Create session trends chart component
   - [ ] Create revenue chart component
   - [ ] Create activity/engagement charts
   - [ ] Replace all ChartPlaceholder usage

**Estimated Effort:** 2-3 days

---

## Database Schema Requirements

### New Tables Needed

```sql
-- Virtual folders for file organization
CREATE TABLE virtual_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  rules JSONB NOT NULL, -- Filter rules (dateRange, sharedWith, minSize, etc.)
  file_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tables That May Need Updates

- `sessions` - Ensure has `price` or link to coach `hourlyRate`
- `profiles` - Ensure coach profiles have all required fields (specialties, bio, credentials, etc.)
- `sessions` - Add `meeting_url` if not present

---

## API Endpoints to Create

### User Management
- `GET /api/users?role={coach|client}` - List users by role for session creation

### Session Management
- `POST /api/sessions` - Create new session
- `GET /api/sessions?coachId={id}` - List sessions for a coach (may already exist)

### Coach Discovery
- `GET /api/coaches` - List all coaches with profiles, ratings, availability
  - Query params: `search`, `specialty`, `minRating`, `maxPrice`

### File Management
- `GET /api/folders/virtual` - Get user's virtual folders
- `POST /api/folders/virtual` - Create new virtual folder
- `PUT /api/folders/virtual/{id}` - Update virtual folder
- `DELETE /api/folders/virtual/{id}` - Delete virtual folder

---

## Testing Checklist

### High Priority Features
- [ ] Session creation with real users
- [ ] Session appears in coach's session list
- [ ] Session appears in client's session list
- [ ] Coach can view real client list with stats
- [ ] Client can search and filter coaches
- [ ] Client can view coach profiles

### Medium Priority Features
- [ ] Virtual folders load for user
- [ ] Files are correctly filtered by folder rules
- [ ] System health shows real metrics
- [ ] Admin dashboard loads without mock data

### Low Priority Features
- [ ] Charts display real data
- [ ] Chart data updates dynamically

---

## Security Considerations

When implementing real data endpoints:

1. **Authorization**
   - Verify user authentication on all endpoints
   - Check user role permissions (coach/client/admin)
   - Ensure users can only access their own data

2. **Data Validation**
   - Validate all input parameters
   - Sanitize search queries to prevent injection
   - Check date ranges and numeric limits

3. **Rate Limiting**
   - Implement rate limiting on search endpoints
   - Protect against enumeration attacks

4. **Privacy**
   - Don't expose sensitive user data in coach listings
   - Filter personal information based on privacy settings
   - Respect user preferences for visibility

---

## Notes

- All test files with mock data have been excluded from this audit
- Focus is on production code that affects user experience
- Some API routes may already exist but need enhancement
- Dashboards (coach/client) are already correctly implemented with real data
- Mock data was likely added during prototyping phase

---

## Conclusion

The Loom coaching platform has 7 distinct areas with mock data that need replacement. The most critical items blocking core functionality are:

1. Session creation (can't create real sessions)
2. Coach session management (can't see real sessions/clients)
3. Client coach discovery (can't book real coaches)

Implementing Phase 1 (HIGH priority items) will unlock the core booking and session management features. Phases 2 and 3 can be implemented incrementally as advanced features.

**Next Steps:**
1. Review and prioritize this audit with the team
2. Create tickets/issues for each implementation item
3. Start with Phase 1 implementation
4. Test thoroughly before deploying to production

---

**Audit Completed By:** Claude Code AI Assistant
**Review Status:** Pending human review
**Last Updated:** 2025-11-07
