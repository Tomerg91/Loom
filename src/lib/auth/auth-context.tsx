'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuthUser } from '@/lib/auth/auth';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isSessionValid: boolean;
  lastActivity: Date | null;
  securityWarnings: string[];
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
  const [isSessionValid, setIsSessionValid] = useState(true);
  const [lastActivity, setLastActivity] = useState<Date | null>(new Date());
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([]);
  const supabase = createClient();
  
  // Session management constants
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
  const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // 1 minute
  
  // Refs for intervals and timeouts
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionCheckRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<Date>(new Date());

  // Enhanced session validation
  const validateSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        setIsSessionValid(false);
        setSecurityWarnings(prev => [...prev, 'Session expired or invalid']);
        return false;
      }
      
      // Check if token is about to expire
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      
      if (timeUntilExpiry <= 0) {
        setIsSessionValid(false);
        setSecurityWarnings(prev => [...prev, 'Session has expired']);
        return false;
      }
      
      // Auto-refresh if close to expiry
      if (timeUntilExpiry <= REFRESH_THRESHOLD) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          setSecurityWarnings(prev => [...prev, 'Failed to refresh session']);
          return false;
        }
      }
      
      setIsSessionValid(true);
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      setIsSessionValid(false);
      return false;
    }
  }, [supabase.auth]);
  
  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Validate session first
      const isValid = await validateSession();
      if (!isValid) {
        setUser(null);
        return;
      }
      
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      
      if (error || !authUser) {
        setUser(null);
        setSecurityWarnings(prev => [...prev, 'Failed to get user data']);
        return;
      }

      // Enhanced user data validation
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, language, status, created_at, updated_at, avatar_url, phone, timezone, last_seen_at')
        .eq('id', authUser.id)
        .eq('email', authUser.email) // Additional security check
        .single();

      if (profileError || !profile) {
        setUser(null);
        setSecurityWarnings(prev => [...prev, 'User profile not found or access denied']);
        return;
      }
      
      // Security checks
      if (profile.status !== 'active') {
        setUser(null);
        setSecurityWarnings(prev => [...prev, `Account is ${profile.status}`]);
        return;
      }
      
      // Check for suspicious activity
      const accountAge = new Date().getTime() - new Date(profile.created_at).getTime();
      if (accountAge < 0) {
        setUser(null);
        setSecurityWarnings(prev => [...prev, 'Invalid account creation date detected']);
        return;
      }

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
        lastSeenAt: profile.last_seen_at,
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
      setSecurityWarnings([]); // Clear warnings on successful auth
      
      // Update last seen timestamp
      await supabase
        .from('users')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', authUser.id);
        
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
      setSecurityWarnings(prev => [...prev, 'Authentication error occurred']);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, validateSession]);

  // Activity tracking
  const updateActivity = useCallback(() => {
    const now = new Date();
    lastActivityRef.current = now;
    setLastActivity(now);
  }, []);
  
  // Check for session timeout due to inactivity
  const checkSessionTimeout = useCallback(() => {
    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current.getTime();
    
    if (timeSinceActivity > SESSION_TIMEOUT) {
      setSecurityWarnings(prev => [...prev, 'Session timed out due to inactivity']);
      signOut();
    }
  }, []);
  
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Clear all timers
      if (activityTimerRef.current) {
        clearInterval(activityTimerRef.current);
      }
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
      }
      
      await supabase.auth.signOut();
      setUser(null);
      setIsSessionValid(false);
      setSecurityWarnings([]);
      setLastActivity(null);
      
    } catch (error) {
      console.error('Error signing out:', error);
      setSecurityWarnings(prev => [...prev, 'Error occurred during sign out']);
    } finally {
      setIsLoading(false);
    }
  }, [supabase.auth]);

  useEffect(() => {
    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        updateActivity();
        await refreshUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(false);
        setIsSessionValid(false);
        setSecurityWarnings([]);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        updateActivity();
        await refreshUser();
      } else if (event === 'PASSWORD_RECOVERY') {
        setSecurityWarnings(prev => [...prev, 'Password recovery initiated']);
      }
    });

    // Initial load if no initial user provided
    if (!initialUser) {
      refreshUser();
    }

    return () => subscription.unsubscribe();
  }, [initialUser, refreshUser, supabase.auth, updateActivity]);
  
  // Activity monitoring and session management
  useEffect(() => {
    if (user && isSessionValid) {
      // Track user activity
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      const handleActivity = () => {
        updateActivity();
      };
      
      // Add event listeners for activity tracking
      events.forEach(event => {
        document.addEventListener(event, handleActivity, true);
      });
      
      // Set up periodic session validation
      sessionCheckRef.current = setInterval(async () => {
        await validateSession();
        checkSessionTimeout();
      }, ACTIVITY_CHECK_INTERVAL);
      
      return () => {
        // Remove event listeners
        events.forEach(event => {
          document.removeEventListener(event, handleActivity, true);
        });
        
        // Clear intervals
        if (sessionCheckRef.current) {
          clearInterval(sessionCheckRef.current);
        }
      };
    }
  }, [user, isSessionValid, updateActivity, validateSession, checkSessionTimeout]);

  const value = {
    user,
    isLoading,
    signOut,
    refreshUser,
    isSessionValid,
    lastActivity,
    securityWarnings,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}