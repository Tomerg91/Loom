import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit } from 'lucide-react';
import { Session, User } from '../shared/types';

interface SessionHeaderProps {
  session: Session;
  currentUser?: User | null;
  onBack: () => void;
  onEdit: () => void;
}

export function SessionHeader({ session, currentUser, onBack, onEdit }: SessionHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no-show':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canEdit = () => {
    if (!currentUser || !session) return false;
    
    // Coach or admin can edit their sessions
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'coach' && currentUser.id === session.coach.id) return true;
    
    // Clients can only reschedule future sessions
    if (currentUser.role === 'client' && currentUser.id === session.client.id) {
      return session.status === 'scheduled' && new Date(session.scheduledAt) > new Date();
    }
    
    return false;
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sessions
        </Button>
        <div>
          <h1 className="text-3xl font-bold" data-testid="session-title">{session.title}</h1>
          <p className="text-muted-foreground" data-testid="session-description">{session.description}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Badge className={getStatusColor(session.status)}>
          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
        </Badge>
        {canEdit() && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onEdit}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}