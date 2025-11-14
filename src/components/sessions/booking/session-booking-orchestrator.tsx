'use client';

import { useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { useTranslations } from 'next-intl';
import { Calendar, AlertCircle, Loader2, XCircle, WifiOff } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { Session } from '@/types';
import { useRealtimeConnection } from '@/lib/realtime/hooks';
import { useRealtimeBookings } from '@/hooks/use-realtime-bookings';
import { bookingMachine } from './machines/booking-machine';
import {
  CoachSelector,
  DateSelector,
  TimeSlotGrid,
  BookingDetailsForm,
  AvailabilityStatus,
  ConnectionStatus,
} from './components';
import {
  useBookingCoaches,
  useBookingTimeSlots,
  useBookingMutation,
  useSessionActions,
  type SessionActions,
} from './hooks';
import { BookingConfirmationDialog } from '../booking-confirmation-dialog';

export interface SessionBookingOrchestratorProps {
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

/**
 * Orchestrator component for session booking
 * Coordinates between XState machine, domain hooks, and presentational components
 */
export function SessionBookingOrchestrator({
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
  showSessionActions = false,
}: SessionBookingOrchestratorProps) {
  const t = useTranslations('session');
  const commonT = useTranslations('common');

  // XState machine
  const [state, send] = useMachine(bookingMachine, {
    context: {
      coachId: selectedCoachId || null,
      date: null,
      timeSlot: null,
      duration: 60,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      title: '',
      description: '',
      bookedSession: null,
      error: null,
      variant,
      enableOptimisticUpdates,
    },
  });

  // Realtime connection
  const { isConnected, reconnect } = useRealtimeConnection();

  // Enable realtime updates for basic variant if configured
  if (enableRealtimeUpdates && variant === 'basic') {
    useRealtimeBookings();
  }

  // Domain hooks
  const {
    coaches,
    isLoading: loadingCoaches,
    error: coachesError,
  } = useBookingCoaches({
    variant,
    includeOnlineStatus: variant !== 'basic',
  });

  const {
    timeSlots,
    availabilityStatus,
    isLoading: loadingSlots,
    error: slotsError,
    lastRefresh,
    refresh: refreshTimeSlots,
  } = useBookingTimeSlots({
    coachId: state.context.coachId,
    date: state.context.date,
    duration: state.context.duration,
    variant,
    isConnected: variant === 'realtime' ? isConnected : true,
  });

  const {
    createBooking,
    isLoading: isBooking,
    error: bookingError,
  } = useBookingMutation({
    enableOptimisticUpdates,
    onSuccess: (sessionData) => {
      send({ type: 'BOOKING_SUCCESS', session: sessionData });
      onSuccess?.(sessionData);
    },
    onError: (error) => {
      send({ type: 'BOOKING_ERROR', error: error.message });
    },
  });

  const {
    startSession,
    completeSession,
    cancelSession,
    loading: actionLoading,
    error: actionError,
  } = useSessionActions({
    sessionId: existingSessionId,
    sessionActions,
  });

  // Handle booking submission from machine
  useEffect(() => {
    if (state.matches('booking') && state.context.coachId && state.context.date && state.context.timeSlot && state.context.title) {
      createBooking({
        coachId: state.context.coachId,
        date: state.context.date,
        timeSlot: state.context.timeSlot,
        title: state.context.title,
        description: state.context.description,
        duration: state.context.duration,
        timezone: state.context.timezone,
      });
    }
  }, [state, createBooking]);

  // Event handlers
  const handleCoachSelect = (coachId: string) => {
    send({ type: 'SELECT_COACH', coachId });
  };

  const handleDateSelect = (date: string) => {
    send({ type: 'SELECT_DATE', date });
  };

  const handleTimeSlotSelect = (timeSlot: string) => {
    send({ type: 'SELECT_TIME', timeSlot });
  };

  const handleDurationChange = (duration: number) => {
    send({ type: 'UPDATE_DURATION', duration });
  };

  const handleTitleChange = (title: string) => {
    send({ type: 'UPDATE_DETAILS', title });
  };

  const handleDescriptionChange = (description: string) => {
    send({ type: 'UPDATE_DETAILS', description });
  };

  const handleTimezoneChange = (timezone: string) => {
    send({ type: 'UPDATE_DETAILS' });
    // Note: XState machine doesn't handle timezone in UPDATE_DETAILS,
    // but we keep this for form consistency
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send({ type: 'SUBMIT' });
  };

  const handleReset = () => {
    send({ type: 'RESET' });
  };

  // Get selected coach data for info card
  const selectedCoachData = coaches.find((coach) => coach.id === state.context.coachId);

  // Determine error state
  const hasError = bookingError || actionError || state.context.error;

  return (
    <Card className={cn('w-full', variant === 'basic' ? 'max-w-2xl mx-auto' : 'max-w-4xl mx-auto', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>{customTitle || t('bookSession')}</CardTitle>
          </div>
          {showConnectionStatus && variant !== 'basic' && (
            <ConnectionStatus isConnected={isConnected} onReconnect={reconnect} />
          )}
        </div>
        <CardDescription>
          {customDescription || t('selectCoachAndTime')}
          {variant === 'realtime' && ' - Real-time availability with live updates'}
        </CardDescription>

        {/* Availability Status Overview */}
        {variant !== 'basic' && showAvailabilityStatus && (
          <AvailabilityStatus
            status={availabilityStatus}
            onRefresh={refreshTimeSlots}
            isRefreshing={loadingSlots}
          />
        )}

        {/* Last refresh indicator for enhanced/realtime variants */}
        {variant !== 'basic' && (
          <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
            <span>Last updated: {format(lastRefresh, 'HH:mm:ss')}</span>
            <Button variant="ghost" size="sm" onClick={refreshTimeSlots} disabled={loadingSlots}>
              {loadingSlots ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  Refresh
                </span>
              )}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Connection Warning */}
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
                  <Button size="sm" onClick={startSession} disabled={actionLoading === 'start'}>
                    {actionLoading === 'start' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    Start Session
                  </Button>
                )}
                {sessionStatus === 'in_progress' && (
                  <Button size="sm" onClick={() => completeSession()} disabled={actionLoading === 'complete'}>
                    {actionLoading === 'complete' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    Complete Session
                  </Button>
                )}
                {['scheduled', 'in_progress'].includes(sessionStatus) && (
                  <Button size="sm" variant="destructive" onClick={() => cancelSession('Session cancelled by user')} disabled={actionLoading === 'cancel'}>
                    {actionLoading === 'cancel' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    Cancel Session
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Coach Selection */}
          <CoachSelector
            coaches={coaches}
            selectedCoachId={state.context.coachId}
            onCoachSelect={handleCoachSelect}
            isLoading={loadingCoaches}
            showOnlineStatus={variant !== 'basic'}
            error={coachesError}
          />

          {/* Coach Info Card */}
          {showCoachInfo && selectedCoachData && (
            <Card className="p-4 bg-muted">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">
                      {selectedCoachData.firstName} {selectedCoachData.lastName}
                    </h4>
                  </div>
                  {selectedCoachData.bio && <p className="text-sm text-muted-foreground mt-1">{selectedCoachData.bio}</p>}
                  {variant !== 'basic' && selectedCoachData.timezone && (
                    <p className="text-xs text-muted-foreground mt-1">Timezone: {selectedCoachData.timezone}</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Date Selection */}
          <DateSelector selectedDate={state.context.date} onDateSelect={handleDateSelect} />

          {/* Booking Details Form (includes duration) */}
          <BookingDetailsForm
            title={state.context.title}
            description={state.context.description}
            duration={state.context.duration}
            timezone={state.context.timezone}
            onTitleChange={handleTitleChange}
            onDescriptionChange={handleDescriptionChange}
            onDurationChange={handleDurationChange}
            onTimezoneChange={handleTimezoneChange}
            isLoading={isBooking}
          />

          {/* Time Slot Selection */}
          {state.context.coachId && state.context.date && (
            <TimeSlotGrid
              timeSlots={timeSlots}
              selectedTimeSlot={state.context.timeSlot}
              onTimeSlotSelect={handleTimeSlotSelect}
              isLoading={loadingSlots}
              variant={variant}
            />
          )}

          {/* Submit Button */}
          <div className="flex gap-2 justify-end">
            <Button type="submit" disabled={isBooking} data-testid="book-session-submit" className={variant !== 'basic' ? 'min-w-[140px]' : ''}>
              {isBooking ? (
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
              {variant === 'basic' ? <AlertCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              <AlertDescription>{state.context.error || bookingError?.message || actionError}</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>

      {/* Booking Confirmation Dialog */}
      {variant === 'basic' && (
        <BookingConfirmationDialog
          session={state.context.bookedSession}
          isOpen={state.matches('success')}
          onClose={handleReset}
          onViewSession={(sessionId) => {
            console.log('Navigate to session:', sessionId);
          }}
        />
      )}
    </Card>
  );
}
