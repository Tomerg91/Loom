#!/bin/bash

# Script to create GitHub issues from Technical Audit Report
# Prerequisites: GitHub CLI (gh) must be installed and authenticated
# Run: chmod +x scripts/create-audit-issues.sh && ./scripts/create-audit-issues.sh

set -e

echo "🏷️  Creating GitHub labels..."

# Create labels
gh label create "priority: critical" --description "Critical issues requiring immediate attention" --color "d73a4a" --force 2>/dev/null || true
gh label create "priority: high" --description "High priority issues for next sprint" --color "ff6b6b" --force 2>/dev/null || true
gh label create "priority: medium" --description "Medium priority technical debt" --color "fbca04" --force 2>/dev/null || true
gh label create "priority: low" --description "Low priority code quality improvements" --color "0e8a16" --force 2>/dev/null || true

gh label create "type: bug" --description "Bug or error in code" --color "d73a4a" --force 2>/dev/null || true
gh label create "type: security" --description "Security vulnerability or concern" --color "b60205" --force 2>/dev/null || true
gh label create "type: performance" --description "Performance optimization" --color "1d76db" --force 2>/dev/null || true
gh label create "type: tech-debt" --description "Technical debt and code quality" --color "fbca04" --force 2>/dev/null || true
gh label create "type: enhancement" --description "Feature enhancement or improvement" --color "a2eeef" --force 2>/dev/null || true

gh label create "area: database" --description "Database and schema related" --color "bfd4f2" --force 2>/dev/null || true
gh label create "area: api" --description "API and backend routes" --color "c5def5" --force 2>/dev/null || true
gh label create "area: ui" --description "User interface and components" --color "d4c5f9" --force 2>/dev/null || true
gh label create "area: auth" --description "Authentication and authorization" --color "f9c5d4" --force 2>/dev/null || true
gh label create "area: testing" --description "Testing and test coverage" --color "c2e0c6" --force 2>/dev/null || true

gh label create "effort: small" --description "< 4 hours" --color "e4e669" --force 2>/dev/null || true
gh label create "effort: medium" --description "4-16 hours" --color "fef2c0" --force 2>/dev/null || true
gh label create "effort: large" --description "> 16 hours" --color "f7c6c7" --force 2>/dev/null || true

echo "✅ Labels created successfully"
echo ""
echo "🚨 Creating CRITICAL priority issues..."

# CRITICAL ISSUE 1: Missing Database Schema Types
gh issue create \
  --title "🚨 [CRITICAL] Generate proper database schema types from Supabase" \
  --body "## Problem
The database schema types file is using placeholder types, defeating TypeScript's type safety:

\`\`\`typescript
// src/lib/database/schema.types.ts
export interface Database {
  public: {
    Tables: {
      tasks: { Row: Record<string, unknown> }
      // All tables use Record<string, unknown>
    }
  }
}
\`\`\`

## Impact
- ❌ No type checking on database queries
- ❌ Runtime errors from typos won't be caught
- ❌ No autocomplete for database fields
- ❌ Potential SQL injection vulnerabilities hidden
- ❌ Data integrity issues

## Fix Required
1. Generate proper types from Supabase schema:
   \`\`\`bash
   npx supabase gen types typescript --project-id <project-id> > src/lib/database/schema.types.ts
   \`\`\`
2. Update all imports to use the generated types
3. Fix any type errors that surface
4. Add CI check to ensure types stay in sync with schema

## Files Affected
- \`src/lib/database/schema.types.ts\`
- All database query files (100+ files)

## Estimated Effort
4-6 hours

## References
- Technical Issues Report: TECHNICAL_ISSUES_REPORT.md (Section 1.1)
- Supabase CLI Docs: https://supabase.com/docs/guides/cli" \
  --label "priority: critical" \
  --label "type: bug" \
  --label "area: database" \
  --label "effort: medium"

# CRITICAL ISSUE 2: Console Statements in Production
gh issue create \
  --title "🚨 [CRITICAL] Remove 273 console statements exposing PII" \
  --body "## Problem
Found **273 console statements** throughout production code, including in API routes that expose sensitive user data:

\`\`\`typescript
// src/app/api/sessions/book/route.ts:69
console.warn('Invalid session booking attempt:', {
  userId: user.id,              // PII
  ip: request.headers.get('x-forwarded-for'),  // PII
  userAgent: request.headers.get('user-agent') // PII
});
\`\`\`

## Impact
- 🔒 **Security**: Exposes internal error details to browser console
- ⚠️ **PII Leakage**: User IDs, IPs, emails visible in console (GDPR violation risk)
- 🐌 **Performance**: Console operations slow down production
- 🔍 **Production Noise**: Makes actual debugging harder

## Fix Required
1. Replace ALL console statements with proper logging service:
   \`\`\`typescript
   import { logger } from '@/lib/platform/logging/logger';

   // Instead of console.error
   logger.error('Failed to load client overview', { error, userId: user.id });
   \`\`\`

2. Add ESLint rule to prevent new console statements:
   \`\`\`json
   {
     \"rules\": {
       \"no-console\": [\"error\", { \"allow\": [] }]
     }
   }
   \`\`\`

3. The logging service already exists at \`src/lib/platform/logging/logger.ts\`

## Files Affected
273 files (see grep results in report)

## Estimated Effort
6-8 hours (bulk find-replace with review)

## References
- Technical Issues Report: TECHNICAL_ISSUES_REPORT.md (Section 1.3)
- Logging service: \`src/lib/platform/logging/logger.ts\`" \
  --label "priority: critical" \
  --label "type: security" \
  --label "area: api" \
  --label "effort: medium"

# CRITICAL ISSUE 3: Folder API Not Implemented
gh issue create \
  --title "🚨 [CRITICAL] Folder API returns 501 but UI exists" \
  --body "## Problem
The folders API endpoint exists and is called by the frontend but returns 501 Not Implemented:

\`\`\`typescript
// src/app/api/folders/route.ts
// TODO: Implement folder schema and createFolder method
return NextResponse.json(
  { error: 'Folder creation not yet implemented. Please organize files using tags.' },
  { status: 501 }
);
\`\`\`

## Impact
- ❌ Users can see folder UI but can't create folders
- 😞 Poor user experience with confusing error messages
- 🚫 Incomplete feature shipped to production

## Components Using Folders
- \`src/components/files/file-management-page.tsx\` - Has folder creation UI
- \`src/hooks/use-folders.ts\` - Hook exists
- \`src/components/files/file-browser.tsx\` - Shows folder structure

## Fix Options

### Option A: Implement Folders (8-12 hours)
1. Add \`folders\` table to database schema
2. Add \`folder_id\` column to \`file_uploads\` table
3. Update RLS policies
4. Implement GET/POST/PUT/DELETE endpoints

### Option B: Remove Folder UI (4 hours)
1. Remove folder components
2. Remove folder API routes
3. Update file management to use tags only
4. Simplify UI

## Estimated Effort
- Option A: 8-12 hours
- Option B: 4 hours

## References
- Technical Issues Report: TECHNICAL_ISSUES_REPORT.md (Section 1.2)" \
  --label "priority: critical" \
  --label "type: bug" \
  --label "area: api" \
  --label "effort: large"

# CRITICAL ISSUE 4: Hardcoded Online Status
gh issue create \
  --title "🚨 [CRITICAL] All users shown as online - misleading UI" \
  --body "## Problem
The messaging conversation list shows ALL users as online with a green dot, regardless of actual status:

\`\`\`typescript
// src/components/messages/conversation-list.tsx:141
{conversation.type === 'direct' && (
  <div className=\"absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full\" />
)}
\`\`\`

## Impact
- 😕 Users think coaches/clients are online when they're not
- ⏰ False expectations for immediate responses
- 🤝 Poor UX and trust issues

## Fix Required

### 1. Add conditional rendering (Quick fix - 30 min):
\`\`\`typescript
{conversation.type === 'direct' && conversation.participants[0]?.isOnline && (
  <div className=\"absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full\" />
)}
\`\`\`

### 2. Implement real-time presence tracking (4-6 hours):
\`\`\`sql
-- Add to users table
ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT FALSE;
\`\`\`

### 3. Update presence on activity:
\`\`\`typescript
export async function updateUserPresence(userId: string) {
  await supabase.from('users')
    .update({ last_seen_at: new Date(), is_online: true })
    .eq('id', userId);
}
\`\`\`

## Files Affected
- \`src/components/messages/conversation-list.tsx\`

## Estimated Effort
4-6 hours (full implementation)

## References
- Technical Issues Report: TECHNICAL_ISSUES_REPORT.md (Section 1.4)" \
  --label "priority: critical" \
  --label "type: bug" \
  --label "area: ui" \
  --label "effort: medium"

# CRITICAL ISSUE 5: Missing Resource Tags
gh issue create \
  --title "🚨 [CRITICAL] Resource tag filter broken - empty array" \
  --body "## Problem
The resource library filter receives an empty array for available tags, making tag filtering impossible:

\`\`\`typescript
// src/components/resources/resource-library-page.tsx:308
<ResourceFilters
  initialFilters={filters}
  onFiltersChange={handleFilterChange}
  availableTags={[]} // TODO: Get from resources
/>
\`\`\`

## Impact
- ❌ Users can't filter resources by tags
- 🔍 Resources difficult to find as library grows
- 😞 Feature appears broken

## Fix Required
Extract unique tags from resources:

\`\`\`typescript
const availableTags = useMemo(() => {
  if (!resources) return [];
  const tagSet = new Set<string>();
  resources.forEach(resource => {
    resource.tags?.forEach(tag => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}, [resources]);

// Pass to ResourceFilters
<ResourceFilters
  initialFilters={filters}
  onFiltersChange={handleFilterChange}
  availableTags={availableTags}
/>
\`\`\`

## Files Affected
- \`src/components/resources/resource-library-page.tsx\`

## Estimated Effort
1 hour

## References
- Technical Issues Report: TECHNICAL_ISSUES_REPORT.md (Section 1.5)" \
  --label "priority: critical" \
  --label "type: bug" \
  --label "area: ui" \
  --label "effort: small"

# CRITICAL ISSUE 6: Session Navigation Handler Missing
gh issue create \
  --title "🚨 [CRITICAL] Session booking confirmation doesn't navigate" \
  --body "## Problem
The \"View Session\" button in the booking confirmation dialog does nothing except log to console:

\`\`\`typescript
// src/components/sessions/unified-session-booking.tsx:937
onViewSession={(sessionId) => {
  // Handle navigation to session details if needed
  console.log('Navigate to session:', sessionId);
}}
\`\`\`

## Impact
- 😞 Poor UX after booking session
- ❌ Users can't immediately view session details
- 🚫 Dead-end in user flow

## Fix Required
\`\`\`typescript
import { useRouter } from 'next/navigation';

// In component:
const router = useRouter();

onViewSession={(sessionId) => {
  router.push(\`/sessions/\${sessionId}\`);
  setShowConfirmation(false);
}}
\`\`\`

## Files Affected
- \`src/components/sessions/unified-session-booking.tsx\`

## Estimated Effort
30 minutes

## References
- Technical Issues Report: TECHNICAL_ISSUES_REPORT.md (Section 1.6)" \
  --label "priority: critical" \
  --label "type: bug" \
  --label "area: ui" \
  --label "effort: small"

# CRITICAL ISSUE 7: Incomplete Analytics
gh issue create \
  --title "🚨 [CRITICAL] Analytics dashboards showing placeholder data" \
  --body "## Problem
Multiple analytics implementations use hardcoded placeholder values instead of real data:

\`\`\`typescript
// src/lib/database/resources/analytics.ts:148
averageEngagementTime: null, // TODO: Implement if tracking time
downloadCount: 0, // TODO: Track separately if needed

// src/lib/config/analytics-constants.ts:46
// TODO: In future, could lookup coach-specific rates from database
export const DEFAULT_SESSION_RATE_USD = 100;

// TODO: Calculate from actual session feedback/ratings table
export const DEFAULT_SATISFACTION_RATE = 0.95;
\`\`\`

## Impact
- 📊 Analytics dashboards show misleading data
- 💼 Business decisions made on placeholder values
- ❌ No actual time tracking or engagement metrics

## Fix Required

### 1. Implement engagement time tracking:
- Track resource view duration with events
- Store in \`resource_engagement_time\` table
- Calculate averages in analytics query

### 2. Implement download tracking:
- Already have \`file_download_logs\` table
- Join and aggregate in analytics query

### 3. Remove hardcoded constants:
- Query actual coach rates from \`coach_profiles\` table
- Calculate satisfaction from \`session_ratings\` table

## Files Affected
- \`src/lib/database/resources/analytics.ts\`
- \`src/lib/config/analytics-constants.ts\`

## Estimated Effort
12-16 hours

## References
- Technical Issues Report: TECHNICAL_ISSUES_REPORT.md (Section 1.7)" \
  --label "priority: critical" \
  --label "type: bug" \
  --label "area: database" \
  --label "effort: large"

# CRITICAL ISSUE 8: Fake System Health Monitoring
gh issue create \
  --title "🚨 [CRITICAL] Admin dashboard shows fake health metrics" \
  --body "## Problem
The entire system health monitoring returns hardcoded placeholder data:

\`\`\`typescript
// src/lib/database/admin-analytics.ts:624
// TODO: Implement real system health checks
const health = {
  status: 'healthy',
  uptime: 99.9,
  cpu: 45,
  memory: 62,
  database: 'healthy',
  storage: 78,
};
\`\`\`

## Impact
- ❌ Admins can't monitor actual system health
- 🚨 No alerts for real problems
- 🛡️ False sense of security

## Fix Required

### Implement actual health checks:

\`\`\`typescript
// Check database connection
const dbHealth = await checkDatabaseHealth();

// Check API response times
const apiHealth = await checkAPIHealth();

// Check Supabase storage
const storageHealth = await checkStorageHealth();

// Get real uptime from monitoring service
const uptime = await getActualUptime();
\`\`\`

### Integration options:
1. Integrate with Sentry (already configured)
2. Add health check endpoints
3. Implement alerting for degraded health

## Files Affected
- \`src/lib/database/admin-analytics.ts\`
- \`src/components/admin/system-health-display.tsx\`

## Estimated Effort
8-12 hours

## References
- Technical Issues Report: TECHNICAL_ISSUES_REPORT.md (Section 1.8)" \
  --label "priority: critical" \
  --label "type: bug" \
  --label "area: api" \
  --label "effort: large"

echo "✅ Created 8 CRITICAL issues"
echo ""
echo "⚠️  Creating HIGH priority issues..."

# HIGH PRIORITY ISSUE 1: Rate Limiting
gh issue create \
  --title "⚠️ [HIGH] Standardize rate limiting across all API endpoints" \
  --body "## Problem
Inconsistent rate limiting configurations across endpoints with no documented strategy:

\`\`\`typescript
// src/app/api/sessions/book/route.ts:38
const rateLimitedHandler = rateLimit(10, 60000, {
  // 10 bookings per minute is too permissive (600/hour)
  blockDuration: 10 * 60 * 1000,
});
\`\`\`

## Impact
- 🚨 Vulnerable to abuse/DoS attacks
- 📊 Inconsistent limits confuse users
- 📝 No documentation of rate limit strategy

## Recommended Limits
- Session booking: 5 per 5 minutes (60/hour max)
- File upload: 10 per minute
- Authentication: 5 attempts per 15 minutes
- Read operations: 100 per minute
- Write operations: 30 per minute

## Fix Required
1. Audit all rate limits
2. Standardize configuration
3. Document strategy
4. Add rate limit headers to responses

## Estimated Effort
6-8 hours" \
  --label "priority: high" \
  --label "type: security" \
  --label "area: api" \
  --label "effort: medium"

# HIGH PRIORITY ISSUE 2: Error Boundaries
gh issue create \
  --title "⚠️ [HIGH] Add error boundaries to all critical components" \
  --body "## Problem
Major features don't have error boundaries, leading to white screens on errors.

## Components Without Error Boundaries
- ❌ Session booking component
- ❌ Task list
- ❌ Dashboard widgets
- ✅ Resource library (has boundary)

## Fix Required
\`\`\`tsx
<ErrorBoundary fallback={<ErrorDisplay />}>
  <UnifiedSessionBooking />
</ErrorBoundary>
\`\`\`

## Estimated Effort
4-6 hours" \
  --label "priority: high" \
  --label "type: bug" \
  --label "area: ui" \
  --label "effort: medium"

# HIGH PRIORITY ISSUE 3: Pagination
gh issue create \
  --title "⚠️ [HIGH] Fix pagination showing wrong total counts" \
  --body "## Problem
\`\`\`typescript
// src/lib/services/resource-library-service.ts:126
total: resources.length, // TODO: Get actual total count
\`\`\`

Shows wrong total, breaks pagination at scale.

## Fix
\`\`\`typescript
const { count } = await supabase
  .from('file_uploads')
  .select('*', { count: 'exact', head: true })
  .match(filters);

return { resources, total: count || 0 };
\`\`\`

## Estimated Effort
2-3 hours" \
  --label "priority: high" \
  --label "type: bug" \
  --label "area: api" \
  --label "effort: small"

# HIGH PRIORITY ISSUE 4: Missing Notifications
gh issue create \
  --title "⚠️ [HIGH] Notifications not sent when sharing/assigning" \
  --body "## Problem
\`\`\`typescript
// src/lib/services/resource-library-service.ts:299
// TODO: Send notifications if message provided
\`\`\`

Users don't know when:
- Resources are shared with them
- Tasks are assigned
- Sessions are rescheduled

## Fix Required
Implement notification sending in all sharing/assignment flows.

## Estimated Effort
8-10 hours" \
  --label "priority: high" \
  --label "type: enhancement" \
  --label "area: api" \
  --label "effort: medium"

# HIGH PRIORITY ISSUE 5: Unsafe Date Parsing
gh issue create \
  --title "⚠️ [HIGH] Fix unsafe date parsing in 15+ components" \
  --body "## Problem
Date parsing without validation shows 'Invalid Date' to users:

\`\`\`typescript
return new Intl.DateTimeFormat(locale).format(new Date(value));
// Can return 'Invalid Date'
\`\`\`

## Fix
\`\`\`typescript
function safeFormatDate(value: string | null, locale: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    console.error('Invalid date value:', value);
    return '—';
  }
  return new Intl.DateTimeFormat(locale).format(date);
}
\`\`\`

## Files Affected
15+ components in dashboards, sessions, tasks

## Estimated Effort
4-6 hours" \
  --label "priority: high" \
  --label "type: bug" \
  --label "area: ui" \
  --label "effort: medium"

# HIGH PRIORITY ISSUE 6: Memory Leaks
gh issue create \
  --title "⚠️ [HIGH] Memory leaks from uncleaned Supabase subscriptions" \
  --body "## Problem
Supabase Realtime subscriptions not cleaned up on unmount.

## Fix Pattern
\`\`\`typescript
useEffect(() => {
  const channel = supabase.channel('session-updates')
    .on('postgres_changes', { ... }, handleChange)
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}, []);
\`\`\`

## Estimated Effort
6-8 hours (audit all subscriptions)" \
  --label "priority: high" \
  --label "type: bug" \
  --label "type: performance" \
  --label "area: ui" \
  --label "effort: medium"

# HIGH PRIORITY ISSUE 7: Auth Race Conditions
gh issue create \
  --title "⚠️ [HIGH] Fix authentication race conditions" \
  --body "## Problem
Components render before auth state is loaded:

\`\`\`typescript
const user = useUser();
// user might be undefined or loading
if (user.role !== 'coach') {
  return <Forbidden />;
}
\`\`\`

## Fix
\`\`\`typescript
const { user, isLoading } = useUser();

if (isLoading) return <LoadingSpinner />;
if (!user || user.role !== 'coach') return <Forbidden />;
\`\`\`

## Estimated Effort
4-6 hours" \
  --label "priority: high" \
  --label "type: bug" \
  --label "area: auth" \
  --label "effort: medium"

# HIGH PRIORITY ISSUE 8: SQL Injection Audit
gh issue create \
  --title "⚠️ [HIGH] Security audit: SQL injection vulnerability check" \
  --body "## Required
Full audit of all database queries to ensure:
- No string concatenation in queries
- All use parameterized queries
- Proper input validation

## Estimated Effort
8-12 hours" \
  --label "priority: high" \
  --label "type: security" \
  --label "area: database" \
  --label "effort: large"

# HIGH PRIORITY ISSUE 9: Input Sanitization
gh issue create \
  --title "⚠️ [HIGH] Add input sanitization to prevent XSS" \
  --body "## Problem
Missing sanitization for user input:
- Task titles and descriptions
- Session notes
- Message content
- File names

## Fix
\`\`\`typescript
import DOMPurify from 'isomorphic-dompurify';
const sanitizedContent = DOMPurify.sanitize(userInput);
\`\`\`

## Estimated Effort
8-10 hours" \
  --label "priority: high" \
  --label "type: security" \
  --label "area: api" \
  --label "effort: medium"

# HIGH PRIORITY ISSUE 10: CORS Standardization
gh issue create \
  --title "⚠️ [HIGH] Standardize CORS handling across API routes" \
  --body "## Problem
Inconsistent CORS - some routes have OPTIONS handler, others don't.

## Fix
Standardize CORS handling for all API routes.

## Estimated Effort
4-6 hours" \
  --label "priority: high" \
  --label "type: bug" \
  --label "area: api" \
  --label "effort: medium"

echo "✅ Created 10 HIGH priority issues"
echo ""
echo "📋 Creating MEDIUM priority issues..."

# MEDIUM PRIORITY ISSUE 1: Type Any
gh issue create \
  --title "📋 [MEDIUM] Replace 'any' types with proper TypeScript types" \
  --body "## Problem
**113 files** use \`: any\` type annotations, defeating TypeScript's purpose.

## Examples
\`\`\`typescript
const metadata: any = JSON.parse(formData.get('metadata'));
const data: any = await response.json();
handleChange: (data: any) => void
\`\`\`

## Fix Required
Replace all \`any\` with proper types.

## Estimated Effort
20-30 hours

## Files
113 files found with \`: any\`" \
  --label "priority: medium" \
  --label "type: tech-debt" \
  --label "effort: large"

# MEDIUM PRIORITY ISSUE 2: Test Coverage
gh issue create \
  --title "📋 [MEDIUM] Increase test coverage from 9% to 60%" \
  --body "## Current State
- 75 test files
- 853 TypeScript files
- ~9% coverage

## Missing Tests
- ❌ Task management
- ❌ Resource sharing
- ❌ Message sending
- ❌ Payment processing

## Target
60% test coverage for critical paths

## Estimated Effort
40-60 hours" \
  --label "priority: medium" \
  --label "area: testing" \
  --label "type: tech-debt" \
  --label "effort: large"

# MEDIUM PRIORITY ISSUE 3: TypeScript Strict Mode
gh issue create \
  --title "📋 [MEDIUM] Enable TypeScript strict mode" \
  --body "## Current State
Strict mode not enabled, allowing unsafe patterns.

## Fix
\`\`\`json
{
  \"compilerOptions\": {
    \"strict\": true,
    \"noUncheckedIndexedAccess\": true,
    \"noImplicitAny\": true
  }
}
\`\`\`

Will surface many type errors to fix.

## Estimated Effort
16-24 hours" \
  --label "priority: medium" \
  --label "type: tech-debt" \
  --label "effort: large"

# MEDIUM PRIORITY ISSUE 4: React.memo
gh issue create \
  --title "📋 [MEDIUM] Add React.memo to expensive components" \
  --body "## Components Needing Memoization
- Dashboard widgets (frequent re-renders)
- Message list items
- Task list items
- Session cards

## Example
\`\`\`typescript
export const TaskListItem = memo(TaskListItemComponent);
\`\`\`

## Estimated Effort
8-12 hours" \
  --label "priority: medium" \
  --label "type: performance" \
  --label "area: ui" \
  --label "effort: medium"

# MEDIUM PRIORITY ISSUE 5: Duplicate Code
gh issue create \
  --title "📋 [MEDIUM] Extract duplicate code to shared utilities" \
  --body "## Duplicated Logic
- Date formatting (12+ files)
- User name concatenation
- Avatar fallback logic

## Fix
Create shared utility functions.

## Estimated Effort
8-10 hours" \
  --label "priority: medium" \
  --label "type: tech-debt" \
  --label "effort: medium"

# MEDIUM PRIORITY ISSUE 6: Missing Loading States
gh issue create \
  --title "📋 [MEDIUM] Add skeleton loaders to all async components" \
  --body "## Components Without Loading States
- Insights page
- Progress page
- Several admin pages

## Fix
Add skeleton loaders for better UX.

## Estimated Effort
6-8 hours" \
  --label "priority: medium" \
  --label "type: enhancement" \
  --label "area: ui" \
  --label "effort: medium"

# MEDIUM PRIORITY ISSUE 7: Accessibility
gh issue create \
  --title "📋 [MEDIUM] Accessibility audit and fixes" \
  --body "## Issues Found
1. Missing alt text on images
2. Color-only status indicators
3. Missing focus indicators
4. No skip navigation link
5. Forms missing labels

## Required
Full WCAG 2.1 AA compliance audit.

## Estimated Effort
16-20 hours" \
  --label "priority: medium" \
  --label "type: enhancement" \
  --label "area: ui" \
  --label "effort: large"

# MEDIUM PRIORITY ISSUE 8: Virtual Scrolling
gh issue create \
  --title "📋 [MEDIUM] Implement virtual scrolling for long lists" \
  --body "## Problem
Long lists render all items, causing performance issues:
- Task list (100s of tasks)
- Message list (1000s of messages)
- File browser (100s of files)

## Fix
Use \`react-window\` or \`@tanstack/virtual\`

## Estimated Effort
12-16 hours" \
  --label "priority: medium" \
  --label "type: performance" \
  --label "area: ui" \
  --label "effort: large"

# MEDIUM PRIORITY ISSUE 9: Bundle Analysis
gh issue create \
  --title "📋 [MEDIUM] Bundle size optimization" \
  --body "## Required
1. Add bundle analyzer
2. Run analysis
3. Optimize largest chunks
4. Target: <500KB initial load

## Steps
\`\`\`bash
npm install @next/bundle-analyzer
ANALYZE=true npm run build
\`\`\`

## Estimated Effort
8-12 hours" \
  --label "priority: medium" \
  --label "type: performance" \
  --label "effort: medium"

# MEDIUM PRIORITY ISSUE 10: Environment Validation
gh issue create \
  --title "📋 [MEDIUM] Validate environment variables at startup" \
  --body "## Problem
Environment variables used without validation.

## Fix
\`\`\`typescript
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);
\`\`\`

## Estimated Effort
2-4 hours" \
  --label "priority: medium" \
  --label "type: tech-debt" \
  --label "effort: small"

echo "✅ Created 10 MEDIUM priority issues"
echo ""
echo "🧹 Creating CODE QUALITY issues (selected)..."

# CODE QUALITY ISSUE 1: JSDoc
gh issue create \
  --title "🧹 [CODE QUALITY] Add JSDoc comments to exported functions" \
  --body "## Problem
Most functions lack documentation.

## Target
Add JSDoc to all exported functions.

## Estimated Effort
16-20 hours" \
  --label "priority: low" \
  --label "type: tech-debt" \
  --label "effort: large"

# CODE QUALITY ISSUE 2: Naming Conventions
gh issue create \
  --title "🧹 [CODE QUALITY] Standardize naming conventions" \
  --body "## Issues
Mixed styles: kebab-case, PascalCase, camelCase

## Fix
Document and enforce conventions.

## Estimated Effort
8-10 hours" \
  --label "priority: low" \
  --label "type: tech-debt" \
  --label "effort: medium"

# CODE QUALITY ISSUE 3: File Organization
gh issue create \
  --title "🧹 [CODE QUALITY] Consolidate inconsistent file organization" \
  --body "## Problem
Dashboard widgets in 3 different locations.

## Fix
Consolidate to single location.

## Estimated Effort
6-8 hours" \
  --label "priority: low" \
  --label "type: tech-debt" \
  --label "effort: medium"

# CODE QUALITY ISSUE 4: Magic Numbers
gh issue create \
  --title "🧹 [CODE QUALITY] Extract magic numbers to named constants" \
  --body "## Examples
\`\`\`typescript
setTimeout(resolve, 5000); // Why 5000?
if (password.length < 8) // Why 8?
\`\`\`

## Fix
Extract to named constants.

## Estimated Effort
4-6 hours" \
  --label "priority: low" \
  --label "type: tech-debt" \
  --label "effort: small"

# CODE QUALITY ISSUE 5: Commented Code
gh issue create \
  --title "🧹 [CODE QUALITY] Remove commented out code blocks" \
  --body "## Problem
Multiple blocks of commented code instead of deleting.

## Fix
Remove (it's in git history).

## Estimated Effort
2-3 hours" \
  --label "priority: low" \
  --label "type: tech-debt" \
  --label "effort: small"

echo "✅ Created 5 CODE QUALITY issues"
echo ""
echo "📊 Creating summary/roadmap issue..."

# Create summary issue
gh issue create \
  --title "📊 Technical Audit Roadmap - 93 Issues to Address" \
  --body "# Technical Audit Findings - Implementation Roadmap

This issue tracks the implementation of fixes from the comprehensive technical audit.

## 📈 Overview

**Total Issues:** 93
- 🚨 Critical: 8
- ⚠️ High: 15
- 📋 Medium: 23
- 🧹 Code Quality: 47 (selected 5 created)

## 🎯 Sprint Plan

### Sprint 1 (Week 1-2) - CRITICAL Issues
**Estimated:** 40-50 hours

- [ ] #1 Generate database schema types
- [ ] #2 Remove console statements (273 instances)
- [ ] #3 Fix or remove folders API
- [ ] #4 Fix hardcoded online status
- [ ] #5 Implement resource tags filter
- [ ] #6 Fix session navigation
- [ ] #7 Complete analytics implementations
- [ ] #8 Implement real system health monitoring

### Sprint 2 (Week 3-4) - HIGH Priority & Security
**Estimated:** 60-80 hours

- [ ] #9 Standardize rate limiting
- [ ] #10 Add error boundaries
- [ ] #11 Fix pagination
- [ ] #12 Implement notifications
- [ ] #13 Fix unsafe date parsing
- [ ] #14 Fix memory leaks
- [ ] #15 Fix auth race conditions
- [ ] #16 SQL injection audit
- [ ] #17 Add input sanitization
- [ ] #18 Standardize CORS

### Sprint 3 (Week 5-6) - MEDIUM Priority
**Estimated:** 100-120 hours

- [ ] #19 Replace \`any\` types
- [ ] #20 Increase test coverage to 60%
- [ ] #21 Enable TypeScript strict mode
- [ ] #22 Add React.memo
- [ ] #23 Extract duplicate code
- [ ] #24 Add loading states
- [ ] #25 Accessibility audit
- [ ] #26 Virtual scrolling
- [ ] #27 Bundle optimization
- [ ] #28 Environment validation

### Sprint 4 (Week 7-8) - CODE QUALITY
**Estimated:** 40-60 hours

- [ ] #29 JSDoc comments
- [ ] #30 Naming conventions
- [ ] #31 File organization
- [ ] #32 Magic numbers
- [ ] #33 Remove commented code

## 📊 Metrics Targets

### Before Fixes
- ❌ TypeScript strict: OFF
- ❌ Test coverage: ~9%
- ❌ Console statements: 273
- ❌ Type safety: Partial
- ❌ Bundle size: Unknown

### After Fixes
- ✅ TypeScript strict: ON
- ✅ Test coverage: >60%
- ✅ Console statements: 0
- ✅ Type safety: Complete
- ✅ Bundle size: <500KB

## 📚 References

- **Full Technical Report:** \`TECHNICAL_ISSUES_REPORT.md\`
- **Functional Audit:** \`AUDIT_REPORT.md\`
- **Branch:** \`claude/audit-dashboard-user-exp-011CUtjLU9xjLQyMZJcEU7P3\`

## 👥 Team Recommendations

- Assign 1 senior developer for critical issues
- Run security audit by specialist
- Implement automated checks in CI/CD
- Add pre-commit hooks for console statements

## ⏱️ Total Estimated Time

**240-310 hours** (6-8 weeks for 1 developer)

---

*Generated from comprehensive technical audit - November 2025*" \
  --label "priority: critical" \
  --label "type: enhancement" \
  --assignee "@me"

echo ""
echo "✨ ============================================="
echo "✨ GitHub Issues Creation Complete!"
echo "✨ ============================================="
echo ""
echo "📊 Summary:"
echo "  - 8 CRITICAL issues"
echo "  - 10 HIGH priority issues"
echo "  - 10 MEDIUM priority issues"
echo "  - 5 CODE QUALITY issues"
echo "  - 1 Summary/Roadmap issue"
echo ""
echo "  Total: 34 issues created"
echo ""
echo "🔗 View issues: gh issue list"
echo "🏷️  View labels: gh label list"
echo ""
echo "Next steps:"
echo "  1. Review issues on GitHub"
echo "  2. Assign team members"
echo "  3. Create project board"
echo "  4. Start with Sprint 1 (Critical issues)"
echo ""
