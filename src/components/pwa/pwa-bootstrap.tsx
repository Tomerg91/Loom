'use client';

import { useEffect } from 'react';

export function PwaBootstrap() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Avoid double registration; register if no active registration
    (async () => {
      try {
        const existing = await navigator.serviceWorker.getRegistration();
        if (!existing) {
          await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          // Wait until active to ensure prompt update
          await navigator.serviceWorker.ready;
          // Silently done
        }
      } catch (err) {
        // Non-fatal: PWA still works without SW
        console.warn('Service worker registration failed:', err);
      }
    })();
  }, []);

  return null;
}

