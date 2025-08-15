'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

// Loading skeleton for session calendar
const SessionCalendarSkeleton = ({ className }: { className?: string }) => (
  <Card className={cn("w-full", className)}>
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
        </CardTitle>
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 animate-pulse">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded border"></div>
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Loading skeleton for session list
const SessionListSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("space-y-4", className)}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Card key={i} className="animate-pulse">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-3 bg-gray-100 rounded w-48" />
            </div>
            <div className="h-8 bg-gray-200 rounded w-20" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Loading skeleton for session booking form
const SessionBookingSkeleton = ({ className }: { className?: string }) => (
  <Card className={cn("w-full", className)}>
    <CardHeader>
      <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
      <div className="h-4 bg-gray-100 rounded w-64 animate-pulse" />
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Form fields */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
      <div className="flex gap-2">
        <div className="h-10 bg-gray-200 rounded w-20 animate-pulse" />
        <div className="h-10 bg-primary/20 rounded w-32 animate-pulse" />
      </div>
    </CardContent>
  </Card>
);

// Lazy-loaded session components
export const LazySessionCalendar = dynamic(
  () => import('./session-calendar').then(mod => ({ 
    default: mod.SessionCalendar 
  })),
  {
    loading: () => <SessionCalendarSkeleton />,
    ssr: false
  }
);

export const LazySessionList = dynamic(
  () => import('./session-list').then(mod => ({ 
    default: mod.SessionList 
  })),
  {
    loading: () => <SessionListSkeleton />,
    ssr: false
  }
);

export const LazyEnhancedSessionList = dynamic(
  () => import('./enhanced-session-list').then(mod => ({ 
    default: mod.EnhancedSessionList 
  })),
  {
    loading: () => <SessionListSkeleton />,
    ssr: false
  }
);

export const LazySessionCalendarView = dynamic(
  () => import('./session-calendar-view').then(mod => ({ 
    default: mod.SessionCalendarView 
  })),
  {
    loading: () => <SessionCalendarSkeleton />,
    ssr: false
  }
);

export const LazySessionTimelineView = dynamic(
  () => import('./session-timeline-view').then(mod => ({ 
    default: mod.SessionTimelineView 
  })),
  {
    loading: () => <SessionListSkeleton />,
    ssr: false
  }
);

export const LazyUnifiedSessionBooking = dynamic(
  () => import('./unified-session-booking').then(mod => ({ 
    default: mod.UnifiedSessionBooking 
  })),
  {
    loading: () => <SessionBookingSkeleton />,
    ssr: false
  }
);

export const LazySessionCreatePage = dynamic(
  () => import('./session-create-page').then(mod => ({ 
    default: mod.SessionCreatePage 
  })),
  {
    loading: () => <SessionBookingSkeleton />,
    ssr: false
  }
);

export const LazySessionEditPage = dynamic(
  () => import('./session-edit-page').then(mod => ({ 
    default: mod.SessionEditPage 
  })),
  {
    loading: () => <SessionBookingSkeleton />,
    ssr: false
  }
);

export const LazySessionDetailsPage = dynamic(
  () => import('./session-details-page').then(mod => ({ 
    default: mod.SessionDetailsPage 
  })),
  {
    loading: () => (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-64 animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </CardContent>
      </Card>
    ),
    ssr: false
  }
);

// Session file manager (heavy due to file operations)
export const LazySessionFileManager = dynamic(
  () => import('./session-file-manager').then(mod => ({ 
    default: mod.SessionFileManager 
  })),
  {
    loading: () => (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    ),
    ssr: false
  }
);

// Wrapper component for better error handling
interface LazySessionWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

export const LazySessionWrapper = ({ 
  children, 
  fallback,
  onError 
}: LazySessionWrapperProps) => {
  try {
    return (
      <Suspense 
        fallback={fallback || <SessionCalendarSkeleton />}
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
        <CardContent className="flex flex-col items-center justify-center h-32 text-center">
          <p className="text-destructive mb-2">Session component unavailable</p>
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
  SessionCalendarSkeleton,
  SessionListSkeleton,
  SessionBookingSkeleton
};