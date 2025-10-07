'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  Search,
  Filter,
  List,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import type { Session } from '@/types';

type FilterStatus = 'all' | 'scheduled' | 'completed' | 'cancelled' | 'in_progress';
type ViewMode = 'list' | 'calendar';

const statusIcons = {
  scheduled: Clock,
  in_progress: Loader2,
  completed: CheckCircle2,
  cancelled: XCircle,
  no_show: AlertCircle,
};

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-orange-100 text-orange-700',
};

export function SessionsListPage() {
  const t = useTranslations('client.sessions');
  const router = useRouter();
  const locale = useLocale();
  const withLocale = (path: string) => `/${locale}${path}`;

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch sessions
  const { data: sessionsData, isLoading, error, refetch } = useQuery({
    queryKey: ['client-sessions', filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      params.append('limit', '100');
      params.append('sortOrder', 'asc');

      const response = await fetch(`/api/sessions?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const result = await response.json();
      return result.data as Session[];
    },
  });

  // Filter sessions based on search query
  const filteredSessions = useMemo(() => {
    if (!sessionsData) return [];

    let filtered = sessionsData;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(session =>
        session.title?.toLowerCase().includes(query) ||
        session.description?.toLowerCase().includes(query) ||
        session.coach?.firstName?.toLowerCase().includes(query) ||
        session.coach?.lastName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [sessionsData, searchQuery]);

  // Get upcoming and past sessions
  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return filteredSessions
      .filter(s => new Date(s.scheduledAt) > now && s.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [filteredSessions]);

  const pastSessions = useMemo(() => {
    const now = new Date();
    return filteredSessions
      .filter(s => new Date(s.scheduledAt) <= now || s.status !== 'scheduled')
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  }, [filteredSessions]);

  // Group sessions by date for calendar view
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    filteredSessions.forEach(session => {
      const date = format(parseISO(session.scheduledAt), 'yyyy-MM-dd');
      if (!map.has(date)) {
        map.set(date, []);
      }
      map.get(date)?.push(session);
    });
    return map;
  }, [filteredSessions]);

  // Calendar data
  const calendarDays = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const handleSessionClick = (sessionId: string) => {
    router.push(withLocale(`/client/sessions/${sessionId}`));
  };

  const handleBookSession = () => {
    router.push(withLocale('/client/book'));
  };

  const getSessionTypeIcon = (type?: string) => {
    switch (type) {
      case 'video': return Video;
      case 'phone': return Phone;
      case 'in-person': return MapPin;
      default: return Video;
    }
  };

  const renderSessionCard = (session: Session) => {
    const StatusIcon = statusIcons[session.status];
    const TypeIcon = getSessionTypeIcon(session.sessionType);

    return (
      <Card
        key={session.id}
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => handleSessionClick(session.id)}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold">{session.title || 'Coaching Session'}</h3>
                <Badge className={statusColors[session.status]}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {session.status.replace('_', ' ')}
                </Badge>
              </div>
              {session.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {session.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session.coach?.avatarUrl} />
                <AvatarFallback>
                  {session.coach?.firstName?.[0]}{session.coach?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">
                {session.coach?.firstName} {session.coach?.lastName}
              </span>
            </div>

            <div className="flex items-center text-muted-foreground">
              <Calendar className="h-4 w-4 mr-1" />
              {format(parseISO(session.scheduledAt), 'MMM d, yyyy')}
            </div>

            <div className="flex items-center text-muted-foreground">
              <Clock className="h-4 w-4 mr-1" />
              {format(parseISO(session.scheduledAt), 'h:mm a')}
            </div>

            <div className="flex items-center text-muted-foreground">
              <TypeIcon className="h-4 w-4 mr-1" />
              {session.duration || session.durationMinutes} min
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCalendarView = () => {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{format(selectedDate, 'MMMM yyyy')}</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-semibold text-sm p-2">
                {day}
              </div>
            ))}

            {calendarDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const daySessions = sessionsByDate.get(dateKey) || [];
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={dateKey}
                  className={`min-h-24 p-2 border rounded-lg ${
                    isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
                  } ${!isSameMonth(day, selectedDate) ? 'opacity-50' : ''}`}
                >
                  <div className="text-sm font-medium mb-1">
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {daySessions.map(session => (
                      <div
                        key={session.id}
                        className={`text-xs p-1 rounded cursor-pointer ${statusColors[session.status]}`}
                        onClick={() => handleSessionClick(session.id)}
                      >
                        {format(parseISO(session.scheduledAt), 'h:mm a')}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center p-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold mb-2">Failed to Load Sessions</h3>
            <p className="text-muted-foreground mb-4">
              We couldn't load your sessions. Please try again.
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Sessions</h1>
          <p className="text-muted-foreground">
            Manage and view all your coaching sessions
          </p>
        </div>
        <Button onClick={handleBookSession}>
          <Plus className="h-4 w-4 mr-2" />
          Book New Session
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-r-none"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="rounded-l-none"
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Content */}
      {viewMode === 'calendar' ? (
        renderCalendarView()
      ) : (
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingSessions.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastSessions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingSessions.length > 0 ? (
              upcomingSessions.map(renderSessionCard)
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center p-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Upcoming Sessions</h3>
                  <p className="text-muted-foreground mb-4">
                    You don't have any upcoming sessions scheduled.
                  </p>
                  <Button onClick={handleBookSession}>
                    <Plus className="h-4 w-4 mr-2" />
                    Book a Session
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastSessions.length > 0 ? (
              pastSessions.map(renderSessionCard)
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center p-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Past Sessions</h3>
                  <p className="text-muted-foreground">
                    You haven't completed any sessions yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default SessionsListPage;
