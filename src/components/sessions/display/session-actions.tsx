import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, Trash2 } from 'lucide-react';
import { Session, User } from '../shared/types';

interface SessionActionsProps {
  session: Session;
  currentUser?: User | null;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function SessionActions({ 
  session, 
  currentUser, 
  onComplete, 
  onCancel, 
  onDelete 
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
        {canComplete() && (
          <Button 
            variant="default" 
            className="w-full"
            onClick={onComplete}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark as Completed
          </Button>
        )}
        
        {canCancel() && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={onCancel}
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
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Session
          </Button>
        )}
      </CardContent>
    </Card>
  );
}