'use client';

import { useUser } from '@/lib/store/auth-store';
import { AvailabilityManager } from '@/components/coach/availability-manager';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function CoachAvailabilityPage() {
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
      <AvailabilityManager />
    </div>
  );
}