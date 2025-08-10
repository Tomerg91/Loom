'use client';

// Force dynamic rendering to avoid prerender issues with React Query
export const dynamic = 'force-dynamic';

import { ClientOnly } from '@/components/wrappers/client-only';
import { ClientDashboard } from './client-dashboard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ClientDashboardPage() {
  return (
    <ClientOnly fallback={<LoadingSpinner />}>
      <ClientDashboard />
    </ClientOnly>
  );
}