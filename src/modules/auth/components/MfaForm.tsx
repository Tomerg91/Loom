/**
 * @fileoverview Module wrapper that exposes the MFA setup and verification
 * experiences via a single component.
 *
 * Keeping this adapter inside the auth module allows feature code to avoid
 * importing from legacy `src/components/auth` paths directly. Once the migration
 * completes we can move the underlying forms into this directory without
 * touching downstream callers.
 */

'use client';

import { MfaSetupForm } from '@/components/auth/mfa-setup-form';
import { MfaVerificationForm } from '@/components/auth/mfa-verification-form';

export type MfaFormProps =
  | {
      variant: 'setup';
      userId: string;
      userEmail: string;
      isRequired?: boolean;
      redirectTo?: string;
      onSuccess?: () => void;
      onCancel?: () => void;
    }
  | {
      variant: 'verify';
      userId: string;
      mfaSessionToken?: string;
      redirectTo?: string;
      onSuccess?: () => void;
      onCancel?: () => void;
    };

/**
 * Chooses between the setup and verification forms based on the provided
 * variant. This maintains parity with the existing UX while introducing a
 * module-friendly entry point for future refactors.
 */
export function MfaForm(props: MfaFormProps) {
  if (props.variant === 'setup') {
    const { variant: _variant, ...setupProps } = props;
    return <MfaSetupForm {...setupProps} />;
  }

  const { variant: _variant, ...verifyProps } = props;
  return <MfaVerificationForm {...verifyProps} />;
}
