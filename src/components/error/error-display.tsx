'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ErrorDisplayProps {
  error?: Error & { digest?: string };
  reset?: () => void;
  variant?: 'page' | 'global' | 'component';
  title?: string;
  description?: string;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  showResetButton?: boolean;
  className?: string;
  onBack?: () => void;
  onHome?: () => void;
}

/**
 * Reusable error display component
 * Consolidates error UI from error.tsx, global-error.tsx, and component error states
 */
export function ErrorDisplay({
  error,
  reset,
  variant = 'page',
  title,
  description,
  showHomeButton = true,
  showBackButton = false,
  showResetButton = true,
  className,
  onBack,
  onHome,
}: ErrorDisplayProps) {
  useEffect(() => {
    // Log error for monitoring
    if (error) {
      console.error('Error caught by ErrorDisplay:', error);
      
      // Report to error monitoring service (Sentry, etc.)
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'exception', {
          description: error.message || 'Unknown error',
          fatal: variant === 'global',
        });
      }
    }
  }, [error, variant]);

  const getErrorDetails = () => {
    if (title && description) {
      return { title, description };
    }

    switch (variant) {
      case 'global':
        return {
          title: 'Application Error',
          description: 'A critical error occurred that requires reloading the application. We apologize for the inconvenience.',
        };
      case 'component':
        return {
          title: 'Component Error',
          description: 'This component encountered an error. You can try refreshing or continue using other parts of the application.',
        };
      default:
        return {
          title: 'Something went wrong!',
          description: 'An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.',
        };
    }
  };

  const { title: errorTitle, description: errorDescription } = getErrorDetails();

  const handleReset = () => {
    if (reset) {
      reset();
    } else if (variant === 'global') {
      window.location.reload();
    }
  };

  const handleHome = () => {
    if (onHome) {
      onHome();
    } else {
      window.location.href = '/';
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  if (variant === 'component') {
    return (
      <Card className={cn('border-destructive/50 bg-destructive/5', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">{errorTitle}</CardTitle>
          </div>
          <CardDescription>{errorDescription}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {error && process.env.NODE_ENV === 'development' && (
            <details className="mb-4">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Error Details (Development)
              </summary>
              <pre className="mt-2 p-2 text-xs bg-muted rounded border overflow-auto">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
          <div className="flex gap-2">
            {showResetButton && reset && (
              <Button onClick={handleReset} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            {showBackButton && (
              <Button onClick={handleBack} size="sm" variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn(
      'min-h-screen flex items-center justify-center p-4',
      variant === 'global' ? 'bg-background' : 'bg-muted/20',
      className
    )}>
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-2">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {errorTitle}
          </h1>
          <p className="text-muted-foreground">
            {errorDescription}
          </p>
        </div>

        {error && process.env.NODE_ENV === 'development' && (
          <details className="text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Error Details (Development)
            </summary>
            <div className="mt-2 p-4 text-xs bg-muted rounded border">
              <div className="font-medium text-foreground mb-2">Error Message:</div>
              <div className="mb-4 text-destructive">{error.message}</div>
              
              {error.digest && (
                <>
                  <div className="font-medium text-foreground mb-2">Error ID:</div>
                  <div className="mb-4 font-mono text-xs">{error.digest}</div>
                </>
              )}

              {error.stack && (
                <>
                  <div className="font-medium text-foreground mb-2">Stack Trace:</div>
                  <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                    {error.stack}
                  </pre>
                </>
              )}
            </div>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {showResetButton && (
            <Button onClick={handleReset} className="flex items-center">
              <RefreshCw className="h-4 w-4 mr-2" />
              {variant === 'global' ? 'Reload Application' : 'Try Again'}
            </Button>
          )}
          
          {showHomeButton && (
            <Button onClick={handleHome} variant="outline" className="flex items-center">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          )}

          {showBackButton && (
            <Button onClick={handleBack} variant="ghost" className="flex items-center">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          )}
        </div>

        {variant !== 'global' && (
          <p className="text-xs text-muted-foreground">
            If this problem continues, please contact support with the error details above.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Error boundary wrapper component for easier integration
 */
export interface ErrorBoundaryDisplayProps extends Omit<ErrorDisplayProps, 'error' | 'reset'> {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorBoundaryDisplay({ error, resetErrorBoundary, ...props }: ErrorBoundaryDisplayProps) {
  return (
    <ErrorDisplay
      {...props}
      error={error}
      reset={resetErrorBoundary}
    />
  );
}