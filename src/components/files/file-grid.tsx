'use client';

import React from 'react';
import { OptimizedThumbnailImage } from '@/components/ui/optimized-image';
import { 
  File, 
  Image, 
  FileText, 
  Video, 
  Music, 
  Archive, 
  Folder,
  MoreHorizontal,
  Eye,
  Share2,
  Download,
  Trash2,
  Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { FileMetadata, FolderMetadata } from '@/lib/services/file-management-service';

interface FileGridProps {
  files: FileMetadata[];
  folders: FolderMetadata[];
  selectedFiles: Set<string>;
  onFileSelect: (fileId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onFolderNavigate: (folderId: string) => void;
  onFilePreview: (file: FileMetadata) => void;
  onFileShare: (file: FileMetadata) => void;
  onFileDelete: (fileId: string) => void;
  compactMode?: boolean;
}

const getFileIcon = (fileType: string, mimeType: string) => {
  switch (fileType) {
    case 'image':
      return <Image className="h-8 w-8 text-blue-500" />;
    case 'video':
      return <Video className="h-8 w-8 text-purple-500" />;
    case 'audio':
      return <Music className="h-8 w-8 text-green-500" />;
    case 'pdf':
      return <FileText className="h-8 w-8 text-red-500" />;
    case 'document':
      return <FileText className="h-8 w-8 text-blue-600" />;
    case 'archive':
      return <Archive className="h-8 w-8 text-yellow-600" />;
    default:
      return <File className="h-8 w-8 text-gray-500" />;
  }
};

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
    month: 'short',
    day: 'numeric'
  });
};

export function FileGrid({
  files,
  folders,
  selectedFiles,
  onFileSelect,
  onSelectAll,
  onFolderNavigate,
  onFilePreview,
  onFileShare,
  onFileDelete,
  compactMode = false
}: FileGridProps) {
  const allItemsSelected = files.length > 0 && files.every(f => selectedFiles.has(f.id));
  const someItemsSelected = files.some(f => selectedFiles.has(f.id));

  return (
    <div className="space-y-4">
      {/* Select all */}
      {files.length > 0 && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allItemsSelected}
            ref={(el) => {
              if (el) el.indeterminate = someItemsSelected && !allItemsSelected;
            }}
            onCheckedChange={(checked) => onSelectAll(!!checked)}
          />
          <span className="text-sm text-gray-600">
            {someItemsSelected ? `${selectedFiles.size} selected` : 'Select all'}
          </span>
        </div>
      )}

      {/* Grid */}
      <div className={`grid gap-4 ${
        compactMode 
          ? 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-8' 
          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
      }`}>
        {/* Folders */}
        {folders.map(folder => (
          <div
            key={folder.id}
            className="group relative bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onFolderNavigate(folder.id)}
          >
            <div className="flex flex-col items-center text-center">
              <Folder className="h-12 w-12 text-yellow-500 mb-2" />
              <h3 className={`font-medium truncate w-full ${compactMode ? 'text-xs' : 'text-sm'}`}>
                {folder.name}
              </h3>
              {!compactMode && folder.description && (
                <p className="text-xs text-gray-500 truncate w-full mt-1">
                  {folder.description}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Files */}
        {files.map(file => {
          const isSelected = selectedFiles.has(file.id);
          const isImage = file.fileType === 'image';
          
          return (
            <div
              key={file.id}
              className={`group relative bg-white border rounded-lg p-4 hover:shadow-md transition-all ${
                isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''
              }`}
            >
              {/* Selection checkbox */}
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onFileSelect(file.id, !!checked)}
                />
              </div>

              {/* Actions menu */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onFilePreview(file)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFileShare(file)}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => onFileDelete(file.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div 
                className="flex flex-col items-center text-center cursor-pointer"
                onClick={() => onFilePreview(file)}
              >
                {/* File preview or icon */}
                <div className="mb-3 relative">
                  {isImage ? (
                    <div className="relative">
                      <OptimizedThumbnailImage
                        src={file.storageUrl}
                        alt={file.name}
                        size={compactMode ? 64 : 80}
                        fallbackIcon={getFileIcon(file.fileType, file.mimeType)}
                      />
                    </div>
                  ) : (
                    getFileIcon(file.fileType, file.mimeType)
                  )}
                  
                  {/* Public badge */}
                  {file.isPublic && (
                    <Badge variant="secondary" className="absolute -top-1 -right-1 text-xs px-1">
                      Public
                    </Badge>
                  )}
                </div>

                {/* File info */}
                <div className="w-full space-y-1">
                  <h3 className={`font-medium truncate ${compactMode ? 'text-xs' : 'text-sm'}`}>
                    {file.name}
                  </h3>
                  
                  {!compactMode && (
                    <>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.sizeBytes)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(file.createdAt)}
                      </p>
                      
                      {/* Tags */}
                      {file.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {file.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs px-1">
                              {tag}
                            </Badge>
                          ))}
                          {file.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs px-1">
                              +{file.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {files.length === 0 && folders.length === 0 && (
        <div className="text-center py-12">
          <Folder className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No files yet</h3>
          <p className="text-gray-500 mb-4">Upload your first file to get started.</p>
        </div>
      )}
    </div>
  );
}