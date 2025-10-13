'use client';

import { Upload, X, Image, File, AlertCircle } from 'lucide-react';
import NextImage from 'next/image';
import { useState, useRef, useCallback } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { config } from '@/lib/config';
import { cn } from '@/lib/utils';
import { validationUtils } from '@/lib/validation/common';

export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  acceptedTypes?: string[];
  maxSize?: number;
  currentFile?: string | null; // URL of currently uploaded file
  disabled?: boolean;
  className?: string;
  variant?: 'avatar' | 'document' | 'image';
  showPreview?: boolean;
  uploadProgress?: number;
  error?: string | null;
}

/**
 * Reusable file upload component with drag & drop support
 * Handles image preview, validation, and upload progress
 */
export function FileUpload({
  onFileSelect,
  onFileRemove,
  acceptedTypes = ['image/*'],
  maxSize = config.file.AVATAR_MAX_SIZE,
  currentFile,
  disabled = false,
  className,
  variant = 'image',
  showPreview = true,
  uploadProgress,
  error,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUploading = uploadProgress !== undefined && uploadProgress < 100;

  const handleFileValidation = useCallback((file: File) => {
    const validation = validationUtils.validateFile(file, maxSize, acceptedTypes);
    return validation;
  }, [maxSize, acceptedTypes]);

  const handleFileSelect = useCallback((file: File) => {
    const validation = handleFileValidation(file);
    
    if (!validation.isValid) {
      return;
    }

    // Create preview for images
    if (file.type.startsWith('image/') && showPreview) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    onFileSelect(file);
  }, [handleFileValidation, onFileSelect, showPreview]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled || isUploading) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [disabled, isUploading, handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileRemove?.();
  }, [onFileRemove]);

  const openFileDialog = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'avatar':
        return 'w-32 h-32 rounded-full';
      case 'document':
        return 'w-full h-32 rounded-lg';
      default:
        return 'w-full h-48 rounded-lg';
    }
  };

  const displayImage = preview || currentFile;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed transition-colors cursor-pointer',
          'flex flex-col items-center justify-center p-6',
          getVariantStyles(),
          isDragOver && !disabled && !isUploading
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          disabled || isUploading
            ? 'cursor-not-allowed opacity-50'
            : 'hover:bg-muted/20',
          error && 'border-destructive bg-destructive/5'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
        role="button"
        tabIndex={disabled || isUploading ? -1 : 0}
        aria-label="Upload file"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFileDialog();
          }
        }}
      >
        {isUploading ? (
          <div className="text-center space-y-2">
            <Upload className="h-8 w-8 text-muted-foreground animate-pulse" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
            {uploadProgress !== undefined && (
              <Progress value={uploadProgress} className="w-full max-w-xs" />
            )}
          </div>
        ) : displayImage ? (
          <div className="relative group">
            <NextImage
              src={displayImage}
              alt={variant === 'avatar' ? 'Profile picture preview' : 'File preview'}
              width={variant === 'avatar' ? 128 : 400}
              height={variant === 'avatar' ? 128 : 300}
              className={cn(
                'object-cover',
                variant === 'avatar' ? 'w-32 h-32 rounded-full' : 'max-w-full max-h-full rounded'
              )}
              onError={(e) => {
                // Fallback for broken images
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            {!disabled && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-2">
            {variant === 'avatar' ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image className="h-8 w-8 text-muted-foreground" />
            ) : variant === 'document' ? (
              <File className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {variant === 'avatar' 
                  ? 'Upload profile picture' 
                  : 'Drop files here or click to upload'
                }
              </p>
              <p className="text-xs text-muted-foreground">
                {acceptedTypes.includes('image/*') ? 'Images' : 'Files'} up to{' '}
                {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
        disabled={disabled || isUploading}
        aria-hidden="true"
      />

      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Action buttons for non-avatar variants */}
      {variant !== 'avatar' && (displayImage || currentFile) && !disabled && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openFileDialog}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Replace
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={isUploading}
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Avatar-specific upload component
 */
export interface AvatarUploadProps extends Omit<FileUploadProps, 'variant' | 'acceptedTypes'> {
  userName?: string;
}

export function AvatarUpload({ userName, ...props }: AvatarUploadProps) {
  return (
    <FileUpload
      {...props}
      variant="avatar"
      acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
      maxSize={config.file.AVATAR_MAX_SIZE}
      aria-label={`Upload profile picture${userName ? ` for ${userName}` : ''}`}
    />
  );
}

/**
 * Document upload component
 */
export function DocumentUpload(props: Omit<FileUploadProps, 'variant'>) {
  return (
    <FileUpload
      {...props}
      variant="document"
      maxSize={config.file.DOCUMENT_MAX_SIZE}
    />
  );
}