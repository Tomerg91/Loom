import { Suspense } from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SigninForm } from '@/components/auth/signin-form';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface SigninPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirectTo?: string; expired?: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return {
    title: t('signin.title'),
    description: t('signin.description'),
  };
}

function SigninFormSkeleton() {
  return (
    <Card className="w-full max-w-md mx-auto bg-white border border-neutral-300 shadow-lg rounded-xl">
      <CardContent className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </CardContent>
    </Card>
  );
}

export default async function SigninPage({ params, searchParams }: SigninPageProps) {
  const { locale } = await params;
  const { redirectTo, expired } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 relative">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(0,0,0)_1px,transparent_0)] bg-[length:20px_20px]" />
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-200 rounded-full opacity-20 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-200 rounded-full opacity-20 blur-3xl" />

      <div className="relative flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-extralight text-neutral-900 tracking-tight">
              {t('welcome')}
            </h1>
            <p className="text-lg font-light text-neutral-600">
              {t('welcomeDescription')}
            </p>
          </div>

          {expired && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">Session Expired</p>
              <p className="mt-1 text-amber-700">
                Your session has expired. Please sign in again to continue.
              </p>
            </div>
          )}

          <Suspense fallback={<SigninFormSkeleton />}>
            <SigninForm redirectTo={redirectTo} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}