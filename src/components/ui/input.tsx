import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
  leftIcon?: React.ComponentType<{ className?: string }>;
  rightIcon?: React.ComponentType<{ className?: string }>;
  onRightIconClick?: () => void;
  variant?: 'default' | 'ghost' | 'filled';
  inputSize?: 'sm' | 'md' | 'lg';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type, 
    error, 
    label, 
    helperText, 
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    onRightIconClick,
    variant = 'default',
    inputSize = 'md',
    id, 
    ...props 
  }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    const sizeClasses = {
      sm: 'h-10 px-4 py-2 text-sm',
      md: 'h-12 px-5 py-3 text-base',
      lg: 'h-14 px-6 py-4 text-lg',
    };

    const variantClasses = {
      default: 'border border-neutral-300 bg-white hover:border-orange-500 focus:border-orange-500 shadow-sm hover:shadow-md transition-all duration-200',
      ghost: 'border-0 bg-transparent hover:bg-neutral-50',
      filled: 'border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 focus:bg-white focus:border-orange-500 shadow-sm',
    };

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
              'block mb-2'
            )}
          >
            {label}
            {props.required && <span className="text-destructive ml-1" aria-label="required">*</span>}
          </label>
        )}
        
        <div className="relative">
          {LeftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              <LeftIcon className="h-4 w-4" />
            </div>
          )}
          
          <input
            type={type}
            id={inputId}
            className={cn(
              'flex w-full rounded-xl ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-light placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 font-light',
              sizeClasses[inputSize],
              variantClasses[variant],
              error && 'border-red-500 focus-visible:ring-red-500/30 focus-visible:border-red-500',
              LeftIcon && 'pl-12',
              RightIcon && 'pr-12',
              'touch-manipulation',
              className
            )}
            ref={ref}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          
          {RightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {onRightIconClick ? (
                <button
                  type="button"
                  onClick={onRightIconClick}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1 rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  aria-label="Toggle input action"
                >
                  <RightIcon className="h-4 w-4" />
                </button>
              ) : (
                <RightIcon className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          )}
        </div>
        
        {error && (
          <div 
            id={`${inputId}-error`} 
            role="alert"
            aria-live="polite"
            className="flex items-start space-x-1 text-sm text-destructive"
          >
            <span className="inline-block mt-0.5 h-1 w-1 rounded-full bg-destructive flex-shrink-0"></span>
            <span>{error}</span>
          </div>
        )}
        
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
