/**
 * Resource Error Boundary Component
 *
 * Error boundary specifically for resource library features:
 * - Catches React errors in resource components
 * - Provides user-friendly error messages
 * - Offers recovery actions
 * - Logs errors for debugging
 *
 * @module components/resources/resource-error-boundary
 */

'use client';

import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Component, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ResourceErrorBoundary Component
 */
export class ResourceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Resource Error Boundary caught an error:', error, errorInfo);
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // In production, you would send this to an error reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="max-w-2xl mx-auto my-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <CardTitle>Something went wrong</CardTitle>
                <CardDescription>
                  An error occurred while loading your resources
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-2">Error Details:</p>
              <p className="text-sm text-muted-foreground font-mono">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">What you can try:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Refresh the page</li>
                <li>Clear your browser cache</li>
                <li>Try again in a few minutes</li>
                <li>Contact support if the problem persists</li>
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex gap-2">
            <Button onClick={this.handleReset} variant="default">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline">
              Reload Page
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}
