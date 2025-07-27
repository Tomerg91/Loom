import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare } from 'lucide-react';
import { Session } from '../shared/types';

interface SessionParticipantsProps {
  session: Session;
}

export function SessionParticipants({ session }: SessionParticipantsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Participants</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coach */}
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={session.coach.avatarUrl} 
              alt={`${session.coach.firstName} ${session.coach.lastName} - Coach`} 
            />
            <AvatarFallback>
              {session.coach.firstName.charAt(0)}{session.coach.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {session.coach.firstName} {session.coach.lastName}
            </p>
            <p className="text-xs text-muted-foreground">Coach</p>
          </div>
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>

        {/* Client */}
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={session.client.avatarUrl} 
              alt={`${session.client.firstName} ${session.client.lastName} - Client`} 
            />
            <AvatarFallback>
              {session.client.firstName.charAt(0)}{session.client.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {session.client.firstName} {session.client.lastName}
            </p>
            <p className="text-xs text-muted-foreground">Client</p>
          </div>
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}