'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, Eye, Mail, Calendar, Award, MapPin } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CoachApplication {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  onboarding_completed_at: string;
  coach_profiles: {
    title: string;
    bio: string;
    experience_years: number;
    specializations: string[];
    credentials: string[];
    languages: string[];
    hourly_rate: number;
    currency: string;
  } | null;
}

interface ReviewDialogState {
  open: boolean;
  coach: CoachApplication | null;
  action: 'approve' | 'reject' | null;
  reason: string;
  notes: string;
}

export function CoachVerificationPanel() {
  const queryClient = useQueryClient();
  const [selectedCoach, setSelectedCoach] = useState<CoachApplication | null>(null);
  const [reviewDialog, setReviewDialog] = useState<ReviewDialogState>({
    open: false,
    coach: null,
    action: null,
    reason: '',
    notes: '',
  });

  // Fetch pending coach applications
  const { data, isLoading } = useQuery({
    queryKey: ['admin-coach-verification'],
    queryFn: async () => {
      const response = await fetch('/api/admin/coach-verification');
      if (!response.ok) {
        throw new Error('Failed to fetch coach applications');
      }
      const result = await response.json();
      return result.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async (reviewData: {
      coachId: string;
      action: 'approve' | 'reject';
      reason?: string;
      notes?: string;
    }) => {
      const response = await fetch('/api/admin/coach-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to review application');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-coach-verification'] });
      setReviewDialog({ open: false, coach: null, action: null, reason: '', notes: '' });
      setSelectedCoach(null);

      const action = variables.action === 'approve' ? 'approved' : 'rejected';
      toast.success(`Coach application ${action} successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to review application');
    },
  });

  const openReviewDialog = (coach: CoachApplication, action: 'approve' | 'reject') => {
    setReviewDialog({
      open: true,
      coach,
      action,
      reason: '',
      notes: '',
    });
  };

  const handleReview = () => {
    if (!reviewDialog.coach || !reviewDialog.action) return;

    reviewMutation.mutate({
      coachId: reviewDialog.coach.id,
      action: reviewDialog.action,
      reason: reviewDialog.reason,
      notes: reviewDialog.notes,
    });
  };

  const coaches = data?.coaches || [];
  const total = data?.total || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Coach Verification</CardTitle>
          <CardDescription>Loading applications...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Coach Verification Queue</CardTitle>
          <CardDescription>
            Review and approve coach applications ({total} pending)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coaches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending coach applications</p>
            </div>
          ) : (
            <div className="space-y-4">
              {coaches.map((coach: CoachApplication) => {
                const profile = coach.coach_profiles;
                if (!profile) return null;

                return (
                  <Card key={coach.id} className="border-2">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          {/* Coach Header */}
                          <div>
                            <h3 className="text-lg font-semibold">
                              {coach.first_name} {coach.last_name}
                            </h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              {coach.email}
                            </p>
                          </div>

                          {/* Profile Info */}
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <p className="text-sm font-medium">Title</p>
                              <p className="text-sm text-muted-foreground">{profile.title}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium flex items-center gap-1">
                                <Award className="h-4 w-4" />
                                Experience
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {profile.experience_years} years
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Hourly Rate</p>
                              <p className="text-sm text-muted-foreground">
                                {profile.currency} {profile.hourly_rate}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Languages</p>
                              <p className="text-sm text-muted-foreground">
                                {profile.languages.join(', ')}
                              </p>
                            </div>
                          </div>

                          {/* Specializations */}
                          <div>
                            <p className="text-sm font-medium mb-2">Specializations</p>
                            <div className="flex flex-wrap gap-2">
                              {profile.specializations.map((spec, idx) => (
                                <Badge key={idx} variant="secondary">
                                  {spec}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Credentials */}
                          {profile.credentials && profile.credentials.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Credentials</p>
                              <div className="flex flex-wrap gap-2">
                                {profile.credentials.map((cred, idx) => (
                                  <Badge key={idx} variant="outline">
                                    {cred}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Bio (collapsed) */}
                          {selectedCoach?.id === coach.id && (
                            <div>
                              <p className="text-sm font-medium mb-2">Bio</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {profile.bio}
                              </p>
                            </div>
                          )}

                          {/* Applied Date */}
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Applied: {new Date(coach.onboarding_completed_at || coach.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (selectedCoach?.id === coach.id) {
                                setSelectedCoach(null);
                              } else {
                                setSelectedCoach(coach);
                              }
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {selectedCoach?.id === coach.id ? 'Hide' : 'View'}
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => openReviewDialog(coach, 'approve')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openReviewDialog(coach, 'reject')}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onOpenChange={(open) => {
        if (!open) {
          setReviewDialog({ open: false, coach: null, action: null, reason: '', notes: '' });
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === 'approve' ? 'Approve' : 'Reject'} Coach Application
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action === 'approve'
                ? `Approve ${reviewDialog.coach?.first_name} ${reviewDialog.coach?.last_name} as a coach?`
                : `Reject ${reviewDialog.coach?.first_name} ${reviewDialog.coach?.last_name}'s application?`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {reviewDialog.action === 'reject' && (
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Rejection *</Label>
                <Textarea
                  id="reason"
                  placeholder="Provide a brief reason for rejection..."
                  value={reviewDialog.reason}
                  onChange={(e) =>
                    setReviewDialog((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Internal Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any internal notes..."
                value={reviewDialog.notes}
                onChange={(e) =>
                  setReviewDialog((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setReviewDialog({ open: false, coach: null, action: null, reason: '', notes: '' })
              }
              disabled={reviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={reviewDialog.action === 'approve' ? 'default' : 'destructive'}
              onClick={handleReview}
              disabled={
                reviewMutation.isPending ||
                (reviewDialog.action === 'reject' && !reviewDialog.reason.trim())
              }
            >
              {reviewMutation.isPending ? 'Processing...' : reviewDialog.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
