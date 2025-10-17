'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/lib/auth/use-user';
import { useFilteredSessions } from '@/lib/queries/sessions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  User, 
  Video, 
  Phone,
  MapPin,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Download,
  Grid3X3,
  List,
  BarChart3,
  ChevronDown,
  X
} from 'lucide-react';
import { format, parseISO, subMonths, addMonths } from 'date-fns';
import type { 
  Session, 
  SessionStatus, 
  SessionType, 
  SessionFilters,
  SessionListOptions,
  SessionSortBy,
  SortOrder,
  ViewMode
} from '@/types';
import { SessionCard } from './session-card';
import { SessionCalendarView } from './session-calendar-view';
import { SessionTimelineView } from './session-timeline-view';

interface EnhancedSessionListProps {
  clientId?: string;
  coachId?: string;
  showFilters?: boolean;
  initialViewMode?: ViewMode;
  maxResults?: number;
}

export function EnhancedSessionList({
  clientId,
  coachId,
  showFilters = true,
  initialViewMode = 'list',
  maxResults = 50
}: EnhancedSessionListProps) {
  const t = useTranslations('session');
  const commonT = useTranslations('common');
  const user = useUser();
  
  // Use clientId from user if not provided
  const effectiveClientId = clientId || (user?.role === 'client' ? user.id : '');
  const effectiveCoachId = coachId || (user?.role === 'coach' ? user.id : '');

  // State
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [filters, setFilters] = useState<SessionFilters>({});
  const [sortBy, setSortBy] = useState<SessionSortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Build query options
  const queryOptions: SessionListOptions = useMemo(() => ({
    filters: {
      ...filters,
      search: searchQuery.trim() || undefined,
      dateRange: dateRange.from && dateRange.to ? {
        from: dateRange.from,
        to: dateRange.to
      } : undefined,
    },
    sortBy,
    sortOrder,
    page,
    limit: maxResults,
    viewMode,
  }), [filters, searchQuery, dateRange, sortBy, sortOrder, page, maxResults, viewMode]);

  // Fetch sessions
  const { 
    data: sessionsData, 
    isLoading, 
    error,
    refetch 
  } = useFilteredSessions(effectiveClientId, queryOptions);

  const sessions = sessionsData?.data || [];
  const pagination = sessionsData?.pagination;

  // Filter handlers
  const handleStatusFilter = (status: SessionStatus | 'all') => {
    if (status === 'all') {
      setFilters(prev => ({ ...prev, status: undefined }));
    } else {
      setFilters(prev => ({
        ...prev,
        status: prev.status?.includes(status) 
          ? prev.status.filter(s => s !== status)
          : [...(prev.status || []), status]
      }));
    }
  };

  const handleTypeFilter = (type: SessionType | 'all') => {
    if (type === 'all') {
      setFilters(prev => ({ ...prev, sessionType: undefined }));
    } else {
      setFilters(prev => ({
        ...prev,
        sessionType: prev.sessionType?.includes(type)
          ? prev.sessionType.filter(t => t !== type)
          : [...(prev.sessionType || []), type]
      }));
    }
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setDateRange({});
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('clientId', effectiveClientId);
      params.append('format', 'csv');
      
      if (filters.status?.length) {
        filters.status.forEach(status => params.append('status', status));
      }
      
      if (filters.dateRange) {
        params.append('dateFrom', filters.dateRange.from.toISOString());
        params.append('dateTo', filters.dateRange.to.toISOString());
      }
      
      const response = await fetch(`/api/sessions/export?${params}`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `sessions-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getStatusBadgeColor = (status: SessionStatus): string => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'in_progress':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'no_show':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSessionTypeIcon = (type?: SessionType) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'in-person':
        return <MapPin className="h-4 w-4" />;
      default:
        return <Video className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse" />
            <div className="h-10 bg-gray-200 rounded w-24 animate-pulse" />
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-gray-200 rounded w-full" />
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
          <p className="text-destructive mb-4">Failed to load sessions</p>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Sessions</h1>
          <p className="text-muted-foreground">
            {pagination?.total ? `${pagination.total} sessions found` : 'No sessions found'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="list" className="flex items-center gap-1 sm:gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-1 sm:gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Calendar</span>
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-1 sm:gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Timeline</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Export Button */}
          <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>

          {/* Filters Toggle */}
          {showFilters && (
            <Button 
              variant="outline" 
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && isFiltersOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Filters & Search
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search sessions..."
                    aria-label="Search sessions by title, coach, or notes"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <div className="flex flex-wrap gap-2">
                  {(['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'] as SessionStatus[]).map((status) => (
                    <Badge
                      key={status}
                      variant={filters.status?.includes(status) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handleStatusFilter(status)}
                    >
                      {t(status)}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Session Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Session Type</label>
                <div className="flex flex-wrap gap-2">
                  {(['video', 'phone', 'in-person'] as SessionType[]).map((type) => (
                    <Badge
                      key={type}
                      variant={filters.sessionType?.includes(type) ? 'default' : 'outline'}
                      className="cursor-pointer flex items-center gap-1"
                      onClick={() => handleTypeFilter(type)}
                    >
                      {getSessionTypeIcon(type)}
                      {t(type)}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {dateRange.from ? format(dateRange.from, 'MMM dd') : 'From'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {dateRange.to ? format(dateRange.to, 'MMM dd') : 'To'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Sort by:</label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SessionSortBy)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-2"
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content based on view mode */}
      {viewMode === 'calendar' && (
        <SessionCalendarView 
          sessions={sessions} 
          onSessionSelect={(session) => {
            // Handle session selection for calendar view
            console.log('Selected session:', session);
          }}
        />
      )}
      
      {viewMode === 'timeline' && (
        <SessionTimelineView sessions={sessions} />
      )}
      
      {viewMode === 'list' && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No sessions found</h3>
                <p className="text-muted-foreground mb-6">
                  {Object.keys(filters).length > 0 || searchQuery 
                    ? "Try adjusting your filters or search terms"
                    : "You haven't scheduled any sessions yet"
                  }
                </p>
                {(Object.keys(filters).length > 0 || searchQuery) && (
                  <Button onClick={clearFilters} variant="outline">
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {sessions.map((session: Session) => (
                <SessionCard key={session.id} session={session} />
              ))}

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 gap-4">
                  <div className="text-sm text-muted-foreground text-center sm:text-left">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} sessions
                  </div>
                  
                  <nav className="flex justify-center gap-2" aria-label="Session pagination">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasPrev}
                      onClick={() => setPage(page - 1)}
                      aria-label="Go to previous page"
                    >
                      {commonT('previous')}
                    </Button>
                    
                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, page - 2)) + i;
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === pagination.page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            aria-label={`Go to page ${pageNum}`}
                            aria-current={pageNum === pagination.page ? 'page' : undefined}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    {/* Mobile page indicator */}
                    <div className="sm:hidden flex items-center px-3 py-2 text-sm bg-muted rounded">
                      {pagination.page} of {pagination.totalPages}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasNext}
                      onClick={() => setPage(page + 1)}
                      aria-label="Go to next page"
                    >
                      {commonT('next')}
                    </Button>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
