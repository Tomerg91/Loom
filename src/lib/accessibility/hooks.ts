import { useEffect, useRef, useState, useCallback } from 'react';
import { FocusManager, ScreenReaderAnnouncer } from './aria';

// Focus management hook
export function useFocusManagement(isOpen: boolean) {
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      
      // Focus first focusable element
      setTimeout(() => {
        if (containerRef.current) {
          const firstFocusable = FocusManager.getFirstFocusableElement(containerRef.current);
          firstFocusable?.focus();
        }
      }, 0);
    } else {
      // Restore focus when closing
      FocusManager.restoreFocus(previouslyFocusedElement.current);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Tab' && containerRef.current) {
      FocusManager.trapFocus(containerRef.current, event);
    }
    if (event.key === 'Escape' && isOpen) {
      // Let parent handle escape
      event.stopPropagation();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  return containerRef;
}

// Screen reader announcements hook
export function useAnnouncer() {
  useEffect(() => {
    ScreenReaderAnnouncer.init();
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    ScreenReaderAnnouncer.announce(message, priority);
  }, []);

  return announce;
}

// Live region hook for dynamic content updates
export function useLiveRegion(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announce = useAnnouncer();
  
  useEffect(() => {
    if (message) {
      announce(message, priority);
    }
  }, [message, priority, announce]);
}

// Keyboard navigation hook
export function useKeyboardNavigation(
  items: HTMLElement[],
  onSelect?: (index: number) => void,
  isActive = true
) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isActive || items.length === 0) return;

    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'ArrowDown':
        event.preventDefault();
        newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect?.(currentIndex);
        return;
      default:
        return;
    }

    setCurrentIndex(newIndex);
    items[newIndex]?.focus();
  }, [currentIndex, items, onSelect, isActive]);

  return {
    currentIndex,
    setCurrentIndex,
    handleKeyDown,
  };
}

// Reduced motion preference hook
export function useReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReduced(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

// High contrast preference hook
export function useHighContrast() {
  const [prefersHigh, setPrefersHigh] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHigh(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersHigh(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersHigh;
}

// Skip link hook
export function useSkipLink() {
  const skipLinkRef = useRef<HTMLAnchorElement>(null);

  const showSkipLink = useCallback(() => {
    if (skipLinkRef.current) {
      skipLinkRef.current.style.transform = 'translateY(0)';
      skipLinkRef.current.focus();
    }
  }, []);

  const hideSkipLink = useCallback(() => {
    if (skipLinkRef.current) {
      skipLinkRef.current.style.transform = 'translateY(-100%)';
    }
  }, []);

  return {
    skipLinkRef,
    showSkipLink,
    hideSkipLink,
  };
}

// ARIA attributes hook
export function useAriaAttributes(options: {
  label?: string;
  describedBy?: string[];
  expanded?: boolean;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  live?: 'polite' | 'assertive' | 'off';
}) {
  const ariaProps: Record<string, string | boolean | undefined> = {};

  if (options.label) {
    ariaProps['aria-label'] = options.label;
  }

  if (options.describedBy && options.describedBy.length > 0) {
    ariaProps['aria-describedby'] = options.describedBy.join(' ');
  }

  if (options.expanded !== undefined) {
    ariaProps['aria-expanded'] = options.expanded;
  }

  if (options.disabled) {
    ariaProps['aria-disabled'] = true;
  }

  if (options.required) {
    ariaProps['aria-required'] = true;
  }

  if (options.invalid) {
    ariaProps['aria-invalid'] = true;
  }

  if (options.live) {
    ariaProps['aria-live'] = options.live;
  }

  return ariaProps;
}

// Form accessibility hook
export function useFormAccessibility(formId: string) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const announce = useAnnouncer();

  const setFieldError = useCallback((fieldName: string, error: string) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }));
    announce(`Error in ${fieldName}: ${error}`, 'assertive');
  }, [announce]);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const getFieldProps = useCallback((fieldName: string) => {
    const hasError = fieldName in errors;
    const errorId = hasError ? `${formId}-${fieldName}-error` : undefined;

    return {
      'aria-invalid': hasError,
      'aria-describedby': errorId,
      id: `${formId}-${fieldName}`,
    };
  }, [errors, formId]);

  const getErrorProps = useCallback((fieldName: string) => {
    const hasError = fieldName in errors;
    
    return {
      id: `${formId}-${fieldName}-error`,
      role: 'alert',
      'aria-live': 'polite' as const,
      hidden: !hasError,
    };
  }, [errors, formId]);

  return {
    errors,
    setFieldError,
    clearFieldError,
    getFieldProps,
    getErrorProps,
  };
}

// Loading state accessibility hook
export function useLoadingAnnouncement(isLoading: boolean, message = 'Loading...') {
  const announce = useAnnouncer();

  useEffect(() => {
    if (isLoading) {
      announce(message);
    }
  }, [isLoading, message, announce]);
}

// Touch target size hook
export function useTouchTarget(minSize = 44) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const getTouchTargetStyle = useCallback((currentSize?: number) => {
    if (!isTouchDevice) return {};

    const size = currentSize || minSize;
    return {
      minWidth: `${size}px`,
      minHeight: `${size}px`,
    };
  }, [isTouchDevice, minSize]);

  return {
    isTouchDevice,
    getTouchTargetStyle,
  };
}

// Heading level management hook
export function useHeadingLevel(baseLevel = 1) {
  const [currentLevel, setCurrentLevel] = useState(baseLevel);

  const getHeadingLevel = useCallback((offset = 0) => {
    return Math.min(6, Math.max(1, currentLevel + offset));
  }, [currentLevel]);

  const increaseLevel = useCallback(() => {
    setCurrentLevel(prev => Math.min(6, prev + 1));
  }, []);

  const decreaseLevel = useCallback(() => {
    setCurrentLevel(prev => Math.max(1, prev - 1));
  }, []);

  return {
    currentLevel,
    getHeadingLevel,
    increaseLevel,
    decreaseLevel,
    setCurrentLevel,
  };
}