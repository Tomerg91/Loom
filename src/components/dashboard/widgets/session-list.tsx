import { Star, CheckCircle } from 'lucide-react';
import React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Session } from '@/types';

interface SessionListProps {
  sessions: Session[];
  formattedDates: Record<string, string>;
}

// Memoized session item component for better performance
const SessionItem = React.memo(({ session, formattedDate }: { session: Session; formattedDate: string }) => {
  const badgeVariant = React.useMemo(() => {
    return session.status === 'completed' ? 'default' : 
           session.status === 'upcoming' ? 'secondary' : 'destructive';
  }, [session.status]);
  
  const coachInitials = React.useMemo(() => {
    return session.coachName.split(' ').map(n => n.charAt(0)).join('');
  }, [session.coachName]);
  
  return (
    <Card key={session.id}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={session.coachAvatar} alt={session.coachName} />
              <AvatarFallback>
                {coachInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{session.topic}</CardTitle>
              <CardDescription>
                with {session.coachName} • {formattedDate} • {session.duration} min
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={badgeVariant}>
              {session.status}
            </Badge>
            {session.rating && (
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                <span>{session.rating}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      {session.status === 'completed' && (
        <CardContent className="space-y-4">
          {session.notes && (
            <div>
              <h4 className="text-sm font-medium mb-2">Session Notes</h4>
              <p className="text-sm text-muted-foreground">{session.notes}</p>
            </div>
          )}
          
          {session.keyInsights && session.keyInsights.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Key Insights</h4>
              <ul className="space-y-1">
                {session.keyInsights.map((insight, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <span className="text-primary mr-2">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {session.actionItems && session.actionItems.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Action Items</h4>
              <ul className="space-y-1">
                {session.actionItems.map((item, index) => (
                  <li key={index} className="text-sm flex items-start">
                    <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
});

SessionItem.displayName = 'SessionItem';

export const SessionList = React.memo(({ sessions, formattedDates }: SessionListProps) => {
  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <SessionItem 
          key={session.id} 
          session={session} 
          formattedDate={formattedDates[`session-${session.id}`] || ''} 
        />
      ))}
    </div>
  );
});

SessionList.displayName = 'SessionList';