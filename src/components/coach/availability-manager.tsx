'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Plus, Trash2, Calendar, Save, Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/lib/auth/use-user';


// Validation schema for availability with timezone support
const timeSlotSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  timezone: z.string().optional(),
});

const availabilitySchema = z.object({
  slots: z.array(timeSlotSchema).min(1, 'At least one time slot is required'),
  timezone: z.string().min(1, 'Timezone is required'),
}).refine((data) => {
  // Validate that end time is after start time for each slot
  return data.slots.every(slot => {
    const start = parseInt(slot.startTime.replace(':', ''));
    const end = parseInt(slot.endTime.replace(':', ''));
    return end > start;
  });
}, {
  message: 'End time must be after start time',
  path: ['slots'],
});

type AvailabilityFormData = z.infer<typeof availabilitySchema>;

interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone?: string;
}

// Common timezone options
const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (London)' },
  { value: 'Europe/Paris', label: 'Central European Time (Paris)' },
  { value: 'Europe/Berlin', label: 'Central European Time (Berlin)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (Tokyo)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (Shanghai)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (Mumbai)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (Sydney)' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

// Generate time options (30-minute intervals)
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 6; hour <= 22; hour++) {
    for (const minute of [0, 30]) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      times.push({ value: timeString, label: displayTime });
    }
  }
  return times;
};

export function AvailabilityManager() {
  const _locale = useLocale();
  const t = useTranslations('coach');
  const user = useUser();
  const queryClient = useQueryClient();

  const [isSaving, setIsSaving] = useState(false);

  // Memoize time options since they never change
  const timeOptions = useMemo(() => generateTimeOptions(), []);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AvailabilityFormData>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      slots: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'slots',
  });

  // Fetch current availability
  const { data: currentAvailability, isLoading } = useQuery({
    queryKey: ['coach-availability', user?.id],
    queryFn: async (): Promise<AvailabilitySlot[]> => {
      if (!user?.id) return [];
      const response = await fetch(`/api/coaches/${user.id}/schedule`);
      if (!response.ok) throw new Error('Failed to fetch availability');
      const data = await response.json();
      return data.data || [];
    },
    enabled: !!user?.id,
  });

  // Set form data when availability is loaded
  React.useEffect(() => {
    if (currentAvailability && currentAvailability.length > 0) {
      setValue('slots', currentAvailability);
    }
  }, [currentAvailability, setValue]);

  // Save availability mutation
  const saveAvailabilityMutation = useMutation({
    mutationFn: async (formData: AvailabilityFormData) => {
      if (!user?.id) throw new Error('User not found');
      
      const response = await fetch(`/api/coaches/${user.id}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slots: formData.slots.map(slot => ({
            ...slot,
            timezone: formData.timezone,
          })),
          timezone: formData.timezone,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save availability');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-availability'] });
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
    },
  });

  const onSubmit = async (data: AvailabilityFormData) => {
    setIsSaving(true);
    try {
      await saveAvailabilityMutation.mutateAsync(data);
    } finally {
      setIsSaving(false);
    }
  };

  const addTimeSlot = () => {
    append({
      dayOfWeek: 1, // Default to Monday
      startTime: '09:00',
      endTime: '17:00',
    });
  };


  const groupSlotsByDay = (slots: AvailabilitySlot[]) => {
    const grouped: Record<number, AvailabilitySlot[]> = {};
    slots.forEach(slot => {
      if (!grouped[slot.dayOfWeek]) {
        grouped[slot.dayOfWeek] = [];
      }
      grouped[slot.dayOfWeek].push(slot);
    });
    return grouped;
  };

  const currentSlots = watch('slots') || [];
  const groupedSlots = groupSlotsByDay(currentSlots);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </CardHeader>
          <CardContent>
            <div className="h-20 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{t('setAvailability')}</h2>
        <p className="text-muted-foreground">{t('manageAvailabilityDescription')}</p>
      </div>

      {/* Current Schedule Overview */}
      <Card data-testid="availability-calendar">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Current Schedule
          </CardTitle>
          <CardDescription>
            Your current weekly availability schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedSlots).length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No availability set. Add time slots below to define your schedule.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DAYS_OF_WEEK.map(day => {
                const daySlots = groupedSlots[day.value] || [];
                return (
                  <div key={day.value} className="space-y-2">
                    <h4 className="font-medium">{day.label}</h4>
                    {daySlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Not available</p>
                    ) : (
                      <div className="space-y-1">
                        {daySlots.map((slot, index) => (
                          <Badge key={index} variant="outline" className="w-full justify-center" data-testid={`time-slot-${day.label.toLowerCase()}-${slot.startTime.replace(':', '')}`}>
                            <Clock className="h-3 w-3 mr-1" />
                            {slot.startTime} - {slot.endTime}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Availability Form */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Availability</CardTitle>
          <CardDescription>
            Add or modify your available time slots for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Timezone Selection */}
            <div className="space-y-2">
              <Label className="text-base font-medium">
                <Globe className="h-4 w-4 inline mr-2" />
                Timezone
              </Label>
              <Select
                value={watch('timezone')}
                onValueChange={(value) => setValue('timezone', value)}
              >
                <SelectTrigger data-testid="timezone-select">
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.timezone && (
                <p className="text-sm text-red-600">{errors.timezone.message}</p>
              )}
              <p className="text-sm text-muted-foreground">
                All time slots will be set in this timezone. Clients will see times converted to their local timezone.
              </p>
            </div>

            {/* Time Slots */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Time Slots</Label>
                <Button type="button" variant="outline" onClick={addTimeSlot} data-testid="add-time-slot">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Slot
                </Button>
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No time slots defined</p>
                  <p className="text-sm">Click &quot;Add Time Slot&quot; to start setting your availability</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                          <Label>Day of Week</Label>
                          <Select
                            value={watch(`slots.${index}.dayOfWeek`)?.toString()}
                            onValueChange={(value) => setValue(`slots.${index}.dayOfWeek`, parseInt(value))}
                          >
                            <SelectTrigger data-testid="day-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS_OF_WEEK.map(day => (
                                <SelectItem key={day.value} value={day.value.toString()}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Start Time</Label>
                          <Select
                            value={watch(`slots.${index}.startTime`)}
                            onValueChange={(value) => setValue(`slots.${index}.startTime`, value)}
                          >
                            <SelectTrigger data-testid="start-time">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map(time => (
                                <SelectItem key={time.value} value={time.value}>
                                  {time.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>End Time</Label>
                          <Select
                            value={watch(`slots.${index}.endTime`)}
                            onValueChange={(value) => setValue(`slots.${index}.endTime`, value)}
                          >
                            <SelectTrigger data-testid="end-time">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map(time => (
                                <SelectItem key={time.value} value={time.value}>
                                  {time.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-destructive hover:text-destructive"
                          data-testid="delete-time-slot"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {errors.slots && (
                <p className="text-sm text-destructive">
                  {errors.slots.message || 'Please check your time slots'}
                </p>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSaving || saveAvailabilityMutation.isPending}
                className="min-w-32"
                data-testid="save-time-slot"
              >
                {isSaving || saveAvailabilityMutation.isPending ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {t('availabilityUpdated') ? 'Update' : 'Save'} Availability
                  </>
                )}
              </Button>
            </div>

            {/* Success/Error Messages */}
            {saveAvailabilityMutation.isSuccess && (
              <div className="p-3 text-sm text-green-800 bg-green-100 rounded-md">
                Availability updated successfully!
              </div>
            )}

            {saveAvailabilityMutation.error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {saveAvailabilityMutation.error.message}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Set your availability for each day you want to accept bookings</p>
          <p>• You can have multiple time slots per day (e.g., morning and afternoon)</p>
          <p>• Changes will be reflected immediately for new booking requests</p>
          <p>• Existing scheduled sessions will not be affected by availability changes</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Export as default for dynamic imports
export default AvailabilityManager;
