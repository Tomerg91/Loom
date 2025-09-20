'use client';

// Force dynamic rendering to avoid prerender issues with React Query
export const dynamic = 'force-dynamic';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from '@/i18n/routing';
import type { Session } from '@/types';

async function fetchSession(id: string): Promise<Session> {
  const response = await fetch(`/api/sessions/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch session');
  }
  const data = await response.json();
  return data.data;
}

export default function SessionDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: session, isLoading, error } = useQuery({
    queryKey: ['session', id],
    queryFn: () => fetchSession(id),
    enabled: !!id,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!session) {
    return <div>Session not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{session.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">Description</h3>
            <p>{session.description}</p>
          </div>
          <div>
            <h3 className="font-semibold">Coach</h3>
            <p>{session.coach.firstName} {session.coach.lastName}</p>
          </div>
          <div>
            <h3 className="font-semibold">Client</h3>
            <p>{session.client.firstName} {session.client.lastName}</p>
          </div>
          <div>
            <h3 className="font-semibold">Scheduled At</h3>
            <p>{format(new Date(session.scheduledAt), 'PPPppp')}</p>
          </div>
          <div>
            <h3 className="font-semibold">Duration</h3>
            <p>{session.duration} minutes</p>
          </div>
          <div>
            <h3 className="font-semibold">Status</h3>
            <Badge>{session.status}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
