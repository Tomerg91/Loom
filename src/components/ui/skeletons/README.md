# Skeleton Loading Components

Comprehensive skeleton UI components for improved perceived performance across the Loom coaching platform.

## Overview

Skeleton screens show users what content is loading, providing visual feedback and reducing perceived wait time. This creates a more polished, professional user experience compared to blank screens or generic spinners.

## File Structure

```
skeletons/
├── index.tsx                      # Central export point
├── README.md                      # This file
├── session-skeletons.tsx          # Session-related skeletons
├── dashboard-skeletons.tsx        # Dashboard skeletons
├── message-skeletons.tsx          # Message & notification skeletons
├── resource-skeletons.tsx         # Resource & task skeletons
├── settings-skeletons.tsx         # Settings page skeletons
├── admin-skeletons.tsx            # Admin panel skeletons
└── client-coach-skeletons.tsx     # Client/coach specific skeletons
```

## Usage

### Basic Import

```tsx
import { SessionListSkeleton, CoachDashboardSkeleton } from '@/components/ui/skeletons';
```

### With TanStack Query

```tsx
import { useQuery } from '@tanstack/react-query';
import { SessionListSkeleton } from '@/components/ui/skeletons';

function SessionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
  });

  if (isLoading) return <SessionListSkeleton />;

  return <SessionList sessions={data} />;
}
```

### With React Suspense

```tsx
import { Suspense } from 'react';
import { SessionDetailsSkeleton } from '@/components/ui/skeletons';

function SessionDetailsPage({ id }: { id: string }) {
  return (
    <Suspense fallback={<SessionDetailsSkeleton />}>
      <SessionDetails id={id} />
    </Suspense>
  );
}
```

### With Dynamic Imports

```tsx
import dynamic from 'next/dynamic';
import { CoachDashboardSkeleton } from '@/components/ui/skeletons';

const CoachDashboard = dynamic(
  () => import('./coach-dashboard'),
  {
    loading: () => <CoachDashboardSkeleton />,
    ssr: false
  }
);
```

## Available Skeletons

### Session Skeletons
- `SessionCardSkeleton` - Individual session card
- `SessionListSkeleton` - List of session cards
- `SessionCalendarSkeleton` - Full calendar view
- `SessionDetailsSkeleton` - Detailed session page
- `SessionFormSkeleton` - Booking/create form
- `SessionTimelineSkeleton` - Timeline view
- `SessionFileManagerSkeleton` - File management view

### Dashboard Skeletons
- `CoachDashboardSkeleton` - Full coach dashboard
- `ClientDashboardSkeleton` - Full client dashboard
- `AdminDashboardSkeleton` - Admin dashboard
- `DashboardStatCardSkeleton` - Individual stat card
- `DashboardContentSkeleton` - Generic dashboard content

### Message & Notification Skeletons
- `MessagesPageSkeleton` - Full messages page layout
- `MessageThreadSkeleton` - Message conversation
- `ConversationListSkeleton` - Conversation list
- `MessageComposerSkeleton` - Message compose form
- `NotificationCenterSkeleton` - Notification panel
- `NotificationListSkeleton` - List of notifications

### Resource & Task Skeletons
- `ResourceLibrarySkeleton` - Full resource library
- `ResourceCardSkeleton` - Individual resource card
- `ResourceAnalyticsSkeleton` - Resource analytics
- `TaskListSkeleton` - Task list
- `TaskBoardSkeleton` - Kanban board view

### Settings Skeletons
- `SettingsPageSkeleton` - Full settings page
- `ProfileSettingsSkeleton` - Profile settings
- `NotificationSettingsSkeleton` - Notification preferences
- `SecuritySettingsSkeleton` - Security settings
- `PreferencesSettingsSkeleton` - User preferences

### Admin Skeletons
- `AdminUsersTableSkeleton` - User management table
- `AdminAnalyticsSkeleton` - Analytics dashboard
- `AdminAuditLogSkeleton` - Audit log view
- `AdminSessionsTableSkeleton` - Session management
- `AdminSystemHealthSkeleton` - System health dashboard
- `AdminModerationPanelSkeleton` - Content moderation

### Client & Coach Skeletons
- `CoachClientsPageSkeleton` - Coach's clients page
- `ClientDetailPageSkeleton` - Client detail view
- `ClientCoachesPageSkeleton` - Client's coaches
- `ReflectionsPageSkeleton` - Reflections/journal
- `ProgressPageSkeleton` - Progress tracking
- `NotesPageSkeleton` - Notes management
- `AvailabilityManagerSkeleton` - Availability settings

## Customization

All skeleton components accept a `className` prop for custom styling:

```tsx
<SessionListSkeleton className="my-custom-class" />
```

Most list-based skeletons accept a `count` prop:

```tsx
<SessionListSkeleton count={10} /> // Show 10 skeleton items
```

## Base Components

All complex skeletons are built from these base components:

- `Skeleton` - Basic skeleton with variants (text, circular, rectangular, rounded)
- `SkeletonText` - Text line skeleton
- `SkeletonAvatar` - Circular avatar skeleton
- `SkeletonButton` - Button skeleton
- `SkeletonCard` - Card skeleton
- `SkeletonTable` - Table skeleton

### Animation Variants

```tsx
<Skeleton animation="pulse" />  // Default pulsing (recommended)
<Skeleton animation="wave" />   // Shimmer effect (premium feel)
<Skeleton animation="none" />   // No animation (accessibility)
```

## Best Practices

### 1. Match Content Structure
Skeleton should mirror the actual content layout:

```tsx
// ✅ Good - matches actual structure
<Card>
  <CardHeader>
    <SkeletonText className="h-6 w-48" />
  </CardHeader>
  <CardContent>
    <SkeletonText className="h-4 w-full" />
  </CardContent>
</Card>

// ❌ Bad - generic placeholder
<div className="loading">Loading...</div>
```

### 2. Use Appropriate Sizes
Make skeleton dimensions realistic:

```tsx
// ✅ Good - realistic widths
<SkeletonText className="w-48" /> // Name field
<SkeletonText className="w-32" /> // Date field

// ❌ Bad - all same width
<SkeletonText className="w-full" />
<SkeletonText className="w-full" />
```

### 3. Include Visual Hierarchy
Preserve the content's visual importance:

```tsx
// ✅ Good - varies heights for hierarchy
<SkeletonText className="h-8 w-64" /> // Heading
<SkeletonText className="h-4 w-full" /> // Body text

// ❌ Bad - all same height
<SkeletonText className="h-4" />
<SkeletonText className="h-4" />
```

### 4. Add Accessibility
Always include ARIA attributes:

```tsx
<div role="status" aria-label="Loading sessions">
  <SessionListSkeleton />
</div>
```

### 5. Optimize Count
Don't show too many skeleton items:

```tsx
// ✅ Good - reasonable count
<SessionListSkeleton count={5} />

// ❌ Bad - overwhelming
<SessionListSkeleton count={50} />
```

## Performance Considerations

1. **Bundle Size**: Skeletons are lightweight (~2-5KB each)
2. **Rendering**: Use `key` props in lists for efficient updates
3. **Animation**: CSS-based animations are GPU-accelerated
4. **Lazy Loading**: Skeletons load instantly while content chunks load

## Migration Guide

### Replacing Generic Loaders

Before:
```tsx
if (isLoading) return <LoadingSpinner />;
```

After:
```tsx
if (isLoading) return <SessionListSkeleton />;
```

### Updating Suspense Boundaries

Before:
```tsx
<Suspense fallback={<div>Loading...</div>}>
```

After:
```tsx
<Suspense fallback={<SessionDetailsSkeleton />}>
```

### Dynamic Imports

Before:
```tsx
const Component = dynamic(() => import('./component'), {
  loading: () => <Spinner />
});
```

After:
```tsx
const Component = dynamic(() => import('./component'), {
  loading: () => <ComponentSkeleton />
});
```

## Testing

Skeletons should be tested for:

1. **Rendering**: Component renders without errors
2. **Accessibility**: Has proper ARIA attributes
3. **Customization**: className prop works
4. **Count Prop**: Renders correct number of items

Example test:
```tsx
describe('SessionListSkeleton', () => {
  it('renders correct number of items', () => {
    render(<SessionListSkeleton count={5} />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('accepts custom className', () => {
    const { container } = render(
      <SessionListSkeleton className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
```

## Contributing

When adding new skeletons:

1. Match the structure of the actual component
2. Use existing base components (SkeletonText, etc.)
3. Accept `className` prop for customization
4. Add `count` prop for list-based skeletons
5. Include accessibility attributes
6. Export from `index.tsx`
7. Document in this README

## Resources

- [Skeleton Screen Best Practices](https://www.lukew.com/ff/entry.asp?1797)
- [Perceived Performance](https://developer.mozilla.org/en-US/docs/Learn/Performance/Perceived_performance)
- [ARIA Status Role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/status_role)
