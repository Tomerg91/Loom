import { supabase as clientSupabase } from '@/lib/supabase/client';
import type { AuthUser, SignUpData, SignInData } from './auth';

/**
 * Client-side only auth service - no server dependencies
 * Uses Supabase auth directly and fetches user profiles via API
 */
export class ClientAuthService {
  private supabase = clientSupabase;
  private userProfileCache = new Map<string, { data: AuthUser; expires: number }>();

  private getCachedUserProfile(userId: string): AuthUser | null {
    const cached = this.userProfileCache.get(`user_profile_${userId}`);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
    return null;
  }

  private cacheUserProfile(userId: string, user: AuthUser, ttlMs: number): void {
    this.userProfileCache.set(`user_profile_${userId}`, {
      data: user,
      expires: Date.now() + ttlMs
    });
  }

  /**
   * Sign up a new user
   */
  async signUp(data: SignUpData): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const emailRedirectTo = `${siteUrl}/api/auth/verify`;
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo,
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

      // Fetch user profile via API instead of using UserService
      const userProfile = await this.fetchUserProfileFromAPI(authData.user.id);
      
      if (userProfile) {
        return { user: userProfile, error: null };
      }

      return { user: null, error: 'Failed to fetch user profile after signup' };
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

      // Update last seen via API call
      await this.updateLastSeenViaAPI(authData.user.id).catch(() => {});

      // Fetch user profile via API
      const userProfile = await this.fetchUserProfileFromAPI(authData.user.id).catch(() => null);
      if (userProfile) {
        return { user: userProfile, error: null };
      }

      // Fallback: construct minimal user from auth payload to allow redirect
      const u = authData.user;
      return {
        user: {
          id: u.id,
          email: u.email || data.email,
          role: (u.user_metadata?.role as any) || 'client',
          firstName: u.user_metadata?.first_name,
          lastName: u.user_metadata?.last_name,
          language: (u.user_metadata?.language as any) || 'en',
          status: 'active',
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        },
        error: null,
      };
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
   * Get the current user with caching
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      // Check cache first
      const cached = this.getCachedUserProfile(user.id);
      if (cached) {
        return cached;
      }

      // Fetch from API
      const userProfile = await this.fetchUserProfileFromAPI(user.id);
      
      if (userProfile) {
        // Cache for 2 minutes
        this.cacheUserProfile(user.id, userProfile, 120000);
        return userProfile;
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
      // Use environment variable or fallback
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const redirectUrl = `${siteUrl}/reset-password`;
      
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

  /**
   * Fetch user profile from API endpoint
   */
  private async fetchUserProfileFromAPI(userId: string): Promise<AuthUser | null> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      const response = await fetch(`/api/users/${userId}/profile`, { headers });
      
      if (!response.ok) {
        console.error('Failed to fetch user profile from API');
        return null;
      }

      const { data } = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching user profile from API:', error);
      return null;
    }
  }

  /**
   * Update last seen via API endpoint
   */
  private async updateLastSeenViaAPI(userId: string): Promise<void> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      await fetch(`/api/users/${userId}/last-seen`, {
        method: 'PATCH',
        headers,
      });
    } catch (error) {
      console.error('Error updating last seen via API:', error);
    }
  }
}

// Create singleton instance for client-side use
let clientAuthInstance: ClientAuthService | null = null;

export const createClientAuthService = (): ClientAuthService => {
  if (!clientAuthInstance) {
    clientAuthInstance = new ClientAuthService();
  }
  return clientAuthInstance;
};
