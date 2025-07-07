'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle,
  Calendar,
  Mail,
  RefreshCw,
  DollarSign,
  Home,
  MessageSquare
} from 'lucide-react';

interface CancellationResult {
  sessionId: string;
  sessionTitle: string;
  originalDate: string;
  reason: string;
  refundAmount: number;
  feeCharged: number;
  notificationsSent: boolean;
  rescheduleOffered: boolean;
  confirmationNumber: string;
}

interface SessionCancellationConfirmationProps {
  result: CancellationResult;
  onClose: () => void;
}

export function SessionCancellationConfirmation({ 
  result, 
  onClose 
}: SessionCancellationConfirmationProps) {

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Success Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Session Cancelled Successfully</h2>
              <p className="text-muted-foreground">
                Your session "{result.sessionTitle}" has been cancelled
              </p>
            </div>
            <Badge variant="outline" className="text-muted-foreground">
              Confirmation #{result.confirmationNumber}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Cancellation Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Cancellation Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Cancelled Session</h4>
              <p className="text-sm text-muted-foreground">{result.sessionTitle}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(result.originalDate).toLocaleDateString()} at{' '}
                {new Date(result.originalDate).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Cancellation Reason</h4>
              <p className="text-sm text-muted-foreground capitalize">
                {result.reason.replace('_', ' ')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      {(result.refundAmount > 0 || result.feeCharged > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Financial Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.refundAmount > 0 && (
                <Alert className="border-green-200 bg-green-50">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <div className="flex justify-between items-center">
                      <span>Refund Amount:</span>
                      <span className="font-medium text-green-600">
                        +{formatCurrency(result.refundAmount)}
                      </span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      Your refund will be processed within 3-5 business days
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {result.feeCharged > 0 && (
                <Alert className="border-red-200 bg-red-50">
                  <DollarSign className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <div className="flex justify-between items-center">
                      <span>Cancellation Fee:</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(result.feeCharged)}
                      </span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">
                      Fee charged due to late cancellation policy
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {result.refundAmount === 0 && result.feeCharged === 0 && (
                <Alert>
                  <DollarSign className="h-4 w-4" />
                  <AlertDescription>
                    No financial adjustments were made for this cancellation
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications & Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>What happens next?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {result.notificationsSent && (
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail className="w-3 h-3 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Notifications sent</p>
                  <p className="text-sm text-muted-foreground">
                    All participants have been notified of the cancellation via email
                  </p>
                </div>
              </div>
            )}

            {result.rescheduleOffered && (
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <RefreshCw className="w-3 h-3 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Reschedule offer sent</p>
                  <p className="text-sm text-muted-foreground">
                    The other participant will receive an option to reschedule instead of cancel
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Calendar className="w-3 h-3 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Calendar updated</p>
                <p className="text-sm text-muted-foreground">
                  The session has been removed from all calendars
                </p>
              </div>
            </div>

            {result.refundAmount > 0 && (
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <DollarSign className="w-3 h-3 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Refund processing</p>
                  <p className="text-sm text-muted-foreground">
                    Your refund will appear in your original payment method within 3-5 business days
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Need Help */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              If you have questions about this cancellation or need assistance with rescheduling:
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm">
                <MessageSquare className="mr-2 h-4 w-4" />
                Contact Support
              </Button>
              <Button variant="outline" size="sm">
                <Calendar className="mr-2 h-4 w-4" />
                Book New Session
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-center space-x-4">
        <Button onClick={onClose} className="min-w-[120px]">
          <Home className="mr-2 h-4 w-4" />
          Return to Dashboard
        </Button>
      </div>

      {/* Footer Note */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          A confirmation email has been sent to your registered email address.
          <br />
          Keep your confirmation number ({result.confirmationNumber}) for your records.
        </p>
      </div>
    </div>
  );
}