# Loom App Features Guide

## Table of Contents

- [Resource Library](#resource-library)
- [Authentication & Security](#authentication--security)
- [User Roles](#user-roles)
- [Session Management](#session-management)
- [Payments](#payments)

## Resource Library

The Resource Library is a comprehensive content management system that enables coaches to share educational materials with clients and track engagement.

### For Coaches

#### Resource Management

- **Upload Resources**: Drag-and-drop file upload supporting multiple formats:
  - Documents: PDF, Word (.doc, .docx), PowerPoint (.ppt, .pptx), Excel (.xls, .xlsx)
  - Images: PNG, JPG, GIF, SVG
  - Videos: MP4, MOV, AVI, WebM
  - Audio: MP3, WAV, OGG
- **Organize by Category**:
  - Worksheets
  - Videos
  - Audio
  - Articles
  - Templates
  - Forms
  - Guides
  - Other
- **Tag System**: Add custom tags for flexible organization
- **Descriptions**: Add detailed descriptions to each resource
- **Search & Filter**: Find resources by name, category, tags, or description

#### Collections

- **Create Themed Collections**: Group related resources together (e.g., "Welcome Kit", "Week 1 Materials")
- **Drag-and-Drop Organization**: Reorder resources within collections visually
- **Collection Icons**: Add emoji icons for visual identification
- **Nested Organization**: Resources can belong to multiple collections

#### Sharing Resources

- **Share with All Clients**: One-click sharing with all current clients
- **Individual Sharing**: Share specific resources with selected clients
- **Auto-Share for New Clients**: Configure resources to automatically share with new clients
- **Permission Levels**:
  - **View**: Clients can view but not download
  - **Download**: Clients can view and download
- **Expiration Dates**: Set optional expiration dates for resource access

#### Analytics Dashboard

Access comprehensive analytics at `/coach/resources/analytics`:

- **Overview Statistics**:
  - Total resources in library
  - Total views across all resources
  - Total downloads
  - Total completions
  - Average completion rate
  - Active clients count
  - Unique viewers count

- **Top Resources** (`/coach/resources/analytics#top-resources`):
  - View top 10 resources by views
  - See completion counts and rates
  - Identify most impactful content
  - Bar chart visualization

- **Category Performance**:
  - Resource distribution by category
  - Views and completions by category
  - Completion rate by category
  - Pie chart and bar chart visualizations

- **Engagement Metrics**:
  - Track which clients are actively using resources
  - Monitor unique viewers
  - View total engagement statistics
  - Identify most and least engaged clients

- **Time Range Filtering**:
  - Last 7 days
  - Last 30 days
  - Last 90 days
  - All time

- **Data Export**: Export analytics data to CSV (coming soon)

### For Clients

#### Accessing Resources

Navigate to `/client/resources` to access your resource library:

- **View Shared Resources**: See all resources shared by your coach(es)
- **Filter by Category**: Filter resources by type (worksheets, videos, etc.)
- **Search**: Find resources by name or description
- **Collections**: Browse resources by themed collections
- **Sort Options**: Sort by date, name, or view count

#### Progress Tracking

- **Automatic Tracking**: Resources are automatically marked as "viewed" when opened
- **Mark as Complete**: Manually mark resources as completed when finished
- **Progress Overview**: View statistics on:
  - Total resources available
  - Resources viewed
  - Resources completed
  - Resources not started
- **Progress Indicators**: Visual badges show status (New, In Progress, Completed)

#### Resource Actions

- **View**: Open resources in a new tab or inline viewer
- **Download**: Download resources (if permission granted)
- **Mark Complete**: Track completion for accountability

#### Progress Dashboard

- **Not Started Resources**: Quick access to resources you haven't opened yet
- **Completion Rate**: See your overall progress percentage
- **Filter Options**: Toggle showing/hiding completed resources

### Security & Privacy

#### Row-Level Security (RLS)

All resource data is protected with database-level security:

- **Coaches**: Can only access their own resources, collections, and analytics
- **Clients**: Can only see resources explicitly shared with them
- **Progress Data**: Clients can only view and update their own progress
- **Cross-Coach Isolation**: Resources are completely isolated between coaches

#### Permission Levels

- **View Only**: Clients can view resources but cannot download
- **Download**: Clients can both view and download resources
- **Edit**: Reserved for coaches on their own resources

#### Data Privacy

- Client progress data is private to each client
- Coaches can view aggregated analytics but not individual client actions
- Resource sharing is opt-in; nothing is shared by default

### Technical Implementation

#### Database Schema

The resource library uses the following tables:

```
file_uploads
├── is_library_resource: boolean
├── is_public: boolean
├── shared_with_all_clients: boolean
├── category: text
├── tags: text[]
├── description: text
├── view_count: integer
└── completion_count: integer

resource_collections
├── id: uuid
├── coach_id: uuid
├── name: text
├── description: text
├── icon: text
└── sort_order: integer

resource_collection_items
├── collection_id: uuid
├── resource_id: uuid
└── sort_order: integer

resource_client_progress
├── resource_id: uuid
├── client_id: uuid
├── viewed_at: timestamp
├── completed_at: timestamp
├── last_accessed_at: timestamp
└── access_count: integer
```

#### API Endpoints

**Coach Endpoints:**

- `GET /api/resources` - List resources
- `POST /api/resources` - Upload resource
- `PUT /api/resources/[id]` - Update resource
- `DELETE /api/resources/[id]` - Delete resource
- `POST /api/resources/[id]/share-all-clients` - Share with all clients
- `GET /api/resources/analytics` - Get analytics data
- `GET /api/resources/collections` - List collections
- `POST /api/resources/collections` - Create collection
- `PUT /api/resources/collections/[id]` - Update collection
- `DELETE /api/resources/collections/[id]` - Delete collection

**Client Endpoints:**

- `GET /api/client/resources` - Get shared resources
- `POST /api/client/resources/[id]/progress` - Track progress
- `GET /api/client/resources/collections` - Get accessible collections

#### Performance Optimization

- **Database Indexes**: Optimized queries for common operations
- **Caching**: TanStack Query with automatic cache invalidation
- **Optimistic Updates**: Instant UI feedback for user actions
- **Lazy Loading**: Resources loaded on-demand for better performance

### Usage Examples

#### Uploading a Resource

1. Navigate to `/coach/resources`
2. Click "Upload Resource" button
3. Drag and drop files or click to browse
4. Fill in resource details:
   - Category (required)
   - Tags (optional, comma-separated)
   - Description (optional)
5. Click "Upload"

#### Creating a Collection

1. Navigate to `/coach/resources/collections`
2. Click "New Collection"
3. Enter collection details:
   - Name (required)
   - Description (optional)
   - Icon (optional emoji)
4. Click "Create"
5. Add resources by dragging them into the collection

#### Sharing Resources

**Share with All Clients:**

1. Open resource card menu
2. Click "Share with All Clients"
3. Select permission level (View or Download)
4. Optionally set expiration date
5. Click "Share"

**Auto-Share with New Clients:**

1. Navigate to `/coach/resources/analytics`
2. Click "Auto-Share Settings"
3. Enable auto-share
4. Select collections to auto-share
5. Save settings

#### Viewing Analytics

1. Navigate to `/coach/resources/analytics`
2. Select time range (7d, 30d, 90d, all)
3. View tabs:
   - **Overview**: High-level summary with key metrics
   - **Top Resources**: Most viewed and completed resources
   - **Categories**: Performance breakdown by category
   - **Engagement**: Client activity metrics
4. Click "Refresh" to update data
5. Click "Export" to download CSV report (coming soon)

### Best Practices

#### For Coaches

1. **Organize Thoughtfully**:
   - Use consistent naming conventions
   - Assign appropriate categories
   - Add descriptive tags
   - Write clear descriptions

2. **Create Themed Collections**:
   - Group related resources together
   - Create onboarding collections for new clients
   - Organize by program phase or topic

3. **Monitor Analytics**:
   - Check which resources are most effective
   - Identify underutilized resources
   - Track client engagement trends
   - Remove or update low-performing resources

4. **Strategic Sharing**:
   - Don't overwhelm clients with too many resources at once
   - Use auto-share for essential onboarding materials
   - Set expiration dates for time-sensitive content
   - Grant download permissions thoughtfully

#### For Clients

1. **Track Your Progress**:
   - Mark resources as complete when finished
   - Use filters to focus on not-started resources
   - Check your progress dashboard regularly

2. **Organize Your Learning**:
   - Use search to find specific topics
   - Filter by category to focus on one type
   - Browse collections for structured learning paths

3. **Engage with Resources**:
   - Open resources when shared
   - Complete assigned materials
   - Download important resources for offline access

### Troubleshooting

#### Resources Not Appearing for Clients

1. Verify resource is marked as `is_library_resource = true`
2. Check that resource is shared (in `file_shares` table or `shared_with_all_clients = true`)
3. Ensure coach-client relationship exists (check `sessions` table)
4. Verify RLS policies are enabled on database

#### Upload Failing

1. Check file size (maximum 100MB)
2. Verify file type is supported
3. Check Supabase storage bucket permissions
4. Ensure you have coach role

#### Analytics Not Updating

1. Click "Refresh" button to clear cache
2. Check that clients are actually accessing resources
3. Verify progress tracking is working (check `resource_client_progress` table)
4. Allow time for database aggregation (analytics may be cached for up to 5 minutes)

#### Progress Not Tracking

1. Ensure JavaScript is enabled
2. Check browser console for errors
3. Verify network connectivity
4. Try refreshing the page

## Authentication & Security

### Multi-Factor Authentication (MFA)

- **Time-based One-Time Passwords (TOTP)**: Support for authenticator apps
- **Phone-based MFA**: SMS verification (configuration required)
- **Recovery Codes**: Backup codes for account recovery
- **Enrollment**: `/auth/mfa/enroll` - Set up MFA
- **Management**: Manage MFA settings in account dashboard

### Password Security

- **Reset Flow**: Professional password reset process
- **Email Verification**: Secure token-based verification
- **Password Requirements**: Minimum length and complexity rules
- **Rate Limiting**: Protection against brute force attacks

### Session Management

- **Secure Sessions**: HTTP-only cookies for session tokens
- **Auto-refresh**: Automatic token refresh for seamless experience
- **Logout**: Secure session termination
- **Timeout**: Configurable session timeout for security

### Authentication Configuration

Recent security improvements (see [AUTH_SECURITY_CONFIG.md](../supabase/AUTH_SECURITY_CONFIG.md)):

- **OTP Expiry**: One-time passwords expire after 15 minutes
- **Email Confirmation**: Email verification required for new accounts
- **Redirect URLs**: Configurable redirect domains for secure callbacks
- **Environment Variables**: Production-ready configuration via environment variables

## User Roles

### Coach Role

- Create and manage resources
- View analytics and insights
- Share resources with clients
- Manage collections
- Configure auto-share settings
- Access coach dashboard at `/coach/*`

### Client Role

- Access shared resources
- Track progress on materials
- View personal statistics
- Search and filter resources
- Access client dashboard at `/client/*`

### Role-Based Access Control

- Routes protected with `CoachRoute` and `ClientRoute` guards
- API endpoints verify user roles
- Database-level RLS enforces role separation
- Automatic role detection and routing

## Session Management

### Booking & Scheduling

- Schedule coaching sessions
- Calendar integration
- Automated reminders
- Session history tracking
- Rescheduling and cancellation

### Session Resources

- Attach resources to specific sessions
- Pre-session materials
- Post-session follow-ups
- Session notes and recordings

## Payments

### Payment Processing

- Secure payment handling via Stripe
- Multiple payment methods
- Recurring billing support
- Invoice generation
- Payment history

### Subscription Management

- Flexible subscription plans
- Upgrade/downgrade options
- Trial periods
- Automatic renewal
- Cancellation handling

---

## Getting Help

- **Documentation**: Check the [main README](../README.md) for setup instructions
- **API Reference**: Review API endpoint implementations in `src/app/api/`
- **Database Schema**: See migration files in `supabase/migrations/`
- **Security**: Review [Supabase Remediation Plan](../SUPABASE_REMEDIATION_PLAN.md)
- **Support**: Contact your administrator or check the issue tracker

## Related Documentation

- [Resource Library Technical Documentation](./RESOURCE_LIBRARY.md)
- [Step 8: Client Resource Access](./STEP_8_CLIENT_RESOURCE_ACCESS.md)
- [Step 9: Resource Analytics Dashboard](./STEP_9_RESOURCE_ANALYTICS_DASHBOARD.md)
- [Admin Guide](./ADMIN_GUIDE.md)
- [Launch Checklist](./launch/checklist.md)
