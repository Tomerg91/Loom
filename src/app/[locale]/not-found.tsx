'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  const t = useTranslations('notFound');
  const getTranslation = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-6xl">404</div>
          <CardTitle className="text-2xl">{getTranslation('title', 'Page Not Found')}</CardTitle>
          <CardDescription>{getTranslation('description', 'Sorry, we could not find the page you are looking for.')}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild>
            <Link href="/">
              {getTranslation('backHome', 'Back to Home')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}