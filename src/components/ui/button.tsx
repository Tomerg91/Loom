'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';
import { useLocaleDirection } from '@/modules/i18n/hooks';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-normal tracking-normal ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 will-change-transform active:scale-[0.98] relative overflow-hidden touch-target rtl:flex-row-reverse gap-2',
  {
    variants: {
      variant: {
        // Primary - Soft Teal (Satya Method primary action)
        default: 'bg-teal-700 text-white hover:bg-teal-800 shadow-md hover:shadow-lg hover:-translate-y-0.5 font-normal',
        // Secondary - Warm neutrals
        secondary: 'bg-sand-200 text-sand-700 hover:bg-sand-300 shadow-sm hover:shadow-md hover:-translate-y-0.5',
        // Destructive - Warm Terracotta
        destructive: 'bg-terracotta-700 text-white hover:bg-terracotta-800 shadow-md hover:shadow-lg hover:-translate-y-0.5 font-normal',
        // Success - Moss Green
        success: 'bg-moss-500 text-white hover:bg-moss-600 shadow-md hover:shadow-lg hover:-translate-y-0.5 font-normal',
        // Outline - Grounded border
        outline: 'border-2 border-sand-200 bg-transparent text-sand-700 hover:bg-sand-50 hover:border-teal-400 shadow-sm hover:shadow-md transition-colors',
        // Ghost - Subtle interaction
        ghost: 'text-sand-700 hover:bg-sand-100 hover:text-sand-900 rounded-lg transition-all duration-200',
        // Link - Teal text
        link: 'text-teal-500 underline-offset-4 hover:underline font-normal hover:text-teal-600',
        // Legacy support
        orange: 'bg-terracotta-500 text-white hover:bg-terracotta-600 shadow-md hover:shadow-lg hover:-translate-y-0.5 font-normal',
        red: 'bg-terracotta-500 text-white hover:bg-terracotta-600 shadow-md hover:shadow-lg hover:-translate-y-0.5 font-normal',
      },
      size: {
        default: 'h-11 px-6 py-2.5 text-sm min-h-[44px]',
        sm: 'h-9 px-4 py-2 text-xs rounded-lg min-h-[36px]',
        lg: 'h-13 px-8 py-3 text-base rounded-xl min-h-[52px]',
        icon: 'h-11 w-11 rounded-xl min-w-[44px] min-h-[44px]',
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

type AsChildElementProps = {
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  ['aria-label']?: string;
  ariaLabel?: string;
  ref?: React.Ref<unknown>;
};

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
    const { direction } = useLocaleDirection();

    // Ensure icon-only buttons have proper aria-label
    const shouldHaveAriaLabel = iconOnly && !ariaLabel && !children;
    if (shouldHaveAriaLabel && process.env.NODE_ENV === 'development') {
      console.warn('Icon-only buttons should have an aria-label for accessibility');
    }

    const baseClassName = cn(
      buttonVariants({ variant, size }),
      // Ensure minimum touch target size for mobile
      size === 'icon' && 'min-w-[44px] min-h-[44px]',
      'hover:scale-[1.01] active:scale-[0.99]',
      className,
    );

    const spinnerSpacing = direction === 'rtl' ? 'ml-2' : 'mr-2';
    const spinner = loading ? (
      <svg
        className={cn(spinnerSpacing, 'h-4 w-4 animate-spin shrink-0')}
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
    ) : null;

    const loadingAnnouncement = loading ? (
      <span aria-live="polite" className="sr-only">
        {loadingText}
      </span>
    ) : null;

    if (asChild) {
      if (!React.isValidElement(children)) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Button with `asChild` expects a single React element child.');
        }
        return null;
      }

      const child = children as React.ReactElement<AsChildElementProps>;
      const childProps = child.props;
      const mergedClassName = cn(baseClassName, childProps.className);
      const childAriaLabel = childProps['aria-label'] ?? childProps.ariaLabel;
      const childDisabled = childProps.disabled;
      const originalContent = childProps.children as React.ReactNode;

      return React.cloneElement(child, {
        className: mergedClassName,
        ref,
        disabled: disabled ?? childDisabled ?? loading,
        'aria-disabled': (disabled ?? childDisabled) || loading,
        'aria-busy': loading,
        'aria-label': loading ? loadingText : ariaLabel ?? childAriaLabel,
        dir: child.props?.dir ?? direction,
        'data-locale-direction': direction,
        ...props,
        children: (
          <>
            {spinner}
            <span className={loading ? 'sr-only' : undefined}>
              {originalContent}
            </span>
            {loadingAnnouncement}
          </>
        ),
      });
    }

    return (
      <button
        className={baseClassName}
        ref={ref}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        aria-label={loading ? loadingText : ariaLabel}
        dir={direction}
        data-locale-direction={direction}
        {...props}
      >
        {spinner}
        <span className={loading ? 'sr-only' : undefined}>
          {children}
        </span>
        {loadingAnnouncement}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
