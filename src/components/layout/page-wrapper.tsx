import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { ErrorDisplay } from '@/components/error/error-display';
import { AppLayout } from '@/components/layout/app-layout';
import { getServerUser } from '@/lib/auth/auth';
import type { UserRole } from '@/types';

export interface PageWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRoles?: UserRole[];
  locale?: string;
  containerClassName?: string;
  showAppLayout?: boolean;
  loadingComponent?: React.ReactNode;
  errorBoundary?: boolean;
}

/**
 * Standardized page wrapper component
 * Consolidates common page patterns: auth checking, layout, loading states
 */
export async function PageWrapper({
  children,
  requireAuth = false,
  requiredRoles = [],
  locale = 'en',
  containerClassName = 'container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8',
  showAppLayout = true,
  loadingComponent,
  errorBoundary = true,
}: PageWrapperProps) {
  // Handle authentication if required
  if (requireAuth) {
    const user = await getServerUser();
    
    if (!user) {
      redirect(`/${locale}/auth/signin`);
    }

    // Check role-based access if specified
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      redirect(`/${locale}/dashboard`);
    }
  }

  const defaultLoadingComponent = (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  const content = (
    <Suspense fallback={loadingComponent || defaultLoadingComponent}>
      {errorBoundary ? (
        <ErrorBoundaryWrapper>
          <div className={containerClassName}>
            {children}
          </div>
        </ErrorBoundaryWrapper>
      ) : (
        <div className={containerClassName}>
          {children}
        </div>
      )}
    </Suspense>
  );

  if (!showAppLayout) {
    return content;
  }

  return (
    <AppLayout>
      {content}
    </AppLayout>
  );
}

/**
 * Client-side error boundary wrapper
 */
function ErrorBoundaryWrapper({ children }: { children: React.ReactNode }) {
  // This would typically use react-error-boundary or a custom error boundary
  // For now, we'll just render the children directly
  // TODO: Implement proper error boundary with ErrorDisplay component
  return <>{children}</>;
}

/**
 * Page wrapper for client components
 */
export interface ClientPageWrapperProps extends Omit<PageWrapperProps, 'requireAuth' | 'requiredRoles'> {
  user?: { role: UserRole } | null;
  requiredRoles?: UserRole[];
}

export function ClientPageWrapper({
  children,
  user,
  requiredRoles = [],
  locale: _locale = 'en',
  containerClassName = 'container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8',
  showAppLayout = true,
  loadingComponent,
  errorBoundary = true,
}: ClientPageWrapperProps) {
  // Client-side role checking
  if (requiredRoles.length > 0) {
    if (!user) {
      return (
        <ErrorDisplay
          variant="page"
          title="Authentication Required"
          description="Please sign in to access this page."
          showResetButton={false}
          showHomeButton={true}
        />
      );
    }

    if (!requiredRoles.includes(user.role)) {
      return (
        <ErrorDisplay
          variant="page"
          title="Access Denied"
          description="You don't have permission to access this page."
          showResetButton={false}
          showHomeButton={true}
          showBackButton={true}
        />
      );
    }
  }

  const defaultLoadingComponent = (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  const content = (
    <Suspense fallback={loadingComponent || defaultLoadingComponent}>
      {errorBoundary ? (
        <ErrorBoundaryWrapper>
          <div className={containerClassName}>
            {children}
          </div>
        </ErrorBoundaryWrapper>
      ) : (
        <div className={containerClassName}>
          {children}
        </div>
      )}
    </Suspense>
  );

  if (!showAppLayout) {
    return content;
  }

  return (
    <AppLayout>
      {content}
    </AppLayout>
  );
}

/**
 * Simplified page wrapper for basic pages
 */
export function SimplePage({ 
  children, 
  className = 'container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8' 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <AppLayout>
      <div className={className}>
        {children}
      </div>
    </AppLayout>
  );
}

/**
 * Loading page component
 */
export function LoadingPage({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen-mobile flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <div className="space-y-2">
          <p className="text-lg font-medium">Loading</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Error page component
 */
export function ErrorPage({ 
  error, 
  reset 
}: { 
  error?: Error; 
  reset?: () => void; 
}) {
  return (
    <ErrorDisplay
      error={error}
      reset={reset}
      variant="page"
      showHomeButton={true}
      showBackButton={true}
    />
  );
}