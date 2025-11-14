#!/bin/bash

# Script to create GitHub issues for mock data replacement
# Generated from MOCK_DATA_AUDIT.md
# Usage: ./scripts/create-github-issues.sh

set -e

echo "🚀 Creating GitHub labels..."

# Create labels (will skip if already exist)
gh label create "priority: high" --description "High priority items blocking core functionality" --color "d73a4a" 2>/dev/null || echo "✓ priority: high label already exists"
gh label create "priority: medium" --description "Medium priority advanced features" --color "fbca04" 2>/dev/null || echo "✓ priority: medium label already exists"
gh label create "priority: low" --description "Low priority enhancements" --color "0e8a16" 2>/dev/null || echo "✓ priority: low label already exists"
gh label create "mock-data" --description "Replace mock data with real data" --color "c5def5" 2>/dev/null || echo "✓ mock-data label already exists"
gh label create "api" --description "API endpoint work" --color "1d76db" 2>/dev/null || echo "✓ api label already exists"
gh label create "database" --description "Database schema or query work" --color "5319e7" 2>/dev/null || echo "✓ database label already exists"
gh label create "frontend" --description "Frontend component work" --color "bfdadc" 2>/dev/null || echo "✓ frontend label already exists"

echo ""
echo "📝 Creating GitHub issues..."
echo ""

# Issue #1: Session Creation Users API
echo "Creating Issue #1: Replace mock users in session creation..."
gh issue create \
  --title "Replace mock users in session creation with real API" \
  --label "priority: high,mock-data,api,enhancement,frontend" \
  --body "## Overview
Session creation page currently uses hardcoded mock users instead of fetching real users from the database.

## Current Behavior
- **File:** \`src/components/sessions/session-create-page.tsx:41-106\`
- Uses 4 hardcoded mock users (2 coaches, 2 clients)
- Mock users: Sarah Johnson, Michael Chen, John Doe, Jane Smith
- Users cannot select real coaches/clients when creating sessions

## Expected Behavior
- Fetch real users from database based on role
- Allow coaches to select from real clients
- Allow clients to select from real coaches

## Implementation Details

### API Endpoint Needed
Create \`GET /api/users?role={coach|client}\`

**Implementation:**
- Query Supabase \`profiles\` table with role filter
- Apply proper authorization checks (user must be authenticated)
- Return user data: \`id\`, \`firstName\`, \`lastName\`, \`email\`, \`role\`, \`avatar\`

### Component Updates
Update \`session-create-page.tsx\`:
- Replace mock queryFn with real API call to \`/api/users\`
- Remove hardcoded user array (lines 41-106)
- Handle loading and error states properly

## Acceptance Criteria
- [ ] API endpoint \`/api/users?role={role}\` returns real users from database
- [ ] Session creation dropdown shows real coaches/clients
- [ ] Only authenticated users can access the endpoint
- [ ] Proper error handling for failed requests
- [ ] Loading state while fetching users
- [ ] Empty state if no users available

## Priority
🔴 **HIGH** - Blocks core session creation functionality

## Estimated Effort
**4-6 hours**

## Related Files
- \`src/components/sessions/session-create-page.tsx\` (lines 41-106)

## Related Issues
Part of mock data replacement initiative. See \`MOCK_DATA_AUDIT.md\` for full audit."

echo "✓ Issue #1 created"
echo ""

# Issue #2: Session Creation API
echo "Creating Issue #2: Implement real session creation API..."
gh issue create \
  --title "Implement real session creation API" \
  --label "priority: high,mock-data,api,enhancement,database" \
  --body "## Overview
Session creation currently uses a mock mutation that only logs to console. Sessions are not actually saved to the database.

## Current Behavior
- **File:** \`src/components/sessions/session-create-page.tsx:108-118\`
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
Create \`POST /api/sessions\`

**Request Body:**
\`\`\`json
{
  \"coachId\": \"uuid\",
  \"clientId\": \"uuid\",
  \"title\": \"string\",
  \"description\": \"string\",
  \"scheduledAt\": \"ISO 8601 datetime\",
  \"duration\": \"number (minutes)\",
  \"sessionType\": \"video|phone|in-person\"
}
\`\`\`

**Implementation Steps:**
1. Validate request body (required fields, valid UUIDs)
2. Check authorization (user must be coach or client in the session)
3. Insert into Supabase \`sessions\` table
4. If video session, generate meeting URL (Zoom/Meet integration)
5. Create notifications for both participants
6. Return created session data

### Component Updates
Update \`session-create-page.tsx\`:
- Replace mock mutationFn with real API call
- Handle success: show confirmation, redirect to session details
- Handle errors: display error message, allow retry

## Acceptance Criteria
- [ ] POST \`/api/sessions\` creates real session records
- [ ] Session appears in both coach and client session lists
- [ ] Meeting URL generated for video sessions
- [ ] Notifications sent to both participants
- [ ] Proper validation of all fields
- [ ] Authorization checks (only participants can create)
- [ ] Error handling for conflicts (double booking)

## Priority
🔴 **HIGH** - Blocks core session creation functionality

## Estimated Effort
**6-8 hours**

## Related Files
- \`src/components/sessions/session-create-page.tsx\` (lines 108-118)

## Dependencies
- Requires Issue #1 (user API) to be completed first

## Related Issues
Part of mock data replacement initiative. See \`MOCK_DATA_AUDIT.md\` for full audit."

echo "✓ Issue #2 created"
echo ""

# Issue #3: Coach Sessions Page
echo "Creating Issue #3: Replace mock sessions in coach sessions page..."
gh issue create \
  --title "Replace mock sessions and clients in coach sessions page with real data" \
  --label "priority: high,mock-data,api,frontend,enhancement" \
  --body "## Overview
Coach sessions page displays hardcoded mock sessions and clients instead of fetching real data from the database.

## Current Behavior
- **File:** \`src/app/coach/sessions/page.tsx:102-201, 268\`
- Hardcoded array of 2 mock sessions
- Hardcoded array of 2 mock clients with fake statistics
- Mock revenue calculation using fixed \$150 rate

## Expected Behavior
- Fetch real sessions for the logged-in coach
- Display actual client list with real statistics
- Calculate revenue from actual session pricing
- Real-time updates when sessions change

## Implementation Details

### API Endpoints Needed

#### 1. Get Coach Sessions
\`GET /api/sessions?coachId={id}&status={status}\`

**Implementation:**
- Query Supabase \`sessions\` table filtered by \`coach_id\`
- JOIN with \`profiles\` to get coach and client details
- Apply status and date range filters

#### 2. Get Coach Clients
\`GET /api/coach/clients\`

**Implementation:**
- Find all unique clients who have sessions with this coach
- Calculate statistics: total sessions, completed sessions, ratings
- Include next upcoming session date

### Revenue Calculation Fix
Replace line 268:
\`\`\`typescript
// OLD: totalRevenue: sessions.filter(s => s.status === 'completed').length * 150
// NEW:
totalRevenue: sessions
  .filter(s => s.status === 'completed')
  .reduce((sum, session) => sum + (session.price || 0), 0)
\`\`\`

## Acceptance Criteria
- [ ] Coach sessions page displays real sessions from database
- [ ] Sessions can be filtered by status and date
- [ ] Client list shows real clients with accurate statistics
- [ ] Revenue calculation uses actual session prices
- [ ] Loading and error states handled properly
- [ ] Empty states when no sessions/clients exist

## Priority
🔴 **HIGH** - Blocks coach dashboard functionality

## Estimated Effort
**8-10 hours**

## Related Files
- \`src/app/coach/sessions/page.tsx\` (lines 102-201, 268)

## Related Issues
Part of mock data replacement initiative. See \`MOCK_DATA_AUDIT.md\` for full audit."

echo "✓ Issue #3 created"
echo ""

# Issue #4: Client Coach Discovery
echo "Creating Issue #4: Replace mock coaches in coach discovery page..."
gh issue create \
  --title "Replace mock coach profiles in coach discovery page with real data" \
  --label "priority: high,mock-data,api,frontend,enhancement" \
  --body "## Overview
Client coach discovery page displays 3 hardcoded mock coach profiles instead of fetching real coaches from the database.

## Current Behavior
- **File:** \`src/components/client/coaches-page.tsx:68-153\`
- Hardcoded array of 3 fake coaches
- Mock specialties, ratings, hourly rates, availability
- Search and filters don't work on real data

## Expected Behavior
- Display all real coaches from database
- Allow search by name, specialty, location
- Filter by specialty, rating, price range
- Show real availability and booking options

## Implementation Details

### API Endpoint Needed
Create \`GET /api/coaches?search={term}&specialty={filter}&minRating={rating}&maxPrice={price}\`

**Implementation:**
- Query Supabase \`profiles\` table WHERE \`role = 'coach'\`
- Apply search filter on firstName, lastName, title, bio
- Filter by specialties, rating, hourlyRate
- Include: profile data, ratings, review count, availability

### Database Schema
Ensure coach profiles have required fields:
- title, bio, specialties[], experience, hourly_rate
- location, languages[], availability (JSONB)
- credentials[], approach

May need separate \`reviews\` table for ratings.

## Acceptance Criteria
- [ ] Coach discovery page displays all real coaches
- [ ] Search works on name, title, bio fields
- [ ] Specialty, rating, and price filters work correctly
- [ ] Real ratings and review counts displayed
- [ ] Proper loading, error, and empty states
- [ ] Clicking coach opens real profile/booking flow

## Priority
🔴 **HIGH** - Blocks client ability to discover and book coaches

## Estimated Effort
**10-12 hours**

## Related Files
- \`src/components/client/coaches-page.tsx\` (lines 68-153)

## Related Issues
Part of mock data replacement initiative. See \`MOCK_DATA_AUDIT.md\` for full audit."

echo "✓ Issue #4 created"
echo ""

# Issue #5: Virtual Folders
echo "Creating Issue #5: Implement real virtual folders system..."
gh issue create \
  --title "Implement real virtual folders system for file management" \
  --label "priority: medium,mock-data,api,database,enhancement" \
  --body "## Overview
File management page uses hardcoded virtual folders instead of user-created smart folders.

## Current Behavior
- **File:** \`src/components/files/file-management-page.tsx:155-209\`
- 3 hardcoded virtual folders (Recent, Shared, Large Files)
- Folders are the same for all users
- Users cannot create custom virtual folders

## Expected Behavior
- Users can create custom virtual folders with custom rules
- System provides default smart folders
- Folders are user-specific
- File counts calculated server-side

## Implementation Details

### Database Schema
Create \`virtual_folders\` table:
\`\`\`sql
CREATE TABLE virtual_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'blue',
  icon TEXT DEFAULT 'folder',
  rules JSONB NOT NULL,
  file_count INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
\`\`\`

### API Endpoints Needed
- \`GET /api/folders/virtual\` - Get user's folders
- \`POST /api/folders/virtual\` - Create folder
- \`PUT /api/folders/virtual/{id}\` - Update folder
- \`DELETE /api/folders/virtual/{id}\` - Delete folder

## Acceptance Criteria
- [ ] Users see default system folders
- [ ] Users can create custom virtual folders
- [ ] Custom folders can be edited and deleted
- [ ] System folders cannot be deleted
- [ ] File counts are accurate
- [ ] Clicking folder shows filtered files

## Priority
🟡 **MEDIUM** - Advanced file management feature

## Estimated Effort
**8-10 hours**

## Related Files
- \`src/components/files/file-management-page.tsx\` (lines 155-209)

## Related Issues
Part of mock data replacement initiative. See \`MOCK_DATA_AUDIT.md\` for full audit."

echo "✓ Issue #5 created"
echo ""

# Issue #6: System Health
echo "Creating Issue #6: Fix system health monitoring..."
gh issue create \
  --title "Replace mock system health data with real monitoring metrics" \
  --label "priority: medium,mock-data,api,enhancement" \
  --body "## Overview
Admin system health dashboard uses mock/placeholder data instead of real system metrics.

## Current Behavior

### Component Issue
- **File:** \`src/components/admin/system-health-display.tsx:59-91\`
- Uses \`generateMockHealthData()\` as fallback
- Shows fake metrics

### API Issues
- **File:** \`src/app/api/admin/system-health/route.ts:100, 190-196\`
- **Line 100:** Random database connection count
- **Lines 190-196:** Simulated cache stats

## Expected Behavior
- Display real database connection pool statistics
- Show actual server uptime and resource usage
- Display real cache metrics (if cache exists)
- Remove mock data fallback

## Implementation Details

### Component Updates
- Remove \`generateMockHealthData()\` function
- Only use fallback during actual API errors
- Show loading state while fetching

### API Improvements

#### Real Database Connections
\`\`\`typescript
// Query actual connection stats from pg_stat_activity
SELECT count(*) as current_connections,
       setting::int as max_connections
FROM pg_stat_activity
CROSS JOIN pg_settings
WHERE pg_settings.name = 'max_connections';
\`\`\`

#### Real Server Metrics
\`\`\`typescript
import os from 'os';

const serverHealth = {
  uptime: process.uptime() * 1000,
  memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
  cpuUsage: os.loadavg()[0] / os.cpus().length * 100
};
\`\`\`

## Acceptance Criteria
- [ ] Database connection count shows real connections
- [ ] Server uptime shows actual process uptime
- [ ] Memory and CPU usage show real metrics
- [ ] Cache section removed OR shows real Redis metrics
- [ ] Mock data generator removed
- [ ] Admin-only access enforced

## Priority
🟡 **MEDIUM** - Admin monitoring feature

## Estimated Effort
**4-6 hours**

## Related Files
- \`src/components/admin/system-health-display.tsx\` (lines 59-91)
- \`src/app/api/admin/system-health/route.ts\` (lines 100, 190-196)

## Related Issues
Part of mock data replacement initiative. See \`MOCK_DATA_AUDIT.md\` for full audit."

echo "✓ Issue #6 created"
echo ""

# Issue #7: Charts
echo "Creating Issue #7: Replace chart placeholders..."
gh issue create \
  --title "Implement real chart components with data visualization" \
  --label "priority: low,mock-data,frontend,enhancement,ui" \
  --body "## Overview
Dashboard charts currently show placeholder messages instead of real data visualizations.

## Current Behavior
- **File:** \`src/components/dashboard/charts/chart-placeholder.tsx:1-39\`
- Entire component is just a placeholder UI
- Shows message: \"Chart visualization would go here\"
- No actual data visualization

## Expected Behavior
- Display real charts with actual data
- Show trends, analytics, and insights
- Interactive charts with hover states
- Responsive design

## Implementation Details

### Chart Library
**Recommended:** Recharts

\`\`\`bash
npm install recharts
\`\`\`

### Chart Components to Create
1. **SessionTrendsChart** - Line/Area chart for session volume
2. **RevenueChart** - Bar/Area chart for revenue over time
3. **ActivityChart** - Pie/Donut chart for session types
4. **BookingRateChart** - Heatmap for booking patterns

### API Endpoints Needed
- \`GET /api/stats/session-trends?days=30\`
- \`GET /api/stats/revenue?period=month\`
- \`GET /api/stats/activity\`
- \`GET /api/stats/booking-patterns\`

## Acceptance Criteria
- [ ] Recharts installed and configured
- [ ] All chart components created and working
- [ ] API endpoints provide real data
- [ ] ChartPlaceholder no longer used
- [ ] Charts are responsive
- [ ] Charts show loading and empty states
- [ ] Accessible (keyboard navigation, ARIA labels)

## Priority
⚪ **LOW** - UI enhancement, not blocking functionality

## Estimated Effort
**12-15 hours**

## Related Files
- \`src/components/dashboard/charts/chart-placeholder.tsx\` (entire file)

## Dependencies
- May depend on Issues #2, #3 being completed first

## Related Issues
Part of mock data replacement initiative. See \`MOCK_DATA_AUDIT.md\` for full audit."

echo "✓ Issue #7 created"
echo ""

echo "✅ Successfully created 7 GitHub issues!"
echo ""
echo "📊 Summary:"
echo "  - 4 HIGH priority issues"
echo "  - 2 MEDIUM priority issues"
echo "  - 1 LOW priority issue"
echo ""
echo "🔗 View all issues: gh issue list --label mock-data"
