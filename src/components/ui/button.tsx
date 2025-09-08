import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold tracking-wide ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 will-change-transform active:scale-[0.98] relative overflow-hidden',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground hover:from-primary/95 hover:to-primary/85 shadow-luxury hover:shadow-floating hover:-translate-y-0.5',
        premium: 'bg-gradient-to-br from-champagne-500 to-champagne-600 text-champagne-950 hover:from-champagne-400 hover:to-champagne-500 shadow-gold hover:shadow-floating hover:-translate-y-0.5 font-semibold',
        destructive: 'bg-gradient-to-br from-destructive to-destructive/90 text-destructive-foreground hover:from-destructive/95 hover:to-destructive/85 shadow-soft hover:shadow-strong',
        outline: 'border-2 border-border bg-card/60 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground shadow-soft hover:shadow-luxury hover:border-ring/50',
        secondary: 'bg-gradient-to-br from-secondary to-secondary/95 text-secondary-foreground hover:from-secondary/90 hover:to-secondary/85 shadow-soft hover:shadow-medium',
        ghost: 'hover:bg-accent/80 hover:text-accent-foreground backdrop-blur-sm rounded-lg transition-all duration-200',
        glass: 'glass-morphism text-foreground hover:bg-white/10 backdrop-blur-lg border border-white/20',
        link: 'text-primary underline-offset-4 hover:underline font-medium',
        luxury: 'bg-gradient-luxury text-white shadow-luxury hover:shadow-floating hover:-translate-y-1 font-semibold tracking-wide',
        coach: 'bg-gradient-to-br from-coach-500 to-coach-600 text-white hover:from-coach-400 hover:to-coach-500 shadow-soft hover:shadow-strong',
        client: 'bg-gradient-to-br from-client-500 to-client-600 text-white hover:from-client-400 hover:to-client-500 shadow-soft hover:shadow-strong',
        session: 'bg-gradient-to-br from-session-500 to-session-600 text-white hover:from-session-400 hover:to-session-500 shadow-soft hover:shadow-strong',
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
