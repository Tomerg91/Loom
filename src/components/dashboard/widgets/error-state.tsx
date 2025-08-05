import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorStateProps {
  title?: string;
  description?: string;
  message?: string;
  variant?: 'page' | 'card' | 'inline';
  onRetry?: () => void;
  showRetry?: boolean;
  showGoHome?: boolean;
}

export function ErrorState({ 
  title, 
  description, 
  message = "Something went wrong while loading the data",
  variant = 'page',
  onRetry,
  showRetry = true,
  showGoHome = false
}: ErrorStateProps) {
  if (variant === 'inline') {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{message}</span>
          {showRetry && onRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              className="ml-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === 'card') {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col items-center justify-center h-32 space-y-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-destructive">Error</p>
            <p className="text-xs text-muted-foreground">{message}</p>
          </div>
          {showRetry && onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {title && description && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">{description}</p>
          </div>
        </div>
      )}
      
      {/* Error content */}
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-6 max-w-md">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Oops! Something went wrong</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showRetry && onRetry && (
              <Button onClick={onRetry} className="flex items-center">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            {showGoHome && (
              <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground">
            If this problem persists, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}