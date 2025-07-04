import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/client';
import type { User, UserRole, UserStatus } from '@/types';
import type { Database } from '@/types/supabase';

export class UserService {
  private supabase: ReturnType<typeof createServerClient> | ReturnType<typeof createClient>;

  constructor(isServer = true) {
    this.supabase = isServer ? createServerClient() : createClient();
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return this.mapDatabaseUserToUser(data);
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User | null> {
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
      return null;
    }

    return this.mapDatabaseUserToUser(data);
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
  async getUsersByRole(role: UserRole): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('role', role)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users by role:', error);
      return [];
    }

    return data.map(this.mapDatabaseUserToUser);
  }

  /**
   * Get all coaches
   */
  async getCoaches(): Promise<User[]> {
    return this.getUsersByRole('coach');
  }

  /**
   * Get all clients
   */
  async getClients(): Promise<User[]> {
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
   * Delete user account (admin only)
   */
  async deleteUser(userId: string): Promise<boolean> {
    // Note: This would typically soft delete or anonymize rather than hard delete
    const { error } = await this.supabase
      .from('users')
      .update({ 
        status: 'suspended',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error deleting user:', error);
      return false;
    }

    return true;
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
      const { data, error } = await this.supabase
        .from('coach_statistics')
        .select('*')
        .eq('coach_id', userId)
        .single();

      if (error) {
        console.error('Error fetching coach stats:', error);
        return null;
      }

      return {
        totalSessions: data.total_sessions || 0,
        completedSessions: data.completed_sessions || 0,
        upcomingSessions: data.upcoming_sessions || 0,
        totalClients: data.total_clients || 0,
        activeClients: data.active_clients || 0,
      };
    } else if (user.role === 'client') {
      const { data, error } = await this.supabase
        .from('client_progress')
        .select('*')
        .eq('client_id', userId)
        .single();

      if (error) {
        console.error('Error fetching client stats:', error);
        return null;
      }

      return {
        totalSessions: data.total_sessions || 0,
        completedSessions: data.completed_sessions || 0,
        upcomingSessions: data.upcoming_sessions || 0,
      };
    }

    return null;
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
      timezone: dbUser.timezone || 'UTC',
      language: dbUser.language as 'en' | 'he',
      status: dbUser.status as UserStatus,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
      lastSeenAt: dbUser.last_seen_at || undefined,
    };
  }
}