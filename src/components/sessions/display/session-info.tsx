import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
} from 'lucide-react';
import { Session } from '../shared/types';
import { formatDateTime } from '../shared/utils';

interface SessionInfoProps {
  session: Session;
}

export function SessionInfo({ session }: SessionInfoProps) {
  const formattedDateTime = useMemo(() => {
    if (!session?.scheduledAt) return { date: '', time: '', full: '' };
    return formatDateTime(session.scheduledAt);
  }, [session?.scheduledAt]);

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

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'in-person':
        return <MapPin className="h-4 w-4" />;
      default:
        return <Video className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Session Details</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Date &amp; Time</Label>
            <p className="text-sm">
              {formattedDateTime.full}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Duration</Label>
            <p className="text-sm flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              {session.duration} minutes
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Session Type</Label>
            <p className="text-sm flex items-center">
              {getSessionTypeIcon(session.sessionType)}
              <span className="ml-1 capitalize">{session.sessionType.replace('-', ' ')}</span>
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Status</Label>
            <Badge className={getStatusColor(session.status)}>
              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            </Badge>
          </div>
        </div>

        {session.meetingUrl && session.status === 'scheduled' && (
          <div className="pt-4 border-t">
            <Button asChild className="w-full">
              <a 
                href={session.meetingUrl} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Video className="mr-2 h-4 w-4" />
                Join Session
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}