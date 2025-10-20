import { routing } from '@/i18n/routing';
import { config } from '@/lib/config';
import { DatabaseError } from '@/lib/errors/database-errors';
import { createClient } from '@/lib/supabase/client';
import { createServerClient } from '@/lib/supabase/server';
import { Result, type Result as ResultType } from '@/lib/types/result';
import type { User, UserRole, UserStatus } from '@/types';
import type { Database } from '@/types/supabase';

// API-specific interfaces
interface GetUsersOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  role?: string;
  search?: string;
  status?: string;
}

interface GetUsersCountOptions {
  role?: string;
  search?: string;
  status?: string;
}

export interface UserServiceOptions {
  isServer?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient?: any;
}

export class UserService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: any;

  constructor(
    optionsOrIsServer: boolean | UserServiceOptions = { isServer: true }
  ) {
    if (typeof optionsOrIsServer === 'boolean') {
      this.supabase = optionsOrIsServer ? createServerClient() : createClient();
      return;
    }

    const { isServer = true, supabaseClient } = optionsOrIsServer;
    this.supabase = supabaseClient
      ? supabaseClient
      : isServer
        ? createServerClient()
        : createClient();
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<ResultType<User>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select(
          'id, email, first_name, last_name, role, language, status, created_at, updated_at, avatar_url, phone, timezone, last_seen_at'
        )
        .eq('id', userId)
        .single();

      const result = Result.fromSupabase(data, error, 'fetch', 'User');
      if (!result.success) {
        return result;
      }

      const user = this.mapDatabaseUserToUser(result.data);
      return Result.success(user);
    } catch (error) {
      const dbError = DatabaseError.operationFailed('fetch user profile', 'User', {
        userId,
        originalError: error instanceof Error ? error.message : String(error),
      });
      return Result.fromDatabaseError(dbError);
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updates: Partial<User>
  ): Promise<ResultType<User>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          phone: updates.phone,
          avatar_url: updates.avatarUrl,
          timezone: updates.timezone,
          language: updates.language,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      const result = Result.fromSupabase(data, error, 'update', 'User');
      if (!result.success) {
        return result;
      }

      const user = this.mapDatabaseUserToUser(result.data);
      return Result.success(user);
    } catch (error) {
      const dbError = DatabaseError.operationFailed('update user profile', 'User', {
        userId,
        updates,
        originalError: error instanceof Error ? error.message : String(error),
      });
      return Result.fromDatabaseError(dbError);
    }
  }

  /**
   * Update user last seen timestamp
   */
  async updateLastSeen(userId: string): Promise<ResultType<void>> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        const dbError = DatabaseError.fromSupabaseError(error, 'update last seen', 'User');
        return Result.fromDatabaseError(dbError);
      }

      return Result.success(undefined);
    } catch (error) {
      const dbError = DatabaseError.operationFailed('update last seen', 'User', {
        userId,
        originalError: error instanceof Error ? error.message : String(error),
      });
      return Result.fromDatabaseError(dbError);
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: UserRole): Promise<ResultType<User[]>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select(
          'id, email, first_name, last_name, role, language, status, created_at, updated_at, avatar_url, phone, timezone, last_seen_at'
        )
        .eq('role', role)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        const dbError = DatabaseError.fromSupabaseError(error, 'fetch users by role', 'User');
        return Result.fromDatabaseError(dbError);
      }

      const users = data?.map(this.mapDatabaseUserToUser) || [];
      return Result.success(users);
    } catch (error) {
      const dbError = DatabaseError.operationFailed('fetch users by role', 'User', {
        role,
        originalError: error instanceof Error ? error.message : String(error),
      });
      return Result.fromDatabaseError(dbError);
    }
  }

  /**
   * Get all coaches
   */
  async getCoaches(): Promise<ResultType<User[]>> {
    return this.getUsersByRole('coach');
  }

  /**
   * Get all clients
   */
  async getClients(): Promise<ResultType<User[]>> {
    return this.getUsersByRole('client');
  }

  /**
   * Get clients for a specific coach
   */
  async getCoachClients(coachId: string): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select(
        `
        *,
        sessions!sessions_client_id_fkey(coach_id)
      `
      )
      .eq('role', 'client')
      .eq('sessions.coach_id', coachId)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching coach clients:', error);
      return [];
    }

    return data.map(this.mapDatabaseUserToUser);
  }

  /**
   * Search users by name or email
   */
  async searchUsers(query: string, role?: UserRole): Promise<User[]> {
    let queryBuilder = this.supabase
      .from('users')
      .select('*')
      .eq('status', 'active');

    if (role) {
      queryBuilder = queryBuilder.eq('role', role);
    }

    // Search in first_name, last_name, or email
    queryBuilder = queryBuilder.or(
      `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`
    );

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }

    return data.map(this.mapDatabaseUserToUser);
  }

  /**
   * Update user status (admin only)
   */
  async updateUserStatus(userId: string, status: UserStatus): Promise<boolean> {
    const { error } = await this.supabase
      .from('users')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user status:', error);
      return false;
    }

    return true;
  }

  /**
   * Delete user account (admin only) - GDPR-compliant cascading deletion
   */
  async deleteUser(userId: string): Promise<ResultType<void>> {
    try {
      // Validate user exists and get basic info for audit
      const { data: user, error: userFetchError } = await this.supabase
        .from('users')
        .select('id, email, first_name, last_name, role')
        .eq('id', userId)
        .single();

      if (userFetchError || !user) {
        return Result.error('User not found');
      }

      console.log(
        `Starting GDPR-compliant deletion for user ${userId} (${user.email})`
      );

      // Log audit event for GDPR compliance BEFORE deletion
      await this.logUserDeletionAudit(userId, user.email);

      // Perform cascading deletion in the correct order (respecting foreign key constraints)
      // Each method has its own error handling and will log issues but continue processing
      const deletionResults = await this.cascadeDeleteUserData(userId);

      // Finally, anonymize the user record (soft delete with anonymization)
      const anonymizedEmail = `deleted_user_${Date.now()}@deleted.local`;

      const { error: userUpdateError } = await this.supabase
        .from('users')
        .update({
          status: 'inactive',
          // Anonymize personal data for GDPR compliance
          email: anonymizedEmail,
          first_name: 'Deleted',
          last_name: 'User',
          phone: null,
          avatar_url: null,
          // Clear basic MFA data (enhanced MFA already deleted)
          mfa_enabled: false,
          // Keep audit trail
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (userUpdateError) {
        console.error('Error anonymizing user record:', userUpdateError);
        return Result.error(
          `Failed to anonymize user record: ${userUpdateError.message}`
        );
      }

      // Log completion with any encountered issues
      if (deletionResults.hasErrors) {
        console.warn(
          `User deletion completed with some issues for user ${userId}. Check logs above for details.`
        );
        await this.logDeletionCompletion(userId, user.email, deletionResults);
      } else {
        console.log(
          `Successfully deleted user ${userId} and all related data in compliance with GDPR`
        );
        await this.logDeletionCompletion(userId, user.email, deletionResults);
      }

      return Result.success(undefined);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Unexpected error in deleteUser:', error);

      // Try to log the failure for audit purposes
      try {
        const {
          data: { user: currentUser },
        } = await this.supabase.auth.getUser();
        await this.supabase.from('system_audit_logs').insert({
          user_id: currentUser?.id || null,
          user_email: currentUser?.email || 'system',
          action: 'delete_record',
          resource: 'user',
          resource_id: userId,
          description: `GDPR user deletion failed: ${message}`,
          metadata: {
            gdpr_deletion: true,
            deletion_failed: true,
            error_message: message,
            timestamp: new Date().toISOString(),
            risk_level: 'critical',
          },
          risk_level: 'critical',
        });
      } catch (auditError) {
        console.error('Failed to log deletion failure:', auditError);
      }

      return Result.error(`Unexpected error: ${message}`);
    }
  }

  /**
   * Cascade delete all user-related data for GDPR compliance
   */
  private async cascadeDeleteUserData(
    userId: string
  ): Promise<{ hasErrors: boolean; errorSummary: string[] }> {
    const errorSummary: string[] = [];
    let hasErrors = false;

    const executeStep = async (
      stepName: string,
      operation: () => Promise<void>
    ) => {
      try {
        console.log(`Executing deletion step: ${stepName}`);
        await operation();
        console.log(`✓ Completed: ${stepName}`);
      } catch (error) {
        hasErrors = true;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        const stepError = `${stepName}: ${errorMessage}`;
        errorSummary.push(stepError);
        console.error(`✗ Failed: ${stepError}`);
      }
    };

    // Execute deletion steps in dependency order
    await executeStep('Delete messaging system data', () =>
      this.deleteMessagingData(userId)
    );
    await executeStep('Delete enhanced MFA system data', () =>
      this.deleteEnhancedMFAData(userId)
    );
    await executeStep('Delete basic MFA-related data', () =>
      this.deleteMFAData(userId)
    );
    await executeStep('Delete notification system data', () =>
      this.deleteNotificationSystemData(userId)
    );
    await executeStep('Delete file sharing and session file associations', () =>
      this.deleteFileRelatedData(userId)
    );
    await executeStep('Delete notifications', () =>
      this.deleteUserNotifications(userId)
    );
    await executeStep('Delete coach availability', () =>
      this.deleteCoachAvailability(userId)
    );
    await executeStep('Delete coach notes and reflections', () =>
      this.deleteNotesAndReflections(userId)
    );
    await executeStep('Delete sessions', () => this.deleteUserSessions(userId));
    await executeStep('Delete file uploads', () =>
      this.deleteUserFiles(userId)
    );
    await executeStep('Anonymize security logs', () =>
      this.anonymizeSecurityLogs(userId)
    );
    await executeStep('Anonymize audit logs', () =>
      this.anonymizeAuditLogs(userId)
    );

    if (hasErrors) {
      console.warn(
        `Cascaded deletion completed with ${errorSummary.length} errors for user ${userId}`
      );
    } else {
      console.log(
        `Cascaded deletion completed successfully for user ${userId}`
      );
    }

    return { hasErrors, errorSummary };
  }

  /**
   * Delete MFA-related data
   */
  private async deleteMFAData(userId: string): Promise<void> {
    const deletions = [
      this.supabase.from('mfa_sessions').delete().eq('user_id', userId),
      this.supabase.from('trusted_devices').delete().eq('user_id', userId),
    ];

    const results = await Promise.allSettled(deletions);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to delete MFA data (${index}):`, result.reason);
      }
    });
  }

  /**
   * Delete file-related data
   */
  private async deleteFileRelatedData(userId: string): Promise<void> {
    // First, remove file shares where user is involved
    const { error: shareError } = await this.supabase
      .from('file_shares')
      .delete()
      .or(`shared_by.eq.${userId},shared_with.eq.${userId}`);

    if (shareError) {
      console.error('Error deleting file shares:', shareError);
    }

    // Remove session file associations for user's files
    const { data: userFiles } = await this.supabase
      .from('file_uploads')
      .select('id')
      .eq('user_id', userId);

    if (userFiles && userFiles.length > 0) {
      const fileIds = userFiles.map((file: { id: string }) => file.id);
      const { error: sessionFileError } = await this.supabase
        .from('session_files')
        .delete()
        .in('file_id', fileIds);

      if (sessionFileError) {
        console.error(
          'Error deleting session file associations:',
          sessionFileError
        );
      }
    }
  }

  /**
   * Delete user notifications
   */
  private async deleteUserNotifications(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting notifications:', error);
    }
  }

  /**
   * Delete coach availability
   */
  private async deleteCoachAvailability(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('coach_availability')
      .delete()
      .eq('coach_id', userId);

    if (error) {
      console.error('Error deleting coach availability:', error);
    }
  }

  /**
   * Delete notes and reflections
   */
  private async deleteNotesAndReflections(userId: string): Promise<void> {
    const deletions = [
      // Delete coach notes where user is the coach or client
      this.supabase
        .from('coach_notes')
        .delete()
        .or(`coach_id.eq.${userId},client_id.eq.${userId}`),

      // Delete reflections where user is the client
      this.supabase.from('reflections').delete().eq('client_id', userId),
    ];

    const results = await Promise.allSettled(deletions);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `Failed to delete notes/reflections (${index}):`,
          result.reason
        );
      }
    });
  }

  /**
   * Delete user sessions
   */
  private async deleteUserSessions(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('sessions')
      .delete()
      .or(`coach_id.eq.${userId},client_id.eq.${userId}`);

    if (error) {
      console.error('Error deleting sessions:', error);
    }
  }

  /**
   * Delete user files
   */
  private async deleteUserFiles(userId: string): Promise<void> {
    // Get list of files to delete from storage
    const { data: files } = await this.supabase
      .from('file_uploads')
      .select('storage_path, bucket_name')
      .eq('user_id', userId);

    // Delete file records from database
    const { error: dbError } = await this.supabase
      .from('file_uploads')
      .delete()
      .eq('user_id', userId);

    if (dbError) {
      console.error('Error deleting file records:', dbError);
    }

    // Delete actual files from storage (if any)
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const { error: storageError } = await this.supabase.storage
            .from(file.bucket_name)
            .remove([file.storage_path]);

          if (storageError) {
            console.error(
              `Error deleting file from storage: ${file.storage_path}`,
              storageError
            );
          }
        } catch (error) {
          console.error(
            `Failed to delete file from storage: ${file.storage_path}`,
            error
          );
        }
      }
    }
  }

  /**
   * Delete messaging system data
   */
  private async deleteMessagingData(userId: string): Promise<void> {
    const deletions = [
      // Delete typing indicators
      this.supabase.from('typing_indicators').delete().eq('user_id', userId),

      // Delete message read receipts
      this.supabase
        .from('message_read_receipts')
        .delete()
        .eq('user_id', userId),

      // Delete message reactions
      this.supabase.from('message_reactions').delete().eq('user_id', userId),

      // Delete messages sent by user
      this.supabase.from('messages').delete().eq('sender_id', userId),

      // Delete conversation participation
      this.supabase
        .from('conversation_participants')
        .delete()
        .eq('user_id', userId),

      // Delete conversations created by user (this will cascade to messages via foreign key)
      this.supabase.from('conversations').delete().eq('created_by', userId),
    ];

    const results = await Promise.allSettled(deletions);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `Failed to delete messaging data (${index}):`,
          result.reason
        );
      }
    });
  }

  /**
   * Delete enhanced MFA system data
   */
  private async deleteEnhancedMFAData(userId: string): Promise<void> {
    const deletions = [
      // Delete MFA verification attempts
      this.supabase
        .from('mfa_verification_attempts')
        .delete()
        .eq('user_id', userId),

      // Delete backup codes
      this.supabase.from('mfa_backup_codes').delete().eq('user_id', userId),

      // Delete MFA methods
      this.supabase.from('user_mfa_methods').delete().eq('user_id', userId),

      // Delete MFA settings
      this.supabase.from('user_mfa_settings').delete().eq('user_id', userId),
    ];

    const results = await Promise.allSettled(deletions);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `Failed to delete enhanced MFA data (${index}):`,
          result.reason
        );
      }
    });
  }

  /**
   * Delete notification system data
   */
  private async deleteNotificationSystemData(userId: string): Promise<void> {
    // First get notification IDs for this user to delete delivery logs
    const { data: userNotifications } = await this.supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId);

    const deletions = [
      // Delete push subscriptions
      this.supabase.from('push_subscriptions').delete().eq('user_id', userId),

      // Delete notification preferences
      this.supabase
        .from('notification_preferences')
        .delete()
        .eq('user_id', userId),
    ];

    // Add delivery log deletion if there are notifications
    if (userNotifications && userNotifications.length > 0) {
      const notificationIds = userNotifications.map(
        (notification: { id: string }) => notification.id
      );
      deletions.push(
        this.supabase
          .from('notification_delivery_logs')
          .delete()
          .in('notification_id', notificationIds)
      );
    }

    const results = await Promise.allSettled(deletions);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `Failed to delete notification system data (${index}):`,
          result.reason
        );
      }
    });
  }

  /**
   * Anonymize security logs (preserve for system integrity but remove PII)
   */
  private async anonymizeSecurityLogs(userId: string): Promise<void> {
    const anonymizations = [
      // Anonymize security logs
      this.supabase
        .from('security_logs')
        .update({
          details: `User data anonymized on ${new Date().toISOString()}`,
          resolved_at: new Date().toISOString(),
          resolution_notes:
            'User deleted - data anonymized for GDPR compliance',
        })
        .eq('user_id', userId),

      // Anonymize file security events
      this.supabase
        .from('file_security_events')
        .update({
          event_details: {
            anonymized: true,
            deletion_date: new Date().toISOString(),
          },
        })
        .eq('user_id', userId),

      // Delete rate limit violations (these can be safely deleted as they're temporary security data)
      this.supabase
        .from('rate_limit_violations')
        .delete()
        .eq('user_id', userId),

      // Update blocked IPs to remove user association but keep the block for security
      this.supabase
        .from('blocked_ips')
        .update({
          blocked_reason: `Original reason anonymized - user deleted on ${new Date().toISOString()}`,
          unblock_reason: null,
        })
        .or(`blocked_by.eq.${userId},unblocked_by.eq.${userId}`),
    ];

    const results = await Promise.allSettled(anonymizations);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `Failed to anonymize security logs (${index}):`,
          result.reason
        );
      }
    });
  }

  /**
   * Anonymize audit logs (preserve for system integrity but remove PII)
   */
  private async anonymizeAuditLogs(userId: string): Promise<void> {
    const anonymizedEmail = `deleted_user_${Date.now()}@deleted.local`;

    const anonymizations = [
      // Anonymize system audit logs
      this.supabase
        .from('system_audit_logs')
        .update({
          user_email: anonymizedEmail,
          metadata: {
            anonymized: true,
            deletion_date: new Date().toISOString(),
          },
        })
        .eq('user_id', userId),

      // Anonymize maintenance logs
      this.supabase
        .from('maintenance_logs')
        .update({
          initiated_by_email: anonymizedEmail,
          result: { anonymized: true, deletion_date: new Date().toISOString() },
        })
        .eq('initiated_by', userId),
    ];

    const results = await Promise.allSettled(anonymizations);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `Failed to anonymize audit logs (${index}):`,
          result.reason
        );
      }
    });
  }

  /**
   * Log user deletion audit event for GDPR compliance
   */
  private async logUserDeletionAudit(
    userId: string,
    userEmail: string
  ): Promise<void> {
    try {
      // Get current user (admin performing the deletion)
      const {
        data: { user: currentUser },
      } = await this.supabase.auth.getUser();

      await this.supabase.from('system_audit_logs').insert({
        user_id: currentUser?.id || null,
        user_email: currentUser?.email || 'system',
        action: 'delete_record',
        resource: 'user',
        resource_id: userId,
        description: `GDPR-compliant user deletion: ${userEmail}`,
        metadata: {
          gdpr_deletion: true,
          deleted_user_email: userEmail,
          deletion_timestamp: new Date().toISOString(),
          risk_level: 'high',
        },
        risk_level: 'high',
      });
    } catch (error) {
      console.error('Error logging user deletion audit:', error);
      // Don't fail the deletion if audit logging fails
    }
  }

  /**
   * Log deletion completion with results for audit purposes
   */
  private async logDeletionCompletion(
    userId: string,
    userEmail: string,
    results: { hasErrors: boolean; errorSummary: string[] }
  ): Promise<void> {
    try {
      const {
        data: { user: currentUser },
      } = await this.supabase.auth.getUser();

      await this.supabase.from('system_audit_logs').insert({
        user_id: currentUser?.id || null,
        user_email: currentUser?.email || 'system',
        action: 'delete_record',
        resource: 'user',
        resource_id: userId,
        description: `GDPR user deletion completed: ${userEmail} ${results.hasErrors ? 'with errors' : 'successfully'}`,
        metadata: {
          gdpr_deletion: true,
          deletion_completed: true,
          deleted_user_email: userEmail,
          completion_timestamp: new Date().toISOString(),
          has_errors: results.hasErrors,
          error_count: results.errorSummary.length,
          errors: results.errorSummary,
          risk_level: results.hasErrors ? 'high' : 'medium',
        },
        risk_level: results.hasErrors ? 'high' : 'medium',
      });
    } catch (error) {
      console.error('Error logging deletion completion:', error);
      // Don't fail the deletion if audit logging fails
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    upcomingSessions: number;
    totalClients?: number;
    activeClients?: number;
  } | null> {
    const { data: user } = await this.supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!user) return null;

    if (user.role === 'coach') {
      // Calculate coach statistics from sessions table
      const { count: totalSessions, error: totalError } = await this.supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', userId);

      const { count: completedSessions, error: completedError } =
        await this.supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('coach_id', userId)
          .eq('status', 'completed');

      const { count: upcomingSessions, error: upcomingError } =
        await this.supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('coach_id', userId)
          .in('status', ['scheduled', 'in_progress']);

      // Get unique clients count
      const { data: clientSessions, error: clientError } = await this.supabase
        .from('sessions')
        .select('client_id')
        .eq('coach_id', userId);

      const uniqueClients = new Set(
        (clientSessions || [])
          .map((session: { client_id: string | null }) => session.client_id)
          .filter(
            (clientId: string | null): clientId is string =>
              typeof clientId === 'string' && clientId.length > 0
          )
      );

      if (totalError || completedError || upcomingError || clientError) {
        console.error('Error fetching coach stats:', {
          totalError,
          completedError,
          upcomingError,
          clientError,
        });
        return null;
      }

      return {
        totalSessions: totalSessions || 0,
        completedSessions: completedSessions || 0,
        upcomingSessions: upcomingSessions || 0,
        totalClients: uniqueClients.size,
        activeClients: uniqueClients.size, // For now, assume all clients are active
      };
    } else if (user.role === 'client') {
      // Calculate client statistics from sessions table
      const { count: totalSessions, error: totalError } = await this.supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', userId);

      const { count: completedSessions, error: completedError } =
        await this.supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', userId)
          .eq('status', 'completed');

      const { count: upcomingSessions, error: upcomingError } =
        await this.supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', userId)
          .in('status', ['scheduled', 'in_progress']);

      if (totalError || completedError || upcomingError) {
        console.error('Error fetching client stats:', {
          totalError,
          completedError,
          upcomingError,
        });
        return null;
      }

      return {
        totalSessions: totalSessions || 0,
        completedSessions: completedSessions || 0,
        upcomingSessions: upcomingSessions || 0,
      };
    }

    return null;
  }

  /**
   * Get users with pagination and filtering (for API)
   */
  async getUsersPaginated(options: GetUsersOptions): Promise<User[]> {
    let query = this.supabase.from('users').select('*');

    // Apply filters
    if (options.role) {
      query = query.eq('role', options.role as 'client' | 'coach' | 'admin');
    }
    if (options.status) {
      query = query.eq(
        'status',
        options.status as 'active' | 'inactive' | 'suspended'
      );
    }
    if (options.search) {
      query = query.or(
        `first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,email.ilike.%${options.search}%`
      );
    }

    // Apply sorting
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching users with pagination:', error);
      return [];
    }

    return data.map(this.mapDatabaseUserToUser);
  }

  /**
   * Get total count of users (for API pagination)
   */
  async getUsersCount(options: GetUsersCountOptions): Promise<number> {
    let query = this.supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Apply filters
    if (options.role) {
      query = query.eq('role', options.role as 'client' | 'coach' | 'admin');
    }
    if (options.status) {
      query = query.eq(
        'status',
        options.status as 'active' | 'inactive' | 'suspended'
      );
    }
    if (options.search) {
      query = query.or(
        `first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%,email.ilike.%${options.search}%`
      );
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error counting users:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Get user by ID (for API)
   */
  async getUserById(userId: string): Promise<ResultType<User>> {
    return this.getUserProfile(userId);
  }

  /**
   * Update user (for API)
   */
  async updateUser(
    userId: string,
    updates: Partial<User>
  ): Promise<ResultType<User>> {
    return this.updateUserProfile(userId, updates);
  }

  /**
   * Delete user (for API)
   */
  async deleteUserById(userId: string): Promise<ResultType<void>> {
    return this.deleteUser(userId);
  }

  /**
   * Map database user to application user type
   */
  private mapDatabaseUserToUser(
    dbUser: Database['public']['Tables']['users']['Row']
  ): User {
    return {
      id: dbUser.id,
      email: dbUser.email ?? '',
      role: (dbUser.role as UserRole) ?? 'client',
      firstName: dbUser.first_name || '',
      lastName: dbUser.last_name || '',
      phone: dbUser.phone || '',
      avatarUrl: dbUser.avatar_url || '',
      timezone: dbUser.timezone || config.defaults.TIMEZONE,
      language:
        (dbUser.language as 'en' | 'he') ||
        (routing.defaultLocale as 'en' | 'he'),
      status: dbUser.status as UserStatus,
      createdAt: dbUser.created_at ?? new Date().toISOString(),
      updatedAt: dbUser.updated_at ?? new Date().toISOString(),
      lastSeenAt: dbUser.last_seen_at || undefined,
    };
  }
}
