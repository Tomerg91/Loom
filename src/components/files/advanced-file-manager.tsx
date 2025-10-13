'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Upload, 
  Download, 
  Share2, 
  Trash2, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Eye, 
  Edit3, 
  Clock,
  Users,
  Shield,
  AlertTriangle,
  CheckCircle,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  MoreHorizontal,
  RefreshCw,
  SortAsc,
  SortDesc,
  FolderOpen,
  Star,
  StarOff,
  Link,
  Calendar,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUploadZone } from './file-upload-zone';
import { FilePreview } from './file-preview';
import { FileSharingDialog } from './file-sharing-dialog';
import { FileVersionHistory } from './file-version-history';
import { useToast } from '@/components/ui/use-toast';

export interface FileItem {
  id: string;
  filename: string;
  originalFilename: string;
  fileType: string;
  fileSize: number;
  fileCategory: 'preparation' | 'notes' | 'recording' | 'resource' | 'personal' | 'avatar' | 'document';
  description?: string;
  tags: string[];
  isShared: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  ownerName?: string;
  storageUrl?: string;
  isStarred?: boolean;
  hasVersions?: boolean;
  sharedWith?: Array<{
    id: string;
    name: string;
    permission: 'view' | 'download' | 'edit';
    expiresAt?: string;
  }>;
}

export interface FileManagerProps {
  initialFiles?: FileItem[];
  sessionId?: string;
  allowUpload?: boolean;
  allowShare?: boolean;
  allowDelete?: boolean;
  allowVersioning?: boolean;
  viewMode?: 'grid' | 'list';
  showSearch?: boolean;
  showFilters?: boolean;
  maxFiles?: number;
  onFileSelect?: (file: FileItem) => void;
  onFilesChange?: (files: FileItem[]) => void;
}

type SortField = 'filename' | 'fileSize' | 'createdAt' | 'updatedAt' | 'downloadCount';
type SortDirection = 'asc' | 'desc';

export function AdvancedFileManager({
  initialFiles = [],
  sessionId,
  allowUpload = true,
  allowShare = true,
  allowDelete = true,
  allowVersioning = true,
  viewMode: initialViewMode = 'grid',
  showSearch = true,
  showFilters = true,
  maxFiles,
  onFileSelect,
  onFilesChange,
}: FileManagerProps) {
  const t = useTranslations('files');
  const { toast } = useToast();

  // State management
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>(initialFiles);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [sharedFilter, setSharedFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Dialog states
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [selectedFileForAction, setSelectedFileForAction] = useState<FileItem | null>(null);

  // Get unique values for filters
  const availableCategories = useMemo(() => {
    const cats = [...new Set(files.map(f => f.fileCategory))];
    return cats.map(cat => ({ value: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) }));
  }, [files]);

  const availableTypes = useMemo(() => {
    const types = [...new Set(files.map(f => f.fileType.split('/')[0]))];
    return types.map(type => ({ value: type, label: type.charAt(0).toUpperCase() + type.slice(1) }));
  }, [files]);

  const availableTags = useMemo(() => {
    const tags = [...new Set(files.flatMap(f => f.tags))];
    return tags.map(tag => ({ value: tag, label: tag }));
  }, [files]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...files];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(file =>
        file.filename.toLowerCase().includes(query) ||
        file.description?.toLowerCase().includes(query) ||
        file.tags.some(tag => tag.toLowerCase().includes(query)) ||
        file.ownerName?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(file => file.fileCategory === categoryFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(file => file.fileType.startsWith(typeFilter));
    }

    // Tag filter
    if (tagFilter !== 'all') {
      filtered = filtered.filter(file => file.tags.includes(tagFilter));
    }

    // Shared filter
    if (sharedFilter !== 'all') {
      if (sharedFilter === 'shared') {
        filtered = filtered.filter(file => file.isShared);
      } else if (sharedFilter === 'not-shared') {
        filtered = filtered.filter(file => !file.isShared);
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredFiles(filtered);
  }, [files, searchQuery, categoryFilter, typeFilter, tagFilter, sharedFilter, sortField, sortDirection]);

  // Refresh files
  const refreshFiles = useCallback(async () => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (sessionId) params.append('sessionId', sessionId);

      const response = await fetch(`/api/files?${params}`);
      if (!response.ok) throw new Error('Failed to fetch files');

      const data = await response.json();
      setFiles(data.files || []);
      onFilesChange?.(data.files || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh files',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  }, [sessionId, onFilesChange]);

  // File selection handlers
  const handleFileSelect = useCallback((fileId: string, selected: boolean) => {
    const newSelection = new Set(selectedFiles);
    if (selected) {
      newSelection.add(fileId);
    } else {
      newSelection.delete(fileId);
    }
    setSelectedFiles(newSelection);
  }, [selectedFiles]);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
    } else {
      setSelectedFiles(new Set());
    }
  }, [filteredFiles]);

  // File actions
  const handleDownload = useCallback(async (file: FileItem) => {
    try {
      window.open(`/api/files/${file.id}/download`, '_blank');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download file',
        variant: 'destructive',
      });
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!selectedFileForAction) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/files/${selectedFileForAction.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete file');

      const updatedFiles = files.filter(f => f.id !== selectedFileForAction.id);
      setFiles(updatedFiles);
      onFilesChange?.(updatedFiles);

      toast({
        title: 'Success',
        description: 'File deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
      setSelectedFileForAction(null);
    }
  }, [selectedFileForAction, files, onFilesChange]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedFiles.size === 0) return;

    setLoading(true);
    try {
      const deletePromises = Array.from(selectedFiles).map(fileId =>
        fetch(`/api/files/${fileId}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      const updatedFiles = files.filter(f => !selectedFiles.has(f.id));
      setFiles(updatedFiles);
      setSelectedFiles(new Set());
      onFilesChange?.(updatedFiles);

      toast({
        title: 'Success',
        description: `${selectedFiles.size} files deleted successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete some files',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedFiles, files, onFilesChange]);

  const handleToggleStar = useCallback(async (file: FileItem) => {
    try {
      const response = await fetch(`/api/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !file.isStarred }),
      });

      if (!response.ok) throw new Error('Failed to update file');

      const updatedFiles = files.map(f =>
        f.id === file.id ? { ...f, isStarred: !f.isStarred } : f
      );
      setFiles(updatedFiles);
      onFilesChange?.(updatedFiles);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update file',
        variant: 'destructive',
      });
    }
  }, [files, onFilesChange]);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Get file icon
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (fileType.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (fileType.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (fileType.includes('zip') || fileType.includes('tar')) return <Archive className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">File Manager</h2>
          {filteredFiles.length > 0 && (
            <Badge variant="secondary">
              {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'}
            </Badge>
          )}
          {maxFiles && (
            <Badge variant="outline">
              {files.length}/{maxFiles} limit
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshFiles}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>

          {selectedFiles.size > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShareDialog(true)}
                disabled={!allowShare}
              >
                <Share2 className="h-4 w-4" />
                Share ({selectedFiles.size})
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={!allowDelete || loading}
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedFiles.size})
              </Button>
            </>
          )}

          {allowUpload && (
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      {(showSearch || showFilters) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {showSearch && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}

              {showFilters && (
                <div className="flex flex-wrap gap-4">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {availableCategories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {availableTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {availableTags.length > 0 && (
                    <Select value={tagFilter} onValueChange={setTagFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Tags" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        {availableTags.map(tag => (
                          <SelectItem key={tag.value} value={tag.value}>
                            {tag.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Select value={sharedFilter} onValueChange={setSharedFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Sharing" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Files</SelectItem>
                      <SelectItem value="shared">Shared</SelectItem>
                      <SelectItem value="not-shared">Not Shared</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
                    <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                      <SelectTrigger className="border-0 p-0 h-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="filename">Name</SelectItem>
                        <SelectItem value="fileSize">Size</SelectItem>
                        <SelectItem value="createdAt">Created</SelectItem>
                        <SelectItem value="updatedAt">Modified</SelectItem>
                        <SelectItem value="downloadCount">Downloads</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    >
                      {sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className={viewMode === 'grid' ? 'bg-gray-100' : ''}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className={viewMode === 'list' ? 'bg-gray-100' : ''}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File List/Grid */}
      {filteredFiles.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedFiles.size === filteredFiles.length}
              onCheckedChange={handleSelectAll}
            />
            <span>Select all</span>
          </div>
        </div>
      )}

      {filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No files found</h3>
            <p className="text-gray-600 mb-4">
              {files.length === 0
                ? allowUpload 
                  ? "Get started by uploading your first file"
                  : "No files available"
                : "Try adjusting your search or filters"
              }
            </p>
            {allowUpload && files.length === 0 && (
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="group hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Checkbox
                    checked={selectedFiles.has(file.id)}
                    onCheckedChange={(checked) => handleFileSelect(file.id, checked as boolean)}
                  />
                  
                  <div className="flex items-center gap-1">
                    {file.isStarred && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStar(file)}
                      >
                        <Star className="h-4 w-4 fill-current text-yellow-500" />
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedFileForAction(file);
                          setShowPreviewDialog(true);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => handleDownload(file)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        
                        {allowShare && (
                          <DropdownMenuItem onClick={() => {
                            setSelectedFileForAction(file);
                            setShowShareDialog(true);
                          }}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                        )}
                        
                        {allowVersioning && (
                          <DropdownMenuItem onClick={() => {
                            setSelectedFileForAction(file);
                            setShowVersionDialog(true);
                          }}>
                            <Clock className="h-4 w-4 mr-2" />
                            Version History
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem onClick={() => handleToggleStar(file)}>
                          {file.isStarred ? (
                            <StarOff className="h-4 w-4 mr-2" />
                          ) : (
                            <Star className="h-4 w-4 mr-2" />
                          )}
                          {file.isStarred ? 'Unstar' : 'Star'}
                        </DropdownMenuItem>
                        
                        {allowDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedFileForAction(file);
                                setShowDeleteDialog(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div 
                  className="cursor-pointer"
                  onClick={() => {
                    onFileSelect?.(file);
                    setSelectedFileForAction(file);
                    setShowPreviewDialog(true);
                  }}
                >
                  <div className="flex items-center justify-center h-20 mb-3 bg-gray-50 rounded-lg">
                    {getFileIcon(file.fileType)}
                  </div>
                  
                  <h4 className="font-medium truncate mb-1" title={file.filename}>
                    {file.filename}
                  </h4>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>{formatFileSize(file.fileSize)}</div>
                    <div>{formatDate(file.createdAt)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {file.fileCategory}
                    </Badge>
                    
                    {file.isShared && (
                      <Badge variant="outline" className="text-xs">
                        <Users className="h-3 w-3 mr-1" />
                        Shared
                      </Badge>
                    )}
                    
                    {file.hasVersions && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Versioned
                      </Badge>
                    )}
                  </div>
                  
                  {file.downloadCount > 0 && (
                    <div className="text-xs text-gray-500">
                      {file.downloadCount} downloads
                    </div>
                  )}
                </div>

                {file.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {file.tags.slice(0, 2).map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        <Tag className="h-2 w-2 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                    {file.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{file.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredFiles.map((file) => (
                <div key={file.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={(checked) => handleFileSelect(file.id, checked as boolean)}
                    />
                    
                    <div className="flex-shrink-0">
                      {getFileIcon(file.fileType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div 
                        className="cursor-pointer"
                        onClick={() => {
                          onFileSelect?.(file);
                          setSelectedFileForAction(file);
                          setShowPreviewDialog(true);
                        }}
                      >
                        <h4 className="font-medium truncate">{file.filename}</h4>
                        {file.description && (
                          <p className="text-sm text-gray-600 truncate">{file.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div>{formatFileSize(file.fileSize)}</div>
                      <div>{formatDate(file.createdAt)}</div>
                      {file.downloadCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {file.downloadCount}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {file.isShared && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                        </Badge>
                      )}
                      
                      {file.isStarred && (
                        <Star className="h-4 w-4 fill-current text-yellow-500" />
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedFileForAction(file);
                            setShowPreviewDialog(true);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem onClick={() => handleDownload(file)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          
                          {allowShare && (
                            <DropdownMenuItem onClick={() => {
                              setSelectedFileForAction(file);
                              setShowShareDialog(true);
                            }}>
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                          )}
                          
                          {allowVersioning && (
                            <DropdownMenuItem onClick={() => {
                              setSelectedFileForAction(file);
                              setShowVersionDialog(true);
                            }}>
                              <Clock className="h-4 w-4 mr-2" />
                              Version History
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => handleToggleStar(file)}>
                            {file.isStarred ? (
                              <StarOff className="h-4 w-4 mr-2" />
                            ) : (
                              <Star className="h-4 w-4 mr-2" />
                            )}
                            {file.isStarred ? 'Unstar' : 'Star'}
                          </DropdownMenuItem>
                          
                          {allowDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedFileForAction(file);
                                  setShowDeleteDialog(true);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {file.tags.length > 0 && (
                    <div className="mt-2 ml-12 flex flex-wrap gap-1">
                      {file.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          <Tag className="h-2 w-2 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          <FileUploadZone
            onUploadComplete={(results) => {
              refreshFiles();
              setShowUploadDialog(false);
              toast({
                title: 'Success',
                description: `${results.length} files uploaded successfully`,
              });
            }}
            allowedTypes={[
              'image/*',
              'video/*',
              'audio/*',
              'application/pdf',
              'text/*',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.*'
            ]}
            maxFiles={maxFiles ? maxFiles - files.length : 10}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedFileForAction?.filename}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedFileForAction(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File Preview Dialog */}
      {selectedFileForAction && (
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getFileIcon(selectedFileForAction.fileType)}
                {selectedFileForAction.filename}
              </DialogTitle>
            </DialogHeader>
            <FilePreview 
              file={selectedFileForAction}
              onClose={() => setShowPreviewDialog(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* File Sharing Dialog */}
      {selectedFileForAction && (
        <FileSharingDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          file={selectedFileForAction}
          onShareComplete={refreshFiles}
        />
      )}

      {/* Version History Dialog */}
      {selectedFileForAction && (
        <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Version History - {selectedFileForAction.filename}</DialogTitle>
            </DialogHeader>
            <FileVersionHistory 
              fileId={selectedFileForAction.id}
              onVersionRestore={refreshFiles}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}