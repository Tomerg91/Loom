'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ClientCoachDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Coach Detail Page (ID: {id})</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This page will display details about your coach.</p>
          <p>Coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
