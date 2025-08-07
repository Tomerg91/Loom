'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Save,
  AlertTriangle,
  Video,
  Phone,
  MapPin,
  X,
  Plus
} from 'lucide-react';
import { useUser } from '@/lib/store/auth-store';
import { SessionFileManager } from './session-file-manager';

interface Session {
  id: string;
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  sessionType: 'video' | 'phone' | 'in-person';
  location?: string;
  meetingUrl?: string;
  notes?: string;
  goals?: string[];
  coach: {
    id: string;
    firstName: string;
    lastName: string;
  };
  client: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface SessionEditPageProps {
  sessionId: string;
}

export function SessionEditPage({ sessionId }: SessionEditPageProps) {
  const router = useRouter();
  const user = useUser();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledAt: '',
    duration: 60,
    status: 'scheduled' as 'scheduled' | 'completed' | 'cancelled' | 'no-show',
    sessionType: 'video' as 'video' | 'phone' | 'in-person',
    location: '',
    meetingUrl: '',
    notes: '',
    goals: [] as string[],
  });
  
  const [newGoal, setNewGoal] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showRescheduleHelp, setShowRescheduleHelp] = useState(false);
  const [suggestedTimes, setSuggestedTimes] = useState<string[]>([]);

  // Fetch session data from API
  const { data: session, isLoading, error } = useQuery<Session>({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }

      const result = await response.json();
      return result.data;
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          scheduledAt: data.scheduledAt,
          duration: data.duration,
          status: data.status,
          sessionType: data.sessionType,
          location: data.location,
          meetingUrl: data.meetingUrl,
          notes: data.notes,
          goals: data.goals,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update session');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setHasChanges(false);
      router.push(`/sessions/${sessionId}`);
    },
    onError: (error) => {
      console.error('Failed to update session:', error);
    },
  });

  useEffect(() => {
    if (session) {
      setFormData({
        title: session.title,
        description: session.description || '',
        scheduledAt: session.scheduledAt.slice(0, 16), // Format for datetime-local input
        duration: session.duration,
        status: session.status,
        sessionType: session.sessionType,
        location: session.location || '',
        meetingUrl: session.meetingUrl || '',
        notes: session.notes || '',
        goals: session.goals || [],
      });
    }
  }, [session]);

  const handleInputChange = (field: keyof typeof formData, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const addGoal = () => {
    if (newGoal.trim()) {
      handleInputChange('goals', [...formData.goals, newGoal.trim()]);
      setNewGoal('');
    }
  };

  const removeGoal = (index: number) => {
    handleInputChange('goals', formData.goals.filter((_, i) => i !== index));
  };

  const handleDateTimeChange = (value: string) => {
    handleInputChange('scheduledAt', value);
    
    // Check for conflicts and suggest alternatives if date/time changed significantly
    if (session && value !== session.scheduledAt.slice(0, 16)) {
      setShowRescheduleHelp(true);
      // In a real app, this would call an API to check availability
      setSuggestedTimes([
        new Date(new Date(value).getTime() + 60*60*1000).toISOString().slice(0, 16),
        new Date(new Date(value).getTime() + 2*60*60*1000).toISOString().slice(0, 16),
        new Date(new Date(value).getTime() + 24*60*60*1000).toISOString().slice(0, 16),
      ]);
    } else {
      setShowRescheduleHelp(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSessionMutation.mutate(formData);
  };

  const canEdit = () => {
    if (!user || !session) return false;
    
    // Admin can edit any session
    if (user.role === 'admin') return true;
    
    // Coach can edit their own sessions
    if (user.role === 'coach' && user.id === session.coach.id) return true;
    
    // Clients can only edit future sessions they're part of
    if (user.role === 'client' && user.id === session.client.id) {
      return session.status === 'scheduled' && new Date(session.scheduledAt) > new Date();
    }
    
    return false;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The session you&apos;re trying to edit doesn&apos;t exist or you don&apos;t have permission to edit it.
            </p>
            <Button onClick={() => router.push('/sessions')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sessions
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!canEdit()) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don&apos;t have permission to edit this session.
            </p>
            <Button onClick={() => router.push(`/sessions/${sessionId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Session
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push(`/sessions/${sessionId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Session
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Session</h1>
            <p className="text-muted-foreground">
              Modify session details and settings
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-muted-foreground">
          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Session Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Session Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter session title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter session description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="scheduledAt">Date &amp; Time</Label>
                    <Input
                      id="scheduledAt"
                      type="datetime-local"
                      value={formData.scheduledAt}
                      onChange={(e) => handleDateTimeChange(e.target.value)}
                      required
                    />
                    {showRescheduleHelp && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800 mb-2">
                          <strong>Rescheduling detected.</strong> Here are some alternative times:
                        </p>
                        <div className="space-y-1">
                          {suggestedTimes.map((time, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                handleInputChange('scheduledAt', time);
                                setShowRescheduleHelp(false);
                              }}
                              className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {new Date(time).toLocaleString()}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowRescheduleHelp(false)}
                          className="text-xs text-blue-500 hover:text-blue-700 mt-2"
                        >
                          Hide suggestions
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Select 
                      value={formData.duration.toString()} 
                      onValueChange={(value) => handleInputChange('duration', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="90">90 minutes</SelectItem>
                        <SelectItem value="120">120 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">Session Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: 'scheduled' | 'completed' | 'cancelled' | 'no-show') => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no-show">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session Type &amp; Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sessionType">Session Type</Label>
                  <Select 
                    value={formData.sessionType} 
                    onValueChange={(value: 'video' | 'phone' | 'in-person') => handleInputChange('sessionType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">
                        <div className="flex items-center">
                          <Video className="mr-2 h-4 w-4" />
                          Video Call
                        </div>
                      </SelectItem>
                      <SelectItem value="phone">
                        <div className="flex items-center">
                          <Phone className="mr-2 h-4 w-4" />
                          Phone Call
                        </div>
                      </SelectItem>
                      <SelectItem value="in-person">
                        <div className="flex items-center">
                          <MapPin className="mr-2 h-4 w-4" />
                          In Person
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.sessionType === 'video' && (
                  <div>
                    <Label htmlFor="meetingUrl">Meeting URL</Label>
                    <Input
                      id="meetingUrl"
                      type="url"
                      value={formData.meetingUrl}
                      onChange={(e) => handleInputChange('meetingUrl', e.target.value)}
                      placeholder="https://meet.google.com/..."
                    />
                  </div>
                )}

                {formData.sessionType === 'in-person' && (
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="Enter meeting location"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Goals & Notes */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Session Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="Add a goal for this session"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGoal())}
                  />
                  <Button type="button" onClick={addGoal} variant="outline" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {formData.goals.map((goal, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{goal}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGoal(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {formData.goals.length === 0 && (
                  <p className="text-sm text-muted-foreground">No goals added yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Add notes for this session..."
                  rows={6}
                />
              </CardContent>
            </Card>

            {/* Participants Info */}
            <Card>
              <CardHeader>
                <CardTitle>Participants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="text-sm font-medium">
                      {session.coach.firstName} {session.coach.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">Coach</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="text-sm font-medium">
                      {session.client.firstName} {session.client.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">Client</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Files */}
            <SessionFileManager 
              sessionId={sessionId}
              sessionTitle={session.title}
              userRole={user?.role || 'client'}
              userId={user?.id || ''}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <span className="text-sm text-muted-foreground">
                You have unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push(`/sessions/${sessionId}`)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateSessionMutation.isPending || !hasChanges}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateSessionMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}