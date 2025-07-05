'use client';

import { useEffect, useState } from 'react';
import { useRealtimeSessions } from '@/lib/realtime/hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar, 
  Clock, 
  Play, 
  Square, 
  CheckCircle, 
  XCircle,
  Users,
  Video,
  Wifi,
  WifiOff
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Session, SessionStatus } from '@/types';

interface SessionStatusProps {
  session: Session;
  onStatusChange?: (newStatus: SessionStatus) => void;
  showActions?: boolean;
}

export function SessionStatus({ session, onStatusChange, showActions = true }: SessionStatusProps) {
  const { isConnected } = useRealtimeSessions();
  const [localSession, setLocalSession] = useState(session);

  // Update local session when prop changes (from real-time updates)
  useEffect(() => {
    setLocalSession(session);
  }, [session]);

  const getStatusIcon = (status: SessionStatus) => {
    switch (status) {
      case 'scheduled':
        return <Calendar className="h-4 w-4" />;
      case 'in_progress':
        return <Play className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'no_show':
        return <Clock className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: SessionStatus) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'no_show':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: SessionStatus) => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'no_show':
        return 'No Show';
      default:
        return status;
    }
  };

  const canStartSession = () => {
    const sessionTime = parseISO(localSession.scheduledAt);
    const now = new Date();
    const timeDiff = Math.abs(sessionTime.getTime() - now.getTime());
    const minutesDiff = Math.ceil(timeDiff / (1000 * 60));
    
    return localSession.status === 'scheduled' && minutesDiff <= 15;
  };

  const handleStatusChange = async (newStatus: SessionStatus) => {
    try {
      const response = await fetch(`/api/sessions/${localSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update session status');
      }

      const updatedSession = await response.json();
      setLocalSession(updatedSession.data);
      onStatusChange?.(newStatus);
    } catch (error) {
      console.error('Error updating session status:', error);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(localSession.status)}
            Session Status
          </CardTitle>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-600" title="Real-time updates active" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" title="Real-time updates disconnected" />
            )}
            <Badge className={getStatusColor(localSession.status)}>
              {getStatusLabel(localSession.status)}
            </Badge>
          </div>
        </div>
        <CardDescription>
          {localSession.title}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Session Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(parseISO(localSession.scheduledAt), 'PPP')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(parseISO(localSession.scheduledAt), 'p')} 
              ({localSession.duration}m)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {localSession.coach.firstName} {localSession.coach.lastName} & {' '}
              {localSession.client.firstName} {localSession.client.lastName}
            </span>
          </div>
          {localSession.meetingUrl && (
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <a 
                href={localSession.meetingUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Join Meeting
              </a>
            </div>
          )}
        </div>

        {/* Session Actions */}
        {showActions && (
          <div className="flex gap-2 pt-4 border-t">
            {localSession.status === 'scheduled' && canStartSession() && (
              <Button
                size="sm"
                onClick={() => handleStatusChange('in_progress')}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Start Session
              </Button>
            )}
            
            {localSession.status === 'in_progress' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('completed')}
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                End Session
              </Button>
            )}
            
            {localSession.status === 'scheduled' && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleStatusChange('cancelled')}
                className="flex items-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            )}

            {localSession.meetingUrl && canStartSession() && (
              <Button
                size="sm"
                variant="outline"
                asChild
                className="flex items-center gap-2"
              >
                <a href={localSession.meetingUrl} target="_blank" rel="noopener noreferrer">
                  <Video className="h-4 w-4" />
                  Join Now
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Real-time Status Indicator */}
        {!isConnected && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            <WifiOff className="h-3 w-3" />
            Real-time updates unavailable. Status may not be current.
          </div>
        )}
      </CardContent>
    </Card>
  );
}