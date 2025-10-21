'use client';

import { Users, Circle } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePresence } from '@/lib/realtime/hooks';


interface OnlineUser {
  user_id: string;
  name: string;
  avatar: string;
  role: 'admin' | 'coach' | 'client';
}

interface OnlineUsersProps {
  sessionId?: string;
  showHeader?: boolean;
  className?: string;
}

export function OnlineUsers({ sessionId, showHeader = true, className = '' }: OnlineUsersProps) {
  const channelName = sessionId ? `session:${sessionId}` : 'general';
  const { onlineUsers, isConnected } = usePresence(channelName);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'coach':
        return 'bg-blue-100 text-blue-800';
      case 'client':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className={className}>
      {showHeader && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Online Now
              <Badge variant="outline" className="ml-auto">
                {onlineUsers.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              {sessionId ? 'Users in this session' : 'Users currently online'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {onlineUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users currently online
              </p>
            ) : (
              <div className="space-y-3">
                {onlineUsers.map((user: OnlineUser, index) => (
                  <div key={`${user.user_id}-${index}`} className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-green-500 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Active now
                      </p>
                    </div>
                    <Badge className={getRoleColor(user.role)} variant="outline">
                      {user.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!showHeader && onlineUsers.length > 0 && (
        <div className="flex -space-x-2">
          {onlineUsers.slice(0, 5).map((user: OnlineUser, index) => (
            <div key={`${user.user_id}-${index}`} className="relative">
              <Avatar className="h-8 w-8 border-2 border-background">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <Circle className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-green-500 text-green-500" />
            </div>
          ))}
          {onlineUsers.length > 5 && (
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted border-2 border-background text-xs font-medium">
              +{onlineUsers.length - 5}
            </div>
          )}
        </div>
      )}
    </div>
  );
}