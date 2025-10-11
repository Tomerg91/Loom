'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  AvailabilityStepData,
  DayAvailability,
  DayOfWeek,
  SessionDuration,
  BufferTime,
  TimeSlot,
} from '@/lib/types/onboarding';
import { cn } from '@/lib/utils';

const DAY_VALUES = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const satisfies readonly DayOfWeek[];

const timeSlotSchema = z.object({
  startTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
});

const dayAvailabilitySchema = z.object({
  day: z.enum(DAY_VALUES),
  isAvailable: z.boolean(),
  timeSlots: z.array(timeSlotSchema),
});

const sessionDurationSchema = z.union([
  z.literal(30),
  z.literal(45),
  z.literal(60),
  z.literal(90),
  z.literal(120),
]);

const bufferTimeSchema = z.union([
  z.literal(0),
  z.literal(15),
  z.literal(30),
  z.literal(60),
]);

const availabilitySchema = z.object({
  weeklyAvailability: z.array(dayAvailabilitySchema),
  defaultSessionDuration: sessionDurationSchema,
  bookingBuffer: bufferTimeSchema,
});

interface AvailabilityStepProps {
  data: Partial<AvailabilityStepData>;
  onNext: (data: AvailabilityStepData) => void;
  onBack: () => void;
}

const DAYS_OF_WEEK: { value: DayOfWeek; labelKey: string }[] = [
  { value: 'monday', labelKey: 'monday' },
  { value: 'tuesday', labelKey: 'tuesday' },
  { value: 'wednesday', labelKey: 'wednesday' },
  { value: 'thursday', labelKey: 'thursday' },
  { value: 'friday', labelKey: 'friday' },
  { value: 'saturday', labelKey: 'saturday' },
  { value: 'sunday', labelKey: 'sunday' },
];

const SESSION_DURATIONS: SessionDuration[] = [30, 45, 60, 90, 120];
const BUFFER_TIMES: BufferTime[] = [0, 15, 30, 60];

export function AvailabilityStep({
  data,
  onNext,
  onBack,
}: AvailabilityStepProps) {
  const t = useTranslations('onboarding.coach.availability');
  const tCommon = useTranslations('common');

  const getInitialAvailability = (): DayAvailability[] => {
    if (data.weeklyAvailability && data.weeklyAvailability.length > 0) {
      return data.weeklyAvailability;
    }
    return DAYS_OF_WEEK.map(day => ({
      day: day.value,
      isAvailable: false,
      timeSlots: [],
    }));
  };

  const [availability, setAvailability] = useState<DayAvailability[]>(
    getInitialAvailability()
  );

  const { handleSubmit, control } = useForm<AvailabilityStepData>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      weeklyAvailability: availability,
      defaultSessionDuration: data.defaultSessionDuration || 60,
      bookingBuffer: data.bookingBuffer || 15,
    },
  });

  const toggleDayAvailability = (dayIndex: number) => {
    const newAvailability = [...availability];
    newAvailability[dayIndex].isAvailable =
      !newAvailability[dayIndex].isAvailable;
    if (!newAvailability[dayIndex].isAvailable) {
      newAvailability[dayIndex].timeSlots = [];
    }
    setAvailability(newAvailability);
  };

  const addTimeSlot = (dayIndex: number) => {
    const newAvailability = [...availability];
    const lastSlot =
      newAvailability[dayIndex].timeSlots[
        newAvailability[dayIndex].timeSlots.length - 1
      ];

    const newSlot: TimeSlot = lastSlot
      ? { startTime: lastSlot.endTime, endTime: '17:00' }
      : { startTime: '09:00', endTime: '17:00' };

    newAvailability[dayIndex].timeSlots.push(newSlot);
    setAvailability(newAvailability);
  };

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    const newAvailability = [...availability];
    newAvailability[dayIndex].timeSlots.splice(slotIndex, 1);
    setAvailability(newAvailability);
  };

  const updateTimeSlot = (
    dayIndex: number,
    slotIndex: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    const newAvailability = [...availability];
    newAvailability[dayIndex].timeSlots[slotIndex][field] = value;
    setAvailability(newAvailability);
  };

  const onSubmit = (formData: AvailabilityStepData) => {
    onNext({
      ...formData,
      weeklyAvailability: availability,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Weekly Schedule */}
      <div className="space-y-4">
        <div>
          <Label className="text-lg">{t('weeklySchedule')}</Label>
          <p className="text-sm text-sand-500 mt-1">
            {t('weeklyScheduleHelper')}
          </p>
        </div>

        <div className="space-y-3">
          {DAYS_OF_WEEK.map((day, dayIndex) => {
            const dayData = availability[dayIndex];
            return (
              <Card
                key={day.value}
                className={cn(
                  'p-4 transition-all',
                  dayData.isAvailable
                    ? 'border-teal-400 bg-teal-50/30'
                    : 'border-sand-200'
                )}
              >
                <div className="space-y-3">
                  {/* Day header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`day-${day.value}`}
                        checked={dayData.isAvailable}
                        onChange={() => toggleDayAvailability(dayIndex)}
                        className="h-5 w-5 rounded border-sand-300 text-teal-500 focus:ring-2 focus:ring-teal-500"
                        aria-label={`Toggle ${day.labelKey} availability`}
                      />
                      <Label
                        htmlFor={`day-${day.value}`}
                        className="text-base font-semibold cursor-pointer"
                      >
                        {t(`days.${day.labelKey}`)}
                      </Label>
                    </div>

                    {dayData.isAvailable && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addTimeSlot(dayIndex)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t('addTimeSlot')}
                      </Button>
                    )}
                  </div>

                  {/* Time slots */}
                  {dayData.isAvailable && (
                    <div className="space-y-2 pl-8">
                      {dayData.timeSlots.length === 0 ? (
                        <p className="text-sm text-sand-500 italic">
                          {t('noTimeSlotsAdded')}
                        </p>
                      ) : (
                        dayData.timeSlots.map((slot, slotIndex) => (
                          <div
                            key={slotIndex}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="time"
                              value={slot.startTime}
                              onChange={e =>
                                updateTimeSlot(
                                  dayIndex,
                                  slotIndex,
                                  'startTime',
                                  e.target.value
                                )
                              }
                              className="px-3 py-2 border border-sand-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                              aria-label={`${day.labelKey} start time ${slotIndex + 1}`}
                            />
                            <span className="text-sand-500">-</span>
                            <input
                              type="time"
                              value={slot.endTime}
                              onChange={e =>
                                updateTimeSlot(
                                  dayIndex,
                                  slotIndex,
                                  'endTime',
                                  e.target.value
                                )
                              }
                              className="px-3 py-2 border border-sand-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                              aria-label={`${day.labelKey} end time ${slotIndex + 1}`}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                removeTimeSlot(dayIndex, slotIndex)
                              }
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              aria-label={`Remove time slot ${slotIndex + 1}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Default Session Duration */}
      <div className="space-y-2">
        <Label htmlFor="defaultSessionDuration">
          {t('defaultSessionDuration')}{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Controller
          control={control}
          name="defaultSessionDuration"
          render={({ field }) => (
            <Select
              value={field.value.toString()}
              onValueChange={value => field.onChange(parseInt(value))}
            >
              <SelectTrigger
                id="defaultSessionDuration"
                aria-describedby="duration-helper"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_DURATIONS.map(duration => (
                  <SelectItem key={duration} value={duration.toString()}>
                    {duration} {t('minutes')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <p id="duration-helper" className="text-sm text-sand-500">
          {t('defaultSessionDurationHelper')}
        </p>
      </div>

      {/* Booking Buffer */}
      <div className="space-y-2">
        <Label htmlFor="bookingBuffer">
          {t('bookingBuffer')} <span className="text-destructive">*</span>
        </Label>
        <Controller
          control={control}
          name="bookingBuffer"
          render={({ field }) => (
            <Select
              value={field.value.toString()}
              onValueChange={value => field.onChange(parseInt(value))}
            >
              <SelectTrigger
                id="bookingBuffer"
                aria-describedby="buffer-helper"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUFFER_TIMES.map(buffer => (
                  <SelectItem key={buffer} value={buffer.toString()}>
                    {buffer === 0 ? t('noBuffer') : `${buffer} ${t('minutes')}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <p id="buffer-helper" className="text-sm text-sand-500">
          {t('bookingBufferHelper')}
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={onBack}>
          {tCommon('back')}
        </Button>
        <Button type="submit">{tCommon('next')}</Button>
      </div>
    </form>
  );
}
