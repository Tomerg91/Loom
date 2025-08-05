import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, Trash2, Play, Square, Edit } from 'lucide-react';
import { Session, User } from '@/types';

interface SessionActionsProps {
  session: Session;
  currentUser?: User | null;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onStart?: () => void;
  onEnd?: () => void;
  onReschedule?: () => void;
}

export function SessionActions({ 
  session, 
  currentUser, 
  onComplete, 
  onCancel, 
  onDelete,
  onStart,
  onEnd,
  onReschedule
}: SessionActionsProps) {
  const canComplete = () => {
    if (!currentUser || !session) return false;
    return session.status === 'scheduled' && 
           currentUser.role === 'coach' && 
           currentUser.id === session.coach.id;
  };

  const canCancel = () => {
    if (!currentUser || !session) return false;
    return session.status === 'scheduled' && 
           (currentUser.id === session.coach.id || currentUser.id === session.client.id || currentUser.role === 'admin');
  };

  const canDelete = () => {
    if (!currentUser || !session) return false;
    return currentUser.role === 'admin' || 
           (currentUser.role === 'coach' && currentUser.id === session.coach.id);
  };

  const hasActions = canComplete() || canCancel() || canDelete();

  if (!hasActions) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {session.status === 'scheduled' && canComplete() && onStart && (
          <Button 
            variant="default" 
            className="w-full"
            onClick={onStart}
            data-testid="start-session-button"
          >
            <Play className="mr-2 h-4 w-4" />
            Start Session
          </Button>
        )}
        
        {session.status === 'in_progress' && canComplete() && onEnd && (
          <Button 
            variant="default" 
            className="w-full"
            onClick={onEnd}
            data-testid="end-session-button"
          >
            <Square className="mr-2 h-4 w-4" />
            End Session
          </Button>
        )}
        
        {session.status === 'scheduled' && onReschedule && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={onReschedule}
            data-testid="reschedule-session-button"
          >
            <Edit className="mr-2 h-4 w-4" />
            Reschedule Session
          </Button>
        )}
        
        {canCancel() && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={onCancel}
            data-testid="cancel-session-button"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel Session
          </Button>
        )}
        
        {canDelete() && (
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={onDelete}
            data-testid="delete-session-button"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Session
          </Button>
        )}
      </CardContent>
    </Card>
  );
}