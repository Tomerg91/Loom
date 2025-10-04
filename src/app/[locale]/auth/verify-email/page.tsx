import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface VerifyEmailPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });

  return {
    title: t('verifyEmail.title'),
    description: t('verifyEmail.description'),
  };
}

export default async function VerifyEmailPage({
  params,
  searchParams,
}: VerifyEmailPageProps) {
  const { locale } = await params;
  const { email } = await searchParams;
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

      <div className="relative flex items-center justify-center min-h-screen px-4 py-12">
        <Card className="w-full max-w-lg bg-white border border-neutral-300 shadow-lg rounded-xl">
          <CardHeader className="space-y-4 text-center px-8 pt-8 pb-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-orange-100 p-4">
                <Mail className="h-12 w-12 text-orange-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-light text-neutral-900">
              {t('verifyEmail.title')}
            </CardTitle>
            <CardDescription className="text-base font-light text-neutral-600">
              {email
                ? t('verifyEmail.descriptionWithEmail', { email })
                : t('verifyEmail.description')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 px-8 pb-8">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-neutral-900">
                    {t('verifyEmail.step1.title')}
                  </p>
                  <p className="text-sm text-neutral-600">
                    {t('verifyEmail.step1.description')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-neutral-900">
                    {t('verifyEmail.step2.title')}
                  </p>
                  <p className="text-sm text-neutral-600">
                    {t('verifyEmail.step2.description')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <ArrowRight className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-neutral-900">
                    {t('verifyEmail.step3.title')}
                  </p>
                  <p className="text-sm text-neutral-600">
                    {t('verifyEmail.step3.description')}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-6">
              <p className="text-sm text-neutral-600 text-center mb-4">
                {t('verifyEmail.didntReceive')}
              </p>
              <div className="flex flex-col gap-3">
                <form action="/api/auth/resend-verification" method="POST">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    type="submit"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('verifyEmail.resendButton')}
                  </Button>
                </form>

                <Button variant="ghost" size="lg" className="w-full" asChild>
                  <Link href="/auth/signin">
                    {t('verifyEmail.backToSignIn')}
                  </Link>
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-800">
                <strong>{t('verifyEmail.note.title')}:</strong>{' '}
                {t('verifyEmail.note.description')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
