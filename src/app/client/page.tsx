'use client';

// Force dynamic rendering to avoid prerender issues with React Query
export const dynamic = 'force-dynamic';

import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ClientOnly } from '@/components/wrappers/client-only';

import { ClientDashboard } from './client-dashboard';

export default function ClientDashboardPage() {
  return (
    <ClientOnly fallback={<LoadingSpinner />}>
      <ClientDashboard />
    </ClientOnly>
  );
}