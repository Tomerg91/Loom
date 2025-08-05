import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
  helperText?: string;
  variant?: 'default' | 'ghost' | 'filled';
  textareaSize?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  maxLength?: number;
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
  autoResize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    error,
    label,
    helperText,
    variant = 'default',
    textareaSize = 'md',
    showCount = false,
    maxLength,
    resize = 'vertical',
    autoResize = false,
    id,
    ...props 
  }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
    const [value, setValue] = React.useState(props.defaultValue?.toString() || '');
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Auto-resize functionality
    React.useEffect(() => {
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [value, autoResize]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      props.onChange?.(e);
    };

    const sizeClasses = {
      sm: 'min-h-[60px] px-2 py-1 text-sm',
      md: 'min-h-[80px] px-3 py-2 text-sm',
      lg: 'min-h-[120px] px-4 py-3 text-base',
    };

    const variantClasses = {
      default: 'border border-input bg-background',
      ghost: 'border-0 bg-transparent hover:bg-accent',
      filled: 'border-0 bg-muted hover:bg-muted/80',
    };

    const resizeClasses = {
      none: 'resize-none',
      both: 'resize',
      horizontal: 'resize-x',
      vertical: 'resize-y',
    };

    const currentLength = (props.value?.toString() || value).length;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={textareaId}
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
          <textarea
            id={textareaId}
            className={cn(
              'flex w-full rounded-md ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
              sizeClasses[textareaSize],
              variantClasses[variant],
              resizeClasses[resize],
              error && 'border-destructive focus-visible:ring-destructive',
              // Enhanced mobile styles
              'touch-manipulation',
              // Better focus states for mobile
              'focus:ring-2 focus:ring-offset-1',
              autoResize && 'overflow-hidden',
              className
            )}
            ref={(node) => {
              textareaRef.current = node;
              if (typeof ref === 'function') ref(node);
              else if (ref) ref.current = node;
            }}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
            }
            maxLength={maxLength}
            onChange={handleChange}
            {...props}
          />
          
          {showCount && maxLength && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground pointer-events-none">
              <span className={currentLength > maxLength ? 'text-destructive' : ''}>
                {currentLength}
              </span>
              /{maxLength}
            </div>
          )}
        </div>
        
        {error && (
          <div 
            id={`${textareaId}-error`} 
            role="alert"
            aria-live="polite"
            className="flex items-start space-x-1 text-sm text-destructive"
          >
            <span className="inline-block mt-0.5 h-1 w-1 rounded-full bg-destructive flex-shrink-0"></span>
            <span>{error}</span>
          </div>
        )}
        
        {helperText && !error && (
          <p id={`${textareaId}-helper`} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
        
        {showCount && maxLength && !error && (
          <div className="flex justify-end">
            <span className={cn(
              'text-xs',
              currentLength > maxLength * 0.9 ? 'text-orange-500' : 'text-muted-foreground'
            )}>
              {currentLength} / {maxLength} characters
            </span>
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };