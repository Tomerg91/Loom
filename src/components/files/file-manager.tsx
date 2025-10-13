'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  Upload, 
  FolderPlus, 
  Search, 
  Filter, 
  Grid, 
  List, 
  SortAsc, 
  SortDesc,
  Download,
  Share2,
  MoreHorizontal,
  Eye,
  Edit3,
  Trash2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';

import { FileUpload } from '@/components/ui/file-upload';
import { FileList } from './file-list';
import { FileGrid } from './file-grid';
import { FolderBreadcrumb } from './folder-breadcrumb';
import { FilePreview } from './file-preview';
import { ShareDialog } from './share-dialog';

import { useFiles } from '@/hooks/use-files';
import { useFolders } from '@/hooks/use-folders';
import { FileMetadata, FolderMetadata } from '@/lib/services/file-management-service';

export interface FileManagerProps {
  userId: string;
  sessionId?: string;
  initialFolderId?: string;
  allowUpload?: boolean;
  allowCreateFolder?: boolean;
  compactMode?: boolean;
  className?: string;
}

export function FileManager({
  userId,
  sessionId,
  initialFolderId,
  allowUpload = true,
  allowCreateFolder = true,
  compactMode = false,
  className
}: FileManagerProps) {
  const { toast } = useToast();

  // State management
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId || null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'created_at' | 'updated_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [shareFile, setShareFile] = useState<FileMetadata | null>(null);
  const [dragOver, setDragOver] = useState(false);
  
  // Form state
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadIsPublic, setUploadIsPublic] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Hooks
  const { 
    files, 
    loading: filesLoading, 
    error: filesError, 
    uploadFile,
    updateFile,
    deleteFile,
    refetch: refetchFiles 
  } = useFiles({
    ownerId: userId,
    folderId: currentFolderId,
    query: searchQuery,
    sortBy,
    sortOrder,
  });

  const {
    folders,
    loading: foldersLoading,
    error: foldersError,
    createFolder,
    refetch: refetchFolders
  } = useFolders({
    ownerId: userId,
    parentFolderId: currentFolderId,
  });

  // Effects
  useEffect(() => {
    refetchFiles();
    refetchFolders();
  }, [currentFolderId, searchQuery, sortBy, sortOrder]);

  // Handlers
  const handleFileSelect = useCallback((fileId: string, selected: boolean) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(fileId);
      } else {
        newSet.delete(fileId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedFiles(new Set(files.map(f => f.id)));
    } else {
      setSelectedFiles(new Set());
    }
  }, [files]);

  const handleFolderCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    try {
      await createFolder({
        name: folderName,
        parentFolderId: currentFolderId,
        description: folderDescription || undefined
      });
      
      setFolderName('');
      setFolderDescription('');
      setIsCreateFolderDialogOpen(false);
      toast({
        title: 'Folder created',
        description: `Successfully created folder \"${folderName}\"`,
      });
      refetchFolders();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create folder. Please try again.',
        variant: 'destructive',
      });
    }
  }, [folderName, folderDescription, currentFolderId, createFolder, refetchFolders]);

  const handleFileUpload = useCallback(async () => {
    if (uploadFiles.length === 0) return;

    const uploadPromises = uploadFiles.map(async (file, index) => {
      const fileId = `${file.name}-${index}`;
      
      try {
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        
        // Simulate progress updates (in real implementation, this would come from the upload service)
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const current = prev[fileId] || 0;
            if (current >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return { ...prev, [fileId]: current + 10 };
          });
        }, 200);

        await uploadFile({
          file,
          folderId: currentFolderId,
          sessionId,
          description: uploadDescription || undefined,
          tags: uploadTags.split(',').map(t => t.trim()).filter(Boolean),
          isPublic: uploadIsPublic,
        });

        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
        
      } catch (error) {
        setUploadProgress(prev => ({ ...prev, [fileId]: -1 })); // -1 indicates error
        throw error;
      }
    });

    try {
      await Promise.all(uploadPromises);
      
      setUploadFiles([]);
      setUploadDescription('');
      setUploadTags('');
      setUploadIsPublic(false);
      setUploadProgress({});
      setIsUploadDialogOpen(false);
      
      toast({
        title: 'Upload complete',
        description: `Successfully uploaded ${uploadFiles.length} file(s)`,
      });
      
      refetchFiles();
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Some files failed to upload. Please try again.',
        variant: 'destructive',
      });
    }
  }, [uploadFiles, currentFolderId, sessionId, uploadDescription, uploadTags, uploadIsPublic, uploadFile, refetchFiles]);

  const handleFileDelete = useCallback(async (fileId: string) => {
    try {
      await deleteFile(fileId);
      toast({
        title: 'File deleted',
        description: 'File has been successfully deleted',
      });
      refetchFiles();
      setSelectedFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete file. Please try again.',
        variant: 'destructive',
      });
    }
  }, [deleteFile, refetchFiles]);

  const handleBulkDelete = useCallback(async () => {
    const fileIds = Array.from(selectedFiles);
    try {
      await Promise.all(fileIds.map(id => deleteFile(id)));
      toast({
        title: 'Files deleted',
        description: `Successfully deleted ${fileIds.length} file(s)`,
      });
      refetchFiles();
      setSelectedFiles(new Set());
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete some files. Please try again.',
        variant: 'destructive',
      });
    }
  }, [selectedFiles, deleteFile, refetchFiles]);

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setUploadFiles(prev => [...prev, ...droppedFiles]);
      setIsUploadDialogOpen(true);
    }
  }, []);

  const loading = filesLoading || foldersLoading;
  const error = filesError || foldersError;

  return (
    <div 
      className={`file-manager ${className || ''} ${compactMode ? 'compact' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div className="fixed inset-0 bg-blue-500/20 border-2 border-dashed border-blue-500 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <Upload className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-center">Drop files here to upload</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="file-manager-header mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`font-semibold ${compactMode ? 'text-lg' : 'text-2xl'}`}>
            File Manager
          </h2>
          <div className="flex items-center gap-2">
            {allowCreateFolder && (
              <Dialog open={isCreateFolderDialogOpen} onOpenChange={setIsCreateFolderDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size={compactMode ? 'sm' : 'default'}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Folder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                    <DialogDescription>
                      Create a new folder to organize your files.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleFolderCreate} className="space-y-4">
                    <div>
                      <Label htmlFor="folder-name">Folder Name</Label>
                      <Input
                        id="folder-name"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        placeholder="Enter folder name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="folder-description">Description (optional)</Label>
                      <Textarea
                        id="folder-description"
                        value={folderDescription}
                        onChange={(e) => setFolderDescription(e.target.value)}
                        placeholder="Enter folder description"
                        rows={3}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCreateFolderDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Create Folder</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            
            {allowUpload && (
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button size={compactMode ? 'sm' : 'default'}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Upload Files</DialogTitle>
                    <DialogDescription>
                      Upload files to {currentFolderId ? 'the current folder' : 'your file library'}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <FileUpload
                      onFileSelect={(file) => setUploadFiles(prev => [...prev, file])}
                      onFileRemove={() => setUploadFiles([])}
                      variant="document"
                      acceptedTypes={['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.*']}
                      maxSize={10 * 1024 * 1024} // 10MB
                      showPreview={false}
                    />
                    
                    {uploadFiles.length > 0 && (
                      <div className="space-y-2">
                        <Label>Selected Files ({uploadFiles.length})</Label>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {uploadFiles.map((file, index) => {
                            const fileId = `${file.name}-${index}`;
                            const progress = uploadProgress[fileId];
                            return (
                              <div key={fileId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm font-medium truncate">{file.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </span>
                                  {progress !== undefined && (
                                    <div className="w-16">
                                      {progress === -1 ? (
                                        <span className="text-xs text-red-500">Error</span>
                                      ) : progress === 100 ? (
                                        <span className="text-xs text-green-500">Done</span>
                                      ) : (
                                        <Progress value={progress} className="h-2" />
                                      )}
                                    </div>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setUploadFiles(prev => prev.filter((_, i) => i !== index))}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList>
                        <TabsTrigger value="basic">Basic</TabsTrigger>
                        <TabsTrigger value="advanced">Advanced</TabsTrigger>
                      </TabsList>
                      <TabsContent value="basic" className="space-y-4">
                        <div>
                          <Label htmlFor="upload-description">Description</Label>
                          <Textarea
                            id="upload-description"
                            value={uploadDescription}
                            onChange={(e) => setUploadDescription(e.target.value)}
                            placeholder="Add a description for these files"
                            rows={3}
                          />
                        </div>
                      </TabsContent>
                      <TabsContent value="advanced" className="space-y-4">
                        <div>
                          <Label htmlFor="upload-tags">Tags</Label>
                          <Input
                            id="upload-tags"
                            value={uploadTags}
                            onChange={(e) => setUploadTags(e.target.value)}
                            placeholder="tag1, tag2, tag3"
                          />
                          <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="upload-public"
                            checked={uploadIsPublic}
                            onCheckedChange={setUploadIsPublic}
                          />
                          <Label htmlFor="upload-public">Make files public</Label>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleFileUpload} 
                      disabled={uploadFiles.length === 0 || Object.values(uploadProgress).some(p => p >= 0 && p < 100)}
                    >
                      Upload {uploadFiles.length > 0 && `(${uploadFiles.length})`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Breadcrumb */}
        <FolderBreadcrumb 
          currentFolderId={currentFolderId}
          onNavigate={setCurrentFolderId}
        />

        {/* Controls */}
        <div className="flex items-center justify-between gap-4 mt-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4 mr-2" /> : <SortDesc className="h-4 w-4 mr-2" />}
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy('name')}>
                  Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('size')}>
                  Size
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('created_at')}>
                  Created Date
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('updated_at')}>
                  Modified Date
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                  {sortOrder === 'asc' ? 'Descending' : 'Ascending'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="flex rounded-lg border">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Selection controls */}
        {selectedFiles.size > 0 && (
          <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg mt-4">
            <span className="text-sm font-medium">
              {selectedFiles.size} file(s) selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedFiles(new Set())}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Content */}
      <div className="file-manager-content">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : viewMode === 'grid' ? (
          <FileGrid
            files={files}
            folders={folders}
            selectedFiles={selectedFiles}
            onFileSelect={handleFileSelect}
            onSelectAll={handleSelectAll}
            onFolderNavigate={setCurrentFolderId}
            onFilePreview={setPreviewFile}
            onFileShare={setShareFile}
            onFileDelete={handleFileDelete}
            compactMode={compactMode}
          />
        ) : (
          <FileList
            files={files}
            folders={folders}
            selectedFiles={selectedFiles}
            onFileSelect={handleFileSelect}
            onSelectAll={handleSelectAll}
            onFolderNavigate={setCurrentFolderId}
            onFilePreview={setPreviewFile}
            onFileShare={setShareFile}
            onFileDelete={handleFileDelete}
            compactMode={compactMode}
          />
        )}
      </div>

      {/* File preview dialog */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          open={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Share dialog */}
      {shareFile && (
        <ShareDialog
          file={shareFile}
          open={!!shareFile}
          onClose={() => setShareFile(null)}
        />
      )}
    </div>
  );
}