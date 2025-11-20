/**
 * Collection Card Component
 *
 * Displays a resource collection with:
 * - Icon and name
 * - Description
 * - Resource count
 * - Preview of resources
 * - Actions (view, edit, delete)
 *
 * @module components/resources/collection-card
 */

'use client';

import {
  MoreVertical,
  Edit,
  Trash2,
  FolderOpen,
  FileText,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ResourceCollection } from '@/types/resources';

export interface CollectionCardProps {
  collection: ResourceCollection & { resourceCount?: number };
  onEdit?: (collection: ResourceCollection) => void;
  onDelete?: (collection: ResourceCollection) => void;
  className?: string;
}

/**
 * CollectionCard Component
 */
export function CollectionCard({
  collection,
  onEdit,
  onDelete,
  className,
}: CollectionCardProps) {
  const router = useRouter();
  const locale = useLocale();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;

    if (
      confirm(
        `Are you sure you want to delete "${collection.name}"? Resources will not be deleted.`
      )
    ) {
      setIsDeleting(true);
      try {
        await onDelete(collection);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleClick = () => {
    router.push(`/${locale}/coach/resources/collections/${collection.id}`);
  };

  return (
    <Card
      className={cn(
        'group cursor-pointer hover:shadow-lg transition-all',
        isDeleting && 'opacity-50 pointer-events-none',
        className
      )}
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-2xl">
              {collection.icon || <FolderOpen className="w-6 h-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base line-clamp-1">
                {collection.name}
              </CardTitle>
              <CardDescription className="text-xs">
                {collection.resourceCount ?? 0} resources
              </CardDescription>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(collection);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {collection.description && (
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {collection.description}
          </p>
        </CardContent>
      )}

      {!collection.description && (
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <FileText className="w-8 h-8 opacity-20" />
        </CardContent>
      )}
    </Card>
  );
}
