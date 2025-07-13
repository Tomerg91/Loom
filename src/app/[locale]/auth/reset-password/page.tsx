import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string; redirectTo?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token, redirectTo } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {token ? 'Set New Password' : 'Reset Password'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {token 
              ? 'Enter your new password below'
              : 'Enter your email address and we\'ll send you a reset link'
            }
          </p>
        </div>
        
        <Suspense fallback={<div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>}>
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
  );
}