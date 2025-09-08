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
      default: 'border-2 border-border/40 bg-gradient-to-br from-card/80 to-card/70 backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-sm shadow-soft hover:shadow-medium transition-all duration-200',
      ghost: 'border-0 bg-transparent hover:bg-accent/20 backdrop-blur-sm',
      filled: 'border-2 border-border/30 bg-gradient-to-br from-muted/50 to-muted/70 hover:from-muted/60 hover:to-muted/80 shadow-soft backdrop-blur-sm',
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
              'flex w-full rounded-xl ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-semibold placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 font-medium',
              sizeClasses[inputSize],
              variantClasses[variant],
              error && 'border-destructive/60 focus-visible:ring-destructive/30 focus-visible:border-destructive',
              LeftIcon && 'pl-12',
              RightIcon && 'pr-12',
              'touch-manipulation',
              'focus:scale-[1.02] hover:scale-[1.01]',
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
