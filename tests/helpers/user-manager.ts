import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TestUser } from './test-data';

export interface TestUserManagerConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
}

export interface CreatedTestUser extends TestUser {
  id: string;
  created_at: string;
}

/**
 * Manages test users for E2E testing
 * Handles creation, authentication, and cleanup of test user accounts
 */
export class TestUserManager {
  private supabase: SupabaseClient;
  private createdUserIds: Set<string> = new Set();

  constructor(config: TestUserManagerConfig) {
    this.supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Create test users in the authentication system and users table
   */
  async createTestUsers(users: TestUser[]): Promise<CreatedTestUser[]> {
    const createdUsers: CreatedTestUser[] = [];

    for (const user of users) {
      try {
        console.log(`Creating test user: ${user.email}`);

        // First, create the user in Supabase Auth
        const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true, // Auto-confirm email for test users
          user_metadata: {
            first_name: user.firstName,
            last_name: user.lastName,
            role: user.role,
          },
        });

        if (authError) {
          console.error(`Failed to create auth user ${user.email}:`, authError);
          continue;
        }

        if (!authData.user) {
          console.error(`No user data returned for ${user.email}`);
          continue;
        }

        // Track created user for cleanup
        this.createdUserIds.add(authData.user.id);

        // Then, create the user profile in the users table
        const { data: profileData, error: profileError } = await this.supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: user.email,
              first_name: user.firstName,
              last_name: user.lastName,
              role: user.role,
              phone: user.phone,
              timezone: user.timezone || 'UTC',
              language: user.language || 'en',
              status: 'active',
            },
          ])
          .select()
          .single();

        if (profileError) {
          console.error(`Failed to create user profile ${user.email}:`, profileError);
          // Clean up the auth user if profile creation failed
          await this.supabase.auth.admin.deleteUser(authData.user.id);
          this.createdUserIds.delete(authData.user.id);
          continue;
        }

        const createdUser: CreatedTestUser = {
          ...user,
          id: authData.user.id,
          created_at: authData.user.created_at,
        };

        createdUsers.push(createdUser);
        console.log(`✅ Created test user: ${user.email} (${user.role})`);

      } catch (error) {
        console.error(`Unexpected error creating user ${user.email}:`, error);
      }
    }

    console.log(`Created ${createdUsers.length} out of ${users.length} test users`);
    return createdUsers;
  }

  /**
   * Authenticate a test user and return session info
   */
  async authenticateUser(email: string, password: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error(`Failed to authenticate user ${email}:`, error);
        return null;
      }

      if (!data.session) {
        console.error(`No session returned for user ${email}`);
        return null;
      }

      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } catch (error) {
      console.error(`Unexpected error authenticating user ${email}:`, error);
      return null;
    }
  }

  /**
   * Get user profile by email
   */
  async getUserByEmail(email: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        console.error(`Failed to get user ${email}:`, error);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Unexpected error getting user ${email}:`, error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, updates: Partial<TestUser>): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (error) {
        console.error(`Failed to update user ${userId}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Unexpected error updating user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Delete a specific test user
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      // Delete from users table first (due to foreign key constraints)
      const { error: profileError } = await this.supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.error(`Failed to delete user profile ${userId}:`, profileError);
      }

      // Delete from auth
      const { error: authError } = await this.supabase.auth.admin.deleteUser(userId);

      if (authError) {
        console.error(`Failed to delete auth user ${userId}:`, authError);
        return false;
      }

      this.createdUserIds.delete(userId);
      return true;
    } catch (error) {
      console.error(`Unexpected error deleting user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Clean up all created test users
   */
  async cleanupTestUsers(): Promise<void> {
    console.log(`Cleaning up ${this.createdUserIds.size} test users...`);

    const deletionPromises = Array.from(this.createdUserIds).map(userId =>
      this.deleteUser(userId).catch(error => {
        console.error(`Failed to delete user ${userId}:`, error);
        return false;
      })
    );

    await Promise.all(deletionPromises);
    this.createdUserIds.clear();
    console.log('Test user cleanup completed');
  }

  /**
   * Verify all test users exist and are properly configured
   */
  async verifyTestUsers(users: TestUser[]): Promise<boolean> {
    let allValid = true;

    for (const user of users) {
      const profile = await this.getUserByEmail(user.email);
      if (!profile) {
        console.error(`Test user not found: ${user.email}`);
        allValid = false;
        continue;
      }

      // Verify role matches
      if (profile.role !== user.role) {
        console.error(`Role mismatch for ${user.email}: expected ${user.role}, got ${profile.role}`);
        allValid = false;
      }

      // Verify authentication works
      const auth = await this.authenticateUser(user.email, user.password);
      if (!auth) {
        console.error(`Authentication failed for test user: ${user.email}`);
        allValid = false;
      }
    }

    return allValid;
  }

  /**
   * Reset password for a test user
   */
  async resetUserPassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (error) {
        console.error(`Failed to reset password for user ${userId}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Unexpected error resetting password for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get all test users from database
   */
  async getAllTestUsers(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .in('email', [
          'test@example.com',
          'coach@example.com',
          'client@example.com',
          'admin@example.com',
          'coach2@example.com',
          'client2@example.com',
        ]);

      if (error) {
        console.error('Failed to get test users:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error getting test users:', error);
      return [];
    }
  }

  /**
   * Check if a user exists by email
   */
  async userExists(email: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    return user !== null;
  }

  /**
   * Activate/deactivate a test user
   */
  async setUserStatus(userId: string, status: 'active' | 'inactive' | 'suspended'): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('users')
        .update({ status })
        .eq('id', userId);

      if (error) {
        console.error(`Failed to set user status ${userId}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Unexpected error setting user status ${userId}:`, error);
      return false;
    }
  }
}