# Resource Library Feature

## Overview

The Resource Library is a comprehensive content management system that enables coaches to upload, organize, share, and track educational resources with their clients. It includes collections management, analytics tracking, and progress monitoring.

## Features

### For Coaches

- **Upload Resources**: Drag-and-drop file upload supporting multiple formats (PDF, Office docs, images, videos, audio)
- **Organize**: Create themed collections and reorder resources with drag-and-drop
- **Share**: Bulk share resources with all clients or configure auto-share for new clients
- **Track Analytics**: View engagement metrics (views, downloads, completions) and identify top performers
- **Filter & Search**: Advanced filtering by category, tags, and search terms
- **Manage Collections**: Group related resources for better organization

### For Clients

- **Access Resources**: View all resources shared by their coaches
- **Track Progress**: Automatic tracking of viewed, completed, and accessed resources
- **Search & Filter**: Find resources by category, tags, or search
- **Download**: Download resources with proper permission checks
- **Stats Dashboard**: View personal progress statistics

## Architecture

### Database Schema

```
file_uploads (extended)
├── is_library_resource: boolean
├── is_public: boolean
├── shared_with_all_clients: boolean
├── view_count: integer
└── completion_count: integer

resource_collections
├── id: uuid (PK)
├── coach_id: uuid (FK → users)
├── name: text
├── description: text
├── icon: text
└── sort_order: integer

resource_collection_items
├── id: uuid (PK)
├── collection_id: uuid (FK → resource_collections)
├── resource_id: uuid (FK → file_uploads)
└── sort_order: integer

resource_library_settings
├── id: uuid (PK)
├── coach_id: uuid (FK → users)
├── auto_share_enabled: boolean
├── default_permission: text
└── auto_share_collections: uuid[]

resource_client_progress
├── id: uuid (PK)
├── resource_id: uuid (FK → file_uploads)
├── client_id: uuid (FK → users)
├── viewed_at: timestamp
├── completed_at: timestamp
└── last_accessed_at: timestamp
```

### API Routes

#### Resources
- `GET /api/resources` - List coach's library resources
- `POST /api/resources` - Upload new resource
- `GET /api/resources/[id]` - Get single resource
- `PUT /api/resources/[id]` - Update resource metadata
- `DELETE /api/resources/[id]` - Delete resource
- `POST /api/resources/[id]/share-all-clients` - Share with all clients

#### Collections
- `GET /api/resources/collections` - List collections
- `POST /api/resources/collections` - Create collection
- `GET /api/resources/collections/[id]` - Get collection with resources
- `PUT /api/resources/collections/[id]` - Update collection
- `DELETE /api/resources/collections/[id]` - Delete collection

#### Client Access
- `GET /api/resources/client` - Get shared resources
- `POST /api/resources/[id]/progress` - Track progress

#### Analytics
- `GET /api/resources/analytics` - Get library or resource analytics

### Components

#### Core Components
- `ResourceCard` - Display individual resources
- `ResourceGrid` - Container with layout toggle (grid/list)
- `ResourceFilters` - Search, category, tags, sort
- `ResourceEmptyState` - Context-aware empty states
- `ResourceUploadDialog` - Drag-and-drop upload modal
- `ResourceShareDialog` - Share configuration modal
- `ResourceErrorBoundary` - Error handling component

#### Collection Components
- `CollectionCard` - Display collections
- `CollectionDialog` - Create/edit collection modal

#### Analytics Components
- `AnalyticsOverview` - High-level metrics dashboard
- `TopResourcesList` - Top performing resources
- `AutoShareSettings` - Auto-share configuration

### Pages

#### Coach Pages
- `/coach/resources` - Main library management
- `/coach/resources/collections` - Collections list
- `/coach/resources/collections/[id]` - Collection detail with drag-and-drop
- `/coach/resources/analytics` - Analytics dashboard

#### Client Pages
- `/client/resources` - View shared resources

## Usage

### Uploading Resources

```typescript
// Upload a resource via API
const formData = new FormData();
formData.append('file', file);
formData.append('category', 'worksheet');
formData.append('tags', JSON.stringify(['mindfulness', 'goals']));
formData.append('description', 'Resource description');

const response = await fetch('/api/resources', {
  method: 'POST',
  body: formData,
});
```

### Sharing Resources

```typescript
// Share with all clients
const response = await fetch(`/api/resources/${resourceId}/share-all-clients`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    permission: 'view' | 'download',
    expiresAt: '2024-12-31T23:59:59Z', // optional
    message: 'Check out this resource!' // optional
  }),
});
```

### Tracking Progress

```typescript
// Track client progress
const response = await fetch(`/api/resources/${resourceId}/progress`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'viewed' | 'completed' | 'accessed'
  }),
});
```

## Security

### Row-Level Security (RLS)

All resource library tables are protected with RLS policies:

- **Coaches**: Can only access their own resources, collections, and settings
- **Clients**: Can only view resources explicitly shared with them
- **Progress**: Client-specific, coaches can view aggregated data
- **Settings**: Coach-specific configuration

### Permission Levels

- **View**: Client can view but not download
- **Download**: Client can view and download
- **Edit**: Reserved for coaches (their own resources)

## Performance Optimization

### Database Indexes

```sql
-- Performance indexes for common queries
CREATE INDEX idx_file_uploads_library_resource ON file_uploads(is_library_resource);
CREATE INDEX idx_file_uploads_shared_all ON file_uploads(shared_with_all_clients, user_id);
CREATE INDEX idx_resource_collections_coach_id ON resource_collections(coach_id);
CREATE INDEX idx_resource_client_progress_client_id ON resource_client_progress(client_id);
```

### Caching Strategy

- TanStack Query with automatic cache invalidation
- Optimistic UI updates for better UX
- 5-minute stale time for analytics data

## Testing

### Unit Tests (Planned)
- Component rendering tests
- Validation schema tests
- Utility function tests

### Integration Tests (Planned)
- API endpoint tests
- Database query tests
- RLS policy tests

### E2E Tests (Planned)
- Full user workflows
- Upload and share flow
- Collection management flow

## Future Enhancements

- [ ] Advanced analytics with charts (Recharts)
- [ ] Resource versioning
- [ ] Comments and annotations
- [ ] Collaborative collections
- [ ] Resource templates
- [ ] Bulk operations (upload, share, delete)
- [ ] Advanced search with filters
- [ ] Resource recommendations based on client needs
- [ ] Export analytics reports
- [ ] Integration with calendar for scheduled releases

## Troubleshooting

### Resources Not Appearing for Clients

1. Check if resource is marked as `is_library_resource = true`
2. Verify resource is shared (check `file_shares` table)
3. Ensure RLS policies are enabled
4. Check client-coach relationship in `sessions` table

### Upload Failing

1. Check file size (max 100MB)
2. Verify file type is supported
3. Check Supabase storage bucket permissions
4. Ensure user has coach role

### Analytics Not Updating

1. Progress tracking requires client action
2. Check `resource_client_progress` table
3. Verify helper functions are running
4. Check for database triggers

## Support

For issues or questions:
- Check the main documentation
- Review API route implementations
- Inspect browser console for client-side errors
- Check server logs for backend errors

## License

Internal use only - Part of the Loom coaching platform
