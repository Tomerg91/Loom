'use client';

import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

export interface LiveRegionProps extends React.HTMLAttributes<HTMLDivElement> {
  priority?: 'polite' | 'assertive';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  busy?: boolean;
}

export const LiveRegion = forwardRef<HTMLDivElement, LiveRegionProps>(
  ({ 
    priority = 'polite', 
    atomic = true, 
    relevant = 'all',
    busy = false,
    className, 
    children, 
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        aria-live={priority}
        aria-atomic={atomic}
        aria-relevant={relevant}
        aria-busy={busy}
        className={cn(
          // Screen reader only - visually hidden but accessible
          'sr-only',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

LiveRegion.displayName = 'LiveRegion';

// Status live region for status updates
export const StatusRegion = forwardRef<HTMLDivElement, Omit<LiveRegionProps, 'priority'>>(
  ({ className, ...props }, ref) => {
    return (
      <LiveRegion
        ref={ref}
        priority="polite"
        role="status"
        className={className}
        {...props}
      />
    );
  }
);

StatusRegion.displayName = 'StatusRegion';

// Alert live region for important announcements
export const AlertRegion = forwardRef<HTMLDivElement, Omit<LiveRegionProps, 'priority'>>(
  ({ className, ...props }, ref) => {
    return (
      <LiveRegion
        ref={ref}
        priority="assertive"
        role="alert"
        className={className}
        {...props}
      />
    );
  }
);

AlertRegion.displayName = 'AlertRegion';