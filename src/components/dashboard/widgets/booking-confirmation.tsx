import { Calendar, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { Coach } from '../shared/types';

interface BookingConfirmationProps {
  coach: Coach;
  onViewDashboard: () => void;
  onBookAnother: () => void;
}

export function BookingConfirmation({ coach, onViewDashboard, onBookAnother }: BookingConfirmationProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
              <p className="text-muted-foreground">
                Your session with {coach.firstName} {coach.lastName} has been booked successfully.
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">What's Next?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• You'll receive a confirmation email with session details</li>
                <li>• Your coach will send you a preparation guide</li>
                <li>• You'll get a reminder 24 hours before your session</li>
                <li>• Session link will be available 15 minutes before start time</li>
              </ul>
            </div>

            <div className="flex gap-4 justify-center">
              <Button onClick={onViewDashboard}>
                <Calendar className="mr-2 h-4 w-4" />
                View in Dashboard
              </Button>
              <Button variant="outline" onClick={onBookAnother}>
                Book Another Session
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}