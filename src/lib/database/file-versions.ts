import crypto from 'crypto';

import { createClient } from '@/lib/supabase/server';

export interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  storage_path: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  file_hash: string;
  description?: string;
  change_summary?: string;
  is_major_version: boolean;
  is_current_version: boolean;
  created_by: string;
  created_at: string;
  diff_metadata?: any;
}

export interface FileVersionWithDetails extends FileVersion {
  created_by_user?: {
    id: string;
    first_name: string;
    last_name?: string;
  };
  file?: {
    id: string;
    filename: string;
    user_id: string;
  };
}

export interface VersionComparison {
  file_id: string;
  comparison: {
    version_a: {
      version_number: number;
      filename: string;
      file_size: number;
      file_type: string;
      created_at: string;
      created_by: string;
      change_summary?: string;
    };
    version_b: {
      version_number: number;
      filename: string;
      file_size: number;
      file_type: string;
      created_at: string;
      created_by: string;
      change_summary?: string;
    };
    differences: {
      size_change: number;
      name_changed: boolean;
      type_changed: boolean;
      time_difference: number;
    };
  };
}

export interface FileVersionStats {
  file_id: string;
  total_versions: number;
  current_version: number;
  latest_version: number;
  total_size: number;
  major_versions: number;
  first_version_date: string;
  latest_version_date: string;
  version_creators: string[];
}

export interface CreateVersionData {
  file_id: string;
  storage_path: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  file_hash?: string;
  description?: string;
  change_summary?: string;
  is_major_version?: boolean;
  created_by: string;
}

export interface FileVersionShare {
  id: string;
  version_id: string;
  file_id: string;
  shared_by: string;
  shared_with: string;
  permission_type: 'view' | 'download' | 'comment';
  expires_at?: string;
  access_count: number;
  last_accessed_at?: string;
  message?: string;
  created_at: string;
  updated_at: string;
}

class FileVersionsDatabase {
  private async getSupabaseClient() {
    return await createClient();
  }

  /**
   * Generate file hash for duplicate detection and integrity
   */
  generateFileHash(content: Buffer | string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Create a new file version
   */
  async createFileVersion(data: CreateVersionData): Promise<FileVersionWithDetails> {
    const supabase = await this.getSupabaseClient();
    
    // Generate file hash if not provided
    const fileHash = data.file_hash || crypto.createHash('sha256').update(data.filename + data.file_size).digest('hex');
    
    const { data: versionId, error } = await supabase
      .rpc('create_file_version', {
        p_file_id: data.file_id,
        p_storage_path: data.storage_path,
        p_filename: data.filename,
        p_original_filename: data.original_filename,
        p_file_type: data.file_type,
        p_file_size: data.file_size,
        p_file_hash: fileHash,
        p_description: data.description || null,
        p_change_summary: data.change_summary || null,
        p_is_major_version: data.is_major_version || false,
        p_created_by: data.created_by,
      });

    if (error) {
      throw new Error(`Failed to create file version: ${error.message}`);
    }

    return await this.getFileVersion(versionId);
  }

  /**
   * Get a specific file version by ID
   */
  async getFileVersion(versionId: string): Promise<FileVersionWithDetails> {
    const supabase = await this.getSupabaseClient();
    
    const { data: version, error } = await supabase
      .from('file_versions')
      .select(`
        *,
        created_by_user:users!created_by (
          id, first_name, last_name
        ),
        file:file_uploads!file_id (
          id, filename, user_id
        )
      `)
      .eq('id', versionId)
      .single();

    if (error) {
      throw new Error(`Failed to get file version: ${error.message}`);
    }

    return version as FileVersionWithDetails;
  }

  /**
   * Get all versions for a specific file
   */
  async getFileVersions(fileId: string): Promise<FileVersionWithDetails[]> {
    const supabase = await this.getSupabaseClient();
    
    const { data: versions, error } = await supabase
      .from('file_versions')
      .select(`
        *,
        created_by_user:users!created_by (
          id, first_name, last_name
        ),
        file:file_uploads!file_id (
          id, filename, user_id
        )
      `)
      .eq('file_id', fileId)
      .order('version_number', { ascending: false });

    if (error) {
      throw new Error(`Failed to get file versions: ${error.message}`);
    }

    return versions as FileVersionWithDetails[];
  }

  /**
   * Get the current version of a file
   */
  async getCurrentVersion(fileId: string): Promise<FileVersionWithDetails | null> {
    const supabase = await this.getSupabaseClient();
    
    const { data: version, error } = await supabase
      .from('file_versions')
      .select(`
        *,
        created_by_user:users!created_by (
          id, first_name, last_name
        ),
        file:file_uploads!file_id (
          id, filename, user_id
        )
      `)
      .eq('file_id', fileId)
      .eq('is_current_version', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get current version: ${error.message}`);
    }

    return version as FileVersionWithDetails || null;
  }

  /**
   * Get a specific version by file ID and version number
   */
  async getVersionByNumber(fileId: string, versionNumber: number): Promise<FileVersionWithDetails | null> {
    const supabase = await this.getSupabaseClient();
    
    const { data: version, error } = await supabase
      .from('file_versions')
      .select(`
        *,
        created_by_user:users!created_by (
          id, first_name, last_name
        ),
        file:file_uploads!file_id (
          id, filename, user_id
        )
      `)
      .eq('file_id', fileId)
      .eq('version_number', versionNumber)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get version: ${error.message}`);
    }

    return version as FileVersionWithDetails || null;
  }

  /**
   * Update file version metadata
   */
  async updateFileVersion(
    versionId: string, 
    updates: Partial<{
      description: string;
      change_summary: string;
      is_major_version: boolean;
      diff_metadata: any;
    }>
  ): Promise<FileVersionWithDetails> {
    const supabase = await this.getSupabaseClient();
    
    const { error } = await supabase
      .from('file_versions')
      .update(updates)
      .eq('id', versionId);

    if (error) {
      throw new Error(`Failed to update file version: ${error.message}`);
    }

    return await this.getFileVersion(versionId);
  }

  /**
   * Delete a file version (cannot delete current version)
   */
  async deleteFileVersion(versionId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    
    const { error } = await supabase
      .from('file_versions')
      .delete()
      .eq('id', versionId);

    if (error) {
      throw new Error(`Failed to delete file version: ${error.message}`);
    }
  }

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(
    fileId: string, 
    targetVersion: number, 
    rollbackBy: string, 
    description?: string
  ): Promise<string> {
    const supabase = await this.getSupabaseClient();
    
    const { data: newVersionId, error } = await supabase
      .rpc('rollback_to_version', {
        p_file_id: fileId,
        p_target_version: targetVersion,
        p_rollback_by: rollbackBy,
        p_rollback_description: description || 'Rolled back to previous version',
      });

    if (error) {
      throw new Error(`Failed to rollback to version: ${error.message}`);
    }

    return newVersionId;
  }

  /**
   * Compare two versions of a file
   */
  async compareVersions(
    fileId: string, 
    versionA: number, 
    versionB: number
  ): Promise<VersionComparison> {
    const supabase = await this.getSupabaseClient();
    
    const { data: comparison, error } = await supabase
      .rpc('get_version_comparison', {
        p_file_id: fileId,
        p_version_a: versionA,
        p_version_b: versionB,
      });

    if (error) {
      throw new Error(`Failed to compare versions: ${error.message}`);
    }

    return comparison as VersionComparison;
  }

  /**
   * Get file version statistics
   */
  async getFileVersionStats(fileId: string): Promise<FileVersionStats> {
    const supabase = await this.getSupabaseClient();
    
    const { data: stats, error } = await supabase
      .rpc('get_file_version_stats', {
        p_file_id: fileId,
      });

    if (error) {
      throw new Error(`Failed to get version stats: ${error.message}`);
    }

    return stats as FileVersionStats;
  }

  /**
   * Share a specific version with users
   */
  async shareFileVersion(
    versionId: string,
    fileId: string,
    sharedBy: string,
    sharedWith: string[],
    permissionType: 'view' | 'download' | 'comment',
    expiresAt?: string,
    message?: string
  ): Promise<FileVersionShare[]> {
    const supabase = await this.getSupabaseClient();
    
    const shares = sharedWith.map(userId => ({
      version_id: versionId,
      file_id: fileId,
      shared_by: sharedBy,
      shared_with: userId,
      permission_type: permissionType,
      expires_at: expiresAt || null,
      message: message || null,
    }));

    const { data: createdShares, error } = await supabase
      .from('file_version_shares')
      .insert(shares)
      .select();

    if (error) {
      throw new Error(`Failed to share file version: ${error.message}`);
    }

    return createdShares as FileVersionShare[];
  }

  /**
   * Get shares for a specific version
   */
  async getVersionShares(versionId: string): Promise<FileVersionShare[]> {
    const supabase = await this.getSupabaseClient();
    
    const { data: shares, error } = await supabase
      .from('file_version_shares')
      .select('*')
      .eq('version_id', versionId);

    if (error) {
      throw new Error(`Failed to get version shares: ${error.message}`);
    }

    return shares as FileVersionShare[];
  }

  /**
   * Revoke version share
   */
  async revokeVersionShare(shareId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    
    const { error } = await supabase
      .from('file_version_shares')
      .delete()
      .eq('id', shareId);

    if (error) {
      throw new Error(`Failed to revoke version share: ${error.message}`);
    }
  }

  /**
   * Track version access
   */
  async trackVersionAccess(shareId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    
    const { error } = await supabase
      .from('file_version_shares')
      .update({
        access_count: supabase.sql`access_count + 1`,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', shareId);

    if (error) {
      throw new Error(`Failed to track version access: ${error.message}`);
    }
  }

  /**
   * Get versions shared with a user
   */
  async getSharedVersionsForUser(userId: string): Promise<FileVersionWithDetails[]> {
    const supabase = await this.getSupabaseClient();
    
    const { data: versions, error } = await supabase
      .from('file_version_shares')
      .select(`
        version:file_versions!version_id (
          *,
          created_by_user:users!created_by (
            id, first_name, last_name
          ),
          file:file_uploads!file_id (
            id, filename, user_id
          )
        )
      `)
      .eq('shared_with', userId)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get shared versions: ${error.message}`);
    }

    return versions.map(item => item.version) as FileVersionWithDetails[];
  }

  /**
   * Check if file has duplicate content based on hash
   */
  async findDuplicateByHash(fileHash: string, excludeFileId?: string): Promise<FileVersion | null> {
    const supabase = await this.getSupabaseClient();
    
    let query = supabase
      .from('file_versions')
      .select('*')
      .eq('file_hash', fileHash)
      .eq('is_current_version', true);

    if (excludeFileId) {
      query = query.neq('file_id', excludeFileId);
    }

    const { data: duplicate, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to check for duplicates: ${error.message}`);
    }

    return duplicate as FileVersion || null;
  }

  /**
   * Get version history for multiple files
   */
  async getVersionHistoryForFiles(fileIds: string[]): Promise<Record<string, FileVersionWithDetails[]>> {
    const supabase = await this.getSupabaseClient();
    
    const { data: versions, error } = await supabase
      .from('file_versions')
      .select(`
        *,
        created_by_user:users!created_by (
          id, first_name, last_name
        )
      `)
      .in('file_id', fileIds)
      .order('file_id')
      .order('version_number', { ascending: false });

    if (error) {
      throw new Error(`Failed to get version history: ${error.message}`);
    }

    // Group versions by file ID
    const groupedVersions: Record<string, FileVersionWithDetails[]> = {};
    versions.forEach(version => {
      if (!groupedVersions[version.file_id]) {
        groupedVersions[version.file_id] = [];
      }
      groupedVersions[version.file_id].push(version as FileVersionWithDetails);
    });

    return groupedVersions;
  }
}

// Export singleton instance
export const fileVersionsDatabase = new FileVersionsDatabase();