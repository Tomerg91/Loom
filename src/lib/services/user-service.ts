import { db, getSupabaseClient } from '@/lib/db';
import { ApiError } from '@/lib/api/errors';
import type { Database } from '@/types/supabase';

type UserRole = Database['public']['Tables']['users']['Row']['role'];
type UserStatus = Database['public']['Tables']['users']['Row']['status'];

export interface UserFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  limit?: number;
}

export interface UserUpdateData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
}

class UserService {
  async getUsers(filters: UserFilters = {}) {
    try {
      const supabase = await getSupabaseClient();
      
      // Start with base query
      let query = supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          role,
          status,
          avatar_url,
          phone,
          created_at,
          updated_at,
          last_seen_at
        `);

      // Apply search filter
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`email.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`);
      }

      // Apply role filter
      if (filters.role) {
        query = query.eq('role', filters.role);
      }

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      // Get total count for pagination
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Apply ordering and pagination
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: users, error } = await query;

      if (error) {
        console.error('Database error fetching users:', error);
        throw new ApiError('DATABASE_ERROR', 'Failed to fetch users');
      }

      // Transform data to match frontend expectations
      const transformedUsers = users?.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatar_url,
        phone: user.phone,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLoginAt: user.last_seen_at,
      })) || [];

      return {
        users: transformedUsers,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };

    } catch (error) {
      console.error('Error fetching users:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('DATABASE_ERROR', 'Failed to fetch users');
    }
  }

  async getUserById(id: string) {
    try {
      const supabase = await getSupabaseClient();
      
      const { data: user, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          role,
          status,
          avatar_url,
          phone,
          timezone,
          language,
          created_at,
          updated_at,
          last_seen_at
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Database error fetching user by ID:', error);
        throw new ApiError('DATABASE_ERROR', 'Failed to fetch user');
      }

      if (!user) {
        return null;
      }

      // Transform data to match frontend expectations
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatar_url,
        phone: user.phone,
        timezone: user.timezone,
        language: user.language,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLoginAt: user.last_seen_at,
      };

    } catch (error) {
      console.error('Error fetching user by ID:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('DATABASE_ERROR', 'Failed to fetch user');
    }
  }

  async updateUser(id: string, data: UserUpdateData) {
    try {
      const supabase = await getSupabaseClient();
      
      // Prepare update data with proper field names
      const updateData: Partial<Database['public']['Tables']['users']['Update']> = {
        updated_at: new Date().toISOString(),
      };

      if (data.first_name !== undefined) updateData.first_name = data.first_name;
      if (data.last_name !== undefined) updateData.last_name = data.last_name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.role !== undefined) updateData.role = data.role;
      if (data.status !== undefined) updateData.status = data.status;

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select(`
          id,
          email,
          first_name,
          last_name,
          role,
          status,
          avatar_url,
          phone,
          timezone,
          language,
          created_at,
          updated_at,
          last_seen_at
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned (user not found)
          return null;
        }
        console.error('Database error updating user:', error);
        throw new ApiError('DATABASE_ERROR', 'Failed to update user');
      }

      if (!updatedUser) {
        return null;
      }

      // Transform data to match frontend expectations
      return {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        role: updatedUser.role,
        status: updatedUser.status,
        avatarUrl: updatedUser.avatar_url,
        phone: updatedUser.phone,
        timezone: updatedUser.timezone,
        language: updatedUser.language,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
        lastLoginAt: updatedUser.last_seen_at,
      };

    } catch (error) {
      console.error('Error updating user:', error);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError('DATABASE_ERROR', 'Failed to update user');
    }
  }

  async deleteUser(id: string) {
    try {
      const supabase = await getSupabaseClient();
      
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Database error deleting user:', error);
        throw new ApiError('DATABASE_ERROR', 'Failed to delete user');
      }

      return true;

    } catch (error) {
      console.error('Error deleting user:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('DATABASE_ERROR', 'Failed to delete user');
    }
  }

  async getUserStats() {
    try {
      const supabase = await getSupabaseClient();
      
      // Get total count
      const { count: total } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get counts by role
      const { data: roleStats } = await supabase
        .from('users')
        .select('role')
        .neq('id', ''); // Just to make sure we get all records

      // Get counts by status
      const { data: statusStats } = await supabase
        .from('users')
        .select('status')
        .neq('id', '');

      const byRole = {
        admin: roleStats?.filter(u => u.role === 'admin').length || 0,
        coach: roleStats?.filter(u => u.role === 'coach').length || 0,
        client: roleStats?.filter(u => u.role === 'client').length || 0,
      };

      const byStatus = {
        active: statusStats?.filter(u => u.status === 'active').length || 0,
        inactive: statusStats?.filter(u => u.status === 'inactive').length || 0,
        suspended: statusStats?.filter(u => u.status === 'suspended').length || 0,
      };

      return {
        total: total || 0,
        byRole,
        byStatus,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw new ApiError('DATABASE_ERROR', 'Failed to fetch user statistics');
    }
  }
}

// Export the class
export { UserService };

// Export a singleton instance
export const userService = new UserService();

