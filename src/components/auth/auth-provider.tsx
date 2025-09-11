'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { type AuthUser } from '@/lib/auth/auth';
import { createClientAuthService } from '@/lib/auth/client-auth';
import { useMemo } from 'react';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: AuthUser | null; error: string | null }>;
  signUp: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'client' | 'coach';
    phone?: string;
    language: 'en' | 'he';
  }) => Promise<{ user: AuthUser | null; error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<{ user: AuthUser | null; error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);
  const authService = useMemo(() => createClientAuthService(), []);

  useEffect(() => {
    let mounted = true;

    const getInitialUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (mounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error getting initial user:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (!initialUser) {
      getInitialUser();
    }

    // Listen to auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      if (mounted) {
        setUser(user);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [authService, initialUser]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await authService.signIn({ email, password });
      if (result.user) {
        setUser(result.user);
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (data: {
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
      if (result.user) {
        setUser(result.user);
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const result = await authService.signOut();
      setUser(null);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<AuthUser>) => {
    try {
      const result = await authService.updateProfile(updates);
      if (result.user) {
        setUser(result.user);
      }
      return result;
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Convenience hooks
export function useUser(): AuthUser | null {
  const { user } = useAuth();
  return user;
}

export function useRequireAuth(): AuthUser | null {
  const { user, loading } = useAuth();
  
  if (loading) {
    // Return null during loading state
    return null;
  }
  
  if (!user) {
    // Redirect to login instead of throwing
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }
  
  return user;
}

export function useRequireRole(role: 'client' | 'coach' | 'admin'): AuthUser | null {
  const user = useRequireAuth();
  
  if (!user) {
    return null;
  }
  
  if (user.role !== role) {
    // Redirect to unauthorized page instead of throwing
    if (typeof window !== 'undefined') {
      window.location.href = '/unauthorized';
    }
    return null;
  }
  
  return user;
}

export function useHasRole(role: 'client' | 'coach' | 'admin'): boolean {
  const { user } = useAuth();
  return user?.role === role;
}

export function useHasAnyRole(roles: ('client' | 'coach' | 'admin')[]): boolean {
  const { user } = useAuth();
  return user ? roles.includes(user.role) : false;
}
