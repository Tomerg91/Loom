'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowLeft,
  Save,
  Video,
  Phone,
  MapPin,
  X,
  Plus,
  Search,
  Calendar
} from 'lucide-react';
import { useUser } from '@/lib/store/auth-store';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  role: 'admin' | 'coach' | 'client';
}

export function SessionCreatePage() {
  const t = useTranslations('sessions');
  const router = useRouter();
  const user = useUser();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledAt: '',
    duration: 60,
    sessionType: 'video' as 'video' | 'phone' | 'in-person',
    location: '',
    meetingUrl: '',
    notes: '',
    goals: [] as string[],
    coachId: user?.role === 'coach' ? user.id : '',
    clientId: user?.role === 'client' ? user.id : '',
  });
  
  const [newGoal, setNewGoal] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data - in real app, this would come from an API
  const { data: availableUsers } = useQuery<User[]>({
    queryKey: ['available-users', searchTerm],
    queryFn: async () => {
      // Mock API call - filter based on current user role
      const allUsers = [
        {
          id: '1',
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah@loom.com',
          role: 'coach' as const,
        },
        {
          id: '2',
          firstName: 'Michael',
          lastName: 'Chen',
          email: 'michael@loom.com',
          role: 'coach' as const,
        },
        {
          id: '3',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          role: 'client' as const,
        },
        {
          id: '4',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          role: 'client' as const,
        },
      ];

      // Filter based on user role and search term
      let filteredUsers = allUsers;
      
      if (user?.role === 'coach') {
        // Coaches can create sessions with their clients
        filteredUsers = allUsers.filter(u => u.role === 'client');
      } else if (user?.role === 'client') {
        // Clients can create sessions with coaches
        filteredUsers = allUsers.filter(u => u.role === 'coach');
      }

      if (searchTerm) {
        filteredUsers = filteredUsers.filter(u => 
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return filteredUsers;
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Mock API call
      console.log('Creating session:', data);
      return { id: 'new-session-id', success: true };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      router.push(`/sessions/${response.id}`);
    },
  });

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.coachId || !formData.clientId) {
      alert('Please select both a coach and a client');
      return;
    }

    createSessionMutation.mutate(formData);
  };

  const selectUser = (selectedUser: User) => {
    if (selectedUser.role === 'coach') {
      handleInputChange('coachId', selectedUser.id);
    } else if (selectedUser.role === 'client') {
      handleInputChange('clientId', selectedUser.id);
    }
    setSearchTerm('');
  };

  const getSelectedUser = (userId: string) => {
    return availableUsers?.find(u => u.id === userId);
  };

  // Set default date/time to next hour
  const getDefaultDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    now.setSeconds(0);
    return now.toISOString().slice(0, 16);
  };

  if (!formData.scheduledAt && typeof window !== 'undefined') {
    setFormData(prev => ({ ...prev, scheduledAt: getDefaultDateTime() }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/sessions')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sessions
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Session</h1>
            <p className="text-muted-foreground">
              Schedule a coaching session
            </p>
          </div>
        </div>
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
                    <Label htmlFor="scheduledAt">Date & Time</Label>
                    <Input
                      id="scheduledAt"
                      type="datetime-local"
                      value={formData.scheduledAt}
                      onChange={(e) => handleInputChange('scheduledAt', e.target.value)}
                      required
                    />
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session Type & Location</CardTitle>
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

          {/* Participants & Goals */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Participants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Coach Selection */}
                {user?.role !== 'coach' && (
                  <div>
                    <Label>Coach</Label>
                    {formData.coachId ? (
                      <div className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={getSelectedUser(formData.coachId)?.avatarUrl} />
                            <AvatarFallback>
                              {getSelectedUser(formData.coachId)?.firstName.charAt(0)}
                              {getSelectedUser(formData.coachId)?.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {getSelectedUser(formData.coachId)?.firstName} {getSelectedUser(formData.coachId)?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getSelectedUser(formData.coachId)?.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInputChange('coachId', '')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search for a coach..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        {searchTerm && availableUsers && (
                          <div className="border rounded-md max-h-32 overflow-y-auto">
                            {availableUsers
                              .filter(u => u.role === 'coach')
                              .map((coach) => (
                                <button
                                  key={coach.id}
                                  type="button"
                                  className="w-full flex items-center space-x-2 p-2 hover:bg-muted text-left"
                                  onClick={() => selectUser(coach)}
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={coach.avatarUrl} />
                                    <AvatarFallback>
                                      {coach.firstName.charAt(0)}{coach.lastName.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">
                                      {coach.firstName} {coach.lastName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {coach.email}
                                    </p>
                                  </div>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Client Selection */}
                {user?.role !== 'client' && (
                  <div>
                    <Label>Client</Label>
                    {formData.clientId ? (
                      <div className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={getSelectedUser(formData.clientId)?.avatarUrl} />
                            <AvatarFallback>
                              {getSelectedUser(formData.clientId)?.firstName.charAt(0)}
                              {getSelectedUser(formData.clientId)?.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {getSelectedUser(formData.clientId)?.firstName} {getSelectedUser(formData.clientId)?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getSelectedUser(formData.clientId)?.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInputChange('clientId', '')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search for a client..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        {searchTerm && availableUsers && (
                          <div className="border rounded-md max-h-32 overflow-y-auto">
                            {availableUsers
                              .filter(u => u.role === 'client')
                              .map((client) => (
                                <button
                                  key={client.id}
                                  type="button"
                                  className="w-full flex items-center space-x-2 p-2 hover:bg-muted text-left"
                                  onClick={() => selectUser(client)}
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={client.avatarUrl} />
                                    <AvatarFallback>
                                      {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">
                                      {client.firstName} {client.lastName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {client.email}
                                    </p>
                                  </div>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Show current user if they're a participant */}
                {user && (user.role === 'coach' || user.role === 'client') && (
                  <div>
                    <Label>
                      {user.role === 'coach' ? 'Coach' : 'Client'} (You)
                    </Label>
                    <div className="flex items-center space-x-2 p-2 border rounded bg-muted/50">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>
                          {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Add any additional notes for this session..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-2 pt-6 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push('/sessions')}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createSessionMutation.isPending || !formData.coachId || !formData.clientId}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {createSessionMutation.isPending ? 'Creating...' : 'Create Session'}
          </Button>
        </div>
      </form>
    </div>
  );
}