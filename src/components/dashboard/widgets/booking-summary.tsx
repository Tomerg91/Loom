import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertCircle } from 'lucide-react';
import { Coach, TimeSlot } from '../shared/types';
import { formatPrice } from '../shared/utils';

interface BookingSummaryProps {
  coach: Coach;
  timeSlot: TimeSlot;
  sessionType: string;
}

export function BookingSummary({ coach, timeSlot, sessionType }: BookingSummaryProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3 p-3 border rounded-lg">
          <Avatar className="h-12 w-12">
            <AvatarImage src={coach.avatarUrl} alt={`${coach.firstName} ${coach.lastName}`} />
            <AvatarFallback>
              {coach.firstName.charAt(0)}{coach.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{coach.firstName} {coach.lastName}</p>
            <p className="text-sm text-muted-foreground">{coach.title}</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">{formatDate(timeSlot.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time:</span>
            <span className="font-medium">{timeSlot.time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration:</span>
            <span className="font-medium">{timeSlot.duration} minutes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Session Type:</span>
            <span className="font-medium capitalize">{sessionType.replace('-', ' ')}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium">Total:</span>
            <span className="font-bold text-lg">{formatPrice(coach.hourlyRate)}</span>
          </div>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Cancellation Policy</p>
              <p>Free cancellation up to 24 hours before your session. Cancellations within 24 hours may incur a fee.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}