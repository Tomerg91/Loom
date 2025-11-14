/**
 * @fileoverview Dashboard-specific error fallback component.
 * Provides a user-friendly error state with recovery options.
 */

'use client';

import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface DashboardErrorFallbackProps {
  /** The error that was caught */
  error: Error;
  /** Function to reset the error boundary and retry */
  resetError: () => void;
  /** Optional title for the error message */
  title?: string;
  /** Optional description override */
  description?: string;
  /** Optional locale for navigation */
  locale?: string;
  /** Dashboard type for contextual messaging */
  dashboardType?: 'coach' | 'client';
}

/**
 * DashboardErrorFallback Component
 *
 * Displays when a critical error occurs in dashboard components.
 * Provides options to:
 * - Retry loading the dashboard
 * - Return to home page
 * - View error details
 */
export function DashboardErrorFallback({
  error,
  resetError,
  title,
  description,
  locale = 'en',
  dashboardType = 'coach',
}: DashboardErrorFallbackProps) {
  const router = useRouter();

  const defaultTitle =
    title || 'Unable to Load Dashboard';
  const defaultDescription =
    description ||
    `We encountered a problem loading your ${dashboardType} dashboard. This could be due to a network issue or a temporary server problem.`;

  const handleGoHome = () => {
    router.push(`/${locale}/${dashboardType}`);
  };

  return (
    <div className="min-h-[600px] flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-destructive/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">{defaultTitle}</CardTitle>
          <CardDescription className="text-base mt-2">
            {defaultDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Details */}
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription className="mt-2">
              <code className="text-sm font-mono bg-destructive/10 px-2 py-1 rounded">
                {error.message}
              </code>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={resetError}
              variant="default"
              size="lg"
              className="gap-2"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Try Again
            </Button>
            <Button
              onClick={handleGoHome}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Go to Home
            </Button>
          </div>

          {/* Helpful Tips */}
          <div className="bg-sand-50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm text-sand-900">
              Troubleshooting Tips:
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Check your internet connection</li>
              <li>Try refreshing the page</li>
              <li>Clear your browser cache and cookies</li>
              <li>If the problem persists, contact support</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Lightweight inline error fallback for dashboard widgets
 */
export function WidgetErrorFallback({
  error,
  resetError,
  widgetName = 'widget',
}: {
  error: Error;
  resetError: () => void;
  widgetName?: string;
}) {
  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-foreground">
            Failed to load {widgetName}
          </h3>
          <p className="text-sm text-muted-foreground">
            {error.message || 'An unexpected error occurred'}
          </p>
        </div>
        <Button onClick={resetError} variant="outline" size="sm" className="gap-2">
          <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </Button>
      </div>
    </div>
  );
}
