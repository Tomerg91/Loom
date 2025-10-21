'use client';

import { 
  FolderIcon, 
  UploadIcon, 
  SettingsIcon,
  ChevronRightIcon,
  HomeIcon,
  AlertTriangleIcon,
  FileIcon,
  UsersIcon,
  TagIcon,
  ShareIcon,
  BarChart3Icon,
  RefreshCwIcon,
  FilterIcon,
  SortAscIcon,
  XIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useMemo } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { FileBrowser, FileItem } from './file-browser';
import { FileOrganizationPanel, VirtualFolder, TagInfo } from './file-organization-panel';
import { FileSharingDialog } from './file-sharing-dialog';
import { FileUploadZone, UploadFile } from './file-upload-zone';


interface FileManagementPageProps {
  userId: string;
  userRole: 'coach' | 'client' | 'admin';
  initialFiles?: FileItem[];
  className?: string;
}

interface FileStats {
  totalFiles: number;
  totalSize: number;
  sharedFiles: number;
  totalDownloads: number;
  recentUploads: number;
  filesByCategory: Record<string, number>;
}

export function FileManagementPage({
  userId,
  userRole,
  initialFiles = [],
  className = '',
}: FileManagementPageProps) {
  const t = useTranslations('files');
  
  // State management
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState('browser');
  
  // Organization state
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [virtualFolders, setVirtualFolders] = useState<VirtualFolder[]>([]);
  const [availableTags, setAvailableTags] = useState<TagInfo[]>([]);
  
  // UI state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareTargetFile, setShareTargetFile] = useState<FileItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Breadcrumb state
  const [breadcrumb, setBreadcrumb] = useState<Array<{ label: string; value?: string }>>([
    { label: 'Files', value: 'all' }
  ]);

  // Load data on component mount
  useEffect(() => {
    loadFiles();
    loadVirtualFolders();
    loadTags();
  }, [userId]);

  // Update breadcrumb based on current selection
  useEffect(() => {
    const newBreadcrumb = [{ label: 'Files', value: 'all' }];
    
    if (selectedFolder) {
      const folder = virtualFolders.find(f => f.id === selectedFolder);
      if (folder) {
        newBreadcrumb.push({ label: folder.name, value: selectedFolder });
      }
    }
    
    if (selectedTags.length > 0) {
      newBreadcrumb.push({ 
        label: selectedTags.length === 1 ? `#${selectedTags[0]}` : `${selectedTags.length} tags`,
        value: 'tags' 
      });
    }
    
    setBreadcrumb(newBreadcrumb);
  }, [selectedFolder, selectedTags, virtualFolders]);

  // API calls
  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/files?ownerId=${userId}&limit=1000`);
      
      if (!response.ok) {
        throw new Error('Failed to load files');
      }
      
      const data = await response.json();
      // Map the file data to match the FileItem interface
      const mappedFiles = (data.files || []).map((file: any) => ({
        id: file.id,
        filename: file.filename,
        originalFilename: file.originalFilename || file.filename,
        fileType: file.fileType,
        fileSize: file.fileSize,
        category: file.fileCategory,
        tags: file.tags || [],
        isShared: file.isShared,
        downloadCount: file.downloadCount,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        description: file.description,
        ownerName: file.ownerName,
        storageUrl: file.storageUrl,
        userId: file.userId,
      }));
      setFiles(mappedFiles);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const loadVirtualFolders = async () => {
    try {
      // Mock data - in real app this would come from API
      const mockFolders: VirtualFolder[] = [
        {
          id: '1',
          name: 'Recent Uploads',
          description: 'Files uploaded in the last 7 days',
          color: 'blue',
          icon: 'clock',
          rules: {
            dateRange: {
              start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            }
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fileCount: files.filter(f => 
            new Date(f.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length,
        },
        {
          id: '2',
          name: 'Shared Files',
          description: 'Files shared with others',
          color: 'green',
          icon: 'star',
          rules: {
            searchTerms: ['shared'],
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fileCount: files.filter(f => f.isShared).length,
        },
        {
          id: '3',
          name: 'Large Files',
          description: 'Files larger than 10MB',
          color: 'red',
          icon: 'file',
          rules: {
            sizeRange: {
              min: 10 * 1024 * 1024,
            }
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fileCount: files.filter(f => f.fileSize > 10 * 1024 * 1024).length,
        },
      ];
      setVirtualFolders(mockFolders);
    } catch (error) {
      console.error('Failed to load virtual folders:', error);
    }
  };

  const loadTags = async () => {
    try {
      // Extract unique tags from files and count them
      const tagCounts: Record<string, number> = {};
      files.forEach(file => {
        file.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      const tags: TagInfo[] = Object.entries(tagCounts).map(([name, count]) => ({
        name,
        count,
        color: 'blue', // Default color
      }));

      setAvailableTags(tags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  // Filter files based on current selection
  const filteredFiles = useMemo(() => {
    let filtered = files;

    // Apply virtual folder filter
    if (selectedFolder) {
      const folder = virtualFolders.find(f => f.id === selectedFolder);
      if (folder) {
        const rules = folder.rules;
        
        // Filter by tags
        if (rules.tags && rules.tags.length > 0) {
          filtered = filtered.filter(file =>
            rules.tags!.some(tag => file.tags.includes(tag))
          );
        }
        
        // Filter by categories
        if (rules.categories && rules.categories.length > 0) {
          filtered = filtered.filter(file =>
            rules.categories!.includes(file.category)
          );
        }
        
        // Filter by search terms
        if (rules.searchTerms && rules.searchTerms.length > 0) {
          filtered = filtered.filter(file =>
            rules.searchTerms!.some(term =>
              file.filename.toLowerCase().includes(term.toLowerCase()) ||
              file.description?.toLowerCase().includes(term.toLowerCase())
            )
          );
        }
        
        // Filter by date range
        if (rules.dateRange) {
          if (rules.dateRange.start) {
            filtered = filtered.filter(file =>
              new Date(file.createdAt) >= new Date(rules.dateRange!.start!)
            );
          }
          if (rules.dateRange.end) {
            filtered = filtered.filter(file =>
              new Date(file.createdAt) <= new Date(rules.dateRange!.end!)
            );
          }
        }
        
        // Filter by size range
        if (rules.sizeRange) {
          if (rules.sizeRange.min) {
            filtered = filtered.filter(file => file.fileSize >= rules.sizeRange!.min!);
          }
          if (rules.sizeRange.max) {
            filtered = filtered.filter(file => file.fileSize <= rules.sizeRange!.max!);
          }
        }
      }
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(file =>
        selectedTags.some(tag => file.tags.includes(tag))
      );
    }

    return filtered;
  }, [files, selectedFolder, selectedTags, virtualFolders]);

  // Calculate statistics
  const fileStats = useMemo((): FileStats => {
    const totalSize = filteredFiles.reduce((sum, file) => sum + file.fileSize, 0);
    const sharedFiles = filteredFiles.filter(file => file.isShared).length;
    const totalDownloads = filteredFiles.reduce((sum, file) => sum + file.downloadCount, 0);
    const recentUploads = filteredFiles.filter(file =>
      new Date(file.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    const filesByCategory: Record<string, number> = {};
    filteredFiles.forEach(file => {
      filesByCategory[file.category] = (filesByCategory[file.category] || 0) + 1;
    });

    return {
      totalFiles: filteredFiles.length,
      totalSize,
      sharedFiles,
      totalDownloads,
      recentUploads,
      filesByCategory,
    };
  }, [filteredFiles]);

  // Event handlers
  const handleFileUpload = async (uploadResults: any[]) => {
    // Refresh files after upload
    await loadFiles();
    await loadTags();
    setUploadDialogOpen(false);
  };

  const handleFileAction = (action: string, fileId: string, file: FileItem) => {
    switch (action) {
      case 'share':
        setShareTargetFile(file);
        setShareDialogOpen(true);
        break;
      case 'delete':
        handleDeleteFile(fileId);
        break;
      default:
        console.log('File action:', action, fileId);
        break;
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete file');
      }
      
      await loadFiles();
      await loadTags();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete file');
    }
  };

  const handleCreateFolder = (folder: Omit<VirtualFolder, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newFolder: VirtualFolder = {
      ...folder,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setVirtualFolders(prev => [...prev, newFolder]);
  };

  const handleUpdateFolder = (folderId: string, updates: Partial<VirtualFolder>) => {
    setVirtualFolders(prev =>
      prev.map(folder =>
        folder.id === folderId
          ? { ...folder, ...updates, updatedAt: new Date().toISOString() }
          : folder
      )
    );
  };

  const handleDeleteFolder = (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder?')) return;
    setVirtualFolders(prev => prev.filter(f => f.id !== folderId));
    if (selectedFolder === folderId) {
      setSelectedFolder(null);
    }
  };

  const handleCreateTag = (tag: { name: string; color?: string; description?: string }) => {
    // In real app, this would create the tag via API
    console.log('Create tag:', tag);
    loadTags();
  };

  const handleDeleteTag = (tagName: string) => {
    if (!confirm(`Are you sure you want to delete the tag "${tagName}"?`)) return;
    // In real app, this would remove the tag from all files via API
    console.log('Delete tag:', tagName);
    loadTags();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadFiles(),
      loadVirtualFolders(),
      loadTags(),
    ]);
    setRefreshing(false);
  };

  const handleShareFile = async (data: {
    fileId: string;
    sharedWith: string[];
    permissionType: 'view' | 'download' | 'edit';
    expiresAt?: string;
    message?: string;
  }) => {
    try {
      const response = await fetch('/api/files/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to share file');
      }
      
      // Refresh files to show updated sharing status
      await loadFiles();
      setShareDialogOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to share file');
      throw error; // Re-throw so the dialog can handle it
    }
  };

  const handleRevokeFileShare = async (shareId: string) => {
    try {
      const response = await fetch('/api/files/share', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revoke share');
      }
      
      // Refresh files to show updated sharing status
      await loadFiles();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to revoke share');
      throw error; // Re-throw so the dialog can handle it
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <HomeIcon className="h-4 w-4" />
              {breadcrumb.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  {index > 0 && <ChevronRightIcon className="h-3 w-3" />}
                  <button
                    onClick={() => {
                      if (item.value === 'all') {
                        setSelectedFolder(null);
                        setSelectedTags([]);
                      }
                    }}
                    className="hover:text-gray-900 transition-colors"
                  >
                    {item.label}
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900">
            {t('management.title', { defaultValue: 'File Management' })}
          </h1>
          <p className="text-gray-600">
            {t('management.subtitle', { defaultValue: 'Organize and manage your files' })}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCwIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <UploadIcon className="h-4 w-4 mr-2" />
            {t('upload.button', { defaultValue: 'Upload Files' })}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} border-r bg-gray-50 overflow-y-auto transition-all`}>
          {!sidebarCollapsed && (
            <div className="p-4">
              {/* Quick Stats */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <BarChart3Icon className="h-4 w-4" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="font-bold text-blue-600">{fileStats.totalFiles}</div>
                      <div className="text-gray-600">Files</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="font-bold text-green-600">{formatFileSize(fileStats.totalSize)}</div>
                      <div className="text-gray-600">Total Size</div>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded">
                      <div className="font-bold text-purple-600">{fileStats.sharedFiles}</div>
                      <div className="text-gray-600">Shared</div>
                    </div>
                    <div className="text-center p-2 bg-orange-50 rounded">
                      <div className="font-bold text-orange-600">{fileStats.recentUploads}</div>
                      <div className="text-gray-600">Recent</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Organization Panel */}
              <FileOrganizationPanel
                availableTags={availableTags}
                virtualFolders={virtualFolders}
                selectedTags={selectedTags}
                selectedFolder={selectedFolder}
                onTagSelect={setSelectedTags}
                onFolderSelect={setSelectedFolder}
                onCreateFolder={handleCreateFolder}
                onUpdateFolder={handleUpdateFolder}
                onDeleteFolder={handleDeleteFolder}
                onCreateTag={handleCreateTag}
                onDeleteTag={handleDeleteTag}
              />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="m-6 mb-0">
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Active Filters */}
          {(selectedTags.length > 0 || selectedFolder) && (
            <div className="p-4 bg-blue-50 border-b">
              <div className="flex items-center gap-2 mb-2">
                <FilterIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Active Filters:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedFolder && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <FolderIcon className="h-3 w-3" />
                    {virtualFolders.find(f => f.id === selectedFolder)?.name}
                    <button onClick={() => setSelectedFolder(null)}>
                      <XIcon className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    <TagIcon className="h-3 w-3" />
                    {tag}
                    <button onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}>
                      <XIcon className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFolder(null);
                    setSelectedTags([]);
                  }}
                >
                  Clear All
                </Button>
              </div>
            </div>
          )}

          {/* File Browser */}
          <div className="p-6 overflow-y-auto">
            <FileBrowser
              files={filteredFiles}
              loading={loading}
              onFileAction={handleFileAction}
              onFileDownload={(file) => console.log('Download file:', file)}
              onFileShare={(file) => {
                setShareTargetFile(file);
                setShareDialogOpen(true);
              }}
              onFileDelete={(file) => handleDeleteFile(file.id)}
              className="min-h-[400px]"
            />
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          <FileUploadZone
            onUploadComplete={handleFileUpload}
            maxFiles={10}
            maxFileSize={100 * 1024 * 1024} // 100MB
            autoUpload={false}
            showPreview={true}
          />
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      {/* Real file sharing will be handled in the Dialog below */}

      {shareTargetFile && (
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShareIcon className="h-5 w-5" />
                Share "{shareTargetFile.filename}"
              </DialogTitle>
            </DialogHeader>
            <FileSharingDialog
              fileId={shareTargetFile.id}
              filename={shareTargetFile.filename}
              availableUsers={[]} // Would be loaded from API based on coach-client relationships
              onShare={handleShareFile}
              onRevokeShare={handleRevokeFileShare}
            >
              <div className="space-y-4">
                <p className="text-gray-600">
                  Share this file with your {userRole === 'coach' ? 'clients' : 'coach'} or other authorized users.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </FileSharingDialog>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}