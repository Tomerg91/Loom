'use client';

import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

export interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export const SkipLink = forwardRef<HTMLAnchorElement, SkipLinkProps>(
  ({ href, children, className, ...props }, ref) => {
    return (
      <a
        ref={ref}
        href={href}
        className={cn(
          // Base styles
          'fixed top-0 left-0 z-50 px-4 py-2',
          'bg-primary text-primary-foreground',
          'font-medium text-sm',
          'border border-primary',
          'rounded-md shadow-lg',
          
          // Focus styles
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          
          // Position off-screen by default
          'transform -translate-y-full',
          
          // Show on focus
          'focus:translate-y-0',
          
          // Smooth transition
          'transition-transform duration-150 ease-in-out',
          
          className
        )}
        {...props}
      >
        {children}
      </a>
    );
  }
);

SkipLink.displayName = 'SkipLink';