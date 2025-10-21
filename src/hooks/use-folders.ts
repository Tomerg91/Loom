'use client';

import { useState, useEffect, useCallback } from 'react';
import { FolderMetadata } from '@/lib/services/file-management-service';

interface UseFoldersParams {
  ownerId: string;
  parentFolderId?: string | null;
}

interface CreateFolderParams {
  name: string;
  parentFolderId?: string | null;
  description?: string;
}

export function useFolders(params: UseFoldersParams) {
  const [folders, setFolders] = useState<FolderMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (params.parentFolderId) {
        queryParams.set('folderId', params.parentFolderId);
      }

      const response = await fetch(`/api/folders?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setFolders(data.folders || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch folders';
      setError(errorMessage);
      console.error('Error fetching folders:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  const createFolder = useCallback(async (createParams: CreateFolderParams) => {
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: createParams.name,
          parentFolderId: createParams.parentFolderId || params.parentFolderId,
          description: createParams.description,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create folder');
      }

      const newFolder = await response.json();
      setFolders(prev => [newFolder, ...prev]);
      return newFolder;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create folder';
      throw new Error(errorMessage);
    }
  }, [params.parentFolderId]);

  const updateFolder = useCallback(async (folderId: string, updates: Partial<FolderMetadata>) => {
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update folder');
      }

      const updatedFolder = await response.json();
      setFolders(prev => prev.map(folder => folder.id === folderId ? updatedFolder : folder));
      return updatedFolder;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update folder';
      throw new Error(errorMessage);
    }
  }, []);

  const deleteFolder = useCallback(async (folderId: string) => {
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete folder');
      }

      setFolders(prev => prev.filter(folder => folder.id !== folderId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete folder';
      throw new Error(errorMessage);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  return {
    folders,
    loading,
    error,
    createFolder,
    updateFolder,
    deleteFolder,
    refetch,
  };
}