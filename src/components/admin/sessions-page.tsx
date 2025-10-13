'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  Eye
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useState } from 'react';

import { DashboardHeader, LoadingState, ErrorState } from '@/components/dashboard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';




interface Session {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
  coach: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
  client: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
  created_at: string;
}

interface SessionsData {
  sessions: Session[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function AdminSessionsPage() {
  const t = useTranslations('admin.sessions');
  const router = useRouter();
  const locale = useLocale();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'scheduled_at' | 'created_at'>('scheduled_at');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: sessionsData, isLoading, error, refetch } = useQuery<SessionsData>({
    queryKey: ['admin-sessions', statusFilter, page, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder,
      });

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/admin/sessions?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const result = await response.json();
      return result.data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'scheduled':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      case 'rescheduled':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'in_progress':
      case 'scheduled':
        return <Clock className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserName = (user: { first_name?: string; last_name?: string; email: string }) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.email;
  };

  const filteredSessions = sessionsData?.sessions.filter((session) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      session.title.toLowerCase().includes(searchLower) ||
      getUserName(session.coach).toLowerCase().includes(searchLower) ||
      getUserName(session.client).toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return <LoadingState title={t('title')} description={t('description')} />;
  }

  if (error) {
    return <ErrorState title={t('title')} description={t('description')} message="Error loading sessions" />;
  }

  // Calculate stats
  const totalSessions = sessionsData?.pagination.totalItems || 0;
  const completedSessions = sessionsData?.sessions.filter(s => s.status === 'completed').length || 0;
  const upcomingSessions = sessionsData?.sessions.filter(s => s.status === 'scheduled').length || 0;
  const cancelledSessions = sessionsData?.sessions.filter(s => s.status === 'cancelled').length || 0;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={t('title')}
        description={t('description')}
        showTimeRange={false}
        showExport={false}
      >
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </DashboardHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedSessions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingSessions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cancelledSessions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sessions, coaches, or clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="rescheduled">Rescheduled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled_at">Scheduled Date</SelectItem>
            <SelectItem value="created_at">Created Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            Showing {filteredSessions?.length || 0} of {totalSessions} sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSessions && filteredSessions.length > 0 ? (
              filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium truncate">{session.title}</h3>
                      <Badge variant={getStatusColor(session.status)} className="flex items-center gap-1">
                        {getStatusIcon(session.status)}
                        {session.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(session.scheduled_at)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Coach: {getUserName(session.coach)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Client: {getUserName(session.client)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {session.duration_minutes} minutes
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/${locale}/sessions/${session.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No sessions found</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {sessionsData && sessionsData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={!sessionsData.pagination.hasPreviousPage}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {sessionsData.pagination.page} of {sessionsData.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={!sessionsData.pagination.hasNextPage}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Export as default for dynamic imports
export default AdminSessionsPage;
