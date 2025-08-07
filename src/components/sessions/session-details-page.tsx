'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/lib/store/auth-store';
import { SessionCancellationDialog } from './session-cancellation-dialog';
import { SessionHeader } from './display/session-header';
import { SessionInfo } from './display/session-info';
import { SessionGoalsDisplay } from './display/session-goals-display';
import { SessionNotesDisplay } from './display/session-notes-display';
import { SessionActionItems } from './display/session-action-items';
import { SessionParticipants } from './display/session-participants';
import { SessionRating } from './display/session-rating';
import { SessionActions } from './display/session-actions';
import { SessionDialogs } from './display/session-dialogs';
import { SessionFileManager } from './session-file-manager';
import { Session } from '@/types';

interface SessionDetailsPageProps {
  sessionId: string;
}

export function SessionDetailsPage({ sessionId }: SessionDetailsPageProps) {
  const router = useRouter();
  const user = useUser();
  const queryClient = useQueryClient();
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);

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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch session');
      }

      const data = await response.json();
      return data.data; // API returns { success: true, data: session }
    },
  });

  const completeSessionMutation = useMutation({
    mutationFn: async (data: { notes: string; rating: number }) => {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
          notes: data.notes,
          rating: data.rating,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete session');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      setIsCompleteDialogOpen(false);
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete session');
      }

      return response.json();
    },
    onSuccess: () => {
      router.push('/sessions');
    },
  });

  const handleBack = () => {
    router.push('/sessions');
  };

  const handleEdit = () => {
    router.push(`/sessions/${sessionId}/edit`);
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
              The session you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
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

  return (
    <div className="space-y-6">
      <SessionHeader 
        session={session} 
        currentUser={user} 
        onBack={handleBack} 
        onEdit={handleEdit} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <SessionInfo session={session} />
          <SessionGoalsDisplay goals={session.goals} />
          <SessionNotesDisplay notes={session.notes} />
          <SessionActionItems actionItems={session.actionItems} />
          <SessionFileManager 
            sessionId={sessionId}
            sessionTitle={session.title}
            userRole={user?.role || 'client'}
            userId={user?.id || ''}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <SessionParticipants session={session} />
          <SessionRating rating={session.rating} feedback={session.feedback} />
          <SessionActions
            session={session}
            currentUser={user}
            onComplete={() => setIsCompleteDialogOpen(true)}
            onCancel={() => setIsCancelDialogOpen(true)}
            onDelete={() => setIsDeleteDialogOpen(true)}
          />
        </div>
      </div>

      {/* Cancel Session Dialog */}
      <SessionCancellationDialog
        session={session}
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onSuccess={() => {
          router.push('/sessions');
        }}
      />

      <SessionDialogs
        isCompleteDialogOpen={isCompleteDialogOpen}
        isDeleteDialogOpen={isDeleteDialogOpen}
        isLoading={completeSessionMutation.isPending || deleteSessionMutation.isPending}
        onCompleteDialogClose={() => setIsCompleteDialogOpen(false)}
        onDeleteDialogClose={() => setIsDeleteDialogOpen(false)}
        onComplete={(data) => completeSessionMutation.mutate(data)}
        onDelete={() => deleteSessionMutation.mutate()}
      />
    </div>
  );
}