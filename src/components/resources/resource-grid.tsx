/**
 * Resource Grid Component
 *
 * Container for displaying multiple resources in grid or list layout with:
 * - View toggle (grid/list)
 * - Responsive grid layout
 * - Loading states
 * - Empty state handling
 * - Pagination support
 *
 * @module components/resources/resource-grid
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Grid3x3, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResourceCard } from './resource-card';
import { ResourceEmptyState } from './resource-empty-state';
import type { ResourceLibraryItem } from '@/types/resources';

export interface ResourceGridProps {
  resources: ResourceLibraryItem[];
  viewMode?: 'coach' | 'client';
  defaultLayout?: 'grid' | 'list';
  showLayoutToggle?: boolean;
  showActions?: boolean;
  isLoading?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateAction?: React.ReactNode;
  onView?: (resource: ResourceLibraryItem) => void;
  onDownload?: (resource: ResourceLibraryItem) => void;
  onShare?: (resource: ResourceLibraryItem) => void;
  onEdit?: (resource: ResourceLibraryItem) => void;
  onDelete?: (resource: ResourceLibraryItem) => void;
  className?: string;
}

/**
 * ResourceGrid Component
 */
export function ResourceGrid({
  resources,
  viewMode = 'coach',
  defaultLayout = 'grid',
  showLayoutToggle = true,
  showActions = true,
  isLoading = false,
  emptyStateTitle,
  emptyStateDescription,
  emptyStateAction,
  onView,
  onDownload,
  onShare,
  onEdit,
  onDelete,
  className,
}: ResourceGridProps) {
  const [layout, setLayout] = useState<'grid' | 'list'>(defaultLayout);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {showLayoutToggle && (
          <div className="flex justify-end">
            <div className="h-9 w-20 bg-muted animate-pulse rounded-md" />
          </div>
        )}

        <div
          className={cn(
            layout === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'flex flex-col gap-3'
          )}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'rounded-lg border bg-card',
                layout === 'grid' ? 'h-80' : 'h-32'
              )}
            >
              <div className="animate-pulse p-6 space-y-4">
                <div className="h-12 w-12 bg-muted rounded-lg" />
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (resources.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        {showLayoutToggle && (
          <div className="flex justify-end">
            <LayoutToggle layout={layout} onChange={setLayout} />
          </div>
        )}

        <ResourceEmptyState
          title={emptyStateTitle}
          description={emptyStateDescription}
          action={emptyStateAction}
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Layout Toggle */}
      {showLayoutToggle && (
        <div className="flex justify-end">
          <LayoutToggle layout={layout} onChange={setLayout} />
        </div>
      )}

      {/* Resources */}
      <div
        className={cn(
          'transition-all duration-200',
          layout === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'flex flex-col gap-3'
        )}
      >
        {resources.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            variant={layout}
            viewMode={viewMode}
            showActions={showActions}
            onView={onView}
            onDownload={onDownload}
            onShare={onShare}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Layout Toggle Button Group
 */
interface LayoutToggleProps {
  layout: 'grid' | 'list';
  onChange: (layout: 'grid' | 'list') => void;
}

function LayoutToggle({ layout, onChange }: LayoutToggleProps) {
  return (
    <div className="inline-flex items-center rounded-md border bg-background p-1">
      <Button
        variant={layout === 'grid' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onChange('grid')}
        className="h-7 px-3"
      >
        <Grid3x3 className="w-4 h-4" />
        <span className="sr-only">Grid view</span>
      </Button>
      <Button
        variant={layout === 'list' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onChange('list')}
        className="h-7 px-3"
      >
        <List className="w-4 h-4" />
        <span className="sr-only">List view</span>
      </Button>
    </div>
  );
}
