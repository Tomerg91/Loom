/**
 * @fileoverview Request-scoped helpers that read Supabase session data and
 * extract the information middleware requires without leaking Supabase client
 * creation details into other modules.
 */

import type { Session, User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { createServerClientWithRequest } from '@/modules/platform/supabase/server';
import type { UserRole } from '@/types';

function isUserRole(value: unknown): value is UserRole {
  return value === 'admin' || value === 'coach' || value === 'client';
}

function extractRole(user: User | null): UserRole | null {
  if (!user) return null;

  const metadataRole = (user.user_metadata?.role ?? user.app_metadata?.role) as
    | string
    | undefined;
  if (metadataRole && isUserRole(metadataRole)) {
    return metadataRole;
  }

  const rawRole = (user.user_metadata?.role_id ??
    user.user_metadata?.user_role) as string | undefined;
  if (rawRole && isUserRole(rawRole)) {
    return rawRole;
  }

  return null;
}

function isTrue(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export interface SessionContext {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  mfaEnabled: boolean;
  mfaVerified: boolean;
  onboardingCompleted: boolean;
}

/**
 * Reads the Supabase session for an incoming middleware request. The helper is
 * resilient to Supabase errors and simply returns an empty context when the
 * session cannot be fetched so middleware can continue with public behaviour.
 */
export async function getSessionContext(
  request: NextRequest
): Promise<SessionContext> {
  try {
    const responseShim = NextResponse.next();
    const supabase = createServerClientWithRequest(request, responseShim);
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.warn(
        '[auth] Failed to fetch Supabase session in middleware:',
        error
      );
      return {
        session: null,
        user: null,
        role: null,
        mfaEnabled: false,
        mfaVerified: false,
        onboardingCompleted: false,
      };
    }

    const session = data.session ?? null;
    const user = session?.user ?? null;
    const role = extractRole(user);
    const mfaEnabled =
      isTrue(user?.user_metadata?.mfa_enabled) ||
      isTrue(user?.app_metadata?.mfa_enabled);
    const mfaVerified = isTrue(user?.user_metadata?.mfa_verified);

    // Check onboarding completion status from metadata
    const onboardingStatus = (user?.user_metadata?.onboarding_status ??
      user?.app_metadata?.onboarding_status) as string | undefined;
    const onboardingCompleted = onboardingStatus === 'completed';

    return { session, user, role, mfaEnabled, mfaVerified, onboardingCompleted };
  } catch (error) {
    console.warn('[auth] Unexpected error resolving session context:', error);
    return {
      session: null,
      user: null,
      role: null,
      mfaEnabled: false,
      mfaVerified: false,
      onboardingCompleted: false,
    };
  }
}
