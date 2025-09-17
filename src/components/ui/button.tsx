import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-light tracking-wide ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 will-change-transform active:scale-[0.98] relative overflow-hidden',
  {
    variants: {
      variant: {
        // Primary Orange Button (Dark Orange)
        default: 'bg-orange-600 text-white hover:bg-orange-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 font-normal',
        // Secondary Black Button
        secondary: 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-md hover:shadow-lg hover:-translate-y-0.5 font-normal',
        // Destructive Red Button
        destructive: 'bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-lg hover:-translate-y-0.5 font-normal',
        // Outline Button
        outline: 'border-2 border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 hover:border-orange-500 shadow-sm hover:shadow-md',
        // Ghost Button
        ghost: 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 rounded-lg transition-all duration-200',
        // Link Button
        link: 'text-orange-600 underline-offset-4 hover:underline font-normal hover:text-orange-700',
        // Orange Primary (alternative)
        orange: 'bg-orange-500 text-white hover:bg-orange-600 shadow-md hover:shadow-lg hover:-translate-y-0.5 font-normal',
        // Red Accent
        red: 'bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-lg hover:-translate-y-0.5 font-normal',
      },
      size: {
        default: 'h-11 px-6 py-2.5 text-sm',
        sm: 'h-9 px-4 py-2 text-xs rounded-lg',
        lg: 'h-13 px-8 py-3 text-base rounded-xl',
        icon: 'h-11 w-11 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  iconOnly?: boolean;
  'aria-label'?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false, 
    loadingText = 'Loading...', 
    iconOnly = false,
    disabled, 
    children, 
    'aria-label': ariaLabel,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : 'button';
    
    // Ensure icon-only buttons have proper aria-label
    const shouldHaveAriaLabel = iconOnly && !ariaLabel && !children;
    if (shouldHaveAriaLabel && process.env.NODE_ENV === 'development') {
      console.warn('Icon-only buttons should have an aria-label for accessibility');
    }
    
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          // Ensure minimum touch target size for mobile
          size === 'icon' && 'min-w-[44px] min-h-[44px]',
          'hover:scale-[1.01] active:scale-[0.99]'
        )}
        ref={ref}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        aria-label={loading ? loadingText : ariaLabel}
        {...props}
      >
        {loading && (
          <svg
            className="rtl:ml-2 rtl:mr-0 ltr:mr-2 ltr:ml-0 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        <span className={loading ? 'sr-only' : undefined}>
          {children}
        </span>
        {loading && (
          <span aria-live="polite" className="sr-only">
            {loadingText}
          </span>
        )}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
