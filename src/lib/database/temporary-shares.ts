import bcrypt from 'bcryptjs';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type TemporaryFileShare = Database['public']['Tables']['temporary_file_shares']['Row'];
type TemporaryShareAccessLog = Database['public']['Tables']['temporary_share_access_logs']['Row'];

export interface CreateTemporaryShareData {
  file_id: string;
  expires_at: string; // ISO 8601 timestamp
  password?: string; // Plain text password (will be hashed)
  max_downloads?: number;
  description?: string;
}

export interface TemporaryShareWithStats extends TemporaryFileShare {
  file?: {
    id: string;
    filename: string;
    original_filename: string;
    file_type: string;
    file_size: number;
  };
  statistics?: {
    total_accesses: number;
    successful_accesses: number;
    downloads: number;
    views: number;
    unique_ips: number;
    first_access?: string;
    last_access?: string;
    countries?: string[];
    top_failure_reasons?: Record<string, number>;
  };
}

export interface ShareAccessValidation {
  share_id: string | null;
  file_id: string | null;
  can_access: boolean;
  failure_reason: string | null;
  file_info: {
    id: string;
    filename: string;
    original_filename: string;
    file_type: string;
    file_size: number;
    storage_path: string;
    created_at: string;
    description?: string;
    expires_at: string;
    max_downloads?: number;
    current_downloads: number;
  } | null;
}

export interface AccessLogData {
  share_id: string;
  ip_address?: string;
  user_agent?: string;
  access_type?: 'view' | 'download';
  success?: boolean;
  failure_reason?: string;
  bytes_served?: number;
}

class TemporarySharesDatabase {
  private supabase = createClient();

  /**
   * Generate a secure hash for password protection
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Create a new temporary file share
   */
  async createTemporaryShare(
    data: CreateTemporaryShareData,
    created_by: string
  ): Promise<TemporaryFileShare> {
    const supabase = await createClient();
    
    // Hash password if provided
    const password_hash = data.password 
      ? await this.hashPassword(data.password)
      : null;

    // Call the database function
    const { data: result, error } = await supabase.rpc('create_temporary_file_share', {
      p_file_id: data.file_id,
      p_created_by: created_by,
      p_expires_at: data.expires_at,
      p_password_hash: password_hash,
      p_max_downloads: data.max_downloads || null,
      p_description: data.description || null,
    });

    if (error) {
      throw new Error(`Failed to create temporary share: ${error.message}`);
    }

    return result;
  }

  /**
   * Get all temporary shares created by a user
   */
  async getUserTemporaryShares(
    user_id: string,
    include_stats: boolean = false
  ): Promise<TemporaryShareWithStats[]> {
    const supabase = await createClient();
    
    const query = supabase
      .from('temporary_file_shares')
      .select(`
        *,
        file:file_uploads!file_id (
          id,
          filename,
          original_filename,
          file_type,
          file_size
        )
      `)
      .eq('created_by', user_id)
      .order('created_at', { ascending: false });

    const { data: shares, error } = await query;

    if (error) {
      throw new Error(`Failed to get temporary shares: ${error.message}`);
    }

    if (!include_stats) {
      return shares || [];
    }

    // Get statistics for each share
    const sharesWithStats = await Promise.all(
      (shares || []).map(async (share) => {
        const { data: stats } = await supabase.rpc('get_share_statistics', {
          p_share_id: share.id,
        });

        return {
          ...share,
          statistics: stats || {},
        };
      })
    );

    return sharesWithStats;
  }

  /**
   * Get a specific temporary share by ID
   */
  async getTemporaryShare(share_id: string): Promise<TemporaryShareWithStats | null> {
    const supabase = await createClient();
    
    const { data: share, error } = await supabase
      .from('temporary_file_shares')
      .select(`
        *,
        file:file_uploads!file_id (
          id,
          filename,
          original_filename,
          file_type,
          file_size
        )
      `)
      .eq('id', share_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Share not found
      }
      throw new Error(`Failed to get temporary share: ${error.message}`);
    }

    // Get statistics
    const { data: stats } = await supabase.rpc('get_share_statistics', {
      p_share_id: share_id,
    });

    return {
      ...share,
      statistics: stats || {},
    };
  }

  /**
   * Get temporary share by token (public access)
   */
  async getTemporaryShareByToken(token: string): Promise<TemporaryFileShare | null> {
    const supabase = await createClient();
    
    const { data: share, error } = await supabase
      .from('temporary_file_shares')
      .select('*')
      .eq('share_token', token)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Share not found
      }
      throw new Error(`Failed to get temporary share: ${error.message}`);
    }

    return share;
  }

  /**
   * Validate access to a temporary share
   */
  async validateShareAccess(
    token: string, 
    password?: string
  ): Promise<ShareAccessValidation> {
    const supabase = await createClient();
    
    const { data, error } = await supabase.rpc('validate_temporary_share_access', {
      p_share_token: token,
      p_password: password || null,
    });

    if (error) {
      throw new Error(`Failed to validate share access: ${error.message}`);
    }

    // The function returns an array with one row
    const result = data[0];
    
    return {
      share_id: result.share_id,
      file_id: result.file_id,
      can_access: result.can_access,
      failure_reason: result.failure_reason,
      file_info: result.file_info,
    };
  }

  /**
   * Log access to a temporary share
   */
  async logShareAccess(data: AccessLogData): Promise<string> {
    const supabase = await createClient();
    
    const { data: logId, error } = await supabase.rpc('log_share_access', {
      p_share_id: data.share_id,
      p_ip_address: data.ip_address || null,
      p_user_agent: data.user_agent || null,
      p_access_type: data.access_type || 'view',
      p_success: data.success ?? true,
      p_failure_reason: data.failure_reason || null,
      p_bytes_served: data.bytes_served || null,
    });

    if (error) {
      throw new Error(`Failed to log share access: ${error.message}`);
    }

    return logId;
  }

  /**
   * Update a temporary share
   */
  async updateTemporaryShare(
    share_id: string,
    updates: {
      description?: string;
      expires_at?: string;
      max_downloads?: number;
      is_active?: boolean;
      password?: string; // New password (will be hashed)
    }
  ): Promise<TemporaryFileShare> {
    const supabase = await createClient();
    
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.expires_at !== undefined) updateData.expires_at = updates.expires_at;
    if (updates.max_downloads !== undefined) updateData.max_downloads = updates.max_downloads;
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
    
    // Hash new password if provided
    if (updates.password !== undefined) {
      updateData.password_hash = updates.password 
        ? await this.hashPassword(updates.password)
        : null;
    }

    const { data: share, error } = await supabase
      .from('temporary_file_shares')
      .update(updateData)
      .eq('id', share_id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update temporary share: ${error.message}`);
    }

    return share;
  }

  /**
   * Delete a temporary share
   */
  async deleteTemporaryShare(share_id: string): Promise<void> {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('temporary_file_shares')
      .delete()
      .eq('id', share_id);

    if (error) {
      throw new Error(`Failed to delete temporary share: ${error.message}`);
    }
  }

  /**
   * Get access logs for a share
   */
  async getShareAccessLogs(
    share_id: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<TemporaryShareAccessLog[]> {
    const supabase = await createClient();
    
    const { data: logs, error } = await supabase
      .from('temporary_share_access_logs')
      .select('*')
      .eq('share_id', share_id)
      .order('accessed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get share access logs: ${error.message}`);
    }

    return logs || [];
  }

  /**
   * Get share statistics
   */
  async getShareStatistics(share_id: string): Promise<any> {
    const supabase = await createClient();
    
    const { data: stats, error } = await supabase.rpc('get_share_statistics', {
      p_share_id: share_id,
    });

    if (error) {
      throw new Error(`Failed to get share statistics: ${error.message}`);
    }

    return stats || {};
  }

  /**
   * Get all temporary shares for a file
   */
  async getFileTemporaryShares(file_id: string): Promise<TemporaryFileShare[]> {
    const supabase = await createClient();
    
    const { data: shares, error } = await supabase
      .from('temporary_file_shares')
      .select('*')
      .eq('file_id', file_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get file temporary shares: ${error.message}`);
    }

    return shares || [];
  }

  /**
   * Cleanup expired shares (deactivate them)
   */
  async cleanupExpiredShares(): Promise<number> {
    const supabase = await createClient();
    
    const { data: deletedCount, error } = await supabase.rpc('cleanup_expired_shares');

    if (error) {
      throw new Error(`Failed to cleanup expired shares: ${error.message}`);
    }

    return deletedCount || 0;
  }

  /**
   * Check if a user can create a temporary share for a file
   */
  async canUserCreateShare(user_id: string, file_id: string): Promise<boolean> {
    const supabase = await createClient();
    
    const { data: file, error } = await supabase
      .from('file_uploads')
      .select('user_id')
      .eq('id', file_id)
      .single();

    if (error || !file) {
      return false;
    }

    return file.user_id === user_id;
  }

  /**
   * Generate share URL from token
   */
  generateShareUrl(token: string, baseUrl?: string): string {
    const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}/share/${token}`;
  }

  /**
   * Parse share URL to extract token
   */
  parseShareUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const shareIndex = pathParts.indexOf('share');
      
      if (shareIndex !== -1 && pathParts[shareIndex + 1]) {
        return pathParts[shareIndex + 1];
      }
      
      return null;
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const temporarySharesDatabase = new TemporarySharesDatabase();