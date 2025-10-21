'use client';

import { 
  FileIcon, 
  FolderIcon, 
  SearchIcon, 
  DownloadIcon,
  EyeIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  AlertTriangleIcon,
  ShareIcon,
  FilterIcon,
  SortAscIcon,
  SortDescIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useMemo } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


interface SharedFile {
  id: string;
  file: {
    id: string;
    filename: string;
    fileType: string;
    fileSize: number;
    description?: string;
  };
  sharedBy: {
    id: string;
    name: string;
    role: 'coach' | 'admin';
  };
  permissionType: 'view' | 'download' | 'edit';
  accessCount: number;
  lastAccessedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  isOwner: boolean;
}

interface ClientSharedFilesProps {
  userId: string;
}

export function ClientSharedFiles({ userId }: ClientSharedFilesProps) {
  const t = useTranslations('files');
  
  // State management
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [permissionFilter, setPermissionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'filename' | 'file_size' | 'access_count'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [downloading, setDownloading] = useState<string>('');

  // Load shared files
  useEffect(() => {
    loadSharedFiles();
  }, [userId]);

  const loadSharedFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/files/share?type=shared_with_me');
      
      if (!response.ok) {
        throw new Error('Failed to load shared files');
      }
      
      const data = await response.json();
      setSharedFiles(data.shares || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load shared files');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort files
  const filteredFiles = useMemo(() => {
    let filtered = sharedFiles;

    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(share =>
        share.file.filename.toLowerCase().includes(term) ||
        share.file.description?.toLowerCase().includes(term) ||
        share.sharedBy.name.toLowerCase().includes(term)
      );
    }

    // Permission filter
    if (permissionFilter !== 'all') {
      filtered = filtered.filter(share => share.permissionType === permissionFilter);
    }

    // Sort files
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'filename':
          aValue = a.file.filename;
          bValue = b.file.filename;
          break;
        case 'file_size':
          aValue = a.file.fileSize;
          bValue = b.file.fileSize;
          break;
        case 'access_count':
          aValue = a.accessCount;
          bValue = b.accessCount;
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
  }, [sharedFiles, searchTerm, permissionFilter, sortBy, sortOrder]);

  // File operations
  const handleFileDownload = async (fileId: string, shareId: string) => {
    try {
      setDownloading(fileId);
      
      const response = await fetch(`/api/files/${fileId}`);
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const data = await response.json();
      
      // Track the access
      try {
        await fetch(`/api/files/share/access`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ shareId }),
        });
      } catch (error) {
        console.error('Failed to track access:', error);
      }
      
      // Open download URL in new tab
      window.open(data.downloadUrl, '_blank');
      
      // Refresh the list to update access counts
      await loadSharedFiles();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to download file');
    } finally {
      setDownloading('');
    }
  };

  const handleFileView = async (fileId: string, shareId: string) => {
    // Similar to download but for view-only files
    await handleFileDownload(fileId, shareId);
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

  const getPermissionIcon = (permission: 'view' | 'download' | 'edit') => {
    switch (permission) {
      case 'view':
        return <EyeIcon className="h-4 w-4 text-blue-600" />;
      case 'download':
        return <DownloadIcon className="h-4 w-4 text-green-600" />;
      case 'edit':
        return <FileIcon className="h-4 w-4 text-purple-600" />;
      default:
        return <EyeIcon className="h-4 w-4 text-blue-600" />;
    }
  };

  const getPermissionLabel = (permission: 'view' | 'download' | 'edit') => {
    switch (permission) {
      case 'view':
        return t('permissions.view', { defaultValue: 'Can view' });
      case 'download':
        return t('permissions.download', { defaultValue: 'Can download' });
      case 'edit':
        return t('permissions.edit', { defaultValue: 'Can edit' });
      default:
        return t('permissions.view', { defaultValue: 'Can view' });
    }
  };

  const isExpiringSoon = (expiresAt?: string | null) => {
    if (!expiresAt) return false;
    const expires = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = (expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 3 && daysUntilExpiry > 0;
  };

  const isExpired = (expiresAt?: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
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
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {t('shared.title', { defaultValue: 'Files Shared With Me' })}
        </h2>
        <p className="text-gray-600 mt-1">
          {t('shared.subtitle', { defaultValue: 'Access files shared by your coach' })}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
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

            {/* Permission Filter */}
            <Select value={permissionFilter} onValueChange={setPermissionFilter}>
              <SelectTrigger className="w-full md:w-48">
                <FilterIcon className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Permission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Permissions</SelectItem>
                <SelectItem value="view">View Only</SelectItem>
                <SelectItem value="download">Can Download</SelectItem>
                <SelectItem value="edit">Can Edit</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field as any);
              setSortOrder(order as any);
            }}>
              <SelectTrigger className="w-full md:w-48">
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
                <SelectItem value="access_count-desc">Most Accessed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      <div className="space-y-2">
        {filteredFiles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <ShareIcon className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || permissionFilter !== 'all' 
                  ? t('shared.noFilesFiltered', { defaultValue: 'No files match your search' })
                  : t('shared.noFiles', { defaultValue: 'No files shared with you yet' })
                }
              </h3>
              <p className="text-gray-600">
                {searchTerm || permissionFilter !== 'all'
                  ? t('shared.tryDifferentSearch', { defaultValue: 'Try adjusting your search or filters' })
                  : t('shared.askCoach', { defaultValue: 'Ask your coach to share relevant files with you' })
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFiles.map((share) => (
            <Card key={share.id} className={isExpired(share.expiresAt) ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  {/* File Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className="text-2xl flex-shrink-0">
                      {getFileIcon(share.file.fileType)}
                    </span>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {share.file.filename}
                        </h3>
                        {isExpired(share.expiresAt) && (
                          <Badge variant="destructive">
                            <AlertTriangleIcon className="h-3 w-3 mr-1" />
                            Expired
                          </Badge>
                        )}
                        {isExpiringSoon(share.expiresAt) && !isExpired(share.expiresAt) && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            Expires Soon
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{formatFileSize(share.file.fileSize)}</span>
                        <div className="flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          <span>{share.sharedBy.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {share.sharedBy.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {getPermissionIcon(share.permissionType)}
                          <span>{getPermissionLabel(share.permissionType)}</span>
                        </div>
                      </div>
                      
                      {share.file.description && (
                        <p className="text-sm text-gray-500 mt-1 truncate">
                          {share.file.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          <span>Shared {new Date(share.createdAt).toLocaleDateString()}</span>
                        </div>
                        {share.accessCount > 0 && (
                          <span>Accessed {share.accessCount} times</span>
                        )}
                        {share.expiresAt && !isExpired(share.expiresAt) && (
                          <span>Expires {new Date(share.expiresAt).toLocaleDateString()}</span>
                        )}
                        {share.lastAccessedAt && (
                          <span>Last accessed {new Date(share.lastAccessedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isExpired(share.expiresAt) && (
                      <>
                        {share.permissionType === 'view' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFileView(share.file.id, share.id)}
                            disabled={downloading === share.file.id}
                          >
                            {downloading === share.file.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                            ) : (
                              <EyeIcon className="h-4 w-4 mr-2" />
                            )}
                            View
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFileDownload(share.file.id, share.id)}
                            disabled={downloading === share.file.id}
                          >
                            {downloading === share.file.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                            ) : (
                              <DownloadIcon className="h-4 w-4 mr-2" />
                            )}
                            Download
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {filteredFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{filteredFiles.length}</p>
                <p className="text-sm text-gray-600">Shared Files</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {filteredFiles.filter(f => f.permissionType === 'download').length}
                </p>
                <p className="text-sm text-gray-600">Downloadable</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {formatFileSize(filteredFiles.reduce((sum, f) => sum + f.file.fileSize, 0))}
                </p>
                <p className="text-sm text-gray-600">Total Size</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredFiles.reduce((sum, f) => sum + f.accessCount, 0)}
                </p>
                <p className="text-sm text-gray-600">Total Accesses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}