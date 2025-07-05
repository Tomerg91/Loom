'use client';

import { useUser } from '@/lib/store/auth-store';
import { CoachDashboard } from '@/components/coach/coach-dashboard';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function CoachPage() {
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
      <CoachDashboard />
    </div>
  );
}