import { createServerClient } from '@/lib/supabase/server';
import { Result, type Result as ResultType } from '@/lib/types/result';

// Types for MFA admin operations
export interface UserMfaStatus {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'coach' | 'client';
  mfaEnabled: boolean;
  activeMethodTypes: string[];
  lastLogin: string;
  backupCodesUsed: number;
  backupCodesRemaining: number;
  trustedDevices: number;
  mfaVerifiedAt?: string;
  mfaSetupCompleted: boolean;
  createdAt: string;
  lastMfaUsedAt: string | null;
  hasBackupCodes: boolean;
}

export interface MfaStatistics {
  totalUsers: number;
  mfaEnabled: number;
  mfaEnabledPercentage: number;
  adminMfaEnabled: number;
  adminMfaEnabledPercentage: number;
  coachMfaEnabled: number;
  coachMfaEnabledPercentage: number;
  clientMfaEnabled: number;
  clientMfaEnabledPercentage: number;
  mfaFailures30Days: number;
  accountLockouts30Days: number;
  averageBackupCodesUsed: number;
  avgTrustedDevicesPerUser: number;
}

export interface UserMfaStatusDetails {
  userId: string;
  mfaEnabled: boolean;
  activeMethods: Array<{
    methodType: string;
    status: string;
    lastUsedAt: string | null;
  }>;
  totalMethods: number;
  activeMethodCount: number;
  lastMfaUsedAt: string | null;
  hasBackupCodes: boolean;
}

export interface MfaEnforcementSettings {
  globalRequirement: 'disabled' | 'optional' | 'required' | 'required_new_users';
  roleRequirements: {
    admin: 'optional' | 'required';
    coach: 'optional' | 'required';
    client: 'optional' | 'required';
  };
  gracePeriodDays: number;
  backupCodesRequired: boolean;
  trustedDeviceExpiry: number;
}

export interface GetMfaUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'admin' | 'coach' | 'client';
  mfaStatus?: 'enabled' | 'disabled' | 'all';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

type UserProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  last_seen_at: string | null;
  mfa_verified_at: string | null;
  mfa_setup_completed: boolean | null;
};

type AuditLogEvent = {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  action: string;
  timestamp: string;
  ipAddress?: string;
  details?: Record<string, unknown>;
};

export class MfaAdminService {
  private supabase: ReturnType<typeof createServerClient>;

  constructor() {
    this.supabase = createServerClient();
  }

  /**
   * Get all users with their MFA status for admin overview
   */
  async getMfaUserStatuses(options: GetMfaUsersOptions = {}): Promise<ResultType<{
    users: UserMfaStatus[];
    total: number;
    page: number;
    limit: number;
  }>> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        role,
        mfaStatus = 'all',
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      const offset = (page - 1) * limit;
      // Map incoming sort keys to columns that exist on the unified view
      const sortColumnMap: Record<string, string> = {
        email: 'email',
        role: 'role',
        mfa_enabled: 'mfa_enabled',
        mfaEnabled: 'mfa_enabled',
        last_mfa_used_at: 'last_mfa_used_at',
        lastMfaUsedAt: 'last_mfa_used_at',
        created_at: 'last_mfa_used_at', // Legacy default falls back to most recent MFA usage
      };

      const orderColumn = sortColumnMap[sortBy] || 'last_mfa_used_at';
      const orderAscending = sortOrder === 'asc';

      let matchedUserIds: string[] | undefined;

      if (search) {
        const searchQuery = this.supabase
          .from('users')
          .select('id')
          .or(
            `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
          );

        if (role) {
          searchQuery.eq('role', role);
        }

        const { data: searchMatches, error: searchError } = await searchQuery;

        if (searchError) {
          console.error('Error searching users for MFA status view:', searchError);
          return Result.error(
            `Failed to search users: ${searchError.message}`
          );
        }

        matchedUserIds = (searchMatches || []).map(user => user.id);

        if (matchedUserIds.length === 0) {
          return Result.success({ users: [], total: 0, page, limit });
        }
      }

      let viewQuery = this.supabase
        .from('user_mfa_status_unified')
        .select(
          `
            user_id,
            email,
            role,
            mfa_enabled,
            last_mfa_used_at,
            active_method_types,
            has_backup_codes,
            total_methods,
            active_method_count,
            pending_method_count,
            disabled_method_count,
            legacy_mfa_enabled,
            has_discrepancy
          `,
          { count: 'exact' }
        );

      if (matchedUserIds) {
        viewQuery = viewQuery.in('user_id', matchedUserIds);
      }

      if (role) {
        viewQuery = viewQuery.eq('role', role);
      }

      if (mfaStatus === 'enabled') {
        viewQuery = viewQuery.eq('mfa_enabled', true);
      } else if (mfaStatus === 'disabled') {
        viewQuery = viewQuery.eq('mfa_enabled', false);
      }

      viewQuery = viewQuery.order(orderColumn, {
        ascending: orderAscending,
        nullsFirst: orderAscending,
      });

      viewQuery = viewQuery.range(offset, offset + limit - 1);

      const { data, error, count } = await viewQuery;

      if (error) {
        console.error('Error fetching MFA user statuses from unified view:', error);
        return Result.error(`Failed to fetch MFA user statuses: ${error.message}`);
      }

      const userIds = (data || []).map(row => row.user_id);
      const userDetailsMap = new Map<string, UserProfileRow>();

      if (userIds.length > 0) {
        const { data: userDetails, error: userDetailsError } = await this.supabase
          .from('users')
          .select(
            `id, first_name, last_name, created_at, last_seen_at, mfa_verified_at, mfa_setup_completed`
          )
          .in('id', userIds);

        if (userDetailsError) {
          console.error('Error fetching user profile details for MFA admin view:', userDetailsError);
        } else {
          (userDetails || []).forEach(user => {
            userDetailsMap.set(user.id, user as UserProfileRow);
          });
        }
      }

      const users: UserMfaStatus[] = (data || []).map(row => {
        const details = userDetailsMap.get(row.user_id);
        const firstName = details?.first_name ?? '';
        const lastName = details?.last_name ?? '';

        const activeMethodTypes = Array.isArray(row.active_method_types)
          ? (row.active_method_types as string[])
          : [];

        const lastLogin =
          details?.last_seen_at ||
          details?.created_at ||
          row.last_mfa_used_at ||
          '';

        return {
          id: row.user_id,
          name: `${firstName} ${lastName}`.trim() || row.email || 'Unknown User',
          email: row.email,
          role: (row.role as 'admin' | 'coach' | 'client') || 'client',
          mfaEnabled: !!row.mfa_enabled,
          activeMethodTypes,
          lastLogin,
          backupCodesUsed: 0,
          backupCodesRemaining: 0,
          trustedDevices: 0,
          mfaVerifiedAt: details?.mfa_verified_at ?? undefined,
          mfaSetupCompleted: details?.mfa_setup_completed ?? false,
          createdAt: details?.created_at || row.last_mfa_used_at || '',
          lastMfaUsedAt: row.last_mfa_used_at ?? null,
          hasBackupCodes: !!row.has_backup_codes,
        };
      });

      return Result.success({
        users,
        total: count || 0,
        page,
        limit,
      });
    } catch (error) {
      console.error('Unexpected error in getMfaUserStatuses:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to fetch MFA user statuses'
      );
    }
  }

  /**
   * Get MFA statistics for the admin dashboard
   */
  async getMfaStatistics(): Promise<ResultType<MfaStatistics>> {
    try {
      const { data: unifiedStatuses, error: unifiedError } = await this.supabase
        .from('user_mfa_status_unified')
        .select('user_id, role, mfa_enabled');

      if (unifiedError) {
        console.error('Error fetching unified MFA statuses for statistics:', unifiedError);
        return Result.error(
          `Failed to fetch MFA statistics: ${unifiedError.message}`
        );
      }

      const userIds = (unifiedStatuses || []).map(row => row.user_id);
      let activeUsers: Set<string> | null = null;

      if (userIds.length > 0) {
        const { data: userStates, error: userStatesError } = await this.supabase
          .from('users')
          .select('id, status')
          .in('id', userIds);

        if (userStatesError) {
          console.error('Error fetching user activation states for MFA statistics:', userStatesError);
        } else {
          activeUsers = new Set(
            (userStates || [])
              .filter(user => user.status === 'active')
              .map(user => user.id)
          );
        }
      }

      const relevantStatuses = activeUsers
        ? (unifiedStatuses || []).filter(status => activeUsers!.has(status.user_id))
        : (unifiedStatuses || []);

      const totalUsers = relevantStatuses.length;
      const mfaEnabledUsers = relevantStatuses.filter(user => user.mfa_enabled).length;
      const adminUsers = relevantStatuses.filter(user => user.role === 'admin');
      const coachUsers = relevantStatuses.filter(user => user.role === 'coach');
      const clientUsers = relevantStatuses.filter(user => user.role === 'client');

      const adminMfaEnabled = adminUsers.filter(user => user.mfa_enabled).length;
      const coachMfaEnabled = coachUsers.filter(user => user.mfa_enabled).length;
      const clientMfaEnabled = clientUsers.filter(user => user.mfa_enabled).length;

      // Get MFA failures from attempts table (if it exists)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      let mfaFailures = 0;
      
      try {
        const { count, error: failuresError } = await this.supabase
          .from('mfa_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('success', false)
          .gte('created_at', thirtyDaysAgo);

        if (failuresError) {
          console.error('Error fetching MFA failures (table might not exist):', failuresError);
        } else {
          mfaFailures = count || 0;
        }
      } catch (error) {
        console.error('MFA attempts table might not exist:', error);
        // Use default value of 0
      }

      // For now, use default values for trusted devices and backup codes
      // These will be properly calculated once the full MFA system is implemented
      const avgTrustedDevicesPerUser = 0;
      const averageBackupCodesUsed = 0;

      const statistics: MfaStatistics = {
        totalUsers,
        mfaEnabled: mfaEnabledUsers,
        mfaEnabledPercentage: totalUsers > 0 ? Math.round((mfaEnabledUsers / totalUsers) * 100) : 0,
        adminMfaEnabled,
        adminMfaEnabledPercentage: adminUsers.length > 0 ? Math.round((adminMfaEnabled / adminUsers.length) * 100) : 0,
        coachMfaEnabled,
        coachMfaEnabledPercentage: coachUsers.length > 0 ? Math.round((coachMfaEnabled / coachUsers.length) * 100) : 0,
        clientMfaEnabled,
        clientMfaEnabledPercentage: clientUsers.length > 0 ? Math.round((clientMfaEnabled / clientUsers.length) * 100) : 0,
        mfaFailures30Days: mfaFailures,
        accountLockouts30Days: 0, // Placeholder - implement if you have account lockout tracking
        averageBackupCodesUsed: Math.round(averageBackupCodesUsed * 10) / 10,
        avgTrustedDevicesPerUser: Math.round(avgTrustedDevicesPerUser * 10) / 10,
      };

      return Result.success(statistics);
    } catch (error) {
      console.error('Unexpected error in getMfaStatistics:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to fetch MFA statistics'
      );
    }
  }

  /**
   * Fetch unified MFA status details for a specific user via RPC wrapper
   */
  async getUserMfaStatus(userId: string): Promise<ResultType<UserMfaStatusDetails>> {
    try {
      const { data, error } = await this.supabase.rpc('get_user_mfa_status', {
        p_user_id: userId,
      });

      if (error) {
        console.error('Error fetching unified MFA status via RPC:', error);
        return Result.error(`Failed to fetch user MFA status: ${error.message}`);
      }

      if (!data) {
        return Result.error('MFA status not found for the requested user');
      }

      const payload = data as {
        user_id?: string;
        mfa_enabled?: boolean;
        active_methods?: Array<{
          method_type: string;
          status: string;
          last_used_at: string | null;
        }>;
        total_methods?: number;
        active_method_count?: number;
        last_mfa_used_at?: string | null;
        has_backup_codes?: boolean;
      };

      const activeMethods = Array.isArray(payload.active_methods)
        ? payload.active_methods.map(method => ({
            methodType: method.method_type,
            status: method.status,
            lastUsedAt: method.last_used_at,
          }))
        : [];

      return Result.success({
        userId: payload.user_id || userId,
        mfaEnabled: !!payload.mfa_enabled,
        activeMethods,
        totalMethods: payload.total_methods ?? activeMethods.length,
        activeMethodCount: payload.active_method_count ?? activeMethods.length,
        lastMfaUsedAt: payload.last_mfa_used_at ?? null,
        hasBackupCodes: !!payload.has_backup_codes,
      });
    } catch (error) {
      console.error('Unexpected error in getUserMfaStatus:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to fetch user MFA status'
      );
    }
  }

  /**
   * Enable MFA for a specific user (admin action)
   */
  async enableMfaForUser(userId: string, adminUserId: string): Promise<ResultType<void>> {
    try {
      // Update user's MFA status
      const { error: updateError } = await this.supabase
        .from('users')
        .update({ 
          mfa_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error enabling MFA for user:', updateError);
        return Result.error(`Failed to enable MFA for user: ${updateError.message}`);
      }

      // Log the admin action (try different table names that might exist)
      try {
        const { error: logError } = await this.supabase
          .from('mfa_events')
          .insert({
            user_id: userId,
            event_type: 'enable',
            metadata: { 
              admin_user_id: adminUserId,
              action: 'admin_enabled'
            },
            created_at: new Date().toISOString()
          });

        if (logError) {
          console.error('Error logging MFA enable action:', logError);
          // Don't fail the operation for logging errors
        }
      } catch (error) {
        console.error('MFA events table might not exist:', error);
        // Don't fail the operation for logging errors
      }

      return Result.success(undefined);
    } catch (error) {
      console.error('Unexpected error in enableMfaForUser:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to enable MFA for user'
      );
    }
  }

  /**
   * Disable MFA for a specific user (admin action)
   */
  async disableMfaForUser(userId: string, adminUserId: string): Promise<ResultType<void>> {
    try {
      // Disable MFA in users table
      const { error: updateUserError } = await this.supabase
        .from('users')
        .update({ 
          mfa_enabled: false,
          mfa_setup_completed: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateUserError) {
        console.error('Error disabling MFA for user:', updateUserError);
        return Result.error(`Failed to disable MFA for user: ${updateUserError.message}`);
      }

      // Try to disable MFA in user_mfa table if it exists
      // Note: This table might not exist in all deployments, so we handle errors gracefully
      try {
        const { error: updateMfaError } = await this.supabase
          .from('user_mfa')
          .update({ 
            is_enabled: false,
            secret_key: null,
            backup_codes: [],
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (updateMfaError) {
          console.error('Error updating MFA table for user (table might not exist):', updateMfaError);
          // Continue even if MFA table update fails - the main users table is updated
        }
      } catch (error) {
        console.error('MFA table operations failed (table might not exist):', error);
        // Continue - this is not critical for the operation
      }

      // Log the admin action
      try {
        const { error: logError } = await this.supabase
          .from('mfa_events')
          .insert({
            user_id: userId,
            event_type: 'disable',
            metadata: { 
              admin_user_id: adminUserId,
              action: 'admin_disabled'
            },
            created_at: new Date().toISOString()
          });

        if (logError) {
          console.error('Error logging MFA disable action:', logError);
        }
      } catch (error) {
        console.error('MFA events table might not exist:', error);
      }

      return Result.success(undefined);
    } catch (error) {
      console.error('Unexpected error in disableMfaForUser:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to disable MFA for user'
      );
    }
  }

  /**
   * Reset MFA for a specific user (admin action) - removes setup but keeps requirement
   */
  async resetMfaForUser(userId: string, adminUserId: string): Promise<ResultType<void>> {
    try {
      // Try to reset MFA setup in user_mfa table if it exists
      try {
        const { error: updateMfaError } = await this.supabase
          .from('user_mfa')
          .update({ 
            secret_key: null,
            backup_codes: [],
            verified_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (updateMfaError) {
          console.error('Error resetting MFA table for user (table might not exist):', updateMfaError);
          // Continue even if MFA table update fails
        }
      } catch (error) {
        console.error('MFA table operations failed (table might not exist):', error);
        // Continue - this is not critical for the operation
      }

      // Update user table
      const { error: updateUserError } = await this.supabase
        .from('users')
        .update({ 
          mfa_setup_completed: false,
          mfa_verified_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateUserError) {
        console.error('Error updating user MFA status:', updateUserError);
        // Continue even if user table update fails
      }

      // Remove trusted devices
      const { error: trustedDevicesError } = await this.supabase
        .from('trusted_devices')
        .delete()
        .eq('user_id', userId);

      if (trustedDevicesError) {
        console.error('Error removing trusted devices:', trustedDevicesError);
        // Continue even if trusted devices removal fails
      }

      // Log the admin action
      try {
        const { error: logError } = await this.supabase
          .from('mfa_events')
          .insert({
            user_id: userId,
            event_type: 'setup', // closest equivalent to reset
            metadata: { 
              admin_user_id: adminUserId,
              action: 'admin_reset'
            },
            created_at: new Date().toISOString()
          });

        if (logError) {
          console.error('Error logging MFA reset action:', logError);
        }
      } catch (error) {
        console.error('MFA events table might not exist:', error);
      }

      return Result.success(undefined);
    } catch (error) {
      console.error('Unexpected error in resetMfaForUser:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to reset MFA for user'
      );
    }
  }

  /**
   * Get MFA enforcement settings
   */
  async getMfaEnforcementSettings(): Promise<ResultType<MfaEnforcementSettings>> {
    try {
      // In a real application, you would store these settings in a database table
      // For now, return default settings - you can implement a settings table later
      const defaultSettings: MfaEnforcementSettings = {
        globalRequirement: 'optional',
        roleRequirements: {
          admin: 'required',
          coach: 'optional',
          client: 'optional'
        },
        gracePeriodDays: 30,
        backupCodesRequired: true,
        trustedDeviceExpiry: 30
      };

      return Result.success(defaultSettings);
    } catch (error) {
      console.error('Unexpected error in getMfaEnforcementSettings:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to fetch MFA enforcement settings'
      );
    }
  }

  /**
   * Save MFA enforcement settings
   */
  async saveMfaEnforcementSettings(settings: MfaEnforcementSettings, adminUserId: string): Promise<ResultType<void>> {
    try {
      // In a real application, you would save these to a database table
      // For now, just log the action - you can implement a settings table later
      
      // Log the settings update (non-critical operation)
      try {
        const { error: logError } = await this.supabase
          .from('mfa_events')
          .insert({
            user_id: adminUserId,
            event_type: 'setup', // closest equivalent to settings update
            metadata: { 
              action: 'settings_updated',
              settings
            },
            created_at: new Date().toISOString()
          });

        if (logError) {
          console.error('Error logging settings update:', logError);
        }
      } catch (error) {
        console.error('MFA events table might not exist:', error);
        // Continue - this is not critical
      }

      return Result.success(undefined);
    } catch (error) {
      console.error('Unexpected error in saveMfaEnforcementSettings:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to save MFA enforcement settings'
      );
    }
  }

  /**
   * Get MFA audit log for admin review
   */
  async getMfaAuditLog(options: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    days?: number;
  } = {}): Promise<ResultType<{
    events: AuditLogEvent[];
    total: number;
    page: number;
    limit: number;
  }>> {
    try {
      const {
        page = 1,
        limit = 50,
        userId,
        action,
        days = 30
      } = options;

      const offset = (page - 1) * limit;
      const dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Try to query from available MFA event tables
      let events: AuditLogEvent[] = [];
      let count = 0;

      try {
        // Build query with user information joined from mfa_events table
        let query = this.supabase
          .from('mfa_events')
          .select(`
            id,
            user_id,
            event_type,
            created_at,
            ip_address,
            metadata,
            users (
              email,
              first_name,
              last_name
            )
          `, { count: 'exact' })
          .gte('created_at', dateFilter);

        // Apply filters
        if (userId) {
          query = query.eq('user_id', userId);
        }

        if (action) {
          query = query.eq('event_type', action);
        }

        // Apply sorting and pagination
        query = query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        const { data, error, count: queryCount } = await query;

        if (error) {
          console.error('Error fetching MFA events:', error);
        } else {
          count = queryCount || 0;
          
          // Transform the data
          events = (data || []).map(event => ({
            id: event.id,
            userId: event.user_id,
            userEmail: event.users?.email || 'Unknown',
            userName: event.users ? `${event.users.first_name || ''} ${event.users.last_name || ''}`.trim() : 'Unknown',
            action: event.event_type || 'unknown',
            timestamp: event.created_at,
            ipAddress: event.ip_address,
            details: (event.metadata as Record<string, unknown> | null) || undefined,
          }));
        }
      } catch (error) {
        console.error('MFA events table might not exist:', error);
        // Return empty results instead of failing
      }

      return Result.success({
        events,
        total: count,
        page,
        limit,
      });
    } catch (error) {
      console.error('Unexpected error in getMfaAuditLog:', error);
      return Result.error(
        error instanceof Error ? error.message : 'Failed to fetch MFA audit log'
      );
    }
  }
}

// Export service instance
export const mfaAdminService = new MfaAdminService();

// Export individual functions for API usage
export const getMfaUserStatuses = (options?: GetMfaUsersOptions) => 
  mfaAdminService.getMfaUserStatuses(options);

export const getMfaStatistics = () => 
  mfaAdminService.getMfaStatistics();

export const getUserMfaStatus = (userId: string) =>
  mfaAdminService.getUserMfaStatus(userId);

export const enableMfaForUser = (userId: string, adminUserId: string) => 
  mfaAdminService.enableMfaForUser(userId, adminUserId);

export const disableMfaForUser = (userId: string, adminUserId: string) => 
  mfaAdminService.disableMfaForUser(userId, adminUserId);

export const resetMfaForUser = (userId: string, adminUserId: string) => 
  mfaAdminService.resetMfaForUser(userId, adminUserId);

export const getMfaEnforcementSettings = () => 
  mfaAdminService.getMfaEnforcementSettings();

export const saveMfaEnforcementSettings = (settings: MfaEnforcementSettings, adminUserId: string) => 
  mfaAdminService.saveMfaEnforcementSettings(settings, adminUserId);

export const getMfaAuditLog = (options?: {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  days?: number;
}) => mfaAdminService.getMfaAuditLog(options);

export interface MfaDiscrepancy {
  userId: string;
  email: string;
  role: 'admin' | 'coach' | 'client';
  unifiedStatus: boolean;
  legacyStatus: boolean;
  activeMethodCount: number;
  totalMethods: number;
  activeMethodTypes: string[];
}

export const getMfaDiscrepancies = async (): Promise<ResultType<{
  discrepancies: MfaDiscrepancy[];
  total: number;
}>> => {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('mfa_status_discrepancies')
      .select(`
        user_id,
        email,
        role,
        mfa_enabled,
        legacy_mfa_enabled,
        active_method_count,
        total_methods,
        active_method_types
      `);

    if (error) {
      console.error('Error fetching MFA discrepancies:', error);
      return Result.error(`Failed to fetch MFA discrepancies: ${error.message}`);
    }

    const discrepancies: MfaDiscrepancy[] = (data || []).map(row => ({
      userId: row.user_id,
      email: row.email,
      role: row.role as 'admin' | 'coach' | 'client',
      unifiedStatus: !!row.mfa_enabled,
      legacyStatus: !!row.legacy_mfa_enabled,
      activeMethodCount: row.active_method_count || 0,
      totalMethods: row.total_methods || 0,
      activeMethodTypes: Array.isArray(row.active_method_types)
        ? (row.active_method_types as string[])
        : [],
    }));

    return Result.success({
      discrepancies,
      total: discrepancies.length,
    });
  } catch (error) {
    console.error('Unexpected error in getMfaDiscrepancies:', error);
    return Result.error(
      error instanceof Error ? error.message : 'Failed to fetch MFA discrepancies'
    );
  }
};
