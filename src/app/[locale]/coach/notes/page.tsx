import { Suspense } from 'react';
import { NotesManagement } from '@/components/coach/notes-management';
import { CoachOrAdminRoute } from '@/components/auth/route-guard';

export default function CoachNotesPage() {
  return (
    <CoachOrAdminRoute>
      <div className="container mx-auto py-6">
        <Suspense fallback={<div>Loading notes...</div>}>
          <NotesManagement />
        </Suspense>
      </div>
    </CoachOrAdminRoute>
  );
}