'use client';

import { 
 
  FolderIcon, 
  SearchIcon, 
  UploadIcon, 
  ShareIcon, 
  DownloadIcon,

  TrashIcon,
  FilterIcon,
  GridIcon,
  ListIcon,
  SortAscIcon,
  SortDescIcon,


} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useMemo } from 'react';

import { FileSharingDialog } from '@/components/files/file-sharing-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent} from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast-provider';


interface FileItem {
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
}

interface User {
  id: string;
  name: string;
  role: 'coach' | 'client' | 'admin';
  email?: string;
}

interface CoachFileManagementProps {
  userId: string;
  userRole: 'coach' | 'admin';
  onFileUpload?: () => void;
}

export function CoachFileManagement({ userId, _userRole, onFileUpload }: CoachFileManagementProps) {
  const t = useTranslations('files');
  const { success: showSuccess, error: showError } = useToast();

  // State management
  const [files, setFiles] = useState<FileItem[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'filename' | 'file_size' | 'download_count'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isBulkShareOpen, setIsBulkShareOpen] = useState(false);
  const [bulkShareSelectedClients, setBulkShareSelectedClients] = useState<string[]>([]);
  const [bulkSharePermission, setBulkSharePermission] = useState<'view' | 'download' | 'edit'>('view');
  const [bulkShareExpiresAt, setBulkShareExpiresAt] = useState('');
  const [bulkShareMessage, setBulkShareMessage] = useState('');
  const [bulkShareLoading, setBulkShareLoading] = useState(false);
  const [bulkShareError, setBulkShareError] = useState('');
  const [bulkShareSearch, setBulkShareSearch] = useState('');

  // Load files and clients data
  useEffect(() => {
    loadFiles();
    loadClients();
  }, [userId, sortBy, sortOrder]);

  const resetBulkShareState = () => {
    setBulkShareSelectedClients([]);
    setBulkSharePermission('view');
    setBulkShareExpiresAt('');
    setBulkShareMessage('');
    setBulkShareError('');
    setBulkShareSearch('');
    setBulkShareLoading(false);
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/files?userId=${userId}&sortBy=${sortBy}&sortOrder=${sortOrder}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load files');
      }

      const filesPayload = data?.data?.files ?? data.files ?? [];
      const normalizedFiles: FileItem[] = filesPayload.map((file: unknown) => ({
        id: file.id,
        filename: file.filename,
        originalFilename: file.originalFilename || file.original_filename || file.filename,
        fileType: file.fileType || file.file_type || 'application/octet-stream',
        fileSize: file.fileSize ?? file.file_size ?? 0,
        category: (file.category || file.fileCategory || 'document') as FileItem['category'],
        description: file.description || undefined,
        tags: Array.isArray(file.tags) ? file.tags : [],
        isShared: file.isShared ?? file.is_shared ?? false,
        downloadCount: file.downloadCount ?? file.download_count ?? 0,
        createdAt: file.createdAt || file.created_at || new Date().toISOString(),
        updatedAt: file.updatedAt || file.updated_at || new Date().toISOString(),
        shareCount: file.shareCount ?? file.share_count,
      }));
      setFiles(normalizedFiles);
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      // Load coach's clients based on session relationships
      const response = await fetch('/api/coach/clients');
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const clientsPayload = data?.data ?? data.clients ?? [];
        const normalizedClients: User[] = clientsPayload.map((client: unknown) => {
          const firstName = client.firstName ?? client.first_name ?? '';
          const lastName = client.lastName ?? client.last_name ?? '';
          const fullName = `${firstName} ${lastName}`.trim();

          return {
            id: client.id,
            name: fullName || client.email || 'Client',
            role: (client.role as User['role']) || 'client',
            email: client.email || undefined,
          };
        });
        setClients(normalizedClients);
      } else {
        throw new Error(data?.error || 'Failed to load clients');
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
      if (error instanceof Error) {
        showError('Failed to load clients', error.message);
      }
    }
  };

  const filteredBulkShareClients = useMemo(() => {
    if (!bulkShareSearch) {
      return clients;
    }

    const term = bulkShareSearch.toLowerCase();
    return clients.filter(client =>
      client.name.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term)
    );
  }, [clients, bulkShareSearch]);

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

    return filtered;
  }, [files, searchTerm, categoryFilter]);

  // File operations
  const handleFileShare = async (data: {
    fileId: string;
    sharedWith: string[];
    permissionType: 'view' | 'download' | 'edit';
    expiresAt?: string;
    message?: string;
  }) => {
    try {
      const response = await fetch('/api/files/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to share file');
      }

      // Refresh files to update share status
      await loadFiles();
    } catch (error) {
      throw error; // Re-throw to be handled by the dialog
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      const response = await fetch('/api/files/share', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shareId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revoke share');
      }

      // Refresh files
      await loadFiles();
    } catch (error) {
      throw error;
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!confirm(t('delete.confirm', { defaultValue: 'Are you sure you want to delete this file?' }))) {
      return;
    }

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      await loadFiles();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete file');
    }
  };

  const handleFileDownload = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`);

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const data = await response.json();

      // Open download URL in new tab
      window.open(data.downloadUrl, '_blank');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to download file');
    }
  };

  const handleBulkShare = () => {
    if (selectedFiles.length === 0) return;
    setBulkShareError('');
    setIsBulkShareOpen(true);
  };

  const handleBulkShareSubmit = async () => {
    if (selectedFiles.length === 0) {
      setBulkShareError('Please select at least one file to share.');
      return;
    }

    if (bulkShareSelectedClients.length === 0) {
      setBulkShareError('Please select at least one client to share with.');
      return;
    }

    setBulkShareLoading(true);
    setBulkShareError('');

    try {
      const response = await fetch('/api/files/bulk-share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileIds: selectedFiles,
          sharedWith: bulkShareSelectedClients,
          permissionType: bulkSharePermission,
          expiresAt: bulkShareExpiresAt ? new Date(bulkShareExpiresAt).toISOString() : undefined,
          message: bulkShareMessage || undefined,
          notifyUsers: true,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        const errorMessage = result?.error || 'Failed to share files';
        throw new Error(errorMessage);
      }

      showSuccess(
        'Files shared successfully',
        `Shared ${result?.summary?.filesProcessed ?? selectedFiles.length} file(s) with ${result?.summary?.usersSharedWith ?? bulkShareSelectedClients.length} client(s).`
      );

      setIsBulkShareOpen(false);
      resetBulkShareState();
      setSelectedFiles([]);
      await loadFiles();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to share files';
      setBulkShareError(message);
      showError('Failed to share files', message);
    } finally {
      setBulkShareLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    
    if (!confirm(t('delete.bulkConfirm', { 
      defaultValue: `Are you sure you want to delete ${selectedFiles.length} files?` 
    }))) {
      return;
    }

    // Implementation for bulk delete
    for (const fileId of selectedFiles) {
      await handleFileDelete(fileId);
    }
    
    setSelectedFiles([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('management.title', { defaultValue: 'File Management' })}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('management.subtitle', { defaultValue: 'Organize and share files with your clients' })}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={onFileUpload} className="flex items-center gap-2">
            <UploadIcon className="h-4 w-4" />
            {t('upload.button', { defaultValue: 'Upload File' })}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('search.placeholder', { defaultValue: 'Search files...' })}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full lg:w-48">
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
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field as unknown);
              setSortOrder(order as unknown);
            }}>
              <SelectTrigger className="w-full lg:w-48">
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

          {/* Bulk Actions */}
          {selectedFiles.length > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <span className="text-sm text-gray-600">
                {selectedFiles.length} files selected
              </span>
              <Button variant="outline" size="sm" onClick={handleBulkShare}>
                <ShareIcon className="h-4 w-4 mr-1" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkDelete}>
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedFiles([])}>
                Clear Selection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Files List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
        {filteredFiles.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <FolderIcon className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('empty.title', { defaultValue: 'No files found' })}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || categoryFilter !== 'all' 
                  ? t('empty.filtered', { defaultValue: 'Try adjusting your search or filters' })
                  : t('empty.upload', { defaultValue: 'Upload your first file to get started' })
                }
              </p>
              {!searchTerm && categoryFilter === 'all' && (
                <Button onClick={onFileUpload}>
                  <UploadIcon className="h-4 w-4 mr-2" />
                  {t('upload.button', { defaultValue: 'Upload File' })}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredFiles.map((file) => (
            <Card key={file.id} className={viewMode === 'list' ? 'p-0' : ''}>
              <CardContent className={viewMode === 'list' ? 'p-4' : 'p-6'}>
                <div className={viewMode === 'list' 
                  ? 'flex items-center justify-between' 
                  : 'space-y-4'
                }>
                  {/* File Info */}
                  <div className={viewMode === 'list' ? 'flex items-center gap-4' : 'space-y-2'}>
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(file.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFiles([...selectedFiles, file.id]);
                        } else {
                          setSelectedFiles(selectedFiles.filter(id => id !== file.id));
                        }
                      }}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    
                    <div className={viewMode === 'list' ? 'flex items-center gap-3' : 'text-center'}>
                      <span className="text-2xl">{getFileIcon(file.fileType)}</span>
                      <div className={viewMode === 'grid' ? 'text-center' : ''}>
                        <h3 className="font-medium text-gray-900 truncate">
                          {file.filename}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {formatFileSize(file.fileSize)} • {new Date(file.createdAt).toLocaleDateString()}
                        </p>
                        {file.description && (
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {file.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tags and Badges */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="secondary" className={getCategoryColor(file.category)}>
                        {file.category}
                      </Badge>
                      {file.isShared && (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          <ShareIcon className="h-3 w-3 mr-1" />
                          Shared
                        </Badge>
                      )}
                      {file.downloadCount > 0 && (
                        <Badge variant="outline" className="text-gray-600">
                          <DownloadIcon className="h-3 w-3 mr-1" />
                          {file.downloadCount}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFileDownload(file.id)}
                    >
                      <DownloadIcon className="h-4 w-4" />
                    </Button>
                    
                    <FileSharingDialog
                      fileId={file.id}
                      filename={file.filename}
                      availableUsers={clients}
                      onShare={handleFileShare}
                      onRevokeShare={handleRevokeShare}
                    >
                      <Button variant="ghost" size="sm">
                        <ShareIcon className="h-4 w-4" />
                      </Button>
                    </FileSharingDialog>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFileDelete(file.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Stats */}
      {filteredFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{filteredFiles.length}</p>
                <p className="text-sm text-gray-600">Total Files</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {filteredFiles.filter(f => f.isShared).length}
                </p>
                <p className="text-sm text-gray-600">Shared Files</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {formatFileSize(filteredFiles.reduce((sum, f) => sum + f.fileSize, 0))}
                </p>
                <p className="text-sm text-gray-600">Total Size</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredFiles.reduce((sum, f) => sum + f.downloadCount, 0)}
                </p>
                <p className="text-sm text-gray-600">Downloads</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={isBulkShareOpen}
        onOpenChange={(open) => {
          setIsBulkShareOpen(open);
          if (!open) {
            resetBulkShareState();
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Share {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {bulkShareError && (
              <Alert variant="destructive">
                <AlertDescription>{bulkShareError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Select clients</p>
              <Input
                placeholder="Search clients..."
                value={bulkShareSearch}
                onChange={(event) => setBulkShareSearch(event.target.value)}
              />
              <div className="max-h-48 overflow-y-auto border rounded-md">
                {filteredBulkShareClients.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">
                    No clients found.
                  </div>
                ) : (
                  filteredBulkShareClients.map((client) => {
                    const isSelected = bulkShareSelectedClients.includes(client.id);
                    return (
                      <label
                        key={client.id}
                        className="flex items-center justify-between gap-3 px-4 py-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{client.name}</p>
                          {client.email && (
                            <p className="text-xs text-gray-600">{client.email}</p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setBulkShareSelectedClients([...bulkShareSelectedClients, client.id]);
                            } else {
                              setBulkShareSelectedClients(
                                bulkShareSelectedClients.filter((id) => id !== client.id)
                              );
                            }
                          }}
                          className="h-4 w-4"
                        />
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Permission</p>
                <Select value={bulkSharePermission} onValueChange={(value) => setBulkSharePermission(value as typeof bulkSharePermission)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">Can view</SelectItem>
                    <SelectItem value="download">Can download</SelectItem>
                    <SelectItem value="edit">Can edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Expiration</p>
                <Input
                  type="datetime-local"
                  value={bulkShareExpiresAt}
                  onChange={(event) => setBulkShareExpiresAt(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Message (optional)</p>
              <Textarea
                value={bulkShareMessage}
                onChange={(event) => setBulkShareMessage(event.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsBulkShareOpen(false)} disabled={bulkShareLoading}>
              Cancel
            </Button>
            <Button onClick={handleBulkShareSubmit} disabled={bulkShareLoading}>
              {bulkShareLoading ? 'Sharing...' : 'Share files'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
