'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to the console and any error reporting service
    console.error('Locale-specific error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6">
          <AlertTriangle className="mx-auto h-16 w-16 text-destructive" />
        </div>
        
        <h1 className="mb-4 text-2xl font-bold text-foreground">
          Something went wrong
        </h1>
        
        <p className="mb-6 text-muted-foreground">
          We encountered an error while loading this page. Please try again or go back to the homepage.
        </p>
        
        <div className="space-y-2">
          <Button
            onClick={reset}
            className="w-full"
            variant="default"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="w-full"
          >
            Go to homepage
          </Button>
        </div>
        
        {error.digest && (
          <div className="mt-4 text-xs text-muted-foreground">
            Error ID: {error.digest}
          </div>
        )}
      </div>
    </div>
  );
}