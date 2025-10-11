import { useState } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

type ToastVariant = ToastType | 'default' | 'destructive';

interface ToastPayload {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  description?: string;
  duration: number;
}

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

const DEFAULT_DURATION = 3000;

function mapVariantToType(
  variant?: ToastVariant,
  fallback: ToastType = 'info'
): ToastType {
  if (!variant || variant === 'default') {
    return fallback;
  }

  if (variant === 'destructive') {
    return 'error';
  }

  return variant;
}

// Simple toast implementation
let toastCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (
    payload: string | ToastPayload,
    options: ToastOptions = {}
  ) => {
    const id = `toast-${++toastCounter}`;
    const normalized: ToastPayload =
      typeof payload === 'string' ? { description: payload } : payload;

    const duration =
      normalized.duration ?? options.duration ?? DEFAULT_DURATION;
    const type = options.type ?? mapVariantToType(normalized.variant);
    const message =
      normalized.description ||
      normalized.title ||
      (typeof payload === 'string' ? payload : 'Notification');

    const newToast: Toast = {
      id,
      message,
      type,
      title: normalized.title,
      description: normalized.description,
      duration,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);

    return id;
  };

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return {
    toast,
    dismiss,
    toasts,
  };
}
