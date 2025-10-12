import { config } from '@/lib/config';
import type { UserServiceOptions } from '@/lib/database/users';
import { supabase as clientSupabase } from '@/lib/supabase/client';
import { createClient } from '@/lib/supabase/server';
import { routing } from '@/i18n/routing';
import type { Language, User, UserRole, UserStatus } from '@/types';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */

type CreateUserServiceFactory = (options?: boolean | UserServiceOptions) => any;

const getCreateUserService = (): CreateUserServiceFactory => {
  const databaseModule = require('@/lib/database') as {
    createUserService?: CreateUserServiceFactory;
  };

  if (typeof databaseModule.createUserService !== 'function') {
    throw new Error(
      'createUserService is not available from the database module'
    );
  }

  return databaseModule.createUserService;
};

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
  onboardingStatus?: 'pending' | 'in_progress' | 'completed';
  onboardingStep?: number;
  onboardingCompletedAt?: string;
  onboardingData?: Record<string, unknown>;
  // MFA fields
  mfaEnabled?: boolean;
  mfaSetupCompleted?: boolean;
  mfaVerifiedAt?: string;
  rememberDeviceEnabled?: boolean;
  // Additional fields used in the app's AuthProvider
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
  rememberMe?: boolean;
}

export interface AuthSessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number | null;
}

// Singleton instance on the client to avoid duplicate GoTrue clients in the browser
let clientAuthServiceInstance: AuthService | null = null;

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type CreateAuthServiceOptions =
  | boolean
  | {
      isServer?: boolean;
      supabaseClient?: ServerSupabaseClient;
    };

export class AuthService {
  private supabase: ServerSupabaseClient | typeof clientSupabase;
  private userService: ReturnType<ReturnType<typeof getCreateUserService>>;
  private userProfileCache = new Map<
    string,
    { data: AuthUser; expires: number }
  >();

  private getUserProfileCacheKey(userId: string): string {
    return `user_profile_${userId}`;
  }

  private constructor(isServer = true, supabase?: ServerSupabaseClient) {
    // Use the request-scoped server client when provided or fall back to the shared browser client
    this.supabase = isServer && supabase ? supabase : clientSupabase;

    const createUserService = getCreateUserService();
    this.userService = createUserService({
      isServer,
      supabaseClient: this.supabase,
    });
  }

  public static create(
    options: CreateAuthServiceOptions = { isServer: true }
  ): AuthService {
    if (typeof options === 'boolean') {
      return AuthService.create({ isServer: options });
    }

    const { isServer = true } = options;

    if (isServer) {
      const supabase = createClient();
      return new AuthService(true, supabase);
    }

    if (!clientAuthServiceInstance) {
      clientAuthServiceInstance = new AuthService(false);
    }

    return clientAuthServiceInstance;
  }

  private getCachedUserProfile(cacheKey: string): AuthUser | null {
    const cached = this.userProfileCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
    return null;
  }

  private cacheUserProfile(
    cacheKey: string,
    user: AuthUser,
    ttlMs: number
  ): void {
    this.userProfileCache.set(cacheKey, {
      data: user,
      expires: Date.now() + ttlMs,
    });
  }

  public invalidateUserCache(userId: string): void {
    this.userProfileCache.delete(this.getUserProfileCacheKey(userId));
  }

  private mapUserProfileToAuthUser(userProfile: User): AuthUser {
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
      onboardingStatus: userProfile.onboardingStatus,
      onboardingStep: userProfile.onboardingStep,
      onboardingCompletedAt: userProfile.onboardingCompletedAt,
      onboardingData: userProfile.onboardingData,
      mfaEnabled: userProfile.mfaEnabled,
      mfaSetupCompleted: userProfile.mfaSetupCompleted,
      mfaVerifiedAt: userProfile.mfaVerifiedAt,
      rememberDeviceEnabled: userProfile.rememberDeviceEnabled,
    };
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
      // Determine email verification redirect URL
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
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

      const sessionActive = Boolean(authData.session);

      // Try to fetch the newly created user profile using admin client to avoid RLS issues
      try {
        const { createAdminClient } = await import('@/lib/supabase/server');
        const admin = createAdminClient();

        // Ensure a profile row exists (trigger should create it, but upsert defensively)
        const upsertPayload: any = {
          id: authData.user.id,
          email: authData.user.email,
          first_name: data.firstName,
          last_name: data.lastName,
          role: data.role,
          language: data.language,
          phone: data.phone || null,
        };

        await admin.from('users').upsert(upsertPayload, { onConflict: 'id' });

        // If role is coach, create coach_profiles record with default values
        if (data.role === 'coach') {
          await admin.from('coach_profiles').upsert(
            {
              coach_id: authData.user.id,
              session_rate: 75.0,
              currency: 'USD',
              languages: [data.language],
              timezone: 'UTC',
              is_active: true,
              onboarding_completed_at: null, // Will be set after onboarding wizard
            },
            { onConflict: 'coach_id' }
          );
        }

        const { data: profile, error: profileError } = await admin
          .from('users')
          .select(
            'id, email, first_name, last_name, role, language, status, created_at, updated_at, avatar_url, phone, timezone, last_seen_at, onboarding_status, onboarding_step, onboarding_completed_at, onboarding_data'
          )
          .eq('id', authData.user.id)
          .single();

        if (!profileError && profile) {
          return {
            user: {
              id: profile.id,
              email: profile.email,
              role: profile.role as any,
              firstName: profile.first_name || undefined,
              lastName: profile.last_name || undefined,
              phone: profile.phone || undefined,
              avatarUrl: profile.avatar_url || undefined,
              timezone: profile.timezone || undefined,
              language: profile.language as any,
              status: profile.status as any,
              createdAt: profile.created_at,
              updatedAt: profile.updated_at,
              lastSeenAt: profile.last_seen_at || undefined,
              onboardingStatus:
                (profile.onboarding_status as
                  | 'pending'
                  | 'in_progress'
                  | 'completed') || 'pending',
              onboardingStep: profile.onboarding_step ?? 0,
              onboardingCompletedAt:
                profile.onboarding_completed_at || undefined,
              onboardingData:
                (profile.onboarding_data as Record<string, unknown>) || {},
            },
            error: null,
            sessionActive,
          };
        }
      } catch (adminError) {
        // Non-fatal: fallback below
        console.warn(
          'Admin profile fetch/upsert failed after signup:',
          adminError
        );
      }

      // Fallback: return minimal user data from auth payload
      return {
        user: {
          id: authData.user.id,
          email: authData.user.email!,
          role: (authData.user.user_metadata?.role as any) || 'client',
          firstName: authData.user.user_metadata?.first_name,
          lastName: authData.user.user_metadata?.last_name,
          language:
            (authData.user.user_metadata?.language as any) ||
            data.language ||
            (routing.defaultLocale as Language),
          status: 'active',
          createdAt: authData.user.created_at ?? new Date().toISOString(),
          updatedAt:
            authData.user.updated_at ??
            authData.user.created_at ??
            new Date().toISOString(),
          onboardingStatus: 'pending',
          onboardingStep: 0,
          onboardingCompletedAt: undefined,
          onboardingData: {},
        },
        error: null,
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
    session: AuthSessionTokens | null;
  }> {
    try {
      const { data: authData, error: authError } =
        await this.supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      if (authError) {
        return { user: null, error: authError.message, session: null };
      }

      if (!authData.user) {
        return { user: null, error: 'Failed to sign in', session: null };
      }

      const sessionTokens: AuthSessionTokens | null = authData.session
        ? {
            accessToken: authData.session.access_token,
            refreshToken: authData.session.refresh_token,
            expiresAt: authData.session.expires_at ?? null,
          }
        : null;

      // Update last seen timestamp
      await this.userService.updateLastSeen(authData.user.id);

      // Get user profile
      const userProfileResult = await this.userService.getUserProfile(
        authData.user.id
      );

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
            // MFA fields
            mfaEnabled: userProfile.mfaEnabled,
            mfaSetupCompleted: userProfile.mfaSetupCompleted,
            mfaVerifiedAt: userProfile.mfaVerifiedAt,
            rememberDeviceEnabled: userProfile.rememberDeviceEnabled,
          },
          error: null,
          session: sessionTokens,
        };
      }

      return {
        user: null,
        error: userProfileResult.error || 'User profile not found',
        session: sessionTokens,
      };
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        session: null,
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
   * Get the current user with caching for TTFB optimization
   */
  async getCurrentUser(options?: {
    forceRefresh?: boolean;
  }): Promise<AuthUser | null> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return null;
      }

      // Use memory cache to prevent redundant database queries during SSR
      const cacheKey = this.getUserProfileCacheKey(user.id);
      if (options?.forceRefresh) {
        this.userProfileCache.delete(cacheKey);
      } else {
        const cached = this.getCachedUserProfile(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const userProfileResult = await this.userService.getUserProfile(user.id);

      if (userProfileResult.success) {
        const userProfile = userProfileResult.data;
        const authUser = this.mapUserProfileToAuthUser(userProfile);

        // Cache for 2 minutes to reduce database load
        this.cacheUserProfile(cacheKey, authUser, 120000);
        return authUser;
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
      // Use centralized configuration for redirect URLs
      const redirectUrl = config.getPasswordResetUrl();

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
   * Resend email confirmation
   */
  async resendConfirmationEmail(
    email: string,
    redirectTo?: string
  ): Promise<{ data: any; error: string | null }> {
    try {
      const { data, error } = await this.supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
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

  /**
   * Update password with reset token
   */
  async updatePasswordWithToken(
    token: string,
    password: string
  ): Promise<{ error: string | null }> {
    try {
      // Verify the reset token and update password
      const { error } = await this.supabase.auth.updateUser({
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update password with token',
      };
    }
  }

  /**
   * Update user by ID (admin function)
   */
  async updateUser(
    userId: string,
    updates: Record<string, unknown>
  ): Promise<AuthUser | null> {
    try {
      // Update user profile in database
      const updateResult = await this.userService.updateUserProfile(
        userId,
        updates
      );

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
          onboardingStatus: updatedProfile.onboardingStatus,
          onboardingStep: updatedProfile.onboardingStep,
          onboardingCompletedAt: updatedProfile.onboardingCompletedAt,
          onboardingData: updatedProfile.onboardingData,
          // MFA fields
          mfaEnabled: updatedProfile.mfaEnabled,
          mfaSetupCompleted: updatedProfile.mfaSetupCompleted,
          mfaVerifiedAt: updatedProfile.mfaVerifiedAt,
          rememberDeviceEnabled: updatedProfile.rememberDeviceEnabled,
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
  async updateProfile(
    updates: Partial<User>
  ): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return { user: null, error: 'Not authenticated' };
      }

      // Update auth metadata if needed
      const authUpdates: Record<string, unknown> = {};
      if (updates.firstName || updates.lastName) {
        authUpdates.data = {
          ...user.user_metadata,
          first_name:
            updates.firstName ||
            user.user_metadata.firstName ||
            user.user_metadata.first_name,
          last_name:
            updates.lastName ||
            user.user_metadata.lastName ||
            user.user_metadata.last_name,
        };
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } =
          await this.supabase.auth.updateUser(authUpdates);
        if (authError) {
          return { user: null, error: authError.message };
        }
      }

      // Update user profile in database
      const updateResult = await this.userService.updateUserProfile(
        user.id,
        updates
      );

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
            onboardingStatus: updatedProfile.onboardingStatus,
            onboardingStep: updatedProfile.onboardingStep,
            onboardingCompletedAt: updatedProfile.onboardingCompletedAt,
            onboardingData: updatedProfile.onboardingData,
            // MFA fields
            mfaEnabled: updatedProfile.mfaEnabled,
            mfaSetupCompleted: updatedProfile.mfaSetupCompleted,
            mfaVerifiedAt: updatedProfile.mfaVerifiedAt,
            rememberDeviceEnabled: updatedProfile.rememberDeviceEnabled,
          },
          error: null,
        };
      }

      return {
        user: null,
        error: updateResult.error || 'Failed to update profile',
      };
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
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
  public async verifyOtp(params: {
    token_hash: string;
    type:
      | 'signup'
      | 'invite'
      | 'magiclink'
      | 'recovery'
      | 'email_change'
      | 'email';
  }) {
    return this.supabase.auth.verifyOtp({
      token_hash: params.token_hash,
      type: params.type as any, // Type assertion to handle Supabase auth type compatibility
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
export const createAuthService = (
  options: CreateAuthServiceOptions = { isServer: true }
) => {
  return AuthService.create(options);
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
