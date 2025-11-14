/**
 * @fileoverview Centralized export for all skeleton loading components
 *
 * This file provides a single import point for all skeleton components,
 * improving perceived performance by showing structured loading states
 * instead of blank screens or generic spinners.
 *
 * @example
 * ```tsx
 * import { SessionListSkeleton, CoachDashboardSkeleton } from '@/components/ui/skeletons';
 *
 * function MyComponent() {
 *   const { data, isLoading } = useQuery(...);
 *
 *   if (isLoading) return <SessionListSkeleton />;
 *   return <SessionList data={data} />;
 * }
 * ```
 */

// Base skeleton components
export * from '../skeleton';

// Session-related skeletons
export {
  SessionCardSkeleton,
  SessionListSkeleton,
  SessionCalendarSkeleton,
  SessionDetailsSkeleton,
  SessionFormSkeleton,
  SessionTimelineSkeleton,
  SessionFileManagerSkeleton,
} from './session-skeletons';

// Dashboard skeletons
export {
  DashboardStatCardSkeleton,
  CoachDashboardSkeleton,
  ClientDashboardSkeleton,
  AdminDashboardSkeleton,
  DashboardContentSkeleton,
} from './dashboard-skeletons';

// Message & notification skeletons
export {
  MessageBubbleSkeleton,
  MessageThreadSkeleton,
  ConversationListItemSkeleton,
  ConversationListSkeleton,
  MessageComposerSkeleton,
  MessagesPageSkeleton,
  NotificationItemSkeleton,
  NotificationListSkeleton,
  NotificationCenterSkeleton,
} from './message-skeletons';

// Resource & task skeletons
export {
  ResourceCardSkeleton,
  ResourceListItemSkeleton,
  ResourceLibrarySkeleton,
  ResourceCollectionSkeleton,
  TaskCardSkeleton,
  TaskListSkeleton,
  TaskBoardSkeleton,
  ResourceAnalyticsSkeleton,
} from './resource-skeletons';

// Settings skeletons
export {
  SettingsCardSkeleton,
  ProfileSettingsSkeleton,
  NotificationSettingsSkeleton,
  SecuritySettingsSkeleton,
  PreferencesSettingsSkeleton,
  SettingsPageSkeleton,
  LanguageSettingsSkeleton,
} from './settings-skeletons';

// Admin skeletons
export {
  AdminUsersTableSkeleton,
  AdminAnalyticsSkeleton,
  AdminAuditLogSkeleton,
  AdminSessionsTableSkeleton,
  AdminSystemHealthSkeleton,
  AdminModerationPanelSkeleton,
} from './admin-skeletons';

// Client & coach specific skeletons
export {
  ClientCardSkeleton,
  CoachClientsPageSkeleton,
  ClientDetailPageSkeleton,
  CoachCardSkeleton,
  ClientCoachesPageSkeleton,
  ReflectionsPageSkeleton,
  ProgressPageSkeleton,
  NotesPageSkeleton,
  AvailabilityManagerSkeleton,
} from './client-coach-skeletons';

/**
 * Common skeleton patterns by use case
 */
export const SkeletonPatterns = {
  // Page-level skeletons
  pages: {
    dashboard: {
      coach: 'CoachDashboardSkeleton',
      client: 'ClientDashboardSkeleton',
      admin: 'AdminDashboardSkeleton',
    },
    sessions: {
      list: 'SessionListSkeleton',
      calendar: 'SessionCalendarSkeleton',
      details: 'SessionDetailsSkeleton',
      form: 'SessionFormSkeleton',
    },
    messages: {
      full: 'MessagesPageSkeleton',
      thread: 'MessageThreadSkeleton',
      list: 'ConversationListSkeleton',
    },
    settings: {
      full: 'SettingsPageSkeleton',
      profile: 'ProfileSettingsSkeleton',
      notifications: 'NotificationSettingsSkeleton',
      security: 'SecuritySettingsSkeleton',
      preferences: 'PreferencesSettingsSkeleton',
    },
  },

  // Component-level skeletons
  components: {
    cards: {
      session: 'SessionCardSkeleton',
      client: 'ClientCardSkeleton',
      coach: 'CoachCardSkeleton',
      resource: 'ResourceCardSkeleton',
      task: 'TaskCardSkeleton',
    },
    lists: {
      sessions: 'SessionListSkeleton',
      conversations: 'ConversationListSkeleton',
      notifications: 'NotificationListSkeleton',
      tasks: 'TaskListSkeleton',
    },
    tables: {
      users: 'AdminUsersTableSkeleton',
      sessions: 'AdminSessionsTableSkeleton',
      generic: 'SkeletonTable',
    },
  },
};

/**
 * Usage recommendations:
 *
 * 1. For data fetching with TanStack Query:
 *    - Use skeleton as the loading fallback
 *    - Match skeleton structure to actual content
 *
 * 2. For Suspense boundaries:
 *    - Provide skeleton as fallback prop
 *    - Ensures seamless transitions
 *
 * 3. For dynamic imports:
 *    - Use with React.lazy and Suspense
 *    - Improves code splitting UX
 *
 * 4. Animation preferences:
 *    - Default: 'pulse' for general use
 *    - Use 'wave' for premium feel
 *    - Use 'none' for accessibility needs
 */
