'use client';

import { useEffect, useMemo, useCallback, useRef } from 'react';

import type { AuthUser } from '@/lib/auth/auth';
import {
  createClientAuthService,
  type ClientSignInResult,
} from '@/lib/auth/client-auth';
import { useAuthStore } from '@/lib/store/auth-store';
import { useNotificationStore } from '@/lib/store/notification-store';
import { useSessionStore } from '@/lib/store/session-store';
import type { Language } from '@/types';

interface UseUnifiedAuthOptions {
  initialUser?: AuthUser | null;
}

/**
 * Unified client-side auth hook that synchronizes Supabase auth with the Zustand auth store.
 * It also handles session hydration on startup and clears related stores on sign out.
 */
export function useUnifiedAuth(options: UseUnifiedAuthOptions = {}) {
  const { initialUser = null } = options;

  const user = useAuthStore(s => s.user);
  const isLoading = useAuthStore(s => s.isLoading);
  const setUser = useAuthStore(s => s.setUser);
  const setLoading = useAuthStore(s => s.setLoading);
  const setError = useAuthStore(s => s.setError);
  const clearAuth = useAuthStore(s => s.clearAuth);
  const setMfaRequired = useAuthStore(s => s.setMfaRequired);
  const clearMfaState = useAuthStore(s => s.clearMfaState);
  const setPendingMfaUser = useAuthStore(s => s.setPendingMfaUser);
  const pendingMfaUserState = useAuthStore(s => s.pendingMfaUser);

  const clearSessions = useSessionStore(s => s.clearSessions);
  const clearNotifications = useNotificationStore(s => s.clearNotifications);

  const authService = useMemo(() => createClientAuthService(), []);
  const pendingMfaUser = useRef<AuthUser | null>(null);

  useEffect(() => {
    pendingMfaUser.current = pendingMfaUserState;
  }, [pendingMfaUserState]);

  // Immediately hydrate store with SSR user if available
  useEffect(() => {
    if (initialUser) {
      // Always use fresh server user over potentially stale localStorage data
      setUser(initialUser);
      setLoading(false);
      setMfaRequired(false);
      setPendingMfaUser(null);
      pendingMfaUser.current = null;
      return;
    }

    // No server-provided user; ensure loading state reflects pending validation
    setLoading(true);
    setMfaRequired(false);
    setPendingMfaUser(null);
    pendingMfaUser.current = null;
  }, [
    initialUser,
    setUser,
    setLoading,
    setMfaRequired,
    setPendingMfaUser,
    pendingMfaUser,
  ]);

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
            setMfaRequired(false);
            setPendingMfaUser(null);
            pendingMfaUser.current = null;
          } else {
            // Session is valid, keep the initial user and stop loading
            setLoading(false);
            setMfaRequired(false);
            setPendingMfaUser(null);
            pendingMfaUser.current = null;
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
            setMfaRequired(false);
            setPendingMfaUser(null);
            pendingMfaUser.current = null;
          } else {
            // No valid session: clear any persisted user
            clearAuth();
            clearSessions();
            clearNotifications();
            setPendingMfaUser(null);
            pendingMfaUser.current = null;
          }
          setLoading(false);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(
          err instanceof Error ? err.message : 'Failed to hydrate session'
        );
        clearAuth();
        clearMfaState();
        setPendingMfaUser(null);
        pendingMfaUser.current = null;
        setLoading(false);
      }
    })();

    // Subscribe to Supabase auth state changes and keep store in sync
    const {
      data: { subscription },
    } = authService.onAuthStateChange(async u => {
      if (!isMounted) return;

      if (u) {
        // User signed in
        setUser(u);
        setLoading(false);
        setMfaRequired(false);
        setPendingMfaUser(null);
        pendingMfaUser.current = null;
      } else {
        // User signed out - always clear regardless of initial state
        clearAuth();
        clearSessions();
        clearNotifications();
        clearMfaState();
        setPendingMfaUser(null);
        pendingMfaUser.current = null;
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [
    authService,
    initialUser,
    setUser,
    setLoading,
    setError,
    clearAuth,
    clearSessions,
    clearNotifications,
    setMfaRequired,
    clearMfaState,
    setPendingMfaUser,
    pendingMfaUser,
  ]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<ClientSignInResult> => {
      setLoading(true);
      try {
        const result = await authService.signIn({ email, password });

        if (result.requiresMfa) {
          const pendingUser = result.pendingUser ?? null;
          pendingMfaUser.current = pendingUser;
          setPendingMfaUser(pendingUser);
          setMfaRequired(true);
          setLoading(false);
          return { ...result, pendingUser };
        }

        if (result.user) {
          pendingMfaUser.current = null;
          setPendingMfaUser(null);
          setMfaRequired(false);
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
    },
    [
      authService,
      setLoading,
      setPendingMfaUser,
      setMfaRequired,
      setUser,
      pendingMfaUser,
    ]
  );

  const signUp = useCallback(
    async (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: 'client' | 'coach';
      phone?: string;
      language: Language;
    }) => {
      setLoading(true);
      try {
        const result = await authService.signUp(data);
        if (result.user && result.sessionActive) {
          setUser(result.user);
          setMfaRequired(false);
          setPendingMfaUser(null);
          pendingMfaUser.current = null;
        } else if (!result.sessionActive) {
          clearAuth();
          clearMfaState();
          setPendingMfaUser(null);
          pendingMfaUser.current = null;
        }
        return result;
      } finally {
        setLoading(false);
      }
    },
    [
      authService,
      setUser,
      setLoading,
      clearAuth,
      setMfaRequired,
      setPendingMfaUser,
      pendingMfaUser,
      clearMfaState,
    ]
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      const result = await authService.signOut();
      clearAuth();
      clearMfaState();
      setPendingMfaUser(null);
      pendingMfaUser.current = null;
      clearSessions();
      clearNotifications();
      return result;
    } finally {
      setLoading(false);
    }
  }, [
    authService,
    clearAuth,
    clearMfaState,
    setPendingMfaUser,
    clearSessions,
    clearNotifications,
    setLoading,
    pendingMfaUser,
  ]);

  const updateProfile = useCallback(
    async (updates: Partial<AuthUser>) => {
      try {
        const result = await authService.updateProfile(updates);
        if (result.user) {
          setUser(result.user);
          setMfaRequired(false);
          setPendingMfaUser(null);
          pendingMfaUser.current = null;
        }
        return result;
      } catch (error) {
        return {
          user: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [
      authService,
      setUser,
      setMfaRequired,
      setPendingMfaUser,
      pendingMfaUser,
    ]
  );

  return {
    user,
    loading: isLoading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    pendingMfaUser,
  };
}
