'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  // Fallback to English if translations fail
  let t;
  try {
    t = useTranslations('notFound');
  } catch {
    t = (key: string) => {
      const fallbacks: Record<string, string> = {
        title: 'Page Not Found',
        description: 'Sorry, we could not find the page you are looking for.',
        backHome: 'Back to Home',
      };
      return fallbacks[key] || key;
    };
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-6xl">404</div>
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild>
            <Link href="/">
              {t('backHome')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}