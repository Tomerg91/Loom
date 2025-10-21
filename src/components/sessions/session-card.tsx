'use client';

import { format, parseISO, isFuture, isPast, isToday, differenceInMinutes, differenceInHours } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  User, 
  Video, 
  Phone,
  MapPin,
  MoreHorizontal,
  Star,
  FileText,
  Paperclip,
  MessageSquare,
  Timer,
  AlertCircle,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Edit3,
  Trash2,
  Calendar as CalendarIcon,
  ExternalLink
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/lib/auth/use-user';
import type { Session, SessionStatus, SessionType } from '@/types';

import { SessionActionDialog } from './session-action-dialog';
import { SessionRatingDialog } from './session-rating-dialog';

interface SessionCardProps {
  session: Session;
  onUpdate?: () => void;
}

export function SessionCard({ session, onUpdate }: SessionCardProps) {
  const t = useTranslations('session');
  const commonT = useTranslations('common');
  const user = useUser();

  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState<'reschedule' | 'cancel' | 'notes' | null>(null);

  const sessionTime = parseISO(session.scheduledAt);
  const now = new Date();
  const isSessionInFuture = isFuture(sessionTime);
  const isSessionInPast = isPast(sessionTime);
  const isSessionToday = isToday(sessionTime);

  // Calculate time until session or time since session
  const getTimeDescription = () => {
    const diffMinutes = differenceInMinutes(sessionTime, now);
    const diffHours = differenceInHours(sessionTime, now);

    if (isSessionInFuture) {
      if (diffMinutes < 60) {
        return `In ${diffMinutes} minutes`;
      } else if (diffHours < 24) {
        return `In ${diffHours} hours`;
      } else {
        return format(sessionTime, 'MMM dd, yyyy');
      }
    } else {
      if (Math.abs(diffMinutes) < 60) {
        return `${Math.abs(diffMinutes)} minutes ago`;
      } else if (Math.abs(diffHours) < 24) {
        return `${Math.abs(diffHours)} hours ago`;
      } else {
        return format(sessionTime, 'MMM dd, yyyy');
      }
    }
  };

  const getStatusColor = (status: SessionStatus): string => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'in_progress':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'no_show':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: SessionStatus) => {
    switch (status) {
      case 'scheduled':
        return <Calendar className="h-4 w-4" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'no_show':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getSessionTypeIcon = (type?: SessionType) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4 text-blue-600" />;
      case 'phone':
        return <Phone className="h-4 w-4 text-green-600" />;
      case 'in-person':
        return <MapPin className="h-4 w-4 text-purple-600" />;
      default:
        return <Video className="h-4 w-4 text-blue-600" />;
    }
  };

  const canJoinSession = (): boolean => {
    const timeDiff = Math.abs(sessionTime.getTime() - now.getTime());
    const minutesDiff = Math.ceil(timeDiff / (1000 * 60));
    
    return session.status === 'scheduled' && minutesDiff <= 15;
  };

  const canCancelSession = (): boolean => {
    return session.status === 'scheduled' && isSessionInFuture;
  };

  const canRescheduleSession = (): boolean => {
    return session.status === 'scheduled' && isSessionInFuture;
  };

  const canRateSession = (): boolean => {
    return session.status === 'completed' && !session.rating;
  };

  const handleJoinSession = () => {
    if (session.meetingUrl) {
      window.open(session.meetingUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const renderSessionProgress = () => {
    if (session.status === 'in_progress') {
      // Calculate progress based on elapsed time
      const startTime = parseISO(session.scheduledAt);
      const endTime = new Date(startTime.getTime() + session.duration * 60000);
      const elapsed = now.getTime() - startTime.getTime();
      const total = endTime.getTime() - startTime.getTime();
      const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));

      return (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Session in progress</span>
            <span className="text-muted-foreground">
              {Math.round(progress)}% complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      );
    }
    return null;
  };

  const renderAttachmentsPreview = () => {
    if (!session.attachments?.length) return null;

    return (
      <div className="mt-3 flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {session.attachments.length} attachment{session.attachments.length !== 1 ? 's' : ''}
        </span>
      </div>
    );
  };

  const renderActionItems = () => {
    if (!session.actionItems?.length) return null;

    return (
      <div className="mt-3">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Action Items</span>
        </div>
        <ul className="text-sm text-muted-foreground space-y-1">
          {session.actionItems.slice(0, 3).map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
              {item}
            </li>
          ))}
          {session.actionItems.length > 3 && (
            <li className="text-xs text-muted-foreground">
              +{session.actionItems.length - 3} more items
            </li>
          )}
        </ul>
      </div>
    );
  };

  const otherParticipant = user?.role === 'client' ? session.coach : session.client;
  const participantName = `${otherParticipant.firstName} ${otherParticipant.lastName}`;

  return (
    <>
      <Card className="hover:shadow-md transition-all duration-200 group">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{session.title}</CardTitle>
                <Badge className={`${getStatusColor(session.status)} flex items-center gap-1`}>
                  {getStatusIcon(session.status)}
                  {t(session.status)}
                </Badge>
              </div>
              
              {session.description && (
                <CardDescription className="text-sm">
                  {session.description}
                </CardDescription>
              )}
              
              {/* Time warning for upcoming sessions */}
              {session.status === 'scheduled' && isSessionInFuture && (
                <div className="flex items-center gap-2">
                  {differenceInMinutes(sessionTime, now) <= 30 && (
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      <Timer className="h-3 w-3 mr-1" />
                      Starting soon
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Session Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {canJoinSession() && session.meetingUrl && (
                  <DropdownMenuItem onClick={handleJoinSession}>
                    <Video className="h-4 w-4 mr-2" />
                    Join Session
                  </DropdownMenuItem>
                )}
                
                {canRescheduleSession() && (
                  <DropdownMenuItem onClick={() => setShowActionDialog('reschedule')}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Reschedule
                  </DropdownMenuItem>
                )}
                
                {canCancelSession() && (
                  <DropdownMenuItem 
                    onClick={() => setShowActionDialog('cancel')}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Cancel Session
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={() => setShowActionDialog('notes')}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add Notes
                </DropdownMenuItem>
                
                {canRateSession() && (
                  <DropdownMenuItem onClick={() => setShowRatingDialog(true)}>
                    <Star className="h-4 w-4 mr-2" />
                    Rate Session
                  </DropdownMenuItem>
                )}
                
                {session.attachments?.length && (
                  <DropdownMenuItem onClick={() => window.open(`/sessions/${session.id}/files`, '_blank')}>
                    <FileText className="h-4 w-4 mr-2" />
                    View Files
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Session Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <div>{format(sessionTime, 'PPP')}</div>
                <div className="text-xs text-muted-foreground">{getTimeDescription()}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <div>{format(sessionTime, 'p')}</div>
                <div className="text-xs text-muted-foreground">{session.duration} minutes</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={otherParticipant.avatarUrl} alt={participantName} />
                  <AvatarFallback className="text-xs">
                    {otherParticipant.firstName[0]}{otherParticipant.lastName[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <div>{participantName}</div>
                <div className="text-xs text-muted-foreground capitalize">{user?.role === 'client' ? 'Coach' : 'Client'}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {getSessionTypeIcon(session.sessionType)}
              <div>
                <div className="capitalize">{session.sessionType || 'Video'}</div>
                {session.location && (
                  <div className="text-xs text-muted-foreground">{session.location}</div>
                )}
              </div>
            </div>
          </div>

          {/* Session Progress (for in-progress sessions) */}
          {renderSessionProgress()}

          {/* Session Notes */}
          {session.notes && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Session Notes</span>
              </div>
              <p className="text-sm text-muted-foreground">{session.notes}</p>
            </div>
          )}

          {/* Rating Display */}
          {session.rating && (
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="text-sm font-medium">{session.rating}/5</span>
              {session.feedback && (
                <span className="text-sm text-muted-foreground">- {session.feedback}</span>
              )}
            </div>
          )}

          {/* Action Items Preview */}
          {renderActionItems()}

          {/* Attachments Preview */}
          {renderAttachmentsPreview()}

          {/* Quick Actions */}
          {(canJoinSession() || canRateSession()) && (
            <div className="flex items-center gap-2 pt-2 border-t">
              {canJoinSession() && session.meetingUrl && (
                <Button onClick={handleJoinSession} className="flex items-center gap-2" size="sm">
                  <Video className="h-4 w-4" />
                  Join Session
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
              
              {canRateSession() && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowRatingDialog(true)}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Star className="h-4 w-4" />
                  Rate Session
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialogs */}
      {showActionDialog && (
        <SessionActionDialog
          session={session}
          action={showActionDialog}
          onClose={() => setShowActionDialog(null)}
          onSuccess={() => {
            setShowActionDialog(null);
            onUpdate?.();
          }}
        />
      )}

      {/* Rating Dialog */}
      {showRatingDialog && (
        <SessionRatingDialog
          session={session}
          onClose={() => setShowRatingDialog(false)}
          onSuccess={() => {
            setShowRatingDialog(false);
            onUpdate?.();
          }}
        />
      )}
    </>
  );
}
