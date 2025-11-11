'use client';

import { Calendar, Copy, Download, ExternalLink, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CalendarSubscriptionProps {
  userId: string;
  /**
   * Authentication token for calendar feed access
   * This should be a secure, long-lived token specifically for calendar access
   */
  feedToken?: string;
}

export function CalendarSubscription({ userId, feedToken }: CalendarSubscriptionProps) {
  const t = useTranslations('calendar');
  const [isCopied, setIsCopied] = useState(false);

  // Generate feed URL
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || '';

  const feedUrl = `${baseUrl}/api/calendar/feed?token=${feedToken || 'YOUR_TOKEN'}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setIsCopied(true);
      toast.success('Feed URL copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Calendar Subscription
          </CardTitle>
          <CardDescription>
            Subscribe to your coaching sessions in your favorite calendar app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Feed URL */}
          <div className="space-y-2">
            <Label htmlFor="feed-url">Calendar Feed URL</Label>
            <div className="flex gap-2">
              <Input
                id="feed-url"
                value={feedUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                aria-label="Copy feed URL"
              >
                <Copy className={`h-4 w-4 ${isCopied ? 'text-green-600' : ''}`} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This URL is private and personal to you. Don't share it with others.
            </p>
          </div>

          {/* Instructions Tabs */}
          <Tabs defaultValue="apple" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="apple">Apple Calendar</TabsTrigger>
              <TabsTrigger value="google">Google Calendar</TabsTrigger>
              <TabsTrigger value="outlook">Outlook</TabsTrigger>
            </TabsList>

            {/* Apple Calendar Instructions */}
            <TabsContent value="apple" className="space-y-3">
              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="mb-3 font-semibold">Subscribe in Apple Calendar:</h4>
                <ol className="ml-4 list-decimal space-y-2 text-sm">
                  <li>Copy the feed URL above</li>
                  <li>Open Apple Calendar</li>
                  <li>Go to <strong>File → New Calendar Subscription</strong></li>
                  <li>Paste the feed URL</li>
                  <li>Click <strong>Subscribe</strong></li>
                  <li>Choose update frequency (recommended: Every hour)</li>
                  <li>Click <strong>OK</strong></li>
                </ol>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Tip</AlertTitle>
                <AlertDescription>
                  Your sessions will automatically update in your calendar. New sessions appear
                  within an hour.
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* Google Calendar Instructions */}
            <TabsContent value="google" className="space-y-3">
              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="mb-3 font-semibold">Subscribe in Google Calendar:</h4>
                <ol className="ml-4 list-decimal space-y-2 text-sm">
                  <li>Copy the feed URL above</li>
                  <li>Open <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Calendar</a></li>
                  <li>Click the <strong>+</strong> next to "Other calendars"</li>
                  <li>Select <strong>From URL</strong></li>
                  <li>Paste the feed URL</li>
                  <li>Click <strong>Add calendar</strong></li>
                </ol>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>
                  Google Calendar updates subscribed calendars every few hours. Changes may take
                  2-8 hours to appear.
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* Outlook Instructions */}
            <TabsContent value="outlook" className="space-y-3">
              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="mb-3 font-semibold">Subscribe in Outlook:</h4>
                <ol className="ml-4 list-decimal space-y-2 text-sm">
                  <li>Copy the feed URL above</li>
                  <li>Open Outlook Calendar</li>
                  <li>Go to <strong>Add Calendar → Subscribe from web</strong></li>
                  <li>Paste the feed URL</li>
                  <li>Give your calendar a name (e.g., "Loom Coaching")</li>
                  <li>Click <strong>Import</strong></li>
                </ol>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Alternative Method</AlertTitle>
                <AlertDescription>
                  In Outlook.com, go to Settings → View all Outlook settings → Calendar → Shared
                  calendars → Subscribe from web.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://calendar.google.com/calendar/u/0/r/settings/addbyurl', '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Google Calendar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('webcal://' + feedUrl.replace(/^https?:\/\//, ''), '_self')}
            >
              <Download className="mr-2 h-4 w-4" />
              Subscribe in Default App
            </Button>
          </div>

          {/* Security Note */}
          <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900 dark:text-amber-100">Privacy & Security</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              This calendar feed URL is unique to you and should be kept private. Anyone with
              this URL can see your session schedule. If you think your URL has been compromised,
              contact support to regenerate it.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
