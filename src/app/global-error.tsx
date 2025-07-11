'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to the console and any error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-background">
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <div className="mb-6">
              <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />
            </div>
            
            <h1 className="mb-4 text-2xl font-bold text-gray-900">
              Application Error
            </h1>
            
            <p className="mb-6 text-gray-600">
              A critical error occurred. Please refresh the page or contact support.
            </p>
            
            <div className="space-y-2">
              <Button
                onClick={reset}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
              <div className="mt-4 text-xs text-gray-500">
                Error ID: {error.digest}
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}