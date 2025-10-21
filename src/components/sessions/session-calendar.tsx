'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
 
  addMonths, 
  subMonths,
  parseISO,
  isToday
} from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRealtimeBookings } from '@/hooks/use-realtime-bookings';
import { useUser } from '@/lib/auth/use-user';
import type { Session, SessionStatus } from '@/types';

interface SessionCalendarProps {
  coachId?: string;
  clientId?: string;
  onSessionClick?: (session: Session) => void;
}

interface SessionsResponse {
  data: Session[];
}

export function SessionCalendar({ coachId, clientId, onSessionClick }: SessionCalendarProps) {
  const t = useTranslations('session');
  const user = useUser();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Enable real-time updates
  useRealtimeBookings();

  // Calculate calendar boundaries
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Fetch sessions for the current month
  const { data: sessionsData, isLoading, error } = useQuery({
    queryKey: ['calendar-sessions', format(monthStart, 'yyyy-MM'), coachId, clientId],
    queryFn: async (): Promise<SessionsResponse> => {
      const params = new URLSearchParams({
        from: monthStart.toISOString(),
        to: monthEnd.toISOString(),
        limit: '100',
        sortBy: 'scheduled_at',
        sortOrder: 'asc',
      });

      if (coachId) {
        params.append('coachId', coachId);
      }
      if (clientId) {
        params.append('clientId', clientId);
      }

      const response = await fetch(`/api/sessions?${params}`, {
        credentials: 'include', // Include cookies for auth
      });
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    staleTime: 15000, // Consider data stale after 15 seconds
  });

  const sessions = sessionsData?.data || [];

  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc, session) => {
    const date = format(parseISO(session.scheduledAt), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(session);
    return acc;
  }, {} as Record<string, Session[]>);

  const getStatusColor = (status: SessionStatus): string => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-green-500';
      case 'completed':
        return 'bg-gray-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };

  const getDaySessions = (date: Date): Session[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return sessionsByDate[dateKey] || [];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {format(currentDate, 'MMMM yyyy')}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="text-center py-8">
            <p className="text-destructive mb-2">Failed to load calendar</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-7 gap-1 animate-pulse">
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date) => {
                const daySessions = getDaySessions(date);
                const isCurrentMonth = isSameMonth(date, currentDate);
                const isTodayDate = isToday(date);

                return (
                  <div
                    key={date.toISOString()}
                    className={`
                      min-h-24 p-1 border rounded-md transition-colors
                      ${isCurrentMonth ? 'bg-background' : 'bg-muted/50'}
                      ${isTodayDate ? 'ring-2 ring-primary' : ''}
                      hover:bg-muted/80
                    `}
                  >
                    {/* Date Number */}
                    <div className={`
                      text-sm font-medium mb-1
                      ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                      ${isTodayDate ? 'text-primary font-bold' : ''}
                    `}>
                      {format(date, 'd')}
                    </div>

                    {/* Sessions */}
                    <div className="space-y-1">
                      {daySessions.slice(0, 3).map((session) => (
                        <button
                          key={session.id}
                          onClick={() => onSessionClick?.(session)}
                          className="w-full text-left"
                        >
                          <div className={`
                            px-1 py-0.5 rounded text-xs text-white truncate
                            ${getStatusColor(session.status)}
                            hover:opacity-80 transition-opacity
                          `}>
                            <div className="flex items-center gap-1">
                              <Clock className="h-2 w-2" />
                              <span>
                                {format(parseISO(session.scheduledAt), 'HH:mm')}
                              </span>
                            </div>
                            <div className="truncate font-medium">
                              {session.title}
                            </div>
                            {user?.role === 'client' && (
                              <div className="flex items-center gap-1 text-xs opacity-90">
                                <User className="h-2 w-2" />
                                <span className="truncate">
                                  {session.coach.firstName}
                                </span>
                              </div>
                            )}
                            {user?.role === 'coach' && (
                              <div className="flex items-center gap-1 text-xs opacity-90">
                                <User className="h-2 w-2" />
                                <span className="truncate">
                                  {session.client.firstName}
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                      
                      {/* Show count if more sessions */}
                      {daySessions.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{daySessions.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span className="text-sm">{t('scheduled')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-sm">{t('inProgress')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gray-500"></div>
                <span className="text-sm">{t('completed')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span className="text-sm">{t('cancelled')}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export as default for dynamic imports
export default SessionCalendar;
