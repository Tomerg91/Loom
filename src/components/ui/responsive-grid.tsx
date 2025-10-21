import * as React from 'react';

import { cn } from '@/lib/utils';

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  autoFit?: boolean;
  minItemWidth?: string;
}

export const ResponsiveGrid = React.forwardRef<HTMLDivElement, ResponsiveGridProps>(
  ({ 
    children, 
    className,
    cols = { default: 1, sm: 2, lg: 3, xl: 4 },
    gap = 'md',
    autoFit = false,
    minItemWidth = '280px',
    ...props 
  }, ref) => {
    const gapClasses = {
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    };

    // Auto-fit grid using CSS grid
    if (autoFit) {
      return (
        <div
          ref={ref}
          className={cn('grid', gapClasses[gap], className)}
          style={{
            gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`,
          }}
          {...props}
        >
          {children}
        </div>
      );
    }

    // Responsive grid with specific breakpoints
    const gridColsClasses = [];
    
    if (cols.default) {
      gridColsClasses.push(`grid-cols-${cols.default}`);
    }
    if (cols.sm) {
      gridColsClasses.push(`sm:grid-cols-${cols.sm}`);
    }
    if (cols.md) {
      gridColsClasses.push(`md:grid-cols-${cols.md}`);
    }
    if (cols.lg) {
      gridColsClasses.push(`lg:grid-cols-${cols.lg}`);
    }
    if (cols.xl) {
      gridColsClasses.push(`xl:grid-cols-${cols.xl}`);
    }

    return (
      <div
        ref={ref}
        className={cn(
          'grid',
          gapClasses[gap],
          ...gridColsClasses,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ResponsiveGrid.displayName = 'ResponsiveGrid';

// Preset grid layouts for common use cases
export const StatsGrid = React.forwardRef<HTMLDivElement, Omit<ResponsiveGridProps, 'cols'>>(
  ({ children, ...props }, ref) => (
    <ResponsiveGrid
      ref={ref}
      cols={{ default: 1, sm: 2, lg: 4 }}
      gap="md"
      {...props}
    >
      {children}
    </ResponsiveGrid>
  )
);
StatsGrid.displayName = 'StatsGrid';

export const CardsGrid = React.forwardRef<HTMLDivElement, Omit<ResponsiveGridProps, 'cols'>>(
  ({ children, ...props }, ref) => (
    <ResponsiveGrid
      ref={ref}
      cols={{ default: 1, md: 2, xl: 3 }}
      gap="lg"
      {...props}
    >
      {children}
    </ResponsiveGrid>
  )
);
CardsGrid.displayName = 'CardsGrid';

export const ListGrid = React.forwardRef<HTMLDivElement, Omit<ResponsiveGridProps, 'cols'>>(
  ({ children, ...props }, ref) => (
    <ResponsiveGrid
      ref={ref}
      cols={{ default: 1, lg: 2 }}
      gap="md"
      {...props}
    >
      {children}
    </ResponsiveGrid>
  )
);
ListGrid.displayName = 'ListGrid';

export const AutoFitGrid = React.forwardRef<HTMLDivElement, Omit<ResponsiveGridProps, 'autoFit'>>(
  ({ children, minItemWidth = '300px', ...props }, ref) => (
    <ResponsiveGrid
      ref={ref}
      autoFit
      minItemWidth={minItemWidth}
      gap="md"
      {...props}
    >
      {children}
    </ResponsiveGrid>
  )
);
AutoFitGrid.displayName = 'AutoFitGrid';