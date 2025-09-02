'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/lib/store/auth-store';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LazySessionBooking, LazySessionList, LazySessionCalendar } from '@/components/lazy-components';
import { Calendar, List, Plus, Clock, Users, CheckCircle } from 'lucide-react';
import type { Session } from '@/types';

interface SessionsPageClientProps {
  locale: string;
}

export function SessionsPageClient({ locale }: SessionsPageClientProps) {
  const t = useTranslations('session');
  const dashboardT = useTranslations('dashboard');
  const user = useUser();
  
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState('list');

  const handleBookingSuccess = () => {
    setBookingDialogOpen(false);
  };

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
    // Could open a session details dialog here
  };

  const getPageTitle = () => {
    if (user?.role === 'coach') {
      return t('manageSessions');
    }
    return t('sessions');
  };

  const getPageDescription = () => {
    if (user?.role === 'coach') {
      return t('manageSessionsDescription');
    }
    return t('viewAndBookSessions');
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="border-b bg-card/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title text-foreground">
                {getPageTitle()}
              </h1>
              <p className="page-subtitle mt-1">
                {getPageDescription()}
              </p>
            </div>
            
            {user?.role === 'client' && (
              <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="book-session-button">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('bookSession')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t('bookNewSession')}</DialogTitle>
                    <DialogDescription>
                      {t('selectCoachAndTimeSlot')}
                    </DialogDescription>
                  </DialogHeader>
                  <LazySessionBooking onSuccess={handleBookingSuccess} />
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="premium-divider mt-4" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats for Coaches */}
        {user?.role === 'coach' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {dashboardT('stats.upcomingSessions')}
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardT('stats.thisWeek')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {dashboardT('stats.activeClients')}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardT('stats.total')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {dashboardT('stats.completedSessions')}
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">45</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardT('stats.thisMonth')}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sessions View Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              {t('listView')}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('calendarView')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            <LazySessionList 
              showFilters={true}
              limit={20}
              coachId={user?.role === 'coach' ? user.id : undefined}
              clientId={user?.role === 'client' ? user.id : undefined}
            />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <LazySessionCalendar
              coachId={user?.role === 'coach' ? user.id : undefined}
              clientId={user?.role === 'client' ? user.id : undefined}
              onSessionClick={handleSessionClick}
            />
          </TabsContent>
        </Tabs>

        {/* Session Details Dialog */}
        {selectedSession && (
          <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedSession.title}</DialogTitle>
                <DialogDescription>
                  {selectedSession.description}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>{t('date')}:</strong>
                    <br />
                    {new Date(selectedSession.scheduledAt).toLocaleDateString(locale)}
                  </div>
                  <div>
                    <strong>{t('time')}:</strong>
                    <br />
                    {new Date(selectedSession.scheduledAt).toLocaleTimeString(locale, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div>
                    <strong>{t('duration')}:</strong>
                    <br />
                    {selectedSession.duration} {t('minutes')}
                  </div>
                  <div>
                    <strong>{t('status')}:</strong>
                    <br />
                    {t(selectedSession.status)}
                  </div>
                </div>

                {user?.role === 'client' && (
                  <div>
                    <strong>{t('coach')}:</strong>
                    <br />
                    {selectedSession.coach.firstName} {selectedSession.coach.lastName}
                  </div>
                )}

                {user?.role === 'coach' && (
                  <div>
                    <strong>{t('client')}:</strong>
                    <br />
                    {selectedSession.client.firstName} {selectedSession.client.lastName}
                  </div>
                )}

                {selectedSession.notes && (
                  <div>
                    <strong>{t('notes')}:</strong>
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      {selectedSession.notes}
                    </div>
                  </div>
                )}

                {selectedSession.meetingUrl && selectedSession.status === 'scheduled' && (
                  <div className="pt-4">
                    <Button asChild className="w-full">
                      <a 
                        href={selectedSession.meetingUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        {t('joinSession')}
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}
