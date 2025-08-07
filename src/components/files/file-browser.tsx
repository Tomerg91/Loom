'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  FileIcon, 
  FolderIcon, 
  SearchIcon, 
  FilterIcon,
  GridIcon,
  ListIcon,
  SortAscIcon,
  SortDescIcon,
  MoreVerticalIcon,
  DownloadIcon,
  ShareIcon,
  TrashIcon,
  EyeIcon,
  EditIcon,
  CopyIcon,
  InfoIcon,
  CalendarIcon,
  UserIcon,
  TagIcon,
} from 'lucide-react';

export interface FileItem {
  id: string;
  filename: string;
  originalFilename: string;
  fileType: string;
  fileSize: number;
  category: 'preparation' | 'notes' | 'recording' | 'resource' | 'personal' | 'avatar' | 'document';
  description?: string;
  tags: string[];
  isShared: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  shareCount?: number;
  thumbnailUrl?: string;
  previewUrl?: string;
}

export interface FileBrowserProps {
  files: FileItem[];
  loading: boolean;
  viewMode?: 'grid' | 'list';
  allowMultiSelect?: boolean;
  allowContextMenu?: boolean;
  selectedFiles?: string[];
  onSelectionChange?: (selectedFiles: string[]) => void;
  onFileAction?: (action: string, fileId: string, file: FileItem) => void;
  onFilePreview?: (file: FileItem) => void;
  onFileDownload?: (file: FileItem) => void;
  onFileShare?: (file: FileItem) => void;
  onFileDelete?: (file: FileItem) => void;
  className?: string;
}

export function FileBrowser({
  files,
  loading,
  viewMode: initialViewMode = 'list',
  allowMultiSelect = true,
  allowContextMenu = true,
  selectedFiles = [],
  onSelectionChange,
  onFileAction,
  onFilePreview,
  onFileDownload,
  onFileShare,
  onFileDelete,
  className = '',
}: FileBrowserProps) {
  const t = useTranslations('files');
  
  // Local state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'filename' | 'file_size' | 'download_count'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [internalSelectedFiles, setInternalSelectedFiles] = useState<string[]>(selectedFiles);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [contextMenuFile, setContextMenuFile] = useState<FileItem | null>(null);

  // Sync external selection changes
  useEffect(() => {
    setInternalSelectedFiles(selectedFiles);
  }, [selectedFiles]);

  // Filter and sort files
  const filteredFiles = useMemo(() => {
    let filtered = files;

    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(file =>
        file.filename.toLowerCase().includes(term) ||
        file.description?.toLowerCase().includes(term) ||
        file.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(file => file.category === categoryFilter);
    }

    // Sort files
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'filename':
          aValue = a.filename.toLowerCase();
          bValue = b.filename.toLowerCase();
          break;
        case 'file_size':
          aValue = a.fileSize;
          bValue = b.fileSize;
          break;
        case 'download_count':
          aValue = a.downloadCount;
          bValue = b.downloadCount;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [files, searchTerm, categoryFilter, sortBy, sortOrder]);

  // File selection handling
  const handleFileSelection = (fileId: string, checked: boolean) => {
    let newSelection: string[];
    
    if (checked) {
      newSelection = [...internalSelectedFiles, fileId];
    } else {
      newSelection = internalSelectedFiles.filter(id => id !== fileId);
    }
    
    setInternalSelectedFiles(newSelection);
    onSelectionChange?.(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelection = checked ? filteredFiles.map(f => f.id) : [];
    setInternalSelectedFiles(newSelection);
    onSelectionChange?.(newSelection);
  };

  const handleFileAction = (action: string, file: FileItem) => {
    switch (action) {
      case 'preview':
        setPreviewFile(file);
        onFilePreview?.(file);
        break;
      case 'download':
        onFileDownload?.(file);
        break;
      case 'share':
        onFileShare?.(file);
        break;
      case 'delete':
        onFileDelete?.(file);
        break;
      default:
        onFileAction?.(action, file.id, file);
        break;
    }
  };

  // Utility functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string, thumbnailUrl?: string) => {
    if (thumbnailUrl) {
      return <img src={thumbnailUrl} alt="" className="w-full h-full object-cover rounded" />;
    }
    
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel')) return '📊';
    return '📁';
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'preparation': return 'bg-blue-100 text-blue-800';
      case 'notes': return 'bg-green-100 text-green-800';
      case 'recording': return 'bg-purple-100 text-purple-800';
      case 'resource': return 'bg-yellow-100 text-yellow-800';
      case 'personal': return 'bg-pink-100 text-pink-800';
      case 'document': return 'bg-gray-100 text-gray-800';
      case 'avatar': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="flex-1 relative min-w-0">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('search.placeholder', { defaultValue: 'Search files...' })}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <FilterIcon className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="preparation">Preparation</SelectItem>
              <SelectItem value="notes">Notes</SelectItem>
              <SelectItem value="recording">Recordings</SelectItem>
              <SelectItem value="resource">Resources</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="avatar">Avatars</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
            const [field, order] = value.split('-');
            setSortBy(field as any);
            setSortOrder(order as any);
          }}>
            <SelectTrigger className="w-48">
              {sortOrder === 'asc' ? (
                <SortAscIcon className="h-4 w-4 mr-2" />
              ) : (
                <SortDescIcon className="h-4 w-4 mr-2" />
              )}
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at-desc">Newest First</SelectItem>
              <SelectItem value="created_at-asc">Oldest First</SelectItem>
              <SelectItem value="filename-asc">Name A-Z</SelectItem>
              <SelectItem value="filename-desc">Name Z-A</SelectItem>
              <SelectItem value="file_size-desc">Largest First</SelectItem>
              <SelectItem value="file_size-asc">Smallest First</SelectItem>
              <SelectItem value="download_count-desc">Most Downloaded</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
            >
              <GridIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Selection Controls */}
      {allowMultiSelect && filteredFiles.length > 0 && (
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={internalSelectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-gray-600">
              {internalSelectedFiles.length > 0 
                ? `${internalSelectedFiles.length} of ${filteredFiles.length} selected`
                : `Select all ${filteredFiles.length} files`
              }
            </span>
          </div>
          {internalSelectedFiles.length > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleSelectAll(false)}>
                Clear Selection
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Files Display */}
      {filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <FolderIcon className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || categoryFilter !== 'all' 
                ? t('empty.filtered', { defaultValue: 'No files match your search' })
                : t('empty.title', { defaultValue: 'No files found' })
              }
            </h3>
            <p className="text-gray-600">
              {searchTerm || categoryFilter !== 'all'
                ? t('empty.tryAdjust', { defaultValue: 'Try adjusting your search or filters' })
                : t('empty.upload', { defaultValue: 'Upload your first file to get started' })
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4' 
          : 'space-y-2'
        }>
          {filteredFiles.map((file) => (
            <Card key={file.id} className={`group hover:shadow-md transition-shadow ${
              internalSelectedFiles.includes(file.id) ? 'ring-2 ring-blue-500' : ''
            }`}>
              <CardContent className={viewMode === 'grid' ? 'p-4' : 'p-3'}>
                {viewMode === 'grid' ? (
                  // Grid View
                  <div className="space-y-3">
                    {/* File Preview/Icon */}
                    <div 
                      className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer"
                      onClick={() => handleFileAction('preview', file)}
                    >
                      {typeof getFileIcon(file.fileType, file.thumbnailUrl) === 'string' ? (
                        <span className="text-3xl">{getFileIcon(file.fileType, file.thumbnailUrl)}</span>
                      ) : (
                        getFileIcon(file.fileType, file.thumbnailUrl)
                      )}
                    </div>

                    {/* File Info */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm truncate pr-2" title={file.filename}>
                          {file.filename}
                        </h4>
                        {allowMultiSelect && (
                          <Checkbox
                            checked={internalSelectedFiles.includes(file.id)}
                            onCheckedChange={(checked) => handleFileSelection(file.id, !!checked)}
                          />
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.fileSize)}
                      </p>
                      
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className={`text-xs ${getCategoryColor(file.category)}`}>
                          {file.category}
                        </Badge>
                        {file.isShared && (
                          <Badge variant="outline" className="text-xs text-blue-600">
                            <ShareIcon className="h-2 w-2 mr-1" />
                            Shared
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => handleFileAction('preview', file)}>
                        <EyeIcon className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleFileAction('download', file)}>
                        <DownloadIcon className="h-3 w-3" />
                      </Button>
                      {allowContextMenu && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVerticalIcon className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleFileAction('preview', file)}>
                              <EyeIcon className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleFileAction('download', file)}>
                              <DownloadIcon className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleFileAction('share', file)}>
                              <ShareIcon className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleFileAction('copy', file)}>
                              <CopyIcon className="h-4 w-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleFileAction('info', file)}>
                              <InfoIcon className="h-4 w-4 mr-2" />
                              File Info
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleFileAction('delete', file)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <TrashIcon className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ) : (
                  // List View
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {allowMultiSelect && (
                        <Checkbox
                          checked={internalSelectedFiles.includes(file.id)}
                          onCheckedChange={(checked) => handleFileSelection(file.id, !!checked)}
                        />
                      )}
                      
                      {/* File Icon */}
                      <div 
                        className="w-8 h-8 flex items-center justify-center cursor-pointer"
                        onClick={() => handleFileAction('preview', file)}
                      >
                        {typeof getFileIcon(file.fileType, file.thumbnailUrl) === 'string' ? (
                          <span className="text-xl">{getFileIcon(file.fileType, file.thumbnailUrl)}</span>
                        ) : (
                          <div className="w-8 h-8 rounded overflow-hidden">
                            {getFileIcon(file.fileType, file.thumbnailUrl)}
                          </div>
                        )}
                      </div>

                      {/* File Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate" title={file.filename}>
                            {file.filename}
                          </h4>
                          <Badge variant="secondary" className={`text-xs ${getCategoryColor(file.category)}`}>
                            {file.category}
                          </Badge>
                          {file.isShared && (
                            <Badge variant="outline" className="text-xs text-blue-600">
                              <ShareIcon className="h-2 w-2 mr-1" />
                              Shared
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{formatFileSize(file.fileSize)}</span>
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                          </div>
                          {file.downloadCount > 0 && (
                            <div className="flex items-center gap-1">
                              <DownloadIcon className="h-3 w-3" />
                              <span>{file.downloadCount}</span>
                            </div>
                          )}
                        </div>
                        
                        {file.description && (
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {file.description}
                          </p>
                        )}
                        
                        {file.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <TagIcon className="h-3 w-3 text-gray-400" />
                            <div className="flex gap-1">
                              {file.tags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="text-xs text-gray-500 bg-gray-100 px-1 rounded">
                                  {tag}
                                </span>
                              ))}
                              {file.tags.length > 3 && (
                                <span className="text-xs text-gray-500">+{file.tags.length - 3}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleFileAction('preview', file)}>
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleFileAction('download', file)}>
                        <DownloadIcon className="h-4 w-4" />
                      </Button>
                      {allowContextMenu && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVerticalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleFileAction('preview', file)}>
                              <EyeIcon className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleFileAction('download', file)}>
                              <DownloadIcon className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleFileAction('share', file)}>
                              <ShareIcon className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleFileAction('copy', file)}>
                              <CopyIcon className="h-4 w-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleFileAction('info', file)}>
                              <InfoIcon className="h-4 w-4 mr-2" />
                              File Info
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleFileAction('delete', file)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <TrashIcon className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewFile?.filename}</DialogTitle>
          </DialogHeader>
          {previewFile && (
            <div className="space-y-4">
              {/* Preview Area */}
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                {previewFile.previewUrl ? (
                  <img 
                    src={previewFile.previewUrl} 
                    alt={previewFile.filename}
                    className="max-w-full max-h-96 mx-auto"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <span className="text-6xl">
                      {getFileIcon(previewFile.fileType)}
                    </span>
                    <p className="text-gray-600">Preview not available for this file type</p>
                  </div>
                )}
              </div>
              
              {/* File Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">File Size:</span> {formatFileSize(previewFile.fileSize)}
                </div>
                <div>
                  <span className="font-medium">Type:</span> {previewFile.fileType}
                </div>
                <div>
                  <span className="font-medium">Category:</span> 
                  <Badge variant="secondary" className={`ml-2 ${getCategoryColor(previewFile.category)}`}>
                    {previewFile.category}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Downloads:</span> {previewFile.downloadCount}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {new Date(previewFile.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Modified:</span> {new Date(previewFile.updatedAt).toLocaleDateString()}
                </div>
              </div>
              
              {previewFile.description && (
                <div>
                  <span className="font-medium">Description:</span>
                  <p className="mt-1 text-gray-600">{previewFile.description}</p>
                </div>
              )}
              
              {previewFile.tags.length > 0 && (
                <div>
                  <span className="font-medium">Tags:</span>
                  <div className="flex gap-2 mt-2">
                    {previewFile.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => handleFileAction('download', previewFile)}>
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button onClick={() => handleFileAction('share', previewFile)}>
                  <ShareIcon className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}