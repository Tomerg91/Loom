'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/routing';

export default function NotFound() {
  const t = useTranslations('notFound');
  const getTranslation = (key: string, fallback: string) => {
    try {
      const value = t(key);
      return value === key ? fallback : value;
    } catch {
      return fallback;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-6xl font-bold text-destructive">404</div>
          <CardTitle className="text-2xl">{getTranslation('title', 'Page Not Found')}</CardTitle>
          <CardDescription>{getTranslation('description', 'Sorry, we could not find the page you are looking for.')}</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Button asChild className="w-full">
            <Link href="/">
              {getTranslation('backHome', 'Back to Home')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
