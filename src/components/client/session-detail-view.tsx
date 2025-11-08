'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, differenceInHours } from 'date-fns';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Target,
  MessageSquare,
  Download,
  File,
  Image as ImageIcon,
  Music,
  Film,
  FileSpreadsheet,
  Archive,
  Star,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { downloadICS, generateGoogleCalendarURL, generateOutlookCalendarURL } from '@/lib/utils/calendar-export';
import type { Session } from '@/types';

import { RateSessionDialog } from './rate-session-dialog';
import { RescheduleSessionDialog } from './reschedule-session-dialog';

interface SessionDetailViewProps {
  sessionId: string;
}

const statusIcons = {
  scheduled: Clock,
  in_progress: Loader2,
  completed: CheckCircle2,
  cancelled: XCircle,
  no_show: AlertCircle,
};

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-orange-100 text-orange-700',
};

export function SessionDetailView({ sessionId }: SessionDetailViewProps) {
  const router = useRouter();
  const locale = useLocale();
  const withLocale = (path: string) => `/${locale}${path}`;
  const queryClient = useQueryClient();

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showRateDialog, setShowRateDialog] = useState(false);

  // Fetch session details
  const { data: session, isLoading, error } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch session');
      const result = await response.json();
      return result.data as Session;
    },
  });

  // Fetch session notes (coach feedback)
  const { data: notes } = useQuery({
    queryKey: ['session-notes', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/client/sessions/${sessionId}/notes`);
      if (!response.ok) return null;
      const result = await response.json();
      return result.data;
    },
    enabled: !!session && session.status === 'completed',
  });

  // Fetch session files
  const { data: filesData } = useQuery({
    queryKey: ['session-files', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/sessions/${sessionId}/files`);
      if (!response.ok) return null;
      const result = await response.json();
      return result;
    },
    enabled: !!session,
  });

  // Fetch session rating
  const { data: ratingData } = useQuery({
    queryKey: ['session-rating', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/sessions/${sessionId}/rate`);
      if (!response.ok) return null;
      const result = await response.json();
      return result.data;
    },
    enabled: !!session && session.status === 'completed',
  });

  // Cancel session mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/sessions/${sessionId}/cancel`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel session');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['client-sessions'] });
      setShowCancelDialog(false);
    },
  });

  const handleBack = () => {
    router.push(withLocale('/client/sessions'));
  };

  const handleCancel = () => {
    cancelMutation.mutate();
  };

  const handleMessage = () => {
    // Navigate to messaging with coach
    router.push(withLocale(`/messages?userId=${session?.coachId}`));
  };

  const handleDownloadFile = async (fileId: string, filename: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/download`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('File download error:', error);
    }
  };

  const getSessionTypeIcon = (type?: string) => {
    switch (type) {
      case 'video': return Video;
      case 'phone': return Phone;
      case 'in-person': return MapPin;
      default: return Video;
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return ImageIcon;
    if (fileType.startsWith('video/')) return Film;
    if (fileType.startsWith('audio/')) return Music;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet;
    if (fileType.includes('zip') || fileType.includes('archive')) return Archive;
    if (fileType.includes('pdf')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const canCancel = (session: Session) => {
    if (session.status !== 'scheduled') return false;
    const scheduledTime = parseISO(session.scheduledAt);
    const now = new Date();
    const hoursUntil = differenceInHours(scheduledTime, now);
    return hoursUntil >= 24; // Can cancel if more than 24 hours away
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center p-12 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="font-semibold mb-2">Session Not Found</h3>
          <p className="text-muted-foreground mb-4">
            We couldn't find this session. It may have been deleted.
          </p>
          <Button onClick={handleBack}>Back to Sessions</Button>
        </CardContent>
      </Card>
    );
  }

  const StatusIcon = statusIcons[session.status];
  const TypeIcon = getSessionTypeIcon(session.sessionType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sessions
        </Button>

        <div className="flex space-x-2">
          {session.status === 'scheduled' && (
            <>
              <Button variant="outline" onClick={handleMessage}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Coach
              </Button>
              {canCancel(session) && (
                <>
                  <Button variant="outline" onClick={() => setShowRescheduleDialog(true)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Reschedule
                  </Button>
                  <Button variant="destructive" onClick={() => setShowCancelDialog(true)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Session
                  </Button>
                </>
              )}
            </>
          )}
          {session.status === 'completed' && (
            <Button variant="default" onClick={() => setShowRateDialog(true)}>
              <Star className="h-4 w-4 mr-2" />
              {ratingData ? 'Update Rating' : 'Rate Session'}
            </Button>
          )}
        </div>
      </div>

      {/* Session Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">{session.title || 'Coaching Session'}</CardTitle>
              <Badge className={statusColors[session.status]}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {session.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description */}
          {session.description && (
            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-muted-foreground">{session.description}</p>
            </div>
          )}

          <Separator />

          {/* Session Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coach Info */}
            <div>
              <h4 className="font-semibold mb-3">Coach</h4>
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={session.coach?.avatarUrl} />
                  <AvatarFallback>
                    {session.coach?.firstName?.[0]}{session.coach?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {session.coach?.firstName} {session.coach?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{session.coach?.email}</p>
                </div>
              </div>
            </div>

            {/* Session Type */}
            <div>
              <h4 className="font-semibold mb-3">Session Type</h4>
              <div className="flex items-center space-x-2">
                <TypeIcon className="h-5 w-5 text-muted-foreground" />
                <span className="capitalize">{session.sessionType || 'video'}</span>
              </div>
            </div>

            {/* Date & Time */}
            <div>
              <h4 className="font-semibold mb-3">Date & Time</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(parseISO(session.scheduledAt), 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{format(parseISO(session.scheduledAt), 'h:mm a')}</span>
                </div>
              </div>
            </div>

            {/* Duration */}
            <div>
              <h4 className="font-semibold mb-3">Duration</h4>
              <p>{session.duration || session.durationMinutes} minutes</p>
            </div>

            {/* Add to Calendar */}
            {session.status === 'scheduled' && (
              <div className="md:col-span-2">
                <h4 className="font-semibold mb-3">Add to Calendar</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(generateGoogleCalendarURL(session), '_blank')}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Google Calendar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(generateOutlookCalendarURL(session), '_blank')}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Outlook
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadICS(session)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download iCal
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Cancellation Warning */}
          {session.status === 'scheduled' && !canCancel(session) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Cancellation Not Available</p>
                  <p className="text-yellow-700">
                    You can only cancel sessions with at least 24 hours notice.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coach Notes (if completed) */}
      {session.status === 'completed' && notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Coach Notes & Feedback</span>
            </CardTitle>
            <CardDescription>Notes from your coach about this session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {notes.content && (
              <div>
                <h4 className="font-semibold mb-2">Session Summary</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{notes.content}</p>
              </div>
            )}

            {notes.keyInsights && notes.keyInsights.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Key Insights</h4>
                <ul className="list-disc list-inside space-y-1">
                  {notes.keyInsights.map((insight: string, index: number) => (
                    <li key={index} className="text-muted-foreground">{insight}</li>
                  ))}
                </ul>
              </div>
            )}

            {notes.actionItems && notes.actionItems.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>Action Items</span>
                </h4>
                <ul className="space-y-2">
                  {notes.actionItems.map((item: string, index: number) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Session Files */}
      {filesData && filesData.files && filesData.files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Session Files & Resources</span>
              <Badge variant="secondary">{filesData.files.length} files</Badge>
            </CardTitle>
            <CardDescription>Shared materials, notes, and recordings</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All ({filesData.files.length})</TabsTrigger>
                <TabsTrigger value="preparation">Prep ({filesData.filesByCategory?.preparation?.length || 0})</TabsTrigger>
                <TabsTrigger value="notes">Notes ({filesData.filesByCategory?.notes?.length || 0})</TabsTrigger>
                <TabsTrigger value="recording">Recordings ({filesData.filesByCategory?.recording?.length || 0})</TabsTrigger>
                <TabsTrigger value="resource">Resources ({filesData.filesByCategory?.resource?.length || 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3 mt-4">
                {filesData.files.map((file: unknown) => {
                  const FileIcon = getFileIcon(file.file.fileType);
                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <FileIcon className="h-8 w-8 text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.file.filename}</p>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span className="capitalize">{file.category}</span>
                            <span>•</span>
                            <span>{formatFileSize(file.file.fileSize)}</span>
                            {file.uploadedBy && (
                              <>
                                <span>•</span>
                                <span>Uploaded by {file.uploadedBy.name}</span>
                              </>
                            )}
                          </div>
                          {file.file.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                              {file.file.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadFile(file.file.id, file.file.filename)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  );
                })}
              </TabsContent>

              {['preparation', 'notes', 'recording', 'resource'].map((category) => (
                <TabsContent key={category} value={category} className="space-y-3 mt-4">
                  {filesData.filesByCategory[category]?.length > 0 ? (
                    filesData.filesByCategory[category].map((file: unknown) => {
                      const FileIcon = getFileIcon(file.file.fileType);
                      return (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <FileIcon className="h-8 w-8 text-primary" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{file.file.filename}</p>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <span>{formatFileSize(file.file.fileSize)}</span>
                                {file.uploadedBy && (
                                  <>
                                    <span>•</span>
                                    <span>Uploaded by {file.uploadedBy.name}</span>
                                  </>
                                )}
                              </div>
                              {file.file.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {file.file.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadFile(file.file.id, file.file.filename)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No {category} files yet</p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Reschedule Dialog */}
      <RescheduleSessionDialog
        sessionId={sessionId}
        sessionTitle={session.title || 'Coaching Session'}
        currentScheduledAt={session.scheduledAt}
        open={showRescheduleDialog}
        onOpenChange={setShowRescheduleDialog}
        onSuccess={() => {
          // Refetch session data after successful reschedule
          queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
        }}
      />

      {/* Rate Session Dialog */}
      {session.status === 'completed' && (
        <RateSessionDialog
          sessionId={sessionId}
          sessionTitle={session.title || 'Coaching Session'}
          coachName={`${session.coach?.firstName || ''} ${session.coach?.lastName || ''}`.trim()}
          open={showRateDialog}
          onOpenChange={setShowRateDialog}
          existingRating={ratingData ? {
            rating: ratingData.rating,
            feedback: ratingData.feedback,
            tags: ratingData.tags,
          } : undefined}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['session-rating', sessionId] });
          }}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this session? This action cannot be undone.
              You may be subject to a cancellation fee depending on the timing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Session</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive hover:bg-destructive/90"
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Session'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SessionDetailView;
