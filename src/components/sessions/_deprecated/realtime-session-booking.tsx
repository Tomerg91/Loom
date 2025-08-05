'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, User, Wifi, WifiOff, Users, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { format, addDays, startOfTomorrow, parseISO, isBefore, addMinutes } from 'date-fns';
import { useRealtimeAvailability, useRealtimeConnection } from '@/lib/realtime/hooks';
import { cn } from '@/lib/utils';

// Enhanced validation schema
const bookingSchema = z.object({
  coachId: z.string().min(1, 'Coach selection is required'),
  date: z.string().min(1, 'Date is required'),
  timeSlot: z.string().min(1, 'Time slot is required'),
  title: z.string().min(1, 'Session title is required').max(100),
  description: z.string().max(500).optional(),
  duration: z.number().min(15).max(240),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface RealtimeSessionBookingProps {
  onSuccess?: () => void;
  selectedCoachId?: string;
  className?: string;
}

interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  isOnline?: boolean;
  timezone?: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked?: boolean;
  isBlocked?: boolean;
  clientName?: string;
  sessionTitle?: string;
  conflictReason?: string;
}

interface AvailabilityStatus {
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  blockedSlots: number;
}

export function RealtimeSessionBooking({ 
  onSuccess, 
  selectedCoachId, 
  className 
}: RealtimeSessionBookingProps) {
  const t = useTranslations('session');
  const commonT = useTranslations('common');
  const user = useUser();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedCoach, setSelectedCoach] = useState<string>(selectedCoachId || '');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus | null>(null);

  // Real-time connection and availability hooks
  const { isConnected, reconnect } = useRealtimeConnection();
  const availabilityConnection = useRealtimeAvailability(selectedCoach);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
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
  const watchedDuration = watch('duration');
  const watchedTimeSlot = watch('timeSlot');

  // Fetch available coaches with online status
  const { data: coaches, isLoading: loadingCoaches } = useQuery({
    queryKey: ['coaches', 'with-status'],
    queryFn: async (): Promise<Coach[]> => {
      const response = await fetch('/api/users?role=coach&status=active&limit=50&include_online_status=true');
      if (!response.ok) throw new Error('Failed to fetch coaches');
      const data = await response.json();
      return data.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds for online status
  });

  // Enhanced time slots query with real-time updates
  const { data: timeSlots, isLoading: loadingSlots, refetch: refetchTimeSlots } = useQuery({
    queryKey: ['timeSlots', watchedCoachId, watchedDate, watchedDuration, lastRefresh.getTime()],
    queryFn: async (): Promise<TimeSlot[]> => {
      if (!watchedCoachId || !watchedDate) return [];
      
      const response = await fetch(
        `/api/coaches/${watchedCoachId}/availability?date=${watchedDate}&duration=${watchedDuration}&detailed=true`
      );
      if (!response.ok) throw new Error('Failed to fetch time slots');
      const data = await response.json();
      
      // Update availability status
      const slots: TimeSlot[] = data.data;
      const status: AvailabilityStatus = {
        totalSlots: slots.length,
        availableSlots: slots.filter(slot => slot.isAvailable && !slot.isBooked && !slot.isBlocked).length,
        bookedSlots: slots.filter(slot => slot.isBooked).length,
        blockedSlots: slots.filter(slot => slot.isBlocked).length,
      };
      setAvailabilityStatus(status);
      
      return slots;
    },
    enabled: !!(watchedCoachId && watchedDate),
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchInterval: 60000, // Refetch every minute as backup
  });

  // Create session mutation with optimistic updates
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
    onMutate: async (formData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['timeSlots'] });
      
      // Optimistically update the time slot as booked
      const previousSlots = queryClient.getQueryData(['timeSlots', formData.coachId, formData.date, formData.duration, lastRefresh.getTime()]);
      
      queryClient.setQueryData(
        ['timeSlots', formData.coachId, formData.date, formData.duration, lastRefresh.getTime()], 
        (oldSlots: TimeSlot[] | undefined) => {
          if (!oldSlots) return [];
          return oldSlots.map(slot => 
            slot.startTime === formData.timeSlot 
              ? { ...slot, isAvailable: false, isBooked: true, clientName: `${user?.firstName} ${user?.lastName}` }
              : slot
          );
        }
      );
      
      return { previousSlots };
    },
    onError: (err, formData, context) => {
      // Revert optimistic update on error
      if (context?.previousSlots) {
        queryClient.setQueryData(
          ['timeSlots', formData.coachId, formData.date, formData.duration, lastRefresh.getTime()], 
          context.previousSlots
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
      queryClient.invalidateQueries({ queryKey: ['coach-availability'] });
      reset();
      setSelectedDate('');
      setSelectedCoach('');
      onSuccess?.();
    },
  });

  // Real-time availability refresh
  const refreshAvailability = useCallback(() => {
    setLastRefresh(new Date());
    refetchTimeSlots();
  }, [refetchTimeSlots]);

  // Auto-refresh when coach or date changes
  useEffect(() => {
    if (watchedCoachId && watchedDate) {
      refreshAvailability();
    }
  }, [watchedCoachId, watchedDate, refreshAvailability]);

  // Reset time slot when availability changes
  useEffect(() => {
    if (timeSlots && watchedTimeSlot) {
      const selectedSlot = timeSlots.find(slot => slot.startTime === watchedTimeSlot);
      if (selectedSlot && (!selectedSlot.isAvailable || selectedSlot.isBooked || selectedSlot.isBlocked)) {
        setValue('timeSlot', '');
      }
    }
  }, [timeSlots, watchedTimeSlot, setValue]);

  const onSubmit = (data: BookingFormData) => {
    createSessionMutation.mutate(data);
  };

  // Generate next 30 days for date selection
  const availableDates = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = addDays(startOfTomorrow(), i);
      return {
        value: format(date, 'yyyy-MM-dd'),
        label: format(date, 'EEEE, MMMM d, yyyy'),
      };
    });
  }, []);

  const selectedCoachData = coaches?.find(coach => coach.id === selectedCoach);

  // Time slot status helpers
  const getSlotStatusIcon = (slot: TimeSlot) => {
    if (slot.isBooked) return <XCircle className="h-3 w-3 text-destructive" />;
    if (slot.isBlocked) return <XCircle className="h-3 w-3 text-muted-foreground" />;
    if (slot.isAvailable) return <CheckCircle className="h-3 w-3 text-green-500" />;
    return <XCircle className="h-3 w-3 text-muted-foreground" />;
  };

  const getSlotStatusText = (slot: TimeSlot) => {
    if (slot.isBooked) return slot.clientName ? `Booked by ${slot.clientName}` : 'Booked';
    if (slot.isBlocked) return slot.conflictReason || 'Blocked';
    if (slot.isAvailable) return 'Available';
    return 'Unavailable';
  };

  return (
    <Card className={cn("w-full max-w-3xl mx-auto", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>{t('bookSession')}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Wifi className="h-3 w-3 mr-1" />
                Live Updates
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-600">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={reconnect}
              disabled={isConnected}
            >
              {!isConnected && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Reconnect
            </Button>
          </div>
        </div>
        <CardDescription>
          {t('selectCoachAndTime')} - Real-time availability updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isConnected && (
          <Alert className="mb-6">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              Real-time updates are currently unavailable. Time slots may not reflect the latest availability.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Coach Selection */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" aria-hidden="true" />
                {t('selectCoach')}
              </div>
            </legend>
            <Select
              value={selectedCoach}
              onValueChange={(value) => {
                setSelectedCoach(value);
                setValue('coachId', value);
                setValue('timeSlot', '');
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
                            alt={`${coach.firstName} ${coach.lastName} profile picture`}
                            width={24}
                            height={24}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span>{coach.firstName} {coach.lastName}</span>
                        {coach.isOnline && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="Online" />
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.coachId && (
              <p className="text-sm text-destructive" role="alert">{errors.coachId.message}</p>
            )}
          </fieldset>

          {/* Coach Info */}
          {selectedCoachData && (
            <Card className="p-4 bg-muted">
              <div className="flex items-start gap-3">
                {selectedCoachData.avatar && (
                  <Image
                    src={selectedCoachData.avatar}
                    alt={`${selectedCoachData.firstName} ${selectedCoachData.lastName} profile picture`}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">
                      {selectedCoachData.firstName} {selectedCoachData.lastName}
                    </h4>
                    {selectedCoachData.isOnline ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Online
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Offline
                      </Badge>
                    )}
                  </div>
                  {selectedCoachData.bio && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedCoachData.bio}
                    </p>
                  )}
                  {selectedCoachData.timezone && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Timezone: {selectedCoachData.timezone}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Date Selection */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t('selectDate')}
            </legend>
            <Select
              value={selectedDate}
              onValueChange={(value) => {
                setSelectedDate(value);
                setValue('date', value);
                setValue('timeSlot', '');
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
              <p className="text-sm text-destructive" role="alert">{errors.date.message}</p>
            )}
          </fieldset>

          {/* Duration Selection */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t('duration')}
            </legend>
            <Select
              value={watchedDuration?.toString()}
              onValueChange={(value) => {
                setValue('duration', parseInt(value));
                setValue('timeSlot', '');
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
          </fieldset>

          {/* Availability Status */}
          {availabilityStatus && watchedCoachId && watchedDate && (
            <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4" />
                <h4 className="font-medium">Availability Overview</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshAvailability}
                  disabled={loadingSlots}
                >
                  {loadingSlots ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Refresh'}
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-lg">{availabilityStatus.totalSlots}</div>
                  <div className="text-muted-foreground">Total Slots</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-lg text-green-600">{availabilityStatus.availableSlots}</div>
                  <div className="text-muted-foreground">Available</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-lg text-red-600">{availabilityStatus.bookedSlots}</div>
                  <div className="text-muted-foreground">Booked</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-lg text-muted-foreground">{availabilityStatus.blockedSlots}</div>
                  <div className="text-muted-foreground">Blocked</div>
                </div>
              </div>
            </Card>
          )}

          {/* Time Slot Selection */}
          {watchedCoachId && watchedDate && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {t('selectTime')}
                </div>
              </legend>
              
              {loadingSlots ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  {commonT('loading')}
                </div>
              ) : timeSlots && timeSlots.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {timeSlots.map((slot) => {
                    const isAvailable = slot.isAvailable && !slot.isBooked && !slot.isBlocked;
                    const isSelected = watchedTimeSlot === slot.startTime;
                    
                    return (
                      <Button
                        key={slot.startTime}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        disabled={!isAvailable}
                        onClick={() => isAvailable && setValue('timeSlot', slot.startTime)}
                        className={cn(
                          "h-auto p-3 flex flex-col items-start gap-1",
                          !isAvailable && "opacity-50 cursor-not-allowed",
                          slot.isBooked && "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20",
                          slot.isBlocked && "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20"
                        )}
                        aria-pressed={isSelected}
                        aria-label={`${slot.startTime} to ${slot.endTime} - ${getSlotStatusText(slot)}`}
                      >
                        <div className="flex items-center gap-2 w-full">
                          {getSlotStatusIcon(slot)}
                          <span className="font-medium">
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {getSlotStatusText(slot)}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No available time slots for this date
                </div>
              )}
              {errors.timeSlot && (
                <p className="text-sm text-destructive" role="alert">{errors.timeSlot.message}</p>
              )}
            </fieldset>
          )}

          {/* Session Details */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-4">
              Session Details
            </legend>
            <div className="space-y-2">
              <Label htmlFor="title">{t('title')}</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Weekly check-in session"
                aria-describedby="title-error"
              />
              {errors.title && (
                <p id="title-error" className="text-sm text-destructive" role="alert">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('description')} ({commonT('optional')})</Label>
              <Input
                id="description"
                {...register('description')}
                placeholder="Brief description of what you'd like to focus on..."
                aria-describedby="description-error"
              />
              {errors.description && (
                <p id="description-error" className="text-sm text-destructive" role="alert">{errors.description.message}</p>
              )}
            </div>
          </fieldset>

          {/* Submit Button */}
          <div className="flex gap-2 justify-end">
            <Button 
              type="submit" 
              disabled={isSubmitting || createSessionMutation.isPending}
              className="min-w-[120px]"
            >
              {isSubmitting || createSessionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                t('bookSession')
              )}
            </Button>
          </div>

          {/* Error Display */}
          {createSessionMutation.error && (
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {createSessionMutation.error.message}
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}