'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X, 
  Bell,
  ExternalLink,
  Clock,
  Loader2
} from 'lucide-react';
import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type EnhancedToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'notification';

export interface EnhancedToastAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'destructive';
}

export interface EnhancedToast {
  id: string;
  type: EnhancedToastType;
  title?: string;
  description: string;
  duration?: number;
  persistent?: boolean;
  dismissible?: boolean;
  action?: EnhancedToastAction;
  progress?: boolean;
  sound?: boolean;
  icon?: React.ReactNode;
  className?: string;
  onDismiss?: () => void;
  onClick?: () => void;
  createdAt: Date;
  updatedAt: Date;
}

interface ToastContextValue {
  toasts: EnhancedToast[];
  toast: {
    success: (description: string, options?: Partial<Omit<EnhancedToast, 'id' | 'type' | 'description'>>) => string;
    error: (description: string, options?: Partial<Omit<EnhancedToast, 'id' | 'type' | 'description'>>) => string;
    warning: (description: string, options?: Partial<Omit<EnhancedToast, 'id' | 'type' | 'description'>>) => string;
    info: (description: string, options?: Partial<Omit<EnhancedToast, 'id' | 'type' | 'description'>>) => string;
    loading: (description: string, options?: Partial<Omit<EnhancedToast, 'id' | 'type' | 'description'>>) => string;
    notification: (description: string, options?: Partial<Omit<EnhancedToast, 'id' | 'type' | 'description'>>) => string;
    custom: (toast: Omit<EnhancedToast, 'id' | 'createdAt' | 'updatedAt'>) => string;
  };
  dismiss: (toastId: string) => void;
  dismissAll: () => void;
  update: (toastId: string, updates: Partial<EnhancedToast>) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  swipeDirection?: 'up' | 'down' | 'left' | 'right';
  enableSounds?: boolean;
}

export function EnhancedToastProvider({
  children,
  maxToasts = 5,
  defaultDuration = 5000,
  position = 'top-right',
  swipeDirection = 'right',
  enableSounds = true,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<EnhancedToast[]>([]);
  const toastTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const audioContext = useRef<AudioContext | null>(null);

  // Initialize audio context for notification sounds
  useEffect(() => {
    if (enableSounds && typeof window !== 'undefined' && window.AudioContext) {
      audioContext.current = new AudioContext();
    }

    return () => {
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, [enableSounds]);

  // Play notification sound
  const playNotificationSound = useCallback((type: EnhancedToastType) => {
    if (!enableSounds || !audioContext.current) return;

    try {
      const frequency = {
        success: 523.25, // C5
        error: 220.00,   // A3
        warning: 329.63, // E4
        info: 440.00,    // A4
        loading: 493.88, // B4
        notification: 659.25, // E5
      }[type];

      const oscillator = audioContext.current.createOscillator();
      const gainNode = audioContext.current.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.current.destination);

      oscillator.frequency.setValueAtTime(frequency, audioContext.current.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + 0.3);

      oscillator.start(audioContext.current.currentTime);
      oscillator.stop(audioContext.current.currentTime + 0.3);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }, [enableSounds]);

  // Auto-dismiss toast after duration
  const scheduleAutoDismiss = useCallback((toast: EnhancedToast) => {
    if (toast.persistent || !toast.duration) return;

    const timeout = setTimeout(() => {
      dismiss(toast.id);
    }, toast.duration);

    toastTimeouts.current.set(toast.id, timeout);
  }, []);

  // Generate unique toast ID
  const generateToastId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Add new toast
  const addToast = useCallback((newToast: Omit<EnhancedToast, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = generateToastId();
    const now = new Date();
    
    const toast: EnhancedToast = {
      ...newToast,
      id,
      duration: newToast.duration ?? defaultDuration,
      dismissible: newToast.dismissible ?? true,
      createdAt: now,
      updatedAt: now,
    };

    setToasts(prev => {
      // Remove excess toasts if we exceed max
      const newToasts = [toast, ...prev];
      if (newToasts.length > maxToasts) {
        const removed = newToasts.slice(maxToasts);
        removed.forEach(t => {
          const timeout = toastTimeouts.current.get(t.id);
          if (timeout) {
            clearTimeout(timeout);
            toastTimeouts.current.delete(t.id);
          }
        });
        return newToasts.slice(0, maxToasts);
      }
      return newToasts;
    });

    // Play sound if enabled
    if (toast.sound !== false) {
      playNotificationSound(toast.type);
    }

    // Schedule auto-dismiss
    scheduleAutoDismiss(toast);

    return id;
  }, [defaultDuration, maxToasts, generateToastId, playNotificationSound, scheduleAutoDismiss]);

  // Dismiss toast
  const dismiss = useCallback((toastId: string) => {
    const timeout = toastTimeouts.current.get(toastId);
    if (timeout) {
      clearTimeout(timeout);
      toastTimeouts.current.delete(toastId);
    }

    setToasts(prev => {
      const toast = prev.find(t => t.id === toastId);
      if (toast?.onDismiss) {
        toast.onDismiss();
      }
      return prev.filter(t => t.id !== toastId);
    });
  }, []);

  // Dismiss all toasts
  const dismissAll = useCallback(() => {
    toastTimeouts.current.forEach(timeout => clearTimeout(timeout));
    toastTimeouts.current.clear();
    setToasts([]);
  }, []);

  // Update toast
  const update = useCallback((toastId: string, updates: Partial<EnhancedToast>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === toastId 
        ? { ...toast, ...updates, updatedAt: new Date() }
        : toast
    ));

    // Reschedule auto-dismiss if duration changed
    if (updates.duration !== undefined) {
      const timeout = toastTimeouts.current.get(toastId);
      if (timeout) {
        clearTimeout(timeout);
        toastTimeouts.current.delete(toastId);
      }

      const toast = toasts.find(t => t.id === toastId);
      if (toast) {
        scheduleAutoDismiss({ ...toast, ...updates } as EnhancedToast);
      }
    }
  }, [toasts, scheduleAutoDismiss]);

  // Toast creator functions
  const toastFunctions = {
    success: (description: string, options: Partial<Omit<EnhancedToast, 'id' | 'type' | 'description'>> = {}) =>
      addToast({ type: 'success', description, ...options }),

    error: (description: string, options: Partial<Omit<EnhancedToast, 'id' | 'type' | 'description'>> = {}) =>
      addToast({ type: 'error', description, ...options }),

    warning: (description: string, options: Partial<Omit<EnhancedToast, 'id' | 'type' | 'description'>> = {}) =>
      addToast({ type: 'warning', description, ...options }),

    info: (description: string, options: Partial<Omit<EnhancedToast, 'id' | 'type' | 'description'>> = {}) =>
      addToast({ type: 'info', description, ...options }),

    loading: (description: string, options: Partial<Omit<EnhancedToast, 'id' | 'type' | 'description'>> = {}) =>
      addToast({ type: 'loading', description, persistent: true, ...options }),

    notification: (description: string, options: Partial<Omit<EnhancedToast, 'id' | 'type' | 'description'>> = {}) =>
      addToast({ type: 'notification', description, ...options }),

    custom: (toast: Omit<EnhancedToast, 'id' | 'createdAt' | 'updatedAt'>) =>
      addToast(toast),
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      toastTimeouts.current.forEach(timeout => clearTimeout(timeout));
      toastTimeouts.current.clear();
    };
  }, []);

  const value: ToastContextValue = {
    toasts,
    toast: toastFunctions,
    dismiss,
    dismissAll,
    update,
  };

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast Container */}
      <div className={cn('fixed z-50 flex flex-col gap-2', positionClasses[position])}>
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <ToastComponent
              key={toast.id}
              toast={toast}
              onDismiss={() => dismiss(toast.id)}
              swipeDirection={swipeDirection}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

interface ToastComponentProps {
  toast: EnhancedToast;
  onDismiss: () => void;
  swipeDirection: 'up' | 'down' | 'left' | 'right';
}

function ToastComponent({ toast, onDismiss, swipeDirection }: ToastComponentProps) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  // Progress animation for auto-dismiss
  useEffect(() => {
    if (toast.persistent || !toast.duration || isPaused) return;

    const startTime = Date.now();
    const duration = toast.duration || 5000; // Default to 5 seconds
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setProgress((remaining / duration) * 100);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [toast.duration, toast.persistent, isPaused]);

  const getToastIcon = () => {
    if (toast.icon) return toast.icon;

    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      case 'loading':
        return <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />;
      case 'notification':
        return <Bell className="h-5 w-5 text-purple-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getToastStyles = () => {
    const baseClasses = 'relative w-full max-w-sm p-4 rounded-lg shadow-lg border bg-background';
    
    switch (toast.type) {
      case 'success':
        return cn(baseClasses, 'border-green-200 bg-green-50');
      case 'error':
        return cn(baseClasses, 'border-red-200 bg-red-50');
      case 'warning':
        return cn(baseClasses, 'border-yellow-200 bg-yellow-50');
      case 'info':
        return cn(baseClasses, 'border-blue-200 bg-blue-50');
      case 'loading':
        return cn(baseClasses, 'border-gray-200 bg-gray-50');
      case 'notification':
        return cn(baseClasses, 'border-purple-200 bg-purple-50');
      default:
        return cn(baseClasses, 'border-gray-200');
    }
  };

  const swipeDirections = {
    up: { y: -100 },
    down: { y: 100 },
    left: { x: -300 },
    right: { x: 300 },
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ 
        opacity: 0, 
        scale: 0.8, 
        ...swipeDirections[swipeDirection] 
      }}
      whileHover={{ scale: 1.02 }}
      drag={toast.dismissible ? swipeDirection === 'up' || swipeDirection === 'down' ? 'y' : 'x' : false}
      dragConstraints={{ [swipeDirection === 'up' || swipeDirection === 'down' ? 'top' : 'left']: 0 }}
      dragElastic={0.2}
      onDragEnd={(_, info) => {
        const threshold = 50;
        const direction = swipeDirection === 'up' || swipeDirection === 'down' ? 'y' : 'x';
        
        if (Math.abs(info.offset[direction]) > threshold) {
          onDismiss();
        }
      }}
      onHoverStart={() => setIsPaused(true)}
      onHoverEnd={() => setIsPaused(false)}
      className={cn(getToastStyles(), toast.className, 'cursor-pointer select-none')}
      onClick={toast.onClick}
    >
      {/* Progress bar */}
      {toast.progress && toast.duration && !toast.persistent && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getToastIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="font-semibold text-sm mb-1">
              {toast.title}
            </div>
          )}
          <div className="text-sm text-gray-700">
            {toast.description}
          </div>

          {/* Action */}
          {toast.action && (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant={toast.action.variant || 'default'}
                onClick={(e) => {
                  e.stopPropagation();
                  toast.action!.onClick();
                }}
              >
                {toast.action.label}
              </Button>
            </div>
          )}

          {/* Timestamp */}
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date().toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>

        {/* Dismiss Button */}
        {toast.dismissible && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 h-6 w-6 p-0 hover:bg-gray-200"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Loading indicator */}
      {toast.type === 'loading' && (
        <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
    </motion.div>
  );
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Convenience hooks for specific toast types
export function useSuccessToast() {
  const { toast } = useToast();
  return toast.success;
}

export function useErrorToast() {
  const { toast } = useToast();
  return toast.error;
}

export function useWarningToast() {
  const { toast } = useToast();
  return toast.warning;
}

export function useInfoToast() {
  const { toast } = useToast();
  return toast.info;
}

export function useLoadingToast() {
  const { toast } = useToast();
  return toast.loading;
}

export function useNotificationToast() {
  const { toast } = useToast();
  return toast.notification;
}

// Advanced toast patterns
export function useAsyncToast() {
  const { toast, update } = useToast();

  return useCallback(
    async (
      promise: Promise<any>,
      options: {
        loading?: string;
        success?: string | ((data: any) => string);
        error?: string | ((error: Error) => string);
      }
    ) => {
      const toastId = toast.loading(options.loading || 'Loading...', { 
        persistent: true 
      });

      try {
        const result = await promise;
        
        const successMessage = typeof options.success === 'function' 
          ? options.success(result) 
          : options.success || 'Success';

        update(toastId, {
          type: 'success',
          description: successMessage,
          persistent: false,
          duration: 5000,
        });

        return result;
      } catch (error) {
        const errorMessage = typeof options.error === 'function' 
          ? options.error(error as Error) 
          : options.error || 'Something went wrong';

        update(toastId, {
          type: 'error',
          description: errorMessage,
          persistent: false,
          duration: 7000,
        });

        throw error;
      }
    }, 
    [toast, update]
  );
}