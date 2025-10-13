'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  AlertTriangle,
  Clock,
  DollarSign,
  Mail,
  RefreshCw,
  X
} from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/lib/auth/use-user';

interface Session {
  id: string;
  title: string;
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  coach: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  cancellationPolicy?: {
    freeUntilHours: number;
    partialRefundUntilHours: number;
    feeAmount: number;
  };
}

interface SessionCancellationDialogProps {
  session: Session | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SessionCancellationDialog({ 
  session, 
  isOpen, 
  onClose, 
  onSuccess 
}: SessionCancellationDialogProps) {
  const user = useUser();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    reason: '',
    customReason: '',
    notifyParticipants: true,
    offerReschedule: false,
    refundRequested: false,
  });

  const cancellationReasons = [
    { value: 'schedule_conflict', label: 'Schedule conflict' },
    { value: 'illness', label: 'Illness' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'technical_issues', label: 'Technical issues' },
    { value: 'weather', label: 'Weather conditions' },
    { value: 'travel_issues', label: 'Travel issues' },
    { value: 'personal_reasons', label: 'Personal reasons' },
    { value: 'other', label: 'Other (please specify)' },
  ];

  const cancelSessionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!session?.id) throw new Error('Session ID is required');
      
      // Determine cancellation type based on current user
      let cancellationType: 'coach' | 'client' | 'admin' = 'client';
      if (user?.role === 'admin') {
        cancellationType = 'admin';
      } else if (user?.id === session.coach.id) {
        cancellationType = 'coach';
      } else if (user?.id === session.client.id) {
        cancellationType = 'client';
      }
      
      const requestBody = {
        reason: data.reason === 'other' ? data.customReason.trim() : data.reason,
        refundRequested: data.refundRequested,
        cancellationType,
        notifyParticipants: data.notifyParticipants,
      };
      
      const response = await fetch(`/api/sessions/${session.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: requestBody.reason,
          cancellationType: requestBody.cancellationType,
          refundRequested: requestBody.refundRequested,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to cancel session');
      }
      
      const result = await response.json();
      return result.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['session', session?.id] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      
      // Show success message with actual policy information
      if (result?.cancellationPolicy) {
        const policy = result.cancellationPolicy;
        console.log('Session cancelled successfully:', {
          type: policy.type,
          feeAmount: policy.feeAmount,
          refundPercentage: policy.refundPercentage,
          message: policy.message,
        });
      }
      
      // Reset form
      setFormData({
        reason: '',
        customReason: '',
        notifyParticipants: true,
        offerReschedule: false,
        refundRequested: false,
      });
      
      onSuccess?.();
      onClose();
    },
  });

  if (!session) return null;

  const getTimeUntilSession = () => {
    const now = new Date();
    const sessionTime = new Date(session.scheduledAt);
    const diffInHours = (sessionTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffInHours;
  };

  const getCancellationDetails = () => {
    const hoursUntilSession = getTimeUntilSession();
    const policy = session.cancellationPolicy || {
      freeUntilHours: 24,
      partialRefundUntilHours: 2,
      feeAmount: 25,
    };

    if (hoursUntilSession >= policy.freeUntilHours) {
      return {
        type: 'free',
        feeAmount: 0,
        refundAmount: 100,
        message: 'Free cancellation available',
      };
    } else if (hoursUntilSession >= policy.partialRefundUntilHours) {
      return {
        type: 'partial',
        feeAmount: policy.feeAmount,
        refundAmount: 100 - policy.feeAmount,
        message: `Cancellation fee applies ($${policy.feeAmount})`,
      };
    } else {
      return {
        type: 'late',
        feeAmount: 100,
        refundAmount: 0,
        message: 'Late cancellation - no refund available',
      };
    }
  };

  const cancellationDetails = getCancellationDetails();
  const hoursUntilSession = getTimeUntilSession();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.reason) {
      alert('Please select a cancellation reason');
      return;
    }

    if (formData.reason === 'other' && !formData.customReason.trim()) {
      alert('Please provide a custom reason');
      return;
    }

    cancelSessionMutation.mutate(formData);
  };

  const canCancel = () => {
    if (!user || !session) return false;
    return session.status === 'scheduled' && 
           (user.id === session.coach.id || user.id === session.client.id || user.role === 'admin');
  };

  if (!canCancel()) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Cancel Session</DialogTitle>
            <DialogDescription>
              You don&apos;t have permission to cancel this session or it has already been completed/cancelled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <X className="h-5 w-5 text-destructive" />
            <span>Cancel Session</span>
          </DialogTitle>
          <DialogDescription>
            Cancel &quot;{session.title}&quot; scheduled for {' '}
            {new Date(session.scheduledAt).toLocaleDateString()} at{' '}
            {new Date(session.scheduledAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cancellation Policy Alert */}
          <Alert className={`border-l-4 ${
            cancellationDetails.type === 'free' 
              ? 'border-l-green-500 bg-green-50' 
              : cancellationDetails.type === 'partial'
              ? 'border-l-yellow-500 bg-yellow-50'
              : 'border-l-red-500 bg-red-50'
          }`}>
            <AlertTriangle className={`h-4 w-4 ${
              cancellationDetails.type === 'free' 
                ? 'text-green-600' 
                : cancellationDetails.type === 'partial'
                ? 'text-yellow-600'
                : 'text-red-600'
            }`} />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">{cancellationDetails.message}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {hoursUntilSession > 0 
                        ? `${Math.round(hoursUntilSession)} hours until session`
                        : 'Session time has passed'
                      }
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>
                      {cancellationDetails.refundAmount > 0 
                        ? `${cancellationDetails.refundAmount}% refund`
                        : 'No refund'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Participants Info */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Participants to be notified:</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {session.coach.firstName.charAt(0)}{session.coach.lastName.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {session.coach.firstName} {session.coach.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">Coach</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {session.client.firstName.charAt(0)}{session.client.lastName.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {session.client.firstName} {session.client.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">Client</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cancellation Reason */}
          <div className="space-y-3">
            <Label htmlFor="reason">Reason for cancellation *</Label>
            <Select 
              value={formData.reason} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
            >
              <SelectTrigger data-testid="cancellation-reason-select">
                <SelectValue placeholder="Select a reason for cancellation" />
              </SelectTrigger>
              <SelectContent>
                {cancellationReasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Reason */}
          {formData.reason === 'other' && (
            <div className="space-y-3">
              <Label htmlFor="customReason">Please specify the reason *</Label>
              <Textarea
                id="customReason"
                value={formData.customReason}
                onChange={(e) => setFormData(prev => ({ ...prev, customReason: e.target.value }))}
                placeholder="Please provide more details about the cancellation reason..."
                rows={3}
                required
                data-testid="custom-reason-textarea"
              />
            </div>
          )}

          {/* Additional Details */}
          <div className="space-y-3">
            <Label htmlFor="additionalNotes">Additional notes (optional)</Label>
            <Textarea
              id="additionalNotes"
              placeholder="Any additional information you'd like to include..."
              rows={2}
            />
          </div>

          {/* Cancellation Options */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Cancellation options:</Label>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.notifyParticipants}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    notifyParticipants: e.target.checked 
                  }))}
                  className="rounded"
                />
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Send cancellation notification to participants</span>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.offerReschedule}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    offerReschedule: e.target.checked 
                  }))}
                  className="rounded"
                />
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-sm">Offer to reschedule instead of cancelling</span>
                </div>
              </label>

              {cancellationDetails.refundAmount > 0 && (
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.refundRequested}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      refundRequested: e.target.checked 
                    }))}
                    className="rounded"
                  />
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">
                      Request refund ({cancellationDetails.refundAmount}% of session fee)
                    </span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Warning for late cancellations */}
          {cancellationDetails.type === 'late' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Late Cancellation:</strong> This session is scheduled to start in less than 2 hours. 
                Late cancellations may result in fees and affect your cancellation history.
              </AlertDescription>
            </Alert>
          )}

          {/* Summary */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-medium">Cancellation Summary:</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Session fee:</span>
                <span>$150.00</span>
              </div>
              {cancellationDetails.feeAmount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Cancellation fee:</span>
                  <span>-${cancellationDetails.feeAmount}.00</span>
                </div>
              )}
              <div className="flex justify-between font-medium border-t pt-1">
                <span>Refund amount:</span>
                <span className={cancellationDetails.refundAmount > 0 ? 'text-green-600' : ''}>
                  ${(150 * cancellationDetails.refundAmount / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose} disabled={cancelSessionMutation.isPending} data-testid="keep-session-button">
            Keep Session
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit}
            disabled={cancelSessionMutation.isPending || !formData.reason}
            data-testid="cancel-session-button"
          >
            {cancelSessionMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <X className="mr-2 h-4 w-4" />
                Cancel Session
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
