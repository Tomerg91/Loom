'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isFuture } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  User, 
  Video, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Filter,
  Search
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState, useMemo, useCallback } from 'react';



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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/lib/auth/use-user';
import type { Session, SessionStatus } from '@/types';

// Memoized SessionCard component for better performance
const SessionCard = React.memo(({
  session,
  user,
  getStatusColor,
  getStatusLabel,
  canJoinSession,
  canCancelSession,
  handleStatusUpdate,
  handleCancelSession,
  t
}: {
  session: Session;
  user: any;
  getStatusColor: (status: SessionStatus) => string;
  getStatusLabel: (status: SessionStatus) => string;
  canJoinSession: (session: Session) => boolean;
  canCancelSession: (session: Session) => boolean;
  handleStatusUpdate: (sessionId: string, status: SessionStatus) => void;
  handleCancelSession: (sessionId: string) => void;
  t: any;
}) => {
  const formattedDate = React.useMemo(() => format(parseISO(session.scheduledAt), 'PPP'), [session.scheduledAt]);
  const formattedTime = React.useMemo(() => format(parseISO(session.scheduledAt), 'p'), [session.scheduledAt]);
  const participantName = React.useMemo(() => {
    return user?.role === 'client' ? 
      `${session.coach.firstName} ${session.coach.lastName}` :
      `${session.client.firstName} ${session.client.lastName}`;
  }, [user?.role, session.coach, session.client]);
  
  return (
    <Card className="hover:shadow-md transition-shadow" data-testid="session-item">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {session.title}
              <Badge className={getStatusColor(session.status)}>
                {getStatusLabel(session.status)}
              </Badge>
            </CardTitle>
            <CardDescription>
              {session.description}
            </CardDescription>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {canJoinSession(session) && session.meetingUrl && (
                <DropdownMenuItem asChild>
                  <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer">
                    <Video className="h-4 w-4 mr-2" />
                    {t('joinSession')}
                  </a>
                </DropdownMenuItem>
              )}
              
              {user?.role === 'coach' && session.status === 'scheduled' && (
                <DropdownMenuItem
                  onClick={() => handleStatusUpdate(session.id, 'in_progress')}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t('startSession')}
                </DropdownMenuItem>
              )}
              
              {user?.role === 'coach' && session.status === 'in_progress' && (
                <DropdownMenuItem
                  onClick={() => handleStatusUpdate(session.id, 'completed')}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t('endSession')}
                </DropdownMenuItem>
              )}
              
              {canCancelSession(session) && (
                <DropdownMenuItem
                  onClick={() => handleCancelSession(session.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('cancelSession')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formattedDate}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{formattedTime} ({session.duration} {t('minutes')})</span>
          </div>
          
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{participantName}</span>
          </div>
        </div>

        {session.notes && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-sm">{session.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

SessionCard.displayName = 'SessionCard';

interface SessionListProps {
  showFilters?: boolean;
  limit?: number;
  coachId?: string;
  clientId?: string;
}

interface SessionsResponse {
  data: Session[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

function SessionListComponent({ 
  showFilters = true, 
  limit = 10,
  coachId,
  clientId 
}: SessionListProps) {
  const t = useTranslations('session');
  const commonT = useTranslations('common');
  const user = useUser();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Fetch sessions
  const { data: sessionsData, isLoading, error } = useQuery({
    queryKey: ['sessions', page, limit, statusFilter, coachId, clientId],
    queryFn: async (): Promise<SessionsResponse> => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: 'scheduled_at',
        sortOrder: 'desc',
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (coachId) {
        params.append('coachId', coachId);
      }
      if (clientId) {
        params.append('clientId', clientId);
      }

      const response = await fetch(`/api/sessions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
  });

  // Update session status mutation
  const updateSessionMutation = useMutation({
    mutationFn: async ({ sessionId, status }: { sessionId: string; status: SessionStatus }) => {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update session');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  // Cancel session mutation
  const cancelSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel session');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const getStatusColor = React.useCallback((status: SessionStatus): string => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getStatusLabel = React.useCallback((status: SessionStatus): string => {
    return t(status);
  }, [t]);

  const canJoinSession = (session: Session): boolean => {
    const sessionTime = parseISO(session.scheduledAt);
    const now = new Date();
    const timeDiff = Math.abs(sessionTime.getTime() - now.getTime());
    const minutesDiff = Math.ceil(timeDiff / (1000 * 60));
    
    return session.status === 'scheduled' && minutesDiff <= 15;
  };

  const canCancelSession = (session: Session): boolean => {
    const sessionTime = parseISO(session.scheduledAt);
    return session.status === 'scheduled' && isFuture(sessionTime);
  };

  const handleStatusUpdate = React.useCallback((sessionId: string, status: SessionStatus) => {
    updateSessionMutation.mutate({ sessionId, status });
  }, [updateSessionMutation]);

  const handleCancelSession = React.useCallback((sessionId: string) => {
    if (confirm(t('confirmCancel'))) {
      cancelSessionMutation.mutate(sessionId);
    }
  }, [t, cancelSessionMutation]);

  const sessions = React.useMemo(() => sessionsData?.data || [], [sessionsData?.data]);
  const pagination = React.useMemo(() => sessionsData?.pagination, [sessionsData?.pagination]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-destructive">Failed to load sessions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search sessions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                    data-testid="session-search"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as SessionStatus | 'all')}
                >
                  <SelectTrigger className="w-40" data-testid="status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sessions</SelectItem>
                    <SelectItem value="scheduled">{getStatusLabel('scheduled')}</SelectItem>
                    <SelectItem value="in_progress">{getStatusLabel('in_progress')}</SelectItem>
                    <SelectItem value="completed">{getStatusLabel('completed')}</SelectItem>
                    <SelectItem value="cancelled">{getStatusLabel('cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{t('noSessions')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              user={user}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
              canJoinSession={canJoinSession}
              canCancelSession={canCancelSession}
              handleStatusUpdate={handleStatusUpdate}
              handleCancelSession={handleCancelSession}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} sessions
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => setPage(page - 1)}
            >
              {commonT('previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => setPage(page + 1)}
            >
              {commonT('next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Export the memoized version
export const SessionList = React.memo(SessionListComponent);
SessionList.displayName = 'SessionList';
