'use client';

import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

export type VisuallyHiddenProps = React.HTMLAttributes<HTMLSpanElement>

export const VisuallyHidden = forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          // Screen reader only styles
          'absolute',
          'w-px h-px',
          'p-0 m-[-1px]',
          'overflow-hidden',
          'clip-path-[inset(50%)]',
          'border-0',
          'whitespace-nowrap',
          
          // Alternative approach using sr-only if clip-path not supported
          'sr-only',
          
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

VisuallyHidden.displayName = 'VisuallyHidden';