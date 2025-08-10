'use client';

import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

// Dashboard Loading Skeleton
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
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

// Heavy dashboard components - lazy loaded
export const LazyCoachDashboard = lazy(() => 
  import('@/components/coach/coach-dashboard').then(mod => ({ 
    default: mod.CoachDashboardComponent 
  }))
);

export const LazyClientDashboard = lazy(() => 
  import('@/components/client/client-dashboard').then(mod => ({ 
    default: mod.ClientDashboardComponent 
  }))
);

export const LazyAdminAnalytics = lazy(() => 
  import('@/components/admin/analytics-page').then(mod => ({ 
    default: mod.AdminAnalyticsPage 
  }))
);

export const LazySessionManagement = lazy(() => 
  import('@/components/sessions/session-list').then(mod => ({ 
    default: mod.SessionList 
  }))
);

export const LazyFileManager = lazy(() => 
  import('@/components/files/file-manager').then(mod => ({ 
    default: mod.FileManager 
  }))
);

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