'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { captureError, addBreadcrumb } from '@/lib/monitoring/sentry';
import { alertManager } from '@/lib/monitoring/alerting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

// Error boundary props
interface ProductionErrorBoundaryProps {
  children: ReactNode;
  feature?: string;
  component?: string;
  fallback?: React.ComponentType<ErrorBoundaryFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
}

// Error boundary state
interface ProductionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  isRetrying: boolean;
}

// Fallback component props
export interface ErrorBoundaryFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  retryAction: () => void;
  errorId: string | null;
  feature?: string;
  component?: string;
  retryCount: number;
  showErrorDetails?: boolean;
}

// Business context interface
interface BusinessContext {
  userId?: string;
  userRole?: string;
  sessionId?: string;
  currentPage?: string;
  feature?: string;
  component?: string;
  userAgent?: string;
  timestamp: string;
}

// Production-ready error boundary with comprehensive monitoring
export class ProductionErrorBoundary extends Component<
  ProductionErrorBoundaryProps,
  ProductionErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  
  constructor(props: ProductionErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRetrying: false,
    };
  }
  
  static getDerivedStateFromError(error: Error): Partial<ProductionErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.generateErrorId();
    const businessContext = this.collectBusinessContext();
    
    // Update state with error information
    this.setState({
      errorInfo,
      errorId,
    });
    
    // Add breadcrumb for error context
    addBreadcrumb({
      category: 'error_boundary',
      message: `Error caught in ${this.props.feature || 'unknown'} feature`,
      level: 'error',
      data: {
        component: this.props.component,
        feature: this.props.feature,
        errorId,
        retryCount: this.state.retryCount,
        ...businessContext,
      },
    });
    
    // Capture error with comprehensive context
    captureError(error, {
      errorBoundary: true,
      errorId,
      feature: this.props.feature,
      component: this.props.component,
      retryCount: this.state.retryCount,
      businessContext,
      componentStack: errorInfo.componentStack,
      reactErrorInfo: errorInfo,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      timestamp: new Date().toISOString(),
    });
    
    // Track error rate for alerting
    alertManager.checkMetric('error_rate_percentage', 1, {
      feature: this.props.feature,
      component: this.props.component,
      errorId,
      errorType: error.name,
      errorMessage: error.message,
    });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Log error for development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Business Context:', businessContext);
      console.groupEnd();
    }
  }
  
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private collectBusinessContext(): BusinessContext {
    const context: BusinessContext = {
      timestamp: new Date().toISOString(),
      feature: this.props.feature,
      component: this.props.component,
    };
    
    if (typeof window !== 'undefined') {
      context.currentPage = window.location.pathname;
      context.userAgent = window.navigator.userAgent;
      
      // Try to get user context from local storage
      try {
        const userContext = localStorage.getItem('user-context');
        if (userContext) {
          const userData = JSON.parse(userContext);
          context.userId = userData.id;
          context.userRole = userData.role;
        }
      } catch (e) {
        // Ignore errors accessing localStorage
      }
      
      // Try to get session ID
      try {
        const sessionId = sessionStorage.getItem('session-id');
        if (sessionId) {
          context.sessionId = sessionId;
        }
      } catch (e) {
        // Ignore errors accessing sessionStorage
      }
    }
    
    return context;
  }
  
  private resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRetrying: false,
    });
    
    // Clear retry timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  };
  
  private retryAction = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    // Limit retry attempts
    if (newRetryCount > 3) {
      addBreadcrumb({
        category: 'error_boundary',
        message: 'Maximum retry attempts reached',
        level: 'warning',
        data: {
          feature: this.props.feature,
          component: this.props.component,
          retryCount: newRetryCount,
        },
      });
      return;
    }
    
    this.setState({
      isRetrying: true,
    });
    
    // Add breadcrumb for retry attempt
    addBreadcrumb({
      category: 'error_boundary',
      message: `Retry attempt ${newRetryCount}`,
      level: 'info',
      data: {
        feature: this.props.feature,
        component: this.props.component,
        retryCount: newRetryCount,
      },
    });
    
    // Retry after a short delay
    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: newRetryCount,
        isRetrying: false,
      });
    }, 1000);
  };
  
  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }
  
  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          retryAction={this.retryAction}
          errorId={this.state.errorId}
          feature={this.props.feature}
          component={this.props.component}
          retryCount={this.state.retryCount}
          showErrorDetails={this.props.showErrorDetails}
        />
      );
    }
    
    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<ErrorBoundaryFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  retryAction,
  errorId,
  feature,
  component,
  retryCount,
  showErrorDetails = false,
}) => {
  const canRetry = retryCount < 3;
  
  const handleReportIssue = () => {
    if (typeof window !== 'undefined') {
      const issueUrl = `mailto:support@loomapp.com?subject=Error Report - ${errorId}&body=Error ID: ${errorId}%0AFeature: ${feature}%0AComponent: ${component}%0AError: ${error?.message}%0ATimestamp: ${new Date().toISOString()}`;
      window.location.href = issueUrl;
    }
  };
  
  const handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-gray-600">
            {feature 
              ? `An error occurred in the ${feature} feature`
              : 'An unexpected error occurred'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Error ID for support */}
          {errorId && (
            <div className="bg-gray-100 rounded-lg p-3 text-sm">
              <p className="text-gray-600 mb-1">Error ID (for support):</p>
              <p className="font-mono text-xs text-gray-800 break-all">{errorId}</p>
            </div>
          )}
          
          {/* Error details (only in development or when explicitly enabled) */}
          {(showErrorDetails || process.env.NODE_ENV === 'development') && error && (
            <details className="bg-red-50 rounded-lg p-3 text-sm">
              <summary className="cursor-pointer text-red-800 font-medium mb-2">
                Technical Details
              </summary>
              <div className="space-y-2">
                <div>
                  <p className="text-red-700 font-medium">Error:</p>
                  <p className="text-red-600 text-xs font-mono break-all">{error.message}</p>
                </div>
                {errorInfo?.componentStack && (
                  <div>
                    <p className="text-red-700 font-medium">Component Stack:</p>
                    <pre className="text-red-600 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-32">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
          
          {/* Action buttons */}
          <div className="space-y-2">
            {canRetry && (
              <Button
                onClick={retryAction}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again {retryCount > 0 && `(${retryCount}/3)`}
              </Button>
            )}
            
            <Button
              onClick={resetError}
              className="w-full"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            
            <Button
              onClick={handleGoHome}
              className="w-full"
              variant="secondary"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Button>
            
            <Button
              onClick={handleReportIssue}
              className="w-full"
              variant="ghost"
            >
              <Bug className="w-4 h-4 mr-2" />
              Report Issue
            </Button>
          </div>
          
          {!canRetry && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 text-sm">
                Multiple retry attempts failed. Please refresh the page or contact support.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Feature-specific error boundaries
export const SessionErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ProductionErrorBoundary feature="sessions" component="session-management">
    {children}
  </ProductionErrorBoundary>
);

export const FileErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ProductionErrorBoundary feature="files" component="file-management">
    {children}
  </ProductionErrorBoundary>
);

export const AuthErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ProductionErrorBoundary feature="authentication" component="auth-flow">
    {children}
  </ProductionErrorBoundary>
);

export const DashboardErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ProductionErrorBoundary feature="dashboard" component="main-dashboard">
    {children}
  </ProductionErrorBoundary>
);

export const NotificationErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ProductionErrorBoundary feature="notifications" component="notification-system">
    {children}
  </ProductionErrorBoundary>
);

// HOC for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  feature?: string,
  component?: string
) {
  const WrappedComponent = (props: P) => (
    <ProductionErrorBoundary feature={feature} component={component}>
      <Component {...props} />
    </ProductionErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for manual error reporting
export function useErrorReporting() {
  const reportError = React.useCallback(
    (error: Error, context?: Record<string, unknown>) => {
      const businessContext = {
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
        ...context,
      };
      
      captureError(error, businessContext);
      
      // Track manual error report
      alertManager.checkMetric('manual_error_reports', 1, {
        errorType: error.name,
        errorMessage: error.message,
        ...context,
      });
    },
    []
  );
  
  return { reportError };
}