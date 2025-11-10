'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Star,
  Clock,
  MapPin,
  MessageCircle,
  Calendar,
  CheckCircle2,
  User as UserIcon,
  Globe,
  Award,
  BookOpen,

  MessageSquare,
  TrendingUp,


  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { apiGet } from '@/lib/api/client-api-request';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Avatar, 
  AvatarImage, 
  AvatarFallback 
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Skeleton,
  SkeletonAvatar,
  SkeletonText,
  SkeletonCard
} from '@/components/ui/skeleton';
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { formatDateTime, createUserProcessor } from '@/lib/utils';
import type { User, Session } from '@/types';

interface CoachProfile extends User {
  bio?: string;
  specializations?: string[];
  credentials?: string[];
  languages?: string[];
  yearsOfExperience?: number;
  isOnline?: boolean;
  averageRating?: number;
  totalReviews?: number;
  sessionCount?: number;
  responseTimeMinutes?: number;
  completionRate?: number;
  location?: string;
  socialLinks?: {
    website?: string;
    linkedin?: string;
    twitter?: string;
  };
}

interface CoachReview {
  id: string;
  clientId: string;
  coachId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  client: {
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  session?: {
    id: string;
    title: string;
  };
}

interface _AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface CoachSessionHistory {
  sessions: Session[];
  upcomingSessions: Session[];
  pastSessions: Session[];
  totalSessions: number;
}

const { getDisplayName, getInitials } = createUserProcessor();

function CoachProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center md:items-start">
              <SkeletonAvatar className="w-32 h-32" />
              <div className="mt-4 text-center md:text-left space-y-2">
                <SkeletonText className="w-48 h-6" />
                <SkeletonText className="w-32 h-4" />
                <SkeletonText className="w-24 h-4" />
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <SkeletonText className="w-full h-20" />
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="w-20 h-6 rounded-full" />
                ))}
              </div>
              <div className="flex gap-4">
                <Skeleton className="w-32 h-10 rounded-md" />
                <Skeleton className="w-28 h-10 rounded-md" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

function ErrorDisplay({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>Failed to load coach profile: {error.message}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRetry}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

function StarRating({ rating, size = 'default' }: { rating: number; size?: 'sm' | 'default' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    default: 'w-4 h-4',
    lg: 'w-5 h-5'
  };
  
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= rating 
              ? 'fill-yellow-400 text-yellow-400' 
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

function BookSessionDialog({ 
  coach, 
  isOpen, 
  onOpenChange 
}: { 
  coach: CoachProfile; 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
}) {
  const [_selectedDate, _setSelectedDate] = useState('');
  const [_selectedTime, _setSelectedTime] = useState('');
  
  // This would typically use the unified booking system
  const handleBookSession = () => {
    // Navigate to the main booking page with pre-selected coach
    window.location.href = `/sessions/book?coachId=${coach.id}`;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book Session with {getDisplayName(coach)}</DialogTitle>
          <DialogDescription>
            Schedule a coaching session to continue your growth journey.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Avatar className="w-12 h-12">
              <AvatarImage src={coach.avatarUrl} alt={getDisplayName(coach)} />
              <AvatarFallback>{getInitials(coach)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{getDisplayName(coach)}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <StarRating rating={coach.averageRating || 0} size="sm" />
                <span>{coach.averageRating?.toFixed(1)} ({coach.totalReviews} reviews)</span>
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              You'll be redirected to the booking page where you can:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• View {coach.firstName || 'coach'}'s real-time availability</li>
              <li>• Select your preferred time slot</li>
              <li>• Add session details and goals</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleBookSession} 
            className="w-full"
            size="lg"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Continue to Booking
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MessageCoachDialog({ 
  coach, 
  isOpen, 
  onOpenChange 
}: { 
  coach: CoachProfile; 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void; 
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Message {getDisplayName(coach)}</DialogTitle>
          <DialogDescription>
            Send a message to start a conversation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Direct messaging feature coming soon!
            </p>
            <p className="text-sm text-muted-foreground">
              For now, you can reach out during your booked sessions.
            </p>
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientCoachDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  
  // Fetch coach profile data
  const {
    data: coach,
    isLoading: loadingCoach,
    error: coachError,
    refetch: refetchCoach
  } = useQuery({
    queryKey: ['coach-profile', id],
    queryFn: async (): Promise<CoachProfile> => {
      try {
        return await apiGet<CoachProfile>(`/api/coaches/${id}`);
      } catch (error: any) {
        if (error?.message?.includes('404')) {
          throw new Error('Coach not found');
        }
        throw new Error('Failed to fetch coach profile');
      }
    },
    retry: (failureCount, error: unknown) => {
      // Don't retry on 404 errors
      if (error?.message === 'Coach not found') return false;
      return failureCount < 3;
    }
  });
  
  // Fetch coach reviews
  const {
    data: reviews,
    isLoading: loadingReviews
  } = useQuery({
    queryKey: ['coach-reviews', id],
    queryFn: async (): Promise<CoachReview[]> => {
      const data = await apiGet<{ data: CoachReview[] }>(`/api/coaches/${id}/reviews?limit=10&sort=recent`);
      return data.data || [];
    },
    enabled: !!id
  });
  
  // Fetch session history with this coach
  const {
    data: sessionHistory,
    isLoading: loadingHistory
  } = useQuery({
    queryKey: ['coach-session-history', id],
    queryFn: async (): Promise<CoachSessionHistory> => {
      const data = await apiGet<{ data: Session[] }>(`/api/sessions?coachId=${id}&include_history=true`);

      const sessions = data.data || [];
      const now = new Date();

      return {
        sessions,
        upcomingSessions: sessions.filter((s: Session) =>
          new Date(s.scheduledAt) > now &&
          ['scheduled', 'in_progress'].includes(s.status)
        ),
        pastSessions: sessions.filter((s: Session) =>
          new Date(s.scheduledAt) <= now ||
          ['completed', 'cancelled', 'no_show'].includes(s.status)
        ),
        totalSessions: sessions.length
      };
    },
    enabled: !!id
  });
  
  // Fetch availability status
  const {
    data: availability,
    isLoading: _loadingAvailability
  } = useQuery({
    queryKey: ['coach-availability-status', id],
    queryFn: async () => {
      return await apiGet(`/api/coaches/${id}/availability?status_only=true`);
    },
    enabled: !!id,
    refetchInterval: 30000 // Refresh every 30 seconds
  });
  
  if (loadingCoach) {
    return <CoachProfileSkeleton />;
  }
  
  if (coachError) {
    return <ErrorDisplay error={coachError} onRetry={() => refetchCoach()} />;
  }
  
  if (!coach) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <UserIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Coach Not Found</h3>
          <p className="text-muted-foreground mb-4">
            The coach profile you're looking for doesn't exist or has been removed.
          </p>
          <Button 
            variant="outline"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Coach Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar and Basic Info */}
            <div className="flex flex-col items-center md:items-start">
              <div className="relative">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={coach.avatarUrl} alt={getDisplayName(coach)} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(coach)}
                  </AvatarFallback>
                </Avatar>
                {coach.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full" />
                  </div>
                )}
              </div>

              <div className="mt-4 text-center md:text-left">
                <h1 className="text-2xl font-bold">{getDisplayName(coach)}</h1>
                <p className="text-muted-foreground font-medium">
                  Professional Coach
                </p>
                
                {coach.location && (
                  <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground justify-center md:justify-start">
                    <MapPin className="w-4 h-4" />
                    <span>{coach.location}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 mt-2 justify-center md:justify-start">
                  <div className={`w-3 h-3 rounded-full ${
                    coach.isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <span className="text-sm text-muted-foreground">
                    {coach.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Main Info */}
            <div className="flex-1 space-y-4">
              {/* Bio */}
              <div>
                <h3 className="font-medium mb-2">About</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {coach.bio || 'This coach hasn\'t added a bio yet.'}
                </p>
              </div>
              
              {/* Stats Row */}
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <StarRating rating={coach.averageRating || 0} />
                  <span className="font-medium">
                    {coach.averageRating?.toFixed(1) || 'N/A'}
                  </span>
                  <span className="text-muted-foreground">
                    ({coach.totalReviews || 0} reviews)
                  </span>
                </div>
                
                {coach.sessionCount && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>{coach.sessionCount} sessions</span>
                  </div>
                )}
                
                {coach.yearsOfExperience && (
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    <span>{coach.yearsOfExperience} years experience</span>
                  </div>
                )}
                
                {coach.responseTimeMinutes && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>~{coach.responseTimeMinutes}min response</span>
                  </div>
                )}
              </div>
              
              {/* Specializations */}
              {coach.specializations && coach.specializations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Specializations</h4>
                  <div className="flex flex-wrap gap-2">
                    {coach.specializations.map((spec, index) => (
                      <Badge key={index} variant="secondary">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Languages */}
              {coach.languages && coach.languages.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Languages</h4>
                  <div className="flex flex-wrap gap-2">
                    {coach.languages.map((lang, index) => (
                      <Badge key={index} variant="outline">
                        <Globe className="w-3 h-3 mr-1" />
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Button 
                  size="lg" 
                  onClick={() => setBookingDialogOpen(true)}
                  className="flex-1 sm:flex-none"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Session
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => setMessageDialogOpen(true)}
                  className="flex-1 sm:flex-none"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message
                </Button>
                
                {availability && (
                  <Button 
                    variant="ghost" 
                    size="lg"
                    onClick={() => window.location.href = `/sessions/book?coachId=${id}&view=schedule`}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    View Schedule
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Content Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="sessions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="credentials">Credentials</TabsTrigger>
            </TabsList>
            
            {/* Sessions Tab */}
            <TabsContent value="sessions">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Session History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingHistory ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                          <Skeleton className="w-12 h-12 rounded" />
                          <div className="flex-1 space-y-2">
                            <SkeletonText className="w-3/4" />
                            <SkeletonText className="w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : sessionHistory && sessionHistory.sessions.length > 0 ? (
                    <div className="space-y-4">
                      {/* Upcoming Sessions */}
                      {sessionHistory.upcomingSessions.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3 text-blue-600">Upcoming Sessions</h4>
                          <div className="space-y-3">
                            {sessionHistory.upcomingSessions.map(session => {
                              const dateTime = formatDateTime(session.scheduledAt);
                              return (
                                <div key={session.id} className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                  <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                                      <Calendar className="w-6 h-6 text-white" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-medium text-blue-900 truncate">
                                      {session.title}
                                    </h5>
                                    <p className="text-sm text-blue-700">
                                      {dateTime.full} • {session.duration} minutes
                                    </p>
                                    <Badge 
                                      variant={session.status === 'scheduled' ? 'scheduled' : 'in-progress'}
                                      className="mt-1"
                                    >
                                      {session.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  <Button size="sm" variant="outline">
                                    View Details
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                          {sessionHistory.pastSessions.length > 0 && (
                            <Separator className="my-6" />
                          )}
                        </div>
                      )}
                      
                      {/* Past Sessions */}
                      {sessionHistory.pastSessions.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3 text-muted-foreground">Past Sessions</h4>
                          <div className="space-y-3">
                            {sessionHistory.pastSessions.slice(0, 5).map(session => {
                              const dateTime = formatDateTime(session.scheduledAt);
                              return (
                                <div key={session.id} className="flex items-center gap-4 p-4 border rounded-lg">
                                  <div className="flex-shrink-0">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                      session.status === 'completed' 
                                        ? 'bg-green-100 text-green-600'
                                        : session.status === 'cancelled'
                                        ? 'bg-red-100 text-red-600'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {session.status === 'completed' ? (
                                        <CheckCircle2 className="w-6 h-6" />
                                      ) : (
                                        <Calendar className="w-6 h-6" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-medium truncate">
                                      {session.title}
                                    </h5>
                                    <p className="text-sm text-muted-foreground">
                                      {dateTime.date} • {session.duration} minutes
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge 
                                        variant={session.status as unknown}
                                        className="text-xs"
                                      >
                                        {session.status.replace('_', ' ')}
                                      </Badge>
                                      {session.rating && (
                                        <div className="flex items-center gap-1">
                                          <StarRating rating={session.rating} size="sm" />
                                          <span className="text-xs text-muted-foreground">
                                            {session.rating}/5
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <Button size="sm" variant="ghost">
                                    View Notes
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                          
                          {sessionHistory.pastSessions.length > 5 && (
                            <div className="text-center mt-4">
                              <Button variant="outline" size="sm">
                                View All Sessions ({sessionHistory.pastSessions.length})
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h4 className="font-medium mb-2">No Sessions Yet</h4>
                      <p className="text-muted-foreground mb-4">
                        You haven't had any sessions with {coach.firstName} yet.
                      </p>
                      <Button onClick={() => setBookingDialogOpen(true)}>
                        <Calendar className="w-4 h-4 mr-2" />
                        Book Your First Session
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Client Reviews
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingReviews ? (
                    <div className="space-y-6">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <SkeletonAvatar />
                            <div className="flex-1 space-y-2">
                              <SkeletonText className="w-32" />
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(j => (
                                  <Skeleton key={j} className="w-4 h-4 rounded" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <SkeletonText className="w-full h-16" />
                          <Separator />
                        </div>
                      ))}
                    </div>
                  ) : reviews && reviews.length > 0 ? (
                    <div className="space-y-6">
                      {reviews.map((review, index) => (
                        <div key={review.id}>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage 
                                  src={review.client.avatarUrl} 
                                  alt={getDisplayName(review.client)} 
                                />
                                <AvatarFallback>
                                  {getInitials(review.client)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">
                                    {getDisplayName(review.client)}
                                  </span>
                                  <StarRating rating={review.rating} size="sm" />
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>{formatDateTime(review.createdAt).date}</span>
                                  {review.session && (
                                    <>
                                      <span>•</span>
                                      <span>Session: {review.session.title}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {review.comment && (
                              <blockquote className="text-muted-foreground italic pl-4 border-l-2 border-muted">
                                "{review.comment}"
                              </blockquote>
                            )}
                          </div>
                          
                          {index < reviews.length - 1 && <Separator className="mt-6" />}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h4 className="font-medium mb-2">No Reviews Yet</h4>
                      <p className="text-muted-foreground">
                        {coach.firstName} hasn't received any client reviews yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Credentials Tab */}
            <TabsContent value="credentials">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Credentials & Experience
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Experience */}
                  {coach.yearsOfExperience && (
                    <div>
                      <h4 className="font-medium mb-2">Experience</h4>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <TrendingUp className="w-4 h-4" />
                        <span>{coach.yearsOfExperience} years of professional coaching</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Credentials */}
                  {coach.credentials && coach.credentials.length > 0 ? (
                    <div>
                      <h4 className="font-medium mb-3">Certifications</h4>
                      <div className="space-y-2">
                        {coach.credentials.map((credential, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <Award className="w-5 h-5 text-primary" />
                            <span>{credential}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-medium mb-2">Certifications</h4>
                      <p className="text-muted-foreground">
                        No certifications listed yet.
                      </p>
                    </div>
                  )}
                  
                  {/* Social Links */}
                  {coach.socialLinks && Object.keys(coach.socialLinks).length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Professional Links</h4>
                      <div className="space-y-2">
                        {coach.socialLinks.website && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="justify-start"
                            asChild
                          >
                            <a 
                              href={coach.socialLinks.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Website
                            </a>
                          </Button>
                        )}
                        
                        {coach.socialLinks.linkedin && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="justify-start"
                            asChild
                          >
                            <a 
                              href={coach.socialLinks.linkedin} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              LinkedIn
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Coach Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {coach.averageRating && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rating</span>
                  <div className="flex items-center gap-2">
                    <StarRating rating={coach.averageRating} size="sm" />
                    <span className="font-medium">{coach.averageRating.toFixed(1)}</span>
                  </div>
                </div>
              )}
              
              {coach.totalReviews && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reviews</span>
                  <span className="font-medium">{coach.totalReviews}</span>
                </div>
              )}
              
              {coach.sessionCount && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sessions</span>
                  <span className="font-medium">{coach.sessionCount}</span>
                </div>
              )}
              
              {coach.completionRate && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span className="font-medium">{coach.completionRate}%</span>
                </div>
              )}
              
              {coach.responseTimeMinutes && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Response Time</span>
                  <span className="font-medium">~{coach.responseTimeMinutes} min</span>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Availability Status */}
          {availability && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Availability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      availability.hasAvailableSlots ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className="text-sm">
                      {availability.hasAvailableSlots 
                        ? 'Available for booking' 
                        : 'No slots available'
                      }
                    </span>
                  </div>
                  
                  {availability.nextAvailableSlot && (
                    <div className="text-sm text-muted-foreground">
                      Next available: {formatDateTime(availability.nextAvailableSlot).full}
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => window.location.href = `/sessions/book?coachId=${id}&view=schedule`}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    View Full Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full" 
                onClick={() => setBookingDialogOpen(true)}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Book Session
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setMessageDialogOpen(true)}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Send Message
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => window.location.href = '/client/coaches'}
              >
                <UserIcon className="w-4 h-4 mr-2" />
                Browse Other Coaches
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Dialogs */}
      <BookSessionDialog 
        coach={coach}
        isOpen={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
      />
      
      <MessageCoachDialog 
        coach={coach}
        isOpen={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
      />
    </div>
  );
}
