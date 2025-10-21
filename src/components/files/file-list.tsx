'use client';

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
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileMetadata, FolderMetadata } from '@/lib/services/file-management-service';

interface FileListProps {
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
  const iconClass = 'h-4 w-4';
  switch (fileType) {
    case 'image':
      return <Image className={`${iconClass} text-blue-500`} />;
    case 'video':
      return <Video className={`${iconClass} text-purple-500`} />;
    case 'audio':
      return <Music className={`${iconClass} text-green-500`} />;
    case 'pdf':
      return <FileText className={`${iconClass} text-red-500`} />;
    case 'document':
      return <FileText className={`${iconClass} text-blue-600`} />;
    case 'archive':
      return <Archive className={`${iconClass} text-yellow-600`} />;
    default:
      return <File className={`${iconClass} text-gray-500`} />;
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
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function FileList({
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
}: FileListProps) {
  const allItemsSelected = files.length > 0 && files.every(f => selectedFiles.has(f.id));
  const someItemsSelected = files.some(f => selectedFiles.has(f.id));

  const allItems = [
    ...folders.map(folder => ({ ...folder, type: 'folder' as const })),
    ...files.map(file => ({ ...file, type: 'file' as const }))
  ];

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allItemsSelected}
                onCheckedChange={(checked) => onSelectAll(!!checked)}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead className={compactMode ? 'hidden' : ''}>Size</TableHead>
            <TableHead className={compactMode ? 'hidden' : ''}>Modified</TableHead>
            <TableHead className={compactMode ? 'hidden' : ''}>Type</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allItems.map(item => {
            if (item.type === 'folder') {
              return (
                <TableRow 
                  key={`folder-${item.id}`}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => onFolderNavigate(item.id)}
                >
                  <TableCell>
                    <div className="w-4"></div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Folder className="h-4 w-4 text-yellow-500" />
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {!compactMode && item.description && (
                          <div className="text-sm text-gray-500">{item.description}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={compactMode ? 'hidden' : ''}>—</TableCell>
                  <TableCell className={compactMode ? 'hidden' : ''}>{formatDate(item.createdAt)}</TableCell>
                  <TableCell className={compactMode ? 'hidden' : ''}>Folder</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              );
            }

            const file = item as FileMetadata;
            const isSelected = selectedFiles.has(file.id);

            return (
              <TableRow 
                key={`file-${file.id}`}
                className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
              >
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onFileSelect(file.id, !!checked)}
                  />
                </TableCell>
                <TableCell>
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => onFilePreview(file)}
                  >
                    {getFileIcon(file.fileType, file.fileType)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {file.filename}
                        {file.isPublic && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Public
                          </Badge>
                        )}
                      </div>
                      {!compactMode && file.description && (
                        <div className="text-sm text-gray-500 truncate">{file.description}</div>
                      )}
                      {!compactMode && file.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {file.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {file.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{file.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className={compactMode ? 'hidden' : ''}>
                  {formatFileSize(file.fileSize)}
                </TableCell>
                <TableCell className={compactMode ? 'hidden' : ''}>
                  {formatDate(file.updatedAt)}
                </TableCell>
                <TableCell className={compactMode ? 'hidden' : ''}>
                  {file.fileType}
                </TableCell>
                <TableCell>
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Empty state */}
      {allItems.length === 0 && (
        <div className="text-center py-12">
          <Folder className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No files yet</h3>
          <p className="text-gray-500 mb-4">Upload your first file to get started.</p>
        </div>
      )}
    </div>
  );
}