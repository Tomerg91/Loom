'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useUser } from '@/lib/store/auth-store';
import { SessionInformationForm } from './forms/session-information-form';
import { SessionTypeSelector } from './forms/session-type-selector';
import { ParticipantSelector } from './forms/participant-selector';
import { SessionGoalsManager } from './forms/session-goals-manager';
import { SessionNotesEditor } from './forms/session-notes-editor';
import { SessionFormActions } from './forms/session-form-actions';
import { User, SessionFormData, SessionFormField } from './shared/types';

export function SessionCreatePage() {
  const router = useRouter();
  const user = useUser();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<SessionFormData>({
    title: '',
    description: '',
    scheduledAt: '',
    duration: 60,
    sessionType: 'video',
    location: '',
    meetingUrl: '',
    notes: '',
    goals: [],
    coachId: user?.role === 'coach' ? user.id : '',
    clientId: user?.role === 'client' ? user.id : '',
  });

  // Mock data - in real app, this would come from an API
  const { data: availableUsers } = useQuery<User[]>({
    queryKey: ['available-users'],
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

      // Filter based on user role
      let filteredUsers = allUsers;
      
      if (user?.role === 'coach') {
        // Coaches can create sessions with their clients
        filteredUsers = allUsers.filter(u => u.role === 'client');
      } else if (user?.role === 'client') {
        // Clients can create sessions with coaches
        filteredUsers = allUsers.filter(u => u.role === 'coach');
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

  const handleFieldChange = (field: SessionFormField, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.coachId || !formData.clientId) {
      alert('Please select both a coach and a client');
      return;
    }

    createSessionMutation.mutate(formData);
  };

  const handleCancel = () => {
    router.push('/sessions');
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
            <SessionInformationForm 
              formData={formData} 
              onFieldChange={handleFieldChange} 
            />
            <SessionTypeSelector 
              formData={formData} 
              onFieldChange={handleFieldChange} 
            />
          </div>

          {/* Participants & Goals */}
          <div className="space-y-6">
            <ParticipantSelector 
              formData={formData} 
              onFieldChange={handleFieldChange}
              availableUsers={availableUsers}
              currentUser={user}
            />
            <SessionGoalsManager 
              formData={formData} 
              onFieldChange={handleFieldChange} 
            />
            <SessionNotesEditor 
              formData={formData} 
              onFieldChange={handleFieldChange} 
            />
          </div>
        </div>

        <SessionFormActions
          formData={formData}
          isLoading={createSessionMutation.isPending}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      </form>
    </div>
  );
}