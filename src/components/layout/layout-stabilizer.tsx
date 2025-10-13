'use client';

import React from 'react';

import { OptimizedImage } from '@/components/ui/optimized-image';
import { cn } from '@/lib/utils';

/**
 * Layout Stabilizer - Reduces Cumulative Layout Shift (CLS)
 * by providing consistent layouts and preventing content jumps
 */

interface LayoutStabilizerProps {
  children: React.ReactNode;
  className?: string;
  minHeight?: string | number;
  reserveSpace?: boolean;
  skeleton?: React.ReactNode;
  isLoading?: boolean;
}

export const LayoutStabilizer = React.memo(({
  children,
  className,
  minHeight = 'auto',
  reserveSpace = true,
  skeleton,
  isLoading = false
}: LayoutStabilizerProps) => {
  const style = React.useMemo(() => ({
    minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
    ...(reserveSpace && { 
      contain: 'layout size',
      containIntrinsicSize: 'layout-size',
      contentVisibility: 'auto'
    })
  }), [minHeight, reserveSpace]);

  if (isLoading && skeleton) {
    return (
      <div className={cn('animate-pulse', className)} style={style}>
        {skeleton}
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
});

LayoutStabilizer.displayName = 'LayoutStabilizer';

// Card skeleton for consistent loading states
export const CardSkeleton = React.memo(({ 
  lines = 3, 
  hasAvatar = false, 
  hasAction = false,
  className 
}: {
  lines?: number;
  hasAvatar?: boolean;
  hasAction?: boolean;
  className?: string;
}) => (
  <div className={cn('p-6 space-y-4', className)}>
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {hasAvatar && <div className="h-10 w-10 rounded-full bg-muted" />}
        <div className="space-y-2">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-3 w-24 bg-muted rounded" />
        </div>
      </div>
      {hasAction && <div className="h-8 w-16 bg-muted rounded" />}
    </div>
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i}
          className={cn(
            'h-3 bg-muted rounded',
            i === lines - 1 ? 'w-2/3' : 'w-full'
          )}
        />
      ))}
    </div>
  </div>
));

CardSkeleton.displayName = 'CardSkeleton';

// List skeleton for session lists
export const SessionListSkeleton = React.memo(({ count = 3 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="border rounded-lg">
        <CardSkeleton hasAvatar hasAction lines={2} />
      </div>
    ))}
  </div>
));

SessionListSkeleton.displayName = 'SessionListSkeleton';

// Stats card skeleton
export const StatsCardSkeleton = React.memo(() => (
  <div className="p-6 space-y-4">
    <div className="flex items-center justify-between">
      <div className="h-4 w-24 bg-muted rounded" />
      <div className="h-4 w-4 bg-muted rounded" />
    </div>
    <div className="h-8 w-16 bg-muted rounded" />
    <div className="h-3 w-20 bg-muted rounded" />
  </div>
));

StatsCardSkeleton.displayName = 'StatsCardSkeleton';

// Grid skeleton for dashboard
export const DashboardGridSkeleton = React.memo(() => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="border rounded-lg">
        <StatsCardSkeleton />
      </div>
    ))}
  </div>
));

DashboardGridSkeleton.displayName = 'DashboardGridSkeleton';

// Image with dimensions to prevent CLS
export const StableImage = React.memo(({
  src,
  alt,
  width,
  height,
  className,
  ...props
}: {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  [key: string]: any;
}) => {
  return (
    <div 
      className={cn('relative overflow-hidden', className)}
      style={{ width, height }}
    >
      {src ? (
        <OptimizedImage
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-full object-cover"
          loading="lazy"
          {...props}
        />
      ) : (
        <div 
          className="w-full h-full bg-muted flex items-center justify-center"
          role="img"
          aria-label={alt}
        />
      )}
    </div>
  );
});

StableImage.displayName = 'StableImage';

// Navigation placeholder to prevent mobile menu CLS
export const NavigationPlaceholder = React.memo(() => (
  <nav 
    className="bg-card border-b border-border sticky top-0 z-50" 
    style={{ height: '64px' }}
    aria-hidden="true"
  >
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16 items-center">
        <div className="flex items-center space-x-8">
          <div className="h-8 w-20 bg-muted rounded" />
        </div>
        <div className="flex items-center space-x-4">
          <div className="h-8 w-8 bg-muted rounded-full" />
        </div>
      </div>
    </div>
  </nav>
));

NavigationPlaceholder.displayName = 'NavigationPlaceholder';