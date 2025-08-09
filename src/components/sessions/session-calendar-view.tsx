'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, ChevronLeft, ChevronRight, Clock, User, Video, Phone, MapPin } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  parseISO, 
  addMonths,
  subMonths,
  getDay,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import type { Session, SessionStatus, SessionType } from '@/types';

interface SessionCalendarViewProps {
  sessions: Session[];
  onSessionSelect: (session: Session) => void;
}

export function SessionCalendarView({ sessions, onSessionSelect }: SessionCalendarViewProps) {
  const t = useTranslations('session');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Calculate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, Session[]> = {};
    
    sessions.forEach(session => {
      const dateKey = format(parseISO(session.scheduledAt), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });
    
    // Sort sessions within each day by time
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => 
        parseISO(a.scheduledAt).getTime() - parseISO(b.scheduledAt).getTime()
      );
    });
    
    return grouped;
  }, [sessions]);

  const getSessionsForDate = (date: Date): Session[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return sessionsByDate[dateKey] || [];
  };

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
      case 'no_show':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSessionTypeIcon = (type?: SessionType) => {
    switch (type) {
      case 'video':
        return <Video className="h-3 w-3" />;
      case 'phone':
        return <Phone className="h-3 w-3" />;
      case 'in-person':
        return <MapPin className="h-3 w-3" />;
      default:
        return <Video className="h-3 w-3" />;
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(current => 
      direction === 'prev' ? subMonths(current, 1) : addMonths(current, 1)
    );
    setSelectedDate(null);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const renderCalendarCell = (day: Date) => {
    const isCurrentMonth = isSameMonth(day, currentDate);
    const isSelected = selectedDate && isSameDay(day, selectedDate);
    const isToday = isSameDay(day, new Date());
    const sessionsForDay = getSessionsForDate(day);

    return (
      <div
        key={day.toISOString()}
        className={`
          min-h-[120px] p-2 border border-gray-200 cursor-pointer transition-colors
          ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
          ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
          ${isToday ? 'bg-yellow-50 border-yellow-300' : ''}
          hover:bg-gray-50
        `}
        onClick={() => handleDateClick(day)}
      >
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${isToday ? 'text-yellow-700' : ''}`}>
            {format(day, 'd')}
          </span>
          {sessionsForDay.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 bg-blue-500 rounded-full" />
              <span className="text-xs text-gray-500">
                {sessionsForDay.length}
              </span>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          {sessionsForDay.slice(0, 3).map((session) => (
            <div
              key={session.id}
              onClick={(e) => {
                e.stopPropagation();
                onSessionSelect(session);
              }}
              className={`
                text-xs p-1 rounded cursor-pointer hover:opacity-80
                ${getStatusColor(session.status)} text-white
                flex items-center gap-1 truncate
              `}
            >
              {getSessionTypeIcon(session.sessionType)}
              <span className="truncate">
                {format(parseISO(session.scheduledAt), 'HH:mm')}
              </span>
            </div>
          ))}
          {sessionsForDay.length > 3 && (
            <div className="text-xs text-gray-500 px-1">
              +{sessionsForDay.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  };

  const selectedDateSessions = selectedDate ? getSessionsForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-1">
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

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 bg-blue-500 rounded" />
            <span>Scheduled</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 bg-green-500 rounded" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 bg-gray-500 rounded" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 bg-red-500 rounded" />
            <span>Cancelled</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              {/* Week Headers */}
              <div className="grid grid-cols-7 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="p-3 text-center font-medium text-gray-500 border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Cells */}
              <div className="grid grid-cols-7">
                {calendarDays.map(renderCalendarCell)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Date Sessions */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select a Date'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                selectedDateSessions.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateSessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => onSessionSelect(session)}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getSessionTypeIcon(session.sessionType)}
                            <span className="font-medium text-sm">{session.title}</span>
                          </div>
                          <Badge className={`${getStatusColor(session.status).replace('bg-', 'bg-opacity-20 text-')} text-xs`}>
                            {t(session.status)}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(parseISO(session.scheduledAt), 'HH:mm')} - {session.duration}min
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={session.coach.avatarUrl} />
                              <AvatarFallback className="text-xs">
                                {session.coach.firstName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span>{session.coach.firstName} {session.coach.lastName}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No sessions scheduled</p>
                  </div>
                )
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click on a date to view sessions</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Summary */}
          {sessions.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">This Month</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Total Sessions:</span>
                  <Badge variant="secondary">{sessions.length}</Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span>Completed:</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {sessions.filter(s => s.status === 'completed').length}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span>Upcoming:</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {sessions.filter(s => s.status === 'scheduled').length}
                  </Badge>
                </div>
                
                {sessions.filter(s => s.status === 'cancelled').length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Cancelled:</span>
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      {sessions.filter(s => s.status === 'cancelled').length}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}