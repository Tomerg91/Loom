'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuthUser } from '@/lib/auth/auth';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useUser() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useUser must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(!initialUser);
  const supabase = createClient();

  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      
      if (error || !authUser) {
        setUser(null);
        return;
      }

      // Get additional user data from users table (select only necessary fields)
      const { data: profile } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, language, status, created_at, updated_at, avatar_url, phone, timezone')
        .eq('id', authUser.id)
        .single();

      if (profile) {
        const fullUser: AuthUser = {
          id: authUser.id,
          email: authUser.email || '',
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          role: profile.role || 'client',
          language: profile.language || 'en',
          status: profile.status || 'active',
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
          emailVerified: authUser.email_confirmed_at ? true : false,
          isActive: profile.status === 'active',
          avatarUrl: profile.avatar_url || undefined,
          phoneNumber: profile.phone || undefined,
          dateOfBirth: undefined,
          preferences: {
            language: profile.language || 'en',
            notifications: {
              email: true,
              push: true,
              inApp: true,
            },
            theme: 'light',
          },
          metadata: {},
        };
        setUser(fullUser);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, setUser, setIsLoading]);

  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await refreshUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        await refreshUser();
      }
    });

    // Initial load if no initial user provided
    if (!initialUser) {
      refreshUser();
    }

    return () => subscription.unsubscribe();
  }, [initialUser, refreshUser, supabase.auth]);

  const value = {
    user,
    isLoading,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}