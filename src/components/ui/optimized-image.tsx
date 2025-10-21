'use client';

import { ImageIcon, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

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
  unoptimized?: boolean;
  style?: React.CSSProperties;
  fallbackIcon?: React.ReactNode;
  showErrorIcon?: boolean;
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
  unoptimized = false,
  style,
  fallbackIcon = <ImageIcon className="h-6 w-6 text-muted-foreground" />,
  showErrorIcon = false,
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
        style={{ 
          width: fill ? '100%' : width, 
          height: fill ? '100%' : height,
          ...style 
        }}
        role="img"
        aria-label={alt}
      >
        {showErrorIcon && imageError ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : (
          fallbackIcon
        )}
      </div>
    );
  }

  // Auto-detect unoptimized for data URLs and blob URLs
  const shouldUnoptimize = unoptimized || 
    (typeof src === 'string' && (src.startsWith('data:') || src.startsWith('blob:')));

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
    unoptimized: shouldUnoptimize,
    className: cn(
      'transition-opacity duration-300',
      imageLoaded ? 'opacity-100' : 'opacity-0',
      className
    ),
    style,
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

// File thumbnail optimized image component
export const OptimizedThumbnailImage = React.memo(({
  src,
  alt = '',
  className,
  size = 48,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & { size?: number }) => {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('object-cover rounded', className)}
      sizes={`${size}px`}
      quality={75}
      fallbackIcon={<ImageIcon className="h-4 w-4 text-muted-foreground" />}
      showErrorIcon
      {...props}
    />
  );
});

OptimizedThumbnailImage.displayName = 'OptimizedThumbnailImage';

// File preview optimized image component
export const OptimizedPreviewImage = React.memo(({
  src,
  alt,
  className,
  maxWidth = 400,
  maxHeight = 384,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & { 
  maxWidth?: number;
  maxHeight?: number;
}) => {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={maxWidth}
      height={maxHeight}
      className={cn('max-w-full max-h-96 mx-auto', className)}
      style={{ 
        width: 'auto', 
        height: 'auto', 
        maxWidth: '100%', 
        maxHeight: `${maxHeight / 16}rem` 
      }}
      sizes="(max-width: 768px) 100vw, 400px"
      quality={85}
      fallbackIcon={<ImageIcon className="h-8 w-8 text-muted-foreground" />}
      showErrorIcon
      {...props}
    />
  );
});

OptimizedPreviewImage.displayName = 'OptimizedPreviewImage';

// QR Code optimized image component (for MFA)
export const OptimizedQRImage = React.memo(({
  src,
  alt,
  className,
  size = 200,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & { size?: number }) => {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('mx-auto border rounded-lg', className)}
      priority
      unoptimized // QR codes are typically data URLs
      quality={100} // QR codes need to be crisp
      fallbackIcon={<div className="text-sm text-muted-foreground">QR Code Loading...</div>}
      showErrorIcon
      {...props}
    />
  );
});

OptimizedQRImage.displayName = 'OptimizedQRImage';