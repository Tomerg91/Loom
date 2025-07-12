'use client';

import { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  showToggle?: boolean;
  toggleClassName?: string;
}

/**
 * Enhanced password input component with visibility toggle
 * Consolidates password input logic from auth forms
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showToggle = true, toggleClassName, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
      setShowPassword(prev => !prev);
    };

    if (!showToggle) {
      return (
        <Input
          {...props}
          type="password"
          className={className}
          ref={ref}
        />
      );
    }

    return (
      <div className="relative">
        <Input
          {...props}
          type={showPassword ? 'text' : 'password'}
          className={cn('pr-10', className)}
          ref={ref}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent',
            'focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
            toggleClassName
          )}
          onClick={togglePasswordVisibility}
          disabled={props.disabled}
          tabIndex={-1}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

/**
 * Password strength indicator component
 */
export interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: 'Enter password', color: 'bg-gray-200' };
    
    let score = 0;
    
    // Length check
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    
    // Character variety checks
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    const strengthMap = {
      0: { label: 'Too weak', color: 'bg-red-500' },
      1: { label: 'Too weak', color: 'bg-red-500' },
      2: { label: 'Weak', color: 'bg-orange-500' },
      3: { label: 'Fair', color: 'bg-yellow-500' },
      4: { label: 'Good', color: 'bg-blue-500' },
      5: { label: 'Strong', color: 'bg-green-500' },
      6: { label: 'Very strong', color: 'bg-green-600' },
    };

    const strength = strengthMap[Math.min(score, 6) as keyof typeof strengthMap];
    
    return {
      score: Math.min(score, 6),
      label: strength.label,
      color: strength.color,
    };
  };

  const { score, label, color } = getPasswordStrength(password);
  const percentage = (score / 6) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Password strength</span>
        <span className={cn(
          'text-sm font-medium',
          score <= 2 ? 'text-red-600' : 
          score <= 3 ? 'text-yellow-600' : 
          score <= 4 ? 'text-blue-600' : 'text-green-600'
        )}>
          {label}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={cn('h-2 rounded-full transition-all duration-300', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {password && (
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="grid grid-cols-2 gap-2">
            <span className={password.length >= 8 ? 'text-green-600' : 'text-red-600'}>
              ✓ 8+ characters
            </span>
            <span className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-red-600'}>
              ✓ Uppercase letter
            </span>
            <span className={/[a-z]/.test(password) ? 'text-green-600' : 'text-red-600'}>
              ✓ Lowercase letter
            </span>
            <span className={/[0-9]/.test(password) ? 'text-green-600' : 'text-red-600'}>
              ✓ Number
            </span>
          </div>
        </div>
      )}
    </div>
  );
}