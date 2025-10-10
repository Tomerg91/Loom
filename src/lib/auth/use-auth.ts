'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { createClientAuthService } from '@/lib/auth/client-auth';
import type { AuthUser } from '@/lib/auth/auth';
import { useAuthStore } from '@/lib/store/auth-store';
import { useNotificationStore } from '@/lib/store/notification-store';
import { useSessionStore } from '@/lib/store/session-store';

interface UseUnifiedAuthOptions {
  initialUser?: AuthUser | null;
}

/**
 * Unified client-side auth hook that synchronizes Supabase auth with the Zustand auth store.
 * It also handles session hydration on startup and clears related stores on sign out.
 */
export function useUnifiedAuth(options: UseUnifiedAuthOptions = {}) {
  const { initialUser = null } = options;

  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setError = useAuthStore((s) => s.setError);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const clearSessions = useSessionStore((s) => s.clearSessions);
  const clearNotifications = useNotificationStore((s) => s.clearNotifications);

  const authService = useMemo(() => createClientAuthService(), []);

  // Immediately hydrate store with SSR user if available
  useMemo(() => {
    if (initialUser && !user) {
      setUser(initialUser);
      setLoading(false);
    }
  }, [initialUser, user, setUser, setLoading]);

  // Session hydration + auth state subscription
  useEffect(() => {
    let isMounted = true;

    // Always validate session, but handle initial user differently
    (async () => {
      try {
        // If we have initial user, validate their session is still valid
        if (initialUser) {
          const session = await authService.getSession();
          if (!isMounted) return;
          
          if (!session?.user) {
            // SSR user but no valid client session - session expired
            clearAuth();
            clearSessions();
            clearNotifications();
            setLoading(false);
          } else {
            // Session is valid, keep the initial user and stop loading
            setLoading(false);
          }
        } else {
          // No initial user, validate and hydrate session
          setLoading(true);
          const session = await authService.getSession();
          if (!isMounted) return;

          if (session?.user) {
            const currentUser = await authService.getCurrentUser();
            if (!isMounted) return;
            setUser(currentUser);
          } else {
            // No valid session: clear any persisted user
            clearAuth();
            clearSessions();
            clearNotifications();
          }
          setLoading(false);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to hydrate session');
        clearAuth();
        setLoading(false);
      }
    })();

    // Subscribe to Supabase auth state changes and keep store in sync
    const { data: { subscription } } = authService.onAuthStateChange(async (u) => {
      if (!isMounted) return;
      
      if (u) {
        // User signed in
        setUser(u);
        setLoading(false);
      } else {
        // User signed out - always clear regardless of initial state
        clearAuth();
        clearSessions();
        clearNotifications();
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [authService, initialUser, setUser, setLoading, setError, clearAuth, clearSessions, clearNotifications]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await authService.signIn({ email, password });
      if (result.user) {
        setUser(result.user);
      } else if (result.error) {
        setLoading(false);
      }
      return result;
    } catch (error) {
      setLoading(false);
      throw error;
    }
    // Don't reset loading here - let the component control it after navigation
  }, [authService, setUser, setLoading]);

  const signUp = useCallback(async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'client' | 'coach';
    phone?: string;
    language: 'en' | 'he';
  }) => {
    setLoading(true);
    try {
      const result = await authService.signUp(data);
      if (result.user && result.sessionActive) {
        setUser(result.user);
      } else if (!result.sessionActive) {
        clearAuth();
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, [authService, setUser, setLoading, clearAuth]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      const result = await authService.signOut();
      clearAuth();
      clearSessions();
      clearNotifications();
      return result;
    } finally {
      setLoading(false);
    }
  }, [authService, clearAuth, clearSessions, clearNotifications, setLoading]);

  const updateProfile = useCallback(async (updates: Partial<AuthUser>) => {
    try {
      const result = await authService.updateProfile(updates as any);
      if (result.user) {
        setUser(result.user);
      }
      return result;
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, [authService, setUser]);

  return {
    user,
    loading: isLoading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };
}

