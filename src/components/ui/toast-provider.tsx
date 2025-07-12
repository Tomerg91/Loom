'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2);
    const newToast: Toast = { ...toast, id };

    setToasts(prev => {
      const updated = [newToast, ...prev];
      // Limit number of toasts
      return updated.slice(0, maxToasts);
    });

    // Auto-remove toast after duration
    const duration = toast.duration ?? (toast.type === 'error' ? 7000 : 5000);
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [maxToasts, removeToast]);

  const success = useCallback((title: string, description?: string) => {
    addToast({ type: 'success', title, description });
  }, [addToast]);

  const error = useCallback((title: string, description?: string) => {
    addToast({ type: 'error', title, description });
  }, [addToast]);

  const warning = useCallback((title: string, description?: string) => {
    addToast({ type: 'warning', title, description });
  }, [addToast]);

  const info = useCallback((title: string, description?: string) => {
    addToast({ type: 'info', title, description });
  }, [addToast]);

  const contextValue: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-100';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100';
      default:
        return 'bg-background border-border text-foreground';
    }
  };

  const getIcon = (type: ToastType) => {
    const iconClass = 'h-5 w-5 flex-shrink-0';
    switch (type) {
      case 'success':
        return <CheckCircle className={cn(iconClass, 'text-green-500')} />;
      case 'error':
        return <AlertCircle className={cn(iconClass, 'text-red-500')} />;
      case 'warning':
        return <AlertTriangle className={cn(iconClass, 'text-yellow-500')} />;
      case 'info':
        return <Info className={cn(iconClass, 'text-blue-500')} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-lg',
        'animate-in slide-in-from-top-full duration-300',
        getToastStyles(toast.type)
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {getIcon(toast.type)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{toast.title}</p>
            {toast.description && (
              <p className="mt-1 text-sm opacity-90">{toast.description}</p>
            )}
            {toast.action && (
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toast.action.onClick}
                  className="text-xs"
                >
                  {toast.action.label}
                </Button>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(toast.id)}
            className="p-1 h-auto hover:bg-transparent opacity-70 hover:opacity-100"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for form-specific toast notifications
 */
export function useFormToast() {
  const { success, error } = useToast();

  const notifySuccess = useCallback((action: string) => {
    success('Success', `${action} completed successfully`);
  }, [success]);

  const notifyError = useCallback((action: string, errorMessage?: string) => {
    error(
      `${action} failed`,
      errorMessage || 'Please try again or contact support if the problem persists.'
    );
  }, [error]);

  const notifyValidationError = useCallback(() => {
    error('Validation Error', 'Please check the form fields and try again.');
  }, [error]);

  const notifyNetworkError = useCallback(() => {
    error('Network Error', 'Please check your connection and try again.');
  }, [error]);

  return {
    notifySuccess,
    notifyError,
    notifyValidationError,
    notifyNetworkError,
  };
}

/**
 * Hook for API operation notifications
 */
export function useApiToast() {
  const { success, error, info } = useToast();

  const notifyApiSuccess = useCallback((operation: string, entity?: string) => {
    const message = entity ? `${entity} ${operation} successfully` : `${operation} completed successfully`;
    success('Success', message);
  }, [success]);

  const notifyApiError = useCallback((operation: string, errorMessage?: string, entity?: string) => {
    const title = entity ? `Failed to ${operation} ${entity}` : `${operation} failed`;
    error(title, errorMessage || 'Please try again or contact support.');
  }, [error]);

  const notifyApiLoading = useCallback((operation: string) => {
    info('Processing', `${operation} in progress...`);
  }, [info]);

  return {
    notifyApiSuccess,
    notifyApiError,
    notifyApiLoading,
  };
}