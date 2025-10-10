'use client';

export const dynamic = 'force-dynamic';

import { ClientOnly } from '@/components/wrappers/client-only';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ClientTaskBoard } from '@/modules/tasks/components';

export default function ClientTasksPage() {
  return (
    <ClientOnly fallback={<LoadingSpinner />}>
      <div className="space-y-6 py-6">
        <ClientTaskBoard />
      </div>
    </ClientOnly>
  );
}
