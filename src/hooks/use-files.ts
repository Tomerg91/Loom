'use client';

import { useState, useEffect, useCallback } from 'react';

import { toast } from '@/components/ui/use-toast';
import { FileMetadata } from '@/lib/services/file-management-service';

interface UseFilesParams {
  ownerId?: string;
  folderId?: string | null;
  query?: string;
  fileTypes?: string[];
  tags?: string[];
  sharedWithMe?: boolean;
  sortBy?: 'name' | 'size' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

interface FileUploadParams {
  file: File;
  folderId?: string | null;
  sessionId?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  replaceExisting?: boolean;
}

export function useFiles(params: UseFilesParams = {}) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const buildQueryString = useCallback((searchParams: UseFilesParams) => {
    const params = new URLSearchParams();
    
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          params.set(key, value.join(','));
        } else {
          params.set(key, String(value));
        }
      }
    });

    return params.toString();
  }, []);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString(params);
      const response = await fetch(`/api/files?${queryString}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setFiles(data.files || []);
      setTotal(data.total || 0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch files';
      setError(errorMessage);
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  }, [params, buildQueryString]);

  const uploadFile = useCallback(async (uploadParams: FileUploadParams) => {
    try {
      const formData = new FormData();
      formData.append('file', uploadParams.file);
      
      if (uploadParams.folderId) {
        formData.append('folderId', uploadParams.folderId);
      }
      if (uploadParams.sessionId) {
        formData.append('sessionId', uploadParams.sessionId);
      }
      if (uploadParams.description) {
        formData.append('description', uploadParams.description);
      }
      if (uploadParams.tags && uploadParams.tags.length > 0) {
        formData.append('tags', uploadParams.tags.join(','));
      }
      if (uploadParams.isPublic) {
        formData.append('isPublic', 'true');
      }
      if (uploadParams.replaceExisting) {
        formData.append('replaceExisting', 'true');
      }

      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const newFile = await response.json();
      setFiles(prev => [newFile, ...prev]);
      return newFile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      throw new Error(errorMessage);
    }
  }, []);

  const updateFile = useCallback(async (fileId: string, updates: Partial<FileMetadata>) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Update failed');
      }

      const updatedFile = await response.json();
      setFiles(prev => prev.map(file => file.id === fileId ? updatedFile : file));
      return updatedFile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Update failed';
      throw new Error(errorMessage);
    }
  }, []);

  const deleteFile = useCallback(async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      setFiles(prev => prev.filter(file => file.id !== fileId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      throw new Error(errorMessage);
    }
  }, []);

  const getFile = useCallback(async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get file');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get file';
      throw new Error(errorMessage);
    }
  }, []);

  const getSharedFiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/files/shared');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const sharedFiles = await response.json();
      setFiles(sharedFiles);
      setTotal(sharedFiles.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch shared files';
      setError(errorMessage);
      console.error('Error fetching shared files:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    if (params.sharedWithMe) {
      getSharedFiles();
    } else {
      fetchFiles();
    }
  }, [fetchFiles, getSharedFiles, params.sharedWithMe]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    files,
    loading,
    error,
    total,
    uploadFile,
    updateFile,
    deleteFile,
    getFile,
    refetch,
  };
}