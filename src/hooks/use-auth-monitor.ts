'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthMonitorOptions {
  onSessionExpired?: () => void;
  onTokenRefreshed?: () => void;
  onSignOut?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to monitor authentication state and handle token refresh/expiration
 * Automatically handles:
 * - Token refresh failures
 * - Session expiration
 * - Automatic sign-out on invalid tokens
 */
export function useAuthMonitor(options: AuthMonitorOptions = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      const { onSessionExpired, onTokenRefreshed, onSignOut, onError } = optionsRef.current;

      switch (event) {
        case 'TOKEN_REFRESHED':
          onTokenRefreshed?.();
          break;

        case 'SIGNED_OUT':
          onSignOut?.();
          break;

        case 'USER_DELETED':
          onSignOut?.();
          break;

        default:
          // Check for expired session
          if (!session && event !== 'SIGNED_OUT' && event !== 'INITIAL_SESSION') {
            onSessionExpired?.();
          }
      }
    });

    // Set up periodic session validation (every 5 minutes)
    const sessionCheckInterval = setInterval(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('Session validation error:', error);
          optionsRef.current.onError?.(error);
          return;
        }

        if (!session) {
          console.warn('No active session found during periodic check');
          optionsRef.current.onSessionExpired?.();
          return;
        }

        // Check if session is about to expire (within 5 minutes)
        const expiresAt = session.expires_at;
        if (expiresAt) {
          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = expiresAt - now;

          if (timeUntilExpiry < 300) { // Less than 5 minutes
            console.log('Session expiring soon, attempting refresh...');
            const { error: refreshError } = await supabase.auth.refreshSession();

            if (refreshError) {
              console.error('Failed to refresh expiring session:', refreshError);
              optionsRef.current.onError?.(refreshError);
            }
          }
        }
      } catch (error) {
        console.error('Error during session check:', error);
        optionsRef.current.onError?.(error as Error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Cleanup on unmount
    return () => {
      subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
    };
  }, []);
}

/**
 * Hook to ensure user is authenticated, automatically redirecting if not
 */
export function useRequireAuth(redirectUrl = '/signin') {
  useAuthMonitor({
    onSessionExpired: () => {
      if (typeof window !== 'undefined' && !window.location.pathname.includes(redirectUrl)) {
        window.location.href = `${redirectUrl}?expired=true`;
      }
    },
    onSignOut: () => {
      if (typeof window !== 'undefined' && !window.location.pathname.includes(redirectUrl)) {
        window.location.href = redirectUrl;
      }
    },
  });
}
