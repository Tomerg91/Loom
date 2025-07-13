import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/client';
import type { User, UserRole, UserStatus } from '@/types';
import type { Database } from '@/types/supabase';
import { Result, type Result as ResultType } from '@/lib/types/result';
import { config } from '@/lib/config';

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

export class UserService {
  private supabase: ReturnType<typeof createServerClient> | ReturnType<typeof createClient>;

  constructor(isServer = true) {
    this.supabase = isServer ? createServerClient() : createClient();
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<ResultType<User>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('id, email, first_name, last_name, role, language, status, created_at, updated_at, avatar_url, phone, timezone, last_seen_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return Result.error(`Failed to fetch user profile: ${error.message}`);
      }

      if (!data) {
        return Result.error('User not found');
      }

      const user = this.mapDatabaseUserToUser(data);
      return Result.success(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Unexpected error in getUserProfile:', error);
      return Result.error(`Unexpected error: ${message}`);
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<ResultType<User>> {
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

      if (error) {
        console.error('Error updating user profile:', error);
        return Result.error(`Failed to update user profile: ${error.message}`);
      }

      if (!data) {
        return Result.error('No user data returned after update');
      }

      const user = this.mapDatabaseUserToUser(data);
      return Result.success(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Unexpected error in updateUserProfile:', error);
      return Result.error(`Unexpected error: ${message}`);
    }
  }

  /**
   * Update user last seen timestamp
   */
  async updateLastSeen(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('Error updating last seen:', error);
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: UserRole): Promise<ResultType<User[]>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('id, email, first_name, last_name, role, language, status, created_at, updated_at, avatar_url, phone, timezone, last_seen_at')
        .eq('role', role)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users by role:', error);
        return Result.error(`Failed to fetch users by role: ${error.message}`);
      }

      const users = data?.map(this.mapDatabaseUserToUser) || [];
      return Result.success(users);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Unexpected error in getUsersByRole:', error);
      return Result.error(`Unexpected error: ${message}`);
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
      .select(`
        *,
        sessions!sessions_client_id_fkey(coach_id)
      `)
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
   * Delete user account (admin only) - Soft delete implementation
   */
  async deleteUser(userId: string): Promise<ResultType<void>> {
    try {
      // Implement proper soft delete with data anonymization
      const anonymizedEmail = `deleted_user_${Date.now()}@deleted.local`;
      const anonymizedPhone = null;
      
      const { error } = await this.supabase
        .from('users')
        .update({ 
          status: 'inactive',
          // Anonymize personal data for privacy compliance
          email: anonymizedEmail,
          first_name: 'Deleted',
          last_name: 'User',
          phone: anonymizedPhone,
          avatar_url: null,
          // Keep audit trail
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user:', error);
        return Result.error(`Failed to delete user: ${error.message}`);
      }

      // TODO: Also anonymize or delete related data (sessions, notes, etc.)
      // This should be implemented based on data retention policies

      return Result.success(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Unexpected error in deleteUser:', error);
      return Result.error(`Unexpected error: ${message}`);
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
      const { data: totalSessions, error: totalError } = await this.supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('coach_id', userId);

      const { data: completedSessions, error: completedError } = await this.supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('coach_id', userId)
        .eq('status', 'completed');

      const { data: upcomingSessions, error: upcomingError } = await this.supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('coach_id', userId)
        .in('status', ['scheduled', 'in_progress']);

      // Get unique clients count
      const { data: clientSessions, error: clientError } = await this.supabase
        .from('sessions')
        .select('client_id')
        .eq('coach_id', userId);

      const uniqueClients = new Set(clientSessions?.map(s => s.client_id) || []);
      
      if (totalError || completedError || upcomingError || clientError) {
        console.error('Error fetching coach stats:', { totalError, completedError, upcomingError, clientError });
        return null;
      }

      return {
        totalSessions: (totalSessions as unknown as { count: number } | null)?.count || 0,
        completedSessions: (completedSessions as unknown as { count: number } | null)?.count || 0,
        upcomingSessions: (upcomingSessions as unknown as { count: number } | null)?.count || 0,
        totalClients: uniqueClients.size,
        activeClients: uniqueClients.size, // For now, assume all clients are active
      };
    } else if (user.role === 'client') {
      // Calculate client statistics from sessions table
      const { data: totalSessions, error: totalError } = await this.supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', userId);

      const { data: completedSessions, error: completedError } = await this.supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', userId)
        .eq('status', 'completed');

      const { data: upcomingSessions, error: upcomingError } = await this.supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', userId)
        .in('status', ['scheduled', 'in_progress']);

      if (totalError || completedError || upcomingError) {
        console.error('Error fetching client stats:', { totalError, completedError, upcomingError });
        return null;
      }

      return {
        totalSessions: (totalSessions as unknown as { count: number } | null)?.count || 0,
        completedSessions: (completedSessions as unknown as { count: number } | null)?.count || 0,
        upcomingSessions: (upcomingSessions as unknown as { count: number } | null)?.count || 0,
      };
    }

    return null;
  }

  /**
   * Get users with pagination and filtering (for API)
   */
  async getUsersPaginated(options: GetUsersOptions): Promise<User[]> {
    let query = this.supabase
      .from('users')
      .select('*');

    // Apply filters
    if (options.role) {
      query = query.eq('role', options.role as 'client' | 'coach' | 'admin');
    }
    if (options.status) {
      query = query.eq('status', options.status as 'active' | 'inactive' | 'suspended');
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
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
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
      query = query.eq('status', options.status as 'active' | 'inactive' | 'suspended');
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
  async updateUser(userId: string, updates: Partial<User>): Promise<ResultType<User>> {
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
  private mapDatabaseUserToUser(dbUser: Database['public']['Tables']['users']['Row']): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role as UserRole,
      firstName: dbUser.first_name || '',
      lastName: dbUser.last_name || '',
      phone: dbUser.phone || '',
      avatarUrl: dbUser.avatar_url || '',
      timezone: dbUser.timezone || config.defaults.TIMEZONE,
      language: dbUser.language as 'en' | 'he',
      status: dbUser.status as UserStatus,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
      lastSeenAt: dbUser.last_seen_at || undefined,
    };
    }
}

// Export individual functions for API usage
const userService = new UserService(true);

export const getUsersPaginated = (options: GetUsersOptions) => userService.getUsersPaginated(options);
export const getUsersCount = (options: GetUsersCountOptions) => userService.getUsersCount(options);
export const getUserById = (userId: string) => userService.getUserById(userId);
export const updateUser = (userId: string, updates: Partial<User>) => userService.updateUser(userId, updates);
export const deleteUser = (userId: string) => userService.deleteUserById(userId);