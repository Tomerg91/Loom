import { Suspense } from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SignupForm } from '@/components/auth/signup-form';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface SignupPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirectTo?: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return {
    title: t('signup.title'),
    description: t('signup.description'),
  };
}

function SignupFormSkeleton() {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </CardContent>
    </Card>
  );
}

export default async function SignupPage({ params, searchParams }: SignupPageProps) {
  const { locale } = await params;
  const { redirectTo } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            {t('joinUs')}
          </h1>
          <p className="text-muted-foreground">
            {t('joinUsDescription')}
          </p>
        </div>
        
        <Suspense fallback={<SignupFormSkeleton />}>
          <SignupForm redirectTo={redirectTo} />
        </Suspense>
      </div>
    </div>
  );
}