'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useNotificationStore } from '@/lib/store/notification-store';
import { useSessionStore } from '@/lib/store/session-store';
import { createClientAuthService } from '@/lib/auth/client-auth';
import type { AuthUser } from '@/lib/auth/auth';

interface StoreProviderProps {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}

export function StoreProvider({ children, initialUser }: StoreProviderProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const clearSessions = useSessionStore((state) => state.clearSessions);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);

  useEffect(() => {
    // Initialize auth state
    if (initialUser) {
      setUser(initialUser);
    } else {
      setLoading(true);
      
      const authService = createClientAuthService();
      
      // Get initial user
      authService.getCurrentUser().then((user) => {
        setUser(user);
        setLoading(false);
      }).catch(() => {
        setUser(null);
        setLoading(false);
      });

      // Listen to auth state changes
      const { data: { subscription } } = authService.onAuthStateChange((user) => {
        if (user) {
          setUser(user);
        } else {
          // Clear all stores when user signs out
          clearAuth();
          clearSessions();
          clearNotifications();
        }
        setLoading(false);
      });

      return () => {
        subscription?.unsubscribe();
      };
    }
  }, [initialUser, setUser, setLoading, clearAuth, clearSessions, clearNotifications]);

  return <>{children}</>;
}