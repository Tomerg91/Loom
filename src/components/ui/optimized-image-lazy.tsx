'use client';

import Image, { ImageProps } from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  fallbackSrc?: string;
  skeleton?: React.ReactNode;
  errorComponent?: React.ReactNode;
  lazyLoading?: boolean;
  enableBlur?: boolean;
  onLoadComplete?: () => void;
  onError?: (error: string) => void;
}

const ImageSkeleton = ({ className }: { className?: string }) => (
  <div 
    className={cn(
      "animate-pulse bg-gray-200 rounded",
      className
    )}
    style={{ aspectRatio: 'inherit' }}
  />
);

const ImageError = ({ 
  className, 
  message = "Failed to load image" 
}: { 
  className?: string;
  message?: string;
}) => (
  <div 
    className={cn(
      "flex items-center justify-center bg-gray-100 text-gray-500 text-sm rounded",
      className
    )}
    style={{ aspectRatio: 'inherit' }}
  >
    {message}
  </div>
);

export function OptimizedImageLazy({
  src,
  alt,
  className,
  fallbackSrc,
  skeleton,
  errorComponent,
  lazyLoading = true,
  enableBlur = true,
  onLoadComplete,
  onError,
  priority = false,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isInView, setIsInView] = useState(!lazyLoading || priority);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazyLoading || priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Load images 50px before they come into view
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazyLoading, priority, isInView]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoadComplete?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    
    // Try fallback src if available and not already used
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setIsLoading(true);
      setHasError(false);
      return;
    }
    
    onError?.('Image failed to load');
  };

  // Generate blur data URL for placeholder
  const generateBlurDataURL = (width: number = 8, height: number = 8) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, width, height);
    }
    return canvas.toDataURL();
  };

  return (
    <div 
      ref={imgRef}
      className={cn("relative overflow-hidden", className)}
    >
      {!isInView ? (
        // Show skeleton while waiting for intersection
        skeleton || <ImageSkeleton className={className} />
      ) : hasError ? (
        // Show error component
        errorComponent || <ImageError className={className} />
      ) : (
        <>
          {isLoading && (skeleton || <ImageSkeleton className={className} />)}
          <Image
            src={currentSrc}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            priority={priority}
            placeholder={enableBlur ? 'blur' : 'empty'}
            blurDataURL={enableBlur ? generateBlurDataURL() : undefined}
            className={cn(
              "transition-opacity duration-300",
              isLoading ? "opacity-0" : "opacity-100",
              className
            )}
            {...props}
          />
        </>
      )}
    </div>
  );
}

// Presets for common use cases
export const OptimizedAvatar = ({
  src,
  alt,
  size = 40,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & {
  size?: number;
}) => (
  <OptimizedImageLazy
    src={src}
    alt={alt}
    width={size}
    height={size}
    className="rounded-full"
    enableBlur={false}
    {...props}
  />
);

export const OptimizedBanner = ({
  src,
  alt,
  ...props
}: OptimizedImageProps) => (
  <OptimizedImageLazy
    src={src}
    alt={alt}
    fill
    style={{ objectFit: 'cover' }}
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    {...props}
  />
);

export const OptimizedThumbnail = ({
  src,
  alt,
  ...props
}: OptimizedImageProps) => (
  <OptimizedImageLazy
    src={src}
    alt={alt}
    width={200}
    height={200}
    style={{ objectFit: 'cover' }}
    sizes="(max-width: 768px) 50vw, 200px"
    {...props}
  />
);