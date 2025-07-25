'use client';

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useUser } from '@/lib/store/auth-store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Trash2, Calendar, Save } from 'lucide-react';

// Validation schema for availability
const timeSlotSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
});

const availabilitySchema = z.object({
  slots: z.array(timeSlotSchema).min(1, 'At least one time slot is required'),
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
}

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
          slots: formData.slots,
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
      <Card>
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
                          <Badge key={index} variant="outline" className="w-full justify-center">
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
            {/* Time Slots */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Time Slots</Label>
                <Button type="button" variant="outline" onClick={addTimeSlot}>
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
                            <SelectTrigger>
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
                            <SelectTrigger>
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
                            <SelectTrigger>
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