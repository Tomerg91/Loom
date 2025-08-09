'use client';

import React, { useEffect, useState } from 'react';
import { ChevronRight, Home, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FolderMetadata } from '@/lib/services/file-management-service';

interface FolderBreadcrumbProps {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
  icon?: React.ReactNode;
}

export function FolderBreadcrumb({ currentFolderId, onNavigate }: FolderBreadcrumbProps) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: 'Files', icon: <Home className="h-4 w-4" /> }
  ]);

  useEffect(() => {
    // In a real implementation, you would fetch the folder path from the API
    // For now, we'll just show the root and current folder
    const buildBreadcrumbs = async () => {
      const items: BreadcrumbItem[] = [
        { id: null, name: 'Files', icon: <Home className="h-4 w-4" /> }
      ];

      if (currentFolderId) {
        // This would be replaced with actual API call to get folder hierarchy
        items.push({
          id: currentFolderId,
          name: 'Current Folder', // This would come from API
          icon: <Folder className="h-4 w-4" />
        });
      }

      setBreadcrumbs(items);
    };

    buildBreadcrumbs();
  }, [currentFolderId]);

  return (
    <nav className="flex items-center space-x-1 text-sm text-gray-600">
      {breadcrumbs.map((item, index) => (
        <React.Fragment key={item.id || 'root'}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-gray-600 hover:text-gray-900"
            onClick={() => onNavigate(item.id)}
          >
            <div className="flex items-center space-x-1">
              {item.icon}
              <span>{item.name}</span>
            </div>
          </Button>
          
          {index < breadcrumbs.length - 1 && (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}