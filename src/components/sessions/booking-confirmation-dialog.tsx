'use client';

import { format, parseISO } from 'date-fns';
import { CheckCircle, Calendar, Clock, User, FileText, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { Session } from '@/types';

interface BookingConfirmationDialogProps {
  session: Session | null;
  isOpen: boolean;
  onClose: () => void;
  onViewSession?: (sessionId: string) => void;
}

export function BookingConfirmationDialog({
  session,
  isOpen,
  onClose,
  onViewSession,
}: BookingConfirmationDialogProps) {
  const t = useTranslations('session');
  const commonT = useTranslations('common');
  const [isLoading, setIsLoading] = useState(false);

  if (!session) return null;

  const sessionDate = parseISO(session.scheduledAt);
  const sessionEndTime = new Date(sessionDate.getTime() + session.durationMinutes * 60000);

  const handleViewSession = async () => {
    setIsLoading(true);
    try {
      onViewSession?.(session.id);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <DialogTitle className="text-center">
            {t('bookingConfirmed')}
          </DialogTitle>
          <DialogDescription className="text-center">
            Your session has been successfully booked. You'll receive a confirmation email shortly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session Details Card */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{session.title}</h4>
                <Badge variant="secondary">{t('scheduled')}</Badge>
              </div>

              <Separator />

              {/* Date and Time */}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {format(sessionDate, 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(sessionDate, 'h:mm a')} - {format(sessionEndTime, 'h:mm a')}
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{session.durationMinutes} {t('minutes')}</span>
              </div>

              {/* Coach */}
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {session.coach.firstName} {session.coach.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('coach')}
                  </div>
                </div>
              </div>

              {/* Description */}
              {session.description && (
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {session.description}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardContent className="p-4">
              <h5 className="font-medium mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                What happens next?
              </h5>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• You'll receive a confirmation email with session details</li>
                <li>• Your coach will get notified about the booking</li>
                <li>• You'll get a reminder 24 hours before the session</li>
                <li>• Meeting link will be shared closer to the session time</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {commonT('close')}
          </Button>
          <Button 
            onClick={handleViewSession} 
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? commonT('loading') : t('viewSession')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}