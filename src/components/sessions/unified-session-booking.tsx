'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useUser } from '@/lib/store/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimeBookings } from '@/hooks/use-realtime-bookings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookingConfirmationDialog } from './booking-confirmation-dialog';
import { Calendar, Clock, User, AlertCircle, CheckCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { format, addDays, startOfTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Session } from '@/types';

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

interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  avatarUrl?: string;
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

export interface UnifiedSessionBookingProps {
  onSuccess?: (sessionData?: Session) => void;
  selectedCoachId?: string;
  className?: string;
  // Configuration options
  variant?: 'basic' | 'enhanced' | 'realtime';
  showCoachInfo?: boolean;
  showAvailabilityStatus?: boolean;
  showConnectionStatus?: boolean;
  enableRealtimeUpdates?: boolean;
  customTitle?: string;
  customDescription?: string;
}

export function UnifiedSessionBooking({ 
  onSuccess, 
  selectedCoachId, 
  className,
  variant = 'basic',
  showCoachInfo = true,
  showAvailabilityStatus = false,
  showConnectionStatus = false,
  enableRealtimeUpdates = true,
  customTitle = '',
  customDescription = ''
}: UnifiedSessionBookingProps) {
  const t = useTranslations('session');
  const commonT = useTranslations('common');
  const user = useUser();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedCoach, setSelectedCoach] = useState<string>(selectedCoachId || '');
  const [bookedSession, setBookedSession] = useState<Session | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  // Enable real-time updates based on configuration
  if (enableRealtimeUpdates) {
    useRealtimeBookings();
  }

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
  const { data: timeSlots, isLoading: loadingSlots, refetch: refetchSlots } = useQuery({
    queryKey: ['timeSlots', watchedCoachId, watchedDate, watchedDuration],
    queryFn: async (): Promise<TimeSlot[]> => {
      if (!watchedCoachId || !watchedDate) return [];
      
      const response = await fetch(
        `/api/coaches/${watchedCoachId}/availability?date=${watchedDate}&duration=${watchedDuration}`
      );
      if (!response.ok) throw new Error('Failed to fetch time slots');
      const data = await response.json();
      
      // Calculate availability status for enhanced/realtime variants
      if (variant !== 'basic' && data.data) {
        const slots = data.data as TimeSlot[];
        const status: AvailabilityStatus = {
          totalSlots: slots.length,
          availableSlots: slots.filter(s => s.isAvailable).length,
          bookedSlots: slots.filter(s => s.isBooked).length,
          blockedSlots: slots.filter(s => s.isBlocked).length,
        };
        setAvailabilityStatus(status);
      }
      
      return data.data;
    },
    enabled: !!(watchedCoachId && watchedDate),
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (formData: BookingFormData) => {
      const scheduledAtDateTime = `${formData.date}T${formData.timeSlot}:00`;
      
      const response = await fetch('/api/sessions/book', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          scheduledAt: scheduledAtDateTime,
          durationMinutes: formData.duration,
          coachId: formData.coachId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to book session');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: (sessionData) => {
      // Clear any previous errors
      setBookingError(null);
      
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-sessions'] });
      
      // Show confirmation dialog for basic variant, or call success callback directly
      if (variant === 'basic') {
        setBookedSession(sessionData);
        setShowConfirmation(true);
      }
      
      // Reset form
      reset();
      setSelectedDate('');
      setSelectedCoach(selectedCoachId || '');
      
      // Call success callback
      onSuccess?.(sessionData);
    },
    onError: (error) => {
      console.error('Session booking failed:', error);
      setBookingError(error.message || 'Failed to book session. Please try again.');
    },
  });

  const onSubmit = (data: BookingFormData) => {
    createSessionMutation.mutate(data);
  };

  const refreshAvailability = async () => {
    setLastRefresh(new Date());
    await refetchSlots();
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
  const hasError = bookingError || createSessionMutation.error;
  const isLoading = isSubmitting || createSessionMutation.isPending;

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {customTitle || t('bookSession')}
          {showConnectionStatus && (
            <Badge variant={isConnected ? "default" : "destructive"} className="ml-auto">
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {customDescription || t('selectCoachAndTime')}
          {variant !== 'basic' && showAvailabilityStatus && availabilityStatus && (
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">
                {availabilityStatus.availableSlots} available
              </Badge>
              <Badge variant="secondary">
                {availabilityStatus.bookedSlots} booked
              </Badge>
              {availabilityStatus.blockedSlots > 0 && (
                <Badge variant="destructive">
                  {availabilityStatus.blockedSlots} blocked
                </Badge>
              )}
            </div>
          )}
        </CardDescription>
        {variant !== 'basic' && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Last updated: {format(lastRefresh, 'HH:mm:ss')}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={refreshAvailability}
              disabled={loadingSlots}
            >
              <RefreshCw className={cn("h-4 w-4", loadingSlots && "animate-spin")} />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
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
                setValue('timeSlot', ''); // Reset time slot when coach changes
              }}
            >
              <SelectTrigger data-testid="coach-select">
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
                        {(coach.avatar || coach.avatarUrl) && (
                          <Image
                            src={coach.avatar || coach.avatarUrl || ''}
                            alt={`${coach.firstName} ${coach.lastName} profile picture`}
                            width={24}
                            height={24}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span>{coach.firstName} {coach.lastName}</span>
                        {variant !== 'basic' && coach.isOnline && (
                          <Badge variant="secondary" className="ml-auto">Online</Badge>
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
          {showCoachInfo && selectedCoachData && (
            <Card className="p-4 bg-muted">
              <div className="flex items-start gap-3">
                {(selectedCoachData.avatar || selectedCoachData.avatarUrl) && (
                  <Image
                    src={selectedCoachData.avatar || selectedCoachData.avatarUrl || ''}
                    alt={`${selectedCoachData.firstName} ${selectedCoachData.lastName} profile picture`}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <h4 className="font-medium">
                    {selectedCoachData.firstName} {selectedCoachData.lastName}
                    {variant !== 'basic' && selectedCoachData.isOnline && (
                      <Badge variant="secondary" className="ml-2">Online</Badge>
                    )}
                  </h4>
                  {selectedCoachData.bio && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedCoachData.bio}
                    </p>
                  )}
                  {variant !== 'basic' && selectedCoachData.timezone && (
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
                setValue('timeSlot', ''); // Reset time slot when duration changes
              }}
            >
              <SelectTrigger data-testid="session-type-select">
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
                <div className="text-center py-4 text-muted-foreground">
                  {commonT('loading')}
                </div>
              ) : timeSlots && timeSlots.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {timeSlots.map((slot) => (
                    <Button
                      key={slot.startTime}
                      type="button"
                      variant={watchedTimeSlot === slot.startTime ? 'default' : 'outline'}
                      disabled={!slot.isAvailable}
                      onClick={() => setValue('timeSlot', slot.startTime)}
                      className="h-auto py-2"
                      aria-pressed={watchedTimeSlot === slot.startTime}
                      aria-label={`Select time slot from ${slot.startTime} to ${slot.endTime}${!slot.isAvailable ? ' (unavailable)' : ''}`}
                      data-testid="time-slot"
                    >
                      <div className="text-center">
                        <div className="font-medium">{slot.startTime} - {slot.endTime}</div>
                        {!slot.isAvailable && (
                          <div className="text-xs opacity-70">
                            {slot.conflictReason || 'Unavailable'}
                          </div>
                        )}
                        {variant !== 'basic' && slot.isBooked && (
                          <div className="text-xs opacity-70">Booked</div>
                        )}
                        {variant !== 'basic' && slot.isBlocked && (
                          <div className="text-xs opacity-70">Blocked</div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
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
                data-testid="session-title"
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
                data-testid="session-description"
              />
              {errors.description && (
                <p id="description-error" className="text-sm text-destructive" role="alert">{errors.description.message}</p>
              )}
            </div>
          </fieldset>

          {/* Submit Button */}
          <div className="flex gap-2 justify-end">
            <Button type="submit" disabled={isLoading} data-testid="book-session-submit">
              {isLoading ? commonT('loading') : t('bookSession')}
            </Button>
          </div>

          {/* Error Display */}
          {hasError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {bookingError || createSessionMutation.error?.message}
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>

      {/* Booking Confirmation Dialog - only for basic variant */}
      {variant === 'basic' && (
        <BookingConfirmationDialog
          session={bookedSession}
          isOpen={showConfirmation}
          onClose={() => {
            setShowConfirmation(false);
            setBookedSession(null);
          }}
          onViewSession={(sessionId) => {
            // Handle navigation to session details if needed
            console.log('Navigate to session:', sessionId);
          }}
        />
      )}
    </Card>
  );
}