/**
 * Resource Upload Dialog Component
 *
 * Modal dialog for uploading resources with:
 * - File drag & drop
 * - File type validation
 * - Resource metadata form (category, tags, description)
 * - Collection assignment
 * - Upload progress
 * - Error handling
 *
 * @module components/resources/resource-upload-dialog
 */

'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';
import type { ResourceCategory, ResourceCollection } from '@/types/resources';

const CATEGORY_OPTIONS: { value: ResourceCategory; label: string }[] = [
  { value: 'worksheet', label: 'Worksheet' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'article', label: 'Article' },
  { value: 'template', label: 'Template' },
  { value: 'guide', label: 'Guide' },
  { value: 'other', label: 'Other' },
];

// Max file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Accepted file types
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
  'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
  'audio/*': ['.mp3', '.wav', '.m4a', '.ogg'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
};

const uploadSchema = z.object({
  category: z.enum(['worksheet', 'video', 'audio', 'article', 'template', 'guide', 'other']),
  tags: z.string().optional(),
  description: z.string().max(1000).optional(),
  collectionId: z.string().optional(),
});

type UploadFormData = z.infer<typeof uploadSchema>;

export interface ResourceUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections?: ResourceCollection[];
  onUpload: (file: File, metadata: UploadFormData) => Promise<void>;
}

/**
 * ResourceUploadDialog Component
 */
export function ResourceUploadDialog({
  open,
  onOpenChange,
  collections = [],
  onUpload,
}: ResourceUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      category: 'other',
      tags: '',
      description: '',
      collectionId: undefined,
    },
  });

  // Dropzone for file upload
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError(`File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      } else {
        setError('File type not supported. Please upload a valid document, image, video, or audio file.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    accept: ACCEPTED_FILE_TYPES,
  });

  // Handle form submission
  const handleSubmit = async (data: UploadFormData) => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate progress (in real implementation, use XMLHttpRequest or similar for real progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      await onUpload(file, data);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Reset form and close dialog
      setTimeout(() => {
        handleClose();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (isUploading) return; // Prevent closing during upload

    setFile(null);
    setError(null);
    setUploadProgress(0);
    form.reset();
    onOpenChange(false);
  };

  // Remove selected file
  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
  };

  // Parse tags from comma-separated string
  const parseTags = (tagsString: string): string[] => {
    return tagsString
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Resource</DialogTitle>
          <DialogDescription>
            Add a new resource to your library. Maximum file size: 100MB.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* File Upload Area */}
            {!file ? (
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary hover:bg-accent'
                )}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  {isDragActive ? 'Drop file here' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, Word, Excel, PowerPoint, images, videos, audio (max 100MB)
                </p>
              </div>
            ) : (
              <div className="border rounded-lg p-4 flex items-center gap-3">
                <FileText className="w-10 h-10 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                {!isUploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="mindfulness, anxiety, goals (comma-separated)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Add tags to help organize and find resources (comma-separated)
                  </FormDescription>
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
                      placeholder="Describe this resource and when to use it..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Collection */}
            {collections.length > 0 && (
              <FormField
                control={form.control}
                name="collectionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add to Collection (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select collection" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {collections.map((collection) => (
                          <SelectItem key={collection.id} value={collection.id}>
                            {collection.icon} {collection.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Dialog Footer */}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!file || isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
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
