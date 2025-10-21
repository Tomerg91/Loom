import * as React from 'react';

import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'rectangular', animation = 'pulse', ...props }, ref) => {
    const baseClasses = 'bg-muted';
    
    const variantClasses = {
      text: 'h-4 w-full',
      circular: 'rounded-full',
      rectangular: '',
      rounded: 'rounded-md',
    };
    
    const animationClasses = {
      pulse: 'animate-pulse',
      wave: 'animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]',
      none: '',
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          animationClasses[animation],
          className
        )}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Pre-built skeleton components for common patterns
const SkeletonText = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant'>>(
  ({ className, ...props }, ref) => (
    <Skeleton 
      ref={ref} 
      variant="text" 
      className={cn('h-4', className)} 
      {...props} 
    />
  )
);
SkeletonText.displayName = 'SkeletonText';

const SkeletonAvatar = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant'>>(
  ({ className, ...props }, ref) => (
    <Skeleton 
      ref={ref} 
      variant="circular" 
      className={cn('h-10 w-10', className)} 
      {...props} 
    />
  )
);
SkeletonAvatar.displayName = 'SkeletonAvatar';

const SkeletonButton = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant'>>(
  ({ className, ...props }, ref) => (
    <Skeleton 
      ref={ref} 
      variant="rounded" 
      className={cn('h-10 w-20', className)} 
      {...props} 
    />
  )
);
SkeletonButton.displayName = 'SkeletonButton';

const SkeletonCard = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant'>>(
  ({ className, children, ...props }, ref) => (
    <div 
      ref={ref}
      className={cn('rounded-lg border bg-card p-6 space-y-4', className)}
      {...props}
    >
      {children || (
        <>
          <div className="space-y-2">
            <SkeletonText className="w-3/4" />
            <SkeletonText className="w-1/2" />
          </div>
          <Skeleton className="h-32 w-full rounded" />
        </>
      )}
    </div>
  )
);
SkeletonCard.displayName = 'SkeletonCard';

const SkeletonTable = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant'> & { rows?: number }>(
  ({ className, rows = 5, ...props }, ref) => (
    <div 
      ref={ref}
      className={cn('space-y-4', className)}
      {...props}
    >
      {/* Table header */}
      <div className="flex space-x-4">
        <SkeletonText className="w-1/4" />
        <SkeletonText className="w-1/4" />
        <SkeletonText className="w-1/4" />
        <SkeletonText className="w-1/4" />
      </div>
      
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <SkeletonAvatar className="h-8 w-8" />
          <div className="flex-1 space-y-2">
            <SkeletonText className="w-3/4" />
            <SkeletonText className="w-1/2" />
          </div>
          <SkeletonButton className="w-16" />
        </div>
      ))}
    </div>
  )
);
SkeletonTable.displayName = 'SkeletonTable';

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonTable,
};