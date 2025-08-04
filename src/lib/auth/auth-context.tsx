'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
// Removed: import { createMfaService } from '@/lib/services/mfa-service'; 
// MFA operations now handled server-side via API endpoints
import { AUTH_ENDPOINTS } from '@/lib/config/api-endpoints';
import type { AuthUser } from '@/lib/auth/auth';
import type { UserRole, UserStatus, Language } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isSessionValid: boolean;
  lastActivity: Date | null;
  securityWarnings: string[];
  // MFA-related fields
  mfaRequired: boolean;
  mfaVerified: boolean;
  isMfaSession: boolean;
  mfaStatus: {
    isEnabled: boolean;
    isSetup: boolean;
    backupCodesRemaining: number;
  } | null;
  checkMfaStatus: () => Promise<void>;
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
  
  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaVerified, setMfaVerified] = useState(false);
  const [isMfaSession, setIsMfaSession] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<AuthContextType['mfaStatus']>(null);
  
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
  
  // MFA status checking function
  const checkMfaStatus = useCallback(async () => {
    if (!user) {
      setMfaStatus(null);
      setMfaRequired(false);
      setMfaVerified(false);
      setIsMfaSession(false);
      return;
    }

    try {
      // Use secure server-side endpoint instead of client-side cookie access
      const response = await fetch(AUTH_ENDPOINTS.MFA_STATUS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include HTTP-only cookies
      });

      if (!response.ok) {
        throw new Error(`MFA status check failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setMfaStatus(data.data.mfaStatus);
        setIsMfaSession(data.data.isMfaSession);
        setMfaVerified(data.data.mfaVerified);
        setMfaRequired(data.data.mfaRequired);
      } else {
        throw new Error(data.error || 'Failed to fetch MFA status');
      }
    } catch (error) {
      console.error('Failed to check MFA status:', error);
      // Set safe defaults on error
      setMfaStatus(null);
      setMfaRequired(false);
      setMfaVerified(false);
      setIsMfaSession(false);
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Validate session first
      const isValid = await validateSession();
      if (!isValid) {
        setUser(null);
        setMfaStatus(null);
        setMfaRequired(false);
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
        .eq('email', authUser.email || '') // Additional security check
        .single();

      // Type assertion to ensure proper typing
      type UserProfile = {
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        role: UserRole;
        language: Language;
        status: UserStatus;
        created_at: string;
        updated_at: string;
        avatar_url: string | null;
        phone: string | null;
        timezone: string;
        last_seen_at: string | null;
      };

      if (profileError || !profile) {
        setUser(null);
        setSecurityWarnings(prev => [...prev, 'User profile not found or access denied']);
        return;
      }

      // Type assertion for the profile data
      const typedProfile = profile as UserProfile;
      
      // Security checks
      if (typedProfile.status !== 'active') {
        setUser(null);
        setSecurityWarnings(prev => [...prev, `Account is ${typedProfile.status}`]);
        return;
      }
      
      // Check for suspicious activity
      const accountAge = new Date().getTime() - new Date(typedProfile.createdAt || typedProfile.created_at).getTime();
      if (accountAge < 0) {
        setUser(null);
        setSecurityWarnings(prev => [...prev, 'Invalid account creation date detected']);
        return;
      }

      const fullUser: AuthUser = {
        id: authUser.id,
        email: authUser.email || '',
        firstName: typedProfile.first_name ?? undefined,
        lastName: typedProfile.last_name ?? undefined,
        role: typedProfile.role || 'client',
        language: typedProfile.language || 'en',
        status: typedProfile.status || 'active',
        createdAt: typedProfile.created_at,
        updatedAt: typedProfile.updated_at,
        lastSeenAt: typedProfile.last_seen_at ?? undefined,
        // MFA fields are now handled server-side via /api/auth/mfa-status
        // These fields are set to safe defaults to maintain type compatibility
        mfaEnabled: false, // Always false on client-side for security
        mfaSetupCompleted: false, // Always false on client-side for security
        mfaVerifiedAt: undefined,
        rememberDeviceEnabled: false,
        emailVerified: authUser.email_confirmed_at ? true : false,
        isActive: typedProfile.status === 'active',
        avatarUrl: typedProfile.avatar_url ?? undefined,
        phoneNumber: typedProfile.phone ?? undefined,
        phone: typedProfile.phone ?? undefined, // Include both phone and phoneNumber for compatibility
        timezone: typedProfile.timezone || undefined,
        dateOfBirth: undefined,
        preferences: {
          language: typedProfile.language || 'en',
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

      // Check MFA status when user is loaded
      await checkMfaStatus();
        
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
      
      // Clear MFA state
      setMfaStatus(null);
      setMfaRequired(false);
      setMfaVerified(false);
      setIsMfaSession(false);
      
      // Clear MFA session cookies
      document.cookie = 'mfa_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      document.cookie = 'mfa_verified=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      
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
        setMfaStatus(null);
        setMfaRequired(false);
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
    // MFA fields
    mfaRequired,
    mfaVerified,
    isMfaSession,
    mfaStatus,
    checkMfaStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}