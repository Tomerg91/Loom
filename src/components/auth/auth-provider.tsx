'use client';

import { createContext, useContext } from 'react';
import { type AuthUser } from '@/lib/auth/auth';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useUnifiedAuth } from '@/lib/auth/use-auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ user: AuthUser | null; error: string | null }>;
  signUp: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'client' | 'coach';
    phone?: string;
    language: 'en' | 'he';
  }) => Promise<{ user: AuthUser | null; error: string | null; sessionActive: boolean }>;
  signOut: () => Promise<{ error: string | null }>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<{ user: AuthUser | null; error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const { user, loading, signIn, signUp, signOut, updateProfile } = useUnifiedAuth({ initialUser });

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signOut, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
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
  const router = useRouter();
  const locale = useLocale();
  
  if (loading) {
    // Return null during loading state
    return null;
  }
  
  if (!user) {
    // Redirect to login instead of throwing
    if (typeof window !== 'undefined') {
      const path = `/${locale}/auth/signin`;
      router.push(path as '/auth/signin');
    }
    return null;
  }
  
  return user;
}

export function useRequireRole(role: 'client' | 'coach' | 'admin'): AuthUser | null {
  const user = useRequireAuth();
  const router = useRouter();
  const locale = useLocale();
  
  if (!user) {
    return null;
  }
  
  if (user.role !== role) {
    // Redirect to unauthorized page instead of throwing
    if (typeof window !== 'undefined') {
      const path = `/${locale}/unauthorized`;
      router.push(path as '/unauthorized');
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
