'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Star, Loader2, AlertCircle, Check } from 'lucide-react';

interface RateSessionDialogProps {
  sessionId: string;
  sessionTitle: string;
  coachName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  existingRating?: {
    rating: number;
    feedback?: string;
    tags?: string[];
  };
}

const RATING_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

const SUGGESTED_TAGS = [
  'Helpful',
  'Insightful',
  'Supportive',
  'Professional',
  'Knowledgeable',
  'Patient',
  'Inspiring',
  'Well-Prepared',
  'Great Listener',
  'Actionable Advice',
];

export function RateSessionDialog({
  sessionId,
  sessionTitle,
  coachName,
  open,
  onOpenChange,
  onSuccess,
  existingRating,
}: RateSessionDialogProps) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState(existingRating?.feedback || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(existingRating?.tags || []);
  const [error, setError] = useState('');

  // Rating mutation
  const rateMutation = useMutation({
    mutationFn: async () => {
      if (rating === 0) {
        throw new Error('Please select a rating');
      }

      const response = await fetch(`/api/sessions/${sessionId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          feedback: feedback.trim() || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to rate session');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['session-rating', sessionId] });
      setError('');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleRate = () => {
    setError('');
    rateMutation.mutate();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rate Your Session</DialogTitle>
          <DialogDescription>
            How was your session with {coachName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Session Info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium text-muted-foreground">Session:</p>
            <p className="font-medium">{sessionTitle}</p>
          </div>

          {/* Star Rating */}
          <div className="space-y-3">
            <Label>Your Rating</Label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none transition-transform hover:scale-110"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-10 w-10 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm font-medium text-primary">
                {RATING_LABELS[rating as keyof typeof RATING_LABELS]}
              </p>
            )}
          </div>

          {/* Tags */}
          {rating > 0 && (
            <div className="space-y-3">
              <Label>What stood out? (Optional)</Label>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleTag(tag)}
                  >
                    {selectedTags.includes(tag) && (
                      <Check className="h-3 w-3 mr-1" />
                    )}
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          {rating > 0 && (
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback (Optional)</Label>
              <Textarea
                id="feedback"
                placeholder="Share your thoughts about this session..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                {feedback.length}/1000 characters
              </p>
            </div>
          )}

          {/* Privacy Note */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800">
                Your rating and feedback will be shared with your coach to help improve their services. Ratings help other clients find the right coach.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={rateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRate}
            disabled={rateMutation.isPending || rating === 0}
          >
            {rateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : existingRating ? (
              'Update Rating'
            ) : (
              'Submit Rating'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RateSessionDialog;
