import { useState } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

// Simple toast implementation
let toastCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (message: string, options: ToastOptions = {}) => {
    const id = `toast-${++toastCounter}`;
    const newToast: Toast = {
      id,
      message,
      type: options.type || 'info',
      duration: options.duration || 3000,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, newToast.duration);

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