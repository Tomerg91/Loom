/**
 * Resource Card Component
 *
 * Displays an individual resource in card format with:
 * - File type icon and preview
 * - Resource metadata (name, category, size)
 * - Action buttons (view, download, share, delete)
 * - Analytics badges (views, completions)
 * - Responsive grid/list layouts
 *
 * @module components/resources/resource-card
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  File,
  Download,
  Eye,
  Share2,
  MoreVertical,
  Trash2,
  Edit,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ResourceLibraryItem, ResourceCategory } from '@/types/resources';

/**
 * Get icon component for file type
 */
function getFileIcon(fileType: string): React.ComponentType<{ className?: string }> {
  if (fileType.startsWith('image/')) return FileImage;
  if (fileType.startsWith('video/')) return FileVideo;
  if (fileType.startsWith('audio/')) return FileAudio;
  if (fileType.includes('pdf') || fileType.includes('document')) return FileText;
  return File;
}

/**
 * Get category display metadata
 */
function getCategoryMeta(category: ResourceCategory) {
  const meta = {
    worksheet: { label: 'Worksheet', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    video: { label: 'Video', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
    audio: { label: 'Audio', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300' },
    article: { label: 'Article', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    template: { label: 'Template', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
    guide: { label: 'Guide', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
    other: { label: 'Other', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  };

  return meta[category] || meta.other;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export interface ResourceCardProps {
  resource: ResourceLibraryItem;
  variant?: 'grid' | 'list';
  viewMode?: 'coach' | 'client';
  showActions?: boolean;
  onView?: (resource: ResourceLibraryItem) => void;
  onDownload?: (resource: ResourceLibraryItem) => void;
  onShare?: (resource: ResourceLibraryItem) => void;
  onEdit?: (resource: ResourceLibraryItem) => void;
  onDelete?: (resource: ResourceLibraryItem) => void;
  className?: string;
}

/**
 * ResourceCard Component
 */
export function ResourceCard({
  resource,
  variant = 'grid',
  viewMode = 'coach',
  showActions = true,
  onView,
  onDownload,
  onShare,
  onEdit,
  onDelete,
  className,
}: ResourceCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const FileIcon = getFileIcon(resource.fileType);
  const categoryMeta = getCategoryMeta(resource.category);

  const handleDownload = async () => {
    if (!onDownload) return;
    setIsDownloading(true);
    try {
      await onDownload(resource);
    } finally {
      setIsDownloading(false);
    }
  };

  // List variant (horizontal layout)
  if (variant === 'list') {
    return (
      <Card
        className={cn(
          'flex items-center gap-4 p-4 hover:shadow-md transition-shadow',
          className
        )}
      >
        {/* File Icon */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted">
            <FileIcon className="w-6 h-6 text-muted-foreground" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <h3 className="font-medium text-sm truncate flex-1">
              {resource.filename}
            </h3>
            <Badge variant="secondary" className={cn('text-xs', categoryMeta.color)}>
              {categoryMeta.label}
            </Badge>
          </div>

          {resource.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
              {resource.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatFileSize(resource.fileSize)}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(resource.createdAt), { addSuffix: true })}</span>

            {viewMode === 'coach' && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {resource.viewCount}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {resource.completionCount}
                </span>
              </>
            )}

            {resource.sharedWithAllClients && (
              <>
                <span>•</span>
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Shared
                </Badge>
              </>
            )}
          </div>

          {resource.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {resource.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {resource.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{resource.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2">
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(resource)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View
              </Button>
            )}

            {onDownload && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                <Download className="w-4 h-4 mr-2" />
                {isDownloading ? 'Downloading...' : 'Download'}
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {viewMode === 'coach' && onShare && (
                  <>
                    <DropdownMenuItem onClick={() => onShare(resource)}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit?.(resource)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {viewMode === 'coach' && onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(resource)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </Card>
    );
  }

  // Grid variant (vertical card layout)
  return (
    <Card className={cn('flex flex-col hover:shadow-lg transition-shadow', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted flex-shrink-0">
            <FileIcon className="w-6 h-6 text-muted-foreground" />
          </div>

          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {viewMode === 'coach' && onShare && (
                  <>
                    <DropdownMenuItem onClick={() => onShare(resource)}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit?.(resource)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {viewMode === 'coach' && onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(resource)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <CardTitle className="text-base line-clamp-2">
          {resource.filename}
        </CardTitle>

        <CardDescription className="line-clamp-2 text-xs">
          {resource.description || 'No description'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <div className="space-y-2">
          <Badge variant="secondary" className={cn('text-xs', categoryMeta.color)}>
            {categoryMeta.label}
          </Badge>

          {resource.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {resource.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {resource.tags.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{resource.tags.length - 2}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <span>{formatFileSize(resource.fileSize)}</span>
            {viewMode === 'coach' && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {resource.viewCount}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {resource.completionCount}
                </span>
              </>
            )}
          </div>

          {resource.sharedWithAllClients && (
            <Badge variant="outline" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              Shared with all clients
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-3 border-t">
        {onView && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onView(resource)}
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
        )}

        {onDownload && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            <Download className="w-4 h-4 mr-2" />
            {isDownloading ? 'Downloading...' : 'Download'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
