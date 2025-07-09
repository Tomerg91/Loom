'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SessionCancellationDialog } from './session-cancellation-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Calendar,
  Clock,
  MapPin,
  Video,
  Phone,
  Edit,
  Trash2,
  MessageSquare,
  Star,
  AlertTriangle,
  CheckCircle,
  X,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { useUser } from '@/lib/store/auth-store';

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
  coach: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    email: string;
  };
  client: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    email: string;
  };
  rating?: number;
  feedback?: string;
  actionItems?: string[];
  goals?: string[];
  createdAt: string;
  updatedAt: string;
}

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
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionRating, setSessionRating] = useState(0);

  // Mock data - in real app, this would come from an API
  const { data: session, isLoading, error } = useQuery<Session>({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      // Mock API call
      return {
        id: sessionId,
        title: 'Leadership Development Session',
        description: 'Focus on building leadership presence and communication skills',
        scheduledAt: '2024-01-25T14:00:00Z',
        duration: 60,
        status: 'scheduled',
        sessionType: 'video',
        meetingUrl: 'https://meet.google.com/abc-def-ghi',
        notes: 'Client wants to focus on public speaking anxiety and team leadership skills.',
        coach: {
          id: '1',
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah@loom.com',
          avatarUrl: undefined,
        },
        client: {
          id: '2',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          avatarUrl: undefined,
        },
        goals: ['Improve public speaking', 'Develop leadership presence', 'Build team communication'],
        actionItems: ['Practice daily affirmations', 'Join Toastmasters', 'Lead next team meeting'],
        createdAt: '2024-01-20T10:00:00Z',
        updatedAt: '2024-01-20T10:00:00Z',
      };
    },
  });


  const completeSessionMutation = useMutation({
    mutationFn: async (data: { notes: string; rating: number }) => {
      // Mock API call
      console.log('Completing session:', sessionId, data);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      setIsCompleteDialogOpen(false);
      setSessionNotes('');
      setSessionRating(0);
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async () => {
      // Mock API call
      console.log('Deleting session:', sessionId);
      return { success: true };
    },
    onSuccess: () => {
      router.push('/sessions');
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no-show':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'in-person':
        return <MapPin className="h-4 w-4" />;
      default:
        return <Video className="h-4 w-4" />;
    }
  };

  const canEdit = () => {
    if (!user || !session) return false;
    
    // Coach or admin can edit their sessions
    if (user.role === 'admin') return true;
    if (user.role === 'coach' && user.id === session.coach.id) return true;
    
    // Clients can only reschedule future sessions
    if (user.role === 'client' && user.id === session.client.id) {
      return session.status === 'scheduled' && new Date(session.scheduledAt) > new Date();
    }
    
    return false;
  };

  const canCancel = () => {
    if (!user || !session) return false;
    return session.status === 'scheduled' && 
           (user.id === session.coach.id || user.id === session.client.id || user.role === 'admin');
  };

  const canComplete = () => {
    if (!user || !session) return false;
    return session.status === 'scheduled' && 
           user.role === 'coach' && 
           user.id === session.coach.id;
  };

  const canDelete = () => {
    if (!user || !session) return false;
    return user.role === 'admin' || 
           (user.role === 'coach' && user.id === session.coach.id);
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
            <h1 className="text-3xl font-bold">{session.title}</h1>
            <p className="text-muted-foreground">{session.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(session.status)}>
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </Badge>
          {canEdit() && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push(`/sessions/${sessionId}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Session Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Session Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date &amp; Time</Label>
                  <p className="text-sm">
                    {new Date(session.scheduledAt).toLocaleDateString()} at{' '}
                    {new Date(session.scheduledAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Duration</Label>
                  <p className="text-sm flex items-center">
                    <Clock className="mr-1 h-4 w-4" />
                    {session.duration} minutes
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Session Type</Label>
                  <p className="text-sm flex items-center">
                    {getSessionTypeIcon(session.sessionType)}
                    <span className="ml-1 capitalize">{session.sessionType.replace('-', ' ')}</span>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge className={getStatusColor(session.status)}>
                    {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                  </Badge>
                </div>
              </div>

              {session.meetingUrl && session.status === 'scheduled' && (
                <div className="pt-4 border-t">
                  <Button asChild className="w-full">
                    <a 
                      href={session.meetingUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Video className="mr-2 h-4 w-4" />
                      Join Session
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Goals */}
          {session.goals && session.goals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Session Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {session.goals.map((goal, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-primary" />
                      <span className="text-sm">{goal}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {session.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Session Notes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Action Items */}
          {session.actionItems && session.actionItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {session.actionItems.map((item, index) => (
                    <li key={index} className="flex items-start">
                      <div className="w-4 h-4 mr-2 mt-0.5 border-2 border-muted-foreground rounded-sm"></div>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Participants */}
          <Card>
            <CardHeader>
              <CardTitle>Participants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Coach */}
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={session.coach.avatarUrl} 
                    alt={`${session.coach.firstName} ${session.coach.lastName} - Coach`} 
                  />
                  <AvatarFallback>
                    {session.coach.firstName.charAt(0)}{session.coach.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {session.coach.firstName} {session.coach.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">Coach</p>
                </div>
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>

              {/* Client */}
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={session.client.avatarUrl} 
                    alt={`${session.client.firstName} ${session.client.lastName} - Client`} 
                  />
                  <AvatarFallback>
                    {session.client.firstName.charAt(0)}{session.client.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {session.client.firstName} {session.client.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">Client</p>
                </div>
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rating & Feedback */}
          {session.rating && (
            <Card>
              <CardHeader>
                <CardTitle>Session Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < session.rating! ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm font-medium">{session.rating}/5</span>
                </div>
                {session.feedback && (
                  <p className="text-sm text-muted-foreground italic">&quot;{session.feedback}&quot;</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canComplete() && (
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={() => setIsCompleteDialogOpen(true)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Completed
                </Button>
              )}
              
              {canCancel() && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setIsCancelDialogOpen(true)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel Session
                </Button>
              )}
              
              {canDelete() && (
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Session
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Session Dialog */}
      <SessionCancellationDialog
        session={session}
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onSuccess={() => {
          // Optionally redirect or show confirmation
          router.push('/sessions');
        }}
      />

      {/* Complete Session Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Session</DialogTitle>
            <DialogDescription>
              Mark this session as completed and add your notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sessionNotes">Session Notes</Label>
              <Textarea
                id="sessionNotes"
                placeholder="Add notes about the session..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <Label>Session Rating</Label>
              <div className="flex items-center space-x-1 mt-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setSessionRating(rating)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        rating <= sessionRating 
                          ? 'text-yellow-500 fill-yellow-500' 
                          : 'text-gray-300 hover:text-yellow-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => completeSessionMutation.mutate({ notes: sessionNotes, rating: sessionRating })}
              disabled={completeSessionMutation.isPending}
            >
              Complete Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Session Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this session? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteSessionMutation.mutate()}
              disabled={deleteSessionMutation.isPending}
            >
              Delete Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}