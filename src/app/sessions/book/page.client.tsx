'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import type { Client } from '@/types';

const bookingSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  scheduledAt: z.string().min(1, 'Date and time are required'),
  duration: z.number().min(15, 'Duration must be at least 15 minutes'),
});

type BookingFormData = z.infer<typeof bookingSchema>;

async function fetchClients(): Promise<Client[]> {
  const response = await fetch('/api/coach/clients', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to fetch clients');
  }
  const data = await response.json();
  return data.data;
}

export default function BookSessionClient() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const clientId = searchParams.get('clientId');

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      clientId: clientId || '',
      duration: 60,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to book session');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({ title: 'Session booked successfully' });
      router.push(`/${locale}/dashboard`);
    },
    onError: () => {
      toast({ title: 'Failed to book session', variant: 'destructive' });
    },
  });

  const onSubmit = (data: BookingFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Book a New Session</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="clientId">Client</Label>
              <Select {...register('clientId')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clientsLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : (
                    clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.firstName} {client.lastName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.clientId && <p className="text-red-500 text-sm">{errors.clientId.message}</p>}
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register('title')} />
              {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} />
            </div>
            <div>
              <Label htmlFor="scheduledAt">Date and Time</Label>
              <Input id="scheduledAt" type="datetime-local" {...register('scheduledAt')} />
              {errors.scheduledAt && <p className="text-red-500 text-sm">{errors.scheduledAt.message}</p>}
            </div>
            <div>
              <Label htmlFor="duration">Duration (in minutes)</Label>
              <Input id="duration" type="number" {...register('duration', { valueAsNumber: true })} />
              {errors.duration && <p className="text-red-500 text-sm">{errors.duration.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Booking...' : 'Book Session'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

