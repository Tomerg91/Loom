'use client';

import { HelpCircle } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface HelpTooltipProps {
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

/**
 * A help icon with tooltip for providing contextual guidance in forms
 * Shows on hover/focus for desktop and tap for mobile
 */
export function HelpTooltip({ content, side = 'right', className }: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const sideClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900',
  };

  return (
    <div className={cn('relative inline-flex', className)}>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        onClick={(e) => {
          e.preventDefault();
          setIsVisible(!isVisible);
        }}
        aria-label="Help information"
      >
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
      </button>

      {isVisible && (
        <div
          className={cn(
            'absolute z-50 w-64 rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            sideClasses[side]
          )}
          role="tooltip"
        >
          {content}
          <div
            className={cn('absolute h-0 w-0 border-4', arrowClasses[side])}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
