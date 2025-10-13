'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  logPrefix?: string;
  isGlobal?: boolean;
}

export function ErrorPageComponent({
  error,
  reset,
  title = "Something went wrong",
  description = "We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.",
  logPrefix = "Application error",
  isGlobal = false,
}: ErrorPageProps) {
  useEffect(() => {
    console.error(`${logPrefix}:`, error);
  }, [error, logPrefix]);

  const content = (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6">
          <AlertTriangle className={`mx-auto h-16 w-16 ${isGlobal ? 'text-red-500' : 'text-destructive'}`} />
        </div>
        
        <h1 className={`mb-4 text-2xl font-bold ${isGlobal ? 'text-gray-900' : 'text-foreground'}`}>
          {title}
        </h1>
        
        <p className={`mb-6 ${isGlobal ? 'text-gray-600' : 'text-muted-foreground'}`}>
          {description}
        </p>
        
        <div className="space-y-2">
          <Button
            onClick={reset}
            className={`w-full ${isGlobal ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
            variant={isGlobal ? undefined : "default"}
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
          <div className={`mt-4 text-xs ${isGlobal ? 'text-gray-500' : 'text-muted-foreground'}`}>
            Error ID: {error.digest}
          </div>
        )}
      </div>
    </div>
  );

  // For global errors, wrap in full HTML structure
  if (isGlobal) {
    return (
      <html>
        <body className="min-h-screen bg-background">
          {content}
        </body>
      </html>
    );
  }

  return content;
}

export default ErrorPageComponent;