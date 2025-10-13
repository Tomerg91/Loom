'use client';

import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Component prop interfaces
interface CoachDashboardProps {
  className?: string;
}

interface ClientDashboardProps {
  className?: string;
}

interface AdminAnalyticsProps {
  className?: string;
  dateRange?: { from: Date; to: Date };
}

interface SessionManagementProps {
  clientId?: string;
  coachId?: string;
  className?: string;
}

interface FileManagerProps {
  className?: string;
  userId?: string;
  onFileSelect?: (file: any) => void;
  uploadEnabled?: boolean;
}

// Generic loading component with spinner
export const LoadingSpinner = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center p-8 space-y-4">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

// Enhanced Dashboard Loading Skeleton
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-12 mb-2" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  </div>
);

// Error fallback component
const ErrorFallback = ({ 
  message = "Component unavailable", 
  onRetry 
}: { 
  message?: string;
  onRetry?: () => void;
}) => (
  <Card className="border-destructive/50">
    <CardContent className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-destructive mb-4">
        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-destructive">!</span>
        </div>
        <h3 className="text-lg font-semibold">{message}</h3>
      </div>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Retry
        </button>
      )}
    </CardContent>
  </Card>
);

// ============================================================================
// OPTIMIZED HEAVY COMPONENTS - Using dynamic imports for better chunking
// ============================================================================

// Dashboard components
export const LazyCoachDashboard = dynamic(
  () => import('@/components/coach/coach-dashboard').then(mod => ({ 
    default: mod.CoachDashboardComponent 
  })),
  {
    loading: () => <LoadingSpinner message="Loading coach dashboard..." />,
    ssr: false
  }
);

export const LazyClientDashboard = dynamic(
  () => import('@/components/client/client-dashboard').then(mod => ({ 
    default: mod.ClientDashboardComponent 
  })),
  {
    loading: () => <LoadingSpinner message="Loading client dashboard..." />,
    ssr: false
  }
);

// Admin components
export const LazyAdminDashboard = dynamic(
  () => import('./admin/lazy-admin-components').then(mod => ({
    default: mod.LazyAdminDashboard
  })),
  {
    loading: () => <LoadingSpinner message="Loading admin dashboard..." />,
    ssr: false
  }
);

export const LazyAdminAnalytics = dynamic(
  () => import('./admin/lazy-admin-components').then(mod => ({
    default: mod.LazyAdminAnalyticsPage
  })),
  {
    loading: () => <LoadingSpinner message="Loading analytics dashboard..." />,
    ssr: false
  }
);

export const LazyAdminUsers = dynamic(
  () => import('./admin/lazy-admin-components').then(mod => ({
    default: mod.LazyAdminUsersPage
  })),
  {
    loading: () => <LoadingSpinner message="Loading user management..." />,
    ssr: false
  }
);

export const LazyAdminSystem = dynamic(
  () => import('./admin/lazy-admin-components').then(mod => ({
    default: mod.LazyAdminSystemPage
  })),
  {
    loading: () => <LoadingSpinner message="Loading system settings..." />,
    ssr: false
  }
);

export const LazyAdminSessions = dynamic(
  () => import('./admin/lazy-admin-components').then(mod => ({
    default: mod.LazyAdminSessionsPage
  })),
  {
    loading: () => <LoadingSpinner message="Loading sessions management..." />,
    ssr: false
  }
);

export const LazyAdminAudit = dynamic(
  () => import('./admin/lazy-admin-components').then(mod => ({
    default: mod.LazyAdminAuditPage
  })),
  {
    loading: () => <LoadingSpinner message="Loading audit logs..." />,
    ssr: false
  }
);

// Chart components (heavy recharts library)
export const LazyUserGrowthChart = dynamic(
  () => import('./charts/lazy-chart-components').then(mod => ({ 
    default: mod.LazyUserGrowthChart 
  })),
  {
    loading: () => <LoadingSpinner message="Loading chart..." />,
    ssr: false
  }
);

export const LazySessionMetricsChart = dynamic(
  () => import('./charts/lazy-chart-components').then(mod => ({ 
    default: mod.LazySessionMetricsChart 
  })),
  {
    loading: () => <LoadingSpinner message="Loading metrics chart..." />,
    ssr: false
  }
);

export const LazyDashboardCharts = dynamic(
  () => import('./charts/lazy-chart-components').then(mod => ({ 
    default: mod.LazyDashboardCharts 
  })),
  {
    loading: () => <LoadingSpinner message="Loading dashboard charts..." />,
    ssr: false
  }
);

// Session components
export const LazySessionCalendar = dynamic(
  () => import('./sessions/lazy-session-components').then(mod => ({ 
    default: mod.LazySessionCalendar 
  })),
  {
    loading: () => <LoadingSpinner message="Loading calendar..." />,
    ssr: false
  }
);

export const LazySessionList = dynamic(
  () => import('./sessions/lazy-session-components').then(mod => ({ 
    default: mod.LazySessionList 
  })),
  {
    loading: () => <LoadingSpinner message="Loading sessions..." />,
    ssr: false
  }
);

export const LazySessionBooking = dynamic(
  () => import('./sessions/lazy-session-components').then(mod => ({ 
    default: mod.LazyUnifiedSessionBooking 
  })),
  {
    loading: () => <LoadingSpinner message="Loading booking form..." />,
    ssr: false
  }
);

// Note: File management, messaging, and rich text editor components 
// are commented out due to missing dependencies. 
// They can be enabled once the missing modules are available.

/*
// File management components
export const LazyFileManager = dynamic(
  () => import('./files/file-manager'),
  {
    loading: () => <LoadingSpinner message="Loading file manager..." />,
    ssr: false
  }
);

// Messaging components  
export const LazyMessageThread = dynamic(
  () => import('./messages/message-thread'),
  {
    loading: () => <LoadingSpinner message="Loading messages..." />,
    ssr: false
  }
);

export const LazyNotificationCenter = dynamic(
  () => import('./notifications/notification-center'),
  {
    loading: () => <LoadingSpinner message="Loading notifications..." />,
    ssr: false
  }
);

// Rich text editor (heavy component)
export const LazyRichTextEditor = dynamic(
  () => import('./ui/rich-text-editor'),
  {
    loading: () => <LoadingSpinner message="Loading editor..." />,
    ssr: false
  }
);
*/

// Lazy loading wrapper component
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function LazyWrapper({ children, fallback = <DashboardSkeleton /> }: LazyWrapperProps) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}

// Component-specific wrappers with appropriate loading states
export function LazyCoachDashboardWrapper(props: CoachDashboardProps) {
  return (
    <LazyWrapper>
      <LazyCoachDashboard {...props} />
    </LazyWrapper>
  );
}

export function LazyClientDashboardWrapper(props: ClientDashboardProps) {
  return (
    <LazyWrapper>
      <LazyClientDashboard {...props} />
    </LazyWrapper>
  );
}

export function LazyAdminAnalyticsWrapper(props: AdminAnalyticsProps) {
  return (
    <LazyWrapper>
      <LazyAdminAnalytics {...props} />
    </LazyWrapper>
  );
}

// File manager with custom skeleton
const FileManagerSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-24" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export function LazyFileManagerWrapper(props: FileManagerProps) {
  return (
    <Suspense fallback={<FileManagerSkeleton />}>
      <LazyFileManager {...props} />
    </Suspense>
  );
}

// Session management wrapper
export function LazySessionManagementWrapper(props: SessionManagementProps) {
  return (
    <LazyWrapper>
      <LazySessionManagement {...props} />
    </LazyWrapper>
  );
}