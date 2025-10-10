import { createClient } from '@/lib/supabase/server';
import { Result } from '@/lib/types/result';
import { Database } from '@/types/supabase';
import { fileService } from './file-service';

// Type definitions
type Tables = Database['public']['Tables'];
type FileUploadRow = Tables['file_uploads']['Row'];
type FileUploadInsert = Tables['file_uploads']['Insert'];
type FileUploadUpdate = Tables['file_uploads']['Update'];
type FileShareRow = Tables['file_shares']['Row'];
type FileShareInsert = Tables['file_shares']['Insert'];
type SessionFileRow = Tables['session_files']['Row'];
type SessionFileInsert = Tables['session_files']['Insert'];

export interface FileMetadata {
  id: string;
  userId: string;
  sessionId: string | null;
  filename: string;
  originalFilename: string;
  storagePath: string;
  fileType: string;
  fileSize: number;
  fileCategory:
    | 'preparation'
    | 'notes'
    | 'recording'
    | 'resource'
    | 'personal'
    | 'avatar'
    | 'document';
  bucketName: string;
  description: string | null;
  tags: string[];
  isShared: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;

  // Joined data
  ownerName?: string;
  sharedWith?: FileShareRow[];
  storageUrl?: string;
}

// Remove folder metadata as it's not in the current schema

export interface FileUploadOptions {
  sessionId?: string;
  description?: string;
  tags?: string[];
  fileCategory?:
    | 'preparation'
    | 'notes'
    | 'recording'
    | 'resource'
    | 'personal'
    | 'avatar'
    | 'document';
}

export interface FileShareOptions {
  userId: string;
  permission: 'view' | 'download' | 'edit';
  expiresAt?: Date;
}

export interface FileSearchParams {
  query?: string;
  fileTypes?: string[];
  tags?: string[];
  ownerId?: string;
  sessionId?: string;
  fileCategory?:
    | 'preparation'
    | 'notes'
    | 'recording'
    | 'resource'
    | 'personal'
    | 'avatar'
    | 'document';
  sharedWithMe?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'filename' | 'file_size' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

class FileManagementService {
  /**
   * Upload a file with comprehensive metadata tracking
   */
  async uploadFile(
    file: File,
    userId: string,
    options: FileUploadOptions = {}
  ): Promise<Result<FileMetadata>> {
    try {
      const supabase = await createClient();

      // Validate file
      const validation = fileService.validateFile(file, {
        maxSize: 50 * 1024 * 1024, // 50MB default
        allowedTypes: [
          'image/*',
          'application/pdf',
          'text/*',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.*',
          'video/*',
          'audio/*',
        ],
      });

      if (!validation.isValid) {
        return Result.error(validation.error || 'File validation failed');
      }

      // Determine bucket name based on file category
      const fileCategory =
        options.fileCategory || this.getFileCategory(file.type);
      const bucketName = this.getBucketForCategory(fileCategory);

      // Upload to Supabase Storage
      const uploadResult = await fileService.uploadFile(file, {
        directory: bucketName === 'avatars' ? 'avatars' : 'documents',
        userId: userId,
      });

      if (!uploadResult.success) {
        return Result.error(uploadResult.error || 'File upload failed');
      }

      // Create file record
      const fileData: FileUploadInsert = {
        user_id: userId,
        session_id: options.sessionId || null,
        filename: this.sanitizeFilename(file.name),
        original_filename: file.name,
        storage_path: uploadResult.url!.split('/').slice(-2).join('/'), // Extract path from URL
        file_type: file.type,
        file_size: file.size,
        file_category: fileCategory,
        bucket_name: bucketName,
        description: options.description || null,
        tags: options.tags || [],
        is_shared: false,
        download_count: 0,
      };

      const { data: fileRecord, error: insertError } = await supabase
        .from('file_uploads')
        .insert(fileData)
        .select('*')
        .single();

      if (insertError) {
        // Clean up uploaded file on database error
        await fileService.deleteFile(uploadResult.url!);
        return Result.error(
          `Failed to create file record: ${insertError.message}`
        );
      }

      return Result.success(await this.mapFileUploadRow(fileRecord));
    } catch (error) {
      console.error('File upload error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'File upload failed'
      );
    }
  }

  /**
   * Get files with optional filtering and pagination
   */
  async getFiles(
    params: FileSearchParams = {}
  ): Promise<Result<{ files: FileMetadata[]; total: number }>> {
    try {
      const supabase = await createClient();
      let query = supabase.from('file_uploads').select(`
          *,
          users!file_uploads_user_id_fkey(first_name, last_name)
        `);

      // Apply filters
      if (params.query) {
        query = query.or(
          `filename.ilike.%${params.query}%,description.ilike.%${params.query}%`
        );
      }

      if (params.fileTypes && params.fileTypes.length > 0) {
        query = query.in('file_type', params.fileTypes);
      }

      if (params.fileCategory) {
        query = query.eq('file_category', params.fileCategory);
      }

      if (params.sessionId) {
        query = query.eq('session_id', params.sessionId);
      }

      if (params.ownerId) {
        query = query.eq('user_id', params.ownerId);
      }

      if (params.tags && params.tags.length > 0) {
        query = query.overlaps('tags', params.tags);
      }

      // Sorting
      const sortBy = params.sortBy || 'created_at';
      const sortOrder = params.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      const limit = Math.min(params.limit || 50, 100);
      const offset = params.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data: files, error } = await query;

      if (error) {
        return Result.error(`Failed to fetch files: ${error.message}`);
      }

      // Get total count for pagination
      let countQuery = supabase
        .from('file_uploads')
        .select('*', { count: 'exact', head: true });

      // Apply same filters for count
      if (params.query) {
        countQuery = countQuery.or(
          `filename.ilike.%${params.query}%,description.ilike.%${params.query}%`
        );
      }
      if (params.fileTypes && params.fileTypes.length > 0) {
        countQuery = countQuery.in('file_type', params.fileTypes);
      }
      if (params.fileCategory) {
        countQuery = countQuery.eq('file_category', params.fileCategory);
      }
      if (params.sessionId) {
        countQuery = countQuery.eq('session_id', params.sessionId);
      }
      if (params.ownerId) {
        countQuery = countQuery.eq('user_id', params.ownerId);
      }

      const { count } = await countQuery;

      const mappedFiles = files
        ? await Promise.all(files.map(f => this.mapFileUploadRowWithJoins(f)))
        : [];

      return Result.success({
        files: mappedFiles,
        total: count || 0,
      });
    } catch (error) {
      console.error('Get files error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to get files'
      );
    }
  }

  /**
   * Get a specific file by ID
   */
  async getFile(
    fileId: string,
    userId?: string
  ): Promise<Result<FileMetadata>> {
    try {
      const supabase = await createClient();

      let query = supabase
        .from('file_uploads')
        .select(
          `
          *,
          users!file_uploads_user_id_fkey(first_name, last_name)
        `
        )
        .eq('id', fileId);

      const { data: file, error } = await query.single();

      if (error) {
        return Result.error(`File not found: ${error.message}`);
      }

      // Check permissions if userId provided
      if (userId && !this.hasFileAccess(file, userId)) {
        return Result.error('Access denied');
      }

      // Get file shares for this file
      const { data: shares } = await supabase
        .from('file_shares')
        .select('*')
        .eq('file_id', fileId);

      const fileData = await this.mapFileUploadRowWithJoins(file);
      if (shares) {
        fileData.sharedWith = shares;
      }

      return Result.success(fileData);
    } catch (error) {
      console.error('Get file error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to get file'
      );
    }
  }

  /**
   * Share a file with another user
   */
  async shareFile(
    fileId: string,
    sharedById: string,
    options: FileShareOptions
  ): Promise<Result<FileShareRow>> {
    try {
      const supabase = await createClient();

      // Verify file ownership or edit permission
      const fileCheck = await this.getFile(fileId, sharedById);
      if (!fileCheck.success) {
        return Result.error('File not found or access denied');
      }

      // Check if already shared with this user
      const { data: existingShare } = await supabase
        .from('file_shares')
        .select('*')
        .eq('file_id', fileId)
        .eq('shared_with', options.userId)
        .maybeSingle();

      if (existingShare) {
        // Update existing share
        const { data: updatedShare, error } = await supabase
          .from('file_shares')
          .update({
            permission_type: options.permission,
            expires_at: options.expiresAt?.toISOString() || null,
          })
          .eq('id', existingShare.id)
          .select('*')
          .single();

        if (error) {
          return Result.error(`Failed to update share: ${error.message}`);
        }

        return Result.success(updatedShare);
      }

      // Create new share
      const shareData: FileShareInsert = {
        file_id: fileId,
        shared_with: options.userId,
        shared_by: sharedById,
        permission_type: options.permission,
        expires_at: options.expiresAt?.toISOString() || null,
        access_count: 0,
      };

      const { data: share, error } = await supabase
        .from('file_shares')
        .insert(shareData)
        .select('*')
        .single();

      if (error) {
        return Result.error(`Failed to create share: ${error.message}`);
      }

      // Update file as shared
      await supabase
        .from('file_uploads')
        .update({ is_shared: true })
        .eq('id', fileId);

      return Result.success(share);
    } catch (error) {
      console.error('Share file error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to share file'
      );
    }
  }

  /**
   * Attach file to a session
   */
  async attachFileToSession(
    fileId: string,
    sessionId: string,
    uploadedBy: string,
    isRequired: boolean = false,
    category: 'preparation' | 'notes' | 'recording' | 'resource' = 'resource'
  ): Promise<Result<SessionFileRow>> {
    try {
      const supabase = await createClient();

      // Check if already attached
      const { data: existing } = await supabase
        .from('session_files')
        .select('*')
        .eq('session_id', sessionId)
        .eq('file_id', fileId)
        .maybeSingle();

      if (existing) {
        return Result.error('File already attached to session');
      }

      const sessionFileData: SessionFileInsert = {
        session_id: sessionId,
        file_id: fileId,
        file_category: category,
        uploaded_by: uploadedBy,
        is_required: isRequired,
      };

      const { data: sessionFile, error } = await supabase
        .from('session_files')
        .insert(sessionFileData)
        .select('*')
        .single();

      if (error) {
        return Result.error(
          `Failed to attach file to session: ${error.message}`
        );
      }

      return Result.success(sessionFile);
    } catch (error) {
      console.error('Attach file to session error:', error);
      return Result.error(
        error instanceof Error
          ? error.message
          : 'Failed to attach file to session'
      );
    }
  }

  /**
   * Get files for a specific session
   */
  async getSessionFiles(sessionId: string): Promise<Result<FileMetadata[]>> {
    try {
      const supabase = await createClient();

      const { data: sessionFiles, error } = await supabase
        .from('session_files')
        .select(
          `
          *,
          file_uploads!session_files_file_id_fkey(
            *,
            users!file_uploads_user_id_fkey(first_name, last_name)
          )
        `
        )
        .eq('session_id', sessionId);

      if (error) {
        return Result.error(`Failed to get session files: ${error.message}`);
      }

      const sessionFileMappings = sessionFiles?.map(async sf => {
        const file = sf.file_uploads;
        if (!file) return null;
        return await this.mapFileUploadRowWithJoins(file);
      });

      const files = sessionFileMappings
        ? ((await Promise.all(sessionFileMappings)).filter(
            Boolean
          ) as FileMetadata[])
        : [];

      return Result.success(files);
    } catch (error) {
      console.error('Get session files error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to get session files'
      );
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string, userId: string): Promise<Result<void>> {
    try {
      const supabase = await createClient();

      // Get file details
      const fileResult = await this.getFile(fileId, userId);
      if (!fileResult.success) {
        return Result.error('File not found or access denied');
      }

      const file = fileResult.data;

      // Verify ownership
      if (file.userId !== userId) {
        return Result.error('Only file owner can delete files');
      }

      // Delete from storage
      if (file.storageUrl) {
        await fileService.deleteFile(file.storageUrl);
      }

      // Delete database records (cascading will handle related records)
      const { error } = await supabase
        .from('file_uploads')
        .delete()
        .eq('id', fileId);

      if (error) {
        return Result.error(`Failed to delete file: ${error.message}`);
      }

      return Result.success(undefined);
    } catch (error) {
      console.error('Delete file error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to delete file'
      );
    }
  }

  /**
   * Update file metadata
   */
  async updateFile(
    fileId: string,
    userId: string,
    updates: Partial<FileUploadUpdate>
  ): Promise<Result<FileMetadata>> {
    try {
      const supabase = await createClient();

      // Verify access
      const fileResult = await this.getFile(fileId, userId);
      if (!fileResult.success) {
        return Result.error('File not found or access denied');
      }

      const { data: updatedFile, error } = await supabase
        .from('file_uploads')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileId)
        .select('*')
        .single();

      if (error) {
        return Result.error(`Failed to update file: ${error.message}`);
      }

      return Result.success(await this.mapFileUploadRow(updatedFile));
    } catch (error) {
      console.error('Update file error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to update file'
      );
    }
  }

  /**
   * Get files shared with a user
   */
  async getSharedFiles(userId: string): Promise<Result<FileMetadata[]>> {
    try {
      const supabase = await createClient();

      const { data: shares, error } = await supabase
        .from('file_shares')
        .select(
          `
          *,
          file_uploads!file_shares_file_id_fkey(
            *,
            users!file_uploads_user_id_fkey(first_name, last_name)
          )
        `
        )
        .eq('shared_with', userId)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

      if (error) {
        return Result.error(`Failed to get shared files: ${error.message}`);
      }

      const fileMappings = shares?.map(async share => {
        const file = share.file_uploads;
        if (!file) return null;

        const mappedFile = await this.mapFileUploadRowWithJoins(file);
        mappedFile.sharedWith = [share as FileShareRow];
        return mappedFile;
      });

      const files = fileMappings
        ? ((await Promise.all(fileMappings)).filter(Boolean) as FileMetadata[])
        : [];

      return Result.success(files || []);
    } catch (error) {
      console.error('Get shared files error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to get shared files'
      );
    }
  }

  // Private helper methods
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.\-_\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 255);
  }

  private getFileCategory(
    mimeType: string
  ):
    | 'preparation'
    | 'notes'
    | 'recording'
    | 'resource'
    | 'personal'
    | 'avatar'
    | 'document' {
    if (mimeType.startsWith('image/')) return 'avatar';
    if (mimeType.startsWith('video/') || mimeType.startsWith('audio/'))
      return 'recording';
    if (
      mimeType.includes('pdf') ||
      mimeType.includes('document') ||
      mimeType.includes('word') ||
      mimeType.startsWith('text/')
    )
      return 'document';
    return 'resource';
  }

  private getBucketForCategory(category: string): string {
    switch (category) {
      case 'avatar':
        return 'avatars';
      case 'recording':
        return 'session-files';
      case 'preparation':
      case 'notes':
      case 'resource':
      case 'personal':
      case 'document':
      default:
        return 'documents';
    }
  }

  private hasFileAccess(file: any, userId: string): boolean {
    // Owner always has access
    if (file.user_id === userId) return true;

    // For now, return true for owner only - sharing logic handled separately
    return false;
  }

  private async updateFileAccess(
    fileId: string,
    userId: string
  ): Promise<void> {
    const supabase = await createClient();

    // Get current access count
    const { data: share } = await supabase
      .from('file_shares')
      .select('access_count')
      .eq('file_id', fileId)
      .eq('shared_with', userId)
      .single();

    if (share) {
      // Update share access count if applicable
      await supabase
        .from('file_shares')
          .update({
            last_accessed_at: new Date().toISOString(),
            access_count: share.access_count + 1,
          })
        .eq('file_id', fileId)
        .eq('shared_with', userId);
    }
  }

  /**
   * Get storage URL for a file (creates signed URL for private files)
   */
  async getFileUrl(fileId: string, userId: string): Promise<Result<string>> {
    try {
      const fileResult = await this.getFile(fileId, userId);
      if (!fileResult.success) {
        return Result.error('File not found or access denied');
      }

      const file = fileResult.data;
      const supabase = await createClient();

      // Get signed URL from Supabase Storage
      const { data, error } = await supabase.storage
        .from(file.bucketName)
        .createSignedUrl(file.storagePath, 3600); // 1 hour expiry

      if (error) {
        return Result.error(`Failed to create file URL: ${error.message}`);
      }

      // Track download
      const { data: currentFile } = await supabase
        .from('file_uploads')
        .select('download_count')
        .eq('id', fileId)
        .single();

      if (currentFile) {
        await supabase
          .from('file_uploads')
          .update({ download_count: currentFile.download_count + 1 })
          .eq('id', fileId);
      }

      return Result.success(data.signedUrl);
    } catch (error) {
      console.error('Get file URL error:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to get file URL'
      );
    }
  }

  private mapFileUploadRow = async (
    row: FileUploadRow
  ): Promise<FileMetadata> => {
    const supabase = await createClient();
    const publicUrl = supabase.storage
      .from(row.bucket_name)
      .getPublicUrl(row.storage_path);

    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      filename: row.filename,
      originalFilename: row.original_filename,
      storagePath: row.storage_path,
      fileType: row.file_type,
      fileSize: row.file_size,
      fileCategory: row.file_category,
      bucketName: row.bucket_name,
      description: row.description || null,
      tags: row.tags || [],
      isShared: row.is_shared,
      downloadCount: row.download_count,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
        storageUrl: publicUrl.data.publicUrl,
      };
  };

  private mapFileUploadRowWithJoins = async (
    row: any
  ): Promise<FileMetadata> => {
    const base = await this.mapFileUploadRow(row);

    if (row.users) {
      base.ownerName =
        `${row.users.first_name || ''} ${row.users.last_name || ''}`.trim();
    }

    return base;
  };
}

// Factory function for creating service instances
export async function createFileManagementService() {
  return new FileManagementService();
}

// Create singleton instance - for compatibility with existing code
let serviceInstance: FileManagementService | null = null;

export function getFileManagementService(): FileManagementService {
  if (!serviceInstance) {
    serviceInstance = new FileManagementService();
  }
  return serviceInstance;
}

// Backward compatibility export
export const fileManagementService = getFileManagementService();

// Class export for type checking
export const FileManagementServiceClass = FileManagementService;
