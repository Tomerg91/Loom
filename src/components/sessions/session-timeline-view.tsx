'use client';

import { 
  format, 
  parseISO, 
  isThisYear, 
  isThisMonth, 
  isThisWeek, 
  startOfWeek, 
  endOfWeek,

} from 'date-fns';
import { 
  Calendar, 
  Clock, 
 
  Video, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  PlayCircle,
  Star,
  MessageSquare,
  Paperclip,
  TrendingUp,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Session, SessionStatus, SessionType } from '@/types';

interface SessionTimelineViewProps {
  sessions: Session[];
}

interface TimelineGroup {
  title: string;
  period: string;
  sessions: Session[];
  stats?: {
    total: number;
    completed: number;
    cancelled: number;
    avgRating?: number;
    totalHours: number;
  };
}

export function SessionTimelineView({ sessions }: SessionTimelineViewProps) {
  const t = useTranslations('session');

  // Group sessions by time period
  const timelineGroups = useMemo((): TimelineGroup[] => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    
    // Sort sessions by date (newest first)
    const sortedSessions = [...sessions].sort((a, b) => 
      parseISO(b.scheduledAt).getTime() - parseISO(a.scheduledAt).getTime()
    );

    const groups: TimelineGroup[] = [];
    
    // This Week
    const thisWeekSessions = sortedSessions.filter(session => {
      const sessionDate = parseISO(session.scheduledAt);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    });
    
    if (thisWeekSessions.length > 0) {
      groups.push({
        title: 'This Week',
        period: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
        sessions: thisWeekSessions,
        stats: calculateStats(thisWeekSessions)
      });
    }

    // This Month (excluding this week)
    const thisMonthSessions = sortedSessions.filter(session => {
      const sessionDate = parseISO(session.scheduledAt);
      return isThisMonth(sessionDate) && !isThisWeek(sessionDate);
    });
    
    if (thisMonthSessions.length > 0) {
      groups.push({
        title: 'Earlier This Month',
        period: format(now, 'MMMM yyyy'),
        sessions: thisMonthSessions,
        stats: calculateStats(thisMonthSessions)
      });
    }

    // Previous months (group by month)
    const previousMonthSessions = sortedSessions.filter(session => {
      const sessionDate = parseISO(session.scheduledAt);
      return !isThisMonth(sessionDate) && isThisYear(sessionDate);
    });

    // Group previous months
    const monthGroups: Record<string, Session[]> = {};
    previousMonthSessions.forEach(session => {
      const sessionDate = parseISO(session.scheduledAt);
      const monthKey = format(sessionDate, 'yyyy-MM');
      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = [];
      }
      monthGroups[monthKey].push(session);
    });

    Object.entries(monthGroups).forEach(([monthKey, monthSessions]) => {
      const monthDate = new Date(monthKey + '-01');
      groups.push({
        title: format(monthDate, 'MMMM yyyy'),
        period: format(monthDate, 'MMMM yyyy'),
        sessions: monthSessions,
        stats: calculateStats(monthSessions)
      });
    });

    // Previous years
    const previousYearSessions = sortedSessions.filter(session => {
      const sessionDate = parseISO(session.scheduledAt);
      return !isThisYear(sessionDate);
    });

    if (previousYearSessions.length > 0) {
      const yearGroups: Record<string, Session[]> = {};
      previousYearSessions.forEach(session => {
        const sessionDate = parseISO(session.scheduledAt);
        const yearKey = format(sessionDate, 'yyyy');
        if (!yearGroups[yearKey]) {
          yearGroups[yearKey] = [];
        }
        yearGroups[yearKey].push(session);
      });

      Object.entries(yearGroups).forEach(([year, yearSessions]) => {
        groups.push({
          title: year,
          period: year,
          sessions: yearSessions,
          stats: calculateStats(yearSessions)
        });
      });
    }

    return groups;
  }, [sessions]);

  function calculateStats(sessions: Session[]) {
    const completed = sessions.filter(s => s.status === 'completed');
    const cancelled = sessions.filter(s => s.status === 'cancelled');
    const totalHours = sessions.reduce((sum, session) => sum + (session.duration / 60), 0);
    
    const ratings = completed.filter(s => s.rating).map(s => s.rating!);
    const avgRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : undefined;

    return {
      total: sessions.length,
      completed: completed.length,
      cancelled: cancelled.length,
      avgRating,
      totalHours
    };
  }

  const getStatusIcon = (status: SessionStatus) => {
    switch (status) {
      case 'scheduled':
        return <Calendar className="h-4 w-4 text-blue-600" />;
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-green-600" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-gray-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'no_show':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: SessionStatus): string => {
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
        return 'bg-gray-100 text-gray-800';
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

  const renderSessionCard = (session: Session, isLast: boolean) => (
    <div key={session.id} className="relative">
      {/* Timeline line */}
      <div className="absolute left-6 top-12 w-px bg-gray-200 h-full" style={{ display: isLast ? 'none' : 'block' }} />
      
      {/* Timeline dot */}
      <div className="absolute left-4 top-6 w-5 h-5 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center z-10">
        {getStatusIcon(session.status)}
      </div>
      
      {/* Session content */}
      <div className="ml-12 mb-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  {session.title}
                  <Badge variant="outline" className={getStatusColor(session.status)}>
                    {t(session.status)}
                  </Badge>
                </CardTitle>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(parseISO(session.scheduledAt), 'PPP')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(parseISO(session.scheduledAt), 'p')}
                  </div>
                  <div className="flex items-center gap-1">
                    {getSessionTypeIcon(session.sessionType)}
                    <span className="capitalize">{session.sessionType || 'video'}</span>
                  </div>
                </div>
              </div>
              
              {session.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium">{session.rating}/5</span>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Coach/Client info */}
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session.coach.avatarUrl} alt={`${session.coach.firstName} ${session.coach.lastName}`} />
                <AvatarFallback>
                  {session.coach.firstName[0]}{session.coach.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{session.coach.firstName} {session.coach.lastName}</p>
                <p className="text-sm text-muted-foreground">Coach • {session.duration} minutes</p>
              </div>
            </div>

            {/* Session description */}
            {session.description && (
              <p className="text-sm text-muted-foreground">{session.description}</p>
            )}

            {/* Session notes */}
            {session.notes && (
              <div className="p-2 bg-muted rounded-md">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Session Notes</span>
                </div>
                <p className="text-sm">{session.notes}</p>
              </div>
            )}

            {/* Action items */}
            {session.actionItems && session.actionItems.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Action Items</span>
                </div>
                <ul className="text-sm space-y-1 ml-5">
                  {session.actionItems.slice(0, 3).map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                  {session.actionItems.length > 3 && (
                    <li className="text-xs text-muted-foreground ml-4">
                      +{session.actionItems.length - 3} more items
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Attachments */}
            {session.attachments && session.attachments.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Paperclip className="h-4 w-4" />
                <span>{session.attachments.length} attachment{session.attachments.length !== 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Feedback */}
            {session.feedback && (
              <div className="p-2 bg-blue-50 rounded-md border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-medium text-blue-600">Your Feedback</span>
                </div>
                <p className="text-sm text-blue-800">{session.feedback}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderGroupStats = (stats: TimelineGroup['stats']) => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
        <div className="space-y-1">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total Sessions</div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold text-blue-600">{stats.totalHours.toFixed(1)}h</div>
          <div className="text-sm text-muted-foreground">Total Hours</div>
        </div>
        {stats.avgRating && (
          <div className="space-y-1">
            <div className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
              <Star className="h-5 w-5 fill-current" />
              {stats.avgRating.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">Avg Rating</div>
          </div>
        )}
        {stats.cancelled > 0 && (
          <div className="space-y-1">
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <div className="text-sm text-muted-foreground">Cancelled</div>
          </div>
        )}
      </div>
    );
  };

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No sessions yet</h3>
          <p className="text-muted-foreground">Your session history will appear here once you start booking sessions.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {timelineGroups.map((group, groupIndex) => (
        <div key={`${group.title}-${groupIndex}`} className="space-y-6">
          {/* Group header */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="text-xl font-semibold">{group.title}</h3>
                <p className="text-sm text-muted-foreground">{group.period}</p>
              </div>
              {group.stats && group.stats.total > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">
                    {group.stats.completed}/{group.stats.total} completed
                  </span>
                </div>
              )}
            </div>
            
            {/* Group stats */}
            {group.stats && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  {renderGroupStats(group.stats)}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sessions timeline */}
          <div className="relative">
            {group.sessions.map((session, index) => 
              renderSessionCard(session, index === group.sessions.length - 1)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}