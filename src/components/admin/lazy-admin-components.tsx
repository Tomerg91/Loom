'use client';

import { 
  BarChart3, 
  Users, 
  Settings, 
  Activity,
  Bell,
  Shield
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Loading skeleton for admin pages
const AdminPageSkeleton = ({ 
  title, 
  description,
  className 
}: { 
  title?: string;
  description?: string;
  className?: string;
}) => (
  <div className={cn("space-y-6", className)}>
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">{title || "Loading..."}</h1>
        <p className="text-muted-foreground">{description || "Please wait..."}</p>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="w-24 h-10 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    </div>
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  </div>
);

// Loading skeleton for analytics page
const AnalyticsPageSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("space-y-6", className)}>
    <div className="flex items-center justify-between">
      <div>
        <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-64 animate-pulse" />
      </div>
      <div className="flex gap-2">
        <div className="w-32 h-10 bg-gray-200 rounded animate-pulse" />
        <div className="w-20 h-10 bg-gray-200 rounded animate-pulse" />
        <div className="w-24 h-10 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
    
    {/* Overview Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-4 w-4 bg-gray-200 rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
    
    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-48" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-gray-100 rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
    
    {/* Additional sections */}
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-6 bg-gray-200 rounded w-40 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-56" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

// Loading skeleton for users management
const UsersPageSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("space-y-6", className)}>
    <div className="flex items-center justify-between">
      <div>
        <div className="h-8 bg-gray-200 rounded w-32 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-48 animate-pulse" />
      </div>
      <div className="flex gap-2">
        <div className="w-32 h-10 bg-gray-200 rounded animate-pulse" />
        <div className="w-24 h-10 bg-primary/20 rounded animate-pulse" />
      </div>
    </div>
    
    {/* Filters */}
    <div className="flex gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="w-32 h-10 bg-gray-200 rounded animate-pulse" />
      ))}
    </div>
    
    {/* Users table */}
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-6 bg-gray-200 rounded w-24" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-100 rounded w-24" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-16 h-6 bg-gray-200 rounded" />
                <div className="w-8 h-8 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

// Loading skeleton for system settings
const SystemPageSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("space-y-6", className)}>
    <div className="flex items-center justify-between">
      <div>
        <div className="h-8 bg-gray-200 rounded w-40 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-56 animate-pulse" />
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-4 bg-gray-100 rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

// Lazy-loaded admin components
export const LazyAdminDashboard = dynamic(
  () => import('./dashboard-page').then(mod => ({
    default: mod.AdminDashboardPage
  })),
  {
    loading: () => <AdminPageSkeleton title="Admin Dashboard" description="Platform overview and quick actions" />,
    ssr: false
  }
);

export const LazyAdminAnalyticsPage = dynamic(
  () => import('./analytics-page').then(mod => ({
    default: mod.AdminAnalyticsPage
  })),
  {
    loading: () => <AnalyticsPageSkeleton />,
    ssr: false
  }
);

export const LazyAdminUsersPage = dynamic(
  () => import('./users-page').then(mod => ({
    default: mod.AdminUsersPage
  })),
  {
    loading: () => <UsersPageSkeleton />,
    ssr: false
  }
);

export const LazyAdminSystemPage = dynamic(
  () => import('./system-page').then(mod => ({
    default: mod.AdminSystemPage
  })),
  {
    loading: () => <SystemPageSkeleton />,
    ssr: false
  }
);

export const LazyAdminSessionsPage = dynamic(
  () => import('./sessions-page').then(mod => ({
    default: mod.AdminSessionsPage
  })),
  {
    loading: () => <AdminPageSkeleton title="Sessions Management" description="View and manage all platform sessions" />,
    ssr: false
  }
);

export const LazyAdminAuditPage = dynamic(
  () => import('./audit-page').then(mod => ({
    default: mod.AdminAuditPage
  })),
  {
    loading: () => <AdminPageSkeleton title="Audit Logs" description="Review system audit logs and activity" />,
    ssr: false
  }
);

export const LazySystemHealthDisplay = dynamic(
  () => import('./system-health-display').then(mod => ({ 
    default: mod.SystemHealthDisplay 
  })),
  {
    loading: () => (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 border rounded animate-pulse">
            <div className="space-y-1">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-3 bg-gray-100 rounded w-32" />
            </div>
            <div className="w-12 h-6 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    ),
    ssr: false
  }
);

export const LazyNotificationAnalyticsDashboard = dynamic(
  () => import('./notification-analytics-dashboard').then(mod => ({ 
    default: mod.NotificationAnalyticsDashboard 
  })),
  {
    loading: () => <AnalyticsPageSkeleton />,
    ssr: false
  }
);

export const LazyMfaAdminSettings = dynamic(
  () => import('./mfa-admin-settings').then(mod => ({ 
    default: mod.MfaAdminSettings 
  })),
  {
    loading: () => (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded">
              <div className="space-y-1">
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-3 bg-gray-100 rounded w-24" />
              </div>
              <div className="w-16 h-8 bg-gray-200 rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    ),
    ssr: false
  }
);

// Admin dashboard widgets (data-heavy components)
export const LazyUserManagementTable = dynamic(
  () => import('../dashboard/widgets/user-management-table').then(mod => ({ 
    default: mod.UserManagementTable 
  })),
  {
    loading: () => <UsersPageSkeleton />,
    ssr: false
  }
);

export const LazyDataTable = dynamic(
  () => import('../dashboard/widgets/data-table').then(mod => ({ 
    default: mod.DataTable 
  })),
  {
    loading: () => (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    ),
    ssr: false
  }
);

// Wrapper component for error handling
interface LazyAdminWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

export const LazyAdminWrapper = ({ 
  children, 
  fallback,
  onError 
}: LazyAdminWrapperProps) => {
  try {
    return (
      <Suspense 
        fallback={fallback || <AdminPageSkeleton />}
      >
        {children}
      </Suspense>
    );
  } catch (error) {
    if (onError && error instanceof Error) {
      onError(error);
    }
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-destructive mb-4">
            <Shield className="h-12 w-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Admin Component Unavailable</h3>
          </div>
          <p className="text-muted-foreground mb-4">
            Unable to load admin dashboard component
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }
};

// Export skeletons for reuse
export {
  AdminPageSkeleton,
  AnalyticsPageSkeleton,
  UsersPageSkeleton,
  SystemPageSkeleton
};