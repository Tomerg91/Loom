'use client';

// Force dynamic rendering to avoid prerender issues with React Query
export const dynamic = 'force-dynamic';

import { ClientOnly } from '@/components/wrappers/client-only';
import { NotesDashboard } from './notes-dashboard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ClientNotesPage() {
  return (
    <ClientOnly fallback={<LoadingSpinner />}>
      <NotesDashboard />
    </ClientOnly>
  );
}