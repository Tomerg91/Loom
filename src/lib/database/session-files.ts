import { createClient } from '@/lib/supabase/server';

export interface SessionFileData {
  session_id: string;
  file_id: string;
  file_category: 'preparation' | 'notes' | 'recording' | 'resource';
  uploaded_by: string;
  is_required: boolean;
  description?: string;
}

export interface SessionFileWithDetails {
  id: string;
  session_id: string;
  file_id: string;
  file_category: string;
  is_required: boolean;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  file: {
    id: string;
    filename: string;
    file_type: string;
    file_size: number;
    description?: string;
    tags: string[];
  };
  uploaded_by_user?: {
    id: string;
    first_name: string;
    last_name?: string;
  };
}

export interface SessionFileStats {
  totalFiles: number;
  requiredFiles: number;
  filesByCategory: {
    preparation: number;
    notes: number;
    recording: number;
    resource: number;
  };
  totalSize: number;
}

class SessionFilesDatabase {
  private async getSupabaseClient() {
    return await createClient();
  }

  /**
   * Create a new session-file association
   */
  async createSessionFile(data: SessionFileData): Promise<SessionFileWithDetails> {
    const supabase = await this.getSupabaseClient();
    
    const { data: sessionFile, error } = await supabase
      .from('session_files')
      .insert({
        session_id: data.session_id,
        file_id: data.file_id,
        file_category: data.file_category,
        uploaded_by: data.uploaded_by,
        is_required: data.is_required,
        description: data.description,
      })
      .select(`
        *,
        file:file_uploads!file_id (
          id, filename, file_type, file_size, description, tags
        ),
        uploaded_by_user:users!uploaded_by (
          id, first_name, last_name
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create session file: ${error.message}`);
    }

    return sessionFile as SessionFileWithDetails;
  }

  /**
   * Get all files associated with a session
   */
  async getSessionFiles(sessionId: string): Promise<SessionFileWithDetails[]> {
    const supabase = await this.getSupabaseClient();
    
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

    return sessionFiles as SessionFileWithDetails[];
  }

  /**
   * Get files by session and category
   */
  async getSessionFilesByCategory(
    sessionId: string, 
    category: 'preparation' | 'notes' | 'recording' | 'resource'
  ): Promise<SessionFileWithDetails[]> {
    const supabase = await this.getSupabaseClient();
    
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
      .eq('file_category', category)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get session files by category: ${error.message}`);
    }

    return sessionFiles as SessionFileWithDetails[];
  }

  /**
   * Update session file metadata
   */
  async updateSessionFile(
    sessionId: string,
    fileId: string,
    updates: Partial<{
      file_category: 'preparation' | 'notes' | 'recording' | 'resource';
      is_required: boolean;
      description: string;
    }>
  ): Promise<SessionFileWithDetails> {
    const supabase = await this.getSupabaseClient();
    
    const { data: sessionFile, error } = await supabase
      .from('session_files')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .eq('file_id', fileId)
      .select(`
        *,
        file:file_uploads!file_id (
          id, filename, file_type, file_size, description, tags
        ),
        uploaded_by_user:users!uploaded_by (
          id, first_name, last_name
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update session file: ${error.message}`);
    }

    return sessionFile as SessionFileWithDetails;
  }

  /**
   * Remove file from session (delete association)
   */
  async deleteSessionFile(sessionId: string, fileId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    
    const { error } = await supabase
      .from('session_files')
      .delete()
      .eq('session_id', sessionId)
      .eq('file_id', fileId);

    if (error) {
      throw new Error(`Failed to delete session file: ${error.message}`);
    }
  }

  /**
   * Check if a file is already attached to a session
   */
  async isFileAttachedToSession(sessionId: string, fileId: string): Promise<boolean> {
    const supabase = await this.getSupabaseClient();
    
    const { data, error } = await supabase
      .from('session_files')
      .select('id')
      .eq('session_id', sessionId)
      .eq('file_id', fileId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to check file attachment: ${error.message}`);
    }

    return !!data;
  }

  /**
   * Get session file statistics
   */
  async getSessionFileStats(sessionId: string): Promise<SessionFileStats> {
    const sessionFiles = await this.getSessionFiles(sessionId);
    
    const filesByCategory = {
      preparation: 0,
      notes: 0,
      recording: 0,
      resource: 0,
    };

    let totalSize = 0;
    let requiredFiles = 0;

    sessionFiles.forEach(sessionFile => {
      // Count by category
      if (sessionFile.file_category in filesByCategory) {
        filesByCategory[sessionFile.file_category as keyof typeof filesByCategory]++;
      }
      
      // Sum total size
      totalSize += sessionFile.file.file_size;
      
      // Count required files
      if (sessionFile.is_required) {
        requiredFiles++;
      }
    });

    return {
      totalFiles: sessionFiles.length,
      requiredFiles,
      filesByCategory,
      totalSize,
    };
  }

  /**
   * Get all sessions that have a specific file attached
   */
  async getSessionsWithFile(fileId: string): Promise<string[]> {
    const supabase = await this.getSupabaseClient();
    
    const { data: sessionFiles, error } = await supabase
      .from('session_files')
      .select('session_id')
      .eq('file_id', fileId);

    if (error) {
      throw new Error(`Failed to get sessions with file: ${error.message}`);
    }

    return sessionFiles.map(sf => sf.session_id);
  }

  /**
   * Get required files for a session that haven't been uploaded yet
   */
  async getMissingRequiredFiles(sessionId: string): Promise<SessionFileWithDetails[]> {
    const sessionFiles = await this.getSessionFiles(sessionId);
    
    return sessionFiles.filter(sf => sf.is_required);
  }

  /**
   * Bulk attach multiple files to a session
   */
  async bulkAttachFilesToSession(
    sessionId: string,
    fileAttachments: Array<{
      fileId: string;
      category: 'preparation' | 'notes' | 'recording' | 'resource';
      isRequired: boolean;
      uploadedBy: string;
      description?: string;
    }>
  ): Promise<SessionFileWithDetails[]> {
    const supabase = await this.getSupabaseClient();
    
    const insertData = fileAttachments.map(attachment => ({
      session_id: sessionId,
      file_id: attachment.fileId,
      file_category: attachment.category,
      uploaded_by: attachment.uploadedBy,
      is_required: attachment.isRequired,
      description: attachment.description,
    }));

    const { data: sessionFiles, error } = await supabase
      .from('session_files')
      .insert(insertData)
      .select(`
        *,
        file:file_uploads!file_id (
          id, filename, file_type, file_size, description, tags
        ),
        uploaded_by_user:users!uploaded_by (
          id, first_name, last_name
        )
      `);

    if (error) {
      throw new Error(`Failed to bulk attach files to session: ${error.message}`);
    }

    return sessionFiles as SessionFileWithDetails[];
  }

  /**
   * Update multiple session files at once
   */
  async bulkUpdateSessionFiles(
    sessionId: string,
    updates: Array<{
      fileId: string;
      updates: Partial<{
        file_category: 'preparation' | 'notes' | 'recording' | 'resource';
        is_required: boolean;
        description: string;
      }>;
    }>
  ): Promise<SessionFileWithDetails[]> {
    const updatedFiles: SessionFileWithDetails[] = [];
    
    // Process updates sequentially to maintain transaction integrity
    for (const update of updates) {
      const updatedFile = await this.updateSessionFile(
        sessionId, 
        update.fileId, 
        update.updates
      );
      updatedFiles.push(updatedFile);
    }
    
    return updatedFiles;
  }

  /**
   * Get session files for a specific user (uploaded by them)
   */
  async getSessionFilesByUser(sessionId: string, userId: string): Promise<SessionFileWithDetails[]> {
    const supabase = await this.getSupabaseClient();
    
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
      .eq('uploaded_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get session files by user: ${error.message}`);
    }

    return sessionFiles as SessionFileWithDetails[];
  }

  /**
   * Get comprehensive session file summary with all statistics
   */
  async getSessionFileSummary(sessionId: string): Promise<{
    files: SessionFileWithDetails[];
    stats: SessionFileStats;
    filesByCategory: {
      preparation: SessionFileWithDetails[];
      notes: SessionFileWithDetails[];
      recording: SessionFileWithDetails[];
      resource: SessionFileWithDetails[];
    };
  }> {
    const files = await this.getSessionFiles(sessionId);
    const stats = await this.getSessionFileStats(sessionId);
    
    const filesByCategory = {
      preparation: files.filter(f => f.file_category === 'preparation'),
      notes: files.filter(f => f.file_category === 'notes'),
      recording: files.filter(f => f.file_category === 'recording'),
      resource: files.filter(f => f.file_category === 'resource'),
    };

    return {
      files,
      stats,
      filesByCategory,
    };
  }
}

// Export singleton instance
export const sessionFilesDatabase = new SessionFilesDatabase();