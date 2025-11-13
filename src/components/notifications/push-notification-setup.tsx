'use client';

import { Bell, BellOff, Check, Smartphone, AlertCircle, Loader2, Info } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { usePushNotifications } from '@/hooks/use-push-notifications';

export function PushNotificationSetup() {
  const toast = useToast();
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    requestPermission,
  } = usePushNotifications();

  const [showDetails, setShowDetails] = useState(false);

  const handleEnablePush = async () => {
    const success = await subscribe();
    if (success) {
      toast.toast({
        title: 'Push notifications enabled',
        description: 'You will now receive push notifications for important updates',
        variant: 'success',
      });
    } else {
      toast.toast({
        title: 'Failed to enable push notifications',
        description: error || 'Please check your browser settings and try again',
        variant: 'destructive',
      });
    }
  };

  const handleDisablePush = async () => {
    const success = await unsubscribe();
    if (success) {
      toast.toast({
        title: 'Push notifications disabled',
        description: 'You will no longer receive push notifications',
        variant: 'default',
      });
    } else {
      toast.toast({
        title: 'Failed to disable push notifications',
        description: error || 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleRequestPermission = async () => {
    const newPermission = await requestPermission();
    if (newPermission === 'granted') {
      toast.toast({
        title: 'Permission granted',
        description: 'You can now enable push notifications',
        variant: 'success',
      });
    } else if (newPermission === 'denied') {
      toast.toast({
        title: 'Permission denied',
        description: 'Please enable notifications in your browser settings',
        variant: 'destructive',
      });
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser does not support push notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Push notifications require a modern browser with service worker support.
              Please update your browser or try a different one.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Push Notifications
          {isSubscribed && (
            <Badge variant="success" className="ml-2">
              <Check className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Receive real-time notifications even when Loom is not open
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Notification Permission</Label>
              <p className="text-sm text-muted-foreground">
                Browser permission status for notifications
              </p>
            </div>
            <Badge
              variant={
                permission === 'granted'
                  ? 'success'
                  : permission === 'denied'
                  ? 'destructive'
                  : 'outline'
              }
            >
              {permission === 'granted' && <Check className="h-3 w-3 mr-1" />}
              {permission === 'denied' && <BellOff className="h-3 w-3 mr-1" />}
              {permission === 'default' && <Bell className="h-3 w-3 mr-1" />}
              {permission === 'granted'
                ? 'Granted'
                : permission === 'denied'
                ? 'Denied'
                : 'Not Asked'}
            </Badge>
          </div>

          {permission === 'denied' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Notifications are blocked. Please enable them in your browser settings:
                <ul className="list-disc list-inside mt-2 text-sm">
                  <li>Chrome: Settings → Privacy & Security → Site Settings → Notifications</li>
                  <li>Firefox: Settings → Privacy & Security → Permissions → Notifications</li>
                  <li>Safari: Preferences → Websites → Notifications</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {permission === 'default' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You haven&apos;t granted notification permissions yet. Click the button below to enable
                notifications.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Subscription Toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="push-toggle" className="text-base font-medium">
                Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications for new messages, session reminders, and updates
              </p>
            </div>
            <Switch
              id="push-toggle"
              checked={isSubscribed}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleEnablePush();
                } else {
                  handleDisablePush();
                }
              }}
              disabled={isLoading || permission === 'denied' || permission === 'default'}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {permission === 'default' && (
            <Button onClick={handleRequestPermission} disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Request Permission
                </>
              )}
            </Button>
          )}

          {permission === 'granted' && !isSubscribed && (
            <Button onClick={handleEnablePush} disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Push Notifications
                </>
              )}
            </Button>
          )}

          {permission === 'granted' && isSubscribed && (
            <Button
              onClick={handleDisablePush}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disabling...
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4 mr-2" />
                  Disable Push Notifications
                </>
              )}
            </Button>
          )}

          <Button variant="ghost" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </div>

        {/* Details Section */}
        {showDetails && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium">Push Notification Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Browser Support:</span>
                <span className="font-medium">{isSupported ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Permission Status:</span>
                <span className="font-medium capitalize">{permission}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subscription Status:</span>
                <span className="font-medium">{isSubscribed ? 'Subscribed' : 'Not Subscribed'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Worker:</span>
                <span className="font-medium">
                  {'serviceWorker' in navigator ? 'Registered' : 'Not Available'}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-background rounded border">
              <h5 className="font-medium mb-2">What you&apos;ll receive:</h5>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• New message notifications</li>
                <li>• Session reminders (30 min and 5 min before)</li>
                <li>• Session confirmations and updates</li>
                <li>• Important system announcements</li>
              </ul>
            </div>

            <div className="mt-2 p-3 bg-background rounded border">
              <h5 className="font-medium mb-2">Privacy & Control:</h5>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• You can disable notifications at any time</li>
                <li>• Notifications respect your quiet hours settings</li>
                <li>• No personal data is stored on push servers</li>
                <li>• You control which notification types you receive</li>
              </ul>
            </div>
          </div>
        )}

        {/* Browser Instructions */}
        {permission === 'denied' && showDetails && (
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <h4 className="font-medium text-destructive mb-2">How to Re-enable Notifications</h4>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Google Chrome:</p>
                <ol className="list-decimal list-inside ml-2 text-muted-foreground">
                  <li>Click the lock icon in the address bar</li>
                  <li>Find &quot;Notifications&quot; and change to &quot;Allow&quot;</li>
                  <li>Refresh the page</li>
                </ol>
              </div>
              <div>
                <p className="font-medium">Mozilla Firefox:</p>
                <ol className="list-decimal list-inside ml-2 text-muted-foreground">
                  <li>Click the shield or lock icon in the address bar</li>
                  <li>Click &quot;Connection secure&quot; → &quot;More information&quot;</li>
                  <li>Go to Permissions tab and allow Notifications</li>
                  <li>Refresh the page</li>
                </ol>
              </div>
              <div>
                <p className="font-medium">Safari:</p>
                <ol className="list-decimal list-inside ml-2 text-muted-foreground">
                  <li>Open Safari Preferences</li>
                  <li>Go to Websites → Notifications</li>
                  <li>Find this website and change to &quot;Allow&quot;</li>
                  <li>Refresh the page</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
