/**
 * Resource Empty State Component
 *
 * Display when no resources are found with:
 * - Custom icon/illustration
 * - Title and description
 * - Optional call-to-action button
 * - Different variants for different contexts
 *
 * @module components/resources/resource-empty-state
 */

'use client';

import { FileText, Search, Inbox, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ResourceEmptyStateProps {
  variant?: 'no-resources' | 'no-results' | 'no-shared' | 'collection-empty';
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Get default content based on variant
 */
function getDefaultContent(variant: ResourceEmptyStateProps['variant']) {
  switch (variant) {
    case 'no-results':
      return {
        icon: <Search className="w-12 h-12" />,
        title: 'No resources found',
        description: 'Try adjusting your filters or search terms to find what you\'re looking for.',
      };
    case 'no-shared':
      return {
        icon: <Inbox className="w-12 h-12" />,
        title: 'No shared resources',
        description: 'Your coach hasn\'t shared any resources with you yet. Check back later!',
      };
    case 'collection-empty':
      return {
        icon: <FolderOpen className="w-12 h-12" />,
        title: 'Collection is empty',
        description: 'Add resources to this collection to organize your library.',
      };
    case 'no-resources':
    default:
      return {
        icon: <FileText className="w-12 h-12" />,
        title: 'No resources yet',
        description: 'Upload your first resource to start building your library.',
      };
  }
}

/**
 * ResourceEmptyState Component
 */
export function ResourceEmptyState({
  variant = 'no-resources',
  title: customTitle,
  description: customDescription,
  icon: customIcon,
  action,
  className,
}: ResourceEmptyStateProps) {
  const defaultContent = getDefaultContent(variant);

  const title = customTitle || defaultContent.title;
  const description = customDescription || defaultContent.description;
  const icon = customIcon || defaultContent.icon;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-4',
        className
      )}
    >
      {/* Icon */}
      <div className="mb-4 text-muted-foreground opacity-50">
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {description}
      </p>

      {/* Action */}
      {action && <div>{action}</div>}
    </div>
  );
}
