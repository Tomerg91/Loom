'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  loading?: 'eager' | 'lazy';
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
  fill?: boolean;
}

// Create a 1x1 transparent image as fallback
const FALLBACK_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InRyYW5zcGFyZW50Ii8+PC9zdmc+';

// Optimized image component with automatic Next.js Image benefits
export const OptimizedImage = React.memo(({
  src,
  alt,
  className,
  width = 40,
  height = 40,
  priority = false,
  loading = 'lazy',
  placeholder = 'empty',
  blurDataURL,
  sizes,
  quality = 75,
  onLoad,
  onError,
  fill = false,
  ...props
}: OptimizedImageProps) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  const handleLoad = React.useCallback(() => {
    setImageLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = React.useCallback(() => {
    setImageError(true);
    onError?.();
  }, [onError]);

  // Don't render image if no src or error occurred
  if (!src || imageError) {
    return (
      <div 
        className={cn(
          'bg-muted flex items-center justify-center',
          className
        )}
        style={{ width: fill ? '100%' : width, height: fill ? '100%' : height }}
        role="img"
        aria-label={alt}
      />
    );
  }

  const imageProps = {
    src: src,
    alt,
    width: fill ? undefined : width,
    height: fill ? undefined : height,
    priority,
    loading,
    quality,
    onLoad: handleLoad,
    onError: handleError,
    className: cn(
      'transition-opacity duration-300',
      imageLoaded ? 'opacity-100' : 'opacity-0',
      className
    ),
    ...(fill && { fill: true }),
    ...(sizes && { sizes }),
    ...(placeholder === 'blur' && blurDataURL && { 
      placeholder: 'blur' as const,
      blurDataURL 
    }),
    ...props
  };

  return (
    <div className={cn('relative overflow-hidden', fill && 'w-full h-full')}>
      {!imageLoaded && (
        <div 
          className={cn(
            'absolute inset-0 bg-muted animate-pulse',
            className
          )}
          style={{ 
            width: fill ? '100%' : width, 
            height: fill ? '100%' : height 
          }}
        />
      )}
      <Image {...imageProps} />
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Avatar-specific optimized image component
export const OptimizedAvatarImage = React.memo(({
  src,
  alt,
  className,
  size = 40,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & { size?: number }) => {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-full object-cover', className)}
      quality={80} // Slightly higher quality for avatars
      sizes={`${size}px`} // Specific size for better optimization
      placeholder="empty"
      {...props}
    />
  );
});

OptimizedAvatarImage.displayName = 'OptimizedAvatarImage';