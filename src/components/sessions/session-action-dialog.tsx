'use client';

import { format, addDays, parseISO, isBefore, isToday } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,


  Info
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useRescheduleSession, useCancelSessionWithPolicy, useAddProgressNote } from '@/lib/queries/sessions';
import type { Session, SessionRescheduleRequest, SessionCancellation } from '@/types';

interface SessionActionDialogProps {
  session: Session;
  action: 'reschedule' | 'cancel' | 'notes';
  onClose: () => void;
  onSuccess: () => void;
}

export function SessionActionDialog({ session, action, onClose, onSuccess }: SessionActionDialogProps) {
  const t = useTranslations('session');
  const commonT = useTranslations('common');

  const rescheduleSession = useRescheduleSession();
  const cancelSession = useCancelSessionWithPolicy();
  const addProgressNote = useAddProgressNote();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reschedule state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Cancel state
  const [cancelReason, setCancelReason] = useState('');
  const [understoodPolicy, setUnderstoodPolicy] = useState(false);

  // Notes state
  const [noteContent, setNoteContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);

  // Time slots (simplified - in real app, fetch from availability API)
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00'
  ];

  // Calculate cancellation policy info
  const getCancellationPolicy = () => {
    const sessionTime = parseISO(session.scheduledAt);
    const now = new Date();
    const hoursUntilSession = (sessionTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilSession >= 24) {
      return {
        policy: 'free_cancellation',
        fee: 0,
        refund: 100,
        message: 'Free cancellation - more than 24 hours notice'
      };
    } else if (hoursUntilSession >= 2) {
      return {
        policy: 'late_cancellation',
        fee: 25,
        refund: 75,
        message: 'Late cancellation fee applies - less than 24 hours notice'
      };
    } else {
      return {
        policy: 'no_refund',
        fee: 100,
        refund: 0,
        message: 'No refund - less than 2 hours notice'
      };
    }
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    try {
      const newDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      newDateTime.setHours(hours, minutes, 0, 0);

      const rescheduleRequest: SessionRescheduleRequest = {
        sessionId: session.id,
        newDateTime: newDateTime.toISOString(),
        reason: rescheduleReason.trim() || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      await rescheduleSession.mutateAsync(rescheduleRequest);
      onSuccess();
    } catch (error) {
      console.error('Failed to reschedule session:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim() || !understoodPolicy) return;

    setIsSubmitting(true);
    try {
      const policy = getCancellationPolicy();
      const cancellation: SessionCancellation = {
        sessionId: session.id,
        reason: cancelReason.trim(),
        cancellationFee: policy.fee,
        refundAmount: policy.refund,
        policyApplied: policy.policy
      };

      await cancelSession.mutateAsync(cancellation);
      onSuccess();
    } catch (error) {
      console.error('Failed to cancel session:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;

    setIsSubmitting(true);
    try {
      await addProgressNote.mutateAsync({
        sessionId: session.id,
        clientId: session.clientId,
        content: noteContent.trim(),
        isPrivate
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRescheduleContent = () => {
    const minDate = addDays(new Date(), 1); // Cannot reschedule to today or past
    
    return (
      <>
        <DialogDescription>
          Choose a new date and time for your session with {session.coach.firstName} {session.coach.lastName}.
        </DialogDescription>

        <div className="space-y-4">
          {/* Current session info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Current Session</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  {format(parseISO(session.scheduledAt), 'PPP')}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {format(parseISO(session.scheduledAt), 'p')}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date selection */}
          <div className="space-y-2">
            <Label>New Date</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => isBefore(date, minDate) || isToday(date)}
              className="rounded-md border"
            />
          </div>

          {/* Time selection */}
          {selectedDate && (
            <div className="space-y-2">
              <Label>New Time</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reschedule-reason">Reason (Optional)</Label>
            <Textarea
              id="reschedule-reason"
              placeholder="Why are you rescheduling this session?"
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Policy notice */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Rescheduling is free when done more than 24 hours in advance. A fee may apply for last-minute changes.
            </AlertDescription>
          </Alert>
        </div>
      </>
    );
  };

  const renderCancelContent = () => {
    const policy = getCancellationPolicy();
    
    return (
      <>
        <DialogDescription>
          Cancel your session with {session.coach.firstName} {session.coach.lastName} on {format(parseISO(session.scheduledAt), 'PPP')} at {format(parseISO(session.scheduledAt), 'p')}.
        </DialogDescription>

        <div className="space-y-4">
          {/* Policy information */}
          <Card className={policy.fee > 0 ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {policy.fee > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                ) : (
                  <Info className="h-4 w-4 text-green-600" />
                )}
                Cancellation Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>{policy.message}</p>
              <div className="flex items-center justify-between">
                <span>Cancellation Fee:</span>
                <Badge variant={policy.fee > 0 ? 'destructive' : 'secondary'}>
                  ${policy.fee}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Refund Amount:</span>
                <Badge variant={policy.refund > 0 ? 'secondary' : 'destructive'}>
                  ${policy.refund}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason for Cancellation *</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Please let us know why you're cancelling..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              required
              rows={3}
            />
          </div>

          {/* Confirmation */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="understand-policy"
                checked={understoodPolicy}
                onChange={(e) => setUnderstoodPolicy(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="understand-policy" className="text-sm">
                I understand the cancellation policy and fees
              </Label>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderNotesContent = () => {
    return (
      <>
        <DialogDescription>
          Add personal notes to your session with {session.coach.firstName} {session.coach.lastName}.
        </DialogDescription>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note-content">Your Notes</Label>
            <Textarea
              id="note-content"
              placeholder="Add your thoughts, questions, or reflections about this session..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Privacy Setting</Label>
            <Select value={isPrivate ? 'private' : 'shared'} onValueChange={(value) => setIsPrivate(value === 'private')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private (only visible to you)</SelectItem>
                <SelectItem value="shared">Shared (visible to you and your coach)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isPrivate 
                ? "These notes will only be visible to you"
                : "These notes will be shared with your coach to help improve future sessions"
              }
            </p>
          </div>
        </div>
      </>
    );
  };

  const getTitle = () => {
    switch (action) {
      case 'reschedule':
        return 'Reschedule Session';
      case 'cancel':
        return 'Cancel Session';
      case 'notes':
        return 'Add Session Notes';
      default:
        return 'Session Action';
    }
  };

  const canSubmit = () => {
    switch (action) {
      case 'reschedule':
        return selectedDate && selectedTime;
      case 'cancel':
        return cancelReason.trim() && understoodPolicy;
      case 'notes':
        return noteContent.trim();
      default:
        return false;
    }
  };

  const handleSubmit = () => {
    switch (action) {
      case 'reschedule':
        return handleReschedule();
      case 'cancel':
        return handleCancel();
      case 'notes':
        return handleAddNote();
      default:
        return Promise.resolve();
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          {action === 'reschedule' && renderRescheduleContent()}
          {action === 'cancel' && renderCancelContent()}
          {action === 'notes' && renderNotesContent()}
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {commonT('cancel')}
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!canSubmit() || isSubmitting}
            variant={action === 'cancel' ? 'destructive' : 'default'}
          >
            {isSubmitting ? 'Processing...' : getTitle()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}