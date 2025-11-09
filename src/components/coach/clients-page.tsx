'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Search,
  Calendar,
  MessageSquare,
  Clock,
  Star,
  MoreHorizontal,
  Mail,
  FileText,
  Video,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

import { apiGet } from '@/lib/api/client-api-request';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  status: 'active' | 'inactive' | 'pending';
  joinedDate: string;
  lastSession?: string;
  nextSession?: string;
  totalSessions: number;
  completedSessions: number;
  averageRating: number;
  notes?: string;
  goals?: string[];
  progress: {
    current: number;
    target: number;
  };
}

export function CoachClientsPage() {
  const t = useTranslations('coach.clients');
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch clients from API with server-side filtering
  const { data: clientsData, isLoading, error } = useQuery({
    queryKey: ['coach-clients', debouncedSearchTerm, statusFilter, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '50',
        search: debouncedSearchTerm,
        status: statusFilter,
        sortBy: sortBy
      });
      const result = await apiGet<{ data: any }>(`/api/coach/clients?${params}`);
      return result.data;
    },
  });

  // Transform API data to match component interface
  const clients: Client[] = clientsData?.map((client: any) => {
    const totalSessions = client.totalSessions ?? client.total_sessions ?? 0;
    const completedSessions = client.completedSessions ?? client.completed_sessions ?? 0;
    const rawProgress = client.progress ?? null;
    const progressCurrent = rawProgress?.current ?? completedSessions;
    const progressTarget = rawProgress?.target ?? Math.max(totalSessions, 1);
    const progressPercent = progressTarget > 0
      ? Math.min(Math.round((progressCurrent / progressTarget) * 100), 100)
      : 0;

    return {
      id: client.id,
      firstName: client.firstName ?? client.first_name ?? '',
      lastName: client.lastName ?? client.last_name ?? '',
      email: client.email,
      phone: client.phone || undefined,
      avatarUrl: client.avatar || client.avatarUrl || undefined,
      status: client.status,
      joinedDate: client.joinedDate || client.joined_date || new Date().toISOString(),
      lastSession: client.lastSession || client.last_session,
      nextSession: client.nextSession || client.next_session,
      totalSessions,
      completedSessions,
      averageRating: client.averageRating ?? client.average_rating ?? 0,
      goals: client.goals ?? [],
      progress: {
        current: progressPercent,
        target: 100,
      },
    };
  }) || [];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'inactive':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  // Since filtering and sorting is now done server-side, we can use the data directly
  const sortedClients = clients;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('description')}</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('description')}</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">{t('errors.loadingClients')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="coach-clients-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button data-testid="add-client-button">
          <Plus className="mr-2 h-4 w-4" />
          {t('addClient')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalClients')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.activeClients')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients?.filter(c => c.status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.totalSessions')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients?.reduce((sum, c) => sum + c.totalSessions, 0) || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.averageRating')}</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients?.length ? 
                (clients.reduce((sum, c) => sum + c.averageRating, 0) / clients.length).toFixed(1) :
                '0.0'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="client-search-input"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="status-filter">
                <SelectValue placeholder={t('filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
                <SelectItem value="active">{t('filters.active')}</SelectItem>
                <SelectItem value="inactive">{t('filters.inactive')}</SelectItem>
                <SelectItem value="pending">{t('filters.pending')}</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('sortBy')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">{t('sorting.name')}</SelectItem>
                <SelectItem value="joinedDate">{t('sorting.joinedDate')}</SelectItem>
                <SelectItem value="lastSession">{t('sorting.lastSession')}</SelectItem>
                <SelectItem value="progress">{t('sorting.progress')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedClients?.map((client) => (
          <Card 
            key={client.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer" 
            data-testid={`client-card-${client.id}`}
            onClick={() => router.push(`/coach/clients/${client.id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage 
                      src={client.avatarUrl} 
                      alt={`${client.firstName} ${client.lastName} profile picture`}
                    />
                    <AvatarFallback>
                      {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg" data-testid={`client-name-${client.id}`}>{client.firstName} {client.lastName}</CardTitle>
                    <p className="text-sm text-muted-foreground" data-testid={`client-email-${client.id}`}>{client.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusBadgeVariant(client.status)} data-testid={`client-status-${client.id}`}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(client.status)}
                      <span>{t(`status.${client.status}`)}</span>
                    </div>
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="h-8 w-8 p-0" 
                        data-testid={`client-menu-${client.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('actions.actions')}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => router.push(`/sessions/book?clientId=${client.id}`)}>
                        <Calendar className="mr-2 h-4 w-4" />
                        {t('actions.scheduleSession')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/messages?clientId=${client.id}`)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        {t('actions.sendMessage')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/coach/clients/${client.id}`)}>
                        <FileText className="mr-2 h-4 w-4" />
                        {t('actions.viewNotes')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => window.open(`mailto:${client.email}`)}>
                        <Mail className="mr-2 h-4 w-4" />
                        {t('actions.sendEmail')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t('info.progress')}</span>
                  <span className="text-sm text-muted-foreground">{client.progress.current}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${client.progress.current}%` }}
                  />
                </div>
              </div>

              {/* Goals */}
              {client.goals && client.goals.length > 0 && (
                <div>
                  <span className="text-sm font-medium mb-2 block">{t('info.goals')}</span>
                  <div className="flex flex-wrap gap-1">
                    {client.goals.map((goal, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {goal}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Session Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('info.totalSessions')}</p>
                  <p className="font-medium">{client.totalSessions}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('info.completed')}</p>
                  <p className="font-medium">{client.completedSessions}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('info.rating')}</p>
                  <p className="font-medium flex items-center">
                    <Star className="h-4 w-4 mr-1 text-yellow-500" />
                    {client.averageRating || t('info.notAvailable')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('info.joined')}</p>
                  <p className="font-medium">{new Date(client.joinedDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Session Dates */}
              <div className="border-t pt-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('info.lastSession')}</p>
                    <p className="font-medium">
                      {client.lastSession ? new Date(client.lastSession).toLocaleDateString() : t('info.never')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('info.nextSession')}</p>
                    <p className="font-medium">
                      {client.nextSession ? new Date(client.nextSession).toLocaleDateString() : t('info.notScheduled')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => router.push(`/sessions/book?clientId=${client.id}&type=instant`)}
                >
                  <Video className="mr-2 h-4 w-4" />
                  {t('actions.startSession')}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => router.push(`/messages?clientId=${client.id}`)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {t('actions.message')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}