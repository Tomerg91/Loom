'use client';

import { memo, useCallback } from 'react';
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TimeSlot } from '../hooks/use-booking-time-slots';

interface TimeSlotGridProps {
  timeSlots: TimeSlot[];
  selectedTimeSlot: string | null;
  onTimeSlotSelect: (timeSlot: string) => void;
  isLoading?: boolean;
  variant?: 'basic' | 'enhanced' | 'realtime';
}

const TimeSlotButton = memo(
  ({
    slot,
    isSelected,
    isAvailable,
    variant,
    onSelect,
  }: {
    slot: TimeSlot;
    isSelected: boolean;
    isAvailable: boolean;
    variant: 'basic' | 'enhanced' | 'realtime';
    onSelect: () => void;
  }) => {
    const handleClick = useCallback(() => {
      if (isAvailable) onSelect();
    }, [isAvailable, onSelect]);

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
      <Button
        type="button"
        variant={isSelected ? 'default' : 'outline'}
        disabled={!isAvailable}
        onClick={handleClick}
        className={cn(
          variant === 'basic' ? 'h-auto py-2' : 'h-auto p-4 flex flex-col items-start gap-2 text-left',
          !isAvailable && 'opacity-50 cursor-not-allowed',
          variant !== 'basic' && slot.isBooked && 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
          variant !== 'basic' && slot.isBlocked && 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20'
        )}
        aria-pressed={isSelected}
        aria-label={`${slot.startTime} to ${slot.endTime} - ${variant !== 'basic' ? getSlotStatusText(slot) : !slot.isAvailable ? ' (unavailable)' : ''}`}
        data-testid="time-slot"
      >
        {variant === 'basic' ? (
          <div className="text-center">
            <div className="font-medium">
              {slot.startTime} - {slot.endTime}
            </div>
            {!slot.isAvailable && <div className="text-xs opacity-70">{slot.conflictReason || 'Unavailable'}</div>}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 w-full">
              {getSlotStatusIcon(slot)}
              <span className="font-medium">
                {slot.startTime} - {slot.endTime}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{getSlotStatusText(slot)}</span>
            {slot.sessionTitle && <span className="text-xs text-muted-foreground italic">&quot;{slot.sessionTitle}&quot;</span>}
          </>
        )}
      </Button>
    );
  }
);

TimeSlotButton.displayName = 'TimeSlotButton';

/**
 * Presentational component for time slot selection grid
 * Pure UI component with no business logic
 */
export const TimeSlotGrid = memo<TimeSlotGridProps>(
  ({ timeSlots, selectedTimeSlot, onTimeSlotSelect, isLoading = false, variant = 'basic' }) => {
    const t = useTranslations('session');
    const commonT = useTranslations('common');

    if (isLoading) {
      return (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {t('selectTime')}
            </div>
          </legend>
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
        </fieldset>
      );
    }

    return (
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {t('selectTime')}
          </div>
        </legend>

        {timeSlots.length > 0 ? (
          <div
            className={cn(
              'grid gap-2',
              variant === 'basic' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            )}
          >
            {timeSlots.map((slot) => {
              const isAvailable = slot.isAvailable && !slot.isBooked && !slot.isBlocked;
              const isSelected = selectedTimeSlot === slot.startTime;

              return (
                <TimeSlotButton
                  key={slot.startTime}
                  slot={slot}
                  isSelected={isSelected}
                  isAvailable={isAvailable}
                  variant={variant}
                  onSelect={() => onTimeSlotSelect(slot.startTime)}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {variant !== 'basic' && <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />}
            No available time slots for this date
          </div>
        )}
      </fieldset>
    );
  }
);

TimeSlotGrid.displayName = 'TimeSlotGrid';
