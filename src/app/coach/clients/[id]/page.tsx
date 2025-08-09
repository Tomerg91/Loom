'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Client } from '@/types';

async function fetchClient(id: string): Promise<Client> {
  const response = await fetch(`/api/coach/clients/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch client');
  }
  const data = await response.json();
  return data.data;
}

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: client, isLoading, error } = useQuery({
    queryKey: ['client', id],
    queryFn: () => fetchClient(id),
    enabled: !!id,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!client) {
    return <div>Client not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="outline" asChild>
          <Link href="/coach/clients">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={client.avatarUrl} />
            <AvatarFallback>{client.firstName[0]}{client.lastName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{client.firstName} {client.lastName}</CardTitle>
            <p className="text-muted-foreground">{client.email}</p>
          </div>
        </CardHeader>
        <CardContent>
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Coming soon...</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
