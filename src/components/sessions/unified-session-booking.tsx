'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useUser } from '@/lib/auth/use-user';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimeBookings } from '@/hooks/use-realtime-bookings';
import { useRealtimeBooking } from '@/hooks/use-realtime-booking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookingConfirmationDialog } from './booking-confirmation-dialog';
import { Calendar, Clock, User, AlertCircle, CheckCircle, Wifi, WifiOff, RefreshCw, Loader2, Users, XCircle } from 'lucide-react';
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
  lastUpdated?: Date;
}

interface SessionActions {
  onStart?: (sessionId: string) => Promise<void>;
  onComplete?: (sessionId: string, data?: { notes?: string; rating?: number; feedback?: string }) => Promise<void>;
  onCancel?: (sessionId: string, reason?: string) => Promise<void>;
}

// Memoized coach item component
const CoachItem = memo(({ coach, isOnline }: { coach: Coach; isOnline?: boolean }) => {
  const coachImageSrc = coach.avatar || coach.avatarUrl;
  const coachName = `${coach.firstName} ${coach.lastName}`;
  
  return (
    <div className="flex items-center gap-2">
      {coachImageSrc && (
        <Image
          src={coachImageSrc}
          alt={`${coachName} profile picture`}
          width={24}
          height={24}
          className="w-6 h-6 rounded-full"
        />
      )}
      <span>{coachName}</span>
      {isOnline && (
        <div className="w-2 h-2 bg-green-500 rounded-full" title="Online" />
      )}
    </div>
  );
});

CoachItem.displayName = 'CoachItem';

// Memoized time slot component
const TimeSlotButton = memo(({ 
  slot, 
  isSelected, 
  isAvailable, 
  variant, 
  onSelect,
  getSlotStatusIcon,
  getSlotStatusText 
}: { 
  slot: TimeSlot; 
  isSelected: boolean; 
  isAvailable: boolean; 
  variant: 'basic' | 'enhanced' | 'realtime';
  onSelect: () => void;
  getSlotStatusIcon: (slot: TimeSlot) => React.ReactNode;
  getSlotStatusText: (slot: TimeSlot) => string;
}) => {
  const handleClick = useCallback(() => {
    if (isAvailable) onSelect();
  }, [isAvailable, onSelect]);

  return (
    <Button
      type="button"
      variant={isSelected ? 'default' : 'outline'}
      disabled={!isAvailable}
      onClick={handleClick}
      className={cn(
        variant === 'basic' ? "h-auto py-2" : "h-auto p-4 flex flex-col items-start gap-2 text-left",
        !isAvailable && "opacity-50 cursor-not-allowed",
        variant !== 'basic' && slot.isBooked && "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20",
        variant !== 'basic' && slot.isBlocked && "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20"
      )}
      aria-pressed={isSelected}
      aria-label={`${slot.startTime} to ${slot.endTime} - ${variant !== 'basic' ? getSlotStatusText(slot) : (!slot.isAvailable ? ' (unavailable)' : '')}`}
      data-testid="time-slot"
    >
      {variant === 'basic' ? (
        <div className="text-center">
          <div className="font-medium">{slot.startTime} - {slot.endTime}</div>
          {!slot.isAvailable && (
            <div className="text-xs opacity-70">
              {slot.conflictReason || 'Unavailable'}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 w-full">
            {getSlotStatusIcon(slot)}
            <span className="font-medium">
              {slot.startTime} - {slot.endTime}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {getSlotStatusText(slot)}
          </span>
          {slot.sessionTitle && (
            <span className="text-xs text-muted-foreground italic">
              "{slot.sessionTitle}"
            </span>
          )}
        </>
      )}
    </Button>
  );
});

TimeSlotButton.displayName = 'TimeSlotButton';

// Memoized coach info card
const CoachInfoCard = memo(({ coach, variant }: { coach: Coach; variant: 'basic' | 'enhanced' | 'realtime' }) => {
  const coachImageSrc = coach.avatar || coach.avatarUrl;
  const coachName = `${coach.firstName} ${coach.lastName}`;

  return (
    <Card className="p-4 bg-muted">
      <div className="flex items-start gap-3">
        {coachImageSrc && (
          <Image
            src={coachImageSrc}
            alt={`${coachName} profile picture`}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full"
          />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{coachName}</h4>
            {variant !== 'basic' && coach.isOnline && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Online
              </Badge>
            )}
          </div>
          {coach.bio && (
            <p className="text-sm text-muted-foreground mt-1">
              {coach.bio}
            </p>
          )}
          {variant !== 'basic' && coach.timezone && (
            <p className="text-xs text-muted-foreground mt-1">
              Timezone: {coach.timezone}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
});

CoachInfoCard.displayName = 'CoachInfoCard';

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
  enableOptimisticUpdates?: boolean;
  customTitle?: string;
  customDescription?: string;
  // Session lifecycle actions
  sessionActions?: SessionActions;
  // For existing sessions (start/complete/cancel functionality)
  existingSessionId?: string;
  sessionStatus?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  showSessionActions?: boolean;
}

function UnifiedSessionBookingComponent({ 
  onSuccess, 
  selectedCoachId, 
  className,
  variant = 'basic',
  showCoachInfo = true,
  showAvailabilityStatus = false,
  showConnectionStatus = false,
  enableRealtimeUpdates = true,
  enableOptimisticUpdates = false,
  customTitle = '',
  customDescription = '',
  sessionActions,
  existingSessionId,
  sessionStatus,
  showSessionActions = false
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
  const [sessionActionLoading, setSessionActionLoading] = useState<string | null>(null);

  // Use advanced realtime booking hook for enhanced/realtime variants
  const realtimeBookingHook = (variant === 'enhanced' || variant === 'realtime') 
    ? useRealtimeBooking(selectedCoachId)
    : null;

  // Enable real-time updates based on configuration
  if (enableRealtimeUpdates && variant === 'basic') {
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
  const {
    data: coaches,
    isLoading: loadingCoaches,
  } = useQuery({
    queryKey: ['coaches'],
    queryFn: async (): Promise<Coach[]> => {
      const response = await fetch('/api/users?role=coach&status=active&limit=50');
      if (!response.ok) throw new Error('Failed to fetch coaches');
      const data = await response.json();
      return data.data;
    },
    enabled: !realtimeBookingHook,
  });

  // Fetch available time slots for selected coach and date
  const {
    data: timeSlots,
    isLoading: loadingSlots,
  } = useQuery({
    queryKey: ['timeSlots', watchedCoachId, watchedDate, watchedDuration],
    queryFn: async (): Promise<TimeSlot[]> => {
      if (!watchedCoachId || !watchedDate) return [];
      
      const detailedParam = variant !== 'basic' ? '&detailed=true' : '';
      const response = await fetch(
        `/api/coaches/${watchedCoachId}/availability?date=${watchedDate}&duration=${watchedDuration}${detailedParam}`
      );
      if (!response.ok) throw new Error('Failed to fetch time slots');
      const data = await response.json();
      
      // Calculate availability status for enhanced/realtime variants
      if (variant !== 'basic' && data.data) {
        const slots = data.data as TimeSlot[];
        const status: AvailabilityStatus = {
          totalSlots: slots.length,
          availableSlots: slots.filter(s => s.isAvailable && !s.isBooked && !s.isBlocked).length,
          bookedSlots: slots.filter(s => s.isBooked).length,
          blockedSlots: slots.filter(s => s.isBlocked).length,
          lastUpdated: new Date(),
        };
        setAvailabilityStatus(status);
      }
      
      return data.data;
    },
    enabled: !!(watchedCoachId && watchedDate && !realtimeBookingHook),
  });

  // Use realtime hook data if available, otherwise use regular query data
  const finalCoaches = realtimeBookingHook?.coaches ?? coaches;
  const finalTimeSlots = realtimeBookingHook?.timeSlots ?? timeSlots;
  const finalLoadingCoaches = realtimeBookingHook?.loadingCoaches ?? loadingCoaches;
  const finalLoadingSlots = realtimeBookingHook?.loadingSlots ?? loadingSlots;

  // Update availability status from realtime hook if available
  if (realtimeBookingHook?.availabilityStatus && !availabilityStatus) {
    setAvailabilityStatus(realtimeBookingHook.availabilityStatus);
  }

  // Update connection status from realtime hook
  if (realtimeBookingHook?.isConnected !== undefined) {
    setIsConnected(realtimeBookingHook.isConnected);
  }

  // Create session mutation - use realtime hook if available for optimistic updates
  const createSessionMutation = realtimeBookingHook?.createSessionMutation ?? useMutation({
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
    onMutate: enableOptimisticUpdates ? async (formData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['timeSlots'] });
      
      // Optimistically update the time slot as booked
      const queryKey = ['timeSlots', formData.coachId, formData.date, formData.duration];
      const previousSlots = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData(queryKey, (oldSlots: TimeSlot[] | undefined) => {
        if (!oldSlots) return [];
        return oldSlots.map(slot => 
          slot.startTime === formData.timeSlot 
            ? { ...slot, isAvailable: false, isBooked: true, clientName: `${user?.firstName} ${user?.lastName}` }
            : slot
        );
      });
      
      return { previousSlots, queryKey };
    } : undefined,
    onError: (error, formData, context) => {
      console.error('Session booking failed:', error);
      setBookingError(error.message || 'Failed to book session. Please try again.');
      
      // Revert optimistic update on error
      if (enableOptimisticUpdates && context?.previousSlots) {
        queryClient.setQueryData(context.queryKey, context.previousSlots);
      }
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
  });

  // Session action handlers
  const handleSessionAction = async (action: 'start' | 'complete' | 'cancel', data?: any) => {
    if (!existingSessionId) return;
    
    setSessionActionLoading(action);
    
    try {
      let response;
      
      switch (action) {
        case 'start':
          response = await fetch(`/api/sessions/${existingSessionId}/start`, {
            method: 'POST',
          });
          break;
        case 'complete':
          response = await fetch(`/api/sessions/${existingSessionId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data || {}),
          });
          break;
        case 'cancel':
          response = await fetch(`/api/sessions/${existingSessionId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data || {}),
          });
          break;
      }
      
      if (!response?.ok) {
        const errorData = await response?.json();
        throw new Error(errorData?.message || `Failed to ${action} session`);
      }
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', existingSessionId] });
      
      // Call specific action handler if provided
      if (action === 'start' && sessionActions?.onStart) {
        await sessionActions.onStart(existingSessionId);
      } else if (action === 'complete' && sessionActions?.onComplete) {
        await sessionActions.onComplete(existingSessionId, data);
      } else if (action === 'cancel' && sessionActions?.onCancel) {
        await sessionActions.onCancel(existingSessionId, data?.reason);
      }
      
    } catch (error) {
      console.error(`Failed to ${action} session:`, error);
      setBookingError(`Failed to ${action} session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSessionActionLoading(null);
    }
  };

  const onSubmit = useCallback((data: BookingFormData) => {
    createSessionMutation.mutate(data);
  }, [createSessionMutation]);

  const refreshAvailability = realtimeBookingHook?.refreshAvailability ?? (async () => {
    setLastRefresh(new Date());
    queryClient.invalidateQueries({ queryKey: ['timeSlots', watchedCoachId, watchedDate] });
  });

  const reconnect = realtimeBookingHook?.reconnect ?? (() => {
    setIsConnected(true);
  });

  // Generate next 30 days for date selection - memoized since this is static
  const availableDates = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const date = addDays(startOfTomorrow(), i);
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEEE, MMMM d, yyyy'),
    };
  }), []);

  const selectedCoachData = useMemo(() => 
    realtimeBookingHook?.selectedCoachData ?? finalCoaches?.find(coach => coach.id === selectedCoach),
    [realtimeBookingHook?.selectedCoachData, finalCoaches, selectedCoach]
  );
  const hasError = bookingError || createSessionMutation.error || realtimeBookingHook?.bookingError;
  const isLoading = isSubmitting || createSessionMutation.isPending || realtimeBookingHook?.isBooking;

  // Time slot status helpers for enhanced variants - memoized
  const getSlotStatusIcon = useCallback((slot: TimeSlot) => {
    if (slot.isBooked) return <XCircle className="h-3 w-3 text-destructive" />;
    if (slot.isBlocked) return <XCircle className="h-3 w-3 text-muted-foreground" />;
    if (slot.isAvailable) return <CheckCircle className="h-3 w-3 text-green-500" />;
    return <XCircle className="h-3 w-3 text-muted-foreground" />;
  }, []);

  const getSlotStatusText = useCallback((slot: TimeSlot) => {
    if (slot.isBooked) return slot.clientName ? `Booked by ${slot.clientName}` : 'Booked';
    if (slot.isBlocked) return slot.conflictReason || 'Blocked';
    if (slot.isAvailable) return 'Available';
    return 'Unavailable';
  }, []);

  return (
    <Card className={cn("w-full", variant === 'basic' ? 'max-w-2xl mx-auto' : 'max-w-4xl mx-auto', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>{customTitle || t('bookSession')}</CardTitle>
          </div>
          {showConnectionStatus && (
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                {isConnected ? 'Live Updates' : 'Offline'}
              </Badge>
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
          )}
        </div>
        <CardDescription>
          {customDescription || t('selectCoachAndTime')}
          {variant === 'realtime' && ' - Real-time availability with live updates'}
        </CardDescription>
        
        {/* Availability Status Overview for enhanced/realtime variants */}
        {variant !== 'basic' && showAvailabilityStatus && availabilityStatus && (
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <h4 className="font-medium">Availability Overview</h4>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshAvailability}
                disabled={finalLoadingSlots}
                className="h-8"
              >
                {finalLoadingSlots ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Refresh
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
            {availabilityStatus.lastUpdated && (
              <div className="text-xs text-muted-foreground mt-2">
                Last updated: {availabilityStatus.lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </Card>
        )}
        
        {variant !== 'basic' && (
          <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
            <span>Last updated: {format(realtimeBookingHook?.lastRefresh || lastRefresh, 'HH:mm:ss')}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={refreshAvailability}
              disabled={finalLoadingSlots}
            >
              <RefreshCw className={cn("h-4 w-4", finalLoadingSlots && "animate-spin")} />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Connection Warning for realtime variants */}
        {variant !== 'basic' && !isConnected && (
          <Alert className="mb-6">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              Real-time updates are currently unavailable. Time slots may not reflect the latest availability.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Session Actions for existing sessions */}
        {showSessionActions && existingSessionId && sessionStatus && (
          <Card className="p-4 mb-6 bg-muted">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Session Actions</h4>
              <div className="flex gap-2">
                {sessionStatus === 'scheduled' && (
                  <Button
                    size="sm"
                    onClick={() => handleSessionAction('start')}
                    disabled={sessionActionLoading === 'start'}
                  >
                    {sessionActionLoading === 'start' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    Start Session
                  </Button>
                )}
                {sessionStatus === 'in_progress' && (
                  <Button
                    size="sm"
                    onClick={() => handleSessionAction('complete')}
                    disabled={sessionActionLoading === 'complete'}
                  >
                    {sessionActionLoading === 'complete' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    Complete Session
                  </Button>
                )}
                {['scheduled', 'in_progress'].includes(sessionStatus) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleSessionAction('cancel', { reason: 'Session cancelled by user' })}
                    disabled={sessionActionLoading === 'cancel'}
                  >
                    {sessionActionLoading === 'cancel' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    Cancel Session
                  </Button>
                )}
              </div>
            </div>
          </Card>
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
                setValue('timeSlot', ''); // Reset time slot when coach changes
              }}
            >
              <SelectTrigger data-testid="coach-select">
                <SelectValue placeholder={t('selectCoach')} />
              </SelectTrigger>
              <SelectContent>
                {finalLoadingCoaches ? (
                  <SelectItem value="" disabled>
                    {commonT('loading')}
                  </SelectItem>
                ) : (
                  finalCoaches?.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      <CoachItem coach={coach} isOnline={variant !== 'basic' ? coach.isOnline : false} />
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
            <CoachInfoCard coach={selectedCoachData} variant={variant} />
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
                if (variant !== 'basic') {
                  refreshAvailability(); // Refresh when duration changes
                }
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
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {t('selectTime')}
                </div>
              </legend>
              
              {finalLoadingSlots ? (
                <div className="text-center py-8 text-muted-foreground">
                  {variant === 'realtime' ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      Loading available time slots...
                    </>
                  ) : (
                    commonT('loading')
                  )}
                </div>
              ) : finalTimeSlots && finalTimeSlots.length > 0 ? (
                <div className={cn(
                  "grid gap-2",
                  variant === 'basic' ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}>
                  {finalTimeSlots.map((slot) => {
                    const isAvailable = slot.isAvailable && !slot.isBooked && !slot.isBlocked;
                    const isSelected = watchedTimeSlot === slot.startTime;
                    
                    return (
                      <TimeSlotButton
                        key={slot.startTime}
                        slot={slot}
                        isSelected={isSelected}
                        isAvailable={isAvailable}
                        variant={variant}
                        onSelect={() => setValue('timeSlot', slot.startTime)}
                        getSlotStatusIcon={getSlotStatusIcon}
                        getSlotStatusText={getSlotStatusText}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {variant !== 'basic' && (
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  )}
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
              <Label htmlFor="description">{t('description')} (optional)</Label>
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
            <Button 
              type="submit" 
              disabled={isLoading}
              data-testid="book-session-submit"
              className={variant !== 'basic' ? "min-w-[140px]" : ""}
            >
              {isLoading ? (
                variant !== 'basic' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  commonT('loading')
                )
              ) : (
                t('bookSession')
              )}
            </Button>
          </div>

          {/* Error Display */}
          {hasError && (
            <Alert variant="destructive">
              {variant === 'basic' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {bookingError || createSessionMutation.error?.message || realtimeBookingHook?.bookingError?.message}
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

// Memoize the main component
export const UnifiedSessionBooking = memo(UnifiedSessionBookingComponent);

// Export convenience components for specific use cases
export function BasicSessionBooking(props: Omit<UnifiedSessionBookingProps, 'variant'>) {
  return <UnifiedSessionBooking {...props} variant="basic" />;
}

export function EnhancedSessionBooking(props: Omit<UnifiedSessionBookingProps, 'variant'>) {
  return (
    <UnifiedSessionBooking 
      {...props} 
      variant="enhanced" 
      showAvailabilityStatus={props.showAvailabilityStatus ?? true}
      showConnectionStatus={props.showConnectionStatus ?? true}
    />
  );
}

export function RealtimeSessionBooking(props: Omit<UnifiedSessionBookingProps, 'variant'>) {
  return (
    <UnifiedSessionBooking 
      {...props} 
      variant="realtime" 
      showAvailabilityStatus={props.showAvailabilityStatus ?? true}
      showConnectionStatus={props.showConnectionStatus ?? true}
      enableOptimisticUpdates={props.enableOptimisticUpdates ?? true}
    />
  );
}
