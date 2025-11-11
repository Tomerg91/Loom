import type { User as SupabaseAuthUser } from '@supabase/supabase-js';

import { routing } from '@/i18n/routing';
import { config } from '@/lib/config';
import type { UserServiceOptions } from '@/lib/database/users';
import { supabase as clientSupabase } from '@/modules/platform/supabase/client';
import {
  createClient,
  createAdminClient,
} from '@/modules/platform/supabase/server';
import type { Language, User, UserRole, UserStatus } from '@/types';

type AuthMetadata = Record<string, unknown> | null | undefined;

const isUserRole = (value: unknown): value is UserRole =>
  value === 'admin' || value === 'coach' || value === 'client';

const coerceUserRole = (
  ...values: (unknown | (() => unknown))[]
): UserRole | null => {
  for (const candidate of values) {
    const value = typeof candidate === 'function' ? candidate() : candidate;
    if (isUserRole(value)) {
      return value;
    }
    if (typeof value === 'string' && isUserRole(value.toLowerCase())) {
      return value.toLowerCase() as UserRole;
    }
  }
  return null;
};

const coerceUserStatus = (
  ...values: (unknown | (() => unknown))[]
): UserStatus | null => {
  for (const candidate of values) {
    const value = typeof candidate === 'function' ? candidate() : candidate;
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (
        normalized === 'active' ||
        normalized === 'inactive' ||
        normalized === 'suspended'
      ) {
        return normalized as UserStatus;
      }

      if (normalized === 'onboarding') {
        return 'active';
      }
      if (normalized === 'disabled' || normalized === 'deactivated') {
        return 'inactive';
      }
    }

    if (typeof value === 'boolean') {
      return value ? 'active' : 'inactive';
    }
  }

  return null;
};

const coerceBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return undefined;
};

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const coerceString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
};

const coerceLanguage = (
  ...values: (unknown | (() => unknown))[]
): Language | null => {
  for (const candidate of values) {
    const value = typeof candidate === 'function' ? candidate() : candidate;
    if (typeof value !== 'string') {
      continue;
    }

    const normalized = value.toLowerCase();
    if (normalized === 'en' || normalized === 'he') {
      return normalized as Language;
    }

    if (normalized.startsWith('en')) {
      return 'en';
    }
    if (normalized.startsWith('he')) {
      return 'he';
    }
  }

  return null;
};

const getMetadataValue = (metadata: AuthMetadata, keys: string[]): unknown => {
  if (!metadata) {
    return undefined;
  }

  const record = metadata as Record<string, unknown>;

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }
  return undefined;
};

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

    const { isServer = true, supabaseClient } = options;

    if (isServer) {
      const supabase = supabaseClient ?? createClient();
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

  private buildAuthUserFromAuthMetadata(
    supabaseUser: SupabaseAuthUser
  ): AuthUser {
    const userMetadata = (supabaseUser.user_metadata ?? {}) as Record<
      string,
      any
    >;
    const appMetadata = (supabaseUser.app_metadata ?? {}) as Record<
      string,
      any
    >;

    const role =
      coerceUserRole(
        userMetadata.role,
        appMetadata.role,
        userMetadata.role_id,
        userMetadata.user_role,
        getMetadataValue(userMetadata, ['roleName', 'userRole']),
        getMetadataValue(appMetadata, ['roleName', 'userRole'])
      ) || 'client';

    let status = coerceUserStatus(
      userMetadata.status,
      appMetadata.status,
      getMetadataValue(userMetadata, ['account_status', 'user_status']),
      getMetadataValue(appMetadata, ['account_status', 'user_status']),
      getMetadataValue(userMetadata, [`${role}_status`]),
      getMetadataValue(appMetadata, [`${role}_status`])
    );

    if (!status) {
      const suspendedFlags = [
        getMetadataValue(userMetadata, [
          'is_suspended',
          'suspended',
          'suspension_status',
        ]),
        getMetadataValue(appMetadata, [
          'is_suspended',
          'suspended',
          'suspension_status',
        ]),
      ];

      for (const flag of suspendedFlags) {
        if (coerceBoolean(flag)) {
          status = 'suspended';
          break;
        }
      }
    }

    if (!status) {
      const activeFlags = [
        getMetadataValue(userMetadata, ['is_active', 'active']),
        getMetadataValue(appMetadata, ['is_active', 'active']),
      ];

      for (const flag of activeFlags) {
        const bool = coerceBoolean(flag);
        if (typeof bool === 'boolean') {
          status = bool ? 'active' : 'inactive';
          break;
        }
      }
    }

    if (!status) {
      status = 'active';
      console.warn(
        '[AuthService] Falling back to active status from auth metadata due to missing profile data.',
        {
          userId: supabaseUser.id,
        }
      );
    }

    const language =
      coerceLanguage(
        userMetadata.language,
        appMetadata.language,
        getMetadataValue(userMetadata, ['preferred_language', 'locale']),
        getMetadataValue(appMetadata, ['preferred_language', 'locale'])
      ) || (routing.defaultLocale as Language);

    const onboardingStatusValue = coerceString(
      getMetadataValue(userMetadata, ['onboarding_status']) ??
        getMetadataValue(appMetadata, ['onboarding_status'])
    );

    const onboardingStatus = onboardingStatusValue
      ? ['pending', 'in_progress', 'completed'].includes(onboardingStatusValue)
        ? (onboardingStatusValue as 'pending' | 'in_progress' | 'completed')
        : 'pending'
      : 'pending';

    const onboardingStep =
      coerceNumber(
        getMetadataValue(userMetadata, ['onboarding_step']) ??
          getMetadataValue(appMetadata, ['onboarding_step'])
      ) ?? 0;

    const mfaEnabled = coerceBoolean(
      getMetadataValue(userMetadata, ['mfa_enabled', 'mfaEnabled']) ??
        getMetadataValue(appMetadata, ['mfa_enabled', 'mfaEnabled'])
    );

    const mfaSetupCompleted = coerceBoolean(
      getMetadataValue(userMetadata, ['mfa_setup_completed']) ??
        getMetadataValue(appMetadata, ['mfa_setup_completed'])
    );

    const rememberDeviceEnabled = coerceBoolean(
      getMetadataValue(userMetadata, ['remember_device_enabled']) ??
        getMetadataValue(appMetadata, ['remember_device_enabled'])
    );

    const onboardingData = getMetadataValue(userMetadata, ['onboarding_data']);

    return {
      id: supabaseUser.id,
      email: supabaseUser.email ?? '',
      role,
      firstName:
        coerceString(
          getMetadataValue(userMetadata, [
            'first_name',
            'firstName',
            'given_name',
          ]) ?? getMetadataValue(appMetadata, ['first_name', 'firstName'])
        ) || undefined,
      lastName:
        coerceString(
          getMetadataValue(userMetadata, [
            'last_name',
            'lastName',
            'family_name',
          ]) ?? getMetadataValue(appMetadata, ['last_name', 'lastName'])
        ) || undefined,
      phone:
        coerceString(
          getMetadataValue(userMetadata, ['phone', 'phone_number']) ??
            getMetadataValue(appMetadata, ['phone', 'phone_number'])
        ) || undefined,
      avatarUrl:
        coerceString(
          getMetadataValue(userMetadata, ['avatar_url', 'avatar']) ??
            getMetadataValue(appMetadata, ['avatar_url', 'avatar'])
        ) || undefined,
      timezone:
        coerceString(
          getMetadataValue(userMetadata, ['timezone', 'time_zone']) ??
            getMetadataValue(appMetadata, ['timezone', 'time_zone'])
        ) || undefined,
      language,
      status,
      createdAt: supabaseUser.created_at ?? new Date().toISOString(),
      updatedAt:
        supabaseUser.updated_at ??
        supabaseUser.created_at ??
        new Date().toISOString(),
      lastSeenAt:
        coerceString(
          getMetadataValue(userMetadata, ['last_seen_at', 'lastSeenAt']) ??
            getMetadataValue(appMetadata, ['last_seen_at', 'lastSeenAt'])
        ) || undefined,
      onboardingStatus,
      onboardingStep,
      onboardingCompletedAt:
        coerceString(
          getMetadataValue(userMetadata, ['onboarding_completed_at']) ??
            getMetadataValue(appMetadata, ['onboarding_completed_at'])
        ) || undefined,
      onboardingData:
        onboardingData && typeof onboardingData === 'object'
          ? (onboardingData as Record<string, unknown>)
          : {},
      mfaEnabled: mfaEnabled ?? undefined,
      mfaSetupCompleted: mfaSetupCompleted ?? undefined,
      mfaVerifiedAt:
        coerceString(
          getMetadataValue(userMetadata, ['mfa_verified_at']) ??
            getMetadataValue(appMetadata, ['mfa_verified_at'])
        ) || undefined,
      rememberDeviceEnabled: rememberDeviceEnabled ?? undefined,
      metadata: {
        ...appMetadata,
        ...userMetadata,
      },
    };
  }

  /**
   * Sign up a new user
   */
  async signUp(data: SignUpData): Promise<{
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
        const { createAdminClient } = await import(
          '@/modules/platform/supabase/server'
        );
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
  async signIn(data: SignInData): Promise<{
    user: AuthUser | null;
    error: string | null;
    session: AuthSessionTokens | null;
  }> {
    try {
      console.log('[AuthService] signIn: Starting authentication...');

      const { data: authData, error: authError } =
        await this.supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      console.log('[AuthService] signIn: Supabase auth completed', {
        success: !authError,
        hasUser: !!authData?.user
      });

      if (authError) {
        return { user: null, error: authError.message, session: null };
      }

      if (!authData.user) {
        return { user: null, error: 'Failed to sign in', session: null };
      }

      let activeSession = authData.session ?? null;
      console.log('[AuthService] signIn: authData.session check', {
        hasAuthDataSession: !!authData.session,
        hasAccessToken: !!authData.session?.access_token,
        hasRefreshToken: !!authData.session?.refresh_token,
        authDataSessionType: typeof authData.session
      });

      if (authData.session?.access_token && authData.session?.refresh_token) {
        console.log('[AuthService] signIn: Calling setSession with tokens');
        const { data: sessionData, error: sessionError } =
          await this.supabase.auth.setSession({
            access_token: authData.session.access_token,
            refresh_token: authData.session.refresh_token,
          });

        console.log('[AuthService] signIn: setSession result', {
          hasError: !!sessionError,
          hasSessionData: !!sessionData,
          errorMessage: sessionError?.message
        });

        if (sessionError) {
          console.error('Failed to hydrate Supabase session after sign-in:', {
            error: sessionError.message,
          });
        } else if (sessionData?.session) {
          activeSession = sessionData.session;
          console.log('[AuthService] signIn: Updated activeSession from setSession');
        }
      } else {
        console.warn('[AuthService] signIn: authData.session missing tokens');
      }

      const sessionTokens: AuthSessionTokens | null = activeSession
        ? {
            accessToken: activeSession.access_token,
            refreshToken: activeSession.refresh_token,
            expiresAt: activeSession.expires_at ?? null,
          }
        : null;

      let authUser: AuthUser | null = null;

      // Prefer the service-role client when available but gracefully degrade when
      // the environment is missing the key (e.g., local dev without secrets).
      // IMPORTANT: Skip admin client in browser - service role key should only be used server-side
      const isBrowser = typeof window !== 'undefined';
      console.log('[AuthService] signIn: Environment check', { isBrowser, isServer: this.isServer });

      if (this.isServer && !isBrowser) {
        console.log('[AuthService] signIn: Using admin client (server-side)');
        try {
          const adminClient = createAdminClient();

          const timestamp = new Date().toISOString();
          const { error: lastSeenError } = await adminClient
            .from('users')
            .update({ last_seen_at: timestamp })
            .eq('id', authData.user.id);

          if (lastSeenError) {
            console.warn(
              '[AuthService] Failed to update last_seen_at with admin client:',
              {
                userId: authData.user.id,
                error: lastSeenError.message,
              }
            );
          }

          const { data: profileData, error: profileError } = await adminClient
            .from('users')
            .select(
              'id, email, first_name, last_name, role, language, status, created_at, updated_at, avatar_url, phone, timezone, last_seen_at, onboarding_status, onboarding_step, onboarding_completed_at, onboarding_data, mfa_enabled, mfa_setup_completed, mfa_verified_at, remember_device_enabled'
            )
            .eq('id', authData.user.id)
            .single();

          console.log('[AuthService] signIn: Admin profile fetch completed', {
            success: !profileError,
            hasData: !!profileData
          });

          if (!profileError && profileData) {
          authUser = {
            id: profileData.id,
            email: profileData.email,
            role: profileData.role as any,
            firstName: profileData.first_name || '',
            lastName: profileData.last_name || '',
            phone: profileData.phone || '',
            avatarUrl: profileData.avatar_url || '',
            timezone: profileData.timezone || '',
            language: profileData.language as any,
            status: profileData.status as any,
            createdAt: profileData.created_at || new Date().toISOString(),
            updatedAt: profileData.updated_at || new Date().toISOString(),
            lastSeenAt: profileData.last_seen_at || undefined,
            onboardingStatus:
              (profileData.onboarding_status as
                | 'pending'
                | 'in_progress'
                | 'completed') || 'pending',
            onboardingStep: profileData.onboarding_step ?? 0,
            onboardingCompletedAt:
              profileData.onboarding_completed_at || undefined,
            onboardingData:
              (profileData.onboarding_data as Record<string, unknown>) || {},
            mfaEnabled: profileData.mfa_enabled ?? false,
            mfaSetupCompleted: profileData.mfa_setup_completed ?? false,
            mfaVerifiedAt: profileData.mfa_verified_at || undefined,
            rememberDeviceEnabled: profileData.remember_device_enabled ?? false,
          };
          } else if (profileError) {
            console.warn(
              '[AuthService] Admin client profile fetch failed after signin:',
              {
                userId: authData.user.id,
                error: profileError.message,
              }
            );
          }
        } catch (adminError) {
          console.warn('[AuthService] Admin client unavailable during signin:', {
            userId: authData.user.id,
            error: adminError instanceof Error ? adminError.message : adminError,
          });
        }
      } else {
        console.log('[AuthService] signIn: Skipping admin client (browser-side or isServer=false)');
      }

      if (!authUser) {
        console.log('[AuthService] signIn: Using fallback user profile fetch');

        const updateResult = await this.userService.updateLastSeen(
          authData.user.id
        );
        console.log('[AuthService] signIn: updateLastSeen completed', { success: updateResult.success });

        if (!updateResult.success) {
          console.warn(
            '[AuthService] updateLastSeen fallback failed after signin:',
            {
              userId: authData.user.id,
              error: updateResult.error,
            }
          );
        }

        console.log('[AuthService] signIn: Fetching user profile...');
        const profileResult = await this.userService.getUserProfile(
          authData.user.id
        );
        console.log('[AuthService] signIn: getUserProfile completed', { success: profileResult.success });

        if (profileResult.success) {
          authUser = this.mapUserProfileToAuthUser(profileResult.data);
        } else {
          console.warn(
            '[AuthService] getUserProfile fallback failed after signin:',
            {
              userId: authData.user.id,
              error: profileResult.error,
            }
          );
        }
      }

      console.log('[AuthService] signIn: Final auth user check', { hasAuthUser: !!authUser });

      if (!authUser) {
        console.warn(
          '[AuthService] Falling back to auth metadata after profile lookups failed during signin',
          {
            userId: authData.user.id,
          }
        );
        authUser = this.buildAuthUserFromAuthMetadata(authData.user);
      }

      console.log('[AuthService] signIn: Returning with session tokens', {
        hasSessionTokens: !!sessionTokens,
        sessionTokensKeys: sessionTokens ? Object.keys(sessionTokens) : null,
        activeSessionExists: !!activeSession
      });

      return {
        user: authUser,
        error: null,
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
   *
   * SECURITY: Supports two password reset flows:
   *
   * Flow 1: Supabase Recovery Token (from email link)
   * 1. User receives password reset email with token in URL fragment
   * 2. Supabase JS SDK auto-sets up session from fragment
   * 3. Token parameter identifies this is a recovery flow
   * 4. Call updateUser({ password }) with established session
   *
   * Flow 2: Email Verification Code (custom flow)
   * 1. User requests password reset via email
   * 2. User receives verification code (handled separately)
   * 3. User enters verification code (validated server-side)
   * 4. User enters new password
   * 5. Call updateUser({ password }) with established session
   * 6. No token needed - verification already happened
   *
   * In both cases, Supabase session must be established before calling this method.
   */
  async updatePasswordWithToken(
    token: string,
    password: string
  ): Promise<{ error: string | null }> {
    try {
      // Update the password with the authenticated session
      const { error } = await this.supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error('Password update failed:', error);
        return { error: error.message };
      }

      console.info('Password successfully updated');
      return { error: null };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update password',
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
