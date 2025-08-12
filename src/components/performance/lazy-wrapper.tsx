'use client';

import { lazy, Suspense, ComponentType, ReactNode, useState, useEffect, useRef } from 'react';
import { LayoutStabilizer, CardSkeleton } from '@/components/layout/layout-stabilizer';

interface LazyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  minHeight?: number;
  className?: string;
}

/**
 * Lazy wrapper to improve initial page load performance
 * Delays loading of non-critical components until they're needed
 */
export function LazyWrapper({ 
  children, 
  fallback, 
  minHeight = 200, 
  className 
}: LazyWrapperProps) {
  return (
    <LayoutStabilizer minHeight={minHeight} className={className}>
      <Suspense fallback={fallback || <CardSkeleton lines={3} className="animate-pulse" />}>
        {children}
      </Suspense>
    </LayoutStabilizer>
  );
}

/**
 * Higher-order component for lazy loading with automatic skeleton fallback
 */
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  fallback?: ReactNode
) {
  const LazyComponent = lazy(() => Promise.resolve({ default: Component }));
  
  return function WrappedComponent(props: P) {
    return (
      <LazyWrapper fallback={fallback}>
        <LazyComponent {...props} />
      </LazyWrapper>
    );
  };
}

/**
 * Intersection Observer based lazy loading for better performance
 */
export function IntersectionLazyWrapper({
  children,
  fallback,
  rootMargin = '50px',
  threshold = 0.1,
  className,
}: LazyWrapperProps & {
  rootMargin?: string;
  threshold?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return (
    <div ref={ref} className={className}>
      {isVisible ? (
        <Suspense fallback={fallback || <CardSkeleton />}>
          {children}
        </Suspense>
      ) : (
        fallback || <CardSkeleton />
      )}
    </div>
  );
}