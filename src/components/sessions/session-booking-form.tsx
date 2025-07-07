'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useUser } from '@/lib/store/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User } from 'lucide-react';
import { format, addDays, startOfTomorrow } from 'date-fns';

// Validation schema
const bookingSchema = z.object({
  coachId: z.string().min(1, 'Coach selection is required'),
  date: z.string().min(1, 'Date is required'),
  timeSlot: z.string().min(1, 'Time slot is required'),
  title: z.string().min(1, 'Session title is required').max(100),
  description: z.string().max(500).optional(),
  duration: z.number().min(15).max(240),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface SessionBookingFormProps {
  onSuccess?: () => void;
  selectedCoachId?: string;
}

interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export function SessionBookingForm({ onSuccess, selectedCoachId }: SessionBookingFormProps) {
  const t = useTranslations('session');
  const commonT = useTranslations('common');
  const user = useUser();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedCoach, setSelectedCoach] = useState<string>(selectedCoachId || '');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      coachId: selectedCoachId || '',
      duration: 60,
    },
  });

  const watchedCoachId = watch('coachId');
  const watchedDate = watch('date');

  // Fetch available coaches
  const { data: coaches, isLoading: loadingCoaches } = useQuery({
    queryKey: ['coaches'],
    queryFn: async (): Promise<Coach[]> => {
      const response = await fetch('/api/users?role=coach&status=active&limit=50');
      if (!response.ok) throw new Error('Failed to fetch coaches');
      const data = await response.json();
      return data.data;
    },
  });

  // Fetch available time slots for selected coach and date
  const { data: timeSlots, isLoading: loadingSlots } = useQuery({
    queryKey: ['timeSlots', watchedCoachId, watchedDate],
    queryFn: async (): Promise<TimeSlot[]> => {
      if (!watchedCoachId || !watchedDate) return [];
      
      const response = await fetch(
        `/api/coaches/${watchedCoachId}/availability?date=${watchedDate}&duration=${watch('duration')}`
      );
      if (!response.ok) throw new Error('Failed to fetch time slots');
      const data = await response.json();
      return data.data;
    },
    enabled: !!(watchedCoachId && watchedDate),
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (formData: BookingFormData) => {
      const [, time] = formData.timeSlot.split('T');
      const scheduledAt = `${formData.date}T${time}`;
      
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          scheduledAt,
          duration: formData.duration,
          coachId: formData.coachId,
          clientId: user?.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create session');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
      onSuccess?.();
    },
  });

  const onSubmit = (data: BookingFormData) => {
    createSessionMutation.mutate(data);
  };

  // Generate next 30 days for date selection
  const availableDates = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(startOfTomorrow(), i);
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEEE, MMMM d, yyyy'),
    };
  });

  const selectedCoachData = coaches?.find(coach => coach.id === selectedCoach);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t('bookSession')}
        </CardTitle>
        <CardDescription>
          {t('selectCoachAndTime')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Coach Selection */}
          <div className="space-y-2">
            <Label htmlFor="coachId" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('selectCoach')}
            </Label>
            <Select
              value={selectedCoach}
              onValueChange={(value) => {
                setSelectedCoach(value);
                setValue('coachId', value);
                setValue('timeSlot', ''); // Reset time slot when coach changes
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectCoach')} />
              </SelectTrigger>
              <SelectContent>
                {loadingCoaches ? (
                  <SelectItem value="" disabled>
                    {commonT('loading')}
                  </SelectItem>
                ) : (
                  coaches?.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      <div className="flex items-center gap-2">
                        {coach.avatar && (
                          <Image
                            src={coach.avatar}
                            alt=""
                            width={24}
                            height={24}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span>{coach.firstName} {coach.lastName}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.coachId && (
              <p className="text-sm text-destructive">{errors.coachId.message}</p>
            )}
          </div>

          {/* Coach Info */}
          {selectedCoachData && (
            <Card className="p-4 bg-muted">
              <div className="flex items-start gap-3">
                {selectedCoachData.avatar && (
                  <Image
                    src={selectedCoachData.avatar}
                    alt=""
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <h4 className="font-medium">
                    {selectedCoachData.firstName} {selectedCoachData.lastName}
                  </h4>
                  {selectedCoachData.bio && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedCoachData.bio}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="date">
              {t('selectDate')}
            </Label>
            <Select
              value={selectedDate}
              onValueChange={(value) => {
                setSelectedDate(value);
                setValue('date', value);
                setValue('timeSlot', ''); // Reset time slot when date changes
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectDate')} />
              </SelectTrigger>
              <SelectContent>
                {availableDates.map((date) => (
                  <SelectItem key={date.value} value={date.value}>
                    {date.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>

          {/* Duration Selection */}
          <div className="space-y-2">
            <Label>{t('duration')}</Label>
            <Select
              value={watch('duration')?.toString()}
              onValueChange={(value) => {
                setValue('duration', parseInt(value));
                setValue('timeSlot', ''); // Reset time slot when duration changes
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 {t('minutes')}</SelectItem>
                <SelectItem value="45">45 {t('minutes')}</SelectItem>
                <SelectItem value="60">60 {t('minutes')}</SelectItem>
                <SelectItem value="90">90 {t('minutes')}</SelectItem>
                <SelectItem value="120">120 {t('minutes')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time Slot Selection */}
          {watchedCoachId && watchedDate && (
            <div className="space-y-2">
              <Label htmlFor="timeSlot" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('selectTime')}
              </Label>
              
              {loadingSlots ? (
                <div className="text-center py-4 text-muted-foreground">
                  {commonT('loading')}
                </div>
              ) : timeSlots && timeSlots.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {timeSlots.map((slot) => (
                    <Button
                      key={slot.startTime}
                      type="button"
                      variant={watch('timeSlot') === slot.startTime ? 'default' : 'outline'}
                      disabled={!slot.isAvailable}
                      onClick={() => setValue('timeSlot', slot.startTime)}
                      className="h-auto py-2"
                    >
                      {slot.startTime} - {slot.endTime}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No available time slots for this date
                </div>
              )}
              {errors.timeSlot && (
                <p className="text-sm text-destructive">{errors.timeSlot.message}</p>
              )}
            </div>
          )}

          {/* Session Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t('title')}</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Weekly check-in session"
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('description')} ({commonT('optional')})</Label>
              <Input
                id="description"
                {...register('description')}
                placeholder="Brief description of what you'd like to focus on..."
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 justify-end">
            <Button type="submit" disabled={isSubmitting || createSessionMutation.isPending}>
              {isSubmitting || createSessionMutation.isPending ? commonT('loading') : t('bookSession')}
            </Button>
          </div>

          {/* Error Display */}
          {createSessionMutation.error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {createSessionMutation.error.message}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}