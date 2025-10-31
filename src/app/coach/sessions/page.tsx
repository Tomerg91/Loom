'use client';

import { format, startOfWeek, endOfWeek, isToday } from 'date-fns';
import {
  CalendarIcon,
  ClockIcon,
  FilterIcon,
  SearchIcon,
  PlayIcon,
  PauseIcon,
  CheckIcon,
  XIcon,
  MessageSquareIcon,
  FileTextIcon,
  TrendingUpIcon,
  DollarSignIcon,
  CalendarDaysIcon,
  MoreVerticalIcon,
  StarIcon,
  EyeIcon,
  EditIcon,
  PlusIcon,
  BarChart3Icon,
  TimerIcon,
  BookOpenIcon,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useCoachSessions, useCoachClients } from '@/hooks/useCoachSessions';
import { useUnifiedAuth } from '@/lib/auth/use-auth';
import { Session, SessionStatus, SessionType } from '@/types';


// Types
interface CoachClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  status: 'active' | 'inactive';
  totalSessions: number;
  completedSessions: number;
  averageRating: number;
  nextSession?: string;
  goals?: string[];
}

interface SessionTimer {
  sessionId: string;
  startTime: Date;
  elapsedTime: number;
  isRunning: boolean;
}

interface _SessionNote {
  id: string;
  sessionId: string;
  content: string;
  timestamp: Date;
  type: 'preparation' | 'during' | 'followup';
}

interface _SessionPreparation {
  sessionId: string;
  checklist: { item: string; completed: boolean }[];
  clientHistory: string;
  resourcesAttached: boolean;
  agendaCreated: boolean;
  progressReviewed: boolean;
}

interface _SessionOutcome {
  sessionId: string;
  summary: string;
  clientProgress: string;
  actionItems: string[];
  nextSessionGoals: string[];
  followupRequired: boolean;
}

export default function CoachSessionsPage() {
  const { user } = useUnifiedAuth();
  const { data: sessionsData = [], isLoading: sessionsLoading } = useCoachSessions(user?.id || '');
  const { data: clientsData = [], isLoading: clientsLoading } = useCoachClients(user?.id || '');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<CoachClient[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  // Sync API data with local state
  useEffect(() => {
    if (sessionsData && !sessionsLoading) {
      setSessions(sessionsData);
    }
  }, [sessionsData, sessionsLoading]);

  useEffect(() => {
    if (clientsData && !clientsLoading) {
      setClients(clientsData);
    }
  }, [clientsData, clientsLoading]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'all'>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<SessionType | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Session management
  const [_sessionTimers, setSessionTimers] = useState<Map<string, SessionTimer>>(new Map());

  // Dialog states
  const [preparationDialog, setPreparationDialog] = useState<string | null>(null);
  const [conductDialog, setConductDialog] = useState<string | null>(null);
  const [outcomeDialog, setOutcomeDialog] = useState<string | null>(null);
  const [notesDialog, setNotesDialog] = useState<string | null>(null);
  const [_showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [_showScheduleDialog, setShowScheduleDialog] = useState(false);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      if (searchQuery && !session.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !session.client.firstName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !session.client.lastName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && session.status !== statusFilter) {
        return false;
      }
      if (clientFilter !== 'all' && session.clientId !== clientFilter) {
        return false;
      }
      if (typeFilter !== 'all' && session.sessionType !== typeFilter) {
        return false;
      }
      if (dateRange?.from && dateRange?.to) {
        const sessionDate = new Date(session.scheduledAt);
        if (sessionDate < dateRange.from || sessionDate > dateRange.to) {
          return false;
        }
      }
      return true;
    });
  }, [sessions, searchQuery, statusFilter, clientFilter, typeFilter, dateRange]);

  // Session statistics
  const sessionStats = useMemo(() => {
    const today = new Date();
    const thisWeek = sessions.filter(s => {
      const date = new Date(s.scheduledAt);
      return date >= startOfWeek(today) && date <= endOfWeek(today);
    });
    
    return {
      total: sessions.length,
      today: sessions.filter(s => isToday(new Date(s.scheduledAt))).length,
      thisWeek: thisWeek.length,
      completed: sessions.filter(s => s.status === 'completed').length,
      scheduled: sessions.filter(s => s.status === 'scheduled').length,
      inProgress: sessions.filter(s => s.status === 'in_progress').length,
      cancelled: sessions.filter(s => s.status === 'cancelled').length,
      totalRevenue: sessions.filter(s => s.status === 'completed').length * 150, // Mock rate
      averageRating: sessions.filter(s => s.rating && s.rating > 0).reduce((acc, s) => acc + (s.rating || 0), 0) / sessions.filter(s => s.rating && s.rating > 0).length || 0
    };
  }, [sessions]);

  // Start session timer
  const startSessionTimer = (sessionId: string) => {
    setSessionTimers(prev => {
      const newTimers = new Map(prev);
      newTimers.set(sessionId, {
        sessionId,
        startTime: new Date(),
        elapsedTime: 0,
        isRunning: true
      });
      return newTimers;
    });
    
    // Update session status
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, status: 'in_progress' } : s
    ));
  };

  // Stop session timer
  const stopSessionTimer = (sessionId: string) => {
    setSessionTimers(prev => {
      const newTimers = new Map(prev);
      const timer = newTimers.get(sessionId);
      if (timer) {
        newTimers.set(sessionId, {
          ...timer,
          isRunning: false,
          elapsedTime: Date.now() - timer.startTime.getTime()
        });
      }
      return newTimers;
    });
  };

  // Complete session
  const completeSession = (sessionId: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, status: 'completed' } : s
    ));
    stopSessionTimer(sessionId);
  };

  // Bulk actions
  const handleBulkAction = (action: string) => {
    switch (action) {
      case 'complete':
        setSessions(prev => prev.map(s => 
          selectedSessions.includes(s.id) ? { ...s, status: 'completed' } : s
        ));
        break;
      case 'cancel':
        setSessions(prev => prev.map(s => 
          selectedSessions.includes(s.id) ? { ...s, status: 'cancelled' } : s
        ));
        break;
      case 'reschedule':
        // In real app, would open reschedule dialog
        console.log('Reschedule sessions:', selectedSessions);
        break;
    }
    setSelectedSessions([]);
  };

  const getStatusBadge = (status: SessionStatus) => {
    const statusConfig = {
      scheduled: { color: 'bg-blue-100 text-blue-800', label: 'Scheduled' },
      in_progress: { color: 'bg-green-100 text-green-800', label: 'In Progress' },
      completed: { color: 'bg-gray-100 text-gray-800', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      no_show: { color: 'bg-yellow-100 text-yellow-800', label: 'No Show' }
    };
    
    const config = statusConfig[status];
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getSessionTypeIcon = (type: SessionType | undefined) => {
    switch (type) {
      case 'video':
        return '📹';
      case 'phone':
        return '📞';
      case 'in-person':
        return '🏢';
      default:
        return '💬';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">My Sessions</h1>
          <p className="text-muted-foreground">
            Manage your coaching sessions, track progress, and analyze performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowNewSessionDialog(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Session
          </Button>
          <Button variant="outline" onClick={() => setShowScheduleDialog(true)}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Schedule
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Sessions</CardTitle>
            <CalendarDaysIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionStats.today}</div>
            <p className="text-xs text-muted-foreground">
              {sessionStats.scheduled} scheduled, {sessionStats.inProgress} in progress
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionStats.thisWeek}</div>
            <p className="text-xs text-muted-foreground">
              {sessionStats.completed} completed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${sessionStats.totalRevenue}</div>
            <p className="text-xs text-muted-foreground">
              From {sessionStats.completed} completed sessions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <StarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessionStats.averageRating ? sessionStats.averageRating.toFixed(1) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on client feedback
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">All Sessions</TabsTrigger>
          <TabsTrigger value="preparation">Preparation</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Today's Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CalendarDaysIcon className="h-5 w-5 mr-2" />
                  Today&apos;s Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sessions.filter(s => isToday(new Date(s.scheduledAt))).map(session => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={session.client.avatarUrl} />
                          <AvatarFallback>{session.client.firstName[0]}{session.client.lastName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{session.client.firstName} {session.client.lastName}</p>
                          <p className="text-sm text-muted-foreground">{format(new Date(session.scheduledAt), 'h:mm a')}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(session.status)}
                        <Button size="sm" variant="outline">
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {sessions.filter(s => isToday(new Date(s.scheduledAt))).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No sessions scheduled for today</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sessions
                    .filter(s => new Date(s.scheduledAt) > new Date() && !isToday(new Date(s.scheduledAt)))
                    .slice(0, 5)
                    .map(session => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={session.client.avatarUrl} />
                          <AvatarFallback>{session.client.firstName[0]}{session.client.lastName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{session.client.firstName} {session.client.lastName}</p>
                          <p className="text-sm text-muted-foreground">{format(new Date(session.scheduledAt), 'MMM d, h:mm a')}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setPreparationDialog(session.id)}>
                        <BookOpenIcon className="h-4 w-4 mr-2" />
                        Prepare
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Client Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUpIcon className="h-5 w-5 mr-2" />
                Client Progress Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {clients.map(client => (
                  <div key={client.id} className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={client.avatar} />
                        <AvatarFallback>{client.firstName[0]}{client.lastName[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{client.firstName} {client.lastName}</p>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round((client.completedSessions / client.totalSessions) * 100)}%</span>
                      </div>
                      <Progress value={(client.completedSessions / client.totalSessions) * 100} />
                      <div className="text-xs text-muted-foreground">
                        {client.completedSessions}/{client.totalSessions} sessions completed
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FilterIcon className="h-5 w-5 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="relative">
                  <SearchIcon className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sessions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as SessionStatus | 'all')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.firstName} {client.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as SessionType | 'all')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="in-person">In Person</SelectItem>
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from && dateRange?.to ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}` : 'Date Range'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Bulk Actions */}
              {selectedSessions.length > 0 && (
                <div className="flex items-center space-x-2 mt-4 p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium">{selectedSessions.length} sessions selected</span>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('complete')}>
                    <CheckIcon className="h-4 w-4 mr-1" />
                    Complete
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('cancel')}>
                    <XIcon className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('reschedule')}>
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Reschedule
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedSessions([])}>
                    Clear
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sessions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Sessions ({filteredSessions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedSessions.length === filteredSessions.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSessions(filteredSessions.map(s => s.id));
                          } else {
                            setSelectedSessions([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedSessions.includes(session.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSessions(prev => [...prev, session.id]);
                            } else {
                              setSelectedSessions(prev => prev.filter(id => id !== session.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={session.client.avatarUrl} />
                            <AvatarFallback>{session.client.firstName[0]}{session.client.lastName[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{session.client.firstName} {session.client.lastName}</p>
                            <p className="text-sm text-muted-foreground">{session.client.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{session.title}</p>
                          <p className="text-sm text-muted-foreground">{session.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{format(new Date(session.scheduledAt), 'MMM d, yyyy')}</p>
                          <p className="text-sm text-muted-foreground">{format(new Date(session.scheduledAt), 'h:mm a')}</p>
                        </div>
                      </TableCell>
                      <TableCell>{session.duration} min</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="mr-2">{getSessionTypeIcon(session.sessionType)}</span>
                          {session.sessionType || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(session.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {session.status === 'scheduled' && (
                            <Button size="sm" variant="outline" onClick={() => startSessionTimer(session.id)}>
                              <PlayIcon className="h-4 w-4" />
                            </Button>
                          )}
                          {session.status === 'in_progress' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setConductDialog(session.id)}>
                                <TimerIcon className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => completeSession(session.id)}>
                                <CheckIcon className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {session.status === 'completed' && (
                            <Button size="sm" variant="outline" onClick={() => setOutcomeDialog(session.id)}>
                              <FileTextIcon className="h-4 w-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVerticalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => setNotesDialog(session.id)}>
                                <MessageSquareIcon className="mr-2 h-4 w-4" />
                                Notes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setPreparationDialog(session.id)}>
                                <BookOpenIcon className="mr-2 h-4 w-4" />
                                Prepare
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <EditIcon className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredSessions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No sessions found matching your filters.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preparation Tab */}
        <TabsContent value="preparation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpenIcon className="h-5 w-5 mr-2" />
                Session Preparation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {sessions.filter(s => s.status === 'scheduled').map(session => (
                  <div key={session.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{session.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {session.client.firstName} {session.client.lastName} • {format(new Date(session.scheduledAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => setPreparationDialog(session.id)}>
                        Prepare
                      </Button>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <CheckIcon className="h-4 w-4 mr-2 text-green-500" />
                        Client history reviewed
                      </div>
                      <div className="flex items-center">
                        <XIcon className="h-4 w-4 mr-2 text-red-500" />
                        Session agenda created
                      </div>
                      <div className="flex items-center">
                        <CheckIcon className="h-4 w-4 mr-2 text-green-500" />
                        Resources attached
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Session Completion Rate</span>
                      <span>92%</span>
                    </div>
                    <Progress value={92} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Client Satisfaction</span>
                      <span>4.8/5</span>
                    </div>
                    <Progress value={96} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>On-Time Rate</span>
                      <span>98%</span>
                    </div>
                    <Progress value={98} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">This Month</span>
                    <span className="text-2xl font-bold">$2,400</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">This Week</span>
                    <span className="text-lg font-bold">$600</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average per Session</span>
                    <span className="text-lg font-bold">$150</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Client Engagement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {clients.map(client => (
                  <div key={client.id} className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar>
                        <AvatarImage src={client.avatar} />
                        <AvatarFallback>{client.firstName[0]}{client.lastName[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{client.firstName} {client.lastName}</p>
                        <p className="text-sm text-muted-foreground">{client.status}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Sessions</span>
                        <span>{client.totalSessions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Completion Rate</span>
                        <span>{Math.round((client.completedSessions / client.totalSessions) * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Rating</span>
                        <span>{client.averageRating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Session Preparation Dialog */}
      <Dialog open={!!preparationDialog} onOpenChange={() => setPreparationDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Session Preparation</DialogTitle>
          </DialogHeader>
          {preparationDialog && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-3">Pre-Session Checklist</h3>
                <div className="space-y-2">
                  {[
                    'Review client history and previous sessions',
                    'Check client goals and progress',
                    'Prepare session agenda',
                    'Gather relevant resources',
                    'Test technology (video/audio)',
                    'Review action items from last session'
                  ].map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox id={`prep-${index}`} />
                      <label htmlFor={`prep-${index}`} className="text-sm">{item}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Session Agenda</h3>
                <Textarea placeholder="Create your session agenda here..." rows={4} />
              </div>

              <div>
                <h3 className="font-medium mb-3">Client Notes</h3>
                <Textarea placeholder="Add any specific notes about this client..." rows={3} />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setPreparationDialog(null)}>Cancel</Button>
                <Button>Save Preparation</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Session Conduct Dialog */}
      <Dialog open={!!conductDialog} onOpenChange={() => setConductDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Session in Progress</DialogTitle>
          </DialogHeader>
          {conductDialog && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium">Session Timer</p>
                  <p className="text-sm text-muted-foreground">Track your session time for billing</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold">45:32</span>
                  <Button size="sm" variant="outline">
                    <PauseIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Session Notes</h3>
                <Textarea placeholder="Take notes during the session..." rows={6} />
              </div>

              <div>
                <h3 className="font-medium mb-3">Action Items</h3>
                <div className="space-y-2">
                  <Input placeholder="Add action item..." />
                  <Input placeholder="Add action item..." />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setConductDialog(null)}>Save & Continue</Button>
                <Button onClick={() => {
                  const sessionId = conductDialog;  // Capture value FIRST
                  completeSession(sessionId);
                  setConductDialog(null);
                  setOutcomeDialog(sessionId);  // Use captured value
                }}>Complete Session</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Session Outcome Dialog */}
      <Dialog open={!!outcomeDialog} onOpenChange={() => setOutcomeDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Session Summary</DialogTitle>
          </DialogHeader>
          {outcomeDialog && (
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-3">Session Summary</h3>
                <Textarea placeholder="Summarize what was accomplished in this session..." rows={4} />
              </div>

              <div>
                <h3 className="font-medium mb-3">Client Progress</h3>
                <Textarea placeholder="Note the client's progress and breakthroughs..." rows={3} />
              </div>

              <div>
                <h3 className="font-medium mb-3">Next Session Goals</h3>
                <div className="space-y-2">
                  <Input placeholder="Goal for next session..." />
                  <Input placeholder="Goal for next session..." />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="followup" />
                <label htmlFor="followup" className="text-sm">Schedule follow-up communication</label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setOutcomeDialog(null)}>Save Draft</Button>
                <Button>Complete & Send Summary</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={!!notesDialog} onOpenChange={() => setNotesDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Session Notes</DialogTitle>
          </DialogHeader>
          {notesDialog && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-3">All Notes</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium">Preparation Notes</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(), 'MMM d, h:mm a')}</span>
                    </div>
                    <p className="text-sm">Client wants to focus on career transition this session. Review previous action items.</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Add New Note</h3>
                <Textarea placeholder="Add a note..." rows={4} />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setNotesDialog(null)}>Cancel</Button>
                <Button>Save Note</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
