import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border border-sand-200 px-2.5 py-0.5 text-xs font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2',
  {
    variants: {
      variant: {
        // Primary - Soft Teal
        default: 'border-transparent bg-teal-100 text-teal-800 hover:bg-teal-200',
        // Secondary - Warm neutrals
        secondary: 'border-transparent bg-sand-200 text-sand-700 hover:bg-sand-300',
        // Destructive - Warm Terracotta
        destructive: 'border-transparent bg-terracotta-100 text-terracotta-800 hover:bg-terracotta-200',
        // Success - Moss Green
        success: 'border-transparent bg-moss-100 text-moss-800 hover:bg-moss-200',
        // Outline - Grounded border
        outline: 'text-sand-700 border-sand-200',
        // Warning
        warning: 'border-transparent bg-terracotta-100 text-terracotta-800 hover:bg-terracotta-200',
        // Info
        info: 'border-transparent bg-teal-100 text-teal-800 hover:bg-teal-200',
        // Session status badges
        scheduled: 'border-transparent bg-teal-100 text-teal-800',
        'in-progress': 'border-transparent bg-terracotta-100 text-terracotta-800',
        completed: 'border-transparent bg-moss-100 text-moss-800',
        cancelled: 'border-transparent bg-sand-200 text-sand-600',
        rescheduled: 'border-transparent bg-terracotta-100 text-terracotta-700',
        // User role badges
        client: 'border-transparent bg-client-100 text-client-800',
        coach: 'border-transparent bg-coach-100 text-coach-800',
        admin: 'border-transparent bg-teal-100 text-teal-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
