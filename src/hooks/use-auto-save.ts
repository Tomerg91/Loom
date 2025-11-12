'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSavedAt: Date | null;
  error: Error | null;
  save: () => Promise<void>;
}

export function useAutoSave<T>({
  data,
  onSave,
  delay = 2000,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<T>(data);

  const save = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsSaving(true);
      setError(null);
      await onSave(data);
      setLastSavedAt(new Date());
      previousDataRef.current = data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Auto-save failed');
      setError(error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [data, onSave, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const dataChanged = JSON.stringify(data) !== JSON.stringify(previousDataRef.current);

    if (!dataChanged) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      save().catch((err) => {
        console.error('Auto-save error:', err);
      });
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, save]);

  return {
    isSaving,
    lastSavedAt,
    error,
    save,
  };
}
