'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  UploadIcon, 
  XIcon, 
  FileIcon, 
  ImageIcon,
  VideoIcon,
  MusicIcon,
  FileTextIcon,
  FolderIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  TagIcon,
  EditIcon,
} from 'lucide-react';

export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  category: 'preparation' | 'notes' | 'recording' | 'resource' | 'personal' | 'document';
  description: string;
  tags: string[];
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  previewUrl?: string;
}

export interface FileUploadZoneProps {
  onFilesSelected?: (files: UploadFile[]) => void;
  onUploadComplete?: (results: any[]) => void;
  onUploadProgress?: (fileId: string, progress: number) => void;
  onFileRemove?: (fileId: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  autoUpload?: boolean;
  showPreview?: boolean;
  className?: string;
}

// File type configurations
const FILE_TYPE_CONFIG = {
  // Images
  'image/jpeg': { icon: ImageIcon, color: 'text-green-600', maxSize: 10 * 1024 * 1024 },
  'image/png': { icon: ImageIcon, color: 'text-green-600', maxSize: 10 * 1024 * 1024 },
  'image/gif': { icon: ImageIcon, color: 'text-green-600', maxSize: 10 * 1024 * 1024 },
  'image/webp': { icon: ImageIcon, color: 'text-green-600', maxSize: 10 * 1024 * 1024 },
  
  // Videos  
  'video/mp4': { icon: VideoIcon, color: 'text-purple-600', maxSize: 100 * 1024 * 1024 },
  'video/avi': { icon: VideoIcon, color: 'text-purple-600', maxSize: 100 * 1024 * 1024 },
  'video/mov': { icon: VideoIcon, color: 'text-purple-600', maxSize: 100 * 1024 * 1024 },
  
  // Audio
  'audio/mp3': { icon: MusicIcon, color: 'text-blue-600', maxSize: 50 * 1024 * 1024 },
  'audio/wav': { icon: MusicIcon, color: 'text-blue-600', maxSize: 50 * 1024 * 1024 },
  'audio/m4a': { icon: MusicIcon, color: 'text-blue-600', maxSize: 50 * 1024 * 1024 },
  
  // Documents
  'application/pdf': { icon: FileTextIcon, color: 'text-red-600', maxSize: 20 * 1024 * 1024 },
  'application/msword': { icon: FileTextIcon, color: 'text-blue-600', maxSize: 20 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileTextIcon, color: 'text-blue-600', maxSize: 20 * 1024 * 1024 },
  'application/vnd.ms-excel': { icon: FileTextIcon, color: 'text-green-600', maxSize: 20 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileTextIcon, color: 'text-green-600', maxSize: 20 * 1024 * 1024 },
  
  // Text
  'text/plain': { icon: FileTextIcon, color: 'text-gray-600', maxSize: 5 * 1024 * 1024 },
  'text/csv': { icon: FileTextIcon, color: 'text-orange-600', maxSize: 5 * 1024 * 1024 },
} as const;

const DEFAULT_ALLOWED_TYPES = Object.keys(FILE_TYPE_CONFIG);

// Security utilities
const sanitizePreviewUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    // Only allow blob URLs for local previews and data URLs for fallbacks
    if (!['blob:', 'data:'].includes(parsedUrl.protocol)) {
      console.warn('Invalid preview URL protocol blocked:', parsedUrl.protocol);
      return '';
    }
    return url;
  } catch {
    return '';
  }
};

// Enhanced file type validation
const isValidImageFile = (file: File): boolean => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return allowedImageTypes.includes(file.type);
};

// File content validation (basic header check)
const validateFileContent = async (file: File): Promise<boolean> => {
  try {
    if (!file.type.startsWith('image/')) return true;
    
    // Read first few bytes to validate image headers
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Check image signatures
    const signatures = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/gif': [0x47, 0x49, 0x46],
      'image/webp': [0x52, 0x49, 0x46, 0x46]
    };
    
    const expectedSignature = signatures[file.type as keyof typeof signatures];
    if (!expectedSignature) return true; // Allow unknown types for now
    
    return expectedSignature.every((byte, index) => bytes[index] === byte);
  } catch {
    return false;
  }
};

export function FileUploadZone({
  onFilesSelected,
  onUploadComplete,
  onUploadProgress,
  onFileRemove,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  autoUpload = false,
  showPreview = true,
  className = '',
}: FileUploadZoneProps) {
  const t = useTranslations('files');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [globalError, setGlobalError] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [editingFile, setEditingFile] = useState<UploadFile | null>(null);
  const [newTag, setNewTag] = useState('');

  // Enhanced file validation
  const validateFile = useCallback(async (file: File): Promise<{ valid: boolean; error?: string }> => {
    // Check file name for suspicious patterns
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|scr|vbs|js|jar)$/i,
      /\.\./,
      /[<>:"|?*]/
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      return {
        valid: false,
        error: 'File name contains invalid characters or suspicious extensions'
      };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Check file size
    const typeConfig = FILE_TYPE_CONFIG[file.type as keyof typeof FILE_TYPE_CONFIG];
    const maxSize = typeConfig?.maxSize || maxFileSize;
    
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size ${formatFileSize(file.size)} exceeds maximum allowed size ${formatFileSize(maxSize)}`
      };
    }

    // Validate file content
    const isValidContent = await validateFileContent(file);
    if (!isValidContent) {
      return {
        valid: false,
        error: 'File content validation failed - file may be corrupted or malicious'
      };
    }

    return { valid: true };
  }, [allowedTypes, maxFileSize]);

  // Handle file selection with async validation
  const handleFileSelection = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    setGlobalError('');

    // Check max files limit
    if (uploadFiles.length + fileArray.length > maxFiles) {
      setGlobalError(`Maximum ${maxFiles} files allowed. Current: ${uploadFiles.length}, Adding: ${fileArray.length}`);
      return;
    }

    // Process files with async validation
    const newUploadFiles: UploadFile[] = [];
    
    for (let index = 0; index < fileArray.length; index++) {
      const file = fileArray[index];
      const validation = await validateFile(file);
      
      // Create secure preview URL only for valid images
      let previewUrl: string | undefined;
      if (file.type.startsWith('image/') && validation.valid && isValidImageFile(file)) {
        try {
          const blobUrl = URL.createObjectURL(file);
          previewUrl = sanitizePreviewUrl(blobUrl);
        } catch (error) {
          console.error('Failed to create preview URL:', error);
        }
      }
      
      const uploadFile: UploadFile = {
        id: `${Date.now()}-${index}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        category: 'document',
        description: '',
        tags: [],
        progress: 0,
        status: validation.valid ? 'pending' : 'error',
        error: validation.error,
        previewUrl,
      };
      
      newUploadFiles.push(uploadFile);
    }

    const updatedFiles = [...uploadFiles, ...newUploadFiles];
    setUploadFiles(updatedFiles);
    onFilesSelected?.(updatedFiles);

    // Auto upload if enabled
    if (autoUpload) {
      uploadValidFiles(newUploadFiles);
    }
  }, [uploadFiles, maxFiles, validateFile, onFilesSelected, autoUpload]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files);
    }
  }, [handleFileSelection]);

  // File input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  // Remove file
  const removeFile = (fileId: string) => {
    const file = uploadFiles.find(f => f.id === fileId);
    if (file?.previewUrl) {
      URL.revokeObjectURL(file.previewUrl);
    }
    
    const updatedFiles = uploadFiles.filter(f => f.id !== fileId);
    setUploadFiles(updatedFiles);
    onFileRemove?.(fileId);
  };

  // Update file metadata
  const updateFile = (fileId: string, updates: Partial<UploadFile>) => {
    setUploadFiles(files => 
      files.map(f => f.id === fileId ? { ...f, ...updates } : f)
    );
  };

  // Upload files
  const uploadValidFiles = async (filesToUpload?: UploadFile[]) => {
    const files = filesToUpload || uploadFiles.filter(f => f.status === 'pending');
    if (files.length === 0) return;

    setUploading(true);
    const results: any[] = [];

    for (const uploadFile of files) {
      try {
        updateFile(uploadFile.id, { status: 'uploading', progress: 0 });

        // Create form data
        const formData = new FormData();
        formData.append('file', uploadFile.file);
        formData.append('fileCategory', uploadFile.category);
        formData.append('description', uploadFile.description);
        formData.append('tags', uploadFile.tags.join(','));

        // Upload with progress tracking
        const xhr = new XMLHttpRequest();
        
        // Progress handler
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            updateFile(uploadFile.id, { progress });
            onUploadProgress?.(uploadFile.id, progress);
          }
        };

        // Complete handler
        const uploadPromise = new Promise<any>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200) {
              try {
                const result = JSON.parse(xhr.responseText);
                resolve(result);
              } catch (error) {
                reject(new Error('Invalid response format'));
              }
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };
          
          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.ontimeout = () => reject(new Error('Upload timeout'));
        });

        // Start upload
        xhr.open('POST', '/api/files');
        xhr.send(formData);

        const result = await uploadPromise;
        
        updateFile(uploadFile.id, { 
          status: 'completed', 
          progress: 100 
        });
        
        results.push(result);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        updateFile(uploadFile.id, { 
          status: 'error', 
          error: errorMessage 
        });
      }
    }

    setUploading(false);
    onUploadComplete?.(results);
  };

  // Utility functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    const config = FILE_TYPE_CONFIG[fileType as keyof typeof FILE_TYPE_CONFIG];
    const IconComponent = config?.icon || FileIcon;
    const color = config?.color || 'text-gray-600';
    return <IconComponent className={`h-5 w-5 ${color}`} />;
  };

  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-600';
      case 'uploading': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const addTagToFile = (fileId: string) => {
    if (!newTag.trim()) return;
    
    const file = uploadFiles.find(f => f.id === fileId);
    if (file && !file.tags.includes(newTag.trim())) {
      updateFile(fileId, { 
        tags: [...file.tags, newTag.trim()] 
      });
    }
    setNewTag('');
  };

  const removeTagFromFile = (fileId: string, tagIndex: number) => {
    const file = uploadFiles.find(f => f.id === fileId);
    if (file) {
      updateFile(fileId, { 
        tags: file.tags.filter((_, i) => i !== tagIndex) 
      });
    }
  };

  const validFiles = uploadFiles.filter(f => f.status !== 'error');
  const completedFiles = uploadFiles.filter(f => f.status === 'completed');
  const errorFiles = uploadFiles.filter(f => f.status === 'error');

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Global Error */}
      {globalError && (
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>{globalError}</AlertDescription>
        </Alert>
      )}

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadIcon className="h-5 w-5" />
            {t('upload.title', { defaultValue: 'Upload Files' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={allowedTypes.join(',')}
              onChange={handleInputChange}
              className="hidden"
            />
            
            <div className="space-y-4">
              <FolderIcon className="h-12 w-12 text-gray-400 mx-auto" />
              
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {dragActive 
                    ? t('upload.dropHere', { defaultValue: 'Drop files here' })
                    : t('upload.dragOrClick', { defaultValue: 'Drag and drop files here, or click to browse' })
                  }
                </p>
                <p className="text-sm text-gray-600">
                  Maximum {maxFiles} files, up to {formatFileSize(maxFileSize)} each
                </p>
              </div>
              
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="mx-auto"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {t('upload.browse', { defaultValue: 'Browse Files' })}
              </Button>
              
              {/* Allowed file types */}
              <div className="flex flex-wrap gap-2 justify-center">
                {allowedTypes.slice(0, 5).map(type => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {type.split('/')[1]?.toUpperCase()}
                  </Badge>
                ))}
                {allowedTypes.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{allowedTypes.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {uploadFiles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Selected Files ({uploadFiles.length}/{maxFiles})
              </CardTitle>
              <div className="flex items-center gap-2">
                {completedFiles.length > 0 && (
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                    {completedFiles.length} completed
                  </Badge>
                )}
                {errorFiles.length > 0 && (
                  <Badge variant="outline" className="text-red-600">
                    <AlertTriangleIcon className="h-3 w-3 mr-1" />
                    {errorFiles.length} errors
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploadFiles.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className={`border rounded-lg p-4 ${
                  uploadFile.status === 'error' ? 'border-red-200 bg-red-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* File Icon/Preview */}
                  <div className="flex-shrink-0">
                    {showPreview && uploadFile.previewUrl && sanitizePreviewUrl(uploadFile.previewUrl) ? (
                      <div className="relative w-12 h-12">
                        <Image
                          src={sanitizePreviewUrl(uploadFile.previewUrl)}
                          alt={`Preview of ${uploadFile.name}`}
                          width={48}
                          height={48}
                          className="object-cover rounded"
                          unoptimized={true} // For blob URLs
                          onError={() => {
                            console.error('Failed to load preview:', uploadFile.previewUrl);
                          }}
                          loader={({ src }) => {
                            return sanitizePreviewUrl(src) || '/images/fallback-image.svg';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded">
                        {getFileIcon(uploadFile.type)}
                      </div>
                    )}
                  </div>

                  {/* File Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm truncate pr-2">
                        {uploadFile.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getStatusColor(uploadFile.status)}`}
                        >
                          {uploadFile.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingFile(uploadFile)}
                          disabled={uploadFile.status === 'uploading'}
                        >
                          <EditIcon className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadFile.id)}
                          disabled={uploadFile.status === 'uploading'}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                      <span>{formatFileSize(uploadFile.size)}</span>
                      <span>Category: {uploadFile.category}</span>
                      {uploadFile.tags.length > 0 && (
                        <span>Tags: {uploadFile.tags.length}</span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {uploadFile.status === 'uploading' && (
                      <Progress value={uploadFile.progress} className="mb-2" />
                    )}

                    {/* Error Message */}
                    {uploadFile.error && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertTriangleIcon className="h-4 w-4" />
                        <AlertDescription>{uploadFile.error}</AlertDescription>
                      </Alert>
                    )}

                    {/* Description Preview */}
                    {uploadFile.description && (
                      <p className="text-xs text-gray-600 truncate mt-1">
                        {uploadFile.description}
                      </p>
                    )}

                    {/* Tags Preview */}
                    {uploadFile.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {uploadFile.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {uploadFile.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{uploadFile.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upload Actions */}
      {!autoUpload && validFiles.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {validFiles.length} files ready to upload
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setUploadFiles([])}
              disabled={uploading}
            >
              Clear All
            </Button>
            <Button
              onClick={() => uploadValidFiles()}
              disabled={uploading || validFiles.filter(f => f.status === 'pending').length === 0}
            >
              {uploading ? 'Uploading...' : `Upload ${validFiles.filter(f => f.status === 'pending').length} Files`}
            </Button>
          </div>
        </div>
      )}

      {/* File Edit Dialog */}
      <Dialog open={!!editingFile} onOpenChange={() => setEditingFile(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit File Details</DialogTitle>
          </DialogHeader>
          {editingFile && (
            <div className="space-y-4">
              {/* File Preview */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                {showPreview && editingFile.previewUrl && sanitizePreviewUrl(editingFile.previewUrl) ? (
                  <div className="relative w-16 h-16">
                    <Image
                      src={sanitizePreviewUrl(editingFile.previewUrl)}
                      alt={`Preview of ${editingFile.name}`}
                      width={64}
                      height={64}
                      className="object-cover rounded"
                      unoptimized={true} // For blob URLs
                      onError={() => {
                        console.error('Failed to load preview:', editingFile.previewUrl);
                      }}
                      loader={({ src }) => {
                        return sanitizePreviewUrl(src) || '/images/fallback-image.svg';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded">
                    {getFileIcon(editingFile.type)}
                  </div>
                )}
                <div>
                  <h4 className="font-medium">{editingFile.name}</h4>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(editingFile.size)} • {editingFile.type}
                  </p>
                </div>
              </div>

              {/* Category */}
              <div>
                <Label>Category</Label>
                <Select
                  value={editingFile.category}
                  onValueChange={(value: any) => 
                    updateFile(editingFile.id, { category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preparation">Preparation</SelectItem>
                    <SelectItem value="notes">Notes</SelectItem>
                    <SelectItem value="recording">Recording</SelectItem>
                    <SelectItem value="resource">Resource</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingFile.description}
                  onChange={(e) => 
                    updateFile(editingFile.id, { description: e.target.value })
                  }
                  placeholder="Add a description for this file..."
                  rows={3}
                />
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTagToFile(editingFile.id);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addTagToFile(editingFile.id)}
                      disabled={!newTag.trim()}
                    >
                      <TagIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {editingFile.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editingFile.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTagFromFile(editingFile.id, index)}
                            className="hover:text-red-600"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditingFile(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}