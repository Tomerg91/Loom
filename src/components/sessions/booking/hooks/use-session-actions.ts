'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface SessionActions {
  onStart?: (sessionId: string) => Promise<void>;
  onComplete?: (sessionId: string, data?: { notes?: string; rating?: number; feedback?: string }) => Promise<void>;
  onCancel?: (sessionId: string, reason?: string) => Promise<void>;
}

interface UseSessionActionsOptions {
  sessionId?: string;
  sessionActions?: SessionActions;
}

/**
 * Domain hook for managing session lifecycle actions
 * Handles start, complete, and cancel operations
 */
export function useSessionActions(options: UseSessionActionsOptions = {}) {
  const { sessionId, sessionActions } = options;
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = useCallback(
    async (action: 'start' | 'complete' | 'cancel', data?: unknown) => {
      if (!sessionId) {
        setError('No session ID provided');
        return;
      }

      setLoading(action);
      setError(null);

      try {
        let response;

        switch (action) {
          case 'start':
            response = await fetch(`/api/sessions/${sessionId}/start`, {
              method: 'POST',
            });
            break;
          case 'complete':
            response = await fetch(`/api/sessions/${sessionId}/complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data || {}),
            });
            break;
          case 'cancel':
            response = await fetch(`/api/sessions/${sessionId}/cancel`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data || {}),
            });
            break;
        }

        if (!response?.ok) {
          const errorData = await response?.json();
          throw new Error(errorData?.message || `Failed to ${action} session`);
        }

        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
        queryClient.invalidateQueries({ queryKey: ['session', sessionId] });

        // Call specific action handler if provided
        if (action === 'start' && sessionActions?.onStart) {
          await sessionActions.onStart(sessionId);
        } else if (action === 'complete' && sessionActions?.onComplete) {
          await sessionActions.onComplete(sessionId, data as { notes?: string; rating?: number; feedback?: string });
        } else if (action === 'cancel' && sessionActions?.onCancel) {
          await sessionActions.onCancel(sessionId, (data as { reason?: string })?.reason);
        }
      } catch (err) {
        const errorMessage = `Failed to ${action} session: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error(errorMessage);
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(null);
      }
    },
    [sessionId, sessionActions, queryClient]
  );

  const startSession = useCallback(() => handleAction('start'), [handleAction]);
  const completeSession = useCallback((data?: { notes?: string; rating?: number; feedback?: string }) => handleAction('complete', data), [handleAction]);
  const cancelSession = useCallback((reason?: string) => handleAction('cancel', { reason }), [handleAction]);

  return {
    startSession,
    completeSession,
    cancelSession,
    loading,
    error,
  };
}
