'use client';

import { 
  FileIcon, 
  FolderIcon, 
  UploadIcon, 
  DownloadIcon,
  PlusIcon,
  TrashIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  UserIcon,
  CalendarIcon,
  FileTextIcon,
  PlayIcon,
  BookOpenIcon,
  GraduationCapIcon,
  XIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logger } from '@/lib/logger';


interface SessionFile {
  id: string;
  file: {
    id: string;
    filename: string;
    fileType: string;
    fileSize: number;
    description?: string;
    tags: string[];
  };
  category: 'preparation' | 'notes' | 'recording' | 'resource';
  isRequired: boolean;
  uploadedBy?: {
    id: string;
    name: string;
  };
  attachedAt: string;
}

interface UserFile {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  description?: string;
  tags: string[];
  createdAt: string;
}

interface SessionFileManagerProps {
  sessionId: string;
  sessionTitle: string;
  userRole: 'coach' | 'client' | 'admin';
  userId: string;
}

export function SessionFileManager({ 
  sessionId, 
  sessionTitle, 
  userRole, 
  userId 
}: SessionFileManagerProps) {
  const t = useTranslations('sessions');
  
  // State management
  const [sessionFiles, setSessionFiles] = useState<SessionFile[]>([]);
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [addFileDialogOpen, setAddFileDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [attachingFiles, setAttachingFiles] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Load session files and user files
  useEffect(() => {
    loadSessionFiles();
    loadUserFiles();
  }, [sessionId, userId]);

  const loadSessionFiles = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/files`);
      
      if (!response.ok) {
        throw new Error('Failed to load session files');
      }
      
      const data = await response.json();
      setSessionFiles(data.files || []);
    } catch (error) {
      logger.error('Error loading session files:', error);
      setError(error instanceof Error ? error.message : 'Failed to load session files');
    }
  };

  const loadUserFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/files?userId=${userId}&limit=100`);
      
      if (response.ok) {
        const data = await response.json();
        setUserFiles(data.files || []);
      }
    } catch (error) {
      logger.error('Error loading user files:', error);
    } finally {
      setLoading(false);
    }
  };

  // File operations
  const handleAttachFiles = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setAttachingFiles(true);
      
      // Attach each selected file
      const promises = selectedFiles.map(fileId => 
        fetch(`/api/sessions/${sessionId}/files`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId,
            category: 'resource', // Default category, can be changed later
            isRequired: false,
          }),
        })
      );

      const results = await Promise.allSettled(promises);
      
      // Check for errors
      const errors = results.filter(result => result.status === 'rejected');
      if (errors.length > 0) {
        logger.error('Some files failed to attach:', errors);
      }

      // Refresh session files
      await loadSessionFiles();
      
      // Close dialog and reset selection
      setAddFileDialogOpen(false);
      setSelectedFiles([]);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to attach files');
    } finally {
      setAttachingFiles(false);
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    if (!confirm(t('files.removeConfirm', { defaultValue: 'Remove this file from the session?' }))) {
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${sessionId}/files`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove file');
      }

      // Refresh session files
      await loadSessionFiles();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to remove file');
    }
  };

  const handleToggleRequired = async (fileId: string, currentRequired: boolean) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/files`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          isRequired: !currentRequired,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update file');
      }

      // Refresh session files
      await loadSessionFiles();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update file');
    }
  };

  const handleCategoryChange = async (fileId: string, newCategory: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/files`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          category: newCategory,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update file category');
      }

      // Refresh session files
      await loadSessionFiles();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update file category');
    }
  };

  const handleDownloadFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`);
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const data = await response.json();
      window.open(data.downloadUrl, '_blank');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to download file');
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

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel')) return '📊';
    return '📁';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'preparation':
        return <GraduationCapIcon className="h-4 w-4 text-blue-600" />;
      case 'notes':
        return <FileTextIcon className="h-4 w-4 text-green-600" />;
      case 'recording':
        return <PlayIcon className="h-4 w-4 text-purple-600" />;
      case 'resource':
        return <BookOpenIcon className="h-4 w-4 text-orange-600" />;
      default:
        return <FileIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'preparation':
        return 'bg-blue-100 text-blue-800';
      case 'notes':
        return 'bg-green-100 text-green-800';
      case 'recording':
        return 'bg-purple-100 text-purple-800';
      case 'resource':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter files by category
  const filesByCategory = {
    all: sessionFiles,
    preparation: sessionFiles.filter(f => f.category === 'preparation'),
    notes: sessionFiles.filter(f => f.category === 'notes'),
    recording: sessionFiles.filter(f => f.category === 'recording'),
    resource: sessionFiles.filter(f => f.category === 'resource'),
  };

  // Get available user files (not already attached to session)
  const attachedFileIds = new Set(sessionFiles.map(sf => sf.file.id));
  const availableUserFiles = userFiles.filter(file => !attachedFileIds.has(file.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('files.title', { defaultValue: 'Session Files' })}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {t('files.subtitle', { defaultValue: 'Manage files for this session' })}
          </p>
        </div>

        <Dialog open={addFileDialogOpen} onOpenChange={setAddFileDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              {t('files.addFile', { defaultValue: 'Add Files' })}
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t('files.addToSession', { defaultValue: 'Add Files to Session' })}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {availableUserFiles.length === 0 ? (
                <div className="text-center py-8">
                  <FolderIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {t('files.noFilesAvailable', { defaultValue: 'No files available to attach' })}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {availableUserFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <Checkbox
                          checked={selectedFiles.includes(file.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedFiles([...selectedFiles, file.id]);
                            } else {
                              setSelectedFiles(selectedFiles.filter(id => id !== file.id));
                            }
                          }}
                          className="mr-3"
                        />
                        
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-xl">{getFileIcon(file.fileType)}</span>
                          <div>
                            <p className="font-medium text-sm">{file.filename}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.fileSize)} • {new Date(file.createdAt).toLocaleDateString()}
                            </p>
                            {file.description && (
                              <p className="text-xs text-gray-600 mt-1">{file.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t">
                    <p className="text-sm text-gray-600">
                      {selectedFiles.length} files selected
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setAddFileDialogOpen(false)}
                        disabled={attachingFiles}
                      >
                        {t('common.cancel', { defaultValue: 'Cancel' })}
                      </Button>
                      <Button
                        onClick={handleAttachFiles}
                        disabled={selectedFiles.length === 0 || attachingFiles}
                      >
                        {attachingFiles ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {t('files.attaching', { defaultValue: 'Attaching...' })}
                          </>
                        ) : (
                          <>
                            <PlusIcon className="h-4 w-4 mr-2" />
                            {t('files.attachSelected', { defaultValue: 'Attach Selected' })}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* File Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <FolderIcon className="h-4 w-4" />
            All ({filesByCategory.all.length})
          </TabsTrigger>
          <TabsTrigger value="preparation" className="flex items-center gap-2">
            <GraduationCapIcon className="h-4 w-4" />
            Prep ({filesByCategory.preparation.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <FileTextIcon className="h-4 w-4" />
            Notes ({filesByCategory.notes.length})
          </TabsTrigger>
          <TabsTrigger value="recording" className="flex items-center gap-2">
            <PlayIcon className="h-4 w-4" />
            Records ({filesByCategory.recording.length})
          </TabsTrigger>
          <TabsTrigger value="resource" className="flex items-center gap-2">
            <BookOpenIcon className="h-4 w-4" />
            Resources ({filesByCategory.resource.length})
          </TabsTrigger>
        </TabsList>

        {Object.entries(filesByCategory).map(([category, files]) => (
          <TabsContent key={category} value={category} className="space-y-2">
            {files.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <FolderIcon className="h-8 w-8 text-gray-400 mb-3" />
                  <p className="text-gray-600">
                    {t('files.noFilesInCategory', { 
                      defaultValue: `No ${category === 'all' ? '' : category + ' '}files in this session` 
                    })}
                  </p>
                </CardContent>
              </Card>
            ) : (
              files.map((sessionFile) => (
                <Card key={sessionFile.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-xl flex-shrink-0">
                          {getFileIcon(sessionFile.file.fileType)}
                        </span>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900 truncate">
                              {sessionFile.file.filename}
                            </h4>
                            {sessionFile.isRequired && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangleIcon className="h-3 w-3 mr-1" />
                                Required
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{formatFileSize(sessionFile.file.fileSize)}</span>
                            {sessionFile.uploadedBy && (
                              <div className="flex items-center gap-1">
                                <UserIcon className="h-3 w-3" />
                                <span>{sessionFile.uploadedBy.name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              <span>{new Date(sessionFile.attachedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          {sessionFile.file.description && (
                            <p className="text-sm text-gray-500 mt-1 truncate">
                              {sessionFile.file.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={getCategoryColor(sessionFile.category)}>
                            <span className="mr-1">{getCategoryIcon(sessionFile.category)}</span>
                            {sessionFile.category}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Category selector */}
                        <Select
                          value={sessionFile.category}
                          onValueChange={(value) => handleCategoryChange(sessionFile.file.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="preparation">Preparation</SelectItem>
                            <SelectItem value="notes">Notes</SelectItem>
                            <SelectItem value="recording">Recording</SelectItem>
                            <SelectItem value="resource">Resource</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Required toggle (coaches only) */}
                        {userRole === 'coach' && (
                          <Button
                            variant={sessionFile.isRequired ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => handleToggleRequired(sessionFile.file.id, sessionFile.isRequired)}
                          >
                            {sessionFile.isRequired ? (
                              <CheckCircleIcon className="h-4 w-4" />
                            ) : (
                              <AlertTriangleIcon className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadFile(sessionFile.file.id)}
                        >
                          <DownloadIcon className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveFile(sessionFile.file.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Summary Stats */}
      {sessionFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{sessionFiles.length}</p>
                <p className="text-sm text-gray-600">Total Files</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {sessionFiles.filter(f => f.isRequired).length}
                </p>
                <p className="text-sm text-gray-600">Required</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{filesByCategory.preparation.length}</p>
                <p className="text-sm text-gray-600">Preparation</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{filesByCategory.recording.length}</p>
                <p className="text-sm text-gray-600">Recordings</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{filesByCategory.resource.length}</p>
                <p className="text-sm text-gray-600">Resources</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}