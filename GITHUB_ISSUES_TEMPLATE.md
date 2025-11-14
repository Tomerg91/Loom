# GitHub Issues for Mock Data Replacement

**Created:** 2025-11-09
**Source:** Mock Data Audit Report (MOCK_DATA_AUDIT.md)
**Total Issues:** 7

## How to Create These Issues

### Option 1: Manual Creation
Copy each issue below and create it manually on GitHub

### Option 2: Using GitHub CLI (if available)
```bash
# Navigate to each issue section and run:
gh issue create --title "TITLE" --body "BODY" --label "LABELS"
```

### Recommended Labels to Create First
```bash
gh label create "priority: high" --description "High priority items blocking core functionality" --color "d73a4a"
gh label create "priority: medium" --description "Medium priority advanced features" --color "fbca04"
gh label create "priority: low" --description "Low priority enhancements" --color "0e8a16"
gh label create "mock-data" --description "Replace mock data with real data" --color "c5def5"
gh label create "api" --description "API endpoint work" --color "1d76db"
gh label create "database" --description "Database schema or query work" --color "5319e7"
gh label create "frontend" --description "Frontend component work" --color "bfdadc"
```

---

# Issue #1: Replace mock users in session creation with real API

**Title:** Replace mock users in session creation with real API

**Labels:** `priority: high`, `mock-data`, `api`, `enhancement`, `frontend`

**Body:**

## Overview
Session creation page currently uses hardcoded mock users instead of fetching real users from the database.

## Current Behavior
- **File:** `src/components/sessions/session-create-page.tsx:41-106`
- Uses 4 hardcoded mock users (2 coaches, 2 clients)
- Mock users: Sarah Johnson, Michael Chen, John Doe, Jane Smith
- Users cannot select real coaches/clients when creating sessions

## Expected Behavior
- Fetch real users from database based on role
- Allow coaches to select from real clients
- Allow clients to select from real coaches

## Implementation Details

### API Endpoint Needed
Create `GET /api/users?role={coach|client}`

**Implementation:**
- Query Supabase `profiles` table with role filter
- Apply proper authorization checks (user must be authenticated)
- Return user data: `id`, `firstName`, `lastName`, `email`, `role`, `avatar`

**Example Response:**
```json
[
  {
    "id": "uuid-123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "role": "coach",
    "avatar": "https://..."
  }
]
```

### Component Updates
Update `session-create-page.tsx`:
- Replace mock queryFn with real API call to `/api/users`
- Remove hardcoded user array (lines 41-106)
- Handle loading and error states properly
- Filter users based on current user's role

## Acceptance Criteria
- [ ] API endpoint `/api/users?role={role}` returns real users from database
- [ ] Session creation dropdown shows real coaches when client is logged in
- [ ] Session creation dropdown shows real clients when coach is logged in
- [ ] Only authenticated users can access the endpoint
- [ ] Proper error handling for failed requests
- [ ] Loading state while fetching users
- [ ] Empty state if no users available

## Priority
🔴 **HIGH** - Blocks core session creation functionality

## Estimated Effort
**4-6 hours**
- 2-3 hours: API endpoint development
- 1-2 hours: Frontend integration
- 1 hour: Testing

## Related Files
- `src/components/sessions/session-create-page.tsx` (lines 41-106)

## Dependencies
- Requires authenticated user session
- Requires `profiles` table in Supabase

## Related Issues
- Part of mock data replacement initiative
- See `MOCK_DATA_AUDIT.md` for full audit
- Blocks Issue #2 (session creation API)

---

# Issue #2: Implement real session creation API

**Title:** Implement real session creation API

**Labels:** `priority: high`, `mock-data`, `api`, `enhancement`, `database`

**Body:**

## Overview
Session creation currently uses a mock mutation that only logs to console. Sessions are not actually saved to the database.

## Current Behavior
- **File:** `src/components/sessions/session-create-page.tsx:108-118`
- Mock mutation that returns fake success response
- Sessions are not persisted to database
- No actual session records created

## Expected Behavior
- Create real session records in Supabase
- Return created session with actual ID
- Trigger notifications to participants
- Update session counts and statistics

## Implementation Details

### API Endpoint Needed
Create `POST /api/sessions`

**Request Body:**
```json
{
  "coachId": "uuid",
  "clientId": "uuid",
  "title": "string",
  "description": "string",
  "scheduledAt": "ISO 8601 datetime",
  "duration": "number (minutes)",
  "sessionType": "video|phone|in-person",
  "notes": "string (optional)"
}
```

**Response:**
```json
{
  "id": "uuid",
  "coachId": "uuid",
  "clientId": "uuid",
  "title": "string",
  "scheduledAt": "datetime",
  "duration": 60,
  "status": "scheduled",
  "sessionType": "video",
  "meetingUrl": "string (if video)",
  "createdAt": "datetime"
}
```

**Implementation Steps:**
1. Validate request body (required fields, valid UUIDs)
2. Check authorization (user must be coach or client in the session)
3. Insert into Supabase `sessions` table
4. If video session, generate meeting URL (Zoom/Meet integration)
5. Create notifications for both participants
6. Return created session data

### Component Updates
Update `session-create-page.tsx`:
- Replace mock mutationFn with real API call
- Handle success: show confirmation, redirect to session details
- Handle errors: display error message, allow retry
- Clear form after successful creation

## Database Schema
Ensure `sessions` table has columns:
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES profiles(id) NOT NULL,
  client_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL, -- minutes
  status TEXT DEFAULT 'scheduled', -- scheduled|completed|cancelled|no-show
  session_type TEXT NOT NULL, -- video|phone|in-person
  meeting_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Acceptance Criteria
- [ ] POST `/api/sessions` creates real session records
- [ ] Session appears in both coach and client session lists
- [ ] Meeting URL generated for video sessions
- [ ] Notifications sent to both participants
- [ ] Proper validation of all fields
- [ ] Authorization checks (only participants can create)
- [ ] Error handling for conflicts (double booking)
- [ ] Success redirect to session details page

## Priority
🔴 **HIGH** - Blocks core session creation functionality

## Estimated Effort
**6-8 hours**
- 3-4 hours: API endpoint with validation
- 1-2 hours: Meeting URL integration
- 1 hour: Notification triggers
- 1-2 hours: Frontend integration & testing

## Related Files
- `src/components/sessions/session-create-page.tsx` (lines 108-118)
- `src/app/api/sessions/route.ts` (may need to create)

## Dependencies
- Requires Issue #1 (user API) to be completed first
- Requires `sessions` table in Supabase
- May require video meeting service integration (Zoom/Google Meet)

## Related Issues
- Part of mock data replacement initiative
- See `MOCK_DATA_AUDIT.md` for full audit
- Depends on Issue #1

---

# Issue #3: Replace mock sessions in coach sessions page

**Title:** Replace mock sessions and clients in coach sessions page with real data

**Labels:** `priority: high`, `mock-data`, `api`, `frontend`, `enhancement`

**Body:**

## Overview
Coach sessions page displays hardcoded mock sessions and clients instead of fetching real data from the database.

## Current Behavior
- **File:** `src/app/coach/sessions/page.tsx:102-201, 268`
- Hardcoded array of 2 mock sessions
- Hardcoded array of 2 mock clients with fake statistics
- Mock revenue calculation using fixed $150 rate
- Data never updates with real session activity

## Expected Behavior
- Fetch real sessions for the logged-in coach
- Display actual client list with real statistics
- Calculate revenue from actual session pricing
- Real-time updates when sessions change

## Implementation Details

### API Endpoints Needed

#### 1. Get Coach Sessions
`GET /api/sessions?coachId={id}&status={status}&startDate={date}&endDate={date}`

**Implementation:**
- Query Supabase `sessions` table filtered by `coach_id`
- JOIN with `profiles` to get coach and client details
- Apply status filter (scheduled, completed, cancelled)
- Apply date range filters
- Order by `scheduled_at` descending

**Response:**
```json
[
  {
    "id": "uuid",
    "coach": { "id": "uuid", "firstName": "string", "lastName": "string", "avatar": "url" },
    "client": { "id": "uuid", "firstName": "string", "lastName": "string", "avatar": "url" },
    "title": "string",
    "scheduledAt": "datetime",
    "duration": 60,
    "status": "scheduled",
    "sessionType": "video",
    "meetingUrl": "url",
    "price": 150
  }
]
```

#### 2. Get Coach Clients
`GET /api/coach/clients`

**Implementation:**
- Query to find all unique clients who have sessions with this coach
- Calculate statistics per client:
  - Total sessions count
  - Completed sessions count
  - Average rating (if ratings exist)
  - Next upcoming session date
- Include client goals/notes if available

**Response:**
```json
[
  {
    "id": "uuid",
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "avatar": "url",
    "status": "active",
    "totalSessions": 10,
    "completedSessions": 8,
    "averageRating": 4.5,
    "nextSession": "datetime",
    "goals": ["goal1", "goal2"]
  }
]
```

### Component Updates
Update `coach/sessions/page.tsx`:
- Remove mock data arrays (lines 102-197)
- Replace with TanStack Query calls to real APIs
- Update revenue calculation to use real `session.price` field
- Handle loading states
- Handle error states
- Add real-time updates (optional: use Supabase subscriptions)

### Revenue Calculation Fix
Replace line 268:
```typescript
// OLD (mock):
totalRevenue: sessions.filter(s => s.status === 'completed').length * 150

// NEW (real):
totalRevenue: sessions
  .filter(s => s.status === 'completed')
  .reduce((sum, session) => sum + (session.price || 0), 0)
```

## Acceptance Criteria
- [ ] Coach sessions page displays real sessions from database
- [ ] Sessions can be filtered by status and date
- [ ] Client list shows real clients with accurate statistics
- [ ] Revenue calculation uses actual session prices
- [ ] Loading states while fetching data
- [ ] Error handling for failed requests
- [ ] Empty states when no sessions/clients exist
- [ ] Data updates when sessions are created/modified

## Priority
🔴 **HIGH** - Blocks coach dashboard functionality

## Estimated Effort
**8-10 hours**
- 4-5 hours: Two API endpoints with complex queries
- 2-3 hours: Frontend integration
- 1-2 hours: Statistics calculations
- 1-2 hours: Testing & error handling

## Related Files
- `src/app/coach/sessions/page.tsx` (lines 102-201, 268)
- `src/app/api/sessions/route.ts` (may already exist, needs enhancement)
- `src/app/api/coach/clients/route.ts` (needs to be created)

## Database Considerations
- Ensure `sessions` table has `price` column
- May need index on `coach_id` for performance
- Consider caching for statistics calculations

## Related Issues
- Part of mock data replacement initiative
- See `MOCK_DATA_AUDIT.md` for full audit

---

# Issue #4: Replace mock coaches in client coach discovery page

**Title:** Replace mock coach profiles in coach discovery page with real data

**Labels:** `priority: high`, `mock-data`, `api`, `frontend`, `enhancement`

**Body:**

## Overview
Client coach discovery page displays 3 hardcoded mock coach profiles instead of fetching real coaches from the database.

## Current Behavior
- **File:** `src/components/client/coaches-page.tsx:68-153`
- Hardcoded array of 3 fake coaches (Sarah Johnson, Michael Chen, Emily Rodriguez)
- Mock specialties, ratings, hourly rates, availability
- Search and filters don't work on real data
- Clients cannot discover or book real coaches

## Expected Behavior
- Display all real coaches from database
- Allow search by name, specialty, location
- Filter by specialty, rating, price range
- Show real availability and booking options
- Enable clients to view real coach profiles

## Implementation Details

### API Endpoint Needed
Create `GET /api/coaches?search={term}&specialty={filter}&minRating={rating}&maxPrice={price}&location={location}`

**Implementation:**
- Query Supabase `profiles` table WHERE `role = 'coach'`
- JOIN with coach profile/details table if separate
- Apply search filter on firstName, lastName, title, bio
- Filter by specialties (array contains)
- Filter by rating (average from reviews)
- Filter by hourlyRate range
- Filter by location
- Include: profile data, ratings, review count, availability
- Order by rating DESC or hourly rate ASC based on sort param

**Response:**
```json
[
  {
    "id": "uuid",
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "avatar": "url",
    "title": "string",
    "bio": "text",
    "specialties": ["Leadership", "Career Coaching"],
    "experience": 8,
    "rating": 4.9,
    "reviewCount": 127,
    "hourlyRate": 150,
    "location": "New York, NY",
    "languages": ["English", "Spanish"],
    "availability": {
      "monday": ["09:00-17:00"],
      "tuesday": ["09:00-17:00"]
    },
    "credentials": ["ICF PCC", "MBA"],
    "approach": "Solution-focused coaching...",
    "successStories": 89
  }
]
```

### Database Schema
Ensure coach profiles have all required fields:

```sql
-- Add to profiles table or create separate coach_profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialties TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hourly_rate INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credentials TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approach TEXT;

-- For ratings, may need separate reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES profiles(id),
  client_id UUID REFERENCES profiles(id),
  session_id UUID REFERENCES sessions(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Component Updates
Update `coaches-page.tsx`:
- Replace mock queryFn (lines 68-153) with real API call
- Update query key to include all filter params
- Handle loading state while fetching
- Handle error state for failed requests
- Handle empty state when no coaches match filters
- Ensure filters trigger new API calls

## Acceptance Criteria
- [ ] Coach discovery page displays all real coaches from database
- [ ] Search works on name, title, bio fields
- [ ] Specialty filter works correctly
- [ ] Rating filter shows only coaches meeting minimum rating
- [ ] Price filter shows coaches within price range
- [ ] Location filter works (if implemented)
- [ ] Real ratings and review counts displayed
- [ ] Proper loading and error states
- [ ] Empty state when no coaches match filters
- [ ] Clicking coach opens real profile/booking flow

## Priority
🔴 **HIGH** - Blocks client ability to discover and book coaches

## Estimated Effort
**10-12 hours**
- 2-3 hours: Database schema updates for coach profiles
- 4-5 hours: API endpoint with complex filtering
- 2-3 hours: Frontend integration
- 1-2 hours: Ratings/reviews calculation
- 1-2 hours: Testing

## Related Files
- `src/components/client/coaches-page.tsx` (lines 68-153)
- `src/app/api/coaches/route.ts` (needs to be created)

## Database Dependencies
- `profiles` table needs coach-specific fields
- May need separate `coach_profiles` table
- `reviews` table for ratings

## Related Issues
- Part of mock data replacement initiative
- See `MOCK_DATA_AUDIT.md` for full audit

---

# Issue #5: Implement real virtual folders system

**Title:** Implement real virtual folders system for file management

**Labels:** `priority: medium`, `mock-data`, `api`, `database`, `enhancement`

**Body:**

## Overview
File management page uses hardcoded virtual folders (Recent Uploads, Shared Files, Large Files) instead of user-created smart folders.

## Current Behavior
- **File:** `src/components/files/file-management-page.tsx:155-209`
- 3 hardcoded virtual folders with predefined rules
- Folders are the same for all users
- Users cannot create custom virtual folders
- File counts are calculated client-side

## Expected Behavior
- Users can create custom virtual folders with custom rules
- System provides default smart folders (Recent, Shared, etc.)
- Folders are user-specific
- File counts calculated server-side for performance
- Folders can be edited and deleted

## Implementation Details

### Database Schema
Create `virtual_folders` table:

```sql
CREATE TABLE virtual_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'blue',
  icon TEXT DEFAULT 'folder',
  rules JSONB NOT NULL, -- { dateRange: {...}, sharedWith: true, minSize: 10485760, tags: [...] }
  file_count INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT FALSE, -- true for default folders
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_virtual_folders_user_id ON virtual_folders(user_id);

-- Insert default system folders for all users
INSERT INTO virtual_folders (user_id, name, description, color, icon, rules, is_system)
SELECT
  id as user_id,
  'Recent Uploads',
  'Files uploaded in the last 7 days',
  'blue',
  'clock',
  '{"dateRange": {"start": "7_days_ago"}}',
  true
FROM profiles;
```

### API Endpoints Needed

#### 1. Get Virtual Folders
`GET /api/folders/virtual`

**Implementation:**
- Fetch folders for current user
- Include system folders + user-created folders
- Calculate file_count dynamically based on rules
- Order by is_system DESC, created_at DESC

#### 2. Create Virtual Folder
`POST /api/folders/virtual`

**Request:**
```json
{
  "name": "Important Docs",
  "description": "My important documents",
  "color": "red",
  "icon": "star",
  "rules": {
    "tags": ["important"],
    "fileType": ["pdf", "docx"]
  }
}
```

#### 3. Update Virtual Folder
`PUT /api/folders/virtual/{id}`

**Request:** Same as create

#### 4. Delete Virtual Folder
`DELETE /api/folders/virtual/{id}`

**Implementation:**
- Only allow deleting user-created folders (is_system = false)
- Return error if trying to delete system folder

### Component Updates
Update `file-management-page.tsx`:
- Remove mock data (lines 155-209)
- Replace with API call to `/api/folders/virtual`
- Add UI for creating new folders
- Add edit/delete actions for user folders
- Prevent editing system folders

### File Filtering
When clicking a virtual folder:
- Query files table with folder rules applied
- Support rule types:
  - `dateRange`: { start, end }
  - `sharedWith`: boolean
  - `minSize`/`maxSize`: bytes
  - `fileType`: array of extensions
  - `tags`: array of tag names
  - `owner`: userId

## Acceptance Criteria
- [ ] Users see default system folders (Recent, Shared, Large Files)
- [ ] Users can create custom virtual folders
- [ ] Custom folders can be edited and deleted
- [ ] System folders cannot be deleted
- [ ] File counts are accurate for all folder rules
- [ ] Clicking folder shows filtered files
- [ ] Folders persist across sessions
- [ ] Proper authorization (users only see their own folders)

## Priority
🟡 **MEDIUM** - Advanced file management feature

## Estimated Effort
**8-10 hours**
- 2 hours: Database schema and migrations
- 3-4 hours: CRUD API endpoints
- 2-3 hours: Frontend integration
- 1-2 hours: File filtering logic
- 1 hour: Testing

## Related Files
- `src/components/files/file-management-page.tsx` (lines 155-209)
- `src/app/api/folders/virtual/route.ts` (needs to be created)

## Related Issues
- Part of mock data replacement initiative
- See `MOCK_DATA_AUDIT.md` for full audit

---

# Issue #6: Fix system health monitoring to use real metrics

**Title:** Replace mock system health data with real monitoring metrics

**Labels:** `priority: medium`, `mock-data`, `api`, `enhancement`

**Body:**

## Overview
Admin system health dashboard uses mock/placeholder data instead of real system metrics.

## Current Behavior

### Component Issue
- **File:** `src/components/admin/system-health-display.tsx:59-91`
- Uses `generateMockHealthData()` as fallback
- Shows fake metrics: connections, uptime, CPU, memory, cache

### API Issues
- **File:** `src/app/api/admin/system-health/route.ts:100, 190-196`
- **Line 100:** Random database connection count: `Math.floor(Math.random() * 20) + 5`
- **Lines 190-196:** Simulated cache stats with random values

## Expected Behavior
- Display real database connection pool statistics
- Show actual server uptime and resource usage
- Display real cache metrics (if cache exists)
- Remove mock data fallback except for actual errors

## Implementation Details

### Component Updates
Update `system-health-display.tsx`:
- Remove `generateMockHealthData()` function (lines 59-91)
- Only use fallback during actual API errors
- Show loading state while fetching
- Display error message if API fails
- Rely entirely on API for health data

### API Improvements
Update `system-health/route.ts`:

#### 1. Real Database Connections
Replace line 100:
```typescript
// OLD:
const connections = Math.floor(Math.random() * 20) + 5;

// NEW: Query actual connection stats
const { data: connectionStats } = await supabase
  .rpc('get_connection_stats'); // Create PostgreSQL function

// Or use pg_stat_activity:
SELECT count(*) as current_connections,
       setting::int as max_connections
FROM pg_stat_activity
CROSS JOIN pg_settings
WHERE pg_settings.name = 'max_connections';
```

#### 2. Real Cache Metrics
Replace lines 190-196:

**Option A - If Redis/cache exists:**
```typescript
async function getRealCacheStats() {
  const redis = getRedisClient();
  const info = await redis.info('stats');
  // Parse hit rate, memory usage from Redis INFO
  return {
    hitRate: calculateHitRate(info),
    memoryUsed: getMemoryUsed(info)
  };
}
```

**Option B - If no cache exists:**
Remove cache section entirely from health check

#### 3. Real Server Metrics
Add actual server monitoring:
```typescript
import os from 'os';

const serverHealth = {
  uptime: process.uptime() * 1000, // Real Node.js uptime
  memoryUsage: (process.memoryUsage().heapUsed / 1024 / 1024), // Real MB used
  cpuUsage: os.loadavg()[0] / os.cpus().length * 100 // Real CPU %
};
```

## Database Function (if needed)
Create PostgreSQL function for connection stats:

```sql
CREATE OR REPLACE FUNCTION get_connection_stats()
RETURNS TABLE(current_connections bigint, max_connections int) AS $$
BEGIN
  RETURN QUERY
  SELECT
    count(*)::bigint as current_connections,
    setting::int as max_connections
  FROM pg_stat_activity
  CROSS JOIN pg_settings
  WHERE pg_settings.name = 'max_connections';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Acceptance Criteria
- [ ] Database connection count shows real active connections
- [ ] Server uptime shows actual Node.js process uptime
- [ ] Memory usage shows real heap usage
- [ ] CPU usage shows real system load
- [ ] Cache section removed OR shows real Redis metrics
- [ ] Mock data generator removed from component
- [ ] Proper error handling when metrics unavailable
- [ ] Admin-only access enforced

## Priority
🟡 **MEDIUM** - Admin monitoring feature

## Estimated Effort
**4-6 hours**
- 2-3 hours: API improvements for real metrics
- 1-2 hours: Database function for connection stats
- 1 hour: Component cleanup
- 1 hour: Testing

## Related Files
- `src/components/admin/system-health-display.tsx` (lines 59-91)
- `src/app/api/admin/system-health/route.ts` (lines 100, 190-196)

## Security Considerations
- Ensure endpoint is admin-only
- Don't expose sensitive system information
- Rate limit health check endpoint

## Related Issues
- Part of mock data replacement initiative
- See `MOCK_DATA_AUDIT.md` for full audit

---

# Issue #7: Replace chart placeholders with real visualizations

**Title:** Implement real chart components with data visualization

**Labels:** `priority: low`, `mock-data`, `frontend`, `enhancement`, `ui`

**Body:**

## Overview
Dashboard charts currently show placeholder messages instead of real data visualizations.

## Current Behavior
- **File:** `src/components/dashboard/charts/chart-placeholder.tsx:1-39`
- Entire component is just a placeholder UI
- Shows message: "Chart visualization would go here"
- No actual data visualization
- Used across multiple dashboards

## Expected Behavior
- Display real charts with actual data
- Show trends, analytics, and insights
- Interactive charts with hover states
- Responsive design for different screen sizes

## Implementation Details

### Chart Library Selection
**Recommended:** Recharts (React-friendly, responsive, MIT license)

```bash
npm install recharts
```

**Alternatives:**
- Chart.js with react-chartjs-2
- Victory Charts
- Nivo

### Chart Components to Create

#### 1. Session Trends Chart
**File:** `src/components/dashboard/charts/session-trends-chart.tsx`

**Purpose:** Show session volume over time

**Data:** Fetch from `/api/stats/session-trends?days=30`

**Chart Type:** Line or Area chart

**Example:**
```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function SessionTrendsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="sessions" stroke="#8884d8" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

#### 2. Revenue Chart
**File:** `src/components/dashboard/charts/revenue-chart.tsx`

**Purpose:** Show revenue over time

**Data:** Fetch from `/api/stats/revenue?period=month`

**Chart Type:** Bar or Area chart

#### 3. Client Activity Chart
**File:** `src/components/dashboard/charts/activity-chart.tsx`

**Purpose:** Show client engagement metrics

**Data:** Fetch from `/api/stats/activity`

**Chart Type:** Pie or Donut chart for session types

#### 4. Booking Rate Chart
**File:** `src/components/dashboard/charts/booking-rate-chart.tsx`

**Purpose:** Show booking patterns by day/hour

**Data:** Fetch from `/api/stats/booking-patterns`

**Chart Type:** Heatmap or Bar chart

### API Endpoints Needed

#### Session Trends
`GET /api/stats/session-trends?days={30}`

**Response:**
```json
[
  { "date": "2024-01-01", "sessions": 12 },
  { "date": "2024-01-02", "sessions": 15 }
]
```

#### Revenue Data
`GET /api/stats/revenue?period={month|quarter|year}`

**Response:**
```json
{
  "period": "month",
  "data": [
    { "date": "2024-01", "revenue": 4500 },
    { "date": "2024-02", "revenue": 5200 }
  ]
}
```

### Component Replacement
Find all usages of `ChartPlaceholder` and replace:

```bash
# Search for usage
grep -r "ChartPlaceholder" src/
```

Replace with appropriate real chart component:
- Coach dashboard → SessionTrendsChart, RevenueChart
- Client dashboard → ActivityChart, ProgressChart
- Admin dashboard → SystemMetricsChart

## Acceptance Criteria
- [ ] Recharts (or chosen library) installed
- [ ] All chart components created and working
- [ ] API endpoints provide real data for charts
- [ ] ChartPlaceholder no longer used in any dashboard
- [ ] Charts are responsive on mobile/tablet/desktop
- [ ] Charts show loading state while fetching data
- [ ] Charts show empty state when no data available
- [ ] Charts update when data changes
- [ ] Accessible (keyboard navigation, ARIA labels)

## Priority
⚪ **LOW** - UI enhancement, not blocking functionality

## Estimated Effort
**12-15 hours**
- 2 hours: Library setup and configuration
- 6-8 hours: Creating 4-5 chart components
- 2-3 hours: API endpoints for chart data
- 2-3 hours: Integration and testing
- 1 hour: Accessibility improvements

## Related Files
- `src/components/dashboard/charts/chart-placeholder.tsx` (entire file)
- All dashboard components using ChartPlaceholder

## Dependencies
- Requires real data from sessions, revenue, activity
- May depend on Issues #2, #3 being completed first

## Design Considerations
- Match existing design system colors
- Ensure charts are print-friendly
- Consider dark mode support
- Add export/download chart data feature

## Related Issues
- Part of mock data replacement initiative
- See `MOCK_DATA_AUDIT.md` for full audit

---

# Summary

## Issues Created: 7

### High Priority (3)
1. Replace mock users in session creation with real API
2. Implement real session creation API
3. Replace mock sessions and clients in coach sessions page
4. Replace mock coaches in client coach discovery page

### Medium Priority (2)
5. Implement real virtual folders system
6. Fix system health monitoring to use real metrics

### Low Priority (1)
7. Replace chart placeholders with real visualizations

## Total Estimated Effort
**52-63 hours** across all issues

## Recommended Implementation Order
1. Issue #1 (Session users API) → 4-6 hours
2. Issue #2 (Session creation API) → 6-8 hours
3. Issue #3 (Coach sessions page) → 8-10 hours
4. Issue #4 (Coach discovery) → 10-12 hours
5. Issue #5 (Virtual folders) → 8-10 hours
6. Issue #6 (System health) → 4-6 hours
7. Issue #7 (Charts) → 12-15 hours

## Next Steps
1. Create these issues on GitHub
2. Assign to appropriate team members
3. Add to project board/sprint
4. Start with High Priority issues
5. Test each issue thoroughly before moving to next

---

**Generated by:** Claude Code AI Assistant
**Date:** 2025-11-09
**Source:** MOCK_DATA_AUDIT.md
