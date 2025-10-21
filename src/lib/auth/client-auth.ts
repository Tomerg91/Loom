import { supabase as clientSupabase } from '@/modules/platform/supabase/client';

import type { AuthUser, SignInData, SignUpData } from './auth';

export interface ClientSignInResult {
  user: AuthUser | null;
  error: string | null;
  requiresMfa: boolean;
  pendingUser: AuthUser | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Client-side only auth service - no server dependencies
 * Uses Supabase auth directly and fetches user profiles via API
 */
export class ClientAuthService {
  private supabase = clientSupabase;
  private userProfileCache = new Map<
    string,
    { data: AuthUser; expires: number }
  >();

  private getCachedUserProfile(userId: string): AuthUser | null {
    const cached = this.userProfileCache.get(`user_profile_${userId}`);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
    return null;
  }

  private cacheUserProfile(
    userId: string,
    user: AuthUser,
    ttlMs: number
  ): void {
    this.userProfileCache.set(`user_profile_${userId}`, {
      data: user,
      expires: Date.now() + ttlMs,
    });
  }

  /**
   * Sign up a new user
   */
  async signUp(
    data: SignUpData
  ): Promise<{
    user: AuthUser | null;
    error: string | null;
    sessionActive: boolean;
  }> {
    try {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const emailRedirectTo = `${siteUrl}/api/auth/verify`;
      const { data: authData, error: authError } =
        await this.supabase.auth.signUp({
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
        return { user: null, error: authError.message, sessionActive: false };
      }

      if (!authData.user) {
        return {
          user: null,
          error: 'Failed to create user',
          sessionActive: false,
        };
      }

      // Fetch user profile via API instead of using UserService
      const userProfile = await this.fetchUserProfileFromAPI(authData.user.id);

      const sessionActive = Boolean(authData.session);

      if (userProfile) {
        return { user: userProfile, error: null, sessionActive };
      }

      return {
        user: null,
        error: 'Failed to fetch user profile after signup',
        sessionActive,
      };
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionActive: false,
      };
    }
  }

  /**
   * Sign in an existing user
   */
  async signIn(data: SignInData): Promise<ClientSignInResult> {
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          rememberMe: data.rememberMe ?? false,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        const errorMessage = payload?.error || 'Invalid email or password';
        return {
          user: null,
          error: errorMessage,
          requiresMfa: false,
          pendingUser: null,
        };
      }

      const resultData = payload.data || {};

      const requiresMfa = Boolean(resultData.requiresMFA);

      if (requiresMfa) {
        const pendingUser = (resultData.user as AuthUser | undefined) ?? null;
        return {
          user: null,
          error: null,
          requiresMfa: true,
          pendingUser: pendingUser
            ? { ...pendingUser, mfaEnabled: true }
            : null,
        };
      }

      const user = resultData.user as AuthUser | undefined;
      const session = resultData.session as
        | { accessToken?: string | null; refreshToken?: string | null }
        | undefined;

      if (session?.accessToken && session?.refreshToken) {
        const { error: sessionError } = await this.supabase.auth.setSession({
          access_token: session.accessToken,
          refresh_token: session.refreshToken,
        });

        if (sessionError) {
          console.warn(
            '[ClientAuthService] Failed to hydrate Supabase session:',
            sessionError
          );
        }
      }

      if (user) {
        // Cache for subsequent getCurrentUser calls
        this.cacheUserProfile(user.id, user, 120000);
      }

      return {
        user: user ?? null,
        error: null,
        requiresMfa: false,
        pendingUser: null,
      };
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        requiresMfa: false,
        pendingUser: null,
      };
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
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the current user with caching
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        console.log('[ClientAuthService] No Supabase user found');
        return null;
      }

      console.log('[ClientAuthService] Getting current user:', {
        userId: user.id,
        email: user.email,
        metadataRole: user.user_metadata?.role,
      });

      // Check cache first
      const cached = this.getCachedUserProfile(user.id);
      if (cached) {
        console.log('[ClientAuthService] Returning cached user profile');
        return cached;
      }

      // Fetch from API
      const userProfile = await this.fetchUserProfileFromAPI(user.id);

      if (userProfile) {
        // Cache for 2 minutes
        this.cacheUserProfile(user.id, userProfile, 120000);
        return userProfile;
      }

      // Fallback: construct user from metadata if API fails
      console.warn(
        '[ClientAuthService] API fetch failed, constructing from user_metadata'
      );
      const fallbackUser: AuthUser = {
        id: user.id,
        email: user.email || '',
        role: (user.user_metadata?.role as any) || 'client',
        firstName: user.user_metadata?.first_name || '',
        lastName: user.user_metadata?.last_name || '',
        language: (user.user_metadata?.language as any) || 'en',
        status: 'active',
        createdAt: user.created_at || new Date().toISOString(),
        updatedAt:
          user.updated_at || user.created_at || new Date().toISOString(),
        mfaEnabled: !!user.user_metadata?.mfaEnabled,
      };

      return fallbackUser;
    } catch (error) {
      console.error('[ClientAuthService] Error getting current user:', error);
      return null;
    }
  }

  /**
   * Get the current session
   */
  async getSession() {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
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
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const redirectUrl = `${siteUrl}/reset-password`;

      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      return { error: error?.message || null };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
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
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async updateProfile(
    updates: Partial<AuthUser>
  ): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) {
        return { user: null, error: 'Not authenticated' };
      }

      const metadataUpdates: Record<string, unknown> = {};
      if (typeof updates.firstName !== 'undefined')
        metadataUpdates.first_name = updates.firstName;
      if (typeof updates.lastName !== 'undefined')
        metadataUpdates.last_name = updates.lastName;
      if (typeof updates.language !== 'undefined')
        metadataUpdates.language = updates.language;
      if (typeof updates.phone !== 'undefined')
        metadataUpdates.phone = updates.phone;
      if (typeof updates.avatarUrl !== 'undefined')
        metadataUpdates.avatar_url = updates.avatarUrl;

      if (Object.keys(metadataUpdates).length > 0) {
        const { error } = await this.supabase.auth.updateUser({
          data: metadataUpdates,
        });
        if (error) {
          return { user: null, error: error.message };
        }
      }

      const profilePayload: Record<string, unknown> = {};
      if (typeof updates.timezone !== 'undefined')
        profilePayload.timezone = updates.timezone;
      if (typeof updates.status !== 'undefined')
        profilePayload.status = updates.status;
      if (typeof updates.preferences !== 'undefined')
        profilePayload.preferences = updates.preferences;
      if (typeof updates.bio !== 'undefined') profilePayload.bio = updates.bio;
      if (typeof updates.location !== 'undefined')
        profilePayload.location = updates.location;
      if (typeof updates.website !== 'undefined')
        profilePayload.website = updates.website;
      if (typeof updates.specialties !== 'undefined')
        profilePayload.specialties = updates.specialties;

      if (Object.keys(profilePayload).length > 0) {
        const {
          data: { session },
        } = await this.supabase.auth.getSession();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const response = await fetch(`/api/users/${user.id}/profile`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(profilePayload),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          return {
            user: null,
            error: body?.error || 'Failed to update profile',
          };
        }
      }

      const refreshed = await this.fetchUserProfileFromAPI(user.id);
      if (refreshed) {
        this.cacheUserProfile(user.id, refreshed, 120000);
        return { user: refreshed, error: null };
      }

      return { user: null, error: 'Failed to fetch updated profile' };
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
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
  private async fetchUserProfileFromAPI(
    userId: string
  ): Promise<AuthUser | null> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      console.log('[ClientAuthService] Fetching user profile:', {
        userId,
        hasAccessToken: !!session?.access_token,
      });

      const response = await fetch(`/api/users/${userId}/profile`, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          '[ClientAuthService] Failed to fetch user profile from API:',
          {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          }
        );
        return null;
      }

      const { data } = await response.json();
      console.log('[ClientAuthService] User profile fetched successfully:', {
        userId: data?.id,
        role: data?.role,
        email: data?.email,
      });
      return data;
    } catch (error) {
      console.error(
        '[ClientAuthService] Error fetching user profile from API:',
        error
      );
      return null;
    }
  }

  /**
   * Update last seen via API endpoint
   */
  private async updateLastSeenViaAPI(userId: string): Promise<void> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
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
