'use client';

import { useUser } from '@/lib/store/auth-store';
import { NotesManagement } from '@/components/coach/notes-management';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function CoachNotesPage() {
  const user = useUser();

  useEffect(() => {
    if (user && user.role !== 'coach') {
      redirect('/');
    }
  }, [user]);

  if (!user || user.role !== 'coach') {
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <NotesManagement />
    </div>
  );
}