import { supabase as clientSupabase } from '@/modules/platform/supabase/client';

import type { AuthUser, SignInData, SignUpData } from './auth';
import { logger } from '@/lib/logger';

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
  // Store access token from signin as fallback for API calls if setSession times out
  private fallbackAccessToken: string | null = null;
  // Store the user ID from signin in case Supabase session never initializes
  private currentUserId: string | null = null;

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
  async signIn(
    data: SignInData
  ): Promise<{
    user: AuthUser | null;
    error: string | null;
    requiresMFA?: boolean;
  }> {
    try {
      logger.debug('[ClientAuthService.signIn] Starting signin for:', data.email);

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

      logger.debug('[ClientAuthService.signIn] API response status:', response.status);

      const payload = await response.json().catch(() => null);
      logger.debug('[ClientAuthService.signIn] API payload:', {
        success: payload?.success,
        requiresMFA: payload?.data?.requiresMFA,
        hasUser: !!payload?.data?.user,
        hasSession: !!payload?.data?.session,
      });

      if (!response.ok || !payload?.success) {
        const errorMessage = payload?.error || 'Invalid email or password';
        logger.error('[ClientAuthService.signIn] API error:', errorMessage);
        return { user: null, error: errorMessage };
      }

      const resultData = payload.data || {};

      if (resultData.requiresMFA) {
        const mfaUser = resultData.user as AuthUser | undefined;
        logger.debug('[ClientAuthService.signIn] MFA required');
        if (mfaUser) {
          // Ensure MFA flag is set so the UI can route appropriately
          return {
            user: { ...mfaUser, mfaEnabled: true },
            error: null,
            requiresMFA: true,
          };
        }

        return {
          user: null,
          error: 'Multi-factor authentication required',
          requiresMFA: true,
        };
      }

      const user = resultData.user as AuthUser | undefined;
      const session = resultData.session as
        | { accessToken?: string | null; refreshToken?: string | null }
        | undefined;

      logger.debug('[ClientAuthService.signIn] Setting session, hasTokens:', {
        hasAccessToken: !!session?.accessToken,
        hasRefreshToken: !!session?.refreshToken,
      });

      if (session?.accessToken && session?.refreshToken) {
        // Store access token and user ID as fallback for API calls if setSession times out
        this.fallbackAccessToken = session.accessToken;
        if (user) {
          this.currentUserId = user.id;
        }
        logger.debug('[ClientAuthService.signIn] Stored access token and user ID as fallback', {
          userId: user?.id,
        });

        logger.debug('[ClientAuthService.signIn] Calling setSession with timeout...');

        // Set session with a timeout to prevent hanging on Vercel Edge Runtime
        const setSessionPromise = this.supabase.auth.setSession({
          access_token: session.accessToken,
          refresh_token: session.refreshToken,
        });

        const timeoutPromise = new Promise<{ error: any }>((_, reject) =>
          setTimeout(
            () => reject(new Error('setSession timeout after 3 seconds')),
            3000
          )
        );

        try {
          const result = await Promise.race([setSessionPromise, timeoutPromise]);
          if (result?.error) {
            logger.warn(
              '[ClientAuthService.signIn] Failed to hydrate Supabase session:',
              result.error
            );
          } else {
            logger.debug('[ClientAuthService.signIn] Session set successfully');
          }
        } catch (timeoutError) {
          logger.warn('[ClientAuthService.signIn] setSession timed out:', timeoutError);
          // Don't fail signin just because setSession timed out
          // The tokens from API response will be used for navigation and API calls
        }
      } else {
        logger.warn('[ClientAuthService.signIn] No session tokens in API response');
      }

      if (user) {
        // Cache for subsequent getCurrentUser calls
        this.cacheUserProfile(user.id, user, 120000);
        logger.debug('[ClientAuthService.signIn] Cached user profile');
      }

      logger.debug('[ClientAuthService.signIn] Returning success with user:', !!user);
      return {
        user: user ?? null,
        error: null,
      };
    } catch (error) {
      logger.error('[ClientAuthService.signIn] Caught error:', error);
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: string | null }> {
    try {
      // Clear fallback tokens and user ID
      this.fallbackAccessToken = null;
      this.currentUserId = null;

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

      // If no user from Supabase but we have a fallback user ID, use that
      // (happens when setSession timed out and session never initialized)
      const userId = user?.id || this.currentUserId;

      if (!userId) {
        logger.debug('[ClientAuthService] No Supabase user found and no fallback user ID');
        return null;
      }

      const usingFallbackUserId = !user?.id && !!this.currentUserId;
      logger.debug('[ClientAuthService] Getting current user:', {
        userId,
        email: user?.email,
        metadataRole: user?.user_metadata?.role,
        usingFallbackUserId,
      });

      // Check cache first
      const cached = this.getCachedUserProfile(userId);
      if (cached) {
        logger.debug('[ClientAuthService] Returning cached user profile');
        return cached;
      }

      // Fetch from API - pass fallback token in case setSession timed out
      const userProfile = await this.fetchUserProfileFromAPI(userId, this.fallbackAccessToken ?? undefined);

      if (userProfile) {
        // Cache for 2 minutes
        this.cacheUserProfile(userId, userProfile, 120000);
        return userProfile;
      }

      // Fallback: construct user from Supabase metadata if API fails
      if (user) {
        logger.warn(
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
      }

      // If using fallback userId but no Supabase user and API failed, return null
      // (This shouldn't normally happen if signin succeeded, but safety-check anyway)
      logger.warn('[ClientAuthService] Could not fetch user profile and no metadata available');
      return null;
    } catch (error) {
      logger.error('[ClientAuthService] Error getting current user:', error);
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
      logger.error('Error getting session:', error);
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
    userId: string,
    fallbackAccessToken?: string
  ): Promise<AuthUser | null> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      const headers: Record<string, string> = {};

      // Use session token if available, otherwise use fallback token (from signin response)
      const accessToken = session?.access_token || fallbackAccessToken;
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      logger.debug('[ClientAuthService] Fetching user profile:', {
        userId,
        hasAccessToken: !!accessToken,
        usingFallbackToken: !session?.access_token && !!fallbackAccessToken,
      });

      const response = await fetch(`/api/users/${userId}/profile`, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
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
      logger.debug('[ClientAuthService] User profile fetched successfully:', {
        userId: data?.id,
        role: data?.role,
        email: data?.email,
      });
      return data;
    } catch (error) {
      logger.error(
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
      logger.error('Error updating last seen via API:', error);
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
