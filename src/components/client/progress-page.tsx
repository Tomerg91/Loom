'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  TrendingUp,
  Target,
  Calendar,
  Star,
  Award,
  Activity,
  CheckCircle,
  Clock,
  BarChart3,
  BookOpen,
  MessageSquare,
  Download,
  RefreshCw,
  Plus
} from 'lucide-react';

interface ProgressData {
  overview: {
    totalSessions: number;
    completedSessions: number;
    upcomingSessions: number;
    totalGoals: number;
    completedGoals: number;
    overallProgress: number;
    streakDays: number;
    averageRating: number;
  };
  goals: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
    status: 'not_started' | 'in_progress' | 'completed' | 'paused';
    progress: number;
    targetDate: string;
    createdDate: string;
    milestones: Array<{
      id: string;
      title: string;
      completed: boolean;
      completedDate?: string;
    }>;
  }>;
  sessions: Array<{
    id: string;
    coachName: string;
    coachAvatar?: string;
    date: string;
    duration: number;
    topic: string;
    rating?: number;
    notes?: string;
    keyInsights: string[];
    actionItems: string[];
    status: 'completed' | 'upcoming' | 'cancelled';
  }>;
  insights: Array<{
    date: string;
    progressScore: number;
    mood: number;
    energy: number;
    confidence: number;
  }>;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    earnedDate: string;
    category: string;
    icon: string;
  }>;
}

export function ClientProgressPage() {
  const t = useTranslations('client.progress');
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: progress, isLoading, error, refetch } = useQuery<ProgressData>({
    queryKey: ['client-progress', timeRange],
    queryFn: async () => {
      // Mock API call
      return {
        overview: {
          totalSessions: 15,
          completedSessions: 12,
          upcomingSessions: 3,
          totalGoals: 5,
          completedGoals: 2,
          overallProgress: 68,
          streakDays: 14,
          averageRating: 4.7,
        },
        goals: [
          {
            id: '1',
            title: 'Improve Leadership Skills',
            description: 'Develop confident leadership presence and effective team management abilities',
            category: 'Professional Development',
            priority: 'high',
            status: 'in_progress',
            progress: 75,
            targetDate: '2024-03-15',
            createdDate: '2024-01-10',
            milestones: [
              { id: '1', title: 'Complete leadership assessment', completed: true, completedDate: '2024-01-15' },
              { id: '2', title: 'Practice active listening', completed: true, completedDate: '2024-01-25' },
              { id: '3', title: 'Lead team meeting', completed: false },
              { id: '4', title: 'Get 360 feedback', completed: false },
            ],
          },
          {
            id: '2',
            title: 'Work-Life Balance',
            description: 'Establish healthy boundaries and manage stress effectively',
            category: 'Personal Well-being',
            priority: 'high',
            status: 'in_progress',
            progress: 60,
            targetDate: '2024-02-28',
            createdDate: '2024-01-15',
            milestones: [
              { id: '1', title: 'Set daily boundaries', completed: true, completedDate: '2024-01-20' },
              { id: '2', title: 'Implement meditation routine', completed: false },
              { id: '3', title: 'Reduce overtime hours', completed: false },
            ],
          },
          {
            id: '3',
            title: 'Public Speaking Confidence',
            description: 'Overcome fear of public speaking and deliver presentations confidently',
            category: 'Communication',
            priority: 'medium',
            status: 'completed',
            progress: 100,
            targetDate: '2024-01-30',
            createdDate: '2024-01-05',
            milestones: [
              { id: '1', title: 'Join Toastmasters', completed: true, completedDate: '2024-01-10' },
              { id: '2', title: 'Give first speech', completed: true, completedDate: '2024-01-20' },
              { id: '3', title: 'Present at team meeting', completed: true, completedDate: '2024-01-28' },
            ],
          },
        ],
        sessions: [
          {
            id: '1',
            coachName: 'Sarah Johnson',
            date: '2024-01-18T14:00:00Z',
            duration: 60,
            topic: 'Leadership Development',
            rating: 5,
            notes: 'Great session on active listening techniques',
            keyInsights: ['Active listening builds trust', 'Ask open-ended questions', 'Paraphrase to confirm understanding'],
            actionItems: ['Practice active listening in next team meeting', 'Complete 360 feedback survey'],
            status: 'completed',
          },
          {
            id: '2',
            coachName: 'Sarah Johnson',
            date: '2024-01-15T14:00:00Z',
            duration: 60,
            topic: 'Goal Setting &amp; Planning',
            rating: 4,
            notes: 'Established clear goals and milestones',
            keyInsights: ['SMART goals are more achievable', 'Break down large goals into smaller steps'],
            actionItems: ['Define leadership goal milestones', 'Create weekly check-in routine'],
            status: 'completed',
          },
          {
            id: '3',
            coachName: 'Sarah Johnson',
            date: '2024-01-22T14:00:00Z',
            duration: 60,
            topic: 'Stress Management',
            status: 'upcoming',
            keyInsights: [],
            actionItems: [],
          },
        ],
        insights: [
          { date: '2024-01-01', progressScore: 45, mood: 6, energy: 7, confidence: 5 },
          { date: '2024-01-05', progressScore: 52, mood: 7, energy: 7, confidence: 6 },
          { date: '2024-01-10', progressScore: 58, mood: 7, energy: 8, confidence: 6 },
          { date: '2024-01-15', progressScore: 65, mood: 8, energy: 8, confidence: 7 },
          { date: '2024-01-20', progressScore: 68, mood: 8, energy: 7, confidence: 8 },
        ],
        achievements: [
          {
            id: '1',
            title: 'First Goal Completed',
            description: 'Successfully completed your first coaching goal',
            earnedDate: '2024-01-30',
            category: 'Milestone',
            icon: '🎯',
          },
          {
            id: '2',
            title: 'Consistency Champion',
            description: 'Attended 10 coaching sessions',
            earnedDate: '2024-01-25',
            category: 'Engagement',
            icon: '🏆',
          },
          {
            id: '3',
            title: 'Reflection Master',
            description: 'Completed 5 reflection exercises',
            earnedDate: '2024-01-20',
            category: 'Growth',
            icon: '📚',
          },
        ],
      };
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'not_started':
        return 'bg-gray-100 text-gray-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-gray-200 bg-gray-50';
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
          <p className="text-destructive">Error loading progress data</p>
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
              <SelectItem value="all">All time</SelectItem>
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
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{progress?.overview.overallProgress}%</div>
                <div className="w-full bg-secondary rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${progress?.overview.overallProgress}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sessions Completed</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{progress?.overview.completedSessions}</div>
                <p className="text-xs text-muted-foreground">
                  {progress?.overview.upcomingSessions} upcoming
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Goals Achieved</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {progress?.overview.completedGoals}/{progress?.overview.totalGoals}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((progress?.overview.completedGoals || 0) / (progress?.overview.totalGoals || 1) * 100)}% completion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{progress?.overview.streakDays}</div>
                <p className="text-xs text-muted-foreground">
                  days of consistent progress
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Progress Over Time</CardTitle>
              <CardDescription>Your growth journey and key metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Chart visualization would go here</p>
                  <p className="text-xs text-muted-foreground">Progress, mood, energy, and confidence trends</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest progress and achievements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progress?.sessions.slice(0, 3).map((session) => (
                  <div key={session.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">{session.topic}</p>
                      <p className="text-sm text-muted-foreground">
                        Session with {session.coachName} • {new Date(session.date).toLocaleDateString()}
                      </p>
                    </div>
                    {session.rating && (
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                        <span className="text-sm">{session.rating}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          {/* Goals Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Your Goals</h2>
              <p className="text-muted-foreground">Track your progress towards personal and professional growth</p>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New Goal
            </Button>
          </div>

          {/* Goals List */}
          <div className="space-y-4">
            {progress?.goals.map((goal) => (
              <Card key={goal.id} className={`border-l-4 ${getPriorityColor(goal.priority)}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{goal.title}</CardTitle>
                      <CardDescription>{goal.description}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(goal.status)}>
                        {goal.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">{goal.category}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-muted-foreground">{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Target Date */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Target Date:</span>
                    <span className="font-medium">{new Date(goal.targetDate).toLocaleDateString()}</span>
                  </div>

                  {/* Milestones */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Milestones</h4>
                    <div className="space-y-2">
                      {goal.milestones.map((milestone) => (
                        <div key={milestone.id} className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            milestone.completed ? 'bg-primary border-primary' : 'border-muted-foreground'
                          }`}>
                            {milestone.completed && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-sm ${milestone.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {milestone.title}
                          </span>
                          {milestone.completedDate && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(milestone.completedDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline">
                      <BookOpen className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                    <Button size="sm" variant="outline">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Discuss with Coach
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          {/* Sessions List */}
          <div className="space-y-4">
            {progress?.sessions.map((session) => (
              <Card key={session.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={session.coachAvatar} alt={session.coachName} />
                        <AvatarFallback>
                          {session.coachName.split(' ').map(n => n.charAt(0)).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{session.topic}</CardTitle>
                        <CardDescription>
                          with {session.coachName} • {new Date(session.date).toLocaleDateString()} • {session.duration} min
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={session.status === 'completed' ? 'default' : session.status === 'upcoming' ? 'secondary' : 'destructive'}>
                        {session.status}
                      </Badge>
                      {session.rating && (
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                          <span>{session.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {session.status === 'completed' && (
                  <CardContent className="space-y-4">
                    {session.notes && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Session Notes</h4>
                        <p className="text-sm text-muted-foreground">{session.notes}</p>
                      </div>
                    )}
                    
                    {session.keyInsights && session.keyInsights.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Key Insights</h4>
                        <ul className="space-y-1">
                          {session.keyInsights.map((insight, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start">
                              <span className="text-primary mr-2">•</span>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {session.actionItems && session.actionItems.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Action Items</h4>
                        <ul className="space-y-1">
                          {session.actionItems.map((item, index) => (
                            <li key={index} className="text-sm flex items-start">
                              <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          {/* Achievements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {progress?.achievements.map((achievement) => (
              <Card key={achievement.id} className="text-center">
                <CardHeader>
                  <div className="text-4xl mb-2">{achievement.icon}</div>
                  <CardTitle className="text-lg">{achievement.title}</CardTitle>
                  <CardDescription>{achievement.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{achievement.category}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(achievement.earnedDate).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Achievement Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Achievement Statistics</CardTitle>
              <CardDescription>Your milestone journey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{progress?.achievements.length}</p>
                  <p className="text-sm text-muted-foreground">Total Achievements</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{progress?.overview.streakDays}</p>
                  <p className="text-sm text-muted-foreground">Day Streak</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{progress?.overview.completedGoals}</p>
                  <p className="text-sm text-muted-foreground">Goals Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}