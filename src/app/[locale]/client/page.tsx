'use client';

import { useUser } from '@/lib/store/auth-store';
import { ClientDashboard } from '@/components/client/client-dashboard';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function ClientPage() {
  const user = useUser();

  useEffect(() => {
    if (user && user.role !== 'client') {
      redirect('/');
    }
  }, [user]);

  if (!user || user.role !== 'client') {
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <ClientDashboard />
    </div>
  );
}