'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/modules/platform/supabase/client';

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionIds: string[];
  onSuccess?: () => void;
}

export function RescheduleDialog({
  open,
  onOpenChange,
  sessionIds,
  onSuccess,
}: RescheduleDialogProps) {
  const [newDate, setNewDate] = useState('');

  const reschedule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('sessions')
        .update({ scheduled_at: newDate })
        .in('id', sessionIds);

      if (error) throw error;
    },
    onSuccess: () => {
      onOpenChange(false);
      setNewDate('');
      onSuccess?.();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="reschedule-dialog">
        <DialogHeader>
          <DialogTitle>Reschedule Sessions</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">New Date & Time</label>
            <Input
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => reschedule.mutate()}
              disabled={!newDate || reschedule.isPending}
            >
              {reschedule.isPending ? 'Rescheduling...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
