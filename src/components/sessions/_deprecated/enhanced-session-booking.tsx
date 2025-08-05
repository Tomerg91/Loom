'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, User, Wifi, WifiOff, Users, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { format, addDays, startOfTomorrow } from 'date-fns';
import { useRealtimeBooking, type BookingFormData } from '@/hooks/use-realtime-booking';
import { cn } from '@/lib/utils';

// Validation schema
const bookingSchema = z.object({
  coachId: z.string().min(1, 'Coach selection is required'),
  date: z.string().min(1, 'Date is required'),
  timeSlot: z.string().min(1, 'Time slot is required'),
  title: z.string().min(1, 'Session title is required').max(100),
  description: z.string().max(500).optional(),
  duration: z.number().min(15).max(240),
});

interface EnhancedSessionBookingProps {
  onSuccess?: () => void;
  selectedCoachId?: string;
  className?: string;
}

export function EnhancedSessionBooking({ 
  onSuccess, 
  selectedCoachId, 
  className 
}: EnhancedSessionBookingProps) {
  const t = useTranslations('session');
  const commonT = useTranslations('common');

  const {
    coaches,
    timeSlots,
    selectedCoach,
    selectedDate,
    selectedCoachData,
    availabilityStatus,
    loadingCoaches,
    loadingSlots,
    isBooking,
    coachesError,
    slotsError,
    bookingError,
    isConnected,
    lastRefresh,
    setSelectedCoach,
    setSelectedDate,
    createSession,
    refreshAvailability,
    reconnect,
  } = useRealtimeBooking(selectedCoachId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      coachId: selectedCoachId || '',
      duration: 60,
    },
  });

  const watchedTimeSlot = watch('timeSlot');
  const watchedDuration = watch('duration');

  const onSubmit = (data: z.infer<typeof bookingSchema>) => {
    const bookingData: BookingFormData = {
      coachId: data.coachId,
      date: data.date,
      timeSlot: data.timeSlot,
      title: data.title,
      description: data.description,
      duration: data.duration,
    };

    createSession(bookingData, {
      onSuccess: () => {
        reset();
        setSelectedDate('');
        onSuccess?.();
      },
    });
  };

  // Generate next 30 days for date selection
  const availableDates = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(startOfTomorrow(), i);
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEEE, MMMM d, yyyy'),
    };
  });

  // Time slot status helpers
  const getSlotStatusIcon = (slot: { isBooked?: boolean; isBlocked?: boolean; isAvailable: boolean }) => {
    if (slot.isBooked) return <XCircle className="h-3 w-3 text-destructive" />;
    if (slot.isBlocked) return <XCircle className="h-3 w-3 text-muted-foreground" />;
    if (slot.isAvailable) return <CheckCircle className="h-3 w-3 text-green-500" />;
    return <XCircle className="h-3 w-3 text-muted-foreground" />;
  };

  const getSlotStatusText = (slot: { isBooked?: boolean; isBlocked?: boolean; isAvailable: boolean; clientName?: string; conflictReason?: string }) => {
    if (slot.isBooked) return slot.clientName ? `Booked by ${slot.clientName}` : 'Booked';
    if (slot.isBlocked) return slot.conflictReason || 'Blocked';
    if (slot.isAvailable) return 'Available';
    return 'Unavailable';
  };

  return (
    <Card className={cn("w-full max-w-4xl mx-auto", className)}>
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
          {t('selectCoachAndTime')} - Real-time availability with live updates
        </CardDescription>
        <div className="text-xs text-muted-foreground">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
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

        {(coachesError || slotsError) && (
          <Alert className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {coachesError?.message || slotsError?.message || 'Failed to load data'}
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
                setSelectedDate('');
                setValue('date', '');
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
                refreshAvailability(); // Refresh when duration changes
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
          {availabilityStatus && selectedCoach && selectedDate && (
            <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <h4 className="font-medium">Availability Overview</h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshAvailability}
                  disabled={loadingSlots}
                  className="h-8"
                >
                  {loadingSlots ? (
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
              <div className="text-xs text-muted-foreground mt-2">
                Last updated: {availabilityStatus.lastUpdated.toLocaleTimeString()}
              </div>
            </Card>
          )}

          {/* Time Slot Selection */}
          {selectedCoach && selectedDate && (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {t('selectTime')}
                </div>
              </legend>
              
              {loadingSlots ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  Loading available time slots...
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
                          "h-auto p-4 flex flex-col items-start gap-2 text-left",
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
                        {slot.sessionTitle && (
                          <span className="text-xs text-muted-foreground italic">
                            "{slot.sessionTitle}"
                          </span>
                        )}
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
              disabled={isBooking}
              className="min-w-[140px]"
            >
              {isBooking ? (
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
          {bookingError && (
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {bookingError.message}
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}