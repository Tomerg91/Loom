import { Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { TimeSlot } from '../shared/types';

interface TimeSlotCalendarProps {
  timeSlots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
}

export function TimeSlotCalendar({ timeSlots, selectedSlot, onSelectSlot }: TimeSlotCalendarProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const uniqueDates = [...new Set(timeSlots.map(slot => slot.date.split('T')[0]))];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Time Slots</CardTitle>
        <CardDescription>Select your preferred date and time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {uniqueDates.map((date) => {
            const daySlots = timeSlots.filter(slot => slot.date.startsWith(date));
            const dateObj = new Date(date);
            
            return (
              <div key={date} className="space-y-2">
                <h4 className="font-medium text-center text-sm">
                  {formatDate(dateObj.toISOString())}
                </h4>
                <div className="space-y-1">
                  {daySlots.map((slot) => (
                    <Button
                      key={slot.id}
                      variant={slot.available ? "outline" : "ghost"}
                      size="sm"
                      className={`w-full text-xs ${
                        !slot.available ? 'opacity-50 cursor-not-allowed' : ''
                      } ${
                        selectedSlot?.id === slot.id ? 'bg-primary text-white' : ''
                      }`}
                      disabled={!slot.available}
                      onClick={() => onSelectSlot(slot)}
                    >
                      <Clock className="mr-1 h-3 w-3" />
                      {slot.time}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}