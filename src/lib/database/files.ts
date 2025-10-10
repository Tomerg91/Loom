import { createClient } from '@/lib/supabase/server';
import {
  getResourceCategorySynonyms,
  isLegacyResourceCategory,
  isResourceCategory,
  normalizeResourceCategory,
} from '@/types/resources';
import type { Database } from '@/types/supabase';

type FileUpload = Database['public']['Tables']['file_uploads']['Row'];
type FileShare = Database['public']['Tables']['file_shares']['Row'];
type SessionFile = Database['public']['Tables']['session_files']['Row'];

// Define types for better type safety
export interface FileUploadInsert {
  user_id: string;
  session_id?: string | null;
  filename: string;
  original_filename: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  file_category?: 'preparation' | 'notes' | 'recording' | 'resource' | 'personal' | 'avatar' | 'document';
  bucket_name: string;
  description?: string | null;
  tags?: string[];
  is_shared?: boolean;
}

export interface FileShareInsert {
  file_id: string;
  shared_by: string;
  shared_with: string;
  permission_type?: 'view' | 'download' | 'edit';
  expires_at?: string | null;
}

export interface SessionFileInsert {
  session_id: string;
  file_id: string;
  file_category?: 'preparation' | 'notes' | 'recording' | 'resource' | 'personal' | 'avatar' | 'document';
  uploaded_by?: string | null;
  is_required?: boolean;
}

export interface FileFilters {
  userId?: string;
  sessionId?: string;
  category?: string;
  tags?: string[];
  isShared?: boolean;
  bucketName?: string;
  search?: string;
}

export interface FilePagination {
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'filename' | 'file_size' | 'download_count';
  sortOrder?: 'asc' | 'desc';
}

class FileDatabase {
  private async getClient() {
    return await createClient();
  }

  // File Upload Operations
  async createFileUpload(data: FileUploadInsert) {
    const supabase = await this.getClient();
    
    const { data: file, error } = await supabase
      .from('file_uploads')
      .insert(data)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create file upload: ${error.message}`);
    }

    return file;
  }

  async getFileUpload(id: string) {
    const supabase = await this.getClient();
    
    const { data: file, error } = await supabase
      .from('file_uploads')
      .select(`
        *,
        user:users!user_id (
          id, first_name, last_name, role, email
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to get file upload: ${error.message}`);
    }

    return file;
  }

  async getFileUploads(filters: FileFilters = {}, pagination: FilePagination = {}) {
    const supabase = await this.getClient();
    
    let query = supabase
      .from('file_uploads')
      .select(`
        *,
        user:users!user_id (
          id, first_name, last_name, role
        )
      `, { count: 'exact' });

    // Apply filters
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.sessionId) {
      query = query.eq('session_id', filters.sessionId);
    }

    if (filters.category) {
      if (
        isResourceCategory(filters.category) ||
        isLegacyResourceCategory(filters.category)
      ) {
        const normalizedCategory = normalizeResourceCategory(filters.category);
        const synonyms = getResourceCategorySynonyms(normalizedCategory);
        query = query.in('file_category', synonyms);
      } else {
        query = query.eq('file_category', filters.category);
      }
    }

    if (filters.isShared !== undefined) {
      query = query.eq('is_shared', filters.isShared);
    }

    if (filters.bucketName) {
      query = query.eq('bucket_name', filters.bucketName);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    if (filters.search) {
      query = query.or(`filename.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Apply sorting
    const sortBy = pagination.sortBy || 'created_at';
    const sortOrder = pagination.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    if (pagination.limit) {
      query = query.limit(pagination.limit);
    }

    if (pagination.offset) {
      query = query.range(pagination.offset, pagination.offset + (pagination.limit || 10) - 1);
    }

    const { data: files, error, count } = await query;

    if (error) {
      throw new Error(`Failed to get file uploads: ${error.message}`);
    }

    return { files, count };
  }

  async updateFileUpload(id: string, updates: Partial<FileUploadInsert>) {
    const supabase = await this.getClient();
    
    const { data: file, error } = await supabase
      .from('file_uploads')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update file upload: ${error.message}`);
    }

    return file;
  }

  async deleteFileUpload(id: string) {
    const supabase = await this.getClient();
    
    const { error } = await supabase
      .from('file_uploads')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete file upload: ${error.message}`);
    }

    return true;
  }

  // File Share Operations
  async createFileShare(data: FileShareInsert) {
    const supabase = await this.getClient();
    
    const { data: share, error } = await supabase
      .from('file_shares')
      .insert(data)
      .select(`
        *,
        file:file_uploads!file_id (
          id, filename, file_type, file_size
        ),
        shared_by_user:users!shared_by (
          id, first_name, last_name
        ),
        shared_with_user:users!shared_with (
          id, first_name, last_name
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create file share: ${error.message}`);
    }

    return share;
  }

  async getFileShares(fileId?: string, userId?: string) {
    const supabase = await this.getClient();
    
    let query = supabase
      .from('file_shares')
      .select(`
        *,
        file:file_uploads!file_id (
          id, filename, file_type, file_size
        ),
        shared_by_user:users!shared_by (
          id, first_name, last_name
        ),
        shared_with_user:users!shared_with (
          id, first_name, last_name
        )
      `);

    if (fileId) {
      query = query.eq('file_id', fileId);
    }

    if (userId) {
      query = query.or(`shared_by.eq.${userId},shared_with.eq.${userId}`);
    }

    // Only get active shares (not expired)
    query = query.or('expires_at.is.null,expires_at.gt.now()');

    const { data: shares, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get file shares: ${error.message}`);
    }

    return shares;
  }

  async deleteFileShare(id: string) {
    const supabase = await this.getClient();
    
    const { error } = await supabase
      .from('file_shares')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete file share: ${error.message}`);
    }

    return true;
  }

  // Session File Operations
  async createSessionFile(data: SessionFileInsert) {
    const supabase = await this.getClient();
    
    const { data: sessionFile, error } = await supabase
      .from('session_files')
      .insert(data)
      .select(`
        *,
        file:file_uploads!file_id (
          id, filename, file_type, file_size, description
        ),
        session:sessions!session_id (
          id, title, scheduled_at
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create session file: ${error.message}`);
    }

    return sessionFile;
  }

  async getSessionFiles(sessionId: string) {
    const supabase = await this.getClient();
    
    const { data: sessionFiles, error } = await supabase
      .from('session_files')
      .select(`
        *,
        file:file_uploads!file_id (
          id, filename, file_type, file_size, description, tags
        ),
        uploaded_by_user:users!uploaded_by (
          id, first_name, last_name
        )
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get session files: ${error.message}`);
    }

    return sessionFiles;
  }

  async deleteSessionFile(sessionId: string, fileId: string) {
    const supabase = await this.getClient();
    
    const { error } = await supabase
      .from('session_files')
      .delete()
      .eq('session_id', sessionId)
      .eq('file_id', fileId);

    if (error) {
      throw new Error(`Failed to delete session file: ${error.message}`);
    }

    return true;
  }

  // Utility Functions
  async getUserStorageUsage(userId: string) {
    const supabase = await this.getClient();
    
    const { data, error } = await supabase
      .rpc('get_user_storage_usage', { user_uuid: userId })
      .single();

    if (error) {
      throw new Error(`Failed to get user storage usage: ${error.message}`);
    }

    const usage = (data || {
      total_files: 0,
      total_size_bytes: 0,
      total_size_mb: 0,
    }) as {
      total_files: number;
      total_size_bytes: number;
      total_size_mb: number;
    };

    return {
      totalFiles: usage.total_files,
      totalSizeBytes: usage.total_size_bytes,
      totalSizeMB: usage.total_size_mb,
    };
  }

  async getFilesSharedWithUser(userId: string) {
    const supabase = await this.getClient();
    
    const { data: sharedFiles, error } = await supabase
      .rpc('get_files_shared_with_user', { user_uuid: userId });

    if (error) {
      throw new Error(`Failed to get files shared with user: ${error.message}`);
    }

    return sharedFiles;
  }

  async incrementDownloadCount(fileId: string) {
    const supabase = await this.getClient();
    
    const { error } = await supabase
      .rpc('increment_file_download_count', { file_upload_id: fileId });

    if (error) {
      throw new Error(`Failed to increment download count: ${error.message}`);
    }

    return true;
  }

  async trackShareAccess(shareId: string) {
    const supabase = await this.getClient();
    
    const { error } = await supabase
      .rpc('track_file_share_access', { share_id: shareId });

    if (error) {
      throw new Error(`Failed to track share access: ${error.message}`);
    }

    return true;
  }

  async cleanupExpiredShares() {
    const supabase = await this.getClient();
    
    const { data: deletedCount, error } = await supabase
      .rpc('cleanup_expired_file_shares')
      .single();

    if (error) {
      throw new Error(`Failed to cleanup expired shares: ${error.message}`);
    }

    return deletedCount;
  }

  // Search and filtering helpers
  async searchFiles(query: string, userId?: string, limit: number = 20) {
    const supabase = await this.getClient();
    
    let dbQuery = supabase
      .from('file_uploads')
      .select(`
        *,
        user:users!user_id (
          id, first_name, last_name
        )
      `)
      .or(`filename.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (userId) {
      dbQuery = dbQuery.eq('user_id', userId);
    }

    const { data: files, error } = await dbQuery;

    if (error) {
      throw new Error(`Failed to search files: ${error.message}`);
    }

    return files;
  }

  async getFilesByTags(tags: string[], userId?: string) {
    const supabase = await this.getClient();
    
    let query = supabase
      .from('file_uploads')
      .select(`
        *,
        user:users!user_id (
          id, first_name, last_name
        )
      `)
      .overlaps('tags', tags)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: files, error } = await query;

    if (error) {
      throw new Error(`Failed to get files by tags: ${error.message}`);
    }

    return files;
  }
}

// Export singleton instance
export const fileDatabase = new FileDatabase();