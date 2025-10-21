'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useRef, useEffect, KeyboardEvent } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface MfaVerificationInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
  length?: number;
  className?: string;
  label?: string;
  placeholder?: string;
}

export function MfaVerificationInput({
  value,
  onChange,
  onSubmit,
  error,
  disabled = false,
  autoFocus = false,
  length = 6,
  className,
  label,
  placeholder
}: MfaVerificationInputProps) {
  const t = useTranslations('mfa');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focused, setFocused] = useState<number>(-1);

  const displayLabel = label || t('verification.label');
  const displayPlaceholder = placeholder || t('verification.placeholder');

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Auto-focus first input
  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  // Handle input change
  const handleInputChange = (index: number, inputValue: string) => {
    // Only allow digits
    const digit = inputValue.replace(/[^0-9]/g, '');
    
    if (digit.length > 1) {
      // Handle paste - distribute digits across inputs
      const digits = digit.slice(0, length).split('');
      const newValue = value.split('');
      
      digits.forEach((d, i) => {
        if (index + i < length) {
          newValue[index + i] = d;
        }
      });
      
      const completeValue = newValue.join('').slice(0, length);
      onChange(completeValue);
      
      // Focus the last filled input or next empty input
      const nextIndex = Math.min(index + digits.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      
      // Auto-submit if complete
      if (completeValue.length === length && onSubmit) {
        setTimeout(onSubmit, 100);
      }
    } else {
      // Single digit input
      const newValue = value.split('');
      newValue[index] = digit;
      const completeValue = newValue.join('').slice(0, length);
      onChange(completeValue);
      
      // Move to next input if digit entered
      if (digit && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
      
      // Auto-submit if complete
      if (completeValue.length === length && onSubmit) {
        setTimeout(onSubmit, 100);
      }
    }
  };

  // Handle key down
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Backspace':
        if (!value[index] && index > 0) {
          // Move to previous input if current is empty
          inputRefs.current[index - 1]?.focus();
        } else {
          // Clear current input
          const newValue = value.split('');
          newValue[index] = '';
          onChange(newValue.join(''));
        }
        break;
        
      case 'Delete':
        // Clear current input
        const newValue = value.split('');
        newValue[index] = '';
        onChange(newValue.join(''));
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        if (index > 0) {
          inputRefs.current[index - 1]?.focus();
        }
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        if (index < length - 1) {
          inputRefs.current[index + 1]?.focus();
        }
        break;
        
      case 'Enter':
        if (value.length === length && onSubmit) {
          e.preventDefault();
          onSubmit();
        }
        break;
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/[^0-9]/g, '').slice(0, length);
    
    if (digits) {
      onChange(digits.padEnd(length, '').slice(0, length));
      
      // Focus the last input with content or the last input
      const focusIndex = Math.min(digits.length - 1, length - 1);
      inputRefs.current[focusIndex]?.focus();
      
      // Auto-submit if complete
      if (digits.length === length && onSubmit) {
        setTimeout(onSubmit, 100);
      }
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {displayLabel && (
        <Label className="text-sm font-medium">
          {displayLabel}
        </Label>
      )}
      
      <div 
        className="flex items-center justify-center space-x-2"
        onPaste={handlePaste}
      >
        {Array.from({ length }, (_, index) => (
          <Input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={value[index] || ''}
            onChange={(e) => handleInputChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={() => setFocused(index)}
            onBlur={() => setFocused(-1)}
            disabled={disabled}
            placeholder={focused === index ? '' : displayPlaceholder[index] || '•'}
            className={cn(
              'w-12 h-12 text-center text-lg font-semibold',
              'focus:ring-2 focus:ring-primary focus:ring-offset-1',
              error && 'border-destructive focus:ring-destructive',
              value[index] && 'bg-primary/5 border-primary'
            )}
            aria-label={`${displayLabel} digit ${index + 1}`}
            aria-describedby={error ? 'verification-error' : undefined}
            data-testid={`verification-input-${index}`}
          />
        ))}
      </div>
      
      {error && (
        <Alert variant="destructive" id="verification-error">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          {t('verification.help')}
        </p>
      </div>
    </div>
  );
}