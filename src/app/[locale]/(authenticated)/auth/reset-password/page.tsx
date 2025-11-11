'use client';

import { Suspense, useSearchParams } from 'react';

import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || undefined;
  const redirectTo = searchParams.get('redirectTo') || undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 relative">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(0,0,0)_1px,transparent_0)] bg-[length:20px_20px]" />
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-200 rounded-full opacity-20 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-200 rounded-full opacity-20 blur-3xl" />

      <div className="relative flex items-center justify-center min-h-screen px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-extralight text-neutral-900 tracking-tight">
              {token ? 'Set New Password' : 'Reset Password'}
            </h1>
            <p className="text-lg font-light text-neutral-600">
              {token
                ? 'Enter your new password below'
                : 'Enter your email address and we\'ll send you a reset link'
              }
            </p>
          </div>

          <Suspense fallback={
            <div className="bg-white border border-neutral-300 shadow-lg rounded-xl p-8">
              <div className="animate-pulse bg-neutral-200 h-64 rounded-lg"></div>
            </div>
          }>
            <ResetPasswordForm
              token={token}
              onBack={() => window.history.back()}
              onSuccess={() => {
                if (redirectTo) {
                  window.location.href = redirectTo;
                } else {
                  window.location.href = '/auth/signin';
                }
              }}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
