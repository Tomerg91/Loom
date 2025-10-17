/**
 * @fileoverview React Query hooks for MFA workflows.
 *
 * These hooks wrap the low-level API helpers so React components can manage MFA
 * flows declaratively with built-in caching, loading, and error states.
 */

import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';

import {
  enableMfa,
  fetchMfaStatus,
  requestMfaSetup,
  verifyMfa,
} from '@/modules/auth/api/mfa';
import type {
  MfaEnablePayload,
  MfaEnableResponse,
  MfaSetupResponse,
  MfaStatusResponse,
  MfaVerifyPayload,
  MfaVerifyResponse,
} from '@/modules/auth/types';

/** React Query keys shared across MFA hooks. */
export const mfaQueryKeys = {
  root: ['auth', 'mfa'] as const,
  status: () => [...mfaQueryKeys.root, 'status'] as const,
};

type SetupOptions = UseMutationOptions<MfaSetupResponse, Error, void>;
type EnableOptions = UseMutationOptions<
  MfaEnableResponse,
  Error,
  MfaEnablePayload
>;
type VerifyOptions = UseMutationOptions<
  MfaVerifyResponse,
  Error,
  MfaVerifyPayload
>;
type StatusOptions = Omit<
  UseQueryOptions<
    MfaStatusResponse,
    Error,
    MfaStatusResponse,
    ReturnType<typeof mfaQueryKeys.status>
  >,
  'queryKey' | 'queryFn'
>;

/**
 * Starts MFA enrollment for the logged-in user.
 */
export function useMfaSetup(options?: SetupOptions) {
  return useMutation<MfaSetupResponse, Error, void>({
    mutationKey: [...mfaQueryKeys.root, 'setup'],
    mutationFn: () => requestMfaSetup(),
    ...options,
  });
}

/**
 * Completes MFA enablement once the user verifies their authenticator code.
 */
export function useMfaEnable(options?: EnableOptions) {
  return useMutation<MfaEnableResponse, Error, MfaEnablePayload>({
    mutationKey: [...mfaQueryKeys.root, 'enable'],
    mutationFn: payload => enableMfa(payload),
    ...options,
  });
}

/**
 * Verifies MFA challenges during the sign-in flow.
 */
export function useMfaVerification(options?: VerifyOptions) {
  return useMutation<MfaVerifyResponse, Error, MfaVerifyPayload>({
    mutationKey: [...mfaQueryKeys.root, 'verify'],
    mutationFn: payload => verifyMfa(payload),
    ...options,
  });
}

/**
 * Retrieves the authenticated user's MFA status.
 */
export function useMfaStatus(options?: StatusOptions) {
  return useQuery<
    MfaStatusResponse,
    Error,
    MfaStatusResponse,
    ReturnType<typeof mfaQueryKeys.status>
  >({
    queryKey: mfaQueryKeys.status(),
    queryFn: () => fetchMfaStatus(),
    staleTime: 60 * 1000,
    retry: 1,
    ...options,
  });
}
