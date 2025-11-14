'use client';

import { useEffect } from 'react';
import { CSRF_TOKEN_HEADER } from '@/lib/security/csrf';

/**
 * CSRF Provider Component
 *
 * Stores CSRF token from response headers in sessionStorage for API requests.
 * This component should be mounted once in the root layout.
 */
export function CSRFProvider({ children, csrfToken }: { children: React.ReactNode; csrfToken?: string }) {
  useEffect(() => {
    // Store initial CSRF token if provided
    if (csrfToken && typeof window !== 'undefined') {
      sessionStorage.setItem('csrf-token', csrfToken);

      // Also add to meta tag for easy access
      let metaTag = document.querySelector('meta[name="csrf-token"]');
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('name', 'csrf-token');
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', csrfToken);
    }

    // Intercept fetch to store CSRF tokens from responses
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await originalFetch(...args);

      // Store CSRF token from response if present
      const newToken = response.headers.get(CSRF_TOKEN_HEADER);
      if (newToken) {
        sessionStorage.setItem('csrf-token', newToken);

        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
          metaTag.setAttribute('content', newToken);
        }
      }

      return response;
    };

    return () => {
      // Restore original fetch on unmount
      window.fetch = originalFetch;
    };
  }, [csrfToken]);

  return <>{children}</>;
}
