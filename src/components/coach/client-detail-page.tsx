'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Clock, Edit, MessageSquare, Star, Video, FileText, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useState } from 'react';

import { apiGet } from '@/lib/api/client-api-request';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ClientDetailProps {
  clientId: string;
}

interface ClientDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'pending';
  joinedDate: string;
  totalSessions: number;
  completedSessions: number;
  averageRating: number;
  goals: string[];
  notes: string;
  sessions: Session[];
  progress: {
    current: number;
    target: number;
  };
}

interface Session {
  id: string;
  date: string;
  duration: number;
  status: 'completed' | 'scheduled' | 'cancelled';
  rating?: number;
  notes?: string;
  type: 'video' | 'in-person' | 'phone';
}

export function CoachClientDetailPage({ clientId }: ClientDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();
  const locale = useLocale();

  // Fetch client details from API
  const { data: client, isLoading, error } = useQuery<ClientDetail>({
    queryKey: ['client-detail', clientId],
    queryFn: async () => {
      const result = await apiGet<{ data: ClientDetail }>(`/api/coach/clients/${clientId}`);
      return result.data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Client</h3>
        <p className="text-red-600 mb-4">
          {error instanceof Error ? error.message : 'Failed to load client details'}
        </p>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Client not found</h3>
        <p className="text-gray-600">The requested client could not be found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="client-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            data-testid="back-button"
            onClick={() => router.push(`/${locale}/coach/clients`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
          <div className="border-l h-6"></div>
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={client.avatar} alt={`${client.firstName} ${client.lastName}`} />
              <AvatarFallback>
                {client.firstName.charAt(0)}{client.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold" data-testid="client-name">
                {client.firstName} {client.lastName}
              </h1>
              <p className="text-gray-600" data-testid="client-email">{client.email}</p>
            </div>
            <Badge className={getStatusColor(client.status)} data-testid="client-status">
              {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
            </Badge>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            data-testid="start-session-button"
            onClick={() => {
              router.push(`/${locale}/sessions/book?clientId=${clientId}&type=instant`);
            }}
          >
            <Video className="h-4 w-4 mr-2" />
            Start Session
          </Button>
          <Button 
            variant="outline" 
            data-testid="message-client-button"
            onClick={() => {
              router.push(`/${locale}/messages?clientId=${clientId}`);
            }}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Message
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" data-testid="client-actions-menu">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                data-testid="edit-client"
                onClick={() => {
                  router.push(`/${locale}/coach/clients/${clientId}/edit`);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Client
              </DropdownMenuItem>
              <DropdownMenuItem 
                data-testid="schedule-session"
                onClick={() => {
                  router.push(`/${locale}/sessions/book?clientId=${clientId}`);
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Session
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="view-reports">
                <FileText className="h-4 w-4 mr-2" />
                View Reports
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="total-sessions">{client.totalSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="completed-sessions">{client.completedSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center" data-testid="average-rating">
              <Star className="h-5 w-5 text-yellow-500 mr-1" />
              {client.averageRating}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="progress-percentage">{client.progress.current}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${client.progress.current}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList data-testid="client-tabs">
          <TabsTrigger value="overview" data-testid="overview-tab">Overview</TabsTrigger>
          <TabsTrigger value="sessions" data-testid="sessions-tab">Sessions</TabsTrigger>
          <TabsTrigger value="progress" data-testid="progress-tab">Progress</TabsTrigger>
          <TabsTrigger value="notes" data-testid="notes-tab">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p data-testid="client-info-email">{client.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p data-testid="client-info-phone">{client.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <p data-testid="client-info-status">{client.status}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Joined Date</label>
                    <p data-testid="client-info-joined">{formatDate(client.joinedDate)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Goals */}
            <Card>
              <CardHeader>
                <CardTitle>Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2" data-testid="client-goals">
                  {client.goals.map((goal, index) => (
                    <Badge key={index} variant="outline">
                      {goal}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Session History</h3>
            <Button data-testid="schedule-new-session">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule New Session
            </Button>
          </div>
          <div className="space-y-4">
            {client.sessions.map((session) => (
              <Card key={session.id} data-testid={`session-card-${session.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="font-medium" data-testid={`session-date-${session.id}`}>
                          {formatDate(session.date)} at {formatTime(session.date)}
                        </p>
                        <p className="text-sm text-gray-600" data-testid={`session-duration-${session.id}`}>
                          {session.duration} minutes • {session.type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {session.rating && (
                        <div className="flex items-center" data-testid={`session-rating-${session.id}`}>
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          {session.rating}
                        </div>
                      )}
                      <Badge className={getSessionStatusColor(session.status)} data-testid={`session-status-${session.id}`}>
                        {session.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`session-menu-${session.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem data-testid={`edit-session-${session.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Session
                          </DropdownMenuItem>
                          <DropdownMenuItem data-testid={`reschedule-session-${session.id}`}>
                            <Calendar className="h-4 w-4 mr-2" />
                            Reschedule
                          </DropdownMenuItem>
                          <DropdownMenuItem data-testid={`cancel-session-${session.id}`}>
                            <Clock className="h-4 w-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {session.notes && (
                    <p className="mt-2 text-sm text-gray-600" data-testid={`session-notes-${session.id}`}>
                      {session.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progress Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm text-gray-600" data-testid="progress-current">{client.progress.current}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${client.progress.current}%` }}
                      data-testid="progress-bar"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p data-testid="client-notes">{client.notes}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Export as default for dynamic imports
export default CoachClientDetailPage;
