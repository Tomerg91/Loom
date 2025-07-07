'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');

  // Mock data - in real app, this would come from an API
  const { data: clients, isLoading, error } = useQuery<Client[]>({
    queryKey: ['coach-clients', searchTerm, statusFilter, sortBy],
    queryFn: async () => {
      // Mock API call
      return [
        {
          id: '1',
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah.johnson@example.com',
          phone: '+1-555-0123',
          status: 'active',
          joinedDate: '2024-01-15T10:00:00Z',
          lastSession: '2024-01-18T14:00:00Z',
          nextSession: '2024-01-22T14:00:00Z',
          totalSessions: 12,
          completedSessions: 10,
          averageRating: 4.8,
          goals: ['Career Development', 'Leadership Skills'],
          progress: { current: 75, target: 100 },
        },
        {
          id: '2',
          firstName: 'Michael',
          lastName: 'Chen',
          email: 'michael.chen@example.com',
          phone: '+1-555-0456',
          status: 'active',
          joinedDate: '2024-01-10T11:00:00Z',
          lastSession: '2024-01-17T15:30:00Z',
          nextSession: '2024-01-24T15:30:00Z',
          totalSessions: 8,
          completedSessions: 7,
          averageRating: 4.6,
          goals: ['Work-Life Balance', 'Stress Management'],
          progress: { current: 60, target: 100 },
        },
        {
          id: '3',
          firstName: 'Emily',
          lastName: 'Rodriguez',
          email: 'emily.rodriguez@example.com',
          status: 'pending',
          joinedDate: '2024-01-20T09:00:00Z',
          totalSessions: 1,
          completedSessions: 0,
          averageRating: 0,
          goals: ['Personal Growth', 'Confidence Building'],
          progress: { current: 5, target: 100 },
        },
      ];
    },
  });

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

  const filteredClients = clients?.filter(client => {
    const matchesSearch = 
      `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const sortedClients = filteredClients?.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      case 'joinedDate':
        return new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime();
      case 'lastSession':
        if (!a.lastSession && !b.lastSession) return 0;
        if (!a.lastSession) return 1;
        if (!b.lastSession) return -1;
        return new Date(b.lastSession).getTime() - new Date(a.lastSession).getTime();
      case 'progress':
        return b.progress.current - a.progress.current;
      default:
        return 0;
    }
  });

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
          <p className="text-destructive">Error loading clients</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('addClient')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
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
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
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
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
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
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="joinedDate">Joined Date</SelectItem>
                <SelectItem value="lastSession">Last Session</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedClients?.map((client) => (
          <Card key={client.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={client.avatarUrl} alt={`${client.firstName} ${client.lastName}`} />
                    <AvatarFallback>
                      {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{client.firstName} {client.lastName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{client.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusBadgeVariant(client.status)}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(client.status)}
                      <span>{client.status}</span>
                    </div>
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Calendar className="mr-2 h-4 w-4" />
                        Schedule Session
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Send Message
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileText className="mr-2 h-4 w-4" />
                        View Notes
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Email
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
                  <span className="text-sm font-medium">Progress</span>
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
                  <span className="text-sm font-medium mb-2 block">Goals</span>
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
                  <p className="text-muted-foreground">Total Sessions</p>
                  <p className="font-medium">{client.totalSessions}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Completed</p>
                  <p className="font-medium">{client.completedSessions}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Rating</p>
                  <p className="font-medium flex items-center">
                    <Star className="h-4 w-4 mr-1 text-yellow-500" />
                    {client.averageRating || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Joined</p>
                  <p className="font-medium">{new Date(client.joinedDate).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Session Dates */}
              <div className="border-t pt-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Last Session</p>
                    <p className="font-medium">
                      {client.lastSession ? new Date(client.lastSession).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Next Session</p>
                    <p className="font-medium">
                      {client.nextSession ? new Date(client.nextSession).toLocaleDateString() : 'Not scheduled'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button size="sm" className="flex-1">
                  <Video className="mr-2 h-4 w-4" />
                  Start Session
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Message
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}