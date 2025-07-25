import { createServerClient } from '@/lib/supabase/server';
import { supabase as clientSupabase } from '@/lib/supabase/client';
import { createUserService } from '@/lib/database';
import type { User, UserRole, UserStatus, Language } from '@/types';
import { config } from '@/lib/config';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  timezone?: string;
  language: Language;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string;
  // Additional fields used in auth-context
  emailVerified?: boolean;
  isActive?: boolean;
  phoneNumber?: string;
  dateOfBirth?: string;
  preferences?: {
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      inApp: boolean;
    };
    theme: string;
  };
  metadata?: Record<string, unknown>;
  // Additional profile fields that might be used in components
  bio?: string;
  location?: string;
  website?: string;
  specialties?: string[];
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  language: Language;
}

export interface SignInData {
  email: string;
  password: string;
}

// Singleton instances to prevent multiple service creation
let serverAuthServiceInstance: AuthService | null = null;
let clientAuthServiceInstance: AuthService | null = null;

export class AuthService {
  private supabase: ReturnType<typeof createServerClient> | typeof clientSupabase;
  private userService: ReturnType<typeof createUserService>;

  constructor(isServer = true) {
    // Use singleton clients to prevent multiple GoTrueClient instances
    this.supabase = isServer ? createServerClient() : clientSupabase;
    this.userService = createUserService(isServer);
  }

  /**
   * Sign up a new user
   */
  async signUp(data: SignUpData): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            role: data.role,
            phone: data.phone,
            language: data.language,
          },
        },
      });

      if (authError) {
        return { user: null, error: authError.message };
      }

      if (!authData.user) {
        return { user: null, error: 'Failed to create user' };
      }

      // Create user profile in our database
      const userProfileResult = await this.userService.getUserProfile(authData.user.id);

      if (userProfileResult.success) {
        const userProfile = userProfileResult.data;
        return {
          user: {
            id: userProfile.id,
            email: userProfile.email,
            role: userProfile.role,
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            phone: userProfile.phone,
            avatarUrl: userProfile.avatarUrl,
            timezone: userProfile.timezone,
            language: userProfile.language,
            status: userProfile.status,
            createdAt: userProfile.createdAt,
            updatedAt: userProfile.updatedAt,
            lastSeenAt: userProfile.lastSeenAt,
          },
          error: null,
        };
      }

      return { user: null, error: userProfileResult.error || 'Failed to create user profile' };
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Sign in an existing user
   */
  async signIn(data: SignInData): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        return { user: null, error: authError.message };
      }

      if (!authData.user) {
        return { user: null, error: 'Failed to sign in' };
      }

      // Update last seen timestamp
      await this.userService.updateLastSeen(authData.user.id);

      // Get user profile
      const userProfileResult = await this.userService.getUserProfile(authData.user.id);

      if (userProfileResult.success) {
        const userProfile = userProfileResult.data;
        return {
          user: {
            id: userProfile.id,
            email: userProfile.email,
            role: userProfile.role,
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            phone: userProfile.phone,
            avatarUrl: userProfile.avatarUrl,
            timezone: userProfile.timezone,
            language: userProfile.language,
            status: userProfile.status,
            createdAt: userProfile.createdAt,
            updatedAt: userProfile.updatedAt,
            lastSeenAt: userProfile.lastSeenAt,
          },
          error: null,
        };
      }

      return { user: null, error: userProfileResult.error || 'User profile not found' };
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.auth.signOut();
      return { error: error?.message || null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get the current user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      const userProfileResult = await this.userService.getUserProfile(user.id);

      if (userProfileResult.success) {
        const userProfile = userProfileResult.data;
        return {
          id: userProfile.id,
          email: userProfile.email,
          role: userProfile.role,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          phone: userProfile.phone,
          avatarUrl: userProfile.avatarUrl,
          timezone: userProfile.timezone,
          language: userProfile.language,
          status: userProfile.status,
          createdAt: userProfile.createdAt,
          updatedAt: userProfile.updatedAt,
          lastSeenAt: userProfile.lastSeenAt,
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Get the current session
   */
  async getSession() {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      // Use centralized configuration for redirect URLs
      const redirectUrl = config.getPasswordResetUrl();
      
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      return { error: error?.message || null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Update password
   */
  async updatePassword(password: string): Promise<{ error: string | null }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: password,
      });
      return { error: error?.message || null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Update password with reset token
   */
  async updatePasswordWithToken(token: string, password: string): Promise<{ error: string | null }> {
    try {
      // Verify the reset token and update password
      const { error } = await this.supabase.auth.updateUser({
        password
      });
      
      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to update password with token' };
    }
  }

  /**
   * Update user by ID (admin function)
   */
  async updateUser(userId: string, updates: Record<string, unknown>): Promise<AuthUser | null> {
    try {
      // Update user profile in database
      const updateResult = await this.userService.updateUserProfile(userId, updates);
      
      if (updateResult.success) {
        const updatedProfile = updateResult.data;
        return {
          id: updatedProfile.id,
          email: updatedProfile.email,
          role: updatedProfile.role,
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
          phone: updatedProfile.phone,
          avatarUrl: updatedProfile.avatarUrl,
          timezone: updatedProfile.timezone,
          language: updatedProfile.language,
          status: updatedProfile.status,
          createdAt: updatedProfile.createdAt,
          updatedAt: updatedProfile.updatedAt,
          lastSeenAt: updatedProfile.lastSeenAt,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) {
        return { user: null, error: 'Not authenticated' };
      }

      // Update auth metadata if needed
      const authUpdates: Record<string, unknown> = {};
      if (updates.firstName || updates.lastName) {
        authUpdates.data = {
          ...user.user_metadata,
          first_name: updates.firstName || user.user_metadata.first_name,
          last_name: updates.lastName || user.user_metadata.last_name,
        };
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await this.supabase.auth.updateUser(authUpdates);
        if (authError) {
          return { user: null, error: authError.message };
        }
      }

      // Update user profile in database
      const updateResult = await this.userService.updateUserProfile(user.id, updates);

      if (updateResult.success) {
        const updatedProfile = updateResult.data;
        return {
          user: {
            id: updatedProfile.id,
            email: updatedProfile.email,
            role: updatedProfile.role,
            firstName: updatedProfile.firstName,
            lastName: updatedProfile.lastName,
            phone: updatedProfile.phone,
            avatarUrl: updatedProfile.avatarUrl,
            timezone: updatedProfile.timezone,
            language: updatedProfile.language,
            status: updatedProfile.status,
            createdAt: updatedProfile.createdAt,
            updatedAt: updatedProfile.updatedAt,
            lastSeenAt: updatedProfile.lastSeenAt,
          },
          error: null,
        };
      }

      return { user: null, error: updateResult.error || 'Failed to update profile' };
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Check if user has specific role
   */
  async hasRole(role: UserRole): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  async hasAnyRole(roles: UserRole[]): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  /**
   * Verify OTP token
   */
  public async verifyOtp(params: { token_hash: string; type: 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email' }) {
    return this.supabase.auth.verifyOtp({
      ...params,
      type: params.type
    });
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser();
        callback(user);
      } else {
        callback(null);
      }
    });
  }
}

// Convenience factory functions with singleton pattern
export const createAuthService = (isServer = true) => {
  if (isServer) {
    if (!serverAuthServiceInstance) {
      serverAuthServiceInstance = new AuthService(true);
    }
    return serverAuthServiceInstance;
  } else {
    if (!clientAuthServiceInstance) {
      clientAuthServiceInstance = new AuthService(false);
    }
    return clientAuthServiceInstance;
  }
};

// Server-side auth helpers
export const getServerUser = async (): Promise<AuthUser | null> => {
  const authService = createAuthService(true);
  return authService.getCurrentUser();
};

export const requireAuth = async (): Promise<AuthUser> => {
  const user = await getServerUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
};

export const requireRole = async (role: UserRole): Promise<AuthUser> => {
  const user = await requireAuth();
  if (user.role !== role) {
    throw new Error(`${role} role required`);
  }
  return user;
};

export const requireAnyRole = async (roles: UserRole[]): Promise<AuthUser> => {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error(`One of the following roles required: ${roles.join(', ')}`);
  }
  return user;
};