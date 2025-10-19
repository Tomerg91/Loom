/**
 * Resource Library Utility Functions
 *
 * Helper functions for mapping database rows to typed resource objects.
 *
 * @module lib/database/resources/utils
 */

import type { ResourceLibraryItem } from '@/types/resources';
import { normalizeResourceCategory } from '@/types/resources';

export type FileUploadRow = {
  id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  bucket_name: string;
  is_library_resource: boolean;
  is_public?: boolean | null;
  shared_with_all_clients?: boolean | null;
  file_category: string;
  tags?: string[] | null;
  description?: string | null;
  view_count?: number | null;
  download_count?: number | null;
  completion_count?: number | null;
  is_shared?: boolean | null;
  share_count?: number | null;
  created_at: string;
  updated_at: string;
};

/**
 * Map database file_uploads row to ResourceLibraryItem
 */
export function mapFileUploadToResource(file: FileUploadRow): ResourceLibraryItem {
  return {
    id: file.id,
    userId: file.user_id,
    filename: file.filename,
    originalFilename: file.original_filename,
    fileType: file.file_type,
    fileSize: file.file_size,
    storagePath: file.storage_path,
    bucketName: file.bucket_name,
    isLibraryResource: file.is_library_resource,
    isPublic: file.is_public || false,
    sharedWithAllClients: file.shared_with_all_clients || false,
    category: normalizeResourceCategory(file.file_category),
    tags: file.tags || [],
    description: file.description ?? null,
    viewCount: file.view_count || 0,
    downloadCount: file.download_count || 0,
    completionCount: file.completion_count || 0,
    createdAt: file.created_at,
    updatedAt: file.updated_at,
  };
}

/**
 * Map array of file_uploads to ResourceLibraryItem array
 */
export function mapFileUploadsToResources(files: FileUploadRow[]): ResourceLibraryItem[] {
  return files.map(mapFileUploadToResource);
}
