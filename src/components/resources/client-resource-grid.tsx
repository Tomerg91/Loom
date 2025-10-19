'use client';

/**
 * Client Resource Grid Component
 *
 * Displays resources in grid or list view with:
 * - Resource cards showing metadata
 * - Progress indicators
 * - Action buttons (view, download, mark complete)
 * - Responsive layout
 *
 * @module components/resources/client-resource-grid
 */

import { Download, Eye, CheckCircle2, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatFileSize } from '@/lib/utils/file-validation';
import {
  RESOURCE_CATEGORY_LABELS,
  RESOURCE_CATEGORY_ICONS,
  type ClientResourceItem,
  type ProgressAction,
} from '@/types/resources';
import * as Icons from 'lucide-react';

interface ClientResourceGridProps {
  resources: ClientResourceItem[];
  viewMode: 'grid' | 'list';
  onTrackProgress: (resourceId: string, action: ProgressAction) => void;
  isTracking: boolean;
}

export function ClientResourceGrid({
  resources,
  viewMode,
  onTrackProgress,
  isTracking,
}: ClientResourceGridProps) {
  const handleDownload = async (resource: ClientResourceItem) => {
    // Track download action
    onTrackProgress(resource.id, 'accessed');

    // Trigger download
    const a = document.createElement('a');
    a.href = `/api/files/${resource.id}/download`;
    a.download = resource.originalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleView = (resource: ClientResourceItem) => {
    if (!resource.progress?.viewed) {
      onTrackProgress(resource.id, 'viewed');
    } else {
      onTrackProgress(resource.id, 'accessed');
    }

    // Open resource in new tab
    window.open(`/api/files/${resource.id}/view`, '_blank');
  };

  const handleMarkComplete = (resource: ClientResourceItem) => {
    onTrackProgress(resource.id, 'completed');
  };

  const getCategoryIcon = (category: string) => {
    const iconName = RESOURCE_CATEGORY_ICONS[category as keyof typeof RESOURCE_CATEGORY_ICONS] || 'File';
    const Icon = Icons[iconName as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
    return Icon ? <Icon className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
  };

  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {resources.map((resource) => (
          <Card key={resource.id} className="hover:bg-accent/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                {/* Resource Info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {getCategoryIcon(resource.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{resource.filename}</h3>
                      {resource.progress?.completed && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed
                        </Badge>
                      )}
                      {resource.progress?.viewed && !resource.progress?.completed && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          Viewed
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{RESOURCE_CATEGORY_LABELS[resource.category]}</span>
                      <span>•</span>
                      <span>{formatFileSize(resource.fileSize)}</span>
                      <span>•</span>
                      <span>Shared by {resource.sharedBy.name}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(resource)}
                    disabled={isTracking}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  {resource.permission === 'download' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(resource)}
                      disabled={isTracking}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                  {!resource.progress?.completed && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleMarkComplete(resource)}
                      disabled={isTracking}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {resources.map((resource) => (
        <Card key={resource.id} className="flex flex-col hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate">{resource.filename}</CardTitle>
                <CardDescription className="mt-1">
                  {RESOURCE_CATEGORY_LABELS[resource.category]}
                </CardDescription>
              </div>
              <div className="flex-shrink-0">
                {getCategoryIcon(resource.category)}
              </div>
            </div>

            {/* Progress Badge */}
            <div className="flex items-center gap-2 mt-2">
              {resource.progress?.completed ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Completed
                </Badge>
              ) : resource.progress?.viewed ? (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Viewed
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Not started
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1">
            {resource.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {resource.description}
              </p>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span>{formatFileSize(resource.fileSize)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shared by:</span>
                <span>{resource.sharedBy.name}</span>
              </div>
              {resource.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {resource.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleView(resource)}
              disabled={isTracking}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
            {resource.permission === 'download' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(resource)}
                disabled={isTracking}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            {!resource.progress?.completed && (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleMarkComplete(resource)}
                disabled={isTracking}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
