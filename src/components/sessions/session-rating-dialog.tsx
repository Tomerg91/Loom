'use client';

import { format, parseISO } from 'date-fns';
import { Star, Calendar, Clock, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRateSession } from '@/lib/queries/sessions';
import type { Session, SessionRating } from '@/types';
import { logger } from '@/lib/logger';

interface SessionRatingDialogProps {
  session: Session;
  onClose: () => void;
  onSuccess: () => void;
}

interface RatingCategory {
  key: keyof NonNullable<SessionRating['categories']>;
  label: string;
  description: string;
}

export function SessionRatingDialog({ session, onClose, onSuccess }: SessionRatingDialogProps) {
  const t = useTranslations('session');
  const commonT = useTranslations('common');
  
  const rateSession = useRateSession();

  const [overallRating, setOverallRating] = useState(0);
  const [categories, setCategories] = useState({
    communication: 0,
    helpfulness: 0,
    preparation: 0,
    overall: 0,
  });
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ratingCategories: RatingCategory[] = [
    {
      key: 'communication',
      label: 'Communication',
      description: 'How well did your coach communicate and listen?'
    },
    {
      key: 'helpfulness',
      label: 'Helpfulness',
      description: 'How helpful was the session content and guidance?'
    },
    {
      key: 'preparation',
      label: 'Preparation',
      description: 'How well prepared was your coach for the session?'
    }
  ];

  const handleStarClick = (rating: number, category?: keyof typeof categories) => {
    if (category) {
      setCategories(prev => ({
        ...prev,
        [category]: rating,
        overall: category === 'overall' ? rating : prev.overall
      }));
      
      if (category !== 'overall') {
        // Calculate overall rating as average of categories
        const newCategories = { ...categories, [category]: rating };
        const avg = Math.round((newCategories.communication + newCategories.helpfulness + newCategories.preparation) / 3);
        setOverallRating(avg);
        setCategories(prev => ({ ...prev, overall: avg }));
      }
    } else {
      setOverallRating(rating);
      setCategories(prev => ({ ...prev, overall: rating }));
    }
  };

  const renderStarRating = (currentRating: number, onRate: (rating: number) => void, size = 'default') => {
    const starSize = size === 'large' ? 'h-8 w-8' : 'h-5 w-5';
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRate(star)}
            className={`${starSize} text-yellow-400 hover:text-yellow-500 transition-colors ${
              star <= currentRating ? 'fill-current' : 'fill-none stroke-current'
            }`}
          >
            <Star className={starSize} />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {currentRating > 0 ? `${currentRating}/5` : 'Click to rate'}
        </span>
      </div>
    );
  };

  const handleSubmit = async () => {
    if (overallRating === 0) return;

    setIsSubmitting(true);
    try {
      const rating: Omit<SessionRating, 'id' | 'createdAt' | 'updatedAt'> = {
        sessionId: session.id,
        clientId: session.clientId,
        rating: overallRating,
        feedback: feedback.trim() || undefined,
        categories: {
          communication: categories.communication || overallRating,
          helpfulness: categories.helpfulness || overallRating,
          preparation: categories.preparation || overallRating,
          overall: overallRating,
        }
      };

      await rateSession.mutateAsync(rating);
      onSuccess();
    } catch (error) {
      logger.error('Failed to submit rating:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (rating: number): string => {
    if (rating === 0) return '';
    const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    return labels[rating];
  };

  const getRatingColor = (rating: number): string => {
    if (rating === 0) return 'text-gray-400';
    if (rating <= 2) return 'text-red-500';
    if (rating <= 3) return 'text-yellow-500';
    if (rating <= 4) return 'text-blue-500';
    return 'text-green-500';
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rate Your Session</DialogTitle>
          <DialogDescription>
            Help us improve by sharing your experience with this session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{session.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(parseISO(session.scheduledAt), 'PPP')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{format(parseISO(session.scheduledAt), 'p')} ({session.duration}min)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={session.coach.avatarUrl} alt={`${session.coach.firstName} ${session.coach.lastName}`} />
                    <AvatarFallback className="text-xs">
                      {session.coach.firstName[0]}{session.coach.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span>{session.coach.firstName} {session.coach.lastName}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overall Rating */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-medium">Overall Rating</Label>
              <p className="text-sm text-muted-foreground">How was your overall experience?</p>
            </div>
            <div className="flex items-center gap-4">
              {renderStarRating(overallRating, (rating) => handleStarClick(rating), 'large')}
              {overallRating > 0 && (
                <Badge variant="secondary" className={getRatingColor(overallRating)}>
                  {getRatingLabel(overallRating)}
                </Badge>
              )}
            </div>
          </div>

          {/* Category Ratings */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">Detailed Feedback</Label>
              <p className="text-sm text-muted-foreground">Rate specific aspects of your session</p>
            </div>
            
            <div className="space-y-4">
              {ratingCategories.map((category) => (
                <div key={category.key} className="space-y-2">
                  <div>
                    <Label className="font-medium">{category.label}</Label>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {renderStarRating(
                      categories[category.key], 
                      (rating) => handleStarClick(rating, category.key)
                    )}
                    {categories[category.key] > 0 && (
                      <span className={`text-sm ${getRatingColor(categories[category.key])}`}>
                        {getRatingLabel(categories[category.key])}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Written Feedback */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="feedback">Additional Feedback (Optional)</Label>
              <p className="text-sm text-muted-foreground">
                Share any specific comments or suggestions
              </p>
            </div>
            <Textarea
              id="feedback"
              placeholder="What went well? What could be improved? Any specific highlights?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Rating Summary */}
          {overallRating > 0 && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Rating Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Overall Rating:</span>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star}
                          className={`h-4 w-4 text-yellow-400 ${
                            star <= overallRating ? 'fill-current' : 'fill-none stroke-current'
                          }`}
                        />
                      ))}
                    </div>
                    <span className={getRatingColor(overallRating)}>
                      {getRatingLabel(overallRating)}
                    </span>
                  </div>
                </div>
                
                {ratingCategories.map((category) => (
                  categories[category.key] > 0 && (
                    <div key={category.key} className="flex items-center justify-between text-sm">
                      <span>{category.label}:</span>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star}
                              className={`h-3 w-3 text-yellow-400 ${
                                star <= categories[category.key] ? 'fill-current' : 'fill-none stroke-current'
                              }`}
                            />
                          ))}
                        </div>
                        <span className={getRatingColor(categories[category.key])}>
                          {getRatingLabel(categories[category.key])}
                        </span>
                      </div>
                    </div>
                  )
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {commonT('cancel')}
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={overallRating === 0 || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}