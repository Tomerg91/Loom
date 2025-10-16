import type { ReactNode } from 'react';

/**
 * Shared layout for marketing/legal routes to ensure they remain static and
 * benefit from predictable revalidation intervals for CDN caching.
 */
export const dynamic = 'force-static';
export const revalidate = 60 * 60 * 6; // Revalidate marketing pages every 6 hours

interface MarketingLayoutProps {
  children: ReactNode;
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return children;
}
