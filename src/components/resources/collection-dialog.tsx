/**
 * Collection Dialog Component
 *
 * Modal for creating or editing collections:
 * - Name input
 * - Description textarea
 * - Icon picker/input
 * - Resource selection (optional)
 *
 * @module components/resources/collection-dialog
 */

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, FolderPlus } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ResourceCollection } from '@/types/resources';

const collectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
});

type CollectionFormData = z.infer<typeof collectionSchema>;

export interface CollectionDialogProps {
  collection?: ResourceCollection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CollectionFormData) => Promise<void>;
}

/**
 * CollectionDialog Component
 */
export function CollectionDialog({
  collection,
  open,
  onOpenChange,
  onSave,
}: CollectionDialogProps) {
  const isEditing = Boolean(collection);

  const form = useForm<CollectionFormData>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: '',
      description: '',
      icon: '📁',
    },
  });

  // Update form when collection changes
  useEffect(() => {
    if (collection) {
      form.reset({
        name: collection.name,
        description: collection.description || '',
        icon: collection.icon || '📁',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        icon: '📁',
      });
    }
  }, [collection, form]);

  const handleSubmit = async (data: CollectionFormData) => {
    await onSave(data);
    form.reset();
  };

  const handleClose = () => {
    if (form.formState.isSubmitting) return;
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5" />
            {isEditing ? 'Edit Collection' : 'Create Collection'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your collection details'
              : 'Create a new collection to organize your resources'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Icon */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon (Emoji)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="📁"
                      maxLength={10}
                      className="text-2xl"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Choose an emoji to represent this collection
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="My Collection" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this collection is for..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Help your clients understand when to use these resources
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dialog Footer */}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>{isEditing ? 'Update Collection' : 'Create Collection'}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
