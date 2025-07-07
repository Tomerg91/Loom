'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Star,
  Clock,
  Target,
  Award,
  Activity,
  Download,
  RefreshCw
} from 'lucide-react';

interface CoachInsights {
  overview: {
    totalClients: number;
    activeClients: number;
    totalSessions: number;
    completedSessions: number;
    averageRating: number;
    revenue: number;
    clientRetentionRate: number;
    sessionCompletionRate: number;
  };
  clientProgress: Array<{
    clientId: string;
    clientName: string;
    progressScore: number;
    sessionsCompleted: number;
    goalAchievement: number;
    lastSession: string;
    trend: 'up' | 'down' | 'stable';
  }>;
  sessionMetrics: Array<{
    date: string;
    sessionsCompleted: number;
    sessionsCancelled: number;
    averageRating: number;
    revenue: number;
  }>;
  goalAnalysis: {
    mostCommonGoals: Array<{
      goal: string;
      count: number;
      successRate: number;
    }>;
    achievementRate: number;
    averageTimeToGoal: number;
  };
  feedback: Array<{
    clientName: string;
    rating: number;
    comment: string;
    date: string;
    sessionType: string;
  }>;
}

export function CoachInsightsPage() {
  const t = useTranslations('coach.insights');
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: insights, isLoading, error, refetch } = useQuery<CoachInsights>({
    queryKey: ['coach-insights', timeRange],
    queryFn: async () => {
      // Mock API call
      return {
        overview: {
          totalClients: 15,
          activeClients: 12,
          totalSessions: 125,
          completedSessions: 118,
          averageRating: 4.7,
          revenue: 8750,
          clientRetentionRate: 85,
          sessionCompletionRate: 94.4,
        },
        clientProgress: [
          {
            clientId: '1',
            clientName: 'Sarah Johnson',
            progressScore: 85,
            sessionsCompleted: 10,
            goalAchievement: 80,
            lastSession: '2024-01-18T14:00:00Z',
            trend: 'up',
          },
          {
            clientId: '2',
            clientName: 'Michael Chen',
            progressScore: 72,
            sessionsCompleted: 7,
            goalAchievement: 65,
            lastSession: '2024-01-17T15:30:00Z',
            trend: 'up',
          },
          {
            clientId: '3',
            clientName: 'Emily Rodriguez',
            progressScore: 45,
            sessionsCompleted: 3,
            goalAchievement: 30,
            lastSession: '2024-01-20T10:00:00Z',
            trend: 'stable',
          },
        ],
        sessionMetrics: [
          { date: '2024-01-01', sessionsCompleted: 8, sessionsCancelled: 1, averageRating: 4.6, revenue: 560 },
          { date: '2024-01-02', sessionsCompleted: 10, sessionsCancelled: 0, averageRating: 4.8, revenue: 700 },
          { date: '2024-01-03', sessionsCompleted: 6, sessionsCancelled: 2, averageRating: 4.5, revenue: 420 },
          { date: '2024-01-04', sessionsCompleted: 12, sessionsCancelled: 1, averageRating: 4.9, revenue: 840 },
          { date: '2024-01-05', sessionsCompleted: 9, sessionsCancelled: 0, averageRating: 4.7, revenue: 630 },
        ],
        goalAnalysis: {
          mostCommonGoals: [
            { goal: 'Career Development', count: 8, successRate: 75 },
            { goal: 'Leadership Skills', count: 6, successRate: 83 },
            { goal: 'Work-Life Balance', count: 5, successRate: 60 },
            { goal: 'Communication Skills', count: 4, successRate: 90 },
            { goal: 'Confidence Building', count: 3, successRate: 67 },
          ],
          achievementRate: 73,
          averageTimeToGoal: 8.5, // weeks
        },
        feedback: [
          {
            clientName: 'Sarah Johnson',
            rating: 5,
            comment: 'Excellent session! Really helped me understand my leadership potential.',
            date: '2024-01-18T14:00:00Z',
            sessionType: 'Leadership Coaching',
          },
          {
            clientName: 'Michael Chen',
            rating: 4,
            comment: 'Good insights on work-life balance. Looking forward to implementing the strategies.',
            date: '2024-01-17T15:30:00Z',
            sessionType: 'Life Coaching',
          },
          {
            clientName: 'Emily Rodriguez',
            rating: 5,
            comment: 'First session was amazing! Felt heard and supported.',
            date: '2024-01-20T10:00:00Z',
            sessionType: 'Initial Consultation',
          },
        ],
      };
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };


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
          <p className="text-destructive">Error loading insights</p>
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
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clients">Client Progress</TabsTrigger>
          <TabsTrigger value="goals">Goal Analysis</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{insights?.overview.totalClients}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">{insights?.overview.activeClients}</span> active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sessions Completed</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{insights?.overview.completedSessions}</div>
                <p className="text-xs text-muted-foreground">
                  {insights?.overview.sessionCompletionRate}% completion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{insights?.overview.averageRating}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+0.3</span> from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(insights?.overview.revenue || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+15%</span> from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Session Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Session Performance</CardTitle>
                <CardDescription>Sessions completed and ratings over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Chart visualization would go here</p>
                    <p className="text-xs text-muted-foreground">Integration with charting library needed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Daily revenue and session count</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Chart visualization would go here</p>
                    <p className="text-xs text-muted-foreground">Integration with charting library needed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Retention</CardTitle>
                <CardDescription>Client retention and engagement metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Retention Rate</span>
                    <span className="text-2xl font-bold">{insights?.overview.clientRetentionRate}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${insights?.overview.clientRetentionRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Above industry average of 75%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session Completion</CardTitle>
                <CardDescription>Session completion and cancellation rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Completion Rate</span>
                    <span className="text-2xl font-bold">{insights?.overview.sessionCompletionRate}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${insights?.overview.sessionCompletionRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Excellent completion rate
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          {/* Client Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Client Progress Overview</CardTitle>
              <CardDescription>Track your clients&apos; progress and achievements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights?.clientProgress.map((client) => (
                  <div key={client.clientId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getTrendIcon(client.trend)}
                        <div>
                          <p className="font-medium">{client.clientName}</p>
                          <p className="text-sm text-muted-foreground">
                            {client.sessionsCompleted} sessions completed
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="text-center">
                        <p className="font-medium">{client.progressScore}%</p>
                        <p className="text-muted-foreground">Progress</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{client.goalAchievement}%</p>
                        <p className="text-muted-foreground">Goals</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{new Date(client.lastSession).toLocaleDateString()}</p>
                        <p className="text-muted-foreground">Last Session</p>
                      </div>
                      <Badge variant={client.trend === 'up' ? 'default' : client.trend === 'down' ? 'destructive' : 'secondary'}>
                        {client.trend === 'up' ? 'Improving' : client.trend === 'down' ? 'Declining' : 'Stable'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          {/* Goal Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Most Common Goals</CardTitle>
                <CardDescription>Goals your clients are working towards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights?.goalAnalysis.mostCommonGoals.map((goal, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                          <span className="text-sm font-medium text-primary">{goal.count}</span>
                        </div>
                        <span className="font-medium">{goal.goal}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{goal.successRate}% success</span>
                        <Badge variant={goal.successRate >= 80 ? 'default' : goal.successRate >= 60 ? 'secondary' : 'outline'}>
                          {goal.successRate >= 80 ? 'High' : goal.successRate >= 60 ? 'Medium' : 'Low'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Goal Achievement Metrics</CardTitle>
                <CardDescription>Overall goal achievement statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Achievement Rate</span>
                    <span className="text-2xl font-bold">{insights?.goalAnalysis.achievementRate}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div 
                      className="bg-primary h-3 rounded-full"
                      style={{ width: `${insights?.goalAnalysis.achievementRate}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Average Time to Goal</span>
                  </div>
                  <span className="text-lg font-bold">{insights?.goalAnalysis.averageTimeToGoal} weeks</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <Award className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Goals Achieved</p>
                    <p className="text-xl font-bold">
                      {Math.round((insights?.goalAnalysis.achievementRate || 0) * (insights?.goalAnalysis.mostCommonGoals.reduce((sum, g) => sum + g.count, 0) || 0) / 100)}
                    </p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Active Goals</p>
                    <p className="text-xl font-bold">
                      {insights?.goalAnalysis.mostCommonGoals.reduce((sum, g) => sum + g.count, 0) || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6">
          {/* Recent Feedback */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Client Feedback</CardTitle>
              <CardDescription>Latest reviews and comments from your clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights?.feedback.map((feedback, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium">{feedback.clientName}</p>
                          <p className="text-sm text-muted-foreground">{feedback.sessionType}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < feedback.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(feedback.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <blockquote className="text-sm italic border-l-4 border-primary/20 pl-4">
                      &quot;{feedback.comment}&quot;
                    </blockquote>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}