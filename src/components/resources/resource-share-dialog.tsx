/**
 * Resource Share Dialog Component
 *
 * Dialog for sharing resources with clients:
 * - Share with all clients (bulk)
 * - Select specific clients
 * - Set permissions (view, download)
 * - Set expiration date
 * - Add optional message
 *
 * @module components/resources/resource-share-dialog
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Share2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResourceLibraryItem } from '@/types/resources';

const shareSchema = z.object({
  permission: z.enum(['view', 'download']),
  shareWithAll: z.boolean(),
  expiresAt: z.date().optional(),
  message: z.string().max(500).optional(),
});

type ShareFormData = z.infer<typeof shareSchema>;

export interface ResourceShareDialogProps {
  resource: ResourceLibraryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: (resourceId: string, data: ShareFormData) => Promise<void>;
}

/**
 * ResourceShareDialog Component
 */
export function ResourceShareDialog({
  resource,
  open,
  onOpenChange,
  onShare,
}: ResourceShareDialogProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ShareFormData>({
    resolver: zodResolver(shareSchema),
    defaultValues: {
      permission: 'view',
      shareWithAll: false,
      expiresAt: undefined,
      message: '',
    },
  });

  const shareWithAll = form.watch('shareWithAll');

  // Handle form submission
  const handleSubmit = async (data: ShareFormData) => {
    if (!resource) return;

    setIsSharing(true);
    setError(null);

    try {
      await onShare(resource.id, data);

      // Close dialog on success
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share resource');
    } finally {
      setIsSharing(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (isSharing) return; // Prevent closing during share

    form.reset();
    setError(null);
    onOpenChange(false);
  };

  if (!resource) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Resource
          </DialogTitle>
          <DialogDescription>
            Share "<span className="font-medium">{resource.filename}</span>" with your clients
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Share with All Clients Toggle */}
            <FormField
              control={form.control}
              name="shareWithAll"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Share with all clients
                    </FormLabel>
                    <FormDescription>
                      {field.value
                        ? 'This resource will be shared with all your current clients'
                        : 'Choose specific clients to share with (coming soon)'}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Permission Level */}
            <FormField
              control={form.control}
              name="permission"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permission Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select permission" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="view">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">View Only</span>
                          <span className="text-xs text-muted-foreground">
                            Clients can view but not download
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="download">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">View & Download</span>
                          <span className="text-xs text-muted-foreground">
                            Clients can view and download
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expiration Date */}
            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expiration Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>No expiration</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                      {field.value && (
                        <div className="p-3 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => field.onChange(undefined)}
                            className="w-full"
                          >
                            Clear Date
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Access will be automatically revoked after this date
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optional Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a note about this resource for your clients..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This message will be visible to clients when they access the resource
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* Already Shared Warning */}
            {resource.sharedWithAllClients && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 px-4 py-3 text-sm">
                This resource is already shared with all clients. Sharing again will update the
                permissions and expiration.
              </div>
            )}

            {/* Dialog Footer */}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSharing}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSharing || !shareWithAll}>
                {isSharing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Resource
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
