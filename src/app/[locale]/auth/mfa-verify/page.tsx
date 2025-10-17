'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import { MfaForm } from '@/modules/auth/components/MfaForm';

export default function MfaVerifyPage() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();

  const userId = searchParams.get('userId');
  const rawRedirectTo = searchParams.get('redirectTo') || '/dashboard';
  const safeRedirectTo =
    rawRedirectTo && rawRedirectTo.startsWith('/')
      ? rawRedirectTo
      : '/dashboard';
  const redirectTo = useMemo(
    () =>
      /^\/(en|he)\//.test(safeRedirectTo)
        ? safeRedirectTo
        : `/${locale}${safeRedirectTo}`,
    [safeRedirectTo, locale]
  );

  if (!userId) {
    // If we don't have a userId (should be provided by the sign-in redirect),
    // send the user back to the signin page quickly without extra network calls
    if (typeof window !== 'undefined') {
      router.replace(`/${locale}/auth/signin`);
    }
    return null;
  }

  const handleSuccess = () => {
    router.push(redirectTo);
    router.refresh();
  };

  const handleCancel = () => {
    router.push(`/${locale}/auth/signin`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <MfaForm
        variant="verify"
        userId={userId}
        redirectTo={redirectTo}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}
