'use client';

import React from 'react';
import Image from 'next/image';
import { 
  X, 
  Download, 
  Share2, 
  Edit3, 
  Trash2, 
  ExternalLink,
  File,
  Image as ImageIcon,
  FileText,
  Video,
  Music
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileMetadata } from '@/lib/services/file-management-service';

interface FilePreviewProps {
  file: FileMetadata;
  open: boolean;
  onClose: () => void;
  onShare?: (file: FileMetadata) => void;
  onDelete?: (fileId: string) => void;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// URL sanitization utility
const sanitizeUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    // Only allow HTTPS URLs and data URLs for fallbacks
    if (!['https:', 'data:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol');
    }
    // Additional domain validation for storage URLs
    if (parsedUrl.protocol === 'https:') {
      // Add your trusted storage domains here
      const trustedDomains = [
        'supabase.co', 
        'supabasecdn.com',
        // Add other trusted storage domains
      ];
      const isValidDomain = trustedDomains.some(domain => 
        parsedUrl.hostname.includes(domain)
      );
      if (!isValidDomain && !parsedUrl.hostname.includes('localhost')) {
        console.warn('Untrusted domain blocked:', parsedUrl.hostname);
        return '';
      }
    }
    return url;
  } catch {
    return '';
  }
};

// File type validation
const isValidFileType = (mimeType: string, expectedType: string): boolean => {
  const allowedTypes = {
    'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    'video': ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime'],
    'audio': ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mpeg'],
    'pdf': ['application/pdf'],
    'text': ['text/plain', 'text/csv', 'text/html', 'text/markdown']
  };
  
  const validTypes = allowedTypes[expectedType as keyof typeof allowedTypes] || [];
  return validTypes.includes(mimeType);
};

const FilePreviewContent = ({ file }: { file: FileMetadata }) => {
  const { fileType, mimeType, storageUrl, name } = file;
  
  // Sanitize the storage URL
  const sanitizedUrl = sanitizeUrl(storageUrl);
  
  if (!sanitizedUrl) {
    return (
      <div className="flex items-center justify-center bg-red-50 rounded-lg p-8">
        <div className="text-center">
          <File className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-2">Invalid file URL</p>
          <p className="text-sm text-red-500">This file cannot be previewed due to security restrictions.</p>
        </div>
      </div>
    );
  }

  // Image preview
  if (fileType === 'image' && isValidFileType(mimeType, 'image')) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg p-4">
        <div className="relative max-w-full max-h-96">
          <Image
            src={sanitizedUrl}
            alt={`Preview of ${name}`}
            width={600}
            height={400}
            style={{
              maxWidth: '100%',
              maxHeight: '384px',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain'
            }}
            className="rounded"
            unoptimized={true} // For external URLs
            onError={() => {
              console.error('Failed to load image:', sanitizedUrl);
            }}
            loader={({ src }) => {
              // Custom loader for secure URL handling
              return sanitizeUrl(src) || '/images/fallback-image.svg';
            }}
          />
        </div>
      </div>
    );
  }

  // Video preview
  if (fileType === 'video' && isValidFileType(mimeType, 'video')) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg p-4">
        <video 
          controls 
          className="max-w-full max-h-96 rounded"
          preload="metadata"
          controlsList="nodownload" // Prevent unauthorized downloads
          onError={() => {
            console.error('Failed to load video:', sanitizedUrl);
          }}
        >
          <source src={sanitizedUrl} type={mimeType} />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  // Audio preview
  if (fileType === 'audio' && isValidFileType(mimeType, 'audio')) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg p-8">
        <div className="text-center">
          <Music className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <audio 
            controls 
            className="w-full max-w-sm"
            controlsList="nodownload" // Prevent unauthorized downloads
            onError={() => {
              console.error('Failed to load audio:', sanitizedUrl);
            }}
          >
            <source src={sanitizedUrl} type={mimeType} />
            Your browser does not support the audio tag.
          </audio>
        </div>
      </div>
    );
  }

  // PDF preview (would need PDF.js or similar in production)
  if (fileType === 'pdf' && isValidFileType(mimeType, 'pdf')) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg p-8">
        <div className="text-center">
          <FileText className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">PDF Preview</p>
          <Button asChild>
            <a 
              href={sanitizedUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!sanitizedUrl) {
                  e.preventDefault();
                  console.error('Invalid PDF URL blocked');
                }
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </a>
          </Button>
        </div>
      </div>
    );
  }

  // Text file preview
  if (fileType === 'text' && isValidFileType(mimeType, 'text')) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-center text-gray-600 mb-4">
          <FileText className="h-12 w-12 mx-auto mb-2" />
          <p>Text file preview would be shown here</p>
          <p className="text-sm">In production, fetch and display file contents securely</p>
        </div>
        <Button asChild>
          <a 
            href={sanitizedUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!sanitizedUrl) {
                e.preventDefault();
                console.error('Invalid text file URL blocked');
              }
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </a>
        </Button>
      </div>
    );
  }

  // Default preview for other file types
  return (
    <div className="flex items-center justify-center bg-gray-100 rounded-lg p-8">
      <div className="text-center">
        <File className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">No preview available</p>
        <p className="text-sm text-gray-500 mb-4">
          {fileType} • {formatFileSize(file.sizeBytes)}
        </p>
        <Button asChild>
          <a 
            href={sanitizedUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!sanitizedUrl) {
                e.preventDefault();
                console.error('Invalid file URL blocked');
              }
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </a>
        </Button>
      </div>
    </div>
  );
};

export function FilePreview({ file, open, onClose, onShare, onDelete }: FilePreviewProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="truncate">{file.name}</span>
              {file.isPublic && (
                <Badge variant="secondary">Public</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={sanitizeUrl(file.storageUrl)} 
                  download={file.originalName}
                  onClick={(e) => {
                    if (!sanitizeUrl(file.storageUrl)) {
                      e.preventDefault();
                      console.error('Invalid download URL blocked');
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              {onShare && (
                <Button variant="outline" size="sm" onClick={() => onShare(file)}>
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onDelete(file.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* File preview */}
            <div className="lg:col-span-2">
              <ScrollArea className="h-full">
                <FilePreviewContent file={file} />
              </ScrollArea>
            </div>

            {/* File details */}
            <div className="border-l pl-6">
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">File Details</h3>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="font-medium text-gray-600">Original name:</dt>
                        <dd className="break-all">{file.originalName}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-600">Size:</dt>
                        <dd>{formatFileSize(file.sizeBytes)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-600">Type:</dt>
                        <dd>{file.mimeType}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-600">Created:</dt>
                        <dd>{formatDate(file.createdAt)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-600">Modified:</dt>
                        <dd>{formatDate(file.updatedAt)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-600">Downloads:</dt>
                        <dd>{file.downloadCount}</dd>
                      </div>
                      {file.lastAccessedAt && (
                        <div>
                          <dt className="font-medium text-gray-600">Last accessed:</dt>
                          <dd>{formatDate(file.lastAccessedAt)}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {file.description && (
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-sm text-gray-600">{file.description}</p>
                    </div>
                  )}

                  {file.tags.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-1">
                        {file.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {file.ownerName && (
                    <div>
                      <h3 className="font-semibold mb-2">Owner</h3>
                      <p className="text-sm text-gray-600">{file.ownerName}</p>
                    </div>
                  )}

                  {file.folderName && (
                    <div>
                      <h3 className="font-semibold mb-2">Folder</h3>
                      <p className="text-sm text-gray-600">{file.folderName}</p>
                    </div>
                  )}

                  {file.sharedWith && file.sharedWith.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Shared with</h3>
                      <p className="text-sm text-gray-600">
                        {file.sharedWith.length} user(s)
                      </p>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold mb-2">Versions</h3>
                    <p className="text-sm text-gray-600">
                      Version {file.version}
                      {file.versions && file.versions.length > 0 && (
                        <span> • {file.versions.length} older version(s)</span>
                      )}
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}