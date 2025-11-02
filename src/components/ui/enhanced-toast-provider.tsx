'use client';

/**
 * Enhanced Toast Provider with Dynamic Import
 *
 * This file dynamically imports the framer-motion-based toast provider
 * to reduce initial bundle size. The animated toast component is loaded
 * only when needed, improving initial page load performance.
 */

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import the toast provider with framer-motion animations
// ssr: false ensures this only loads on the client side
export const EnhancedToastProvider = dynamic(
  () => import('./enhanced-toast-provider.inner').then(mod => ({ default: mod.EnhancedToastProviderInner })),
  { ssr: false, loading: () => <></> }
);

// Re-export hooks and types
export type {
  EnhancedToastType,
  EnhancedToastAction,
  EnhancedToast,
} from './enhanced-toast-provider.inner';

export {
  useToast,
  useSuccessToast,
  useErrorToast,
  useWarningToast,
  useInfoToast,
  useLoadingToast,
  useNotificationToast,
  useAsyncToast,
} from './enhanced-toast-provider.inner';
