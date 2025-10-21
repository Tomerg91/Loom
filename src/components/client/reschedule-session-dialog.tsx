'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, parseISO } from 'date-fns';
import { Calendar, Clock, Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface RescheduleSessionDialogProps {
  sessionId: string;
  sessionTitle: string;
  currentScheduledAt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RescheduleSessionDialog({
  sessionId,
  sessionTitle,
  currentScheduledAt,
  open,
  onOpenChange,
  onSuccess,
}: RescheduleSessionDialogProps) {
  const queryClient = useQueryClient();
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!newDate || !newTime) {
        throw new Error('Please select both a date and time');
      }

      const newScheduledAt = `${newDate}T${newTime}:00.000Z`;

      const response = await fetch(`/api/sessions/${sessionId}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newScheduledAt,
          reason: reason.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to reschedule session');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['client-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-sessions'] });
      setError('');
      setNewDate('');
      setNewTime('');
      setReason('');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleReschedule = () => {
    setError('');
    rescheduleMutation.mutate();
  };

  // Get minimum date (tomorrow)
  const minDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule Session</DialogTitle>
          <DialogDescription>
            Change the date and time for "{sessionTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Time */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Current Schedule:</p>
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span>{format(parseISO(currentScheduledAt), 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm mt-1">
              <Clock className="h-4 w-4" />
              <span>{format(parseISO(currentScheduledAt), 'h:mm a')}</span>
            </div>
          </div>

          {/* New Date */}
          <div className="space-y-2">
            <Label htmlFor="newDate">New Date</Label>
            <Input
              id="newDate"
              type="date"
              min={minDate}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
            />
          </div>

          {/* New Time */}
          <div className="space-y-2">
            <Label htmlFor="newTime">New Time</Label>
            <Input
              id="newTime"
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              required
            />
          </div>

          {/* Reason (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Let the other party know why you're rescheduling..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/500 characters
            </p>
          </div>

          {/* Notice */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <p className="text-xs text-blue-800">
                Sessions can only be rescheduled with at least 24 hours notice. The coach must be available at the new time.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={rescheduleMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={rescheduleMutation.isPending || !newDate || !newTime}
          >
            {rescheduleMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Rescheduling...
              </>
            ) : (
              'Confirm Reschedule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RescheduleSessionDialog;
